import time
import requests
import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

PROD_API_URL = "https://agromitra-ytqb.onrender.com/api"
SQUASH_IMG = r"D:\Agrimart\ai-service\datasets\PlantDoc\test\Squash Powdery mildew leaf\Powdery-Mildew-on-squash.jpg"
GUAVA_IMG = r"D:\Agrimart\ai-service\datasets\open_world_test\guava_leaf_healthy.jpg"
POTATO_IMG = r"D:\Agrimart\ai-service\datasets\canonical_real_dataset\Potato___Early_blight\base_001187a0-57ab-4329-baff-e7246a9edeb0___RS_Early.B 8178.JPG"

print("Polling Render production backend for Open-World deployment (commit d0c6b11)...", flush=True)

for attempt in range(1, 35):
    try:
        r_health = requests.get(f"{PROD_API_URL}/health", timeout=12)
        print(f"[{attempt:02d}/35] Health check HTTP {r_health.status_code}", flush=True)
        
        # Test Squash
        with open(SQUASH_IMG, "rb") as f:
            files = {"image": ("squash_powdery_mildew.jpg", f, "image/jpeg")}
            data = {"latitude": "15.8281", "longitude": "78.0373"}
            r = requests.post(f"{PROD_API_URL}/crop-health/analyze", files=files, data=data, timeout=25)
            
            print(f"  Squash scan response: HTTP {r.status_code}", flush=True)
            if r.status_code == 200:
                res = r.json()
                species = res.get("species")
                source = res.get("speciesSource")
                disease = res.get("disease")
                diag_status = res.get("diagnosisStatus")
                print(f"  Result: Species={species}, Source={source}, Disease={disease}, Status={diag_status}", flush=True)
                
                if species == "Squash" and source == "GENERAL_PLANT_MODEL" and diag_status == "DIAGNOSED":
                    print("✅ PRODUCTION RENDER IS OFFICIALLY RUNNING THE OPEN-WORLD AI ARCHITECTURE!", flush=True)
                    sys.exit(0)
    except Exception as e:
        print(f"[{attempt:02d}/35] Waiting... ({e})", flush=True)
        
    time.sleep(12)

print("❌ Timed out waiting for production deployment.", flush=True)
sys.exit(1)
