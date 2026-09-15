"""
AgroMitra Agricultural Recommendations & Guidance Engine
Tailored nutrient, fertilizer, and disease management advice based on:
Predicted Crop + Predicted Condition/Pathology + Confidence.

Strict Agricultural Rules:
1. FERTILIZER IS NOT A CURE FOR PATHOLOGICAL DISEASES.
   - For fungal, bacterial, and viral infections, never recommend fertilizers as a disease control measure.
   - Clearly state that excessive nitrogen promotes tender foliage and worsens infections.
   - Advise maintaining balanced soil fertility and testing via Soil Health Card.
2. DISEASE MANAGEMENT:
   - Separate into cultural/physical practices, biological controls, and registered chemical categories.
   - Advise following manufacturer label instructions, dosage guidelines, and local extension officers.
   - Do NOT invent chemical formulations or unverified dosages.
3. NUTRIENT DEFICIENCY:
   - Provide targeted nutrient guidance only when deficiency is observed.
4. HEALTHY CROPS:
   - Provide standard balanced maintenance crop nutrition.
"""

from typing import Dict, List, Any

def get_crop_and_condition_guidance(cls_name: str, crop: str, condition: str, is_healthy: bool) -> Dict[str, Any]:
    safety_note = (
        "Always read and adhere to manufacturer product label instructions. Wear appropriate personal protective equipment (PPE). "
        "Consult your local Agricultural Extension Officer (AEO), Krishi Vigyan Kendra (KVK), or certified agronomist for field verification and regional advisories."
    )
    
    # 1. Non-Leaf or Unknown
    if "non_leaf" in cls_name.lower() or "unsupported" in cls_name.lower() or crop in ["Unknown", "Non-Leaf Object"]:
        return {
            "explanation": "The image could not be verified as a recognized agricultural crop leaf with sufficient visual characteristics.",
            "fertilizer": [],
            "disease_management": [],
            "prevention": [
                "Ensure the leaf is clearly in focus and fills 70% or more of the camera viewfinder.",
                "Take photographs under natural diffuse daylight without severe shadows, lens glare, or blur."
            ],
            "safety_note": safety_note
        }
    
    # 2. Healthy Crop Leaves
    if is_healthy or "healthy" in cls_name.lower():
        healthy_fertilizer_map: Dict[str, List[str]] = {
            "Tomato": [
                "Maintain standard balanced N-P-K (120:60:60 kg/ha recommended dose) applied in split applications.",
                "Ensure calcium availability during fruit set to prevent blossom end rot.",
                "Incorporate well-decomposed farmyard manure (FYM) or vermicompost at 10-15 tonnes/ha."
            ],
            "Potato": [
                "Apply balanced basal fertilizer (N-P-K 150:100:120 kg/ha) based on Soil Health Card.",
                "Ensure sufficient potassium during tuber bulking stage for tuber quality and storability.",
                "Avoid late nitrogen application which delays maturity and skin setting."
            ],
            "Corn": [
                "Apply nitrogen in splits: 1/3rd at sowing, 1/3rd at knee-high stage (V6), and 1/3rd at tasseling stage (VT).",
                "Maintain balanced zinc nutrition with 25 kg/ha zinc sulfate as basal dose if soil is zinc-deficient."
            ],
            "Rice": [
                "Apply nitrogen in 3 equal splits: basal, active tillering, and panicle initiation stages.",
                "Apply full phosphorus and 50% potassium as basal dose; top-dress remaining potassium at panicle initiation."
            ],
            "Cotton": [
                "Apply balanced N-P-K fertilizer (120:60:60 kg/ha for Bt cotton) in 3-4 split doses coinciding with square and boll development.",
                "Foliar spray of 1% potassium nitrate (13-0-45) or 1% magnesium sulfate at peak boll formation."
            ],
            "Chilli": [
                "Apply N-P-K (150:75:75 kg/ha) with nitrogen applied in split top-dressings at 30, 60, and 90 days after transplanting.",
                "Maintain adequate boron and calcium to prevent flower drop and fruit cracking."
            ],
            "Mango": [
                "Apply annual tree nutrition based on canopy age (1 kg N, 0.5 kg P, 1 kg K per mature tree post-harvest).",
                "Apply zinc and boron foliar sprays during pre-flowering stage for fruit retention."
            ],
            "Apple": [
                "Apply balanced orchard fertilizer in early spring prior to bud break based on leaf tissue analysis.",
                "Maintain adequate calcium sprays during fruit development for cell wall integrity."
            ],
            "Grape": [
                "Apply post-pruning balanced nutrition with organic compost and split N-P-K based on pruning schedule.",
                "Ensure magnesium and micronutrient balance to maintain photosynthetic efficiency."
            ],
            "Citrus": [
                "Apply balanced annual fertilizer split into 3 applications (pre-bloom, fruit set, post-monsoon).",
                "Foliar spray of zinc sulfate (0.5%) + manganese sulfate (0.2%) to maintain vibrant dark green leaves."
            ],
            "Banana": [
                "Apply frequent small doses of nitrogen and potassium through fertigation (200g N, 60g P, 300g K per plant over crop cycle).",
                "Avoid waterlogging and maintain mulch around the pseudostem."
            ],
            "Neem": [
                "Neem is a hardy tree requiring minimal fertilization; organic compost around root zone promotes vigorous growth."
            ],
            "Soybean": [
                "Inoculate seeds with Rhizobium japonicum culture for natural biological nitrogen fixation.",
                "Apply basal phosphorus (60 kg P2O5/ha) and potassium to support nodule development."
            ],
            "Peach": [
                "Apply balanced orchard fertilizer in late winter; avoid late-summer nitrogen which reduces winter hardiness."
            ],
            "Strawberry": [
                "Apply balanced fertigation (N-K ratio 1:1.5) during flowering and fruiting.",
                "Avoid high nitrogen which softens fruit and increases susceptibility to gray mold."
            ],
            "Cherry": [
                "Apply balanced spring fertilizer based on soil test; maintain orchard mulch."
            ],
            "Blueberry": [
                "Maintain acidifying fertilizer (ammonium sulfate) and maintain soil pH between 4.5 and 5.2."
            ],
            "Raspberry": [
                "Apply balanced organic compost and nitrogen in early spring as new canes emerge."
            ],
        }
        
        crop_fert = healthy_fertilizer_map.get(crop, [
            "Maintain balanced soil nutrition according to your local Soil Health Card recommendations.",
            "Apply well-rotted organic manure to improve soil moisture retention and microbial activity."
        ])
        
        return {
            "explanation": f"The scanned leaf displays uniform color, healthy cellular morphology, and no visible lesions, spots, or pest vectors. The {crop} plant appears in good vegetative condition.",
            "fertilizer": crop_fert,
            "disease_management": [
                "No disease control measures or chemical treatments are required for this healthy specimen.",
                "Continue routine weekly field scouting and monitor for early signs of foliar pests or weather-induced stress."
            ],
            "prevention": [
                "Maintain standard field sanitation and remove fallen plant debris.",
                "Follow recommended plant spacing to ensure adequate sunlight penetration and airflow.",
                "Inspect irrigation lines regularly to prevent water stagnation in the field."
            ],
            "safety_note": safety_note
        }
    
    # 2b. Physiological Nutrient Deficiency or Chlorosis
    is_deficiency = "deficiency" in cls_name.lower() or "deficiency" in condition.lower() or "chlorosis" in cls_name.lower() or "nutrient" in condition.lower()
    if is_deficiency:
        deficiency_fert_map: Dict[str, List[str]] = {
            "Tomato": [
                "Nitrogen Deficiency: Apply urea or calcium nitrate as side-dressing (25-30 kg N/ha) followed by light irrigation.",
                "Iron/Zinc Chlorosis: Foliar spray of chelated zinc (Zn-EDTA 1g/L) or ferrous sulfate (FeSO4 2g/L + citric acid 0.5g/L).",
                "Calcium Deficiency (Blossom End Rot prevention): Foliar application of calcium chloride (5g/L) or calcium nitrate (5g/L) at 10-day intervals."
            ],
            "Rice": [
                "Zinc Deficiency (Khaira Disease): Spray zinc sulfate (5 kg/ha + 2.5 kg slaked lime in 500L water) 2-3 weeks after transplanting.",
                "Nitrogen Deficiency: Top-dress urea (30 kg N/ha) at active tillering.",
                "Iron Chlorosis (in upland/calcareous soils): Foliar spray of 1% ferrous sulfate solution twice at weekly intervals."
            ],
            "Chilli": [
                "Magnesium Deficiency (Interveinal Chlorosis): Foliar spray of magnesium sulfate (MgSO4 10g/L).",
                "Boron Deficiency: Foliar application of solubor/borax (1-1.5g/L) to prevent flower drop and fruit cracking.",
                "Nitrogen Deficiency: Top-dress balanced N-P-K (20-20-20 at 5g/L) through fertigation."
            ],
            "Mango": [
                "Micronutrient Deficiency (Little Leaf / Yellowing): Foliar spray of zinc sulfate (0.5%) + copper sulfate (0.2%) during new flush.",
                "Boron Deficiency: Soil application of borax (100-250g per mature tree) before flowering.",
                "Potassium Deficiency: Soil application of sulfate of potash (SOP) at 500g per tree."
            ],
            "Grape": [
                "Iron Chlorosis: Soil drench with Fe-EDDHA (20-30g per vine) or foliar spray of chelated iron.",
                "Magnesium Deficiency: Foliar spray of magnesium sulfate (MgSO4 5g/L) during active shoot growth.",
                "Zinc Deficiency: Spray zinc sulfate (0.2%) two weeks before bloom."
            ],
            "Cotton": [
                "Magnesium Deficiency (Reddening of Leaves): Foliar spray of 1% magnesium sulfate + 1% urea at 60 and 75 DAS.",
                "Potassium Deficiency (Marginal Scorch): Foliar spray of 1% potassium nitrate (13-0-45) at peak flowering and boll formation.",
                "Zinc Deficiency: Soil application of 25 kg/ha zinc sulfate as basal dose."
            ],
            "Corn": [
                "Zinc Deficiency (White Bud): Soil application of zinc sulfate (25 kg/ha) or foliar spray of 0.5% ZnSO4.",
                "Nitrogen Deficiency (V-shaped Yellowing): Top-dress urea (40 kg N/ha) at knee-high stage."
            ],
            "Potato": [
                "Potassium Deficiency (Bronzing / Marginal Necrosis): Top-dress potassium sulfate (SOP) before tuber bulking.",
                "Magnesium Deficiency: Foliar spray of 1% magnesium sulfate solution."
            ]
        }
        rec_fert = deficiency_fert_map.get(crop, [
            f"Apply soil or foliar micronutrient mixtures tailored to {crop} based on Soil Health Card analysis.",
            "Correct soil pH if acidic or alkaline to unlock locked-up soil nutrients."
        ])
        return {
            "explanation": f"The leaf shows characteristic foliar symptoms of physiological nutrient deficiency or chlorosis on {crop}. Leaf veins and interveinal margins display nutrient stress rather than infectious pathogen lesions.",
            "fertilizer": rec_fert,
            "disease_management": [
                "Nutrient correction through foliar sprays or targeted soil application is the primary treatment for physiological deficiencies.",
                "Chemical fungicides and bactericides are NOT required as this condition is caused by nutrient starvation, not a pathogen."
            ],
            "prevention": [
                "Conduct annual soil testing (Soil Health Card) to determine baseline macro- and micronutrient reserves.",
                "Apply organic manure and maintain balanced irrigation to facilitate nutrient uptake by root hairs."
            ],
            "safety_note": safety_note
        }
    
    # 3. Diseased Crop Foliage
    # Universal rule: Fertilizer is NOT a disease control chemical!
    fertilizer_warning = [
        "Important: Commercial fertilizers do not cure or control fungal, bacterial, or viral plant diseases.",
        "Avoid excessive nitrogen applications, which cause soft, succulent vegetative growth that accelerates pathogen spread.",
        "Maintain adequate potassium and calcium levels to reinforce cell wall resistance against enzymatic pathogen entry."
    ]
    
    # Disease-specific database
    db_disease: Dict[str, Dict[str, Any]] = {
        # --- TOMATO ---
        "Tomato___Early_blight": {
            "explanation": "Concentric target-like dark brown circular spots surrounded by yellow chlorotic halos, caused by Alternaria solani on mature foliage.",
            "disease_management": [
                "Cultural: Prune severely affected lower leaves and safely dispose of them outside the crop area.",
                "Cultural: Water plants at the base using drip irrigation; avoid overhead sprinklers that keep leaves wet.",
                "Chemical Category: Contact protective fungicides (such as Copper Oxychloride or Mancozeb) applied in accordance with official package label instructions and safety intervals.",
                "Biological: Preventive applications of Trichoderma harzianum or Bacillus subtilis bio-fungicide formulations."
            ],
            "prevention": [
                "Practice a minimum 2-year crop rotation with non-solanaceous crops (avoid potato, brinjal, chilli).",
                "Apply organic straw mulch around the base of plants to prevent soil-borne fungal spores from splashing onto lower leaves."
            ]
        },
        "Tomato___Late_blight": {
            "explanation": "Rapidly expanding water-soaked dark lesions on leaf tips and margins with whitish fungal sporulation underneath during cool, humid weather (Phytophthora infestans).",
            "disease_management": [
                "Cultural: Immediately rogue out and destroy severely diseased plants to eliminate massive spore production.",
                "Cultural: Maximize canopy airflow by staking plants and thinning dense inner sucker branches.",
                "Chemical Category: Systemic protective fungicide formulations (such as Cymoxanil + Mancozeb, Metalaxyl, or Dimethomorph) used under licensed agricultural guidance adhering strictly to label pre-harvest intervals (PHI)."
            ],
            "prevention": [
                "Do not plant tomatoes immediately adjacent to or following potato crops.",
                "Use certified disease-tolerant seedlings and eliminate volunteer nightshade weeds around borders."
            ]
        },
        "Tomato___Leaf_Mold": {
            "explanation": "Pale green to bright yellow spots on upper leaf surfaces accompanied by olive-green to grayish velvety fungal mold on the lower surface (Passalora fulva).",
            "disease_management": [
                "Cultural: Reduce relative humidity below 85% by opening greenhouse side vents or widening row spacing in the field.",
                "Cultural: Avoid wetting the foliage during irrigation.",
                "Chemical Category: Copper-based protective fungicides applied to ensure thorough coverage of lower leaf surfaces."
            ],
            "prevention": [
                "Select resistant tomato cultivars with known resistance genes against Passalora fulva.",
                "Disinfect greenhouse trellises, stakes, and clip materials between cropping cycles."
            ]
        },
        "Tomato___Yellow_Leaf_Curl_Virus": {
            "explanation": "Severe upward leaf curling, cupping, yellow interveinal chlorosis, and stunted bushy plant habit caused by TYLCV, transmitted by the whitefly vector (Bemisia tabaci).",
            "disease_management": [
                "Vector Control: Install yellow sticky traps (15-20 traps per acre) throughout the field to monitor and trap whiteflies.",
                "Biological/Botanical: Spray Neem seed kernel extract (NSKE 5%) or certified cold-pressed Neem Oil (1500 ppm) to deter feeding.",
                "Cultural: Promptly uproot and bury plants showing early viral symptoms to prevent insect vectors from acquiring and transmitting virus to healthy plants.",
                "Chemical Category: Approved systemic insecticide sprays directed at whitefly nymphs on leaf undersides, rotating chemical classes to prevent resistance."
            ],
            "prevention": [
                "Use 40-50 mesh insect-proof netting in nursery seedling raising areas.",
                "Plant virus-resistant hybrid varieties suited for your agro-climatic zone."
            ]
        },
        "Tomato___Bacterial_spot": {
            "explanation": "Small, water-soaked dark brown spots that turn angular, greasy, and necrotic, caused by Xanthomonas species.",
            "disease_management": [
                "Cultural: Never work in or harvest tomato fields while plants are wet from dew or rain to prevent mechanical bacterium transfer.",
                "Chemical Category: Copper hydroxide or Copper oxychloride combined with agricultural bactericides as permitted under local agricultural extension recommendations."
            ],
            "prevention": [
                "Use certified hot-water treated disease-free seeds.",
                "Sanitize stakes, pruning shears, and crates with 10% sodium hypochlorite solution."
            ]
        },
        "Tomato___Septoria_leaf_spot": {
            "explanation": "Numerous small circular spots with dark brown margins and sunken gray-tan centers dotted with tiny black fruiting bodies (pycnidia).",
            "disease_management": [
                "Cultural: Strip off infected lower foliage; keep soil covered with straw mulch.",
                "Chemical Category: Protective contact fungicides (Mancozeb, Chlorothalonil) applied early before infection reaches the upper canopy."
            ],
            "prevention": [
                "Clean up and compost or bury crop residues immediately following final harvest.",
                "Provide wide row spacing (at least 60-75 cm between plants) for rapid drying."
            ]
        },
        "Tomato___Spider_mites": {
            "explanation": "Fine stippling, chlorotic flecking on upper leaf surfaces, and delicate webbing on lower leaf surfaces caused by Two-spotted spider mites (Tetranychus urticae).",
            "disease_management": [
                "Cultural: Spray undersides of leaves with strong streams of water to dislodge mites and disrupt web microclimate.",
                "Biological: Release predatory mites (Phytoseiulus persimilis) or apply insecticidal soaps / botanical oils.",
                "Chemical Category: Dedicated acaricides/miticides applied strictly per package label instructions."
            ],
            "prevention": [
                "Avoid excessive dust along field boundaries; keep perimeter roads watered.",
                "Avoid broad-spectrum synthetic pyrethroids that destroy natural predatory insect populations."
            ]
        },
        "Tomato___Target_Spot": {
            "explanation": "Dark brown circular necrotic lesions with pronounced concentric rings resembling targets, caused by Corynespora cassiicola.",
            "disease_management": [
                "Cultural: Improve canopy ventilation through trellising and suckering.",
                "Chemical Category: Broad-spectrum protective fungicides (Azoxystrobin or Mancozeb) following official dosage."
            ],
            "prevention": [
                "Rotate with non-host crops and avoid continuous solanaceous cultivation."
            ]
        },
        "Tomato___Mosaic_virus": {
            "explanation": "Mottled light and dark green mosaic patterns on leaves, fern-like leaf distortion, and stunted fruit development caused by Tomato Mosaic Virus (ToMV).",
            "disease_management": [
                "Cultural: Wash hands with soap and water and dip pruning tools in non-fat dry milk solution (20%) before handling plants.",
                "Cultural: Immediately remove and safely destroy symptomatic infected plants."
            ],
            "prevention": [
                "Workers should not use tobacco products near tomato crops due to mechanical virus transfer.",
                "Sow certified virus-tested seed stock."
            ]
        },

        # --- POTATO ---
        "Potato___Early_blight": {
            "explanation": "Angular target-like brown spots with concentric rings primarily appearing on mature lower leaflets (Alternaria solani).",
            "disease_management": [
                "Cultural: Maintain optimal irrigation schedule to prevent drought stress, which predisposes plants to early blight.",
                "Chemical Category: Protective contact fungicides (Mancozeb or Chlorothalonil) applied before canopy closure."
            ],
            "prevention": [
                "Rotate fields for at least 3 years away from potato and tomato crops.",
                "Ensure proper hilling-up of soil to protect growing tubers from spore wash-in."
            ]
        },
        "Potato___Late_blight": {
            "explanation": "Water-soaked irregular blackish-brown lesions spreading rapidly in humid weather with white sporulation on leaf margins (Phytophthora infestans).",
            "disease_management": [
                "Cultural: Destroy cull piles and infected volunteer potato plants within 500 meters of the field.",
                "Chemical Category: Apply registered protective/systemic fungicides (such as Dimethomorph, Cymoxanil, or Metalaxyl) following regional disease forecasting alerts and label intervals."
            ],
            "prevention": [
                "Plant certified disease-free seed tubers with certified seed passports.",
                "Kill haulms (vines) at least 14 days before harvest to prevent tuber contamination during lifting."
            ]
        },

        # --- CORN / MAIZE ---
        "Corn___Common_rust": {
            "explanation": "Cinnamon-brown to reddish-orange powdery pustules (uredinia) bursting through both leaf surfaces, caused by Puccinia sorghi.",
            "disease_management": [
                "Cultural: Inspect plants weekly before tasseling stage (VT). If rust pustules are widespread before tasseling, management is recommended.",
                "Chemical Category: Registered foliar fungicides (such as Propiconazole or Azoxystrobin) applied strictly adhering to label instructions and harvest safety intervals."
            ],
            "prevention": [
                "Plant certified rust-resistant or tolerant corn hybrids suitable for your district.",
                "Plant early in the season to avoid late-season spore showers from southern regions."
            ]
        },
        "Corn___Northern_Leaf_Blight": {
            "explanation": "Long, elliptical grayish-green or tan cigar-shaped lesions (2.5 to 15 cm long) on corn foliage caused by Exserohilum turcicum.",
            "disease_management": [
                "Cultural: Deep plow and bury infected corn crop stubble post-harvest to speed up residue decomposition.",
                "Chemical Category: Foliar fungicides applied between pre-tassel and silking stages if disease severity exceeds threshold on the ear leaf."
            ],
            "prevention": [
                "Select hybrids containing resistant Ht genes.",
                "Rotate with non-grass crops such as soybean, groundnut, or pulses."
            ]
        },

        # --- CHILLI / PEPPER ---
        "Chilli___Bacterial_spot": {
            "explanation": "Small, dark, circular to irregular water-soaked spots with yellow halos on chilli leaves and fruit, caused by Xanthomonas campestris pv. vesicatoria.",
            "disease_management": [
                "Cultural: Avoid overhead sprinkler irrigation; water through furrows or drip lines.",
                "Chemical Category: Protective Copper Oxychloride (2.5g/L) combined with authorized agricultural bactericides applied according to local agricultural department advice."
            ],
            "prevention": [
                "Disinfect seeds prior to sowing with certified seed-treatment protocols.",
                "Remove and burn plant residues following harvest."
            ]
        },

        # --- RICE ---
        "Rice___Brown_Spot": {
            "explanation": "Oval to circular brown lesions with distinct yellow halos scattered over paddy leaf blades, caused by Bipolaris oryzae.",
            "disease_management": [
                "Soil Nutrition Check: Brown spot is heavily associated with nutrient-deficient or water-stressed soils; correct potassium and micronutrient imbalances.",
                "Chemical Category: Apply registered protective fungicides (such as Propiconazole or Tricyclazole) at panicle emergence if severe."
            ],
            "prevention": [
                "Treat paddy seeds with Trichoderma viride or approved fungicide before sowing.",
                "Maintain optimal standing water depth in fields to avoid water stress."
            ]
        },
        "Rice___Bacterial_Blight": {
            "explanation": "Linear water-soaked stripes along leaf margins enlarging into yellow-orange wavy necrotic lesions with bacterial ooze beads (Xanthomonas oryzae pv. oryzae).",
            "disease_management": [
                "Cultural: Immediately drain excess standing water from the field for 2-3 days to halt bacterial multiplication.",
                "Cultural: Cease any top-dressing of nitrogen fertilizer immediately.",
                "Chemical Category: Spray Copper Oxychloride (2.5g/L) or approved bactericide formulation under local extension guidance."
            ],
            "prevention": [
                "Plant resistant varieties recommended by your regional agricultural university.",
                "Avoid clipping seedling leaf tips during transplantation."
            ]
        },

        # --- MANGO ---
        "Mango___Anthracnose": {
            "explanation": "Irregular dark brown to black necrotic spots coalescing into leaf blight, shoot dieback, and blossom blight (Colletotrichum gloeosporioides).",
            "disease_management": [
                "Cultural: Prune dead twigs and congested inner branches during post-harvest cleanup to improve canopy aeration.",
                "Chemical Category: Apply protective Copper Oxychloride (3g/L) or Carbendazim (1g/L) sprays timed during new leaf flush and pre-flowering stages."
            ],
            "prevention": [
                "Collect and burn fallen infected leaves and mummified fruits from orchard floor.",
                "Maintain tree sanitation and paint pruning cuts with Bordeaux paste."
            ]
        },

        # --- APPLE ---
        "Apple___Apple_scab": {
            "explanation": "Velvety olive-green to dark brownish-black circular spots on leaves and fruit skin, caused by Venturia inaequalis.",
            "disease_management": [
                "Cultural: Rake and shred fallen apple leaves in autumn to disrupt overwintering pseudothecia.",
                "Chemical Category: Apply protective fungicides (Captan, Mancozeb) or systemic sterol-inhibitors during green-tip through petal-fall stages based on scab warning models."
            ],
            "prevention": [
                "Plant scab-resistant apple cultivars.",
                "Prune orchard canopies to encourage rapid leaf drying within 4-6 hours after rainfall."
            ]
        },
        "Apple___Black_rot": {
            "explanation": "Frogeye leaf spots with purple margins and brown centers, and cankers on branches (Diplocarpon coronaria / Botryosphaeria obtusa).",
            "disease_management": [
                "Cultural: Prune out dead wood, fire blight strikes, and mummified apples clinging to branches.",
                "Chemical Category: Standard protective orchard fungicide program (Captan or Mancozeb)."
            ],
            "prevention": [
                "Paint pruning wounds and eliminate wild bramble bushes surrounding orchard."
            ]
        },

        # --- GRAPE ---
        "Grape___Black_rot": {
            "explanation": "Small circular reddish-brown spots with dark margins and tiny black pycnidia rings on vine leaves and mummified black berries (Guignardia bidwellii).",
            "disease_management": [
                "Cultural: Remove and bury all mummified grape clusters and diseased canes during winter pruning.",
                "Chemical Category: Apply registered protective fungicides from bud break through veraison stage per regional spray schedules."
            ],
            "prevention": [
                "Trellis vines properly to maximize sun exposure and wind circulation through the fruiting zone."
            ]
        },
        "Grape___Esca": {
            "explanation": "Tiger-stripe interveinal chlorosis and necrosis on mature vine leaves caused by complex fungal trunk pathogens (Phaeomoniella / Fomitiporia).",
            "disease_management": [
                "Cultural: Mark infected vines in summer; prune them last in winter to avoid spreading spores to healthy vines.",
                "Cultural: Disinfect pruning shears with 70% alcohol or 10% bleach between vines."
            ],
            "prevention": [
                "Protect large pruning wounds immediately with wound-sealing pruning paint."
            ]
        },

        # --- CITRUS ---
        "Citrus___Citrus_canker": {
            "explanation": "Raised, corky, brownish-tan volcanic pustules surrounded by distinct oily yellow halos on leaves, twigs, and fruit (Xanthomonas axonopodis pv. citri).",
            "disease_management": [
                "Cultural: Prune and burn cankered twigs before the monsoon onset.",
                "Cultural: Erect windbreak trees around the orchard to reduce wind-driven rain splashes that spread bacteria.",
                "Chemical Category: Apply Copper Oxychloride (3g/L) combined with Streptocycline (100mg/L) at flushing stages."
            ],
            "prevention": [
                "Control the Asian citrus leafminer (Phyllocnistis citrella), as leafminer feeding galleries provide entry wounds for canker bacteria."
            ]
        },
        "Citrus___Citrus_greening": {
            "explanation": "Asymmetric blotchy mottle chlorosis across leaf veins, upright small leaves, and twig dieback caused by Candidatus Liberibacter asiaticus (Huanglongbing / HLB).",
            "disease_management": [
                "Vector Control: Control the Asian citrus psyllid (Diaphorina citri) vector using yellow sticky traps and authorized systemic insecticide rotations.",
                "Cultural: Strictly rogue out and destroy confirmed HLB-infected trees to protect the rest of the grove."
            ],
            "prevention": [
                "Source nursery budwood exclusively from certified disease-free foundation blocks."
            ]
        },

        # --- COTTON ---
        "Cotton___Bacterial_Blight": {
            "explanation": "Angular dark brown water-soaked leaf spots constrained by leaf veinlets, black arm stem lesions, and boll rot (Xanthomonas citri pv. malvacearum).",
            "disease_management": [
                "Chemical Category: Spray Copper Oxychloride (2.5g/L) + Streptocycline (100 ppm) upon appearance of initial angular lesions."
            ],
            "prevention": [
                "Acid-delint cotton seeds before sowing to eradicate seed-coat bacterial populations.",
                "Avoid furrow flooding that submerges lower vegetative branches."
            ]
        },

        # --- BANANA ---
        "Banana___Black_Sigatoka": {
            "explanation": "Dark reddish-brown to black narrow streaks running parallel to leaf veins that expand into widespread foliar burning (Pseudocercospora fijiensis).",
            "disease_management": [
                "Cultural: Regularly de-leaf severely infected leaves and drop them face-down on the ground to reduce ascospore release.",
                "Chemical Category: Apply systemic and protectant fungicide sprays (such as Propiconazole or Azoxystrobin) formulated with agricultural mineral oil."
            ],
            "prevention": [
                "Ensure effective drainage channels to prevent humid water-saturated root zones."
            ]
        },

        # --- PEACH ---
        "Peach___Bacterial_spot": {
            "explanation": "Small angular purple-brown spots on leaf blades that drop out leaving a shot-hole appearance (Xanthomonas arboricola pv. pruni).",
            "disease_management": [
                "Chemical Category: Apply dormant copper sprays in late autumn and spring up to bloom."
            ],
            "prevention": [
                "Select resistant stone fruit cultivars suited to your region."
            ]
        },

        # --- STRAWBERRY ---
        "Strawberry___Leaf_scorch": {
            "explanation": "Irregular purplish-red blotches that coalesce causing leaf edges to brown and curl upward like scorched tissue (Diplocarpon earlianum).",
            "disease_management": [
                "Cultural: Remove and burn old infected strawberry foliage after harvest.",
                "Chemical Category: Protective Copper or Captan sprays applied during early spring flush."
            ],
            "prevention": [
                "Plant on raised plastic-mulched beds with drip irrigation."
            ]
        },

        # --- CHERRY ---
        "Cherry___Powdery_mildew": {
            "explanation": "White superficial powdery fungal patches causing leaf distortion, cupping, and shoot dwarfing (Podosphaera clandestina).",
            "disease_management": [
                "Chemical Category: Apply wettable sulfur or registered systemic triazole fungicides starting from shuck fall."
            ],
            "prevention": [
                "Prune dense interior shoots to improve light penetration."
            ]
        },

        # --- NEEM ---
        "Neem___leaf_spot_blight": {
            "explanation": "Brown necrotic foliar spots and twig blight under prolonged humid monsoon conditions (Pseudocercospora / Colletotrichum).",
            "disease_management": [
                "Cultural: Rake fallen infected neem leaves; thin tree canopy to increase airflow.",
                "Chemical Category: Copper oxychloride (3g/L) protective spray if young nursery seedlings are affected."
            ],
            "prevention": [
                "Ensure nursery beds are not over-shaded or waterlogged."
            ]
        },
    }

    # Retrieve specific entry or fallback to generic pathology advice
    entry = db_disease.get(cls_name)
    if not entry:
        explanation = f"Foliar symptoms consistent with {condition} observed on {crop} specimen."
        disease_mgmt = [
            "Cultural: Remove and isolate severely affected leaf foliage to prevent pathogen spread.",
            "Cultural: Improve canopy ventilation and avoid overhead irrigation.",
            "Consult your local agricultural extension service for regionally registered crop-protection products."
        ]
        prevention = [
            "Maintain balanced crop nutrition and field sanitation.",
            "Practice regular crop rotation with non-host crops."
        ]
    else:
        explanation = entry["explanation"]
        disease_mgmt = entry["disease_management"]
        prevention = entry["prevention"]

    return {
        "explanation": explanation,
        "fertilizer": fertilizer_warning,
        "disease_management": disease_mgmt,
        "prevention": prevention,
        "safety_note": safety_note
    }
