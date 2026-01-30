import cv2
import numpy as np
from typing import Union, Tuple, Optional
from pathlib import Path

class PhotoFrameReader:
    """
    Reads image from:
    - disk path
    - raw bytes 
    - numpy array

    Output : RGB np.ndarray
    """

    def __init__(self, resize: Optional[Tuple[int,int]] = None):
        self.resize = resize

    def read(self, source: Union[str, Path, bytes, np.ndarray]) -> np.ndarray:
        
        if isinstance(source, np.ndarray):
            img = source

        elif isinstance(source, (bytes, bytearray)):
            img_array = np.frombuffer(source, np.unit8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("Could not decode image from bytes.")
            
        elif isinstance(source, (str, Path)):
            img = cv2.imread(str(source))
            if img is None:
                raise FileNotFoundError(f"Image file not found at path: {source}")
            
        else:
            raise TypeError("Unsupported source type. Must be str, Path, bytes, or np.ndarray.")
        
        if self.resize:
            img = cv2.resize(img, self.resize)
        
        # BGR to RGB conversion
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        return img