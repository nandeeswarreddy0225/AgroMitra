# AgroMitra 🌾

**Smart Farming. Better Decisions. Stronger Connections.**

AgroMitra is a modern, full-stack digital agriculture platform designed to connect three foundational stakeholders of the agricultural supply chain:
- **🌾 Farmers** — Accessing AI crop diagnostics, live weather advisories, national mandi price intelligence, verified government welfare schemes, and direct input procurement.
- **🏪 Agri Store Partners** — Managing digital catalogs, inventory pricing, direct merchant UPI QR payment collection, and delivery partner dispatch.
- **🚚 Delivery Partners** — Handling real-time assignment requests, pickup routing, 4-stage delivery status progression, and doorstep confirmation.

---

## 🌟 Key Features

### 1. 🌾 Farmer Authentication & Dashboard
- Role-based JWT authentication with secure session handling and password encryption.
- Unified farmer dashboard aggregating recent orders, weather alerts, quick-access agricultural tools, and crop advisory insights.

### 2. 🛒 Agricultural Marketplace
- Catalog of agricultural inputs including certified seeds, crop protection, bio-products, and farming equipment.
- Multi-field search (by product name, brand, category, and description), category filter chips, and dynamic sorting (price, newest arrivals).

### 3. 🛍️ Cart & Multi-Step Checkout
- Persistent cart state across sessions with real-time stock limits and quantity management.
- Multi-address checkout flow supporting customized delivery addresses and billing summaries.

### 4. 💳 Dual Payment Pipeline
- **Direct Agri Store Partner UPI QR**: Dynamically generated merchant UPI QR code encoding the store's verified VPA, exact payable amount, and unique order reference for direct payment with UTR tracking.
- **Razorpay Online Gateway**: Integrated card, net banking, and UPI checkout with server-side cryptographic HMAC-SHA256 signature verification.

### 5. 🏪 Agri Store Partner Workflow
- Multi-tenant inventory management allowing store partners to add, update, price, and track agricultural products.
- Store order queue with payment status inspection, order preparation (`PROCESSING`), and local delivery partner assignment.

### 6. 🚚 Delivery Partner Dispatch & Tracking
- Dedicated delivery partner dashboard displaying pending assignments, store pickups, and customer destinations.
- 4-stage persisted delivery progression: `ASSIGNED` → `ACCEPTED` → `OUT_FOR_DELIVERY` → `DELIVERED`.
- Order status synchronization visible to farmers in real time.

### 7. 🌦️ Hyperlocal Live Agro Weather
- Coordinate-based live weather feeds displaying temperature, humidity, wind velocity, precipitation likelihood, and tailored agricultural spraying/harvesting guidance.

### 8. 📊 Mandi / Market Price Intelligence
- APMC wholesale mandi spot prices across Indian agricultural commodity markets.
- Market intelligence module providing modal price trend analysis and historical context.

### 9. 🏛️ Government Schemes Portal
- Searchable catalog of 17+ Central and State agricultural subsidy and welfare schemes (PM-KISAN, PMFBY, AIF, PKVY, etc.) with official application links and eligibility criteria.

### 10. 🧪 Seasonal Soil-to-Crop Advisor
- Agronomic recommendation engine evaluating soil texture, seasonal calendar (Kharif, Rabi, Zaid), and regional climate to suggest suitable crops, expected yields, and cultivation practices.

### 11. 🔬 AI Crop Disease & Leaf Scanner
- Deep-learning plant pathology diagnostic engine powered by FastAPI and PyTorch.
- Analyzes uploaded leaf imagery to detect crop diseases, assess confidence levels, flag low-confidence predictions, and provide actionable chemical and organic treatment remedies.

### 12. 🌐 Multi-Language & Theme Support
- Dynamic language switching across 6 regional Indian languages: **English**, **Telugu (తెలుగు)**, **Hindi (हिन्दी)**, **Kannada (ಕನ್ನಡ)**, **Tamil (தமிழ்)**, and **Marathi (मराठी)**.
- High-contrast **Light Mode** and battery-efficient **Dark Mode** optimized for outdoor daylight conditions and low-light environments.

---

## 👥 User Roles & Responsibilities

| Primary User Role | Internal Role Code | Primary Responsibilities & Access Scope |
| :--- | :---: | :--- |
| **🌾 Farmer** | `FARMER` | Procures agricultural supplies, scans crops for disease, tracks orders, monitors weather, views mandi prices, and explores welfare schemes. |
| **🏪 Agri Store Partner** | `SHOP_OWNER` | Manages store catalog/pricing, receives farmer orders, verifies payment records, and assigns local delivery partners. |
| **🚚 Delivery Partner** | `DELIVERY_BOY` | Accepts delivery assignments, picks up packages from stores, navigates to farmers, and confirms delivery completion. |
| **🛡️ Administrator** | `ADMIN` | Monitors system health, manages platform integrity, and oversees multi-tenant operations. |

---

## 💻 Technology Stack

### Frontend Application
- **Framework**: React 18 (SPA) with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom typography (`Space Grotesk` headings & `Inter` body)
- **Icons**: Lucide React
- **Routing**: React Router v6
- **HTTP Client**: Axios with centralized interceptors
- **Internationalization**: Custom lightweight i18n context with 6 language dictionaries

### Backend Core Service
- **Runtime**: Node.js & TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM (supports local WiredTiger & MongoDB Atlas)
- **Security & Auth**: JSON Web Tokens (JWT), Bcrypt password hashing, role-based authorization guards
- **Payments**: Razorpay Node.js SDK & dynamic standard UPI QR generator (`upi://pay`)

### AI Diagnostics Microservice
- **Framework**: Python 3.10+ & FastAPI
- **Machine Learning**: PyTorch & Torchvision (Convolutional Neural Network architecture)
- **Image Processing**: Pillow (PIL), NumPy
- **Server**: Uvicorn ASGI

---

## 🏛️ High-Level Architecture

```
                                  ┌────────────────────────────────┐
                                  │      AgroMitra Web App         │
                                  │ (React 18 + Vite + TypeScript) │
                                  │           Port: 5173           │
                                  └───────────────┬────────────────┘
                                                  │
                                                  │ HTTPS / REST API / JWT
                                                  ▼
                                  ┌────────────────────────────────┐
                                  │      Backend Express Core      │
                                  │     (TypeScript + Node.js)     │
                                  │           Port: 5000           │
                                  └───┬───────────┬────────────┬───┘
                                      │           │            │
                    ┌─────────────────┘           │            └─────────────────┐
                    ▼                             ▼                              ▼
     ┌────────────────────────────┐ ┌───────────────────────────┐  ┌───────────────────────────┐
     │   AI Diagnostics Service   │ │      MongoDB Database     │  │       External APIs       │
     │ (FastAPI + PyTorch Vision) │ │ (Persistent Collections:  │  │ (Open-Meteo Agro Weather, │
     │         Port: 8000         │ │ Users, Products, Orders)  │  │   APMC Mandi, Razorpay)   │
     └────────────────────────────┘ └───────────────────────────┘  └───────────────────────────┘
```

---

## 📂 Project Folder Structure

```
AgroMitra/
├── frontend/                     # React + Vite + TypeScript Frontend Application
│   ├── src/
│   │   ├── components/           # UI components (Navbar, Footer, Cards, Weather, Market)
│   │   ├── context/              # Context providers (Auth, Cart, Language, Theme)
│   │   ├── i18n/                 # Multilingual dictionaries (translations.ts)
│   │   ├── pages/                # Views (Home, Marketplace, Checkout, Dashboards, AI)
│   │   ├── services/             # Axios API client integrations
│   │   └── types/                # TypeScript interfaces & models
│   ├── index.html                # Application entry HTML
│   ├── tailwind.config.js        # Tailwind styling & typography configuration
│   └── .env.example              # Frontend environment template
│
├── backend/                      # Node.js + Express + TypeScript Core REST API
│   ├── src/
│   │   ├── config/               # Database connection & persistence setup
│   │   ├── controllers/          # Business logic handlers (auth, product, order, payment)
│   │   ├── data/                 # Government schemes & seasonal crop datasets
│   │   ├── middlewares/          # Authentication & error handling middleware
│   │   ├── models/               # Mongoose schema definitions
│   │   ├── routes/               # Express API endpoints
│   │   ├── services/             # Weather, mandi, and crop advisor services
│   │   └── tests/                # Automated verification & audit test suites
│   └── .env.example              # Backend environment template
│
├── ai-service/                   # FastAPI + PyTorch Plant Pathology Microservice
│   ├── main.py                   # FastAPI application & endpoints
│   ├── model.py                  # PyTorch model definition & inference pipeline
│   ├── disease_info.py           # Pathology symptoms, causes, and treatment data
│   ├── requirements.txt          # Python package dependencies
│   └── .env.example              # AI service environment template
│
├── DEMO_GUIDE.md                 # Complete demonstration & evaluation walkthrough guide
├── .env.example                  # Root unified environment template
├── .gitignore                    # Git security & exclusion rules
└── package.json                  # Workspace orchestration scripts
```

---

## ⚙️ Local Setup Instructions

### Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Python**: v3.10 or higher
- **MongoDB**: Local MongoDB instance or MongoDB Atlas cluster connection

### 1. Configure Environment Variables
Copy `.env.example` to `.env` in the respective service directories:

```bash
# In backend directory
cp backend/.env.example backend/.env

# In frontend directory
cp frontend/.env.example frontend/.env

# In ai-service directory
cp ai-service/.env.example ai-service/.env
```

> [!IMPORTANT]
> Supply your local configuration values in each `.env` file. Never commit `.env` files to source control.

---

## 🚀 Running the Services

To run the complete platform, open three terminal windows:

### Terminal 1: Backend API Core
```bash
cd backend
npm install
npm run dev
```
- **Service URL**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/api/health`

### Terminal 2: AI Diagnostics Microservice
```bash
cd ai-service

# Create and activate virtual environment
# Windows:
python -m venv .venv
.venv\Scripts\activate

# Linux / macOS:
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies and start service
pip install -r requirements.txt
python main.py
```
- **Service URL**: `http://localhost:8000`
- **Interactive OpenAPI Documentation**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`

### Terminal 3: Frontend Web Application
```bash
cd frontend
npm install
npm run dev
```
- **Application URL**: `http://localhost:5173`

---

## 🔒 Security & Safe Coding Practices

- **Environment Isolation**: Database connection strings, JWT signing keys, and payment credentials are read strictly from runtime environment variables.
- **Git Security**: Comprehensive `.gitignore` rules prevent `.env`, `.env.*`, `node_modules/`, `dist/`, `build/`, `.venv/`, `.mongodb_data/`, and runtime logs from entering Git history.
- **Input Validation & HMAC Verification**: Payment signatures and request payloads undergo backend validation, cryptographic signature checking, and role-based access verification.

---

## 📊 Project Status & Testing

The platform includes automated testing and integration coverage across key modules:
- **Authentication & Authorization**: Role-based access control for Farmers, Agri Store Partners, and Delivery Partners.
- **Marketplace & Cart**: Product discovery, multi-field search, filtering, and stock-aware checkout.
- **Dual Payment Pipeline**: Direct store UPI QR generation with reference tracking and Razorpay gateway integration.
- **Delivery Workflow**: Multi-stage state machine tracking order progression to completion.
- **AI Diagnostics**: PyTorch vision model serving real-time disease classifications and treatment advisories.
- **APMC Mandi & Weather Services**: Integrated live market observation feeds and coordinate-based forecasts.
- **Multilingual & Theme Engine**: Verified translations across 6 languages in Light & Dark modes.

---

## 📖 Demonstration & Evaluation Guide

For step-by-step presentation instructions, evaluation flows, and role testing sequences, please refer to:
👉 **[`DEMO_GUIDE.md`](./DEMO_GUIDE.md)**
