from typing import Dict, List, Any

DISEASE_DATABASE: Dict[str, Dict[str, Any]] = {
    "Tomato___Early_blight": {
        "crop": "Tomato (టమాటా)",
        "disease": "Early Blight (ఆకు మాడు తెగులు - Alternaria solani)",
        "is_healthy": False,
        "symptoms": [
            "Concentric brown-black circular rings forming target-like patterns on older leaves.",
            "Yellow halo (chlorosis) surrounding dark necrotic lesions.",
            "Premature defoliation starting from the lower canopy progressing upwards.",
            "Dark, sunken, leathery cankers on stems and fruit calyx."
        ],
        "recommended_actions": [
            "Prune and destroy heavily infected lower leaves to restrict fungal spore splash.",
            "Avoid overhead sprinkler irrigation; switch to drip irrigation to keep foliage dry.",
            "Ensure 60cm plant spacing for adequate air circulation through the canopy.",
            "Apply bio-control agents like Trichoderma viride or approved copper oxychloride (COC) spray under agronomist guidance.",
            "Practice minimum 2-year crop rotation avoiding other Solanaceous crops (Potato, Brinjal, Chilli)."
        ]
    },
    "Tomato___Late_blight": {
        "crop": "Tomato (టమాటా)",
        "disease": "Late Blight (లేట్ బ్లైట్ తెగులు - Phytophthora infestans)",
        "is_healthy": False,
        "symptoms": [
            "Irregular water-soaked pale green or dark brown lesions on leaf edges.",
            "White fungal cottony growth visible on the underside of leaves during humid mornings.",
            "Rapid collapse and browning of entire leaf foliage giving a frost-damaged appearance.",
            "Firm brown greasy lesions on green and ripening tomato fruits."
        ],
        "recommended_actions": [
            "Immediately remove and deeply bury or burn infected foliage to prevent epidemic spread.",
            "Improve field drainage to eliminate water stagnation.",
            "Avoid working in the field when crop leaves are wet to stop mechanical transmission.",
            "Consult your village Agricultural Extension Officer (AEO) for approved protective bio-fungicide schedules.",
            "Plant certified late-blight resistant tomato hybrid varieties."
        ]
    },
    "Tomato___healthy": {
        "crop": "Tomato (టమాటా)",
        "disease": "Healthy Crop (ఆరోగ్యకరమైన పంట)",
        "is_healthy": True,
        "symptoms": [
            "Vibrant green, uniform leaf color without spots or chlorotic halos.",
            "Turgid leaves with normal venation and healthy vegetative stem structure.",
            "No visible fungal mycelium, bacterial ooze, or insect pest infestation."
        ],
        "recommended_actions": [
            "Maintain balanced N-P-K nutrient application according to Soil Health Card recommendations.",
            "Continue regular drip irrigation cycles based on soil moisture monitoring.",
            "Inspect weekly for early aphid, whitefly, or red spider mite vectors.",
            "Apply organic neem oil (1500 ppm) as a prophylactic pest deterrent."
        ]
    },
    "Tomato___Leaf_Mold": {
        "crop": "Tomato (టమాటా)",
        "disease": "Leaf Mold (ఆకు బూజు తెగులు - Passalora fulva)",
        "is_healthy": False,
        "symptoms": [
            "Pale yellow spots with indistinct margins on upper leaf surfaces.",
            "Olive-green to brown velvety fungal mold on the lower leaf surface.",
            "Leaves curl, wither, and drop prematurely in high humidity conditions."
        ],
        "recommended_actions": [
            "Increase ventilation and pruning in greenhouse/polyhouse and field canopies.",
            "Reduce relative humidity below 85% by watering early in the morning.",
            "Spray bio-fungicides or certified sulfur-based formulations as per local university recommendations."
        ]
    },
    "Tomato___Yellow_Leaf_Curl_Virus": {
        "crop": "Tomato (టమాటా)",
        "disease": "Tomato Yellow Leaf Curl Virus (ఆకు ముడుత వైరస్ - TYLCV)",
        "is_healthy": False,
        "symptoms": [
            "Severe upward curling and cupping of leaflets.",
            "Marked interveinal yellowing (chlorosis) of young growing leaves.",
            "Stunted bush-like plant growth with aborted flower buds and no fruit setting."
        ],
        "recommended_actions": [
            "Control Whitefly (Bemisia tabaci) insect vector using yellow sticky traps (15–20 traps per acre).",
            "Install 40–50 mesh insect-proof netting in nursery beds and polyhouses.",
            "Eradicate and destroy virus-infected plants immediately to prevent field transmission.",
            "Spray neem seed kernel extract (NSKE 5%) or recommended systemic insecticide on whitefly colonies."
        ]
    },
    "Potato___Early_blight": {
        "crop": "Potato (బంగాళాదుంప)",
        "disease": "Early Blight (ఆకు మాడు తెగులు - Alternaria solani)",
        "is_healthy": False,
        "symptoms": [
            "Brown angular spots with characteristic concentric rings on older potato leaves.",
            "Yellowing of leaf tissue surrounding the spots leading to dry leaf drop.",
            "Sunken dark circular lesions on potato tubers."
        ],
        "recommended_actions": [
            "Ensure adequate nitrogen and potassium fertilization to prevent crop stress.",
            "Destroy potato crop residues and volunteer tubers after harvest.",
            "Apply prophylactic Mancozeb or copper oxychloride spray under agricultural supervision."
        ]
    },
    "Potato___Late_blight": {
        "crop": "Potato (బంగాళాదుంప)",
        "disease": "Late Blight (లేట్ బ్లైట్ తెగులు - Phytophthora infestans)",
        "is_healthy": False,
        "symptoms": [
            "Water-soaked dark brown to purplish lesions on leaf margins and tips.",
            "White mildew growth on lower leaf surfaces during cool, damp weather.",
            "Rapid wilting and rotting of foliage and brown rot inside tubers."
        ],
        "recommended_actions": [
            "Use certified disease-free seed tubers.",
            "Hill up soil around potato plants to protect growing tubers from spore wash-down.",
            "Consult your local KVK or Agriculture Officer for integrated late blight management."
        ]
    },
    "Potato___healthy": {
        "crop": "Potato (బంగాళాదుంప)",
        "disease": "Healthy Crop (ఆరోగ్యకరమైన పంట)",
        "is_healthy": True,
        "symptoms": [
            "Healthy deep-green compound leaves without chlorosis or necrosis.",
            "Strong vegetative stems and uniform vegetative tuber canopy."
        ],
        "recommended_actions": [
            "Maintain regular hilling up and soil moisture balance.",
            "Follow balanced fertilizer schedules per Soil Health Card.",
            "Scout weekly for aphid and beetle activity."
        ]
    },
    "Corn_(maize)___Common_rust": {
        "crop": "Corn / Maize (మొక్కజొన్న)",
        "disease": "Common Rust (తుప్పు తెగులు - Puccinia sorghi)",
        "is_healthy": False,
        "symptoms": [
            "Golden-brown to cinnamon-brown powdery pustules on both upper and lower leaf surfaces.",
            "Pustules rupture the leaf epidermis, releasing powdery reddish rust spores.",
            "Severe infections cause leaf yellowing and premature drying."
        ],
        "recommended_actions": [
            "Plant certified rust-resistant maize hybrid cultivars.",
            "Ensure early sowing to escape peak spore dispersal windows.",
            "Spray recommended protective fungicides if pustules appear before tassel emergence."
        ]
    },
    "Corn_(maize)___healthy": {
        "crop": "Corn / Maize (మొక్కజొన్న)",
        "disease": "Healthy Crop (ఆరోగ్యకరమైన పంట)",
        "is_healthy": True,
        "symptoms": [
            "Broad, smooth, deep green foliage without rust pustules or leaf blights.",
            "Robust stalk development and clean cob formation."
        ],
        "recommended_actions": [
            "Ensure adequate nitrogen top-dressing at knee-high and tasseling stages.",
            "Maintain weed-free field conditions during early vegetative growth."
        ]
    },
    "Pepper__bell___Bacterial_spot": {
        "crop": "Pepper / Chilli (మిరప)",
        "disease": "Bacterial Spot (బాక్టీరియా మచ్చ తెగులు - Xanthomonas campestris)",
        "is_healthy": False,
        "symptoms": [
            "Small water-soaked circular to irregular dark brown spots with pale centers on leaves.",
            "Severe leaf spotting leads to heavy yellowing and premature leaf drop.",
            "Raised rough scab-like spots on chilli pods."
        ],
        "recommended_actions": [
            "Treat seeds with hot water (50°C for 25 min) or certified bio-agent before sowing.",
            "Avoid furrow flood irrigation causing water splash across beds.",
            "Spray Copper Hydroxide combined with Streptocycline as per state agricultural university guidance."
        ]
    },
    "Pepper__bell___healthy": {
        "crop": "Pepper / Chilli (మిరప)",
        "disease": "Healthy Crop (ఆరోగ్యకరమైన పంట)",
        "is_healthy": True,
        "symptoms": [
            "Vibrant green glossy leaves without spots, leaf curls, or yellowing.",
            "Healthy flowering and active fruit set."
        ],
        "recommended_actions": [
            "Maintain preventive spray of neem oil (10,000 ppm) against thrips and mites.",
            "Provide balanced potassium and micronutrient foliar sprays."
        ]
    },
    "Apple___Apple_scab": {
        "crop": "Apple (ఆపిల్)",
        "disease": "Apple Scab (వెంKeychain స్కాబ్ - Venturia inaequalis)",
        "is_healthy": False,
        "symptoms": [
            "Olive-green to dark velvety circular spots on leaves and young fruit.",
            "Infected leaves twist, pucker, and turn yellow before premature drop.",
            "Corky, cracked brown scabs on developing apples."
        ],
        "recommended_actions": [
            "Rake and destroy fallen overwintered leaves in autumn.",
            "Prune tree canopy during dormancy to promote rapid sunlight drying.",
            "Apply protective orchard bio-fungicide sprays at green-tip and petal-fall stages."
        ]
    },
    "Apple___healthy": {
        "crop": "Apple (ఆపిల్)",
        "disease": "Healthy Crop (ఆరోగ్యకరమైన పంట)",
        "is_healthy": True,
        "symptoms": [
            "Uniform green foliage and clean smooth bark without cankers or scab lesions."
        ],
        "recommended_actions": [
            "Maintain orchard sanitation and balanced winter pruning.",
            "Monitor tree vigor and apply organic compost."
        ]
    },
    "Rice___Brown_Spot": {
        "crop": "Rice / Paddy (వరి)",
        "disease": "Brown Spot (గోధుమ మచ్చ తెగులు - Bipolaris oryzae)",
        "is_healthy": False,
        "symptoms": [
            "Oval or cylindrical brown spots with greyish-white centers on leaf blades and sheaths.",
            "Spots coalesce, causing seedling blight and dark discolored grains on panicles."
        ],
        "recommended_actions": [
            "Treat seed with Carbendazim or Trichoderma viride before nursery sowing.",
            "Correct soil potash and zinc deficiency based on Soil Health Card recommendations.",
            "Maintain continuous shallow water depth in the main paddy field."
        ]
    },
    "Rice___healthy": {
        "crop": "Rice / Paddy (వరి)",
        "disease": "Healthy Crop (ఆరోగ్యకరమైన పంట)",
        "is_healthy": True,
        "symptoms": [
            "Lush green tillers with erect, healthy flag leaves without sheath rot or blast spots."
        ],
        "recommended_actions": [
            "Maintain alternate wetting and drying (AWD) water management.",
            "Apply split nitrogen doses aligned with leaf color chart (LCC)."
        ]
    },
    "Cotton___Bacterial_Blight": {
        "crop": "Cotton (పత్తి)",
        "disease": "Bacterial Blight / Angular Leaf Spot (కోణీయ మచ్చ తెగులు - Xanthomonas albilineans)",
        "is_healthy": False,
        "symptoms": [
            "Angular water-soaked spots bounded by leaf veins on the underside of leaves.",
            "Lesions turn dark brown and black ('black arm' symptom on stems).",
            "Premature shedding of young bolls and lint staining."
        ],
        "recommended_actions": [
            "Use certified acid-delinted seeds.",
            "Spray Copper Oxychloride (3g/L) mixed with Streptocycline (100mg/L) at first symptom appearance.",
            "Destroy crop residues after harvest to prevent carryover infection."
        ]
    },
    "Cotton___healthy": {
        "crop": "Cotton (పత్తి)",
        "disease": "Healthy Crop (ఆరోగ్యకరమైన పంట)",
        "is_healthy": True,
        "symptoms": [
            "Healthy broad lobed leaves without vein browning or sucking pest damage.",
            "Vigorous sympodial branching and clean square formation."
        ],
        "recommended_actions": [
            "Install pheromone traps (4 per acre) for pink bollworm monitoring.",
            "Apply balanced fertilizer doses per RBK/Rythu Vedika recommendations."
        ]
    }
}

STANDARD_CLASSES = list(DISEASE_DATABASE.keys())

DEFAULT_DISCLAIMER = (
    "AI crop disease diagnosis is an automated decision-support tool provided for informational guidance. "
    "Always consult your local Agricultural Extension Officer (AEO), Krishi Vigyan Kendra (KVK), or certified agronomist "
    "for field verification before applying chemical treatments."
)
