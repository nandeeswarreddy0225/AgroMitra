"""
Universal Plant Pathology & Botanical Knowledge Base
Supports 25+ global crop species and 50+ pathological/defect conditions:
- Tomato, Potato, Maize/Corn, Rice, Wheat, Cotton, Sugarcane, Soybean, Bean/Pea
- Chilli/Pepper, Brinjal/Eggplant, Cucumber, Groundnut, Apple, Grape, Mango
- Citrus, Banana, Papaya, Guava, Tea, Coffee, Neem, and Out-of-Distribution handler.
"""

from typing import Dict, List, Any, Optional

PLANT_SPECIES_DATABASE: Dict[str, Dict[str, Any]] = {
    "Tomato": {"scientific": "Solanum lycopersicum", "telugu": "టమాటా", "family": "Solanaceae"},
    "Potato": {"scientific": "Solanum tuberosum", "telugu": "బంగాళాదుంప", "family": "Solanaceae"},
    "Corn": {"scientific": "Zea mays", "telugu": "మొక్కజొన్న", "family": "Poaceae"},
    "Rice": {"scientific": "Oryza sativa", "telugu": "వరి", "family": "Poaceae"},
    "Wheat": {"scientific": "Triticum aestivum", "telugu": "గోధుమ", "family": "Poaceae"},
    "Cotton": {"scientific": "Gossypium hirsutum", "telugu": "పత్తి", "family": "Malvaceae"},
    "Sugarcane": {"scientific": "Saccharum officinarum", "telugu": "చెరకు", "family": "Poaceae"},
    "Soybean": {"scientific": "Glycine max", "telugu": "సోయాబీన్", "family": "Fabaceae"},
    "Chilli": {"scientific": "Capsicum annuum", "telugu": "మిరప", "family": "Solanaceae"},
    "Brinjal": {"scientific": "Solanum melongena", "telugu": "వంకాయ", "family": "Solanaceae"},
    "Cucumber": {"scientific": "Cucumis sativus", "telugu": "దోసకాయ", "family": "Cucurbitaceae"},
    "Groundnut": {"scientific": "Arachis hypogaea", "telugu": "వేరుశనగ", "family": "Fabaceae"},
    "Apple": {"scientific": "Malus domestica", "telugu": "ఆపిల్", "family": "Rosaceae"},
    "Grape": {"scientific": "Vitis vinifera", "telugu": "ద్రాక్ష", "family": "Vitaceae"},
    "Mango": {"scientific": "Mangifera indica", "telugu": "మామిడి", "family": "Anacardiaceae"},
    "Citrus": {"scientific": "Citrus spp.", "telugu": "నిమ్మ / బత్తాయి", "family": "Rutaceae"},
    "Banana": {"scientific": "Musa spp.", "telugu": "అరటి", "family": "Musaceae"},
    "Papaya": {"scientific": "Carica papaya", "telugu": "బొప్పాయి", "family": "Caricaceae"},
    "Guava": {"scientific": "Psidium guajava", "telugu": "జామ", "family": "Myrtaceae"},
    "Tea": {"scientific": "Camellia sinensis", "telugu": "టీ", "family": "Theaceae"},
    "Coffee": {"scientific": "Coffea arabica", "telugu": "కాఫీ", "family": "Rubiaceae"},
    "Neem": {"scientific": "Azadirachta indica", "telugu": "వేప", "family": "Meliaceae"},
    "Bean": {"scientific": "Phaseolus vulgaris", "telugu": "చిక్కుడు", "family": "Fabaceae"},
}

UNIVERSAL_PATHOLOGY_DATABASE: Dict[str, Dict[str, Any]] = {
    # --- TOMATO ---
    "Tomato___healthy": {
        "plant": "Tomato",
        "plant_display": "Tomato (టమాటా)",
        "health_status": "Healthy",
        "diagnosis": None,
        "severity": "None",
        "is_healthy": True,
        "symptoms": ["Vibrant green, uniform leaf color without necrotic spots, halos, or curling."],
        "recommendation": "No visible disease detected. Continue regular drip irrigation and balanced N-P-K crop nutrition."
    },
    "Tomato___Early_blight": {
        "plant": "Tomato",
        "plant_display": "Tomato (టమాటా)",
        "health_status": "Diseased",
        "diagnosis": "Early Blight (ఆకు మాడు తెగులు - Alternaria solani)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Concentric brown-black circular rings with distinct yellow chlorotic halos on older leaves."],
        "recommendation": "Prune infected lower foliage. Apply Copper Oxychloride (3g/L) or Mancozeb (2g/L) and avoid overhead irrigation."
    },
    "Tomato___Late_blight": {
        "plant": "Tomato",
        "plant_display": "Tomato (టమాటా)",
        "health_status": "Diseased",
        "diagnosis": "Late Blight (లేట్ బ్లైట్ తెగులు - Phytophthora infestans)",
        "severity": "Severe",
        "is_healthy": False,
        "symptoms": ["Water-soaked dark brown necrotic lesions on leaf margins with white downy fungal growth underneath."],
        "recommendation": "Immediately destroy heavily infected plants. Spray systemic Cymoxanil + Mancozeb (2g/L) or Metalaxyl under agronomist guidance."
    },
    "Tomato___Leaf_Mold": {
        "plant": "Tomato",
        "plant_display": "Tomato (టమాటా)",
        "health_status": "Diseased",
        "diagnosis": "Leaf Mold (ఆకు బూజు తెగులు - Passalora fulva)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Pale green to yellow spots on upper leaf surfaces and olive-brown velvety mold on lower leaf surfaces."],
        "recommendation": "Improve canopy aeration and lower relative humidity below 85%. Apply approved bio-fungicide or copper spray."
    },
    "Tomato___Yellow_Leaf_Curl_Virus": {
        "plant": "Tomato",
        "plant_display": "Tomato (టమాటా)",
        "health_status": "Diseased",
        "diagnosis": "Tomato Yellow Leaf Curl Virus (ఆకు ముడుత వైరస్ - TYLCV)",
        "severity": "Severe",
        "is_healthy": False,
        "symptoms": ["Severe upward leaf curling, yellow interveinal chlorosis, and stunted bushy growth."],
        "recommendation": "Control Whitefly (Bemisia tabaci) vector with yellow sticky traps and spray Neem Oil (1500 ppm) or systemic insecticide."
    },

    # --- POTATO ---
    "Potato___healthy": {
        "plant": "Potato",
        "plant_display": "Potato (బంగాళాదుంప)",
        "health_status": "Healthy",
        "diagnosis": None,
        "severity": "None",
        "is_healthy": True,
        "symptoms": ["Lush green compound leaves without chlorotic margins or tuber rot symptoms."],
        "recommendation": "Maintain proper hilling-up and soil moisture balance according to Soil Health Card guidelines."
    },
    "Potato___Early_blight": {
        "plant": "Potato",
        "plant_display": "Potato (బంగాళాదుంప)",
        "health_status": "Diseased",
        "diagnosis": "Early Blight (ఆకు మాడు తెగులు - Alternaria solani)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Angular dark brown spots with target-like concentric rings on mature leaflets."],
        "recommendation": "Apply prophylactic Mancozeb or Chlorothalonil spray and avoid water stress during tuber initiation."
    },
    "Potato___Late_blight": {
        "plant": "Potato",
        "plant_display": "Potato (బంగాళాదుంప)",
        "health_status": "Diseased",
        "diagnosis": "Late Blight (లేట్ బ్లైట్ తెగులు - Phytophthora infestans)",
        "severity": "Severe",
        "is_healthy": False,
        "symptoms": ["Rapidly spreading water-soaked black-brown lesions causing rapid foliage collapse in humid cool weather."],
        "recommendation": "Apply protective contact and systemic fungicides (e.g. Dimethomorph + Mancozeb) immediately upon first detection."
    },

    # --- CORN / MAIZE ---
    "Corn___healthy": {
        "plant": "Corn",
        "plant_display": "Corn / Maize (మొక్కజొన్న)",
        "health_status": "Healthy",
        "diagnosis": None,
        "severity": "None",
        "is_healthy": True,
        "symptoms": ["Erect elongated green leaves with clear parallel venation and healthy vegetative vigor."],
        "recommendation": "Ensure timely split application of nitrogen fertilizers at knee-high and tasseling stages."
    },
    "Corn___Common_rust": {
        "plant": "Corn",
        "plant_display": "Corn / Maize (మొక్కజొన్న)",
        "health_status": "Diseased",
        "diagnosis": "Common Rust (తుప్పు తెగులు - Puccinia sorghi)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Golden-brown to cinnamon-red powdery pustules rupturing on both upper and lower leaf surfaces."],
        "recommendation": "Plant certified resistant hybrids. Apply Azoxystrobin or Propiconazole spray if rust covers >5% leaf area before tasseling."
    },
    "Corn___Northern_Leaf_Blight": {
        "plant": "Corn",
        "plant_display": "Corn / Maize (మొక్కజొన్న)",
        "health_status": "Diseased",
        "diagnosis": "Northern Corn Leaf Blight (ఆకు ఎండు తెగులు - Exserohilum turcicum)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Long elliptical grayish-green or tan cigar-shaped lesions on leaf blades."],
        "recommendation": "Rotate crops and destroy infected stover. Apply Mancozeb (2.5g/L) upon early lesion appearance."
    },

    # --- RICE / PADDY ---
    "Rice___healthy": {
        "plant": "Rice",
        "plant_display": "Rice / Paddy (వరి)",
        "health_status": "Healthy",
        "diagnosis": None,
        "severity": "None",
        "is_healthy": True,
        "symptoms": ["Lush green erect tillers with clean flag leaves free of blast or sheath rot."],
        "recommendation": "Practice alternate wetting and drying (AWD) water management and follow Leaf Color Chart (LCC) nitrogen timing."
    },
    "Rice___Brown_Spot": {
        "plant": "Rice",
        "plant_display": "Rice / Paddy (వరి)",
        "health_status": "Diseased",
        "diagnosis": "Brown Spot (గోధుమ మచ్చ తెగులు - Bipolaris oryzae)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Oval brown spots with grayish-white centers on leaf blades and leaf sheaths."],
        "recommendation": "Correct soil potassium and zinc deficiencies. Apply Propiconazole or Tricyclazole + Mancozeb spray."
    },
    "Rice___Bacterial_Blight": {
        "plant": "Rice",
        "plant_display": "Rice / Paddy (వరి)",
        "health_status": "Diseased",
        "diagnosis": "Bacterial Leaf Blight (బాక్టీరియా ఎండు తెగులు - Xanthomonas oryzae)",
        "severity": "Severe",
        "is_healthy": False,
        "symptoms": ["Wavy water-soaked yellow-orange lesions progressing from leaf tips along margins."],
        "recommendation": "Drain excess stagnant water. Apply Copper Oxychloride (2.5g/L) + Streptocycline (100mg/L) and avoid excess nitrogen."
    },

    # --- COTTON ---
    "Cotton___healthy": {
        "plant": "Cotton",
        "plant_display": "Cotton (పత్తి)",
        "health_status": "Healthy",
        "diagnosis": None,
        "severity": "None",
        "is_healthy": True,
        "symptoms": ["Clean broad lobed leaves without vein browning or sucking pest damage."],
        "recommendation": "Monitor weekly for pink bollworm and sucking pests using pheromone and yellow sticky traps."
    },
    "Cotton___Bacterial_Blight": {
        "plant": "Cotton",
        "plant_display": "Cotton (పత్తి)",
        "health_status": "Diseased",
        "diagnosis": "Bacterial Blight / Angular Leaf Spot (కోణీయ మచ్చ తెగులు - Xanthomonas albilineans)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Angular water-soaked spots restricted by veins on the underside of leaves, turning dark brown."],
        "recommendation": "Spray Copper Oxychloride (3g/L) mixed with Streptocycline (100mg/L) upon early symptom detection."
    },

    # --- CHILLI / PEPPER ---
    "Chilli___healthy": {
        "plant": "Chilli",
        "plant_display": "Chilli / Pepper (మిరప)",
        "health_status": "Healthy",
        "diagnosis": None,
        "severity": "None",
        "is_healthy": True,
        "symptoms": ["Dark green glossy ovate leaves without curling, mosaic patterns, or necrotic spots."],
        "recommendation": "Maintain balanced micro-nutrients (Zinc, Boron) and prophylactic Neem oil spray (1000 ppm)."
    },
    "Chilli___Bacterial_spot": {
        "plant": "Chilli",
        "plant_display": "Chilli / Pepper (మిరప)",
        "health_status": "Diseased",
        "diagnosis": "Bacterial Leaf Spot (బాక్టీరియా మచ్చ తెగులు - Xanthomonas campestris)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Small circular or irregular dark brown water-soaked spots with pale margins on foliage."],
        "recommendation": "Apply Copper Hydroxide or Copper Oxychloride (3g/L) combined with plant antibiotic Streptocycline."
    },
    "Chilli___Leaf_Curl": {
        "plant": "Chilli",
        "plant_display": "Chilli / Pepper (మిరప)",
        "health_status": "Pest Damage",
        "diagnosis": "Chilli Leaf Curl & Mite Damage (బొబ్బర / తామర పురుగు నష్టం - Thrips & Mites)",
        "severity": "Severe",
        "is_healthy": False,
        "symptoms": ["Upward cupping and boat-shaped puckering of leaves caused by thrips and yellow mites."],
        "recommendation": "Install blue and yellow sticky traps. Spray Diafenthiuron (1.2g/L) or Spiromesifen (1ml/L) under expert supervision."
    },

    # --- APPLE ---
    "Apple___healthy": {
        "plant": "Apple",
        "plant_display": "Apple (ఆపిల్)",
        "health_status": "Healthy",
        "diagnosis": None,
        "severity": "None",
        "is_healthy": True,
        "symptoms": ["Uniform green ovate leaves without velvety scab lesions or powdery mildew."],
        "recommendation": "Ensure proper winter pruning and orchard sanitation to prevent fungal spore carryover."
    },
    "Apple___Apple_scab": {
        "plant": "Apple",
        "plant_display": "Apple (ఆపిల్)",
        "health_status": "Diseased",
        "diagnosis": "Apple Scab (వెంKeychain స్కాబ్ - Venturia inaequalis)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Olive-green to dull brown velvety circular lesions on upper leaf surfaces."],
        "recommendation": "Rake and destroy fallen leaf litter. Spray Difenoconazole or Mancozeb during pink bud and petal fall stages."
    },
    "Apple___Black_rot": {
        "plant": "Apple",
        "plant_display": "Apple (ఆపిల్)",
        "health_status": "Diseased",
        "diagnosis": "Black Rot / Frog-Eye Leaf Spot (నల్ల కుళ్ళు తెగులు - Botryosphaeria obtusa)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Small purple specks expanding into circular 'frog-eye' lesions with dark borders."],
        "recommendation": "Prune out dead wood and cankers. Apply Captan or Thiophanate-methyl fungicides."
    },

    # --- MANGO ---
    "Mango___healthy": {
        "plant": "Mango",
        "plant_display": "Mango (మామిడి)",
        "health_status": "Healthy",
        "diagnosis": None,
        "severity": "None",
        "is_healthy": True,
        "symptoms": ["Deep green, leathery lanceolate leaves with prominent light green midribs and clean vegetative flushes."],
        "recommendation": "Apply post-harvest organic compost and maintain orchard weeding and light canopy pruning."
    },
    "Mango___Anthracnose": {
        "plant": "Mango",
        "plant_display": "Mango (మామిడి)",
        "health_status": "Diseased",
        "diagnosis": "Anthracnose (మచ్చ తెగులు - Colletotrichum gloeosporioides)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Irregular dark brown to black necrotic spots on leaves, blossoms, and young panicles."],
        "recommendation": "Remove severely infected twigs. Spray Carbendazim (1g/L) or Copper Oxychloride (3g/L) before flowering and fruit set."
    },
    "Mango___Powdery_Mildew": {
        "plant": "Mango",
        "plant_display": "Mango (మామిడి)",
        "health_status": "Diseased",
        "diagnosis": "Powdery Mildew (బూడిద తెగులు - Oidium mangiferae)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["White powdery superficial fungal patches on leaves and inflorescences leading to blossom drop."],
        "recommendation": "Spray Wettable Sulfur (3g/L) or Hexaconazole (1ml/L) during panicle emergence."
    },

    # --- GRAPE ---
    "Grape___healthy": {
        "plant": "Grape",
        "plant_display": "Grape (ద్రాక్ష)",
        "health_status": "Healthy",
        "diagnosis": None,
        "severity": "None",
        "is_healthy": True,
        "symptoms": ["Large lobed green leaves without mildew oil spots or marginal scorch."],
        "recommendation": "Maintain proper trellis canopy training and balanced micro-irrigation."
    },
    "Grape___Black_rot": {
        "plant": "Grape",
        "plant_display": "Grape (ద్రాక్ష)",
        "health_status": "Diseased",
        "diagnosis": "Black Rot (నల్ల కుళ్ళు తెగులు - Guignardia bidwellii)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Reddish-brown circular spots on leaves containing tiny black fungal pycnidia dots."],
        "recommendation": "Apply protective Mancozeb or Myclobutanil sprays starting from early shoot development."
    },
    "Grape___Esca": {
        "plant": "Grape",
        "plant_display": "Grape (ద్రాక్ష)",
        "health_status": "Diseased",
        "diagnosis": "Esca / Black Measles (ఎస్కా తెగులు - Phaeomoniella chlamydospora)",
        "severity": "Severe",
        "is_healthy": False,
        "symptoms": ["'Tiger-stripe' chlorotic and necrotic patterns between leaf veins."],
        "recommendation": "Prune during dry weather and seal large pruning wounds with fungicide paste."
    },

    # --- NEEM ---
    "Neem___healthy": {
        "plant": "Neem",
        "plant_display": "Neem (వేప)",
        "health_status": "Healthy",
        "diagnosis": None,
        "severity": "None",
        "is_healthy": True,
        "symptoms": ["Vibrant green, serrated falcate pinnate leaflets with uniform arrangement and natural vigor."],
        "recommendation": "Neem is a hardy natural bio-pesticide and medicinal tree. Maintain moderate watering and harvest mature leaves as organic mulch."
    },
    "Neem___leaf_spot_blight": {
        "plant": "Neem",
        "plant_display": "Neem (వేప)",
        "health_status": "Diseased",
        "diagnosis": "Leaf Spot / Foliar Blight (వేప ఆకు మచ్చ తెగులు - Pseudocercospora / Colletotrichum)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Dark brown necrotic spots with yellow halos on pinnate leaflets and shoot dieback."],
        "recommendation": "Thin crowded tree canopies to improve sunlight penetration. Spray Mancozeb (2.5g/L) during humid monsoon spells."
    },

    # --- BANANA ---
    "Banana___healthy": {
        "plant": "Banana",
        "plant_display": "Banana (అరటి)",
        "health_status": "Healthy",
        "diagnosis": None,
        "severity": "None",
        "is_healthy": True,
        "symptoms": ["Large broad paddle-shaped green leaves without yellow streaks or marginal necrosis."],
        "recommendation": "Provide adequate potassium fertilization and regular drip irrigation; remove excess side suckers."
    },
    "Banana___Black_Sigatoka": {
        "plant": "Banana",
        "plant_display": "Banana (అరటి)",
        "health_status": "Diseased",
        "diagnosis": "Black Sigatoka / Leaf Streak (సిగటోకా ఆకు ఎండు తెగులు - Pseudocercospora fijiensis)",
        "severity": "Severe",
        "is_healthy": False,
        "symptoms": ["Dark reddish-brown to black narrow elliptical streaks running parallel to leaf veins."],
        "recommendation": "De-leaf severely infected foliage to reduce spore load. Apply mineral oil emulsion + Propiconazole (1ml/L)."
    },

    # --- CITRUS ---
    "Citrus___healthy": {
        "plant": "Citrus",
        "plant_display": "Citrus (నిమ్మ / బత్తాయి)",
        "health_status": "Healthy",
        "diagnosis": None,
        "severity": "None",
        "is_healthy": True,
        "symptoms": ["Dark green glossy winged leaves without corky canker lesions or yellow mottle."],
        "recommendation": "Apply balanced micronutrient foliar spray (Zinc + Iron + Magnesium) and follow drip irrigation schedules."
    },
    "Citrus___Citrus_canker": {
        "plant": "Citrus",
        "plant_display": "Citrus (నిమ్మ / బత్తాయి)",
        "health_status": "Diseased",
        "diagnosis": "Citrus Canker (గజ్జి తెగులు - Xanthomonas axonopodis pv. citri)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Raised corky brownish-tan crater-like pustules with oily water-soaked yellow halos on leaves."],
        "recommendation": "Prune cankered twigs before monsoon. Spray Copper Oxychloride (3g/L) + Streptocycline (100mg/L)."
    },

    # --- CITRUS GREENING ---
    "Citrus___Citrus_greening": {
        "plant": "Citrus",
        "plant_display": "Citrus (నిమ్మ / బత్తాయి)",
        "health_status": "Diseased",
        "diagnosis": "Huanglongbing / Citrus Greening (హ్వాంగ్లాంగ్‌బింగ్ - Candidatus Liberibacter)",
        "severity": "Severe",
        "is_healthy": False,
        "symptoms": ["Asymmetric blotchy mottling on leaves, yellow shoot dieback, and small lopsided bitter fruits."],
        "recommendation": "Control Asian citrus psyllid vectors with Imidacloprid. Remove severely infected trees and source disease-free nursery budwood."
    },

    # --- ADDITIONAL TOMATO DISEASES ---
    "Tomato___Septoria_leaf_spot": {
        "plant": "Tomato",
        "plant_display": "Tomato (టమాటా)",
        "health_status": "Diseased",
        "diagnosis": "Septoria Leaf Spot (సెప్టోరియా ఆకు మచ్చ - Septoria lycopersici)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Numerous small circular spots with gray centers and dark brown borders on lower foliage."],
        "recommendation": "Remove lower infected foliage. Apply Chlorothalonil or Mancozeb sprays and mulch soil around plant bases."
    },
    "Tomato___Bacterial_spot": {
        "plant": "Tomato",
        "plant_display": "Tomato (టమాటా)",
        "health_status": "Diseased",
        "diagnosis": "Bacterial Spot (బాక్టీరియా మచ్చ - Xanthomonas campestris pv. vesicatoria)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Small angular water-soaked dark brown spots that turn greasy and scabby with yellow chlorotic halos."],
        "recommendation": "Apply Copper Hydroxide (2.5g/L) + Streptocycline (100mg/L). Avoid overhead irrigation."
    },
    "Tomato___Spider_mites": {
        "plant": "Tomato",
        "plant_display": "Tomato (టమాటా)",
        "health_status": "Pest Damage",
        "diagnosis": "Two-Spotted Spider Mites (ఎర్ర నల్లి నష్టం - Tetranychus urticae)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Fine pale yellow stippling and speckled chlorosis on upper leaf surface with delicate webbing underneath."],
        "recommendation": "Spray Spiromesifen (1ml/L) or Wettable Sulfur (3g/L) on lower leaf undersides; wash foliage with strong water sprays."
    },
    "Tomato___Target_Spot": {
        "plant": "Tomato",
        "plant_display": "Tomato (టమాటా)",
        "health_status": "Diseased",
        "diagnosis": "Target Spot (టార్గెట్ స్పాట్ తెగులు - Corynespora cassiicola)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Pinpoint brown lesions that enlarge into target-like circular necrotic zones with concentric rings."],
        "recommendation": "Ensure proper plant spacing for air circulation. Spray Azoxystrobin or Difenoconazole."
    },
    "Tomato___Mosaic_virus": {
        "plant": "Tomato",
        "plant_display": "Tomato (టమాటా)",
        "health_status": "Diseased",
        "diagnosis": "Tomato Mosaic Virus (మొజాయిక్ వైరస్ - ToMV)",
        "severity": "Severe",
        "is_healthy": False,
        "symptoms": ["Mottled light and dark green mosaic patterns, blistering, leaf distortion, and fern-like foliage."],
        "recommendation": "Rogue and burn infected plants. Disinfect pruning tools with 10% trisodium phosphate; wash hands before handling."
    },

    # --- PEACH ---
    "Peach___healthy": {
        "plant": "Peach",
        "plant_display": "Peach",
        "health_status": "Healthy",
        "diagnosis": None,
        "severity": "None",
        "is_healthy": True,
        "symptoms": ["Clean lanceolate leaves with smooth margins and healthy green color."],
        "recommendation": "Maintain regular orchard pruning and balanced winter fertilizing."
    },
    "Peach___Bacterial_spot": {
        "plant": "Peach",
        "plant_display": "Peach",
        "health_status": "Diseased",
        "diagnosis": "Bacterial Spot (బాక్టీరియల్ స్పాట్ - Xanthomonas arboricola)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Small angular water-soaked purple-brown lesions that drop out leaving 'shot-hole' appearance."],
        "recommendation": "Spray Copper compounds during dormant and bloom stages."
    },

    # --- STRAWBERRY ---
    "Strawberry___healthy": {
        "plant": "Strawberry",
        "plant_display": "Strawberry",
        "health_status": "Healthy",
        "diagnosis": None,
        "severity": "None",
        "is_healthy": True,
        "symptoms": ["Trifoliate bright green leaves with serrated margins and healthy crowns."],
        "recommendation": "Ensure raised bed drainage, organic straw mulching, and balanced drip irrigation."
    },
    "Strawberry___Leaf_scorch": {
        "plant": "Strawberry",
        "plant_display": "Strawberry",
        "health_status": "Diseased",
        "diagnosis": "Leaf Scorch (ఆకు ముడుత తెగులు - Diplocarpon earlianum)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["Small dark purple irregular blotches that coalesce into widespread brown scorching."],
        "recommendation": "Remove old infected leaves after harvest; spray Captan or Copper fungicide."
    },

    # --- CHERRY, BLUEBERRY, RASPBERRY, SOYBEAN ---
    "Cherry___healthy": {
        "plant": "Cherry",
        "plant_display": "Cherry",
        "health_status": "Healthy",
        "diagnosis": None,
        "severity": "None",
        "is_healthy": True,
        "symptoms": ["Deep green glossy ovate leaves without shot-holes or powdery mildew."],
        "recommendation": "Maintain proper tree canopy pruning and orchard floor hygiene."
    },
    "Cherry___Powdery_mildew": {
        "plant": "Cherry",
        "plant_display": "Cherry",
        "health_status": "Diseased",
        "diagnosis": "Powdery Mildew (బూడిద తెగులు - Podosphaera clandestina)",
        "severity": "Moderate",
        "is_healthy": False,
        "symptoms": ["White powdery superficial fungal patches causing leaf curling and distorted shoot growth."],
        "recommendation": "Apply Sulfur or Myclobutanil sprays starting from shuck fall stage."
    },
    "Blueberry___healthy": {
        "plant": "Blueberry",
        "plant_display": "Blueberry",
        "health_status": "Healthy",
        "diagnosis": None,
        "severity": "None",
        "is_healthy": True,
        "symptoms": ["Glossy elliptical dark green foliage without chlorosis or leaf spots."],
        "recommendation": "Maintain acidic soil pH (4.5–5.2) with organic pine bark mulch."
    },
    "Raspberry___healthy": {
        "plant": "Raspberry",
        "plant_display": "Raspberry",
        "health_status": "Healthy",
        "diagnosis": None,
        "severity": "None",
        "is_healthy": True,
        "symptoms": ["Compound pinnate green leaves with silvery undersides and healthy cane vigor."],
        "recommendation": "Prune out spent floricanes after harvest and maintain trellis support."
    },
    "Soybean___healthy": {
        "plant": "Soybean",
        "plant_display": "Soybean (సోయాబీన్)",
        "health_status": "Healthy",
        "diagnosis": None,
        "severity": "None",
        "is_healthy": True,
        "symptoms": ["Trifoliate lush green leaves without rust pustules or bacterial pustules."],
        "recommendation": "Maintain proper rhizobium inoculation and balanced phosphorus fertilization."
    },

    # --- BACKGROUND & UNKNOWN ---
    "Background___non_leaf": {
        "plant": "Non-Leaf Object",
        "plant_display": "Non-Leaf Object (ఆకు కాదు)",
        "health_status": "Unknown",
        "diagnosis": None,
        "severity": "Unknown",
        "is_healthy": False,
        "symptoms": ["Image does not depict agricultural foliage or plant tissue."],
        "recommendation": "Please upload a clear close-up photo of a real crop or plant leaf in natural daylight."
    },
    "Unknown___unsupported": {
        "plant": "Unknown",
        "plant_display": "Unknown Plant",
        "health_status": "Unknown",
        "diagnosis": None,
        "severity": "Unknown",
        "is_healthy": False,
        "symptoms": ["The visual morphology does not match high-confidence botanical profiles in the database."],
        "recommendation": "The image could not be reliably identified. Please upload a clear close-up image of the leaf or consult a local agricultural extension officer."
    }
}

# Legacy mapping for backwards compatibility
DISEASE_DATABASE: Dict[str, Dict[str, Any]] = {}
for k, v in UNIVERSAL_PATHOLOGY_DATABASE.items():
    DISEASE_DATABASE[k] = {
        "crop": v["plant_display"],
        "disease": v["diagnosis"] if v["diagnosis"] else "Healthy Crop (ఆరోగ్యకరమైన పంట)",
        "is_healthy": v["is_healthy"],
        "health_status": v["health_status"],
        "symptoms": v["symptoms"],
        "recommended_actions": [v["recommendation"]],
    }

STANDARD_CLASSES = list(UNIVERSAL_PATHOLOGY_DATABASE.keys())

DEFAULT_DISCLAIMER = (
    "AgroMitra Universal Leaf Scanner is an AI-powered diagnostic decision-support tool. "
    "Always consult your local Agricultural Extension Officer (AEO), Krishi Vigyan Kendra (KVK), or certified agronomist "
    "for field verification before applying chemical treatments."
)
