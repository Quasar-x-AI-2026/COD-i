import cv2
import numpy as np
import onnxruntime as ort
from pathlib import Path
from typing import Union, Tuple
from face.vision_support.frame_renderer import PhotoFrameReader
from facerec.config import MODEL_PATH_FACEREC

# ArcFace canonical landmark template (112x112) - this step comes after face detection as always!
ARC_TEMPLATE = np.array(
    [
        [38.2946, 51.6963],   # left eye
        [73.5318, 51.5014],   # right eye
        [56.0252, 71.7366],   # nose
        [41.5493, 92.3655],   # left mouth
        [70.7299, 92.2041],   # right mouth
    ],
    dtype=np.float32
)


class MultiFaceExtractor:
    """
    SCRFD ONNX face detector + landmark alignment for MULTIPLE faces.
    Returns N face tensors from a single image:
      (N, 3, 112, 112), float32, [-1, 1]
    """

    def __init__(
        self,
        model_path: str = MODEL_PATH_FACEREC,
        device: str = "cpu",
        det_thresh: float = 0.4,
        max_faces: int = None,  # None = return all faces
        debug: bool = True
    ):
        self.reader = PhotoFrameReader()
        self.det_thresh = det_thresh
        self.max_faces = max_faces
        self.debug = debug

        providers = (
            ["CUDAExecutionProvider", "CPUExecutionProvider"]
            if device == "cuda"
            else ["CPUExecutionProvider"]
        )

        self.sess = ort.InferenceSession(str(model_path), providers=providers)
        self.input_name = self.sess.get_inputs()[0].name

        self.base_dir = Path(__file__).resolve().parent
        self.debug_dir = self.base_dir / "tmp"
        if self.debug:
            self.debug_dir.mkdir(exist_ok=True)

    # ------------------------------------------------------------

    def return_tensors(self, source) -> Tuple[np.ndarray, int]:
        """
        Extract and align ALL faces from source image.
        
        Returns:
            faces: np.ndarray with shape (N, 3, 112, 112), float32, range [-1, 1]
            num_faces: int, number of faces detected
        """
        image_np = self.reader.read(source)

        if image_np is None:
            raise ValueError("Failed to read image")

        if image_np.ndim != 3 or image_np.shape[2] != 3:
            raise ValueError("Expected RGB image")

        h, w, _ = image_np.shape
        blob = self._preprocess(image_np)

        outputs = self.sess.run(None, {self.input_name: blob})

        # Get ALL detections above threshold
        detections = self._decode_outputs(outputs, w, h)
        
        if len(detections) == 0:
            raise ValueError(f"No faces detected above threshold {self.det_thresh}")

        # Sort by confidence score (highest first)
        detections = sorted(detections, key=lambda x: x[0], reverse=True)
        
        # Limit number of faces if specified
        if self.max_faces is not None:
            detections = detections[:self.max_faces]
        
        num_faces = len(detections)
        
        if self.debug:
            print(f"Detected {num_faces} face(s) in image")
            
            # Draw all detected landmarks on original image
            img_with_all_lm = image_np.copy()
            for idx, (score, lm) in enumerate(detections):
                for i, (x, y) in enumerate(lm):
                    color = (0, 255, 0) if idx == 0 else (255, 165, 0)  # Green for best, orange for others
                    cv2.circle(img_with_all_lm, (int(x), int(y)), 3, color, -1)
            
            from pathlib import Path
            source_name = Path(source).stem if isinstance(source, (str, Path)) else f"frame_{np.random.randint(1e9)}"
            fname_lm = f"all_landmarks_{source_name}.jpg"
            cv2.imwrite(str(self.debug_dir / fname_lm), cv2.cvtColor(img_with_all_lm, cv2.COLOR_RGB2BGR))
            print(f"Saved all landmarks to: {self.debug_dir / fname_lm}")
        
        # Align all detected faces
        face_tensors = []
        for idx, (score, lm) in enumerate(detections):
            if self.debug:
                print(f"Face {idx+1}/{num_faces}: score={score:.4f}")
            
            face = self._align(image_np, lm, idx, source)
            face_tensors.append(face)
        
        # Stack into (N, 3, 112, 112)
        faces = np.stack(face_tensors, axis=0)
        
        return faces, num_faces

    # ------------------------------------------------------------
    
    def _decode_outputs(self, outputs, w, h):
        """
        SCRFD decoder that returns ALL detections above threshold.
        Returns list of (score, landmarks) tuples.
        """
        
        strides = [8, 16, 32]
        
        scores_all = []
        landmarks_all = []
        
        # Group outputs by stride level
        num_levels = 3
        cls_outputs = outputs[0:num_levels]
        bbox_outputs = outputs[num_levels:2*num_levels]
        lmk_outputs = outputs[2*num_levels:3*num_levels]
        
        for stride_idx, stride in enumerate(strides):
            cls_out = cls_outputs[stride_idx]
            bbox_out = bbox_outputs[stride_idx] 
            lmk_out = lmk_outputs[stride_idx]
            
            # Remove batch dim if present
            if cls_out.ndim == 3:
                cls_out = cls_out[0]
            if bbox_out.ndim == 3:
                bbox_out = bbox_out[0]
            if lmk_out.ndim == 3:
                lmk_out = lmk_out[0]
                
            num_anchors = cls_out.shape[0]
            
            # Generate anchor grid
            feat_h = int(np.ceil(h / stride))
            feat_w = int(np.ceil(w / stride))
            
            shifts_x = np.arange(feat_w) * stride
            shifts_y = np.arange(feat_h) * stride
            shift_x, shift_y = np.meshgrid(shifts_x, shifts_y)
            
            anchor_centers = np.stack([shift_x.ravel(), shift_y.ravel()], axis=1).astype(np.float32)
            
            # SCRFD uses 2 anchors per location
            anchors_per_loc = 2
            anchor_centers = np.repeat(anchor_centers, anchors_per_loc, axis=0)
            
            # Match anchor count
            if len(anchor_centers) > num_anchors:
                anchor_centers = anchor_centers[:num_anchors]
            elif len(anchor_centers) < num_anchors:
                padding = np.repeat(anchor_centers[-1:], num_anchors - len(anchor_centers), axis=0)
                anchor_centers = np.vstack([anchor_centers, padding])
            
            # Decode landmarks
            lmk = lmk_out.reshape(-1, 5, 2)
            lmk[:, :, 0] = lmk[:, :, 0] * stride + anchor_centers[:, 0:1]
            lmk[:, :, 1] = lmk[:, :, 1] * stride + anchor_centers[:, 1:2]
            
            landmarks_all.append(lmk)
            scores_all.append(cls_out[:, -1])
        
        # Concatenate all detections
        scores = np.concatenate(scores_all, axis=0)
        landmarks = np.concatenate(landmarks_all, axis=0)
        
        # Filter by threshold
        valid_mask = scores >= self.det_thresh
        valid_indices = np.where(valid_mask)[0]
        
        # Return list of (score, landmarks) for all valid detections
        detections = []
        for idx in valid_indices:
            detections.append((float(scores[idx]), landmarks[idx]))
        
        return detections

    # ------------------------------------------------------------

    def _preprocess(self, img: np.ndarray) -> np.ndarray:
        """SCRFD preprocessing"""
        img = img.astype(np.float32)
        img -= 127.5
        img /= 128.0
        img = np.transpose(img, (2, 0, 1))
        return img[None, ...]

    # ------------------------------------------------------------

    def _align(self, img: np.ndarray, lm: np.ndarray, face_idx: int = 0, source=None) -> np.ndarray:
        """
        Landmark-based affine alignment → ArcFace format
        """
        src = lm.astype(np.float32)
        dst = ARC_TEMPLATE

#        m, _ = cv2.estimateAffinePartial2D(src, dst)
#        if m is None:
#            raise ValueError(f"Affine transform failed for face {face_idx}")
#
#        face = cv2.warpAffine(img, m, (112, 112))
        
        m, _ = cv2.estimateAffinePartial2D(
            src, dst,
            method=cv2.LMEDS  # More stable than RANSAC for clean data
        )
        
        if m is None:
            raise ValueError(f"Affine transform failed for face {face_idx}")

        # Use better interpolation
        face = cv2.warpAffine(
            img, m, (112, 112),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REFLECT
        )        

        if self.debug:
            # Convert from [0, 255] to save
            face_vis_bgr = cv2.cvtColor(face, cv2.COLOR_RGB2BGR)
            
            from pathlib import Path
            source_name = Path(source).stem if isinstance(source, (str, Path)) else f"frame_{np.random.randint(1e9)}"
            fname = f"aligned_face{face_idx}_{source_name}.jpg"
            
            save_path = self.debug_dir / fname
            cv2.imwrite(str(save_path), face_vis_bgr)

        # Normalize to [-1, 1]
        face = face.astype(np.float32) / 127.5 - 1.0
        face = np.transpose(face, (2, 0, 1))

        return face