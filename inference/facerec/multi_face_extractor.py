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
    
    NEW: Includes quality filtering to reject occluded, blurry, or side-profile faces
    """

    def __init__(
        self,
        model_path: str = MODEL_PATH_FACEREC,
        device: str = "cpu",
        det_thresh: float = 0.4,
        max_faces: int = None,  # None = return all faces
        debug: bool = True,
        enable_quality_filter: bool = True  # NEW: toggle quality filtering
    ):
        self.reader = PhotoFrameReader()
        self.det_thresh = det_thresh
        self.max_faces = max_faces
        self.debug = debug
        self.enable_quality_filter = enable_quality_filter

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

    def check_face_quality(self, img: np.ndarray, landmarks: np.ndarray) -> Tuple[bool, dict]:
        """
        Check if face is high quality and unoccluded.
        
        Args:
            img: RGB image (H, W, 3)
            landmarks: (5, 2) facial landmarks [x, y]
        
        Returns:
            (is_good_quality, quality_metrics): tuple
        """
        h, w = img.shape[:2]
        
        # Extract landmark points
        left_eye = landmarks[0]
        right_eye = landmarks[1]
        nose = landmarks[2]
        left_mouth = landmarks[3]
        right_mouth = landmarks[4]
        
        metrics = {}
        rejection_reasons = []
        
        # CHECK 1: Face Size (too small = blurry/distant)
        eye_dist = np.linalg.norm(right_eye - left_eye)
        metrics['eye_distance'] = eye_dist
        
        MIN_EYE_DISTANCE = 10
        if eye_dist < MIN_EYE_DISTANCE:
            rejection_reasons.append(f"Too small (eye_dist={eye_dist:.1f}px)")
        
        # CHECK 2: Frontal Face (detect side profiles)
        eye_center_x = (left_eye[0] + right_eye[0]) / 2
        nose_offset_x = abs(nose[0] - eye_center_x)
        nose_offset_ratio = nose_offset_x / eye_dist
        metrics['nose_offset_ratio'] = nose_offset_ratio
        
        MAX_NOSE_OFFSET = 0.40
        if nose_offset_ratio > MAX_NOSE_OFFSET:
            rejection_reasons.append(f"Side profile (offset={nose_offset_ratio:.2f})")
        
        # Check vertical symmetry
        nose_to_left_eye = np.linalg.norm(nose - left_eye)
        nose_to_right_eye = np.linalg.norm(nose - right_eye)
        eye_symmetry = min(nose_to_left_eye, nose_to_right_eye) / max(nose_to_left_eye, nose_to_right_eye)
        metrics['eye_symmetry'] = eye_symmetry
        
        MIN_EYE_SYMMETRY = 0.60
        if eye_symmetry < MIN_EYE_SYMMETRY:
            rejection_reasons.append(f"Asymmetric (symmetry={eye_symmetry:.2f})")
        
        # CHECK 3: Not truncated at edges
        all_x = landmarks[:, 0]
        all_y = landmarks[:, 1]
        EDGE_MARGIN = 20
        
        if (all_x.min() < EDGE_MARGIN or all_y.min() < EDGE_MARGIN or 
            all_x.max() > (w - EDGE_MARGIN) or all_y.max() > (h - EDGE_MARGIN)):
            rejection_reasons.append("Near edge")
        
        # CHECK 4: Brightness
        face_points = landmarks.astype(np.int32)
        x_coords = face_points[:, 0]
        y_coords = face_points[:, 1]
        
        x_margin = int(eye_dist * 0.5)
        y_margin = int(eye_dist * 0.7)
        
        x1_face = max(0, x_coords.min() - x_margin)
        x2_face = min(w, x_coords.max() + x_margin)
        y1_face = max(0, y_coords.min() - y_margin)
        y2_face = min(h, y_coords.max() + y_margin)
        
        face_region = img[y1_face:y2_face, x1_face:x2_face]
        
        if face_region.size > 0:
            gray_face = cv2.cvtColor(face_region, cv2.COLOR_RGB2GRAY)
            mean_brightness = gray_face.mean()
            metrics['brightness'] = mean_brightness
            
            MIN_BRIGHTNESS = 40
            MAX_BRIGHTNESS = 220
            
            if mean_brightness < MIN_BRIGHTNESS:
                rejection_reasons.append(f"Too dark ({mean_brightness:.0f})")
            elif mean_brightness > MAX_BRIGHTNESS:
                rejection_reasons.append(f"Overexposed ({mean_brightness:.0f})")
            
            # CHECK 5: Blur Detection
            laplacian = cv2.Laplacian(gray_face, cv2.CV_64F)
            blur_score = laplacian.var()
            metrics['blur_score'] = blur_score
            
            MIN_BLUR_SCORE = 80
            if blur_score < MIN_BLUR_SCORE:
                rejection_reasons.append(f"Blurry (score={blur_score:.0f})")
            
            # CHECK 6: Occlusion Detection
            def check_landmark_region(img, point, radius=8):
                x, y = int(point[0]), int(point[1])
                x1, y1 = max(0, x - radius), max(0, y - radius)
                x2, y2 = min(w, x + radius), min(h, y + radius)
                
                region = img[y1:y2, x1:x2]
                if region.size == 0:
                    return 0
                
                gray_region = cv2.cvtColor(region, cv2.COLOR_RGB2GRAY)
                return gray_region.var()
            
            eye_variance = (check_landmark_region(img, left_eye) + check_landmark_region(img, right_eye)) / 2
            nose_variance = check_landmark_region(img, nose)
            
            metrics['eye_region_variance'] = eye_variance
            metrics['nose_region_variance'] = nose_variance
            
            MIN_REGION_VARIANCE = 100
            if eye_variance < MIN_REGION_VARIANCE:
                rejection_reasons.append(f"Eyes occluded")
            if nose_variance < MIN_REGION_VARIANCE:
                rejection_reasons.append(f"Nose occluded")
        
        is_good = len(rejection_reasons) == 0
        metrics['is_good_quality'] = is_good
        metrics['rejection_reasons'] = rejection_reasons
        
        return is_good, metrics

    # ------------------------------------------------------------

    def return_tensors(self, source) -> Tuple[np.ndarray, int]:
        """
        Extract and align ALL high-quality faces from source image.
        
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
        
        # ===== NEW: QUALITY FILTERING =====
        if self.enable_quality_filter:
            quality_filtered_detections = []
            
            for idx, (score, lm) in enumerate(detections):
                is_good, metrics = self.check_face_quality(image_np, lm)
                
                if is_good:
                    quality_filtered_detections.append((score, lm))
                    if self.debug:
                        print(f"  ✓ Face {idx}: PASSED quality checks (score={score:.3f})")
                else:
                    if self.debug:
                        reasons = ', '.join(metrics['rejection_reasons'])
                        print(f"  ✗ Face {idx}: REJECTED - {reasons}")
            
            if len(quality_filtered_detections) == 0:
                raise ValueError("No high-quality faces detected after filtering")
            
            detections = quality_filtered_detections
            
            if self.debug:
                print(f"Quality filtering: {len(detections)} faces passed out of {len(detections) + len([d for d in detections if not d])} total")
        # ===== END QUALITY FILTERING =====
        
        # Limit number of faces if specified
        if self.max_faces is not None:
            detections = detections[:self.max_faces]
        
        num_faces = len(detections)
        
        if self.debug:
            print(f"Final: {num_faces} face(s) to process")
            
            # Draw all detected landmarks on original image
            img_with_all_lm = image_np.copy()
            for idx, (score, lm) in enumerate(detections):
                for i, (x, y) in enumerate(lm):
                    color = (0, 255, 0) if idx == 0 else (255, 165, 0)  # Green for best, orange for others
                    cv2.circle(img_with_all_lm, (int(x), int(y)), 3, color, -1)
            
            from pathlib import Path
            source_name = Path(source).stem if isinstance(source, (str, Path)) else f"frame_{np.random.randint(1e9)}"
            fname_lm = f"quality_filtered_landmarks_{source_name}.jpg"
            cv2.imwrite(str(self.debug_dir / fname_lm), cv2.cvtColor(img_with_all_lm, cv2.COLOR_RGB2BGR))
            print(f"Saved landmarks to: {self.debug_dir / fname_lm}")
        
        # Align all detected faces
        face_tensors = []
        for idx, (score, lm) in enumerate(detections):
            if self.debug:
                print(f"Aligning face {idx+1}/{num_faces}: score={score:.4f}")
            
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
        UPDATED: Uses LMEDS (deterministic) instead of RANSAC
        """
        src = lm.astype(np.float32)
        dst = ARC_TEMPLATE
        
        # Use LMEDS - deterministic and stable for clean landmarks
        m, _ = cv2.estimateAffinePartial2D(
            src, dst,
            method=cv2.LMEDS
        )
        
        if m is None:
            raise ValueError(f"Affine transform failed for face {face_idx}")

        # Use LINEAR interpolation (better than CUBIC for face recognition)
        face = cv2.warpAffine(
            img, m, (112, 112),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(0, 0, 0)
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