import numpy as np
import onnxruntime as ort
from facerec.config import MODEL_PATH_ARCFACE

class ArcFaceONNXEmbedder:
    def _init_(self, model_path: str = MODEL_PATH_ARCFACE, device: str = "cpu"):
        
        providers = (
            ["CUDAExecutionProvider", "CPUExecutionProvider"]
            if device == "cuda"
            else ["CPUExecutionProvider"]
        )

        self.sess = ort.InferenceSession(model_path, providers=providers)
        self.input_name = self.sess.get_inputs()[0].name


    def embed(self, x: np.ndarray) -> np.ndarray:
        
        """
        x: np.ndarray (N, 112, 112, 3), float32, range [-1, 1]
        returns: np.ndarray (N, 512), L2-normalized
        """
        
        outs = self.sess.run(None, {self.input_name: x})[0]
        norms = np.linalg.norm(outs, axis=1, keepdims=True)
        normalized_embeds = outs / norms
        
        return normalized_embeds