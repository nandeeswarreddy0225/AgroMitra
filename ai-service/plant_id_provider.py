"""
AgroMitra Broad Plant & Fruit Identification Provider
Integrates:
1. Official Pl@ntNet API (CIRAD/INRIA botanical service covering 50,000+ species worldwide)
2. Pure Python / NumPy Organ Assessment (Leaf, Fruit, Flower, Bark)
3. Local Botanical Taxonomy & Morphological Knowledge Engine (Offline fallback)
"""

import os
import io
import json
import socket
import urllib.request
import urllib.parse
import urllib.error
import numpy as np
from PIL import Image
from typing import Dict, Any, List, Optional, Tuple

# Botanical Taxonomy Registry for Canonicalization & Common/Scientific Name Resolution
OPEN_WORLD_BOTANICAL_TAXONOMY: Dict[str, Dict[str, Any]] = {
    "Mango": {
        "scientific_name": "Mangifera indica",
        "common_name": "Mango",
        "family": "Anacardiaceae",
        "telugu": "మామిడి",
        "category": "Fruit",
        "is_specialist": True,
        "default_organ": "fruit"
    },
    "Guava": {
        "scientific_name": "Psidium guajava",
        "common_name": "Guava",
        "family": "Myrtaceae",
        "telugu": "జామ",
        "category": "Fruit",
        "is_specialist": False,
        "default_organ": "fruit"
    },
    "Okra": {
        "scientific_name": "Abelmoschus esculentus",
        "common_name": "Okra / Lady's Finger",
        "family": "Malvaceae",
        "telugu": "బెండకాయ",
        "category": "Vegetable",
        "is_specialist": False,
        "default_organ": "fruit"
    },
    "Papaya": {
        "scientific_name": "Carica papaya",
        "common_name": "Papaya",
        "family": "Caricaceae",
        "telugu": "బొప్పాయి",
        "category": "Fruit",
        "is_specialist": False,
        "default_organ": "fruit"
    },
    "Coconut": {
        "scientific_name": "Cocos nucifera",
        "common_name": "Coconut Palm",
        "family": "Arecaceae",
        "telugu": "కొబ్బరి",
        "category": "Commercial",
        "is_specialist": False,
        "default_organ": "leaf"
    },
    "Brinjal": {
        "scientific_name": "Solanum melongena",
        "common_name": "Brinjal / Eggplant",
        "family": "Solanaceae",
        "telugu": "వంకాయ",
        "category": "Vegetable",
        "is_specialist": False,
        "default_organ": "fruit"
    },
    "Wheat": {
        "scientific_name": "Triticum aestivum",
        "common_name": "Wheat",
        "family": "Poaceae",
        "telugu": "గోధుమ",
        "category": "Cereal",
        "is_specialist": False,
        "default_organ": "leaf"
    },
    "Sugarcane": {
        "scientific_name": "Saccharum officinarum",
        "common_name": "Sugarcane",
        "family": "Poaceae",
        "telugu": "చెరకు",
        "category": "Commercial",
        "is_specialist": False,
        "default_organ": "leaf"
    },
    "Cucumber": {
        "scientific_name": "Cucumis sativus",
        "common_name": "Cucumber",
        "family": "Cucurbitaceae",
        "telugu": "దోసకాయ",
        "category": "Vegetable",
        "is_specialist": False,
        "default_organ": "fruit"
    },
    "Squash": {
        "scientific_name": "Cucurbita pepo / Cucurbita moschata",
        "common_name": "Squash / Pumpkin",
        "family": "Cucurbitaceae",
        "telugu": "గుమ్మడికాయ",
        "category": "Vegetable",
        "is_specialist": False,
        "default_organ": "fruit"
    },
    "Groundnut": {
        "scientific_name": "Arachis hypogaea",
        "common_name": "Groundnut / Peanut",
        "family": "Fabaceae",
        "telugu": "వేరుశనగ",
        "category": "Legume",
        "is_specialist": False,
        "default_organ": "leaf"
    },
    "Bean": {
        "scientific_name": "Phaseolus vulgaris",
        "common_name": "Common Bean",
        "family": "Fabaceae",
        "telugu": "చిక్కుడు",
        "category": "Legume",
        "is_specialist": False,
        "default_organ": "fruit"
    },
    "Tulsi": {
        "scientific_name": "Ocimum tenuiflorum",
        "common_name": "Holy Basil / Tulsi",
        "family": "Lamiaceae",
        "telugu": "తులసి",
        "category": "Herb",
        "is_specialist": False,
        "default_organ": "leaf"
    },
    "Mint": {
        "scientific_name": "Mentha spicata",
        "common_name": "Spearmint / Mint",
        "family": "Lamiaceae",
        "telugu": "పుదీనా",
        "category": "Herb",
        "is_specialist": False,
        "default_organ": "leaf"
    },
    "Rose": {
        "scientific_name": "Rosa spp.",
        "common_name": "Rose",
        "family": "Rosaceae",
        "telugu": "గులాబీ",
        "category": "Ornamental",
        "is_specialist": False,
        "default_organ": "flower"
    },
    "Tea": {
        "scientific_name": "Camellia sinensis",
        "common_name": "Tea",
        "family": "Theaceae",
        "telugu": "టీ",
        "category": "Commercial",
        "is_specialist": False,
        "default_organ": "leaf"
    },
    "Coffee": {
        "scientific_name": "Coffea arabica",
        "common_name": "Coffee",
        "family": "Rubiaceae",
        "telugu": "కాఫీ",
        "category": "Commercial",
        "is_specialist": False,
        "default_organ": "fruit"
    },
    "Eucalyptus": {
        "scientific_name": "Eucalyptus globulus",
        "common_name": "Eucalyptus",
        "family": "Myrtaceae",
        "telugu": "నీలగిరి",
        "category": "Tree",
        "is_specialist": False,
        "default_organ": "leaf"
    },
    "Banyan": {
        "scientific_name": "Ficus benghalensis",
        "common_name": "Banyan Tree",
        "family": "Moraceae",
        "telugu": "మర్రి చెట్టు",
        "category": "Tree",
        "is_specialist": False,
        "default_organ": "leaf"
    },
    "Tomato": {
        "scientific_name": "Solanum lycopersicum",
        "common_name": "Tomato",
        "family": "Solanaceae",
        "telugu": "టమాటా",
        "category": "Vegetable",
        "is_specialist": True,
        "default_organ": "fruit"
    },
    "Potato": {
        "scientific_name": "Solanum tuberosum",
        "common_name": "Potato",
        "family": "Solanaceae",
        "telugu": "బంగాళాదుంప",
        "category": "Vegetable",
        "is_specialist": True,
        "default_organ": "leaf"
    },
    "Apple": {
        "scientific_name": "Malus domestica",
        "common_name": "Apple",
        "family": "Rosaceae",
        "telugu": "ఆపిల్",
        "category": "Fruit",
        "is_specialist": True,
        "default_organ": "fruit"
    },
    "Banana": {
        "scientific_name": "Musa acuminata / Musa balbisiana",
        "common_name": "Banana",
        "family": "Musaceae",
        "telugu": "అరటి",
        "category": "Fruit",
        "is_specialist": True,
        "default_organ": "fruit"
    },
    "Blueberry": {
        "scientific_name": "Vaccinium corymbosum",
        "common_name": "Blueberry",
        "family": "Ericaceae",
        "telugu": "బ్లూబెర్రీ",
        "category": "Fruit",
        "is_specialist": True,
        "default_organ": "fruit"
    },
    "Cherry": {
        "scientific_name": "Prunus avium / Prunus cerasus",
        "common_name": "Sweet / Sour Cherry",
        "family": "Rosaceae",
        "telugu": "చెర్రీ",
        "category": "Fruit",
        "is_specialist": True,
        "default_organ": "fruit"
    },
    "Chilli": {
        "scientific_name": "Capsicum annuum",
        "common_name": "Chilli Pepper / Bell Pepper",
        "family": "Solanaceae",
        "telugu": "మిరప",
        "category": "Vegetable",
        "is_specialist": True,
        "default_organ": "fruit"
    },
    "Citrus": {
        "scientific_name": "Citrus limon / Citrus sinensis",
        "common_name": "Citrus / Lemon / Orange",
        "family": "Rutaceae",
        "telugu": "నిమ్మ / బత్తాయి",
        "category": "Fruit",
        "is_specialist": True,
        "default_organ": "fruit"
    },
    "Corn": {
        "scientific_name": "Zea mays",
        "common_name": "Corn / Maize",
        "family": "Poaceae",
        "telugu": "మొక్కజొన్న",
        "category": "Cereal",
        "is_specialist": True,
        "default_organ": "fruit"
    },
    "Cotton": {
        "scientific_name": "Gossypium hirsutum",
        "common_name": "Cotton",
        "family": "Malvaceae",
        "telugu": "పత్తి",
        "category": "Commercial",
        "is_specialist": True,
        "default_organ": "fruit"
    },
    "Grape": {
        "scientific_name": "Vitis vinifera",
        "common_name": "Grape Vine",
        "family": "Vitaceae",
        "telugu": "ద్రాక్ష",
        "category": "Fruit",
        "is_specialist": True,
        "default_organ": "fruit"
    },
    "Neem": {
        "scientific_name": "Azadirachta indica",
        "common_name": "Neem",
        "family": "Meliaceae",
        "telugu": "వేప",
        "category": "Tree",
        "is_specialist": True,
        "default_organ": "leaf"
    },
    "Peach": {
        "scientific_name": "Prunus persica",
        "common_name": "Peach",
        "family": "Rosaceae",
        "telugu": "పీచ్",
        "category": "Fruit",
        "is_specialist": True,
        "default_organ": "fruit"
    },
    "Raspberry": {
        "scientific_name": "Rubus idaeus",
        "common_name": "Raspberry",
        "family": "Rosaceae",
        "telugu": "రాస్ప్‌బెర్రీ",
        "category": "Fruit",
        "is_specialist": True,
        "default_organ": "fruit"
    },
    "Rice": {
        "scientific_name": "Oryza sativa",
        "common_name": "Paddy / Rice",
        "family": "Poaceae",
        "telugu": "వరి",
        "category": "Cereal",
        "is_specialist": True,
        "default_organ": "leaf"
    },
    "Soybean": {
        "scientific_name": "Glycine max",
        "common_name": "Soybean",
        "family": "Fabaceae",
        "telugu": "సోయాబీన్",
        "category": "Legume",
        "is_specialist": True,
        "default_organ": "leaf"
    },
    "Strawberry": {
        "scientific_name": "Fragaria x ananassa",
        "common_name": "Garden Strawberry",
        "family": "Rosaceae",
        "telugu": "స్ట్రాబెర్రీ",
        "category": "Fruit",
        "is_specialist": True,
        "default_organ": "fruit"
    }
}


class OrganDetector:
    """
    Lightweight, high-precision pixel & morphological chromatic analyzer
    Classifies plant organ into:
    - 'leaf': Chlorophyll foliage, ExG > 0, green/olive hues
    - 'fruit': Distinct chromatic rind/pulp (citrus orange/yellow, tomato red, berry purple, apple red/green core)
    - 'flower': Vibrant petal colors (magenta, violet, pink, lilac)
    - 'bark': Textured fibrous greyish/brown wood with low color saturation
    """

    @staticmethod
    def detect_organ(image: Image.Image, organ_hint: Optional[str] = None) -> Tuple[str, float, Dict[str, float]]:
        rgb = image.convert("RGB")
        w, h = rgb.size
        if w < 10 or h < 10:
            return "leaf", 0.5, {"foliar_ratio": 1.0, "fruit_ratio": 0.0, "bark_ratio": 0.0, "flower_ratio": 0.0}

        # Subsample for speed and low CPU usage
        max_dim = 256
        if w > max_dim or h > max_dim:
            rgb.thumbnail((max_dim, max_dim))
            w, h = rgb.size

        arr = np.array(rgb, dtype=np.float32)
        r = arr[:, :, 0]
        g = arr[:, :, 1]
        b = arr[:, :, 2]
        gray = 0.299 * r + 0.587 * g + 0.114 * b
        total = float(w * h)

        # Foliage masks
        green_mask = (g > r * 1.06) & (g > b * 1.10) & (g > 35.0)
        olive_mask = (g > r * 0.96) & (g > b * 1.20) & (g > 28.0) & (r < 120.0)
        foliar_mask = green_mask | olive_mask
        foliar_ratio = float(np.sum(foliar_mask)) / total

        # Bark mask: grayish/brown woody tone with low saturation
        diff_rg = np.abs(r - g)
        diff_gb = np.abs(g - b)
        bark_mask = (
            (r > 35.0) & (r < 190.0) &
            (g > 30.0) & (g < 185.0) &
            (b > 20.0) & (b < 170.0) &
            (diff_rg < 35.0) & (diff_gb < 30.0)
        )
        bark_ratio = float(np.sum(bark_mask)) / total
        texture_var = float(np.var(gray))

        # Fruit chromatic masks
        orange_red_fruit = ((r > 140.0) & (g > 50.0) & (g < 130.0) & (b < 60.0) & (r > g * 1.35)) | ((r > 165.0) & (g < 55.0) & (b < 55.0))
        yellow_fruit = (r > 180.0) & (g > 165.0) & (b < 90.0) & (diff_rg < 25.0) & (r > b * 1.9) & (g > b * 1.9)
        purple_fruit = (r > 50.0) & (r < 120.0) & (b > 65.0) & (b < 140.0) & (g < 55.0)
        fruit_mask = (orange_red_fruit | yellow_fruit | purple_fruit) & (~foliar_mask)
        fruit_ratio = float(np.sum(fruit_mask)) / total

        # Flower chromatic masks (petals: vibrant pink, magenta, violet, lilac, crimson, saturated yellow)
        pink_violet = ((r > 160.0) & (b > 115.0) & (g < 125.0)) | ((r > 175.0) & (g < 85.0) & (b > 95.0))
        crimson_flower = (r > 180.0) & (g < 60.0) & (b < 80.0)
        yellow_flower = (r > 200.0) & (g > 170.0) & (b < 75.0) & (r > b * 2.5) & (g > b * 2.0)
        flower_mask = (pink_violet | crimson_flower | yellow_flower) & (~foliar_mask)
        flower_ratio = float(np.sum(flower_mask)) / total

        # Center focus weights
        cy, cx = h / 2.0, w / 2.0
        y_coords, x_coords = np.ogrid[:h, :w]
        dist_from_center = np.sqrt((x_coords - cx) ** 2 + (y_coords - cy) ** 2)
        center_mask = dist_from_center < (min(w, h) * 0.35)
        center_total = float(np.sum(center_mask))
        center_fruit_ratio = float(np.sum(fruit_mask & center_mask)) / center_total if center_total > 0 else 0.0
        center_flower_ratio = float(np.sum(flower_mask & center_mask)) / center_total if center_total > 0 else 0.0

        details = {
            "foliar_ratio": round(foliar_ratio, 4),
            "fruit_ratio": round(fruit_ratio, 4),
            "bark_ratio": round(bark_ratio, 4),
            "flower_ratio": round(flower_ratio, 4),
            "center_fruit_ratio": round(center_fruit_ratio, 4),
            "center_flower_ratio": round(center_flower_ratio, 4),
            "texture_var": round(texture_var, 1)
        }

        # If an explicit organ hint was provided, honor it while preserving full chromatic metrics
        if organ_hint and organ_hint.lower() in ["leaf", "fruit", "flower", "bark"]:
            details["hint_used"] = True
            return organ_hint.lower(), 0.95, details

        # 1. Bark detection: dominant woody bark pixels with low foliage, or high texture variance
        if (texture_var >= 5500 and bark_ratio >= 0.08) or (bark_ratio >= 0.25 and foliar_ratio < 0.25):
            conf = min(0.95, bark_ratio + 0.35)
            return "bark", round(conf, 2), details

        # 2. Fruit detection: fruit chromaticity dominates center or overall with low foliage
        if (center_fruit_ratio >= 0.20 or fruit_ratio >= 0.15) and foliar_ratio < 0.20:
            conf = min(0.95, max(fruit_ratio, center_fruit_ratio) + 0.35)
            return "fruit", round(conf, 2), details

        # 3. Flower detection: flower petals prominent in center or overall
        if (center_flower_ratio >= 0.30 and foliar_ratio < 0.75) or (flower_ratio >= 0.20 and foliar_ratio < 0.45):
            conf = min(0.95, max(flower_ratio, center_flower_ratio) + 0.35)
            return "flower", round(conf, 2), details

        # 4. Foliar leaf default
        conf = min(0.99, max(0.50, foliar_ratio + 0.15))
        return "leaf", round(conf, 2), details


class PlantNetIdentificationProvider:
    """
    Official Pl@ntNet API Botanical Vision Integration
    Provider docs: https://my-api.plantnet.org/
    Supports 50,000+ plant species across leaves, fruits, flowers, and bark.
    Uses Python standard library (urllib) to guarantee zero extra dependencies.
    """

    def __init__(self, api_key: Optional[str] = None, project: str = "all", timeout_seconds: int = 10):
        # Read API key from parameter or environment
        self.api_key = (
            api_key or
            os.getenv("PLANTNET_API_KEY") or
            os.getenv("PLANT_NET_API_KEY") or
            os.getenv("GENERAL_PLANT_API_KEY") or
            ""
        ).strip()
        self.project = project
        self.timeout = timeout_seconds

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key) >= 10)

    @staticmethod
    def canonicalize_species_name(scientific_name: Optional[str] = None, common_names: Optional[List[str]] = None) -> str:
        """
        Maps international botanical nomenclature (Latin binomials & common names)
        to AgroMitra canonical crop/plant identifiers.
        """
        sci = (scientific_name or "").strip().lower()
        c_names = common_names or []

        # Latin genus / binomial mapping
        if sci.startswith("mangifera"): return "Mango"
        if sci.startswith("psidium"): return "Guava"
        if sci.startswith("abelmoschus"): return "Okra"
        if sci.startswith("carica"): return "Papaya"
        if sci.startswith("cocos"): return "Coconut"
        if sci.startswith("solanum melongena"): return "Brinjal"
        if sci.startswith("solanum lycopersicum"): return "Tomato"
        if sci.startswith("solanum tuberosum"): return "Potato"
        if sci.startswith("oryza"): return "Rice"
        if sci.startswith("vitis"): return "Grape"
        if sci.startswith("malus"): return "Apple"
        if sci.startswith("musa"): return "Banana"
        if sci.startswith("vaccinium"): return "Blueberry"
        if sci.startswith("prunus avium") or sci.startswith("prunus cerasus"): return "Cherry"
        if sci.startswith("capsicum"): return "Chilli"
        if sci.startswith("citrus"): return "Citrus"
        if sci.startswith("zea mays"): return "Corn"
        if sci.startswith("gossypium"): return "Cotton"
        if sci.startswith("azadirachta"): return "Neem"
        if sci.startswith("prunus persica"): return "Peach"
        if sci.startswith("rubus"): return "Raspberry"
        if sci.startswith("glycine max"): return "Soybean"
        if sci.startswith("fragaria"): return "Strawberry"
        if sci.startswith("cucurbita"): return "Squash"
        if sci.startswith("triticum"): return "Wheat"
        if sci.startswith("saccharum"): return "Sugarcane"
        if sci.startswith("cucumis sativus"): return "Cucumber"
        if sci.startswith("arachis"): return "Groundnut"
        if sci.startswith("phaseolus"): return "Bean"
        if sci.startswith("camellia sinensis"): return "Tea"
        if sci.startswith("coffea"): return "Coffee"
        if sci.startswith("ocimum"): return "Tulsi"
        if sci.startswith("rosa"): return "Rose"
        if sci.startswith("eucalyptus"): return "Eucalyptus"
        if sci.startswith("ficus benghalensis"): return "Banyan"

        # Common names search
        for cn in c_names:
            cn_lower = cn.strip().lower()
            if "mango" in cn_lower: return "Mango"
            if "guava" in cn_lower: return "Guava"
            if "okra" in cn_lower or "lady's finger" in cn_lower or "gumbo" in cn_lower: return "Okra"
            if "papaya" in cn_lower or "pawpaw" in cn_lower: return "Papaya"
            if "coconut" in cn_lower: return "Coconut"
            if "brinjal" in cn_lower or "eggplant" in cn_lower or "aubergine" in cn_lower: return "Brinjal"
            if "tomato" in cn_lower: return "Tomato"
            if "potato" in cn_lower: return "Potato"
            if "rice" in cn_lower or "paddy" in cn_lower: return "Rice"
            if "grape" in cn_lower: return "Grape"
            if "apple" in cn_lower: return "Apple"
            if "banana" in cn_lower: return "Banana"
            if "chilli" in cn_lower or "chili" in cn_lower or "pepper" in cn_lower: return "Chilli"
            if "citrus" in cn_lower or "lemon" in cn_lower or "orange" in cn_lower: return "Citrus"
            if "corn" in cn_lower or "maize" in cn_lower: return "Corn"
            if "cotton" in cn_lower: return "Cotton"
            if "peach" in cn_lower: return "Peach"
            if "wheat" in cn_lower: return "Wheat"
            if "squash" in cn_lower or "pumpkin" in cn_lower: return "Squash"
            if "tulsi" in cn_lower or "holy basil" in cn_lower: return "Tulsi"

        if c_names and len(c_names[0].strip()) > 0:
            return c_names[0].strip().title()

        return (scientific_name or "Plant").strip()

    def identify(self, image_bytes: bytes, filename: str = "image.jpg", organ: str = "leaf") -> Dict[str, Any]:
        """
        Queries Pl@ntNet API with standard multipart/form-data.
        Handles API limits, network errors, timeouts, and missing API keys gracefully.
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "API_KEY_MISSING",
                "message": "Pl@ntNet API key is not configured. Falling back to local botanical knowledge base.",
                "provider": "Pl@ntNet"
            }

        valid_organs = {"leaf", "flower", "fruit", "bark", "auto"}
        pnet_organ = organ.lower() if organ.lower() in valid_organs else "auto"

        url = f"https://my-api.plantnet.org/v2/identify/{self.project}?api-key={urllib.parse.quote(self.api_key)}&lang=en"

        boundary = "---------------------------AgroMitraPlantNetBoundary"
        body = io.BytesIO()

        # Add image part
        body.write(f"--{boundary}\r\n".encode("utf-8"))
        body.write(f'Content-Disposition: form-data; name="images"; filename="{filename}"\r\n'.encode("utf-8"))
        body.write(b"Content-Type: image/jpeg\r\n\r\n")
        body.write(image_bytes)
        body.write(b"\r\n")

        # Add organ part
        if pnet_organ != "auto":
            body.write(f"--{boundary}\r\n".encode("utf-8"))
            body.write(b'Content-Disposition: form-data; name="organs"\r\n\r\n')
            body.write(f"{pnet_organ}\r\n".encode("utf-8"))

        body.write(f"--{boundary}--\r\n".encode("utf-8"))
        content = body.getvalue()

        req = urllib.request.Request(url, data=content)
        req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
        req.add_header("User-Agent", "AgroMitra-AI-Scanner/2.1")

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                status_code = response.getcode()
                raw_data = response.read().decode("utf-8")
                res_json = json.loads(raw_data)

                results = res_json.get("results", [])
                if not results:
                    return {
                        "success": False,
                        "error": "NO_PREDICTION",
                        "message": "Pl@ntNet did not return any high-confidence candidate matches for this specimen.",
                        "provider": "Pl@ntNet"
                    }

                top_hit = results[0]
                top_species = top_hit.get("species", {})
                scientific_name = top_species.get("scientificNameWithoutAuthor") or top_species.get("scientificName", "")
                common_names = top_species.get("commonNames", [])
                raw_score = float(top_hit.get("score", 0.0))
                genus = top_species.get("genus", {}).get("scientificNameWithoutAuthor", "")
                family = top_species.get("family", {}).get("scientificNameWithoutAuthor", "")

                canonical_name = self.canonicalize_species_name(scientific_name, common_names)

                candidates = []
                for r in results[:5]:
                    sp = r.get("species", {})
                    s_name = sp.get("scientificNameWithoutAuthor") or sp.get("scientificName", "")
                    c_list = sp.get("commonNames", [])
                    candidates.append({
                        "species": s_name,
                        "canonical_name": self.canonicalize_species_name(s_name, c_list),
                        "common_name": c_list[0] if c_list else None,
                        "confidence": round(float(r.get("score", 0.0)), 4)
                    })

                is_confident = raw_score >= 0.25

                return {
                    "success": True,
                    "provider": "Pl@ntNet",
                    "species": canonical_name if is_confident else None,
                    "scientific_name": scientific_name,
                    "common_name": common_names[0] if common_names else canonical_name,
                    "confidence": round(raw_score, 4),
                    "family": family,
                    "genus": genus,
                    "organ": pnet_organ,
                    "candidates": candidates,
                    "is_confident": is_confident,
                    "is_plant": True,
                    "raw_details": res_json
                }

        except urllib.error.HTTPError as http_err:
            status = http_err.code
            if status == 404:
                return {
                    "success": False,
                    "error": "NOT_FOUND",
                    "message": "Specimen could not be recognized by Pl@ntNet database.",
                    "provider": "Pl@ntNet"
                }
            elif status == 429:
                return {
                    "success": False,
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": "Pl@ntNet daily API quota exceeded. Falling back to local botanical vision.",
                    "provider": "Pl@ntNet"
                }
            elif status == 401 or status == 403:
                return {
                    "success": False,
                    "error": "INVALID_API_KEY",
                    "message": "Pl@ntNet API key is unauthorized or invalid.",
                    "provider": "Pl@ntNet"
                }
            else:
                return {
                    "success": False,
                    "error": f"HTTP_{status}",
                    "message": f"Pl@ntNet service responded with HTTP {status}.",
                    "provider": "Pl@ntNet"
                }
        except (urllib.error.URLError, socket.timeout, TimeoutError) as net_err:
            return {
                "success": False,
                "error": "NETWORK_TIMEOUT",
                "message": f"Network error or timeout contacting Pl@ntNet API: {str(net_err)}",
                "provider": "Pl@ntNet"
            }
        except Exception as e:
            return {
                "success": False,
                "error": "PLANTNET_EXCEPTION",
                "message": f"Unexpected error during Pl@ntNet inference: {str(e)}",
                "provider": "Pl@ntNet"
            }


class LocalBotanicalVisionProvider:
    """
    Offline Botanical Knowledge Engine & Visual Phenotyper
    Activated when:
    - Pl@ntNet API key is not configured (default zero-config out-of-the-box experience)
    - Pl@ntNet API key is missing, invalid, rate-limited, or network is disconnected
    
    Provides:
    - Morphological leaf phenotyping (aspect ratio, fullness extent, circularity)
    - Plant species identification for open-world crops (Guava, Okra, Coconut, Papaya, Brinjal, Wheat, Tulsi)
    - Organ identification (fruit, flower, bark, leaf)
    - Rejection of non-plant images and safe handling of unsupported inputs
    """

    def __init__(self):
        self.taxonomy = OPEN_WORLD_BOTANICAL_TAXONOMY

    @staticmethod
    def phenotyping_leaf(image: Image.Image) -> Optional[Tuple[str, float]]:
        """
        Analyzes geometric leaf moments and fullness extent to recognize open-world specimens.
        """
        rgb = image.convert("RGB")
        w, h = rgb.size
        step = max(1, int(np.sqrt((w * h) / 40000)))
        img_thumb = rgb.resize((max(1, w // step), max(1, h // step)))
        arr = np.array(img_thumb, dtype=np.float32)
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

        is_leaf = (2 * g - r - b > 5) & (g > 35) & (g > b * 1.05)
        is_brown = (r > 60) & (g > 40) & (b < 50) & (r > b * 1.2)
        mask = is_leaf | is_brown
        total = float(np.sum(mask))
        if total < 50:
            return None

        y, x = np.where(mask)
        mean_x = float(np.mean(x))
        mean_y = float(np.mean(y))
        dx = x - mean_x
        dy = y - mean_y
        mu20 = float(np.mean(dx ** 2))
        mu02 = float(np.mean(dy ** 2))
        mu11 = float(np.mean(dx * dy))
        common = float(np.sqrt((mu20 - mu02) ** 2 + 4 * (mu11 ** 2)))
        lambda1 = (mu20 + mu02 + common) / 2.0
        lambda2 = max(0.001, (mu20 + mu02 - common) / 2.0)
        ar = float(np.sqrt(lambda1 / lambda2))

        min_x, max_x = float(np.min(x)), float(np.max(x))
        min_y, max_y = float(np.min(y)), float(np.max(y))
        bbox_area = (max_x - min_x + 1) * (max_y - min_y + 1)
        extent = total / (bbox_area + 1e-5)

        # Botanical morphological rules
        if ar >= 5.0:
            return "Coconut", 0.94
        if ar >= 3.8 and extent >= 0.40:
            return "Wheat", 0.91
        if 0.90 <= ar <= 1.40 and extent <= 0.65:
            return "Okra", 0.93
        if 0.85 <= ar <= 1.35 and extent <= 0.50:
            return "Papaya", 0.92
        if 1.30 <= ar <= 2.2 and extent >= 0.70:
            return "Guava", 0.92
        if 1.55 <= ar <= 2.05 and 0.52 <= extent <= 0.66:
            return "Tulsi", 0.91
        if 1.15 <= ar <= 1.80 and 0.55 <= extent <= 0.82:
            return "Brinjal", 0.90
        return None

    def identify(self, image: Image.Image, organ: Optional[str] = None) -> Dict[str, Any]:
        organ_name, organ_conf, details = OrganDetector.detect_organ(image, organ_hint=organ)
        actual_organ = organ.lower() if (organ and organ.lower() in ["fruit", "flower", "bark", "leaf"]) else organ_name

        # Non-plant rejection check
        # Only reject if virtually no plant characteristics (foliage, fruit, bark, or flower) are present
        if (
            details.get("foliar_ratio", 0) < 0.03 and
            details.get("fruit_ratio", 0) < 0.02 and
            details.get("bark_ratio", 0) < 0.03 and
            details.get("flower_ratio", 0) < 0.02
        ):
            return {
                "success": False,
                "is_plant": False,
                "species": None,
                "scientific_name": None,
                "common_name": None,
                "confidence": 0.0,
                "organ": "unknown",
                "candidates": [],
                "error": "NON_PLANT_IMAGE",
                "message": "Non-plant image detected. No plant foliage, fruit, flower, or bark characteristics found.",
                "provider": "LocalBotanicalVision"
            }

        if actual_organ == "bark":
            return {
                "success": True,
                "is_plant": True,
                "species": "Tree Bark",
                "scientific_name": "Plantae (Woody Trunk)",
                "common_name": "Tree Bark",
                "confidence": round(organ_conf, 4),
                "organ": "bark",
                "candidates": [{
                    "species": "Plantae (Woody Trunk)",
                    "canonical_name": "Tree Bark",
                    "common_name": "Tree Bark",
                    "confidence": round(organ_conf, 4)
                }],
                "details": details,
                "provider": "LocalBotanicalVision"
            }

        if actual_organ == "fruit":
            return {
                "success": True,
                "is_plant": True,
                "species": "Plant Fruit",
                "scientific_name": "Plantae (Fructus)",
                "common_name": "Plant Fruit",
                "confidence": round(organ_conf, 4),
                "organ": "fruit",
                "candidates": [{
                    "species": "Plantae (Fructus)",
                    "canonical_name": "Plant Fruit",
                    "common_name": "Plant Fruit",
                    "confidence": round(organ_conf, 4)
                }],
                "details": details,
                "provider": "LocalBotanicalVision"
            }

        if actual_organ == "flower":
            return {
                "success": True,
                "is_plant": True,
                "species": "Plant Flower",
                "scientific_name": "Plantae (Flos)",
                "common_name": "Plant Flower / Blossom",
                "confidence": round(organ_conf, 4),
                "organ": "flower",
                "candidates": [{
                    "species": "Plantae (Flos)",
                    "canonical_name": "Plant Flower",
                    "common_name": "Plant Flower / Blossom",
                    "confidence": round(organ_conf, 4)
                }],
                "details": details,
                "provider": "LocalBotanicalVision"
            }

        # Check leaf morphological phenotyping
        morphology_hit = self.phenotyping_leaf(image)
        if morphology_hit:
            m_species, m_conf = morphology_hit
            tax = self.taxonomy.get(m_species, {})
            return {
                "success": True,
                "is_plant": True,
                "species": m_species,
                "scientific_name": tax.get("scientific_name"),
                "common_name": tax.get("common_name", m_species),
                "confidence": round(m_conf, 4),
                "organ": actual_organ,
                "candidates": [{
                    "species": tax.get("scientific_name", m_species),
                    "canonical_name": m_species,
                    "common_name": tax.get("common_name", m_species),
                    "confidence": round(m_conf, 4)
                }],
                "details": details,
                "provider": "LocalBotanicalVision"
            }

        return {
            "success": True,
            "is_plant": True,
            "species": None,  # Will be resolved or matched with neural model
            "scientific_name": None,
            "common_name": None,
            "confidence": round(organ_conf, 4),
            "organ": actual_organ,
            "candidates": [],
            "details": details,
            "provider": "LocalBotanicalVision"
        }


class BroadPlantIdentificationEngine:
    """
    Master Botanical Identification Engine
    Coordinates Pl@ntNet API + Local Botanical Fallback + Organ Assessment
    """

    def __init__(self, plantnet_api_key: Optional[str] = None):
        self.pnet_provider = PlantNetIdentificationProvider(api_key=plantnet_api_key)
        self.local_provider = LocalBotanicalVisionProvider()
        self.organ_detector = OrganDetector()

    def identify_plant_or_fruit(
        self,
        image_bytes: bytes,
        filename: str = "image.jpg",
        organ_hint: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Unified Identification Pipeline:
        1. Decodes and checks image validity.
        2. Detects organ (leaf, fruit, flower, bark).
        3. Tries Pl@ntNet API if key configured.
        4. Gracefully falls back to Local Botanical Vision if Pl@ntNet is unavailable.
        """
        try:
            image = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            return {
                "success": False,
                "is_plant": False,
                "species": None,
                "scientific_name": None,
                "common_name": None,
                "confidence": 0.0,
                "organ": "unknown",
                "candidates": [],
                "error": "IMAGE_DECODE_FAILED",
                "message": f"Could not decode image: {str(e)}",
                "provider": "LocalBotanicalVision"
            }

        # Step 1: Detect Organ
        detected_organ, organ_conf, organ_details = self.organ_detector.detect_organ(image, organ_hint=organ_hint)
        chosen_organ = organ_hint.lower() if (organ_hint and organ_hint.lower() in ["leaf", "fruit", "flower", "bark"]) else detected_organ

        # Step 2: If Pl@ntNet is configured, invoke Pl@ntNet API
        if self.pnet_provider.is_configured():
            pnet_res = self.pnet_provider.identify(image_bytes, filename=filename, organ=chosen_organ)
            if pnet_res.get("success"):
                pnet_res["detected_organ"] = chosen_organ
                pnet_res["organ_confidence"] = organ_conf
                pnet_res["organ_details"] = organ_details
                return pnet_res
            else:
                fallback_reason = pnet_res.get("message") or pnet_res.get("error")
                print(f"[BroadPlantIdentification]: Pl@ntNet call did not succeed ({fallback_reason}). Gracefully falling back to Local Botanical Vision.")

        # Step 3: Local Botanical Fallback
        local_res = self.local_provider.identify(image, organ=chosen_organ)
        local_res["detected_organ"] = chosen_organ
        local_res["organ_confidence"] = organ_conf
        local_res["organ_details"] = organ_details
        return local_res

    def identify(self, *args, **kwargs) -> Dict[str, Any]:
        return self.identify_plant_or_fruit(*args, **kwargs)


# Global Singleton Instance
broad_plant_identifier = BroadPlantIdentificationEngine()
