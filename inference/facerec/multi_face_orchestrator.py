import numpy as np
from typing import Dict, Any, List
from facerec.multi_face_extractor import MultiFaceExtractor
from facerec.embedding_model import ArcFaceONNXEmbedder as FaceEmbeddingInference


class AttendanceOrchestrator:
    """
    Orchestrates multi-face detection and embedding generation for attendance.
    Processes images with multiple people and returns embeddings for all detected faces.
    """
    
    def __init__(
        self,
        detector: MultiFaceExtractor = None,
        embedder: FaceEmbeddingInference = None
    ):
        self.detector = detector or MultiFaceExtractor()
        self.embedder = embedder or FaceEmbeddingInference()

    def run(self, image_path: str) -> Dict[str, Any]:
        """
        Process a single image containing multiple faces.
        
        Args:
            image_path: Path to image (e.g., classroom photo)
        
        Returns:
            {
                "embeddings": np.ndarray (N, 512), L2-normalized embeddings
                "num_faces": int, number of faces detected
                "face_tensors": np.ndarray (N, 3, 112, 112), aligned face crops
            }
        """
        
        # Extract all faces from image: (N, 3, 112, 112)
        face_tensors, num_faces = self.detector.return_tensors(image_path)
        
        if num_faces == 0:
            return {
                "embeddings": np.array([]),
                "num_faces": 0,
                "face_tensors": np.array([])
            }
        
        # Convert from NCHW to NHWC for embedding model
        faces_nhwc = np.transpose(face_tensors, (0, 2, 3, 1))  # (N, 112, 112, 3)
        
        # Generate embeddings for all faces
        embeddings = self.embedder.embed(faces_nhwc)  # (N, 512), L2-normalized
        
        return {
            "embeddings": embeddings,
            "num_faces": num_faces,
            "face_tensors": face_tensors
        }
    
    def run_batch(self, image_paths: List[str]) -> List[Dict[str, Any]]:
        """
        Process multiple images, each potentially containing multiple faces.
        
        Args:
            image_paths: List of image paths
        
        Returns:
            List of results, one per image
        """
        results = []
        for path in image_paths:
            result = self.run(path)
            result["image_path"] = path
            results.append(result)
        
        return results