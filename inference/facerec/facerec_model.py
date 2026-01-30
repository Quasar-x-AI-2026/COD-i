import cv2
import numpy as np
import onnxruntime as ort
from pathlib import Path
from typing import Union
from face.vision_support.frame_renderer import PhotoFrameReader
from facerec.config import MODEL_PATH_FACEREC

# ArcFace canonical landmark template (112x112)- this step comes after face detection
ARC_TEMPLATE = np.array(
    [
        [38.2946, 51.6963],   # left eye
        [73.5318, 51.5014],   # right eye
        [56.0252, 71.7366],   # nose
        [41.5493, 92.3655],   # left mouth
        [70.7299, 92.2041],   # right mouth
    ],
    dtype=np.float320
)


class FaceExtractor:
    """
    SCRFD ONNX face detector + landmark alignmeet.
    Returns ONE face tensor at a time:
      (3, 112, 112), float32, [-1, 1]
    """

    def __init__(
        self,
        model_path: str = MODEL_PATH_FACEREC,
        device: str = "cpu",
        det_thresh: float = 0.6,
        debug: bool = True
    ):
        self.reader = PhotoFrameReader()
        self.det_thresh = det_thresh
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

    def return_tensors(self, source):
        """
        Extract and align face from source image.
        
        Returns:
            np.ndarray: Face tensor with shape (1, 3, 112, 112), float32, range [-1, 1]
        """
        image_np = self.reader.read(source)

        if image_np is None:
            raise ValueError("Failed to read image")

        if image_np.ndim != 3 or image_np.shape[2] != 3:
            raise ValueError("Expected RGB image")

        h, w, _ = image_np.shape
        blob = self._preprocess(image_np)

        outputs = self.sess.run(None, {self.input_name: blob})

        score, lm = self._decode_outputs(outputs, w, h)

        if score < self.det_thresh:
            raise ValueError("No face above detection threshold")

        # Debug: print landmarks and image size
        if self.debug:
            print(f"Image size: {w}x{h}")
            print(f"Detection score: {score:.4f}")
            print(f"Landmarks:\n{lm}")
            
            # Save original image with landmarks drawn
            img_with_lm = image_np.copy()
            for i, (x, y) in enumerate(lm):
                cv2.circle(img_with_lm, (int(x), int(y)), 3, (0, 255, 0), -1)
            
            source_name = Path(source).stem if isinstance(source, (str, Path)) else f"face_{np.random.randint(1e9)}"
            fname_lm = f"landmarks_{source_name}.jpg"
            cv2.imwrite(str(self.debug_dir / fname_lm), cv2.cvtColor(img_with_lm, cv2.COLOR_RGB2BGR))
            print(f"Saved landmarks visualization to: {self.debug_dir / fname_lm}")

        face = self._align(image_np, lm)
        
        # Save aligned face for visual confirmation
        if self.debug:
            # Convert from [-1, 1] to [0, 255] for saving
            face_vis = ((face.transpose(1, 2, 0) + 1.0) * 127.5).astype(np.uint8)
            face_vis_bgr = cv2.cvtColor(face_vis, cv2.COLOR_RGB2BGR)
            
            # Generate filename from source path
            source_name = Path(source).stem if isinstance(source, (str, Path)) else f"face_{np.random.randint(1e9)}"
            fname = f"aligned_{source_name}.jpg"
            
            save_path = self.debug_dir / fname
            cv2.imwrite(str(save_path), face_vis_bgr)
            print(f"Saved aligned face to: {save_path}")
        
        # Add batch dimension for consistency with downstream processing
        return face[np.newaxis, ...]  # Shape: (1, 3, 112, 112)
    
    # ------------------------------------------------------------

    def _decode_outputs(self, outputs, w, h):
        """
        SCRFD decoder with proper anchor/stride handling.
        SCRFD uses anchor-based predictions with strides [8, 16, 32]
        """
        
        # SCRFD typical strides for 640x640 input (adjust if different)
        # For dynamic input sizes, the anchor counts scale proportionally
        strides = [8, 16, 32]
        
        scores_all = []
        landmarks_all = []
        bboxes_all = []
        
        # Group outputs by stride level
        # Outputs are typically ordered: [cls, cls, cls, bbox, bbox, bbox, lmk, lmk, lmk]
        num_levels = 3
        outputs_per_type = len(outputs) // num_levels
        
        cls_outputs = outputs[0:num_levels]
        bbox_outputs = outputs[num_levels:2*num_levels]
        lmk_outputs = outputs[2*num_levels:3*num_levels]
        
        for stride_idx, stride in enumerate(strides):
            # Get outputs for this stride level
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
            
            # Generate anchor grid for this stride
            feat_h = int(np.ceil(h / stride))
            feat_w = int(np.ceil(w / stride))
            
            # Create anchor centers
            shifts_x = np.arange(feat_w) * stride
            shifts_y = np.arange(feat_h) * stride
            shift_x, shift_y = np.meshgrid(shifts_x, shifts_y)
            
            anchor_centers = np.stack([shift_x.ravel(), shift_y.ravel()], axis=1).astype(np.float32)
            
            # Expand if needed (SCRFD uses 2 anchors per location)
            anchors_per_loc = 2
            anchor_centers = np.repeat(anchor_centers, anchors_per_loc, axis=0)
            
            # Truncate or pad to match actual number of anchors
            if len(anchor_centers) > num_anchors:
                anchor_centers = anchor_centers[:num_anchors]
            elif len(anchor_centers) < num_anchors:
                # Pad with last anchor
                padding = np.repeat(anchor_centers[-1:], num_anchors - len(anchor_centers), axis=0)
                anchor_centers = np.vstack([anchor_centers, padding])
            
            # Decode landmarks: they're offsets from anchor centers
            lmk = lmk_out.reshape(-1, 5, 2)  # (N, 5, 2)
            lmk[:, :, 0] = lmk[:, :, 0] * stride + anchor_centers[:, 0:1]
            lmk[:, :, 1] = lmk[:, :, 1] * stride + anchor_centers[:, 1:2]
            
            landmarks_all.append(lmk)
            scores_all.append(cls_out[:, -1])  # Last channel is score
        
        # Concatenate all detections
        scores = np.concatenate(scores_all, axis=0)
        landmarks = np.concatenate(landmarks_all, axis=0)
        
        # Find best detection
        best = int(np.argmax(scores))
        score = float(scores[best])
        lm = landmarks[best]
        
        return score, lm

    # ------------------------------------------------------------

    def _preprocess(self, img: np.ndarray) -> np.ndarray:
        """
        SCRFD preprocessing
        """
        img = img.astype(np.float32)
        img -= 127.5
        img /= 128.0
        img = np.transpose(img, (2, 0, 1))
        return img[None, ...]

    # ------------------------------------------------------------

    def _align(self, img: np.ndarray, lm: np.ndarray) -> np.ndarray:
        """
        Landmark-based affine alignment → ArcFace format
        """

        src = lm.astype(np.float32)
        dst = ARC_TEMPLATE

        m, _ = cv2.estimateAffinePartial2D(src, dst)
        if m is None:
            raise ValueError("Affine transform failed")

        face = cv2.warpAffine(img, m, (112, 112))

        if self.debug:
            fname = f"debug_{np.random.randint(1e9)}.jpg"
            cv2.imwrite(
                str(self.debug_dir / fname),
                cv2.cvtColor(face, cv2.COLOR_RGB2BGR)
            )

        face = face.astype(np.float32) / 127.5 - 1.0
        face = np.transpose(face, (2, 0, 1))

        return face
