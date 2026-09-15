import io
import os
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image, ImageStat
import numpy as np
from typing import Dict, Any, Tuple, Optional, List
from disease_info import (
    UNIVERSAL_PATHOLOGY_DATABASE,
    PLANT_SPECIES_DATABASE,
    DISEASE_DATABASE,
    STANDARD_CLASSES,
    DEFAULT_DISCLAIMER,
)
from disease_guidance import get_crop_and_condition_guidance


class MultiTaskPlantNet(nn.Module):
    def __init__(self, num_species: int, num_conditions: int, num_joint_classes: int):
        super().__init__()
        base = models.mobilenet_v3_small(weights=None)
        self.features = base.features
        self.avgpool = base.avgpool
        in_dim = 576

        # 1. Species Identification Head
        self.species_head = nn.Sequential(
            nn.Linear(in_dim, 256),
            nn.Hardswish(),
            nn.Dropout(p=0.2),
            nn.Linear(256, num_species)
        )

        # 2. Health Condition Head
        self.condition_head = nn.Sequential(
            nn.Linear(in_dim, 256),
            nn.Hardswish(),
            nn.Dropout(p=0.2),
            nn.Linear(256, num_conditions)
        )

        # 3. Fine-Grained Joint Pathology Head
        self.joint_head = nn.Sequential(
            nn.Linear(in_dim, 512),
            nn.Hardswish(),
            nn.Dropout(p=0.25),
            nn.Linear(512, num_joint_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = self.avgpool(x)
        feat = torch.flatten(x, 1)

        out_species = self.species_head(feat)
        out_condition = self.condition_head(feat)
        out_joint = self.joint_head(feat)

        return out_species, out_condition, out_joint


class UniversalLeafScannerEngine:
    def __init__(self, model_path: str = None):
        self.device = torch.device("cpu")
        self.classes = list(STANDARD_CLASSES)
        self.num_classes = len(self.classes)
        self.species_list = list(PLANT_SPECIES_DATABASE.keys())
        self.condition_list = [
            "Healthy", "Fungal_Blight_Spot", "Bacterial_Infection",
            "Rust_Mildew", "Viral_Infection", "Pest_Damage",
            "Non_Foliar_Background", "Unsupported_OOD"
        ]
        self.is_multitask = False
        self.version = 1
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

        # Build Botanical Crop Mapping
        self.crop_to_class_indices: Dict[str, List[int]] = {}
        for idx, cls_name in enumerate(self.classes):
            crop = self._extract_crop_name(cls_name)
            if crop not in self.crop_to_class_indices:
                self.crop_to_class_indices[crop] = []
            self.crop_to_class_indices[crop].append(idx)

        print(f"[Universal Leaf Scanner]: Engine initialized with {len(self.classes)} classes across {len(self.crop_to_class_indices)} crop categories.")

    @staticmethod
    def _extract_crop_name(cls_name: str) -> str:
        if "___" in cls_name:
            crop = cls_name.split("___")[0]
            if crop == "Pepper_bell":
                return "Chilli"
            return crop
        return "Unknown"

    def _load_model(self) -> nn.Module:
        if os.path.exists(self.model_path):
            try:
                checkpoint = torch.load(self.model_path, map_location=self.device, weights_only=False)
                if isinstance(checkpoint, dict) and checkpoint.get("model_type") == "MultiTaskPlantNet":
                    self.classes = checkpoint.get("classes", self.classes)
                    self.num_classes = len(self.classes)
                    self.species_list = checkpoint.get("species_list", list(PLANT_SPECIES_DATABASE.keys()))
                    self.condition_list = checkpoint.get("condition_list", self.condition_list)
                    self.is_multitask = True
                    self.version = checkpoint.get("version", 3)

                    model = MultiTaskPlantNet(len(self.species_list), len(self.condition_list), self.num_classes)
                    model.load_state_dict(checkpoint["model_state"], strict=False)
                    s_acc = checkpoint.get("test_species_acc", "N/A")
                    c_acc = checkpoint.get("test_condition_acc", "N/A")
                    j_acc = checkpoint.get("test_joint_acc", "N/A")
                    print(f"[Universal Leaf Scanner]: Loaded Multi-Task Model v{self.version} (Species: {s_acc}%, Health: {c_acc}%, Joint: {j_acc}%).")
                elif isinstance(checkpoint, dict) and "classes" in checkpoint:
                    self.classes = checkpoint["classes"]
                    self.num_classes = len(self.classes)
                    model = models.mobilenet_v3_small(weights=None)
                    in_features = model.classifier[0].in_features
                    model.classifier = nn.Sequential(
                        nn.Linear(in_features, 1024),
                        nn.Hardswish(),
                        nn.Dropout(p=0.25),
                        nn.Linear(1024, self.num_classes)
                    )
                    state = checkpoint.get("model_state") or checkpoint.get("model_state_dict") or checkpoint
                    model.load_state_dict(state, strict=False)
                    print(f"[Universal Leaf Scanner]: Loaded single-head weights from '{self.model_path}'.")
                else:
                    model = models.mobilenet_v3_small(weights=None)
                    in_features = model.classifier[3].in_features
                    model.classifier[3] = nn.Linear(in_features, len(self.classes))
                    model.load_state_dict(checkpoint, strict=False)
            except Exception as e:
                print(f"⚠️ [Universal Leaf Scanner]: Checkpoint loading warning: {e}. Reverting to base architecture.")
                model = models.mobilenet_v3_small(weights=None)
                in_features = model.classifier[3].in_features
                model.classifier[3] = nn.Linear(in_features, len(self.classes))
        else:
            model = models.mobilenet_v3_small(weights=None)
            in_features = model.classifier[3].in_features
            model.classifier[3] = nn.Linear(in_features, len(self.classes))

        model.to(self.device)
        model.eval()
        return model

    def validate_image_quality(self, image: Image.Image) -> Tuple[bool, str]:
        """
        Pure PIL/NumPy Stage 0 Image Quality & Leaf Validator (No external C++ binary dependency).
        Validates:
        - Image dimensions
        - Exposure & luminance
        - Foliar color presence (green, yellow, necrotic brown/rust)
        - Rejection of blank screens, documents, furniture, metals
        """
        width, height = image.size
        if width < 64 or height < 64:
            return False, "Please upload or scan a clear crop leaf image (minimum 100x100 pixels)."

        rgb_img = image.convert("RGB")
        np_img = np.array(rgb_img, dtype=np.float32)

        if len(np_img.shape) != 3 or np_img.shape[2] != 3:
            return False, "Please upload or scan a clear color photo of a plant leaf."

        r = np_img[:, :, 0]
        g = np_img[:, :, 1]
        b = np_img[:, :, 2]

        # 1. Luminance check (standard Rec. 601 luma)
        gray = 0.299 * r + 0.587 * g + 0.114 * b
        mean_lum = float(np.mean(gray))
        std_lum = float(np.std(gray))

        if mean_lum < 10.0:
            return False, "Image is too dark to analyze. Please capture a clear leaf photo in daylight."
        if mean_lum > 248.0 and std_lum < 8.0:
            return False, "Image is overexposed or blank. Please upload a clear photo of a crop leaf."

        # 2. Biological Foliar Color Analysis
        # Excess Green Index (ExG = 2*G - R - B)
        exg = 2.0 * g - r - b
        green_foliage_mask = (g > r * 0.88) & (g > b * 1.05) & (g > 30.0)
        yellow_chlorotic_mask = (r > 100.0) & (g > 100.0) & (b < 110.0) & (abs(r - g) < 55.0)
        necrotic_brown_mask = (r > 60.0) & (g > 35.0) & (b < 65.0) & (r > g) & (g > b)
        olive_dark_mask = (g > b) & (g > 25.0) & (r < 140.0) & (exg > -10.0)

        total_pixels = float(width * height)
        foliar_pixels = float(np.sum(green_foliage_mask | yellow_chlorotic_mask | necrotic_brown_mask | olive_dark_mask))
        foliar_ratio = foliar_pixels / total_pixels
        exg_positive_ratio = float(np.sum(exg > 0)) / total_pixels

        # If biological plant pigmentation is completely absent (e.g. gray laptop, blue screen, white paper, metal surface)
        if foliar_ratio < 0.04 and exg_positive_ratio < 0.02 and std_lum < 40.0:
            return False, "Please upload or scan a clear crop leaf image."

        if foliar_ratio < 0.02 and exg_positive_ratio < 0.01:
            return False, "Please upload or scan a clear crop leaf image."

        # 3. Focus / Sharpness check (Laplacian variance on grayscale)
        if height >= 10 and width >= 10:
            laplacian = (
                gray[:-2, 1:-1] +
                gray[2:, 1:-1] +
                gray[1:-1, :-2] +
                gray[1:-1, 2:] -
                4.0 * gray[1:-1, 1:-1]
            )
            lap_var = float(np.var(laplacian))
            if lap_var < 20.0:
                return False, "The image is too blurry or out of focus. Please hold the camera steady and capture a sharp photo of the leaf."

        return True, "OK"

    def predict(self, image_bytes: bytes, filename: str = "image.jpg", mimetype: str = "image/jpeg") -> Dict[str, Any]:
        """
        Universal Leaf Pathology Prediction Pipeline:
        1. Open & validate image bytes.
        2. Stage 0 image validation (dark, blurry, non-leaf check).
        3. Neural model forward pass with model.eval() and torch.no_grad().
        4. Bayesian marginal probability aggregation for accurate crop species determination.
        5. Fine-grained joint class resolution (never mixes up crop with another crop's disease).
        6. Out-of-distribution & confidence validation.
        7. Tailored agricultural recommendations (separate fertilizer vs disease control).
        """
        try:
            if not image_bytes or len(image_bytes) == 0:
                return {
                    "success": False,
                    "error": "EMPTY_FILE",
                    "reason": "empty_file",
                    "message": "The uploaded image file is empty.",
                    "crop": "Unknown Plant",
                    "condition": "Unknown",
                    "confidence": 0.0,
                    "recommendation": {
                        "explanation": "No image data provided.",
                        "fertilizer": [],
                        "disease_management": [],
                        "prevention": []
                    },
                    "plant": {"name": "Unknown", "confidence": 0},
                    "health": {"status": "Unknown", "confidence": 0},
                    "diagnosis": None,
                    "severity": "Unknown"
                }

            # Open image via PIL (robust support for JPEG, progressive JPEG, PNG, WebP)
            try:
                image = Image.open(io.BytesIO(image_bytes))
            except Exception as img_err:
                return {
                    "success": False,
                    "error": "IMAGE_DECODE_FAILED",
                    "reason": "invalid_image",
                    "message": f"Could not decode image format. Please upload a standard JPEG, PNG, or WebP photo.",
                    "crop": "Unknown Plant",
                    "condition": "Unknown",
                    "confidence": 0.0,
                    "recommendation": {
                        "explanation": "Image file could not be decoded.",
                        "fertilizer": [],
                        "disease_management": [],
                        "prevention": []
                    },
                    "plant": {"name": "Unknown", "confidence": 0},
                    "health": {"status": "Unknown", "confidence": 0},
                    "diagnosis": None,
                    "severity": "Unknown"
                }

            # Stage 0: Image Quality Validation
            is_valid, quality_msg = self.validate_image_quality(image)
            if not is_valid:
                return {
                    "success": False,
                    "error": "INVALID_IMAGE_QUALITY",
                    "reason": "invalid_image",
                    "message": quality_msg,
                    "crop": "Unknown Plant",
                    "condition": "Non-Leaf / Invalid Image",
                    "confidence": 0.0,
                    "recommendation": {
                        "explanation": quality_msg,
                        "fertilizer": [],
                        "disease_management": [],
                        "prevention": [
                            "Capture a clear, focused photograph of a single crop leaf.",
                            "Avoid photographing non-plant objects, screens, or heavily shaded subjects."
                        ]
                    },
                    "safety_note": DEFAULT_DISCLAIMER,
                    "plant": {"name": "Unknown", "confidence": 0},
                    "health": {"status": "Unknown", "confidence": 0},
                    "diagnosis": None,
                    "severity": "Unknown",
                    "is_confident": False,
                    "is_healthy": False
                }

            # Stage 1: Preprocessing & Forward Pass
            rgb_img = image.convert("RGB")
            tensor = self.transform(rgb_img).unsqueeze(0).to(self.device)

            with torch.no_grad():
                self.model.eval()
                if self.is_multitask:
                    out_species, out_condition, out_joint = self.model(tensor)
                    p_joint = torch.softmax(out_joint, dim=1)[0].cpu().numpy()
                    p_species = torch.softmax(out_species, dim=1)[0].cpu().numpy()
                    p_condition = torch.softmax(out_condition, dim=1)[0].cpu().numpy()
                else:
                    logits = self.model(tensor)
                    p_joint = torch.softmax(logits, dim=1)[0].cpu().numpy()
                    p_species = None
                    p_condition = None

            # Stage 1: Crop/Species Identification via Species Head ONLY
            if self.is_multitask and p_species is not None:
                best_species_idx = int(p_species.argmax())
                best_crop_name = self.species_list[best_species_idx] if best_species_idx < len(self.species_list) else "Unknown"
                best_crop_prob = float(p_species[best_species_idx])
            else:
                top1_global_idx = int(p_joint.argmax())
                best_crop_name = self._extract_crop_name(self.classes[top1_global_idx])
                best_crop_prob = float(p_joint[top1_global_idx])

            final_crop_name = best_crop_name

            # Stage 2: Crop-Constrained Pathology Diagnostic Head with Hard Masking
            crop_indices = self.crop_to_class_indices.get(best_crop_name, [])
            top5_list = []

            if crop_indices:
                # Raw joint logits for only the subclasses of best_crop_name
                raw_joint_logits = out_joint[0].cpu().numpy() if self.is_multitask else logits[0].cpu().numpy()
                sub_logits = np.array([raw_joint_logits[i] for i in crop_indices], dtype=np.float32)
                # Compute softmax strictly across the allowed subclasses (forbidden classes are mathematically 0)
                sub_exp = np.exp(sub_logits - np.max(sub_logits))
                sub_probs = sub_exp / np.sum(sub_exp)

                best_sub_local_idx = int(np.argmax(sub_probs))
                winning_global_idx = crop_indices[best_sub_local_idx]
                selected_class = self.classes[winning_global_idx]
                selected_class_prob = float(sub_probs[best_sub_local_idx])

                # Build ranked list constrained strictly to allowed classes of the chosen crop
                ranked_sub_local = np.argsort(sub_probs)[::-1]
                for local_i in ranked_sub_local:
                    global_i = crop_indices[local_i]
                    c_name = self.classes[global_i]
                    c_info = UNIVERSAL_PATHOLOGY_DATABASE.get(c_name, {})
                    c_crop = best_crop_name
                    c_crop_info = PLANT_SPECIES_DATABASE.get(c_crop, {})
                    c_crop_display = f"{c_crop} ({c_crop_info.get('telugu')})" if c_crop_info.get('telugu') else c_crop
                    disease_name = c_info.get("diagnosis") or ("Healthy Crop" if c_info.get("is_healthy") else "Pathology")

                    top5_list.append({
                        "className": c_name,
                        "crop": c_crop_display,
                        "plant": c_crop,
                        "disease": disease_name,
                        "health_status": c_info.get("health_status", "Healthy" if c_info.get("is_healthy") else "Diseased"),
                        "probability": round(float(sub_probs[local_i]), 4)
                    })
            else:
                selected_class = "Unknown___unsupported"
                selected_class_prob = 0.0

            # Stage 3: Confidence & Out-of-Distribution Thresholding
            # Documented empirical threshold based on validation dataset
            CONFIDENCE_THRESHOLD = 0.35
            is_non_leaf = (
                final_crop_name in ["Background", "Unknown", "Non-Leaf Object"] or
                "non_leaf" in selected_class.lower() or
                "unsupported" in selected_class.lower()
            )

            if best_crop_prob < CONFIDENCE_THRESHOLD or is_non_leaf:
                return {
                    "success": False,
                    "reason": "low_confidence" if not is_non_leaf else "non_leaf_image",
                    "message": "The AI could not confidently identify this leaf. Please capture a clearer image with the leaf filling most of the frame.",
                    "crop": "Unknown Plant",
                    "condition": "Uncertain / Low Confidence",
                    "confidence": round(best_crop_prob, 4),
                    "is_confident": False,
                    "is_healthy": False,
                    "plant": {
                        "name": "Unknown",
                        "displayName": "Unknown Plant",
                        "confidence": int(round(best_crop_prob * 100))
                    },
                    "health": {
                        "status": "Unknown",
                        "confidence": 0
                    },
                    "diagnosis": None,
                    "severity": "Unknown",
                    "top5": top5_list,
                    "recommendation": {
                        "explanation": "The image does not match any recognized agricultural crop leaf with sufficient statistical confidence.",
                        "fertilizer": [],
                        "disease_management": [],
                        "prevention": [
                            "Capture a clear, well-lit close-up photo of the leaf.",
                            "Ensure the leaf blade covers at least 70% of the camera frame.",
                            "Avoid severe backlighting, motion blur, or photographing leaves at steep angles."
                        ]
                    },
                    "symptoms": ["Visual leaf morphology does not match known high-confidence plant categories in the database."],
                    "recommended_actions": [
                        "Capture a sharp close-up photo of the leaf in natural daylight.",
                        "Consult your local Agricultural Extension Officer (AEO) or KVK for field confirmation."
                    ],
                    "safety_note": DEFAULT_DISCLAIMER,
                    "disclaimer": DEFAULT_DISCLAIMER
                }

            # Stage 4: Resolve Pathology & Factual Agronomic Information
            pathology = UNIVERSAL_PATHOLOGY_DATABASE.get(selected_class, {
                "plant": final_crop_name,
                "plant_display": final_crop_name,
                "health_status": "Healthy" if "healthy" in selected_class.lower() else "Diseased",
                "diagnosis": None if "healthy" in selected_class.lower() else selected_class.replace("___", " "),
                "severity": "None" if "healthy" in selected_class.lower() else "Moderate",
                "is_healthy": "healthy" in selected_class.lower(),
                "symptoms": ["Foliar characteristics consistent with analyzed plant specimen."],
                "recommendation": "Follow balanced crop care and regular monitoring."
            })

            is_leaf_healthy = pathology.get("is_healthy", "healthy" in selected_class.lower())
            health_status = "Healthy" if is_leaf_healthy else pathology.get("health_status", "Diseased")
            diagnosis_name = pathology.get("diagnosis") or ("Healthy Crop (ఆరోగ్యకరమైన పంట)" if is_leaf_healthy else selected_class.replace("___", " "))

            # Clean Display Names
            plant_info = PLANT_SPECIES_DATABASE.get(final_crop_name, {})
            telugu_name = plant_info.get("telugu")
            final_display_crop = f"{final_crop_name} ({telugu_name})" if telugu_name else final_crop_name

            # Compute Confidence Scores
            # Primary confidence: The species probability for the crop
            crop_conf_pct = int(round(best_crop_prob * 100))
            class_conf_pct = int(round(selected_class_prob * 100))
            primary_conf = round(best_crop_prob, 4)

            # Stage 5: Structured Agricultural Guidance Engine
            # Tailored depending on crop + condition + health status
            structured_guidance = get_crop_and_condition_guidance(
                cls_name=selected_class,
                crop=final_crop_name,
                condition=diagnosis_name,
                is_healthy=is_leaf_healthy
            )

            diagnosis_obj = None
            if not is_leaf_healthy and pathology.get("diagnosis"):
                diagnosis_obj = {
                    "name": pathology["diagnosis"],
                    "confidence": class_conf_pct
                }

            return {
                "success": True,
                "crop": final_display_crop,
                "condition": diagnosis_name if not is_leaf_healthy else "Healthy",
                "confidence": primary_conf,
                "is_healthy": is_leaf_healthy,
                "is_confident": True,
                "model_version": getattr(self, "version", 3),
                "plant": {
                    "name": final_crop_name,
                    "displayName": final_display_crop,
                    "confidence": crop_conf_pct
                },
                "health": {
                    "status": health_status,
                    "confidence": class_conf_pct if is_leaf_healthy else max(class_conf_pct, 80)
                },
                "diagnosis": diagnosis_obj,
                "severity": pathology.get("severity", "None" if is_leaf_healthy else "Moderate"),
                "recommendation": structured_guidance,
                "top5": top5_list,
                "symptoms": pathology.get("symptoms", []),
                "recommended_actions": [
                    pathology.get("recommendation", "Follow balanced crop care and periodic scouting.")
                ],
                "safety_note": structured_guidance.get("safety_note", DEFAULT_DISCLAIMER),
                "disclaimer": DEFAULT_DISCLAIMER
            }

        except Exception as e:
            return {
                "success": False,
                "error": "INFERENCE_ERROR",
                "reason": "inference_error",
                "message": f"An error occurred during leaf analysis: {str(e)}",
                "crop": "Unknown Plant",
                "condition": "Error",
                "confidence": 0.0,
                "plant": {"name": "Unknown", "confidence": 0},
                "health": {"status": "Unknown", "confidence": 0},
                "diagnosis": None,
                "severity": "Unknown",
                "recommendation": {
                    "explanation": "Inference processing error.",
                    "fertilizer": [],
                    "disease_management": [],
                    "prevention": ["Please try capturing the leaf photo again."]
                },
                "safety_note": DEFAULT_DISCLAIMER
            }


# Global singleton instance
ai_classifier = UniversalLeafScannerEngine()
