# Coordinates SCRFD detection + ArcFace embedding
import numpy as np
from typing import Dict, Any
from facerec.facerec_model import FaceExtractor
from facerec.embedding_model import ArcFaceONNXEmbedder as FaceEmbeddingInference
from facerec.aggregation import aggregate_embeddings, embeddings_consistent


class FaceRegistrationOrchestrator:
    def __init__(
        self,
        retinaface: FaceExtractor = FaceExtractor(),
        embedder: FaceEmbeddingInference = FaceEmbeddingInference()
    ):
        self.r = retinaface
        self.e = embedder

    # orchestrator.py - filters out None, keeps same output format
    def run(self, image_paths: list[str]) -> Dict[str, Any]:
        """
        Process multiple images, use only the frontal one.
        
        Returns:
            {
            "centroid": np.ndarray (512,) - Frontal face embedding
            "embeddings": np.ndarray (1, 512) - Same as centroid
            "num_faces": int - Always 1
            }
        """
        
        face_tensors = []
        
        for path in image_paths:
            tensors = self.r.return_tensors(path)  # Returns None if not frontal
            
            if tensors is not None:
                face_tensors.append(tensors)
        
        if len(face_tensors) == 0:
            raise ValueError("No frontal face found in any of the provided images")
        
        # Use only the first frontal face found
        frontal_face = face_tensors[0]  # (1, 3, 112, 112)
        
        # Convert to NHWC
        face_nhwc = np.transpose(frontal_face, (0, 2, 3, 1))  # (1, 112, 112, 3)
        
        # Generate embedding
        embedding = self.e.embed(face_nhwc)  # (1, 512)
        
        # Check consistency (always True for single image)
        if not embeddings_consistent(embedding):
            print("WARNING: Embeddings are not consistent across provided images.")
        
        # Return in same format
        centroid = embedding[0]  # (512,)
        
        return {
            "centroid": centroid,        # (512,) - The frontal face embedding
            "embeddings": embedding,     # (1, 512) - Same embedding
            "num_faces": embedding.shape[0]  # 1
        }