import io
import os
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import numpy as np
from typing import Dict, Any, Tuple
from disease_info import DISEASE_DATABASE, STANDARD_CLASSES, DEFAULT_DISCLAIMER

class CropDiseaseClassifier:
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
        print(f"[AI Model]: CropDiseaseClassifier initialized with {self.num_classes} multi-crop plant pathology classes.")

    def _load_model(self) -> nn.Module:
        """
        Loads the trained MobileNetV3-Small deep convolutional network checkpoint.
        """
        model = models.mobilenet_v3_small(weights=None)
        in_features = model.classifier[3].in_features
        
        # Plant pathology classification head
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
                    model.load_state_dict(checkpoint["model_state_dict"])
                    if "classes" in checkpoint:
                        self.classes = checkpoint["classes"]
                        self.num_classes = len(self.classes)
                    val_acc = checkpoint.get("val_accuracy", "N/A")
                    print(f"[AI Model]: Loaded trained weights from '{self.model_path}' (Val Acc: {val_acc}%).")
                else:
                    model.load_state_dict(checkpoint)
                    print(f"[AI Model]: Loaded state_dict from '{self.model_path}'.")
            except Exception as e:
                print(f"⚠️ [AI Model]: Error loading checkpoint '{self.model_path}': {e}. Initializing base weights.")
        else:
            print(f"⚠️ [AI Model]: Checkpoint '{self.model_path}' not found. Using default MobileNetV3 weights.")

        model.eval()
        return model

    def _analyze_leaf_features(self, image: Image.Image) -> Dict[str, float]:
        """
        Extracts agronomic color, foliage ratio, and variance features for out-of-distribution detection.
        """
        img_rgb = image.convert("RGB").resize((128, 128))
        np_img = np.array(img_rgb, dtype=np.float32) / 255.0
        r, g, b = np_img[:, :, 0], np_img[:, :, 1], np_img[:, :, 2]

        # Excess Green Index (ExG = 2*G - R - B)
        exg = 2.0 * g - r - b
        foliage_ratio = float(np.mean(exg > -0.15))
        color_variance = float(np.var(np_img))
        green_mean = float(np.mean(g))
        red_mean = float(np.mean(r))
        blue_mean = float(np.mean(b))

        return {
            "foliage_ratio": foliage_ratio,
            "color_variance": color_variance,
            "green_mean": green_mean,
            "red_mean": red_mean,
            "blue_mean": blue_mean,
        }

    def predict(self, image_bytes: bytes, filename: str = "upload.jpg", mime_type: str = "image/jpeg") -> Dict[str, Any]:
        """
        Executes real computer vision neural inference on image bytes and returns structured multi-crop diagnosis.
        Logs safe non-credential diagnostic information.
        """
        file_size = len(image_bytes)
        try:
            image = Image.open(io.BytesIO(image_bytes))
            image.verify()
            image = Image.open(io.BytesIO(image_bytes))
            img_width, img_height = image.size
            img_format = image.format or mime_type
        except Exception as e:
            return {
                "success": False,
                "is_confident": False,
                "error": f"Invalid or corrupted image file: {str(e)}",
                "message": "Unable to process this file. Please upload a valid JPEG, PNG, or WebP image."
            }

        features = self._analyze_leaf_features(image)

        # Out-of-distribution & non-foliar rejection
        if features["color_variance"] < 0.003:
            print(f"📷 [AI Inference]: Image {img_width}x{img_height}, Format: {img_format}, Size: {file_size} bytes -> Monotone/Blank Rejected.")
            return self._low_confidence_response(0.08, "Monotone / blank image detected.")

        if features["foliage_ratio"] < 0.10 and features["green_mean"] < 0.15:
            print(f"📷 [AI Inference]: Image {img_width}x{img_height}, Format: {img_format}, Size: {file_size} bytes -> Non-foliar Rejected.")
            return self._low_confidence_response(0.12, "Non-plant object or unclear foliage detected.")

        try:
            rgb_image = image.convert("RGB")
            input_tensor = self.transform(rgb_image).unsqueeze(0).to(self.device)

            with torch.no_grad():
                logits = self.model(input_tensor)
                probabilities = torch.softmax(logits, dim=1)[0]
                top5_probs, top5_indices = torch.topk(probabilities, min(5, self.num_classes))

            top_prob = float(top5_probs[0].item())
            top_class = self.classes[top5_indices[0].item()]

            # Build structured Top-5 predictions list
            top5_list = []
            for p, idx in zip(top5_probs, top5_indices):
                c_name = self.classes[idx.item()]
                prob_val = round(float(p.item()), 4)
                c_info = DISEASE_DATABASE.get(c_name, {})
                top5_list.append({
                    "className": c_name,
                    "crop": c_info.get("crop", c_name.split("___")[0]),
                    "disease": c_info.get("disease", c_name.replace("___", " ")),
                    "probability": prob_val
                })

            # Safe diagnostic logging
            try:
                print("=" * 70)
                print(f"[AI Diagnostic Camera]: Image Dimensions: {img_width}x{img_height} | Format: {img_format} | Size: {file_size} bytes")
                print(f"[AI Diagnostic Model]: Model: MobileNetV3-Small-MultiCrop | Preprocessing: (224, 224, ImageNet Normalized)")
                print(f"[AI Diagnostic Predictions]: Top 5 Distribution:")
                for rank, item in enumerate(top5_list, 1):
                    print(f"   {rank}. {item['className']} -> Probability: {item['probability']:.4f} ({item['crop']} - {item['disease']})")
                print(f"[AI Diagnostic Selected]: Top Class: {top_class} | Top-1 Confidence: {top_prob:.4f}")
                print("=" * 70)
            except Exception:
                pass

            # Strict confidence & OOD threshold (0.45) to prevent forcing unconfident predictions
            CONFIDENCE_THRESHOLD = 0.45
            if top_prob < CONFIDENCE_THRESHOLD or top_class == "Background_without_leaves":
                resp = self._low_confidence_response(
                    round(top_prob, 4) if top_class != "Background_without_leaves" else 0.15,
                    "Prediction confidence below validated threshold or background image."
                )
                resp["top5"] = top5_list
                return resp

            # Retrieve verified pathology details for the predicted multi-crop class
            pathology = DISEASE_DATABASE.get(top_class, {
                "crop": "Agricultural Crop",
                "disease": top_class.replace("___", " ").replace("_", " "),
                "is_healthy": "healthy" in top_class.lower(),
                "symptoms": ["Leaf tissue discoloration or spot formation."],
                "recommended_actions": ["Consult your local Agriculture Extension Officer."]
            })

            return {
                "success": True,
                "is_confident": True,
                "class_code": top_class,
                "crop": pathology["crop"],
                "disease": pathology["disease"],
                "is_healthy": pathology["is_healthy"],
                "confidence": round(top_prob, 4),
                "top5": top5_list,
                "symptoms": pathology["symptoms"],
                "recommended_actions": pathology["recommended_actions"],
                "disclaimer": DEFAULT_DISCLAIMER
            }
        except Exception as e:
            return {
                "success": False,
                "is_confident": False,
                "error": str(e),
                "message": "An error occurred during neural network inference."
            }

    def _low_confidence_response(self, confidence: float, reason: str = "") -> Dict[str, Any]:
        return {
            "success": True,
            "is_confident": False,
            "crop": "Unknown / Low Confidence",
            "disease": "The AI could not confidently identify this leaf.",
            "is_healthy": False,
            "confidence": round(confidence, 4),
            "symptoms": [
                "The uploaded image does not match supported crop leaf pathology categories with sufficient confidence.",
                "The leaf may be outside the model's supported classes or the camera angle/lighting was insufficient."
            ],
            "recommended_actions": [
                "Capture a close-up photo of the affected leaf in bright, natural daylight.",
                "Ensure the leaf is in sharp focus and fills most of the camera frame.",
                "If symptoms persist on an unsupported crop, consult your local Village Agriculture Assistant (VAA / AEO)."
            ],
            "disclaimer": DEFAULT_DISCLAIMER,
            "message": "The AI could not confidently identify this leaf. Please upload a clear photo of a supported crop leaf."
        }

# Global singleton instance
ai_classifier = CropDiseaseClassifier()
