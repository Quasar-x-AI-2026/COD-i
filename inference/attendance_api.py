
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import List, Dict, Any, Optional, Tuple
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

# Initialize models globally
detector = MultiFaceExtractor(debug=False)
embedder = ArcFaceONNXEmbedder()
orchestrator = AttendanceOrchestrator()


# ===== REQUEST/RESPONSE MODELS =====

class StudentMetadata(BaseModel):
    student_id: str
    name: str
    roll_number: Optional[str] = None
    embedding: List[float]
    
    class Config:
        json_schema_extra = {
            "example": {
                "student_id": "STU001",
                "name": "John Doe",
                "roll_number": "2024001",
                "embedding": [0.123] * 512
            }
        }


class AttendanceRequest(BaseModel):
    image_urls: List[HttpUrl]
    students: List[StudentMetadata]
    similarity_threshold: float = 0.70 # Increased from 0.6
    margin_threshold: float = 0.005  # NEW: Minimum gap between 1st and 2nd best match
    min_absolute_similarity: float = 0.75  # NEW: Absolute floor for any match
    
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
                "similarity_threshold": 0.65,
                "margin_threshold": 0.10,
                "min_absolute_similarity": 0.70
            }
        }


class StudentMatch(BaseModel):
    student_id: str
    name: str
    roll_number: Optional[str]
    confidence: float
    margin: float  # NEW: Gap between this match and second best
    image_index: int
    face_index: int
    second_best_confidence: Optional[float] = None  # NEW: For debugging


class RejectedMatch(BaseModel):
    """Face that was rejected due to insufficient margin or confidence"""
    face_identifier: str
    best_match_name: str
    best_confidence: float
    second_best_name: Optional[str]
    second_confidence: Optional[float]
    margin: float
    rejection_reason: str
    image_index: int
    face_index: int


class AttendanceResponse(BaseModel):
    total_images_processed: int
    total_faces_detected: int
    total_students_identified: int
    total_students_expected: int
    attendance_rate: float
    present_students: List[StudentMatch]
    absent_students: List[Dict[str, str]]
    unidentified_faces: int
    rejected_matches: List[RejectedMatch]  # NEW: For analysis
    
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
                        "margin": 0.15,
                        "image_index": 0,
                        "face_index": 2,
                        "second_best_confidence": 0.72
                    }
                ],
                "absent_students": [
                    {"student_id": "STU002", "name": "Jane Smith", "roll_number": "2024002"}
                ],
                "unidentified_faces": 2,
                "rejected_matches": []
            }
        }


# ===== HELPER FUNCTIONS =====

def download_image_from_url(url: str) -> np.ndarray:
    """Download image from Cloudinary URL and convert to numpy array."""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        img = Image.open(BytesIO(response.content))
        
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        return np.array(img)
    
    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Failed to download image: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")


def compute_similarity(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
    """
    Compute hybrid similarity between two embeddings.
    Combines cosine similarity and euclidean distance.
    """
    # Cosine similarity
    similarity = float(np.dot(embedding1, embedding2))
    
    # # Euclidean-based similarity
    # similarity_euclidean = 1 / (1 + np.linalg.norm(embedding1 - embedding2))
    
    # # Weighted combination
    # similarity = 0.7 * similarity_cosine + 0.3 * similarity_euclidean
    
    return similarity


def match_embedding_with_margin(
    embedding: np.ndarray,
    student_db: Dict[str, Dict[str, Any]],
    similarity_threshold: float,
    margin_threshold: float,
    min_absolute_similarity: float
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Match a face embedding against student database with margin-based filtering.
    
    Returns:
        (best_match_dict or None, rejection_info_dict or None)
    """
    # Compute similarities for all students
    similarities = []
    
    for student_id, student_data in student_db.items():
        centroid = student_data["embedding"]
        similarity = compute_similarity(embedding, centroid)
        
        similarities.append({
            "student_id": student_id,
            "name": student_data["name"],
            "roll_number": student_data.get("roll_number"),
            "confidence": similarity
        })
    
    # Sort by confidence (highest first)
    similarities.sort(key=lambda x: x["confidence"], reverse=True)
    
    if len(similarities) == 0:
        return None, None
    
    best = similarities[0]
    second_best = similarities[1] if len(similarities) > 1 else None
    
    # Calculate margin
    margin = best["confidence"] - (second_best["confidence"] if second_best else 0)
    
    # Rejection reasons (prioritized)
    rejection_reason = None
    
    # Check 1: Absolute minimum similarity
    if best["confidence"] < min_absolute_similarity:
        rejection_reason = f"Confidence {best['confidence']:.3f} below absolute minimum {min_absolute_similarity}"
    
    # Check 2: Basic threshold
    elif best["confidence"] < similarity_threshold:
        rejection_reason = f"Confidence {best['confidence']:.3f} below threshold {similarity_threshold}"
    
    # Check 3: Margin too small (ambiguous match)
    elif second_best and margin < margin_threshold:
        rejection_reason = f"Margin {margin:.3f} below required {margin_threshold} (ambiguous: {best['name']} vs {second_best['name']})"
    
    # If rejected, return rejection info
    if rejection_reason:
        rejection_info = {
            "best_match_name": best["name"],
            "best_confidence": best["confidence"],
            "second_best_name": second_best["name"] if second_best else None,
            "second_confidence": second_best["confidence"] if second_best else None,
            "margin": margin,
            "rejection_reason": rejection_reason
        }
        return None, rejection_info
    
    # Match accepted
    best["margin"] = margin
    best["second_best_confidence"] = second_best["confidence"] if second_best else None
    
    return best, None


class FaceMatchCandidate:
    """Represents a potential student-face match with metadata"""
    def __init__(self, student_id: str, match_data: Dict[str, Any], 
                 image_index: int, face_index: int):
        self.student_id = student_id
        self.match_data = match_data
        self.image_index = image_index
        self.face_index = face_index
        self.confidence = match_data["confidence"]
        self.margin = match_data["margin"]


def resolve_one_face_per_student(candidates: List[FaceMatchCandidate]) -> List[FaceMatchCandidate]:
    """
    Ensure each student is matched to at most one face.
    If a student has multiple matches, keep only the highest confidence one.
    """
    # Group by student_id
    student_matches = {}
    
    for candidate in candidates:
        sid = candidate.student_id
        
        if sid not in student_matches:
            student_matches[sid] = candidate
        else:
            # Keep the one with higher confidence
            if candidate.confidence > student_matches[sid].confidence:
                logger.info(
                    f"  Student {candidate.match_data['name']} matched in multiple faces. "
                    f"Keeping face with confidence {candidate.confidence:.3f} over {student_matches[sid].confidence:.3f}"
                )
                student_matches[sid] = candidate
    
    return list(student_matches.values())


# ===== API ENDPOINTS =====

@app.get("/")
def root():
    return {
        "message": "Attendance Recognition API",
        "version": "2.0.0 (Margin-Based)",
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
    Process classroom photos and mark attendance with margin-based matching.
    
    New features:
    - Margin threshold: Requires clear separation between best and second-best match
    - Absolute similarity floor: Minimum confidence even for best match
    - One-face-per-student: Prevents duplicate detections
    - Rejection logging: Tracks ambiguous matches for analysis
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
    
    logger.info(
        f"Processing attendance for {len(request.students)} students with {len(request.image_urls)} images\n"
        f"Thresholds: similarity={request.similarity_threshold}, "
        f"margin={request.margin_threshold}, "
        f"min_absolute={request.min_absolute_similarity}"
    )
    
    # Build student database
    student_db = {}
    for student in request.students:
        student_db[student.student_id] = {
            "name": student.name,
            "roll_number": student.roll_number,
            "embedding": np.array(student.embedding, dtype=np.float32)
        }
    
    # Track all match candidates and rejections
    match_candidates = []
    rejected_matches = []
    total_faces = 0
    
    # Process each image
    for img_idx, url in enumerate(request.image_urls):
        logger.info(f"Processing image {img_idx + 1}/{len(request.image_urls)}: {url}")
        
        try:
            # Download and process image
            image_np = download_image_from_url(str(url))
            face_tensors, num_faces = detector.return_tensors(image_np)
            
            if num_faces == 0:
                logger.warning(f"No faces detected in image {img_idx}")
                continue
            
            total_faces += num_faces
            logger.info(f"  Detected {num_faces} faces")
            
            # Convert to NHWC for embedding
            faces_nhwc = np.transpose(face_tensors, (0, 2, 3, 1))
            embeddings = embedder.embed(faces_nhwc)
            
            # Match each face with margin checking
            for face_idx, embedding in enumerate(embeddings):
                match, rejection = match_embedding_with_margin(
                    embedding,
                    student_db,
                    request.similarity_threshold,
                    request.margin_threshold,
                    request.min_absolute_similarity
                )
                
                if match:
                    # Valid match
                    candidate = FaceMatchCandidate(
                        student_id=match["student_id"],
                        match_data=match,
                        image_index=img_idx,
                        face_index=face_idx
                    )
                    match_candidates.append(candidate)
                    
                    logger.info(
                        f"  ✓ Face {face_idx}: {match['name']} "
                        f"(conf: {match['confidence']:.3f}, margin: {match['margin']:.3f})"
                    )
                
                elif rejection:
                    # Rejected match
                    rejected_matches.append(RejectedMatch(
                        face_identifier=f"img{img_idx}_face{face_idx}",
                        image_index=img_idx,
                        face_index=face_idx,
                        **rejection
                    ))
                    
                    logger.warning(
                        f"  ✗ Face {face_idx}: REJECTED - {rejection['rejection_reason']}"
                    )
        
        except Exception as e:
            logger.error(f"Error processing image {img_idx}: {str(e)}")
            continue
    
    # Apply one-face-per-student rule
    logger.info(f"\nResolving duplicates: {len(match_candidates)} initial matches")
    final_matches = resolve_one_face_per_student(match_candidates)
    logger.info(f"Final matches after deduplication: {len(final_matches)}")
    
    # Build final results
    matched_student_ids = set()
    present_students = []
    
    for candidate in final_matches:
        matched_student_ids.add(candidate.student_id)
        
        match_dict = candidate.match_data.copy()
        match_dict["image_index"] = candidate.image_index
        match_dict["face_index"] = candidate.face_index
        
        present_students.append(StudentMatch(**match_dict))
    
    # Calculate statistics
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
    present_students.sort(key=lambda x: x.confidence, reverse=True)
    
    logger.info(f"\n=== ATTENDANCE SUMMARY ===")
    logger.info(f"Present: {total_identified}/{total_expected} students ({attendance_rate:.1%})")
    logger.info(f"Rejected matches: {len(rejected_matches)}")
    logger.info(f"Unidentified faces: {unidentified_faces}")
    
    return AttendanceResponse(
        total_images_processed=len(request.image_urls),
        total_faces_detected=total_faces,
        total_students_identified=total_identified,
        total_students_expected=total_expected,
        attendance_rate=round(attendance_rate, 3),
        present_students=present_students,
        absent_students=absent_students,
        unidentified_faces=max(0, unidentified_faces),
        rejected_matches=rejected_matches
    )


# ===== RUN SERVER =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)