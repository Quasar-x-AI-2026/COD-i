
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

app = FastAPI(title="Attendance Recognition API", version="2.0.0")

# Initialize models globally
detector = MultiFaceExtractor()
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
    similarity_threshold: float = 0.70
    margin_threshold: float = 0.15
    min_absolute_similarity: float = 0.65
    
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
                "similarity_threshold": 0.70,
                "margin_threshold": 0.15,
                "min_absolute_similarity": 0.65
            }
        }


class StudentMatch(BaseModel):
    student_id: str
    name: str
    roll_number: Optional[str]
    confidence: float
    margin: float
    image_index: int
    face_index: int
    second_best_confidence: Optional[float] = None


class RejectedMatch(BaseModel):
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
    rejected_matches: List[RejectedMatch]
    
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


def validate_and_normalize(emb: np.ndarray) -> np.ndarray:
    """
    Defensive normalization - ensures embedding is L2-normalized.
    Safe to call on already-normalized embeddings (no-op if norm=1.0).
    """
    emb = emb.astype(np.float32)
    norm = np.linalg.norm(emb)
    
    if abs(norm - 1.0) > 1e-6:
        logger.warning(f"Embedding norm={norm:.8f}, re-normalizing")
        emb = emb / norm
    
    return emb


def compute_similarity(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
    """Compute cosine similarity between two L2-normalized embeddings."""
    return float(np.dot(embedding1, embedding2))


def match_student_with_cross_validation(
    student_embedding: np.ndarray,
    face_pool: List[Dict],
    similarity_threshold: float,
    margin_threshold: float,
    min_absolute_similarity: float,
    cross_validation_threshold: float = 0.75  # NEW!
) -> Tuple[Optional[Dict], Optional[Dict]]:
    """
    Match student with cross-validation for ambiguous cases.
    
    If top 2 matches are too close (margin < threshold):
    - Check if the two faces are actually the same person
    - If yes (faces similar), accept the match
    - If no (faces different), reject as truly ambiguous
    """
    
    # Compute similarities with all faces
    matches = []
    for face in face_pool:
        similarity = compute_similarity(student_embedding, face['embedding'])
        
        if similarity >= min_absolute_similarity:
            matches.append({
                'face': face,
                'confidence': similarity
            })
    
    # Sort by confidence
    matches.sort(key=lambda x: x['confidence'], reverse=True)
    
    if len(matches) == 0:
        return None, None
    
    best = matches[0]
    second_best = matches[1] if len(matches) > 1 else None
    margin = best['confidence'] - (second_best['confidence'] if second_best else 0)
    
    # Standard checks
    if best['confidence'] < similarity_threshold:
        rejection = {
            "rejection_reason": f"Confidence {best['confidence']:.3f} below threshold"
        }
        return None, rejection
    
    # AMBIGUOUS CASE: Margin too small
    if second_best and margin < margin_threshold:
        logger.info(f"      Ambiguous: margin={margin:.3f} < {margin_threshold}")
        
        # NEW: Cross-validate by comparing the two ambiguous faces
        face1_emb = best['face']['embedding']
        face2_emb = second_best['face']['embedding']
        
        face_to_face_similarity = compute_similarity(face1_emb, face2_emb)
        
        logger.info(f"      Cross-check: Face {best['face']['id']} vs {second_best['face']['id']} = {face_to_face_similarity:.3f}")
        
        # If the two faces are actually the same person (duplicates)
        if face_to_face_similarity >= cross_validation_threshold:
            logger.info(f"      ✓ Cross-validation PASSED: Both faces are same person, accepting match")
            
            # Accept the best match
            return {
                'face_id': best['face']['id'],
                'image_index': best['face']['image_index'],
                'face_index': best['face']['face_index'],
                'confidence': best['confidence'],
                'margin': margin,
                'cross_validated': True,
                'face_similarity': face_to_face_similarity
            }, None
        
        else:
            # Two different people matched similarly - truly ambiguous
            logger.warning(f"      ✗ Cross-validation FAILED: Faces are different people (sim={face_to_face_similarity:.3f})")
            
            rejection = {
                "rejection_reason": f"Ambiguous: margin={margin:.3f}, faces are different (cross-sim={face_to_face_similarity:.3f})",
                "cross_validated": True,
                "face_similarity": face_to_face_similarity
            }
            return None, rejection
    
    # Clear winner - no cross-validation needed
    return {
        'face_id': best['face']['id'],
        'image_index': best['face']['image_index'],
        'face_index': best['face']['face_index'],
        'confidence': best['confidence'],
        'margin': margin,
        'cross_validated': False
    }, None


# ===== API ENDPOINTS =====

@app.get("/")
def root():
    return {
        "message": "Attendance Recognition API",
        "version": "2.0.0 (Early-Exit Matching)",
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
    Student-centric matching algorithm:
    1. Extract ALL faces from ALL images into one pool
    2. For EACH student, find their best match in the face pool
    3. Accept only if ONE face clearly matches (margin check)
    4. If multiple faces match → reject as ambiguous
    """
    
    # Validate input
    if not (2 <= len(request.image_urls) <= 4):
        raise HTTPException(status_code=400, detail="Must provide between 2 and 4 image URLs")
    
    if len(request.students) == 0:
        raise HTTPException(status_code=400, detail="Must provide at least one student")
    
    logger.info(
        f"\n{'='*70}\n"
        f"Processing attendance for {len(request.students)} students with {len(request.image_urls)} images\n"
        f"Thresholds: similarity={request.similarity_threshold}, margin={request.margin_threshold}\n"
        f"{'='*70}"
    )
    
    # STEP 1: Extract ALL faces from ALL images into one pool
    logger.info("\n[STEP 1] Extracting all faces from all images...")
    
    face_pool = []  # List of {embedding, image_idx, face_idx}
    total_images_processed = 0
    
    for img_idx, url in enumerate(request.image_urls):
        logger.info(f"  Processing image {img_idx + 1}/{len(request.image_urls)}")
        
        try:
            # Download and process
            image_np = download_image_from_url(str(url))
            face_tensors, num_faces = detector.return_tensors(image_np)
            
            if num_faces == 0:
                logger.warning(f"    No faces detected")
                continue
            
            total_images_processed += 1
            logger.info(f"    Detected {num_faces} faces")
            
            # Convert to NHWC and embed
            faces_nhwc = np.transpose(face_tensors, (0, 2, 3, 1))
            embeddings = embedder.embed(faces_nhwc)
            
            # Add to face pool
            for face_idx, embedding in enumerate(embeddings):
                embedding = validate_and_normalize(embedding)
                face_pool.append({
                    'embedding': embedding,
                    'image_index': img_idx,
                    'face_index': face_idx,
                    'id': f"img{img_idx}_face{face_idx}"
                })
        
        except Exception as e:
            logger.error(f"    Error: {str(e)}")
            continue
    
    logger.info(f"\n✓ Total faces extracted: {len(face_pool)}")
    
    if len(face_pool) == 0:
        logger.warning("No faces detected in any image!")
        return AttendanceResponse(
            total_images_processed=total_images_processed,
            total_faces_detected=0,
            total_students_identified=0,
            total_students_expected=len(request.students),
            attendance_rate=0.0,
            present_students=[],
            absent_students=[{"student_id": s.student_id, "name": s.name, "roll_number": s.roll_number} for s in request.students],
            unidentified_faces=0,
            rejected_matches=[]
        )
    
    # STEP 2: For each student, find their match in the face pool
    logger.info(f"\n[STEP 2] Matching {len(request.students)} students against {len(face_pool)} faces...")
    
    present_students = []
    rejected_matches = []
    matched_face_ids = set()  # Track which faces have been assigned
    
    for student in request.students:
        student_embedding = validate_and_normalize(np.array(student.embedding, dtype=np.float32))
        
        logger.info(f"\n  Checking student: {student.name} ({student.student_id})")
        
        # Use cross-validation matching
        match, rejection = match_student_with_cross_validation(
            student_embedding,
            face_pool,
            request.similarity_threshold,
            request.margin_threshold,
            request.min_absolute_similarity,
            cross_validation_threshold=0.75  # Faces must be 75%+ similar to be "same person"
        )
        
        if match:
            # Check if already assigned
            if match['face_id'] in matched_face_ids:
                logger.warning(f"    ✗ Face already assigned")
                continue
            
            matched_face_ids.add(match['face_id'])
            
            cross_val_note = " [CROSS-VALIDATED]" if match.get('cross_validated') else ""
            logger.info(f"    ✓ MATCH: {student.name} → {match['face_id']}{cross_val_note}")
            
            present_students.append(StudentMatch(
                student_id=student.student_id,
                name=student.name,
                roll_number=student.roll_number,
                confidence=match['confidence'],
                margin=match['margin'],
                image_index=match['image_index'],
                face_index=match['face_index'],
                second_best_confidence=None
            ))
        
        elif rejection:
            logger.warning(f"    ✗ REJECTED: {rejection['rejection_reason']}")


    # Calculate statistics
    total_identified = len(present_students)
    total_expected = len(request.students)
    attendance_rate = total_identified / total_expected if total_expected > 0 else 0.0
    unidentified_faces = len(face_pool) - len(matched_face_ids)
    
    # Absent students
    present_ids = {s.student_id for s in present_students}
    absent_students = [
        {
            "student_id": student.student_id,
            "name": student.name,
            "roll_number": student.roll_number
        }
        for student in request.students
        if student.student_id not in present_ids
    ]
    
    # Sort by confidence
    present_students.sort(key=lambda x: x.confidence, reverse=True)
    
    logger.info(f"\n{'='*70}")
    logger.info(f"ATTENDANCE SUMMARY")
    logger.info(f"{'='*70}")
    logger.info(f"Total faces detected: {len(face_pool)}")
    logger.info(f"Present: {total_identified}/{total_expected} students ({attendance_rate:.1%})")
    logger.info(f"Rejected: {len(rejected_matches)} matches")
    logger.info(f"Unidentified: {unidentified_faces} faces")
    logger.info(f"{'='*70}\n")
    
    return AttendanceResponse(
        total_images_processed=total_images_processed,
        total_faces_detected=len(face_pool),
        total_students_identified=total_identified,
        total_students_expected=total_expected,
        attendance_rate=round(attendance_rate, 3),
        present_students=present_students,
        absent_students=absent_students,
        unidentified_faces=unidentified_faces,
        rejected_matches=rejected_matches
    )
    
# ===== RUN SERVER =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)