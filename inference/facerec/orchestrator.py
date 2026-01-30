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

    def run(self, image_paths: list[str]) -> Dict[str, Any]:
        """
        Process multiple images of the same person for registration.
        
        Args:
            image_paths: list of paths to student images (len = 2 or 3)
        
        Returns:
            {
              "centroid": np.ndarray (512,),
              "embeddings": np.ndarray (N, 512),
              "num_faces": int
            }
        """
        
        face_tensors = []
        
        for path in image_paths:
            tensors = self.r.return_tensors(path)  # (1, 3, 112, 112)
            face_tensors.append(tensors)
        
        # Concatenate along batch dimension: (N, 3, 112, 112)
        faces = np.concatenate(face_tensors, axis=0).astype(np.float32)
        
        # Convert from NCHW to NHWC: (N, 112, 112, 3)
        faces_nhwc = np.transpose(faces, (0, 2, 3, 1))
        
        # Generate embeddings: (N, 512), L2-normalized
        embeddings = self.e.embed(faces_nhwc)
        
        # Check consistency across images
        if not embeddings_consistent(embeddings):
            print("WARNING: Embeddings are not consistent across provided images.")
        
        # Aggregate into single centroid: (512,), L2-normalized
        centroid = aggregate_embeddings(embeddings)
        
        return {
            "centroid": centroid,
            "embeddings": embeddings,
            "num_faces": embeddings.shape[0]
        }