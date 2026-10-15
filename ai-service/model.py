import io
import os
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
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
from plant_id_provider import (
    broad_plant_identifier,
    OPEN_WORLD_BOTANICAL_TAXONOMY,
    OrganDetector,
)

# Core Specialist Model Scope (18 agricultural crops genuinely supported for disease pathology)
SPECIALIST_SUPPORTED_CROPS = {
    "Apple",
    "Banana",
    "Blueberry",
    "Cherry",
    "Chilli",
    "Citrus",
    "Corn",
    "Cotton",
    "Grape",
    "Mango",
    "Neem",
    "Peach",
    "Potato",
    "Raspberry",
    "Rice",
    "Soybean",
    "Strawberry",
    "Tomato",
}


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
        self.version = 3

        # Resolve candidate model paths
        candidate_paths = [
            model_path,
            os.path.join(os.path.dirname(__file__), "crop_disease_model_v3.pth"),
            os.path.join(os.path.dirname(__file__), "crop_disease_model.pth"),
            os.path.join(os.path.dirname(__file__), "crop_disease_model_v2.pth"),
        ]
        self.model_path = next((p for p in candidate_paths if p and os.path.exists(p)), candidate_paths[1])
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

        print(f"[Universal Leaf Scanner]: Initialized with {len(self.classes)} classes across {len(self.crop_to_class_indices)} crop categories.")

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
        Pure PIL/NumPy Stage 0 Image Quality Validator.
        Validates:
        - Image dimensions
        - Exposure & luminance (too dark / overexposed blank)
        - Focus & sharpness (Laplacian variance on grayscale)
        - Presence of biological pigments (foliage, fruit rind, flower petals, bark)
        - Rejection of blank screens, documents, furniture, monochrome background
        """
        width, height = image.size
        if width < 64 or height < 64:
            return False, "Please upload or scan a clear plant image (minimum 100x100 pixels)."

        rgb_img = image.convert("RGB")
        np_img = np.array(rgb_img, dtype=np.float32)

        if len(np_img.shape) != 3 or np_img.shape[2] != 3:
            return False, "Please upload or scan a clear color photo of a plant specimen."

        r = np_img[:, :, 0]
        g = np_img[:, :, 1]
        b = np_img[:, :, 2]

        # 1. Luminance check (Rec. 601 luma)
        gray = 0.299 * r + 0.587 * g + 0.114 * b
        mean_lum = float(np.mean(gray))
        std_lum = float(np.std(gray))

        if mean_lum < 10.0:
            return False, "Image is too dark to analyze. Please capture a clear photo in daylight."
        if mean_lum > 248.0 and std_lum < 8.0:
            return False, "Image is overexposed or blank. Please upload a clear photo of a plant specimen."

        # 2. Biological Foliar / Fruit / Flower / Bark Pigmentation Analysis
        exg = 2.0 * g - r - b
        green_foliage_mask = (g > r * 0.88) & (g > b * 1.05) & (g > 30.0)
        yellow_chlorotic_mask = (r > 100.0) & (g > 100.0) & (b < 110.0) & (abs(r - g) < 55.0)
        necrotic_brown_mask = (r > 60.0) & (g > 35.0) & (b < 65.0) & (r > g) & (g > b)
        olive_dark_mask = (g > b) & (g > 25.0) & (r < 140.0) & (exg > -10.0)

        # Fruit & flower masks
        orange_red_fruit = ((r > 130.0) & (g > 50.0) & (b < 70.0) & (r > g * 1.25)) | ((r > 160.0) & (g < 60.0) & (b < 60.0))
        yellow_fruit = (r > 165.0) & (g > 150.0) & (b < 95.0)
        flower_petals = ((r > 155.0) & (b > 110.0) & (g < 120.0)) | ((r > 165.0) & (g < 80.0) & (b > 90.0))

        # Bark mask
        diff_rg = np.abs(r - g)
        diff_gb = np.abs(g - b)
        bark_mask = (r > 40.0) & (r < 170.0) & (g > 35.0) & (g < 155.0) & (b > 25.0) & (b < 140.0) & (diff_rg < 22.0) & (diff_gb < 22.0)

        total_pixels = float(width * height)
        bio_pixels = float(np.sum(
            green_foliage_mask | yellow_chlorotic_mask | necrotic_brown_mask | olive_dark_mask |
            orange_red_fruit | yellow_fruit | flower_petals | bark_mask
        ))
        bio_ratio = bio_pixels / total_pixels
        exg_positive_ratio = float(np.sum(exg > 0)) / total_pixels

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
                return False, "The image is too blurry or out of focus. Please hold the camera steady and capture a sharp photo."

        return True, "OK"

    def predict(
        self,
        image_bytes: bytes,
        filename: str = "image.jpg",
        mimetype: str = "image/jpeg",
        organ: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Universal Plant & Fruit Identification + Certified Disease Pathology Pipeline:
        1. Validates image bytes, dimensions, exposure, blur, and decodes image.
        2. Broad plant and fruit identification via Pl@ntNet API or Local Botanical Vision.
        3. Identifies organ (leaf, fruit, flower, bark).
        4. Distinguishes plant species identification from disease pathology diagnosis.
        5. Disease Diagnosis Safety Gating:
           - Organ Gating: Fruit/Flower/Bark photos do NOT run the leaf disease model.
           - Species Compatibility Gating: Unsupported species return DISEASE_UNCERTAIN with disease=null.
           - Never defaults unsupported species to Tomato.
           - Never converts uncertain predictions into healthy results.
           - Reports true species confidence and disease confidence separately.
        """
        try:
            if not image_bytes or len(image_bytes) == 0:
                return {
                    "success": False,
                    "isValid": False,
                    "is_valid": False,
                    "isPlant": False,
                    "is_plant": False,
                    "error": "EMPTY_FILE",
                    "reason": "empty_file",
                    "message": "The uploaded image file is empty.",
                    "crop": "Unknown Plant",
                    "species": None,
                    "organ": "unknown",
                    "condition": "Unknown",
                    "confidence": 0.0,
                    "species_confidence": 0.0,
                    "disease": None,
                    "disease_confidence": None,
                    "healthStatus": None,
                    "diagnosisStatus": "INVALID_IMAGE",
                    "diagnosis_status": "INVALID_IMAGE",
                    "isSupportedSpecies": False,
                    "is_supported_species": False,
                    "candidates": [],
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

            # Decode image
            try:
                image = Image.open(io.BytesIO(image_bytes))
            except Exception as img_err:
                return {
                    "success": False,
                    "isValid": False,
                    "is_valid": False,
                    "isPlant": False,
                    "is_plant": False,
                    "error": "IMAGE_DECODE_FAILED",
                    "reason": "invalid_image",
                    "message": "Could not decode image format. Please upload a standard JPEG, PNG, or WebP photo.",
                    "crop": "Unknown Plant",
                    "species": None,
                    "organ": "unknown",
                    "condition": "Unknown",
                    "confidence": 0.0,
                    "species_confidence": 0.0,
                    "disease": None,
                    "disease_confidence": None,
                    "healthStatus": None,
                    "diagnosisStatus": "INVALID_IMAGE",
                    "diagnosis_status": "INVALID_IMAGE",
                    "isSupportedSpecies": False,
                    "is_supported_species": False,
                    "candidates": [],
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
                    "isValid": False,
                    "is_valid": False,
                    "isPlant": False,
                    "is_plant": False,
                    "error": "INVALID_IMAGE_QUALITY",
                    "reason": "invalid_image",
                    "message": quality_msg,
                    "crop": "Unknown Plant",
                    "species": None,
                    "organ": "unknown",
                    "condition": "Invalid Image",
                    "confidence": 0.0,
                    "species_confidence": 0.0,
                    "disease": None,
                    "disease_confidence": None,
                    "healthStatus": None,
                    "diagnosisStatus": "INVALID_IMAGE",
                    "diagnosis_status": "INVALID_IMAGE",
                    "isSupportedSpecies": False,
                    "is_supported_species": False,
                    "candidates": [],
                    "recommendation": {
                        "explanation": quality_msg,
                        "fertilizer": [],
                        "disease_management": [],
                        "prevention": [
                            "Capture a clear, focused photograph in natural daylight.",
                            "Avoid photographing non-plant objects, screens, or heavily shaded subjects."
                        ]
                    },
                    "safety_note": DEFAULT_DISCLAIMER,
                    "disclaimer": DEFAULT_DISCLAIMER,
                    "plant": {"name": "Unknown", "confidence": 0},
                    "health": {"status": "Unknown", "confidence": 0},
                    "diagnosis": None,
                    "severity": "Unknown",
                    "is_confident": False,
                    "is_healthy": False
                }

            # Stage 1: Broad Plant & Organ Identification
            broad_res = broad_plant_identifier.identify_plant_or_fruit(
                image_bytes,
                filename=filename,
                organ_hint=organ
            )

            # Check if specimen is non-plant
            if not broad_res.get("is_plant", True) or broad_res.get("error") == "NON_PLANT_IMAGE":
                return {
                    "success": False,
                    "isValid": False,
                    "is_valid": False,
                    "isPlant": False,
                    "is_plant": False,
                    "error": "NON_PLANT",
                    "reason": "non_plant_rejection",
                    "message": "Non-plant image detected. Disease inference was not run.",
                    "crop": "Non-Plant Object",
                    "species": None,
                    "organ": "unknown",
                    "condition": "Non-Plant",
                    "confidence": 0.0,
                    "species_confidence": 0.0,
                    "disease": None,
                    "disease_confidence": None,
                    "healthStatus": None,
                    "diagnosisStatus": "NON_PLANT",
                    "diagnosis_status": "NON_PLANT",
                    "isSupportedSpecies": False,
                    "is_supported_species": False,
                    "candidates": [],
                    "recommendation": {
                        "explanation": "Image does not depict agricultural foliage or plant tissue.",
                        "fertilizer": [],
                        "disease_management": [],
                        "prevention": ["Please photograph a real plant leaf, fruit, flower, or crop specimen."]
                    },
                    "safety_note": DEFAULT_DISCLAIMER,
                    "disclaimer": DEFAULT_DISCLAIMER,
                    "plant": {"name": "Non-Plant Object", "confidence": 0},
                    "health": {"status": "Unknown", "confidence": 0},
                    "diagnosis": None,
                    "severity": "Unknown",
                    "is_confident": False,
                    "is_healthy": False
                }

            detected_organ = broad_res.get("detected_organ") or broad_res.get("organ") or "leaf"
            broad_species = broad_res.get("species")
            broad_conf = broad_res.get("confidence", 0.0)
            candidates = broad_res.get("candidates", [])
            scientific_name = broad_res.get("scientific_name")
            common_name = broad_res.get("common_name")
            provider_name = broad_res.get("provider", "LocalBotanicalVision")

            # Stage 2: Specialist Neural Model Forward Pass
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

            # Determine specialist neural model's candidate
            if self.is_multitask and p_species is not None:
                neural_species_idx = int(p_species.argmax())
                neural_species = self.species_list[neural_species_idx] if neural_species_idx < len(self.species_list) else "Unknown"
                neural_conf = float(p_species[neural_species_idx])
            else:
                top1_idx = int(p_joint.argmax())
                neural_species = self._extract_crop_name(self.classes[top1_idx])
                neural_conf = float(p_joint[top1_idx])

            # Non-plant background check from neural head
            if neural_species in ["Background", "Non-Leaf Object"] and detected_organ == "leaf" and not broad_species:
                return {
                    "success": False,
                    "isValid": False,
                    "is_valid": False,
                    "isPlant": False,
                    "is_plant": False,
                    "error": "NON_PLANT",
                    "reason": "non_plant_rejection",
                    "message": "Non-plant image detected. Disease inference was not run.",
                    "crop": "Non-Plant Object",
                    "species": None,
                    "organ": "unknown",
                    "condition": "Non-Plant",
                    "confidence": 0.0,
                    "species_confidence": 0.0,
                    "disease": None,
                    "disease_confidence": None,
                    "healthStatus": None,
                    "diagnosisStatus": "NON_PLANT",
                    "diagnosis_status": "NON_PLANT",
                    "isSupportedSpecies": False,
                    "is_supported_species": False,
                    "candidates": [],
                    "recommendation": {
                        "explanation": "Image does not depict agricultural foliage or plant tissue.",
                        "fertilizer": [],
                        "disease_management": [],
                        "prevention": ["Please photograph a real plant leaf, fruit, or crop specimen."]
                    },
                    "safety_note": DEFAULT_DISCLAIMER,
                    "disclaimer": DEFAULT_DISCLAIMER,
                    "plant": {"name": "Non-Plant Object", "confidence": 0},
                    "health": {"status": "Unknown", "confidence": 0},
                    "diagnosis": None,
                    "severity": "Unknown",
                    "is_confident": False,
                    "is_healthy": False
                }

            # Species Resolution & Arbitration
            if provider_name == "Pl@ntNet" and broad_species:
                final_species = broad_species
                species_conf = broad_conf
                species_source = "PLANTNET"
            elif neural_species in SPECIALIST_SUPPORTED_CROPS and neural_conf >= 0.85:
                # Highly confident specialist neural prediction on supported crop specimen
                final_species = neural_species
                species_conf = neural_conf
                species_source = "SPECIALIST_PYTORCH"
                tax_info = OPEN_WORLD_BOTANICAL_TAXONOMY.get(final_species, {})
                scientific_name = scientific_name or tax_info.get("scientific_name")
                common_name = common_name or tax_info.get("common_name", final_species)
            elif broad_species:
                # Open-world plant verified by botanical vision (Guava, Okra, Tulsi, Coconut, Wheat, etc.)
                final_species = broad_species
                species_conf = broad_conf
                species_source = "PLANTNET" if provider_name == "Pl@ntNet" else "LOCAL_BOTANICAL"
                tax_info = OPEN_WORLD_BOTANICAL_TAXONOMY.get(final_species, {})
                scientific_name = scientific_name or tax_info.get("scientific_name")
                common_name = common_name or tax_info.get("common_name", final_species)
            elif neural_species in SPECIALIST_SUPPORTED_CROPS and neural_conf >= 0.50:
                final_species = neural_species
                species_conf = neural_conf
                species_source = "SPECIALIST_PYTORCH"
                tax_info = OPEN_WORLD_BOTANICAL_TAXONOMY.get(final_species, {})
                scientific_name = scientific_name or tax_info.get("scientific_name")
                common_name = common_name or tax_info.get("common_name", final_species)
            else:
                # Uncertain plant species
                return {
                    "success": False,
                    "isValid": False,
                    "is_valid": False,
                    "isPlant": True,
                    "is_plant": True,
                    "error": "SPECIES_UNCERTAIN",
                    "reason": "low_confidence",
                    "message": "Unable to identify a recognized plant species with high confidence. Please upload a clear photo in good lighting.",
                    "crop": "Unknown Plant",
                    "species": None,
                    "scientific_name": None,
                    "common_name": None,
                    "organ": detected_organ,
                    "condition": "Uncertain / Low Confidence",
                    "confidence": round(float(neural_conf), 4),
                    "species_confidence": round(float(neural_conf), 4),
                    "species_source": "SPECIALIST_PYTORCH",
                    "disease": None,
                    "disease_confidence": None,
                    "healthStatus": "Uncertain",
                    "diagnosisStatus": "SPECIES_UNCERTAIN",
                    "diagnosis_status": "SPECIES_UNCERTAIN",
                    "isSupportedSpecies": False,
                    "is_supported_species": False,
                    "candidates": candidates,
                    "is_confident": False,
                    "is_healthy": False,
                    "plant": {"name": "Unknown", "displayName": "Unknown Plant", "confidence": int(round(neural_conf * 100))},
                    "health": {"status": "Unknown", "confidence": 0},
                    "diagnosis": None,
                    "severity": "Unknown",
                    "top5": [],
                    "recommendation": {
                        "explanation": "Visual morphology does not match known high-confidence plant categories in the database.",
                        "fertilizer": [],
                        "disease_management": [],
                        "prevention": [
                            "Capture a clear, well-lit close-up photo of the specimen.",
                            "Ensure the leaf or fruit covers at least 70% of the camera frame."
                        ]
                    },
                    "symptoms": ["Visual characteristics do not match known high-confidence plant categories in the database."],
                    "recommended_actions": [
                        "Capture a sharp close-up photo in natural daylight.",
                        "Consult your local Agricultural Extension Officer (AEO) or KVK for field confirmation."
                    ],
                    "safety_note": DEFAULT_DISCLAIMER,
                    "disclaimer": DEFAULT_DISCLAIMER
                }

            is_supported_specialist_crop = final_species in SPECIALIST_SUPPORTED_CROPS

            # Build Display Name
            tax_info = OPEN_WORLD_BOTANICAL_TAXONOMY.get(final_species) or PLANT_SPECIES_DATABASE.get(final_species, {})
            telugu_name = tax_info.get("telugu")
            final_display_crop = f"{final_species} ({telugu_name})" if telugu_name else final_species

            # Stage 3: DISEASE DIAGNOSIS SAFETY GATING (PART 3)
            # ---------------------------------------------------------
            # Rule A: Organ Gating — Fruit, Flower, Bark must NEVER run the leaf disease model
            # Rule B: Species Gating — Unsupported species must NEVER run specialist disease model or default to Tomato
            # Rule C: Genuine Confidence — Never fabricate 80% confidence or convert uncertain results to healthy
            # ---------------------------------------------------------

            top5_list = []
            crop_indices = self.crop_to_class_indices.get(final_species, [])

            if detected_organ != "leaf":
                # ORGAN MISMATCH: Specimen is a fruit, flower, or bark.
                disease_name = None
                disease_conf = None
                health_status = "Uncertain"
                diagnosis_status = "ORGAN_MISMATCH"
                is_leaf_healthy = False
                user_message = (
                    f"{final_species} ({detected_organ}) identified successfully. "
                    f"Certified disease pathology requires a foliar leaf image; leaf disease diagnosis was not performed on this {detected_organ} image."
                )
                structured_guidance = {
                    "explanation": f"{final_species} plant identified from {detected_organ} morphology. Certified disease pathology requires a crop leaf blade.",
                    "fertilizer": ["Maintain balanced potassium and phosphorus for optimal fruit quality and plant vigor."],
                    "disease_management": [],
                    "prevention": [
                        "To diagnose foliar diseases (blights, rusts, leaf spots), capture a close-up photo of an active crop leaf blade."
                    ],
                    "safety_note": DEFAULT_DISCLAIMER
                }
                symptoms = [f"{final_species} {detected_organ} specimen analyzed. Foliar pathology model not run on non-leaf organ."]
                recommended_actions = [
                    f"To test for foliar diseases affecting {final_species}, please capture a photo of a crop leaf."
                ]
                severity = "None"

            elif not is_supported_specialist_crop:
                # UNSUPPORTED SPECIES: Specimen is an open-world crop (Guava, Okra, Papaya, Coconut, Brinjal, Wheat, etc.)
                disease_name = None
                disease_conf = None
                health_status = "Uncertain"
                diagnosis_status = "DISEASE_UNCERTAIN"
                is_leaf_healthy = False
                user_message = (
                    f"{final_species} leaf identified successfully. "
                    f"AgroMitra specialist disease model supports foliar pathology for 18 core crops; "
                    f"{final_species} disease diagnosis is currently unverified. Consult local KVK / AEO for field pathology confirmation."
                )
                structured_guidance = {
                    "explanation": f"{final_species} leaf identified. Specialist deep pathology model currently covers 18 core agricultural crops.",
                    "fertilizer": [f"Apply standard recommended N-P-K dosage for {final_species} according to your State Agricultural University (SAU) package of practices."],
                    "disease_management": [],
                    "prevention": [
                        f"Scout {final_species} plants weekly for pest incidence or foliar symptoms.",
                        "Consult your local Krishi Vigyan Kendra (KVK) or Agriculture Extension Officer (AEO) for field confirmation."
                    ],
                    "safety_note": DEFAULT_DISCLAIMER
                }
                symptoms = [f"Foliar characteristics consistent with {final_species}."]
                recommended_actions = [
                    "Follow standard crop management and scout plants regularly.",
                    "Consult your local Agriculture Extension Officer (AEO) or KVK for expert field diagnosis."
                ]
                severity = "Unknown"

            else:
                # SUPPORTED SPECIALIST CROP LEAF: Run crop-constrained pathology head
                raw_joint_logits = out_joint[0].cpu().numpy() if self.is_multitask else logits[0].cpu().numpy()
                sub_logits = np.array([raw_joint_logits[i] for i in crop_indices], dtype=np.float32)
                sub_exp = np.exp(sub_logits - np.max(sub_logits))
                sub_probs = sub_exp / np.sum(sub_exp)

                best_sub_local_idx = int(np.argmax(sub_probs))
                winning_global_idx = crop_indices[best_sub_local_idx]
                selected_class = self.classes[winning_global_idx]
                selected_class_prob = float(sub_probs[best_sub_local_idx])

                # Build ranked top-5 constrained strictly to allowed classes of this crop
                ranked_sub_local = np.argsort(sub_probs)[::-1]
                for local_i in ranked_sub_local[:5]:
                    global_i = crop_indices[local_i]
                    c_name = self.classes[global_i]
                    c_info = UNIVERSAL_PATHOLOGY_DATABASE.get(c_name, {})
                    d_name = c_info.get("diagnosis") or ("Healthy Crop" if c_info.get("is_healthy") else "Pathology")

                    top5_list.append({
                        "className": c_name,
                        "crop": final_display_crop,
                        "plant": final_species,
                        "disease": d_name,
                        "health_status": c_info.get("health_status", "Healthy" if c_info.get("is_healthy") else "Diseased"),
                        "probability": round(float(sub_probs[local_i]), 4)
                    })

                # Check if winning probability is low (< 0.30)
                if selected_class_prob < 0.30:
                    disease_name = None
                    disease_conf = None
                    health_status = "Uncertain"
                    diagnosis_status = "DISEASE_UNCERTAIN"
                    is_leaf_healthy = False
                    user_message = f"{final_species} leaf detected, but foliar disease symptoms are ambiguous or uncertain."
                    structured_guidance = {
                        "explanation": f"Visual symptoms on {final_species} leaf are inconclusive.",
                        "fertilizer": ["Ensure balanced micronutrient and macronutrient application."],
                        "disease_management": [],
                        "prevention": ["Monitor leaves over the next 48 hours for progression of spots or yellowing."],
                        "safety_note": DEFAULT_DISCLAIMER
                    }
                    symptoms = ["Visual leaf symptoms do not match specific disease profiles with high statistical certainty."]
                    recommended_actions = [
                        "Capture another sharp photo in brighter lighting if symptoms worsen.",
                        "Consult your local KVK or Agriculture Officer."
                    ]
                    severity = "Unknown"
                else:
                    pathology = UNIVERSAL_PATHOLOGY_DATABASE.get(selected_class, {
                        "plant": final_species,
                        "plant_display": final_display_crop,
                        "health_status": "Healthy" if "healthy" in selected_class.lower() else "Diseased",
                        "diagnosis": None if "healthy" in selected_class.lower() else selected_class.replace("___", " "),
                        "severity": "None" if "healthy" in selected_class.lower() else "Moderate",
                        "is_healthy": "healthy" in selected_class.lower(),
                        "symptoms": ["Foliar characteristics consistent with analyzed specimen."],
                        "recommendation": "Follow balanced crop care and regular scouting."
                    })

                    is_leaf_healthy = pathology.get("is_healthy", "healthy" in selected_class.lower())
                    health_status = "Healthy" if is_leaf_healthy else "Disease Detected"
                    diagnosis_status = "HEALTHY" if is_leaf_healthy else "DIAGNOSED"
                    disease_name = None if is_leaf_healthy else (pathology.get("diagnosis") or selected_class.replace("___", " "))
                    disease_conf = round(selected_class_prob, 4)
                    user_message = f"{final_species} leaf analysis completed successfully."
                    severity = pathology.get("severity", "None" if is_leaf_healthy else "Moderate")
                    symptoms = pathology.get("symptoms", [])
                    recommended_actions = [pathology.get("recommendation", "Follow balanced crop care.")]

                    structured_guidance = get_crop_and_condition_guidance(
                        cls_name=selected_class,
                        crop=final_species,
                        condition=disease_name or "Healthy",
                        is_healthy=is_leaf_healthy
                    )

            # Build Standard Unified Response Payload
            crop_conf_pct = int(round(species_conf * 100))
            disease_conf_pct = int(round(disease_conf * 100)) if disease_conf is not None else None

            diagnosis_obj = None
            if disease_name and not is_leaf_healthy:
                diagnosis_obj = {
                    "name": disease_name,
                    "confidence": disease_conf_pct
                }

            return {
                "success": True,
                "isValid": True,
                "is_valid": True,
                "isPlant": True,
                "is_plant": True,
                "species": final_species,
                "scientific_name": scientific_name,
                "common_name": common_name or final_species,
                "speciesConfidence": round(float(species_conf), 4),
                "species_confidence": round(float(species_conf), 4),
                "speciesSource": species_source,
                "species_source": species_source,
                "organ": detected_organ,
                "isSupportedSpecies": is_supported_specialist_crop,
                "is_supported_species": is_supported_specialist_crop,
                "candidates": candidates,
                "disease": disease_name,
                "diseaseConfidence": disease_conf,
                "disease_confidence": disease_conf,
                "healthStatus": health_status,
                "health_status": health_status,
                "diagnosisStatus": diagnosis_status,
                "diagnosis_status": diagnosis_status,
                "is_healthy": is_leaf_healthy,
                "is_confident": species_conf >= 0.35,
                "crop": final_display_crop,
                "condition": disease_name if disease_name else ("Healthy" if is_leaf_healthy else "Uncertain"),
                "confidence": round(float(species_conf), 4),
                "model_version": getattr(self, "version", 3),
                "plant": {
                    "name": final_species,
                    "displayName": final_display_crop,
                    "confidence": crop_conf_pct
                },
                "health": {
                    "status": health_status,
                    "confidence": disease_conf_pct if disease_conf_pct is not None else (100 if is_leaf_healthy else 0)
                },
                "diagnosis": diagnosis_obj,
                "severity": severity,
                "recommendation": structured_guidance,
                "top5": top5_list,
                "symptoms": symptoms,
                "recommended_actions": recommended_actions,
                "message": user_message,
                "safety_note": structured_guidance.get("safety_note", DEFAULT_DISCLAIMER),
                "disclaimer": DEFAULT_DISCLAIMER
            }

        except Exception as e:
            return {
                "success": False,
                "isValid": False,
                "is_valid": False,
                "isPlant": False,
                "is_plant": False,
                "error": "INFERENCE_ERROR",
                "reason": "inference_error",
                "message": f"An error occurred during plant analysis: {str(e)}",
                "crop": "Unknown Plant",
                "species": None,
                "organ": "unknown",
                "condition": "Error",
                "confidence": 0.0,
                "species_confidence": 0.0,
                "disease": None,
                "disease_confidence": None,
                "healthStatus": None,
                "diagnosisStatus": "INVALID_IMAGE",
                "diagnosis_status": "INVALID_IMAGE",
                "isSupportedSpecies": False,
                "is_supported_species": False,
                "candidates": [],
                "plant": {"name": "Unknown", "confidence": 0},
                "health": {"status": "Unknown", "confidence": 0},
                "diagnosis": None,
                "severity": "Unknown",
                "recommendation": {
                    "explanation": "Inference processing error.",
                    "fertilizer": [],
                    "disease_management": [],
                    "prevention": ["Please try capturing the photo again."]
                },
                "safety_note": DEFAULT_DISCLAIMER,
                "disclaimer": DEFAULT_DISCLAIMER
            }


# Global Singleton Instance
ai_classifier = UniversalLeafScannerEngine()
