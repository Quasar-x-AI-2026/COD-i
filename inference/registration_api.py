from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import List, Dict, Any, Optional
import numpy as np
import requests
from io import BytesIO
from PIL import Image
import logging

from facerec.facerec_model import FaceExtractor
from facerec.orchestrator import FaceRegistrationOrchestrator
from facerec.embedding_model import ArcFaceONNXEmbedder

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Student Registration API", version="1.0.0")

# Initialize models globally (loaded once at startup)
extractor = FaceExtractor(debug=False)
embedder = ArcFaceONNXEmbedder()
orchestrator = FaceRegistrationOrchestrator(retinaface=extractor, embedder=embedder)


# ===== REQUEST/RESPONSE MODELS =====

class RegistrationRequest(BaseModel):
    student_id: str
    name: str
    roll_number: Optional[str] = None
    email: Optional[str] = None
    image_urls: List[HttpUrl]  # 2-4 Cloudinary URLs of the same student
    
    class Config:
        json_schema_extra = {
            "example": {
                "student_id": "STU001",
                "name": "Alice Johnson",
                "roll_number": "2024001",
                "email": "alice@university.edu",
                "image_urls": [
                    "https://res.cloudinary.com/.../alice1.jpg",
                    "https://res.cloudinary.com/.../alice2.jpg",
                    "https://res.cloudinary.com/.../alice3.jpg"
                ]
            }
        }


class BatchRegistrationRequest(BaseModel):
    students: List[RegistrationRequest]
    
    class Config:
        json_schema_extra = {
            "example": {
                "students": [
                    {
                        "student_id": "STU001",
                        "name": "Alice Johnson",
                        "roll_number": "2024001",
                        "image_urls": [
                            "https://res.cloudinary.com/.../alice1.jpg",
                            "https://res.cloudinary.com/.../alice2.jpg"
                        ]
                    }
                ]
            }
        }


class RegistrationResponse(BaseModel):
    student_id: str
    name: str
    roll_number: Optional[str]
    email: Optional[str]
    embedding: List[float]  # 512-dim centroid embedding
    num_images_processed: int
    num_faces_detected: int
    embeddings_consistent: bool
    average_quality_score: float
    status: str  # "success" or "warning"
    message: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "student_id": "STU001",
                "name": "Alice Johnson",
                "roll_number": "2024001",
                "email": "alice@university.edu",
                "embedding": [0.123] * 512,
                "num_images_processed": 3,
                "num_faces_detected": 3,
                "embeddings_consistent": True,
                "average_quality_score": 0.87,
                "status": "success",
                "message": None
            }
        }


class BatchRegistrationResponse(BaseModel):
    total_students: int
    successful: int
    failed: int
    results: List[Dict[str, Any]]
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_students": 3,
                "successful": 2,
                "failed": 1,
                "results": [
                    {
                        "student_id": "STU001",
                        "status": "success",
                        "embedding": [0.123] * 512
                    }
                ]
            }
        }


# ===== HELPER FUNCTIONS =====

def download_image_from_url(url: str) -> str:
    """
    Download image from Cloudinary URL and save temporarily.
    
    Returns:
        Path to temporary image file (in-memory processing)
    """
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        img = Image.open(BytesIO(response.content))
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Return numpy array directly
        return np.array(img)
    
    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Failed to download image: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")


def validate_registration_images(image_urls: List[str]) -> None:
    """Validate that we have the correct number of images."""
    if not (2 <= len(image_urls) <= 4):
        raise HTTPException(
            status_code=400,
            detail=f"Must provide between 2 and 4 images for registration. Got {len(image_urls)}"
        )


# ===== API ENDPOINTS =====

@app.get("/")
def root():
    return {
        "message": "Student Registration API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "register_single": "/api/v1/register",
            "register_batch": "/api/v1/register/batch"
        }
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "models_loaded": True,
        "extractor": "SCRFD",
        "embedder": "ArcFace"
    }


@app.post("/api/v1/register", response_model=RegistrationResponse)
def register_student(request: RegistrationRequest):
    """
    Register a single student with 2-4 photos.
    
    - Downloads images from Cloudinary URLs
    - Extracts face from each image
    - Generates embeddings
    - Computes centroid embedding for the student
    - Returns the centroid that should be stored in your database
    """
    
    logger.info(f"Registering student: {request.student_id} ({request.name})")
    
    # Validate
    validate_registration_images(request.image_urls)
    
    # Download images
    image_arrays = []
    for idx, url in enumerate(request.image_urls):
        logger.info(f"  Downloading image {idx + 1}/{len(request.image_urls)}: {url}")
        try:
            img_array = download_image_from_url(str(url))
            image_arrays.append(img_array)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to process image {idx + 1}: {str(e)}"
            )
    
    # Process images through registration pipeline
    try:
        result = orchestrator.run(image_arrays)
        
        centroid = result["centroid"]  # (512,) L2-normalized
        embeddings = result["embeddings"]  # (N, 512)
        num_faces = result["num_faces"]
        
        # Calculate average quality (using centroid similarity to each embedding)
        similarities = [float(np.dot(centroid, emb)) for emb in embeddings]
        avg_quality = float(np.mean(similarities))
        
        # Check if embeddings are consistent
        from facerec.aggregation import embeddings_consistent
        is_consistent = embeddings_consistent(embeddings)
        
        status = "success" if is_consistent else "warning"
        message = None if is_consistent else "Warning: Embeddings show low consistency. Consider retaking photos."
        
        logger.info(f"  ✓ Registration complete: {num_faces} faces, avg quality: {avg_quality:.3f}")
        
        return RegistrationResponse(
            student_id=request.student_id,
            name=request.name,
            roll_number=request.roll_number,
            email=request.email,
            embedding=centroid.tolist(),
            num_images_processed=len(image_arrays),
            num_faces_detected=num_faces,
            embeddings_consistent=is_consistent,
            average_quality_score=round(avg_quality, 3),
            status=status,
            message=message
        )
    
    except ValueError as e:
        logger.error(f"  ✗ Registration failed: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Registration failed: {str(e)}. Ensure all images contain a clear face."
        )
    except Exception as e:
        logger.error(f"  ✗ Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.post("/api/v1/register/batch", response_model=BatchRegistrationResponse)
def register_students_batch(request: BatchRegistrationRequest):
    """
    Register multiple students in a single request.
    
    Processes each student independently and returns results for all.
    Failed registrations don't stop the batch process.
    """
    
    logger.info(f"Batch registration: {len(request.students)} students")
    
    results = []
    successful = 0
    failed = 0
    
    for idx, student_req in enumerate(request.students):
        logger.info(f"Processing student {idx + 1}/{len(request.students)}: {student_req.student_id}")
        
        try:
            # Register individual student
            response = register_student(student_req)
            
            results.append({
                "student_id": student_req.student_id,
                "name": student_req.name,
                "status": response.status,
                "embedding": response.embedding,
                "embeddings_consistent": response.embeddings_consistent,
                "average_quality_score": response.average_quality_score,
                "message": response.message
            })
            
            successful += 1
        
        except HTTPException as e:
            logger.error(f"  Failed: {e.detail}")
            results.append({
                "student_id": student_req.student_id,
                "name": student_req.name,
                "status": "failed",
                "error": e.detail
            })
            failed += 1
        
        except Exception as e:
            logger.error(f"  Unexpected error: {str(e)}")
            results.append({
                "student_id": student_req.student_id,
                "name": student_req.name,
                "status": "failed",
                "error": f"Internal error: {str(e)}"
            })
            failed += 1
    
    logger.info(f"Batch complete: {successful} successful, {failed} failed")
    
    return BatchRegistrationResponse(
        total_students=len(request.students),
        successful=successful,
        failed=failed,
        results=results
    )


@app.post("/api/v1/verify")
def verify_student(
    student_id: str,
    embedding: List[float],
    image_url: HttpUrl,
    threshold: float = 0.6
):
    """
    Verify a student by comparing their stored embedding with a new photo.
    
    Useful for identity verification or testing registration quality.
    """
    
    logger.info(f"Verifying student: {student_id}")
    
    if len(embedding) != 512:
        raise HTTPException(status_code=400, detail="Embedding must be 512 dimensions")
    
    # Download and process image
    try:
        img_array = download_image_from_url(str(image_url))
        
        # Extract face and generate embedding
        face_tensor = extractor.return_tensors(img_array)  # (1, 3, 112, 112)
        face_nhwc = np.transpose(face_tensor, (0, 2, 3, 1))
        new_embedding = embedder.embed(face_nhwc)[0]  # (512,)
        
        # Compare with stored embedding
        stored_embedding = np.array(embedding, dtype=np.float32)
        similarity = float(np.dot(stored_embedding, new_embedding))
        
        is_match = similarity >= threshold
        
        logger.info(f"  Similarity: {similarity:.3f}, Match: {is_match}")
        
        return {
            "student_id": student_id,
            "similarity": round(similarity, 3),
            "is_match": is_match,
            "threshold": threshold,
            "status": "verified" if is_match else "not_verified"
        }
    
    except Exception as e:
        logger.error(f"  Verification failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Verification failed: {str(e)}")


# ===== RUN SERVER =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)