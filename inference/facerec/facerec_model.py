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
    dtype=np.float32
)


class FaceExtractor:
    """
    SCRFD ONNX face detector + landmark alignment.
    Returns ONE FRONTAL face tensor at a time:
      (3, 112, 112), float32, [-1, 1]
    """

    def __init__(
        self,
        model_path: str = MODEL_PATH_FACEREC,
        device: str = "cpu",
        det_thresh: float = 0.0,
        frontal_threshold: float = 0.7,  # Symmetry ratio for frontal check
        debug: bool = True
    ):
        self.reader = PhotoFrameReader()
        self.det_thresh = det_thresh
        self.frontal_threshold = frontal_threshold
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

# facerec_model.py - return_tensors returns None for non-frontal
    def return_tensors(self, source):
        """
        Extract and align face from source image.
        Returns None if face is not frontal.
        
        Returns:
            np.ndarray or None: Face tensor (1, 3, 112, 112) if frontal, else None
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

        # Check if frontal
        is_frontal, symmetry_score = self._check_frontal(lm)

        if self.debug:
            print(f"Image: {Path(source).name if isinstance(source, (str, Path)) else 'array'}")
            print(f"  Detection score: {score:.4f}")
            print(f"  Frontal score: {symmetry_score:.3f} → {'✓ FRONTAL' if is_frontal else '✗ REJECTED (side profile)'}")
            
            img_with_lm = image_np.copy()
            for i, (x, y) in enumerate(lm):
                color = (0, 255, 0) if is_frontal else (255, 0, 0)
                cv2.circle(img_with_lm, (int(x), int(y)), 3, color, -1)
            
            source_name = Path(source).stem if isinstance(source, (str, Path)) else f"face_{np.random.randint(1e9)}"
            fname_lm = f"landmarks_{source_name}.jpg"
            cv2.imwrite(str(self.debug_dir / fname_lm), cv2.cvtColor(img_with_lm, cv2.COLOR_RGB2BGR))

        # Return None if not frontal
        if not is_frontal:
            if self.debug:
                print(f"  → Skipping non-frontal image\n")
            return None

        # Only process frontal faces
        face = self._align(image_np, lm)
        
        if self.debug:
            face_vis = ((face.transpose(1, 2, 0) + 1.0) * 127.5).astype(np.uint8)
            face_vis_bgr = cv2.cvtColor(face_vis, cv2.COLOR_RGB2BGR)
            source_name = Path(source).stem if isinstance(source, (str, Path)) else f"face_{np.random.randint(1e9)}"
            fname = f"aligned_{source_name}.jpg"
            cv2.imwrite(str(self.debug_dir / fname), face_vis_bgr)
            print(f"  → Saved aligned face: {fname}\n")
        
        return face[np.newaxis, ...]  # (1, 3, 112, 112)
    
    # ------------------------------------------------------------

    def _check_frontal(self, landmarks):
        """
        Check if face is frontal by analyzing landmark symmetry.
        
        Args:
            landmarks: (5, 2) array of facial landmarks
        
        Returns:
            (is_frontal, symmetry_score): tuple
        """
        left_eye = landmarks[0]
        right_eye = landmarks[1]
        nose = landmarks[2]
        left_mouth = landmarks[3]
        right_mouth = landmarks[4]
        
        # Calculate distances from nose to each eye
        nose_to_left_eye = np.linalg.norm(nose - left_eye)
        nose_to_right_eye = np.linalg.norm(nose - right_eye)
        
        # Calculate distances from nose to mouth corners
        nose_to_left_mouth = np.linalg.norm(nose - left_mouth)
        nose_to_right_mouth = np.linalg.norm(nose - right_mouth)
        
        # Symmetry ratio (should be close to 1.0 for frontal faces)
        eye_symmetry = min(nose_to_left_eye, nose_to_right_eye) / max(nose_to_left_eye, nose_to_right_eye)
        mouth_symmetry = min(nose_to_left_mouth, nose_to_right_mouth) / max(nose_to_left_mouth, nose_to_right_mouth)
        
        # Combined symmetry score
        symmetry_score = (eye_symmetry + mouth_symmetry) / 2.0
        
        # Check if frontal
        is_frontal = symmetry_score >= self.frontal_threshold
        
        return is_frontal, symmetry_score

    # ------------------------------------------------------------

    def _decode_outputs(self, outputs, w, h):
        """
        SCRFD decoder with proper anchor/stride handling.
        SCRFD uses anchor-based predictions with strides [8, 16, 32]
        """
        
        strides = [8, 16, 32]
        
        scores_all = []
        landmarks_all = []
        
        num_levels = 3
        
        cls_outputs = outputs[0:num_levels]
        bbox_outputs = outputs[num_levels:2*num_levels]
        lmk_outputs = outputs[2*num_levels:3*num_levels]
        
        for stride_idx, stride in enumerate(strides):
            cls_out = cls_outputs[stride_idx]
            bbox_out = bbox_outputs[stride_idx] 
            lmk_out = lmk_outputs[stride_idx]
            
            if cls_out.ndim == 3:
                cls_out = cls_out[0]
            if bbox_out.ndim == 3:
                bbox_out = bbox_out[0]
            if lmk_out.ndim == 3:
                lmk_out = lmk_out[0]
                
            num_anchors = cls_out.shape[0]
            
            feat_h = int(np.ceil(h / stride))
            feat_w = int(np.ceil(w / stride))
            
            shifts_x = np.arange(feat_w) * stride
            shifts_y = np.arange(feat_h) * stride
            shift_x, shift_y = np.meshgrid(shifts_x, shifts_y)
            
            anchor_centers = np.stack([shift_x.ravel(), shift_y.ravel()], axis=1).astype(np.float32)
            
            anchors_per_loc = 2
            anchor_centers = np.repeat(anchor_centers, anchors_per_loc, axis=0)
            
            if len(anchor_centers) > num_anchors:
                anchor_centers = anchor_centers[:num_anchors]
            elif len(anchor_centers) < num_anchors:
                padding = np.repeat(anchor_centers[-1:], num_anchors - len(anchor_centers), axis=0)
                anchor_centers = np.vstack([anchor_centers, padding])
            
            lmk = lmk_out.reshape(-1, 5, 2)
            lmk[:, :, 0] = lmk[:, :, 0] * stride + anchor_centers[:, 0:1]
            lmk[:, :, 1] = lmk[:, :, 1] * stride + anchor_centers[:, 1:2]
            
            landmarks_all.append(lmk)
            scores_all.append(cls_out[:, -1])
        
        scores = np.concatenate(scores_all, axis=0)
        landmarks = np.concatenate(landmarks_all, axis=0)
        
        best = int(np.argmax(scores))
        score = float(scores[best])
        lm = landmarks[best]
        
        return score, lm

    # ------------------------------------------------------------

    def _preprocess(self, img: np.ndarray) -> np.ndarray:
        """SCRFD preprocessing"""
        img = img.astype(np.float32)
        img -= 127.5
        img /= 128.0
        img = np.transpose(img, (2, 0, 1))
        return img[None, ...]

    # ------------------------------------------------------------

    def _align(self, img: np.ndarray, lm: np.ndarray) -> np.ndarray:
        """Landmark-based affine alignment → ArcFace format"""

        src = lm.astype(np.float32)
        dst = ARC_TEMPLATE

        m, _ = cv2.estimateAffinePartial2D(
            src, dst,
            method=cv2.LMEDS  # Deterministic, robust to outliers
        )
        
        if m is None:
            raise ValueError("Affine transform failed")

        face = cv2.warpAffine(
            img, m, (112, 112),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REFLECT
        )

        if self.debug:
            fname = f"debug_{np.random.randint(1e9)}.jpg"
            cv2.imwrite(
                str(self.debug_dir / fname),
                cv2.cvtColor(face, cv2.COLOR_RGB2BGR)
            )

        face = face.astype(np.float32) / 127.5 - 1.0
        face = np.transpose(face, (2, 0, 1))

        return face