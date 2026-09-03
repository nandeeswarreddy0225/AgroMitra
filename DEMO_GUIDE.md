# AgroMitra — Demonstration & Evaluation Guide

**Smart Farming. Better Decisions. Stronger Connections.**

---

## 1. Executive Overview

**AgroMitra** is a comprehensive, production-ready digital agriculture platform designed to empower all three critical pillars of the agricultural supply chain:
1. **🌾 Farmer** — Empowered with AI crop disease diagnosis, hyperlocal weather, real-time APMC mandi market intelligence, verified government welfare schemes, and direct input procurement.
2. **🏪 Agri Store Partner** — Equipped with a digital catalog, inventory pricing controls, direct UPI QR payment collection, order preparation, and delivery partner dispatch tools.
3. **🚚 Delivery Partner** — Connected via dedicated assignment queues, real-time dispatch status management, and doorstep delivery lifecycle progression.

---

## 2. Application Architecture

```
                                  ┌───────────────────────────────┐
                                  │      AgroMitra Web App        │
                                  │  (React 18 + Vite + Tailwind) │
                                  │       Port: 5173              │
                                  └──────────────┬────────────────┘
                                                 │
                                                 │ REST API / JWT
                                                 ▼
                                  ┌───────────────────────────────┐
                                  │     Backend Express Core      │
                                  │   (TypeScript + Node.js)      │
                                  │       Port: 5000              │
                                  └──┬───────────┬──────────────┬─┘
                                     │           │              │
                   ┌─────────────────┘           │              └────────────────┐
                   ▼                             ▼                               ▼
    ┌───────────────────────────┐ ┌───────────────────────────┐   ┌───────────────────────────┐
    │   AI Diagnostics Engine   │ │     MongoDB Database      │   │     External APIs         │
    │  (FastAPI + PyTorch Deep  │ │ (Mongoose Persistence for │   │ (Open-Meteo Weather, APMC │
    │   Learning Pathology)     │ │  Users, Orders, Products) │   │  Mandi Rates, Razorpay)   │
    │       Port: 8000          │ │                           │   │                           │
    └───────────────────────────┘ └───────────────────────────┘   └───────────────────────────┘
```

---

## 3. Platform Capabilities & Core Features

| Module | Purpose & Features |
| :--- | :--- |
| **AI Leaf Pathology Scanner** | Deep learning leaf image scanner detecting plant diseases with confidence scoring and targeted treatment recommendations. |
| **APMC Mandi Intelligence** | Real-time market spot rates across national mandis with AI-assisted modal price trend analysis. |
| **Hyperlocal Agro Weather** | Location-aware hourly and multi-day meteorological forecasts tailored for spraying and harvesting. |
| **Seasonal Crop Advisor** | Multi-factor agronomic recommendations based on soil type, seasonal calendar, and regional climate. |
| **Government Schemes Portal** | Searchable database of 17+ verified Central and State agricultural subsidy and welfare schemes. |
| **Agricultural Marketplace** | Direct catalog for certified seeds, bio-pesticides, and farm equipment from verified local stores. |
| **Direct UPI QR Payments** | Dynamic UPI QR generation embedding the store's verified VPA, order total, and reference transaction string. |
| **Multi-Tenant Order Dispatch** | End-to-end 4-stage delivery progression (`ASSIGNED` $\rightarrow$ `ACCEPTED` $\rightarrow$ `OUT_FOR_DELIVERY` $\rightarrow$ `DELIVERED`). |
| **Multilingual Engine** | Dynamic real-time switching across 6 languages: English, Telugu (తెలుగు), Hindi (हिन्दी), Kannada (ಕನ್ನಡ), Tamil (தமிழ்), and Marathi (मराठी). |
| **Adaptive Theme System** | High-contrast Light Mode and optimized Dark Mode tailored for daylight field use and low-light environments. |

---

## 4. How to Start the Services

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- MongoDB running locally or accessible via `MONGODB_URI`

### Starting the Services (Three Independent Terminals)

#### Terminal 1: Backend Express API Core
```bash
cd backend
npm install
npm run dev
# Server runs on: http://localhost:5000/api
```

#### Terminal 2: AI Leaf Pathology Microservice
```bash
cd ai-service
# Activate virtual environment
# Windows: .venv\Scripts\activate
# Linux/Mac: source .venv/bin/activate
python main.py
# AI Microservice runs on: http://localhost:8000 (Docs: http://localhost:8000/docs)
```

#### Terminal 3: Frontend Web Application
```bash
cd frontend
npm install
npm run dev
# Web application opens on: http://localhost:5173
```

---

## 5. Demonstration Accounts

> [!NOTE]
> For security standards, only role identifiers/usernames are documented below. Standard credentials configured during system setup are used for authentication.

| Primary Role | Registered Account Identifier | Access Scope |
| :--- | :--- | :--- |
| 🌾 **Farmer** | `nandeeswarreddy2852@gmail.com` | AI Tools, Crop Advisor, Mandi Rates, Marketplace, Cart, Orders, Tracking |
| 🏪 **Agri Store Partner** | `nandeeswarreddy1346@gmail.com` | Store Inventory, Catalog Pricing, UPI QR Settings, Order Fulfillment & Dispatch |
| 🚚 **Delivery Partner** | `delivery@agrimart.com` | Delivery Dashboard, Request Acceptance, Status Progression & Delivery History |
| 🛡️ **Administrator** | `admin@agrimart.com` | System Health Monitoring & Global Infrastructure Administration |

---

## 6. Recommended College Demonstration Sequence

### Step 1: Branding, Multilingual & Accessibility Showcase
1. Open [http://localhost:5173](http://localhost:5173) in your browser.
2. Demonstrate the **AgroMitra** brand and the 3-pillar ecosystem story (*From Seed to Market*).
3. Switch language between **English** $\leftrightarrow$ **Telugu** / **Hindi** / **Kannada** / **Tamil** / **Marathi** using the globe selector.
4. Toggle the **Dark / Light Mode** switch in the top navigation bar.

### Step 2: Farmer Intelligence Tools (AI, Weather & Mandi)
1. Log in as the **Farmer**.
2. Navigate to **AI Leaf Scanner** (`/ai/crop-disease`):
   - Upload or select a plant leaf sample.
   - Run AI diagnosis to observe the PyTorch neural network model output, confidence score, and treatment suggestions.
3. Open **Mandi Rates** on the homepage to demonstrate live APMC spot rates and AI price trends.
4. Open **Agro Weather** to view live temperature, humidity, wind conditions, and farm activity alerts.
5. Browse **Govt Schemes** (`/schemes`) to filter verified agricultural subsidy programs.

### Step 3: Marketplace Procurement & Dual Payment Routing
1. Go to **Marketplace** (`/marketplace`).
2. Search and filter through non-fertilizer certified products (e.g. *Certified Hybrid Cotton Seeds*).
3. Add products to the cart and navigate to **Checkout** (`/checkout`).
4. Select delivery address and click **Proceed to Payment**:
   - Demonstrate **Direct Agri Store Partner UPI QR Code** (notice real store UPI ID and order reference encoded in the QR).
   - Demonstrate **Razorpay Online Payment** gateway integration.
5. Submit payment confirmation to generate a verified Order ID.

### Step 4: Agri Store Partner Order Fulfillment & Delivery Assignment
1. In a separate tab/window, log in as the **Agri Store Partner**.
2. Open **Store Dashboard** (`/shop-owner/dashboard`) and **Fulfill Orders** (`/shop/orders`).
3. Locate the new incoming Farmer order.
4. Verify payment status and click **Accept & Prepare Order** (`PROCESSING`).
5. Select an active **Delivery Partner** from the real-time available list and assign the order.

### Step 5: Delivery Partner Acceptance & 4-Stage Live Tracking
1. Log in as the **Delivery Partner** (`/delivery/dashboard`).
2. View the new pending delivery assignment with shop and delivery location details.
3. Click **Accept Delivery Request** (`ACCEPTED`).
4. Progress the status:
   - Click **Picked Up from Store** (`OUT_FOR_DELIVERY`).
   - Click **Mark Delivered to Farmer** (`DELIVERED`).
5. Switch back to the **Farmer Orders** screen to verify the order status reflects **DELIVERED** in real time.

---

## 7. Service Dependencies & Integration Points

- **Express REST API Core (Port 5000)**: Coordinates all transactional state, authentication, role authorization, and MongoDB persistence.
- **FastAPI AI Microservice (Port 8000)**: Serves computer vision inference for crop pathology diagnostics.
- **MongoDB Database**: Holds structured collections for `users`, `products`, `orders`, and `deliveryprofiles`.
- **Open-Meteo & Geolocation Web Services**: Provides coordinate-based meteorological feeds.
- **Agmarknet APMC Price Ingestion**: Powers daily commodity mandi spot rates.
- **Razorpay SDK & Direct UPI Standards**: Dual-channel payment integration.

---

## 8. Known Operational Notes

1. **AI Leaf Scanner**: Deep learning predictions are optimized for well-lit, close-up images of single crop leaves. An explicit uncertainty threshold is displayed when confidence is below standard margins.
2. **UPI Verification**: Direct UPI QR payments use merchant UPI URI standards (`upi://pay?pa=...`) and persist farmer UTR transaction references for store accounting.
3. **Mandi Pricing**: Commodity spot prices are indexed against APMC wholesale trading registers and reflect the latest market sessions.
