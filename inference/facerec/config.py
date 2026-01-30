
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH_ARCFACE = BASE_DIR / "models" / "arc.onnx"
MODEL_PATH_FACEREC = BASE_DIR / "models" / "scrfd_10g_bnkps.onnx"
