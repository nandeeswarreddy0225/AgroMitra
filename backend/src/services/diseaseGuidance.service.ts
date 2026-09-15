/**
 * AgroMitra Agricultural Recommendations & Guidance Engine (Node.js Backend)
 * Tailored nutrient, fertilizer, and disease management advice based on:
 * Predicted Crop + Predicted Condition/Pathology + Confidence.
 *
 * Strict Agricultural Rules:
 * 1. FERTILIZER IS NOT A CURE FOR PATHOLOGICAL DISEASES.
 *    - For fungal, bacterial, and viral infections, never recommend fertilizers as a disease control measure.
 *    - Clearly state that excessive nitrogen promotes tender foliage and worsens infections.
 *    - Advise maintaining balanced soil fertility and testing via Soil Health Card.
 * 2. DISEASE MANAGEMENT:
 *    - Separate into cultural/physical practices, biological controls, and registered chemical categories.
 *    - Advise following manufacturer label instructions, dosage guidelines, and local extension officers.
 *    - Do NOT invent chemical formulations or unverified dosages.
 * 3. NUTRIENT DEFICIENCY:
 *    - Provide targeted nutrient guidance only when deficiency is observed.
 * 4. HEALTHY CROPS:
 *    - Provide standard balanced maintenance crop nutrition.
 */

export interface StructuredRecommendation {
  explanation: string;
  fertilizer: string[];
  disease_management: string[];
  prevention: string[];
  safety_note?: string;
}

export const DEFAULT_SAFETY_NOTE =
  'Always read and adhere to manufacturer product label instructions. Wear appropriate personal protective equipment (PPE). ' +
  'Consult your local Agricultural Extension Officer (AEO), Krishi Vigyan Kendra (KVK), or certified agronomist for field verification and regional advisories.';

export function getCropAndConditionGuidance(
  clsName: string,
  crop: string,
  condition: string,
  isHealthy: boolean
): StructuredRecommendation {
  // 1. Non-Leaf or Unknown
  if (
    clsName.toLowerCase().includes('non_leaf') ||
    clsName.toLowerCase().includes('unsupported') ||
    ['Unknown', 'Non-Leaf Object'].includes(crop)
  ) {
    return {
      explanation: 'The image could not be verified as a recognized agricultural crop leaf with sufficient visual characteristics.',
      fertilizer: [],
      disease_management: [],
      prevention: [
        'Ensure the leaf is clearly in focus and fills 70% or more of the camera viewfinder.',
        'Take photographs under natural diffuse daylight without severe shadows, lens glare, or blur.',
      ],
      safety_note: DEFAULT_SAFETY_NOTE,
    };
  }

  // 2. Healthy Crop Leaves
  if (isHealthy || clsName.toLowerCase().includes('healthy')) {
    const healthyFertilizerMap: Record<string, string[]> = {
      Tomato: [
        'Maintain standard balanced N-P-K (120:60:60 kg/ha recommended dose) applied in split applications.',
        'Ensure calcium availability during fruit set to prevent blossom end rot.',
        'Incorporate well-decomposed farmyard manure (FYM) or vermicompost at 10-15 tonnes/ha.',
      ],
      Potato: [
        'Apply balanced basal fertilizer (N-P-K 150:100:120 kg/ha) based on Soil Health Card.',
        'Ensure sufficient potassium during tuber bulking stage for tuber quality and storability.',
        'Avoid late nitrogen application which delays maturity and skin setting.',
      ],
      Corn: [
        'Apply nitrogen in splits: 1/3rd at sowing, 1/3rd at knee-high stage (V6), and 1/3rd at tasseling stage (VT).',
        'Maintain balanced zinc nutrition with 25 kg/ha zinc sulfate as basal dose if soil is zinc-deficient.',
      ],
      Rice: [
        'Apply nitrogen in 3 equal splits: basal, active tillering, and panicle initiation stages.',
        'Apply full phosphorus and 50% potassium as basal dose; top-dress remaining potassium at panicle initiation.',
      ],
      Cotton: [
        'Apply balanced N-P-K fertilizer (120:60:60 kg/ha for Bt cotton) in 3-4 split doses coinciding with square and boll development.',
        'Foliar spray of 1% potassium nitrate (13-0-45) or 1% magnesium sulfate at peak boll formation.',
      ],
      Chilli: [
        'Apply N-P-K (150:75:75 kg/ha) with nitrogen applied in split top-dressings at 30, 60, and 90 days after transplanting.',
        'Maintain adequate boron and calcium to prevent flower drop and fruit cracking.',
      ],
      Mango: [
        'Apply annual tree nutrition based on canopy age (1 kg N, 0.5 kg P, 1 kg K per mature tree post-harvest).',
        'Apply zinc and boron foliar sprays during pre-flowering stage for fruit retention.',
      ],
      Apple: [
        'Apply balanced orchard fertilizer in early spring prior to bud break based on leaf tissue analysis.',
        'Maintain adequate calcium sprays during fruit development for cell wall integrity.',
      ],
      Grape: [
        'Apply post-pruning balanced nutrition with organic compost and split N-P-K based on pruning schedule.',
        'Ensure magnesium and micronutrient balance to maintain photosynthetic efficiency.',
      ],
      Citrus: [
        'Apply balanced annual fertilizer split into 3 applications (pre-bloom, fruit set, post-monsoon).',
        'Foliar spray of zinc sulfate (0.5%) + manganese sulfate (0.2%) to maintain vibrant dark green leaves.',
      ],
      Banana: [
        'Apply frequent small doses of nitrogen and potassium through fertigation (200g N, 60g P, 300g K per plant over crop cycle).',
        'Avoid waterlogging and maintain mulch around the pseudostem.',
      ],
      Neem: [
        'Neem is a hardy tree requiring minimal fertilization; organic compost around root zone promotes vigorous growth.',
      ],
      Soybean: [
        'Inoculate seeds with Rhizobium japonicum culture for natural biological nitrogen fixation.',
        'Apply basal phosphorus (60 kg P2O5/ha) and potassium to support nodule development.',
      ],
    };

    const cropFert = healthyFertilizerMap[crop] || [
      'Maintain balanced soil nutrition according to your local Soil Health Card recommendations.',
      'Apply well-rotted organic manure to improve soil moisture retention and microbial activity.',
    ];

    return {
      explanation: `The scanned leaf displays uniform color, healthy cellular morphology, and no visible lesions, spots, or pest vectors. The ${crop} plant appears in good vegetative condition.`,
      fertilizer: cropFert,
      disease_management: [
        'No disease control measures or chemical treatments are required for this healthy specimen.',
        'Continue routine weekly field scouting and monitor for early signs of foliar pests or weather-induced stress.',
      ],
      prevention: [
        'Maintain standard field sanitation and remove fallen plant debris.',
        'Follow recommended plant spacing to ensure adequate sunlight penetration and airflow.',
        'Inspect irrigation lines regularly to prevent water stagnation in the field.',
      ],
      safety_note: DEFAULT_SAFETY_NOTE,
    };
  }

  // 3. Diseased Crop Foliage
  const fertilizerWarning = [
    'Important: Commercial fertilizers do not cure or control fungal, bacterial, or viral plant diseases.',
    'Avoid excessive nitrogen applications, which cause soft, succulent vegetative growth that accelerates pathogen spread.',
    'Maintain adequate potassium and calcium levels to reinforce cell wall resistance against enzymatic pathogen entry.',
  ];

  const dbDisease: Record<string, { explanation: string; disease_management: string[]; prevention: string[] }> = {
    'Tomato___Early_blight': {
      explanation: 'Concentric target-like dark brown circular spots surrounded by yellow chlorotic halos, caused by Alternaria solani on mature foliage.',
      disease_management: [
        'Cultural: Prune severely affected lower leaves and safely dispose of them outside the crop area.',
        'Cultural: Water plants at the base using drip irrigation; avoid overhead sprinklers that keep leaves wet.',
        'Chemical Category: Contact protective fungicides (such as Copper Oxychloride or Mancozeb) applied in accordance with official package label instructions and safety intervals.',
        'Biological: Preventive applications of Trichoderma harzianum or Bacillus subtilis bio-fungicide formulations.',
      ],
      prevention: [
        'Practice a minimum 2-year crop rotation with non-solanaceous crops (avoid potato, brinjal, chilli).',
        'Apply organic straw mulch around the base of plants to prevent soil-borne fungal spores from splashing onto lower leaves.',
      ],
    },
    'Tomato___Late_blight': {
      explanation: 'Rapidly expanding water-soaked dark lesions on leaf tips and margins with whitish fungal sporulation underneath during cool, humid weather (Phytophthora infestans).',
      disease_management: [
        'Cultural: Immediately rogue out and destroy severely diseased plants to eliminate massive spore production.',
        'Cultural: Maximize canopy airflow by staking plants and thinning dense inner sucker branches.',
        'Chemical Category: Systemic protective fungicide formulations (such as Cymoxanil + Mancozeb, Metalaxyl, or Dimethomorph) used under licensed agricultural guidance adhering strictly to label pre-harvest intervals (PHI).',
      ],
      prevention: [
        'Do not plant tomatoes immediately adjacent to or following potato crops.',
        'Use certified disease-tolerant seedlings and eliminate volunteer nightshade weeds around borders.',
      ],
    },
    'Tomato___Leaf_Mold': {
      explanation: 'Pale green to bright yellow spots on upper leaf surfaces accompanied by olive-green to grayish velvety fungal mold on the lower surface (Passalora fulva).',
      disease_management: [
        'Cultural: Reduce relative humidity below 85% by opening greenhouse side vents or widening row spacing in the field.',
        'Cultural: Avoid wetting the foliage during irrigation.',
        'Chemical Category: Copper-based protective fungicides applied to ensure thorough coverage of lower leaf surfaces.',
      ],
      prevention: [
        'Select resistant tomato cultivars with known resistance genes against Passalora fulva.',
        'Disinfect greenhouse trellises, stakes, and clip materials between cropping cycles.',
      ],
    },
    'Tomato___Yellow_Leaf_Curl_Virus': {
      explanation: 'Severe upward leaf curling, cupping, yellow interveinal chlorosis, and stunted bushy plant habit caused by TYLCV, transmitted by the whitefly vector (Bemisia tabaci).',
      disease_management: [
        'Vector Control: Install yellow sticky traps (15-20 traps per acre) throughout the field to monitor and trap whiteflies.',
        'Biological/Botanical: Spray Neem seed kernel extract (NSKE 5%) or certified cold-pressed Neem Oil (1500 ppm) to deter feeding.',
        'Cultural: Promptly uproot and bury plants showing early viral symptoms to prevent insect vectors from acquiring and transmitting virus to healthy plants.',
        'Chemical Category: Approved systemic insecticide sprays directed at whitefly nymphs on leaf undersides, rotating chemical classes to prevent resistance.',
      ],
      prevention: [
        'Use 40-50 mesh insect-proof netting in nursery seedling raising areas.',
        'Plant virus-resistant hybrid varieties suited for your agro-climatic zone.',
      ],
    },
    'Tomato___Bacterial_spot': {
      explanation: 'Small, water-soaked dark brown spots that turn angular, greasy, and necrotic, caused by Xanthomonas species.',
      disease_management: [
        'Cultural: Never work in or harvest tomato fields while plants are wet from dew or rain to prevent mechanical bacterium transfer.',
        'Chemical Category: Copper hydroxide or Copper oxychloride combined with agricultural bactericides as permitted under local agricultural extension recommendations.',
      ],
      prevention: [
        'Use certified hot-water treated disease-free seeds.',
        'Sanitize stakes, pruning shears, and crates with 10% sodium hypochlorite solution.',
      ],
    },
    'Potato___Early_blight': {
      explanation: 'Angular target-like brown spots with concentric rings primarily appearing on mature lower leaflets (Alternaria solani).',
      disease_management: [
        'Cultural: Maintain optimal irrigation schedule to prevent drought stress, which predisposes plants to early blight.',
        'Chemical Category: Protective contact fungicides (Mancozeb or Chlorothalonil) applied before canopy closure.',
      ],
      prevention: [
        'Rotate fields for at least 3 years away from potato and tomato crops.',
        'Ensure proper hilling-up of soil to protect growing tubers from spore wash-in.',
      ],
    },
    'Potato___Late_blight': {
      explanation: 'Water-soaked irregular blackish-brown lesions spreading rapidly in humid weather with white sporulation on leaf margins (Phytophthora infestans).',
      disease_management: [
        'Cultural: Destroy cull piles and infected volunteer potato plants within 500 meters of the field.',
        'Chemical Category: Apply registered protective/systemic fungicides (such as Dimethomorph, Cymoxanil, or Metalaxyl) following regional disease forecasting alerts and label intervals.',
      ],
      prevention: [
        'Plant certified disease-free seed tubers with certified seed passports.',
        'Kill haulms (vines) at least 14 days before harvest to prevent tuber contamination during lifting.',
      ],
    },
    'Corn___Common_rust': {
      explanation: 'Cinnamon-brown to reddish-orange powdery pustules (uredinia) bursting through both leaf surfaces, caused by Puccinia sorghi.',
      disease_management: [
        'Cultural: Inspect plants weekly before tasseling stage (VT). If rust pustules are widespread before tasseling, management is recommended.',
        'Chemical Category: Registered foliar fungicides (such as Propiconazole or Azoxystrobin) applied strictly adhering to label instructions and harvest safety intervals.',
      ],
      prevention: [
        'Plant certified rust-resistant or tolerant corn hybrids suitable for your district.',
        'Plant early in the season to avoid late-season spore showers from southern regions.',
      ],
    },
    'Corn___Northern_Leaf_Blight': {
      explanation: 'Long, elliptical grayish-green or tan cigar-shaped lesions (2.5 to 15 cm long) on corn foliage caused by Exserohilum turcicum.',
      disease_management: [
        'Cultural: Deep plow and bury infected corn crop stubble post-harvest to speed up residue decomposition.',
        'Chemical Category: Foliar fungicides applied between pre-tassel and silking stages if disease severity exceeds threshold on the ear leaf.',
      ],
      prevention: [
        'Select hybrids containing resistant Ht genes.',
        'Rotate with non-grass crops such as soybean, groundnut, or pulses.',
      ],
    },
    'Chilli___Bacterial_spot': {
      explanation: 'Small, dark, circular to irregular water-soaked spots with yellow halos on chilli leaves and fruit, caused by Xanthomonas campestris pv. vesicatoria.',
      disease_management: [
        'Cultural: Avoid overhead sprinkler irrigation; water through furrows or drip lines.',
        'Chemical Category: Protective Copper Oxychloride (2.5g/L) combined with authorized agricultural bactericides applied according to local agricultural department advice.',
      ],
      prevention: [
        'Disinfect seeds prior to sowing with certified seed-treatment protocols.',
        'Remove and burn plant residues following harvest.',
      ],
    },
    'Rice___Brown_Spot': {
      explanation: 'Oval to circular brown lesions with distinct yellow halos scattered over paddy leaf blades, caused by Bipolaris oryzae.',
      disease_management: [
        'Soil Nutrition Check: Brown spot is heavily associated with nutrient-deficient or water-stressed soils; correct potassium and micronutrient imbalances.',
        'Chemical Category: Apply registered protective fungicides (such as Propiconazole or Tricyclazole) at panicle emergence if severe.',
      ],
      prevention: [
        'Treat paddy seeds with Trichoderma viride or approved fungicide before sowing.',
        'Maintain optimal standing water depth in fields to avoid water stress.',
      ],
    },
    'Rice___Bacterial_Blight': {
      explanation: 'Linear water-soaked stripes along leaf margins enlarging into yellow-orange wavy necrotic lesions with bacterial ooze beads (Xanthomonas oryzae pv. oryzae).',
      disease_management: [
        'Cultural: Immediately drain excess standing water from the field for 2-3 days to halt bacterial multiplication.',
        'Cultural: Cease any top-dressing of nitrogen fertilizer immediately.',
        'Chemical Category: Spray Copper Oxychloride (2.5g/L) or approved bactericide formulation under local extension guidance.',
      ],
      prevention: [
        'Plant resistant varieties recommended by your regional agricultural university.',
        'Avoid clipping seedling leaf tips during transplantation.',
      ],
    },
    'Mango___Anthracnose': {
      explanation: 'Irregular dark brown to black necrotic spots coalescing into leaf blight, shoot dieback, and blossom blight (Colletotrichum gloeosporioides).',
      disease_management: [
        'Cultural: Prune dead twigs and congested inner branches during post-harvest cleanup to improve canopy aeration.',
        'Chemical Category: Apply protective Copper Oxychloride (3g/L) or Carbendazim (1g/L) sprays timed during new leaf flush and pre-flowering stages.',
      ],
      prevention: [
        'Collect and burn fallen infected leaves and mummified fruits from orchard floor.',
        'Maintain tree sanitation and paint pruning cuts with Bordeaux paste.',
      ],
    },
    'Apple___Apple_scab': {
      explanation: 'Velvety olive-green to dark brownish-black circular spots on leaves and fruit skin, caused by Venturia inaequalis.',
      disease_management: [
        'Cultural: Rake and shred fallen apple leaves in autumn to disrupt overwintering pseudothecia.',
        'Chemical Category: Apply protective fungicides (Captan, Mancozeb) or systemic sterol-inhibitors during green-tip through petal-fall stages based on scab warning models.',
      ],
      prevention: [
        'Plant scab-resistant apple cultivars.',
        'Prune orchard canopies to encourage rapid leaf drying within 4-6 hours after rainfall.',
      ],
    },
    'Grape___Black_rot': {
      explanation: 'Small circular reddish-brown spots with dark margins and tiny black pycnidia rings on vine leaves and mummified black berries (Guignardia bidwellii).',
      disease_management: [
        'Cultural: Remove and bury all mummified grape clusters and diseased canes during winter pruning.',
        'Chemical Category: Apply registered protective fungicides from bud break through veraison stage per regional spray schedules.',
      ],
      prevention: [
        'Trellis vines properly to maximize sun exposure and wind circulation through the fruiting zone.',
      ],
    },
    'Citrus___Citrus_canker': {
      explanation: 'Raised, corky, brownish-tan volcanic pustules surrounded by distinct oily yellow halos on leaves, twigs, and fruit (Xanthomonas axonopodis pv. citri).',
      disease_management: [
        'Cultural: Prune and burn cankered twigs before the monsoon onset.',
        'Cultural: Erect windbreak trees around the orchard to reduce wind-driven rain splashes that spread bacteria.',
        'Chemical Category: Apply Copper Oxychloride (3g/L) combined with Streptocycline (100mg/L) at flushing stages.',
      ],
      prevention: [
        'Control the Asian citrus leafminer (Phyllocnistis citrella), as feeding galleries provide entry wounds for canker bacteria.',
      ],
    },
    'Cotton___Bacterial_Blight': {
      explanation: 'Angular dark brown water-soaked leaf spots constrained by leaf veinlets, black arm stem lesions, and boll rot (Xanthomonas citri pv. malvacearum).',
      disease_management: [
        'Chemical Category: Spray Copper Oxychloride (2.5g/L) + Streptocycline (100 ppm) upon appearance of initial angular lesions.',
      ],
      prevention: [
        'Acid-delint cotton seeds before sowing to eradicate seed-coat bacterial populations.',
        'Avoid furrow flooding that submerges lower vegetative branches.',
      ],
    },
    'Banana___Black_Sigatoka': {
      explanation: 'Dark reddish-brown to black narrow streaks running parallel to leaf veins that expand into widespread foliar burning (Pseudocercospora fijiensis).',
      disease_management: [
        'Cultural: Regularly de-leaf severely infected leaves and drop them face-down on the ground to reduce ascospore release.',
        'Chemical Category: Apply systemic and protectant fungicide sprays (such as Propiconazole or Azoxystrobin) formulated with agricultural mineral oil.',
      ],
      prevention: [
        'Ensure effective drainage channels to prevent humid water-saturated root zones.',
      ],
    },
  };

  const entry = dbDisease[clsName];
  if (!entry) {
    return {
      explanation: `Foliar symptoms consistent with ${condition} observed on ${crop} specimen.`,
      fertilizer: fertilizerWarning,
      disease_management: [
        'Cultural: Remove and isolate severely affected leaf foliage to prevent pathogen spread.',
        'Cultural: Improve canopy ventilation and avoid overhead irrigation.',
        'Consult your local agricultural extension service for regionally registered crop-protection products.',
      ],
      prevention: [
        'Maintain balanced crop nutrition and field sanitation.',
        'Practice regular crop rotation with non-host crops.',
      ],
      safety_note: DEFAULT_SAFETY_NOTE,
    };
  }

  return {
    explanation: entry.explanation,
    fertilizer: fertilizerWarning,
    disease_management: entry.disease_management,
    prevention: entry.prevention,
    safety_note: DEFAULT_SAFETY_NOTE,
  };
}
