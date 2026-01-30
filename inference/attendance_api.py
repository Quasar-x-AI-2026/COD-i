from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import List, Dict, Any, Optional
import numpy as np
import requests
from io import BytesIO
from PIL import Image
import logging

from facerec.multi_face_extractor import MultiFaceExtractor
from facerec.multi_face_orchestrator import AttendanceOrchestrator
from facerec.embedding_model import ArcFaceONNXEmbedder

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Attendance Recognition API", version="1.0.0")

# Initialize models globally (loaded once at startup)
detector = MultiFaceExtractor(debug=False)
embedder = ArcFaceONNXEmbedder()
orchestrator = AttendanceOrchestrator()


# ===== REQUEST/RESPONSE MODELS =====

class StudentMetadata(BaseModel):
    student_id: str
    name: str
    roll_number: Optional[str] = None
    embedding: List[float]  # 512-dim embedding as list
    
    class Config:
        json_schema_extra = {
            "example": {
                "student_id": "STU001",
                "name": "John Doe",
                "roll_number": "2024001",
                "embedding": [0.123] * 512  # placeholder
            }
        }


class AttendanceRequest(BaseModel):
    image_urls: List[HttpUrl]  # 2-4 Cloudinary URLs
    students: List[StudentMetadata]  # All students expected in class
    similarity_threshold: float = 0.6
    
    class Config:
        json_schema_extra = {
            "example": {
                "image_urls": [
                    "https://res.cloudinary.com/.../classroom1.jpg",
                    "https://res.cloudinary.com/.../classroom2.jpg"
                ],
                "students": [
                    {
                        "student_id": "STU001",
                        "name": "John Doe",
                        "roll_number": "2024001",
                        "embedding": [0.123] * 512
                    }
                ],
                "similarity_threshold": 0.6
            }
        }


class StudentMatch(BaseModel):
    student_id: str
    name: str
    roll_number: Optional[str]
    confidence: float
    image_index: int  # Which classroom photo they were found in
    face_index: int  # Which face in that image


class AttendanceResponse(BaseModel):
    total_images_processed: int
    total_faces_detected: int
    total_students_identified: int
    total_students_expected: int
    attendance_rate: float
    present_students: List[StudentMatch]
    absent_students: List[Dict[str, str]]
    unidentified_faces: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_images_processed": 2,
                "total_faces_detected": 25,
                "total_students_identified": 23,
                "total_students_expected": 30,
                "attendance_rate": 0.767,
                "present_students": [
                    {
                        "student_id": "STU001",
                        "name": "John Doe",
                        "roll_number": "2024001",
                        "confidence": 0.87,
                        "image_index": 0,
                        "face_index": 2
                    }
                ],
                "absent_students": [
                    {"student_id": "STU002", "name": "Jane Smith", "roll_number": "2024002"}
                ],
                "unidentified_faces": 2
            }
        }


# ===== HELPER FUNCTIONS =====

def download_image_from_url(url: str) -> np.ndarray:
    """
    Download image from Cloudinary URL and convert to numpy array.
    
    Returns:
        RGB image as numpy array (H, W, 3)
    """
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        img = Image.open(BytesIO(response.content))
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        return np.array(img)
    
    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Failed to download image: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")


def match_embedding_to_students(
    embedding: np.ndarray,
    student_db: Dict[str, Dict[str, Any]],
    threshold: float
) -> Optional[Dict[str, Any]]:
    """
    Match a single face embedding against student database.
    
    Returns:
        Best match dict or None if no match above threshold
    """
    best_match = None
    best_similarity = -1.0
    
    for student_id, student_data in student_db.items():
        centroid = student_data["embedding"]
        
        # Cosine similarity (both embeddings are L2-normalized)
        #similarity = float(np.dot(embedding, centroid))
        # Use cosine + Euclidean hybrid
        
        similarity = float(np.dot(embedding, centroid))
#        similarity_euclidean = 1 / (1 + np.linalg.norm(embedding - centroid))
#        similarity = 0.7 * similarity_cosine + 0.3 * similarity_euclidean
        
        if similarity > best_similarity:
            best_similarity = similarity
            best_match = {
                "student_id": student_id,
                "name": student_data["name"],
                "roll_number": student_data.get("roll_number"),
                "confidence": best_similarity
            }
    
    if best_similarity < threshold:
        return None
    
    return best_match


# ===== API ENDPOINTS =====

@app.get("/")
def root():
    return {
        "message": "Attendance Recognition API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "attendance": "/api/v1/attendance"
        }
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "models_loaded": True
    }


@app.post("/api/v1/attendance", response_model=AttendanceResponse)
def process_attendance(request: AttendanceRequest):
    """
    Process classroom photos and mark attendance.
    
    - Downloads 2-4 images from Cloudinary
    - Detects all faces in each image
    - Matches faces against provided student embeddings
    - Returns list of present students with confidence scores
    """
    
    # Validate input
    if not (2 <= len(request.image_urls) <= 4):
        raise HTTPException(
            status_code=400,
            detail="Must provide between 2 and 4 image URLs"
        )
    
    if len(request.students) == 0:
        raise HTTPException(
            status_code=400,
            detail="Must provide at least one student"
        )
    
    logger.info(f"Processing attendance for {len(request.students)} students with {len(request.image_urls)} images")
    
    # Build student database
    student_db = {}
    for student in request.students:
        student_db[student.student_id] = {
            "name": student.name,
            "roll_number": student.roll_number,
            "embedding": np.array(student.embedding, dtype=np.float32)
        }
    
    # Process each image
    all_matches = []
    total_faces = 0
    matched_student_ids = set()
    
    for img_idx, url in enumerate(request.image_urls):
        logger.info(f"Processing image {img_idx + 1}/{len(request.image_urls)}: {url}")
        
        try:
            # Download image from Cloudinary
            image_np = download_image_from_url(str(url))
            
            # Detect and embed all faces
            face_tensors, num_faces = detector.return_tensors(image_np)
            
            if num_faces == 0:
                logger.warning(f"No faces detected in image {img_idx}")
                continue
            
            total_faces += num_faces
            
            # Convert to NHWC for embedding
            faces_nhwc = np.transpose(face_tensors, (0, 2, 3, 1))
            embeddings = embedder.embed(faces_nhwc)
            
            # Match each face
            for face_idx, embedding in enumerate(embeddings):
                match = match_embedding_to_students(
                    embedding, 
                    student_db, 
                    request.similarity_threshold
                )
                
                if match:
                    # Avoid duplicate detection across images
                    if match["student_id"] not in matched_student_ids:
                        match["image_index"] = img_idx
                        match["face_index"] = face_idx
                        all_matches.append(match)
                        matched_student_ids.add(match["student_id"])
                        logger.info(f"  Matched: {match['name']} (confidence: {match['confidence']:.3f})")
        
        except Exception as e:
            logger.error(f"Error processing image {img_idx}: {str(e)}")
            # Continue processing other images
            continue
    
    # Calculate attendance statistics
    total_identified = len(matched_student_ids)
    total_expected = len(request.students)
    attendance_rate = total_identified / total_expected if total_expected > 0 else 0.0
    unidentified_faces = total_faces - total_identified
    
    # Determine absent students
    absent_students = [
        {
            "student_id": student.student_id,
            "name": student.name,
            "roll_number": student.roll_number
        }
        for student in request.students
        if student.student_id not in matched_student_ids
    ]
    
    # Sort present students by confidence
    present_students = sorted(all_matches, key=lambda x: x["confidence"], reverse=True)
    
    logger.info(f"Attendance complete: {total_identified}/{total_expected} students present")
    
    return AttendanceResponse(
        total_images_processed=len(request.image_urls),
        total_faces_detected=total_faces,
        total_students_identified=total_identified,
        total_students_expected=total_expected,
        attendance_rate=round(attendance_rate, 3),
        present_students=[StudentMatch(**m) for m in present_students],
        absent_students=absent_students,
        unidentified_faces=max(0, unidentified_faces)
    )


# ===== RUN SERVER =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)