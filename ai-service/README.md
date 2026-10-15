# AgroMitra AI Universal Plant Pathology & Botanical Vision Service

The AgroMitra AI Service provides deep-learning crop disease diagnosis, broad botanical species identification (covering 50,000+ plant, fruit, flower, and tree species), non-leaf organ gating, and agricultural intelligence.

It operates as an independent microservice interfacing directly with the AgroMitra Node.js backend and React frontend.

---

## 🌟 Key Architecture & Capabilities

1. **Dual-Tier Botanical Vision Architecture**:
   - **Tier 1 (Broad Identification Engine)**: Connects to official **Pl@ntNet API** (50,000+ flora species) with an offline geometric **Local Botanical Vision Engine** fallback for open-world Indian crops (Guava, Okra, Papaya, Coconut, Wheat, Brinjal, Tulsi, etc.).
   - **Tier 2 (Certified Specialist Pathology Engine)**: Deep multi-task MobileNetV3 neural model trained specifically on 18 commercial agricultural crops across 49 distinct condition classes.

2. **Organ-Gated Pathology Diagnosis**:
   - Analyzes organ morphology (`leaf`, `fruit`, `flower`, `bark`).
   - If an image depicts a **fruit**, **flower**, or **bark**, foliar disease models are strictly blocked, returning `diagnosisStatus: "ORGAN_MISMATCH"` and `disease: null`.
   - Never diagnoses foliar blights on fruit rind or wood.

3. **Anti-Hallucination Compatibility Safeguard**:
   - Verifies whether an identified plant species belongs to the 18 specialist crops before running disease inference.
   - Unsupported open-world species return `diagnosisStatus: "DISEASE_UNCERTAIN"` and `disease: null`.
   - **Never defaults unsupported crops to Tomato.**
   - **Never converts uncertain predictions into healthy results.**
   - Separates species confidence from disease confidence. No artificial 80% inflation.

4. **Multi-Stage Input Validation**:
   - Actively catches and safely rejects corrupted bytes, zero-byte uploads, out-of-focus blurry images, dark/underexposed photos, blank white photos, and non-plant objects.

---

## 📁 Folder Structure

```
ai-service/
├── .env.example              # Environment variables template
├── main.py                   # FastAPI REST service & API routes
├── model.py                  # PyTorch Multi-Task MobileNetV3 & Specialist Classifier
├── plant_id_provider.py      # Pl@ntNet API integration & Local Botanical Vision Engine
├── requirements.txt          # Production dependencies
├── crop_disease_model_multitask_v3.pth # Specialist PyTorch model weights
├── datasets/                 # Real test specimens (canonical & open-world)
│   ├── canonical_real_dataset/ # Real field leaves for the 18 specialist crops
│   └── open_world_test/      # Real open-world specimens (Guava, Okra, Tulsi, Bark, Fruit)
└── tests/
    ├── __init__.py
    └── test_ai_scanner.py    # Comprehensive 19-test automated test suite
```

---

## ⚙️ Setup Instructions (Windows)

### 1. Prerequisites
- Python 3.10 or later installed on Windows.
- Ensure Python and pip are added to your PATH.

### 2. Create and Activate Virtual Environment
Open PowerShell or Command Prompt in the `ai-service/` directory:

```powershell
cd d:\Agrimart\ai-service

# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\activate
```

### 3. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:

```powershell
copy .env.example .env
```

Edit `.env` to configure:
```env
PORT=8000

# Optional: Pl@ntNet API Key for open-world botanical identification (50,000+ species)
# Obtain a free key at https://my-api.plantnet.org/
PLANTNET_API_KEY=your_plantnet_api_key_here
```
*(If `PLANTNET_API_KEY` is not provided, the service automatically and seamlessly falls back to the high-accuracy offline Local Botanical Vision Engine).*

---

## 🚀 Running the Service

Start the FastAPI server with Uvicorn:

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The service will start on `http://localhost:8000`.

### Health Check Endpoint
To verify the service is active, loaded with models, and healthy:

```
GET http://localhost:8000/health
```

Example JSON response:
```json
{
  "status": "healthy",
  "service": "AgroMitra AI Service",
  "model_loaded": true,
  "classes_count": 49,
  "specialist_crops_count": 18,
  "specialist_crops": [
    "Apple", "Banana", "Blueberry", "Cherry", "Chilli", "Citrus",
    "Corn", "Cotton", "Grape", "Mango", "Neem", "Peach",
    "Potato", "Raspberry", "Rice", "Soybean", "Strawberry", "Tomato"
  ],
  "plantnet_configured": false,
  "identification_providers": ["Pl@ntNet API", "Local Botanical Vision Engine"],
  "organs_supported": ["leaf", "fruit", "flower", "bark"],
  "model_version": 3
}
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Service root and metadata |
| `GET` | `/health` | Health check and loaded model diagnostics |
| `POST` | `/predict` | Full pipeline: Organ detection, species identification, and safe disease diagnosis |
| `POST` | `/identify` | Dedicated broad plant/fruit botanical identification endpoint |
| `POST` | `/market-analysis` | APMC Mandi time-series price trend forecasting |

---

## 🌿 Supported Species & Diseases

### 1. Broad Botanical Identification (Tier 1)
- **Pl@ntNet API**: 50,000+ plant, tree, herb, and fruit species globally.
- **Local Botanical Vision Engine**: Real-time geometric and phenotypic fallback for open-world crops:
  - Guava (*Psidium guajava*)
  - Okra / Lady's Finger (*Abelmoschus esculentus*)
  - Papaya (*Carica papaya*)
  - Coconut Palm (*Cocos nucifera*)
  - Wheat (*Triticum aestivum*)
  - Brinjal / Eggplant (*Solanum melongena*)
  - Holy Basil / Tulsi (*Ocimum tenuiflorum*)
  - Tree Bark (*Plantae Woody Trunk*)
  - Fruit Rinds & Petal Blooms

### 2. Specialist Certified Crop Pathology (Tier 2 - 18 Crops, 49 Classes)

| Crop | Supported Conditions / Diseases |
|---|---|
| **Apple** | Healthy, Apple Scab, Black Rot |
| **Banana** | Healthy, Black Sigatoka |
| **Blueberry** | Healthy |
| **Cherry** | Healthy, Powdery Mildew |
| **Chilli** | Healthy, Bacterial Spot |
| **Citrus** | Healthy, Citrus Canker, Citrus Greening |
| **Corn (Maize)** | Healthy, Common Rust, Northern Leaf Blight |
| **Cotton** | Healthy, Bacterial Blight |
| **Grape** | Healthy, Black Rot, Esca (Black Measles) |
| **Mango** | Healthy, Anthracnose |
| **Neem** | Healthy, Leaf Spot Blight |
| **Peach** | Healthy, Bacterial Spot |
| **Potato** | Healthy, Early Blight, Late Blight |
| **Raspberry** | Healthy |
| **Rice** | Healthy, Bacterial Blight, Brown Spot |
| **Soybean** | Healthy |
| **Strawberry** | Healthy, Leaf Scorch |
| **Tomato** | Healthy, Bacterial Spot, Early Blight, Late Blight, Leaf Mold, Septoria Leaf Spot, Spider Mites, Target Spot, Yellow Leaf Curl Virus, Mosaic Virus |

---

## 🧪 Running Automated Tests

A comprehensive 19-test automated test suite is included in `tests/test_ai_scanner.py`. It rigorously evaluates:
1. Supported crop leaves (Tomato, Potato, Rice)
2. Unsupported open-world species isolation (Guava, Okra, Tulsi)
3. Non-leaf organ gating (Apple fruit, Peach fruit, Tree bark, Flower blooms)
4. Quality and non-plant rejections (Blurry, Dark, Blank, Non-plant object, Empty file, Corrupt bytes)
5. API resiliency and graceful fallbacks (Missing keys, Timeouts)
6. Separate calculation of Species Accuracy, Disease Accuracy, and Rejection Rates.

To execute the test suite:

```powershell
$env:PYTHONIOENCODING="utf-8"
python -m unittest tests/test_ai_scanner.py
```

### Expected Output:
```
Ran 19 tests in 4.586s

OK
================================================================================
  AI SCANNER TEST EVALUATION & OBJECTIVE METRICS REPORT
================================================================================
Total Tests Executed:         19
Total Tests Passed:           19 / 19 (100.0%)
--------------------------------------------------------------------------------
Supported Species Accuracy:   100.0% (4/4 specimens)
Supported Disease Accuracy:   100.0% (4/4 specimens)
Unsupported Safety Isolation: 100.0% (3/3 safely isolated with disease=null)
Non-Leaf Organ Gating Rate:   100.0% (4/4 non-leaf specimens gated)
Invalid Input Rejection Rate: 100.0% (6/6 invalid specimens properly rejected)
================================================================================
NOTE: Accepted-prediction accuracy is reported separately from overall rejection rates.
```
