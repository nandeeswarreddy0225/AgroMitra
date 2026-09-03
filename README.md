# AgroMitra 🌾

**Smart Farming. Better Decisions. Stronger Connections.**

AgroMitra is a modern, integrated agricultural technology ecosystem connecting **Farmers**, **Agri Store Partners**, and **Delivery Partners** in a unified platform with AI leaf pathology diagnosis, hyperlocal agro weather, real-time APMC mandi market intelligence, verified government welfare schemes, and direct input procurement.

---

## 🏗️ System Architecture & Roles

AgroMitra empowers three primary agricultural users:

1. **🌾 Farmer**:
   - Deep-learning AI leaf disease scanner & treatment advisor.
   - Real-time national APMC wholesale mandi rates & AI price trend analysis.
   - Hyperlocal agricultural weather forecast with spraying/harvest guidance.
   - Seasonal soil-to-crop recommendation engine.
   - Verified Central and State government welfare schemes.
   - Direct farm input procurement with dual payment options (Direct Store UPI QR & Razorpay).
   - Real-time doorstep delivery tracking.

2. **🏪 Agri Store Partner**:
   - Digital catalog & inventory pricing management.
   - Direct merchant UPI QR payments with UTR verification.
   - Multi-tenant order fulfillment pipeline.
   - Real-time delivery partner assignment and dispatch management.

3. **🚚 Delivery Partner**:
   - Dedicated mobile-first delivery dashboard.
   - Order pickup and 4-stage lifecycle progression (`ASSIGNED` → `ACCEPTED` → `OUT_FOR_DELIVERY` → `DELIVERED`).
   - Real-time location notes and delivery completion history.

---

## 📂 Project Structure

```
AgroMitra/
├── frontend/             # React 18 + Vite + TypeScript + Tailwind CSS
├── backend/              # Node.js + Express + TypeScript + MongoDB / Mongoose
├── ai-service/           # Python + FastAPI + PyTorch Plant Pathology Microservice
├── DEMO_GUIDE.md         # College presentation & demo walkthrough guide
├── .env.example          # Environment variables template
├── package.json          # Workspace orchestration
└── .gitignore            # Git safety & ignore definitions
```

---

## ⚡ Quick Start

### Prerequisites
- **Node.js**: v18+
- **Python**: v3.10+
- **MongoDB**: Local WiredTiger or MongoDB Atlas instance

### 1. Backend Service (Port 5000)
```bash
cd backend
npm install
npm run dev
```
- API Base: `http://localhost:5000/api`
- Health: `GET http://localhost:5000/api/health`

### 2. AI Diagnostics Microservice (Port 8000)
```bash
cd ai-service
# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

pip install -r requirements.txt
python main.py
```
- AI Service: `http://localhost:8000`
- Swagger Docs: `http://localhost:8000/docs`

### 3. Frontend Web Application (Port 5173)
```bash
cd frontend
npm install
npm run dev
```
- Application: `http://localhost:5173`

---

## 🔒 Security & Environment Configuration

All confidential environment keys, database passwords, and secrets are strictly ignored from Git version control. Copy `.env.example` to `.env` in each service folder and configure local test credentials:

```bash
cp .env.example backend/.env
cp .env.example frontend/.env
cp .env.example ai-service/.env
```

---

## 🌐 Multilingual & Accessibility Support

AgroMitra supports 6 regional Indian languages with real-time dynamic switching:
- **English** (English)
- **Telugu** (తెలుగు)
- **Hindi** (हिन्दी)
- **Kannada** (ಕನ್ನಡ)
- **Tamil** (தமிழ்)
- **Marathi** (मराठी)

Includes adaptive **Dark Mode** and **Light Mode** themes optimized for sunlight field visibility and low-light battery efficiency.
