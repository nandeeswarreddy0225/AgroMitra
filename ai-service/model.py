import io
import os
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image, ImageStat
import numpy as np
from typing import Dict, Any, Tuple, Optional
from disease_info import (
    UNIVERSAL_PATHOLOGY_DATABASE,
    PLANT_SPECIES_DATABASE,
    DISEASE_DATABASE,
    STANDARD_CLASSES,
    DEFAULT_DISCLAIMER,
)

class UniversalLeafScannerEngine:
    def __init__(self, model_path: str = None):
        self.device = torch.device("cpu")
        self.classes = STANDARD_CLASSES
        self.num_classes = len(self.classes)
        self.model_path = model_path or os.path.join(os.path.dirname(__file__), "crop_disease_model.pth")
        self.model = self._load_model()
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
        print(f"[Universal Leaf Scanner]: Engine initialized with {self.num_classes} plant pathology classes.")

    def _load_model(self) -> nn.Module:
        model = models.mobilenet_v3_small(weights=None)
        in_features = model.classifier[3].in_features
        head = nn.Sequential(
            nn.Linear(in_features, 256),
            nn.Hardswish(),
            nn.Dropout(p=0.2),
            nn.Linear(256, self.num_classes)
        )
        model.classifier[3] = head

        if os.path.exists(self.model_path):
            try:
                checkpoint = torch.load(self.model_path, map_location=self.device, weights_only=False)
                if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
                    model.load_state_dict(checkpoint["model_state_dict"], strict=False)
                    if "classes" in checkpoint:
                        self.classes = checkpoint["classes"]
                        self.num_classes = len(self.classes)
                    val_acc = checkpoint.get("val_accuracy", "N/A")
                    print(f"[Universal Leaf Scanner]: Loaded trained weights from '{self.model_path}' (Val Acc: {val_acc}%).")
                else:
                    model.load_state_dict(checkpoint, strict=False)
                    print(f"[Universal Leaf Scanner]: Loaded state_dict from '{self.model_path}'.")
            except Exception as e:
                print(f"⚠️ [Universal Leaf Scanner]: Checkpoint notice '{self.model_path}': {e}. Initializing neural architecture.")
        else:
            print(f"⚠️ [Universal Leaf Scanner]: Checkpoint '{self.model_path}' not found. Initializing base weights.")

        model.to(self.device)
        model.eval()
        return model

    def validate_image_quality(self, image: Image.Image) -> Tuple[bool, str]:
        """
        Stage 0 Image Quality Gate:
        Verifies that the uploaded image contains recognizable plant foliage and is of sufficient quality.
        Rejects non-plant images, blank/monochrome images, or severe underexposure.
        """
        width, height = image.size
        if width < 50 or height < 50:
            return False, "Image resolution is too low. Please upload a clear photo of a plant leaf."

        # Convert to RGB if needed
        rgb_img = image.convert("RGB")
        stat = ImageStat.Stat(rgb_img)
        
        # Check variance across color channels
        var = sum(stat.var) / 3.0
        mean = sum(stat.mean) / 3.0

        if var < 15.0:
            # Monotone / blank image
            return False, "Please upload a clear photo of a plant leaf."

        if mean < 15.0 or mean > 245.0:
            # Severely underexposed / completely overexposed
            return False, "Image lighting is too dark or washed out. Please upload a clear photo in good daylight."

        # Analyze foliage index across image pixels
        img_np = np.array(rgb_img, dtype=np.float32) / 255.0
        r, g, b = img_np[:, :, 0], img_np[:, :, 1], img_np[:, :, 2]
        
        # Excess Green Index (ExG)
        exg = 2.0 * g - r - b
        foliage_pixels = np.sum(exg > -0.15)
        total_pixels = img_np.shape[0] * img_np.shape[1]
        foliage_ratio = foliage_pixels / float(total_pixels)
        green_mean = np.mean(g)

        # Non-plant rejection check (e.g. metallic tools, plain walls, dark devices)
        if foliage_ratio < 0.05 and green_mean < 0.12 and var < 120.0:
            return False, "Please upload a clear photo of a plant leaf."

        return True, "OK"

    def predict(self, image_bytes: bytes, filename: str = "image.jpg", mimetype: str = "image/jpeg") -> Dict[str, Any]:
        """
        Universal Leaf Scanner Diagnostic Pipeline:
        IMAGE -> QUALITY CHECK -> PLANT IDENTIFICATION -> HEALTH STATUS -> DISEASE CLASSIFICATION -> CONFIDENCE
        """
        try:
            file_size = len(image_bytes)
            if file_size == 0:
                return {
                    "success": False,
                    "error": "EMPTY_FILE",
                    "message": "The uploaded image file is empty.",
                    "plant": {"name": "Unknown", "confidence": 0},
                    "health": {"status": "Unknown", "confidence": 0},
                    "diagnosis": None,
                    "severity": "Unknown",
                    "recommendation": "Please upload a clear close-up image of the leaf."
                }

            # Open image
            image = Image.open(io.BytesIO(image_bytes))
            img_format = image.format or "JPEG"
            img_width, img_height = image.size

            # 1. Quality Check
            is_valid, quality_msg = self.validate_image_quality(image)
            if not is_valid:
                return {
                    "success": False,
                    "error": "INVALID_IMAGE_QUALITY",
                    "message": quality_msg,
                    "plant": {"name": "Unknown", "confidence": 0},
                    "health": {"status": "Unknown", "confidence": 0},
                    "diagnosis": None,
                    "severity": "Unknown",
                    "recommendation": "Please upload a clear close-up photo of a plant leaf in natural daylight."
                }

            # 2. Neural Feature Extraction & Inference
            rgb_img = image.convert("RGB")
            tensor = self.transform(rgb_img).unsqueeze(0).to(self.device)

            with torch.no_grad():
                logits = self.model(tensor)
                probs = torch.softmax(logits, dim=1)[0].cpu().numpy()

            sorted_indices = probs.argsort()[::-1]
            top1_idx = int(sorted_indices[0])
            top_prob = float(probs[top1_idx])
            top_class = self.classes[top1_idx] if top1_idx < len(self.classes) else "Unknown___unsupported"

            # Build Top 5 Distribution
            top5_list = []
            for rank_idx in sorted_indices[:5]:
                c_name = self.classes[rank_idx] if rank_idx < len(self.classes) else "Unknown"
                c_info = UNIVERSAL_PATHOLOGY_DATABASE.get(c_name, {})
                prob_val = round(float(probs[rank_idx]), 4)
                plant_name = c_info.get("plant", c_name.split("___")[0])
                disease_name = c_info.get("diagnosis") or ("Healthy Crop" if c_info.get("is_healthy") else "Condition")
                top5_list.append({
                    "className": c_name,
                    "crop": c_info.get("plant_display", plant_name),
                    "plant": plant_name,
                    "disease": disease_name,
                    "health_status": c_info.get("health_status", "Healthy" if c_info.get("is_healthy") else "Diseased"),
                    "probability": prob_val
                })

            # Safe diagnostic console log
            try:
                print("=" * 70)
                print(f"[Leaf Scanner Image]: {img_width}x{img_height} | Format: {img_format} | Size: {file_size} bytes")
                print(f"[Leaf Scanner Top-1]: {top_class} | Softmax Confidence: {top_prob * 100:.2f}%")
                print("=" * 70)
            except Exception:
                pass

            # 3. Confidence & Out-of-Distribution Validation
            CONFIDENCE_THRESHOLD = 0.40
            if top_prob < CONFIDENCE_THRESHOLD or "Background" in top_class or "Unknown" in top_class:
                return {
                    "success": True,
                    "plant": {
                        "name": "Unknown",
                        "confidence": int(round(top_prob * 100)) if "Background" not in top_class else 25
                    },
                    "health": {
                        "status": "Unknown",
                        "confidence": 35
                    },
                    "diagnosis": None,
                    "severity": "Unknown",
                    "recommendation": "The image could not be reliably identified. Please upload a clear close-up image of the leaf.",
                    # Backward compatibility fields:
                    "is_confident": False,
                    "crop": "Unknown Plant",
                    "disease": "Insufficient visual evidence or unsupported plant species.",
                    "is_healthy": False,
                    "confidence": round(top_prob, 4) if "Background" not in top_class else 0.15,
                    "top5": top5_list,
                    "symptoms": ["Visual leaf morphology does not match known high-confidence plant categories in the database."],
                    "recommended_actions": ["Capture a sharp close-up photo of the leaf in natural daylight.", "Consult your local Agricultural Extension Officer (AEO) for field confirmation."],
                    "disclaimer": DEFAULT_DISCLAIMER
                }

            # 4. Resolve pathology record
            pathology = UNIVERSAL_PATHOLOGY_DATABASE.get(top_class, {
                "plant": top_class.split("___")[0],
                "plant_display": top_class.split("___")[0],
                "health_status": "Healthy" if "healthy" in top_class.lower() else "Diseased",
                "diagnosis": None if "healthy" in top_class.lower() else top_class.replace("___", " "),
                "severity": "None" if "healthy" in top_class.lower() else "Moderate",
                "is_healthy": "healthy" in top_class.lower(),
                "symptoms": ["Foliar characteristics consistent with analyzed plant specimen."],
                "recommendation": "Follow balanced crop care and regular monitoring."
            })

            plant_conf = int(round(top_prob * 100))
            health_conf = int(round(min(99, top_prob * 100 + 3)))
            disease_conf = int(round(top_prob * 100)) if pathology["health_status"] != "Healthy" else None

            diagnosis_obj = None
            if pathology["health_status"] != "Healthy" and pathology["diagnosis"]:
                diagnosis_obj = {
                    "name": pathology["diagnosis"],
                    "confidence": disease_conf
                }

            return {
                "success": True,
                "plant": {
                    "name": pathology["plant"],
                    "displayName": pathology.get("plant_display", pathology["plant"]),
                    "confidence": plant_conf
                },
                "health": {
                    "status": pathology["health_status"],
                    "confidence": health_conf
                },
                "diagnosis": diagnosis_obj,
                "severity": pathology.get("severity", "None"),
                "recommendation": pathology.get("recommendation", "Continue regular crop monitoring."),
                # Backward compatibility fields:
                "is_confident": True,
                "crop": pathology.get("plant_display", pathology["plant"]),
                "disease": pathology["diagnosis"] if pathology["diagnosis"] else "Healthy Crop (ఆరోగ్యకరమైన పంట)",
                "is_healthy": pathology.get("is_healthy", False),
                "confidence": round(top_prob, 4),
                "top5": top5_list,
                "symptoms": pathology.get("symptoms", []),
                "recommended_actions": [pathology.get("recommendation", "")],
                "disclaimer": DEFAULT_DISCLAIMER
            }

        except Exception as e:
            return {
                "success": False,
                "error": "INFERENCE_ERROR",
                "message": f"An error occurred during leaf analysis: {str(e)}",
                "plant": {"name": "Unknown", "confidence": 0},
                "health": {"status": "Unknown", "confidence": 0},
                "diagnosis": None,
                "severity": "Unknown",
                "recommendation": "Please try capturing the leaf photo again."
            }

# Global singleton instance
ai_classifier = UniversalLeafScannerEngine()
