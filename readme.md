# 🛡️ FaceID-Native: Enterprise Facial Recognition & Search

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React Native](https://img.shields.io/badge/Mobile-React_Native-61DAFB?style=flat&logo=react&logoColor=black)](https://reactnative.dev/)
[![Qdrant](https://img.shields.io/badge/Vector_DB-Qdrant-ff4060?style=flat&logo=qdrant)](https://qdrant.tech/)
[![ONNX](https://img.shields.io/badge/Inference-ONNX_Runtime-005ced?style=flat)](https://onnxruntime.ai/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**FaceID-Native** is a high-performance, full-stack facial recognition ecosystem. It leverages **SCRFD** for sub-millisecond face detection and **ArcFace-ResNet100** for generating discriminative 512-D identity embeddings, served via a scalable FastAPI backend and a sleek React Native mobile frontend.

---

## 🏗️ System Architecture

The system follows a decoupled architecture designed to handle heavy ML workloads without blocking the UI thread.



### The Workflow:
1.  **Mobile Client:** Captures frames via Expo Camera and streams them to the inference API.
2.  **API Gateway:** FastAPI receives the image, validated by **PyDantic** schemas.
3.  **Inference Engine:** * **SCRFD-10g:** Detects faces and extracts 5-point landmarks.
    * **ArcFace-ResNet100:** Produces a 512-D feature vector from the aligned face.
4.  **Vector Search:** **Qdrant** performs a Cosine Similarity search to find the closest identity.
5.  **Data Persistence:** **Prisma** manages user metadata and logs in **SQLite**.

---

## 🚀 Tech Stack

### **Machine Learning & Inference**
* **ONNX Runtime:** High-speed inference for `.onnx` model deployment.
* **SCRFD-10g:** State-of-the-art, efficient face detection.
* **ArcFace:** ResNet100-based deep face recognition.
* **OpenCV & NumPy:** Image preprocessing and affine transformations.

### **Backend & DevOps**
* **FastAPI:** High-concurrency Python web framework.
* **Qdrant:** Distributed vector database for high-speed embedding search.
* **Prisma + SQLite:** Modern ORM for relational user metadata.
* **Docker & Docker Compose:** Containerization for consistent deployment.

### **Mobile Frontend**
* **React Native / Expo:** Cross-platform mobile framework.
* **Axios:** Asynchronous API communication.

---

## 🧠 ML Pipeline Details

The system utilizes a **Detection-Alignment-Recognition** pipeline to ensure high accuracy regardless of head tilt or camera angle.



1.  **Preprocessing:** Images are resized to $640 \times 640$ for the SCRFD detector.
2.  **Alignment:** Using the 5 detected facial landmarks, an **Affine Transformation** is performed to center the eyes and mouth, outputting a $112 \times 112$ crop.
3.  **Inference:** The ArcFace model transforms the crop into a vector $v \in \mathbb{R}^{512}$.
4.  **Search:** Qdrant calculates the similarity score using the Cosine Similarity formula:
    $$\text{similarity} = \frac{A \cdot B}{\|A\| \|B\|}$$

---

## 🛠️ Installation & Setup

### 1. Quick Start (Docker Compose)
The fastest way to deploy the backend and vector database:
```bash
docker-compose up --build
2. Manual Backend SetupIf running locally for development:Bashcd backend
pip install -r requirements.txt

# Initialize Database
npx prisma generate
npx prisma db push

# Start Server
uvicorn main:app --host 0.0.0.0 --port 8000
3. Mobile App SetupBashcd mobile
npm install
npx expo start
📁 Project StructurePlaintext.
├── backend/
│   ├── models/          # SCRFD and ArcFace .onnx files
│   ├── core/            # Inference engine & image processing
│   ├── schemas/         # Pydantic models
│   ├── database/        # Prisma schema and SQLite logic
│   └── main.py          # FastAPI entry point
├── mobile/
│   ├── assets/          # Icons and branding
│   ├── src/
│   │   ├── components/  # CameraView, ResultOverlay
│   │   ├── services/    # API calling logic
│   │   └── theme/       # Styles and colors
│   └── App.js           # Navigation and state
├── docker-compose.yml   # Full system orchestration
└── README.md
📸 ScreenshotsRegistrationReal-time DetectionIdentity Match[Add Screenshot][Add Screenshot][Add Screenshot]📄 LicenseDistributed under the MIT License. See LICENSE for more information.