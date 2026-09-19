import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { CropAnalysis } from '../models/CropAnalysis.model';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { onnxPathologyEngine } from '../services/onnxInference.service';
import {
  existingModelProvider,
  generalPlantIdentificationProvider,
  diseaseDiagnosisProvider,
  agriculturalRecommendationProvider,
  StandardAgriculturalResponse,
  DiagnosisStatus,
  SpeciesSource,
  HealthStatus,
  ExistingModelProvider,
  OPEN_WORLD_BOTANICAL_REGISTRY,
} from '../services/aiProviders';

const AI_SERVICE_URL = process.env.AI_API_URL || process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Configure Multer memory storage
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type '${file.mimetype}'. Only JPEG, PNG, and WebP images are allowed.`));
    }
  },
});

export const DEFAULT_DISCLAIMER =
  'AgroMitra Universal Leaf Scanner is an automated decision-support tool provided for informational guidance. ' +
  'Always consult your local Agricultural Extension Officer (AEO), Krishi Vigyan Kendra (KVK), or certified agronomist ' +
  'for field verification before applying chemical treatments.';

export interface PlantSpeciesInfo {
  scientific: string;
  telugu: string;
  family: string;
}

export const PLANT_SPECIES_DATABASE: Record<string, PlantSpeciesInfo> = {
  Tomato: { scientific: 'Solanum lycopersicum', telugu: 'టమాటా', family: 'Solanaceae' },
  Potato: { scientific: 'Solanum tuberosum', telugu: 'బంగాళాదుంప', family: 'Solanaceae' },
  Corn: { scientific: 'Zea mays', telugu: 'మొక్కజొన్న', family: 'Poaceae' },
  Rice: { scientific: 'Oryza sativa', telugu: 'వరి', family: 'Poaceae' },
  Wheat: { scientific: 'Triticum aestivum', telugu: 'గోధుమ', family: 'Poaceae' },
  Cotton: { scientific: 'Gossypium hirsutum', telugu: 'పత్తి', family: 'Malvaceae' },
  Sugarcane: { scientific: 'Saccharum officinarum', telugu: 'చెరకు', family: 'Poaceae' },
  Soybean: { scientific: 'Glycine max', telugu: 'సోయాబీన్', family: 'Fabaceae' },
  Chilli: { scientific: 'Capsicum annuum', telugu: 'మిరప', family: 'Solanaceae' },
  Brinjal: { scientific: 'Solanum melongena', telugu: 'వంకాయ', family: 'Solanaceae' },
  Cucumber: { scientific: 'Cucumis sativus', telugu: 'దోసకాయ', family: 'Cucurbitaceae' },
  Groundnut: { scientific: 'Arachis hypogaea', telugu: 'వేరుశనగ', family: 'Fabaceae' },
  Apple: { scientific: 'Malus domestica', telugu: 'ఆపిల్', family: 'Rosaceae' },
  Grape: { scientific: 'Vitis vinifera', telugu: 'ద్రాక్ష', family: 'Vitaceae' },
  Mango: { scientific: 'Mangifera indica', telugu: 'మామిడి', family: 'Anacardiaceae' },
  Citrus: { scientific: 'Citrus spp.', telugu: 'నిమ్మ / బత్తాయి', family: 'Rutaceae' },
  Banana: { scientific: 'Musa spp.', telugu: 'అరటి', family: 'Musaceae' },
  Papaya: { scientific: 'Carica papaya', telugu: 'బొప్పాయి', family: 'Caricaceae' },
  Guava: { scientific: 'Psidium guajava', telugu: 'జామ', family: 'Myrtaceae' },
  Tea: { scientific: 'Camellia sinensis', telugu: 'టీ', family: 'Theaceae' },
  Coffee: { scientific: 'Coffea arabica', telugu: 'కాఫీ', family: 'Rubiaceae' },
  Neem: { scientific: 'Azadirachta indica', telugu: 'వేప', family: 'Meliaceae' },
  Bean: { scientific: 'Phaseolus vulgaris', telugu: 'చిక్కుడు', family: 'Fabaceae' },
  Blueberry: { scientific: 'Vaccinium corymbosum', telugu: 'బ్లూబెర్రీ', family: 'Ericaceae' },
  Cherry: { scientific: 'Prunus avium', telugu: 'చెర్రీ', family: 'Rosaceae' },
  Peach: { scientific: 'Prunus persica', telugu: 'పీచ్', family: 'Rosaceae' },
  Raspberry: { scientific: 'Rubus idaeus', telugu: 'రాస్ప్బెర్రీ', family: 'Rosaceae' },
  Strawberry: { scientific: 'Fragaria × ananassa', telugu: 'స్ట్రాబెర్రీ', family: 'Rosaceae' },
};

export interface UniversalPathologyRecord {
  plant: string;
  plant_display: string;
  health_status: 'Healthy' | 'Diseased' | 'Pest Damage' | 'Nutrient Deficiency' | 'Physical/Environmental Damage' | 'Other Abnormality' | 'Unknown';
  diagnosis: string | null;
  severity: 'None' | 'Mild' | 'Moderate' | 'Severe' | 'Unknown';
  is_healthy: boolean;
  symptoms: string[];
  recommendation: string;
}

export const UNIVERSAL_PATHOLOGY_DATABASE: Record<string, UniversalPathologyRecord> = {
  // --- TOMATO ---
  'Tomato___healthy': {
    plant: 'Tomato',
    plant_display: 'Tomato (టమాటా)',
    health_status: 'Healthy',
    diagnosis: null,
    severity: 'None',
    is_healthy: true,
    symptoms: ['Vibrant green, uniform leaf color without necrotic spots, halos, or curling.'],
    recommendation: 'No visible disease detected. Continue regular drip irrigation and balanced N-P-K crop nutrition.',
  },
  'Tomato___Early_blight': {
    plant: 'Tomato',
    plant_display: 'Tomato (టమాటా)',
    health_status: 'Diseased',
    diagnosis: 'Early Blight (ఆకు మాడు తెగులు - Alternaria solani)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Concentric brown-black circular rings with distinct yellow chlorotic halos on older leaves.'],
    recommendation: 'Prune infected lower foliage. Apply Copper Oxychloride (3g/L) or Mancozeb (2g/L) and avoid overhead irrigation.',
  },
  'Tomato___Late_blight': {
    plant: 'Tomato',
    plant_display: 'Tomato (టమాటా)',
    health_status: 'Diseased',
    diagnosis: 'Late Blight (లేట్ బ్లైట్ తెగులు - Phytophthora infestans)',
    severity: 'Severe',
    is_healthy: false,
    symptoms: ['Water-soaked dark brown necrotic lesions on leaf margins with white downy fungal growth underneath.'],
    recommendation: 'Immediately destroy heavily infected plants. Spray systemic Cymoxanil + Mancozeb (2g/L) or Metalaxyl under agronomist guidance.',
  },
  'Tomato___Leaf_Mold': {
    plant: 'Tomato',
    plant_display: 'Tomato (టమాటా)',
    health_status: 'Diseased',
    diagnosis: 'Leaf Mold (ఆకు బూజు తెగులు - Passalora fulva)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Pale green to yellow spots on upper leaf surfaces and olive-brown velvety mold on lower leaf surfaces.'],
    recommendation: 'Improve canopy aeration and lower relative humidity below 85%. Apply approved bio-fungicide or copper spray.',
  },
  'Tomato___Yellow_Leaf_Curl_Virus': {
    plant: 'Tomato',
    plant_display: 'Tomato (టమాటా)',
    health_status: 'Diseased',
    diagnosis: 'Tomato Yellow Leaf Curl Virus (ఆకు ముడుత వైరస్ - TYLCV)',
    severity: 'Severe',
    is_healthy: false,
    symptoms: ['Severe upward leaf curling, yellow interveinal chlorosis, and stunted bushy growth.'],
    recommendation: 'Control Whitefly (Bemisia tabaci) vector with yellow sticky traps and spray Neem Oil (1500 ppm) or systemic insecticide.',
  },

  // --- POTATO ---
  'Potato___healthy': {
    plant: 'Potato',
    plant_display: 'Potato (బంగాళాదుంప)',
    health_status: 'Healthy',
    diagnosis: null,
    severity: 'None',
    is_healthy: true,
    symptoms: ['Lush green compound leaves without chlorotic margins or tuber rot symptoms.'],
    recommendation: 'Maintain proper hilling-up and soil moisture balance according to Soil Health Card guidelines.',
  },
  'Potato___Early_blight': {
    plant: 'Potato',
    plant_display: 'Potato (బంగాళాదుంప)',
    health_status: 'Diseased',
    diagnosis: 'Early Blight (ఆకు మాడు తెగులు - Alternaria solani)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Angular dark brown spots with target-like concentric rings on mature leaflets.'],
    recommendation: 'Apply prophylactic Mancozeb or Chlorothalonil spray and avoid water stress during tuber initiation.',
  },
  'Potato___Late_blight': {
    plant: 'Potato',
    plant_display: 'Potato (బంగాళాదుంప)',
    health_status: 'Diseased',
    diagnosis: 'Late Blight (లేట్ బ్లైట్ తెగులు - Phytophthora infestans)',
    severity: 'Severe',
    is_healthy: false,
    symptoms: ['Rapidly spreading water-soaked black-brown lesions causing rapid foliage collapse in humid cool weather.'],
    recommendation: 'Apply protective contact and systemic fungicides (e.g. Dimethomorph + Mancozeb) immediately upon first detection.',
  },

  // --- CORN / MAIZE ---
  'Corn___healthy': {
    plant: 'Corn',
    plant_display: 'Corn / Maize (మొక్కజొన్న)',
    health_status: 'Healthy',
    diagnosis: null,
    severity: 'None',
    is_healthy: true,
    symptoms: ['Erect elongated green leaves with clear parallel venation and healthy vegetative vigor.'],
    recommendation: 'Ensure timely split application of nitrogen fertilizers at knee-high and tasseling stages.',
  },
  'Corn___Common_rust': {
    plant: 'Corn',
    plant_display: 'Corn / Maize (మొక్కజొన్న)',
    health_status: 'Diseased',
    diagnosis: 'Common Rust (తుప్పు తెగులు - Puccinia sorghi)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Golden-brown to cinnamon-red powdery pustules rupturing on both upper and lower leaf surfaces.'],
    recommendation: 'Plant certified resistant hybrids. Apply Azoxystrobin or Propiconazole spray if rust covers >5% leaf area before tasseling.',
  },

  // --- RICE / PADDY ---
  'Rice___healthy': {
    plant: 'Rice',
    plant_display: 'Rice / Paddy (వరి)',
    health_status: 'Healthy',
    diagnosis: null,
    severity: 'None',
    is_healthy: true,
    symptoms: ['Lush green erect tillers with clean flag leaves free of blast or sheath rot.'],
    recommendation: 'Practice alternate wetting and drying (AWD) water management and follow Leaf Color Chart (LCC) nitrogen timing.',
  },
  'Rice___Brown_Spot': {
    plant: 'Rice',
    plant_display: 'Rice / Paddy (వరి)',
    health_status: 'Diseased',
    diagnosis: 'Brown Spot (గోధుమ మచ్చ తెగులు - Bipolaris oryzae)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Oval brown spots with grayish-white centers on leaf blades and leaf sheaths.'],
    recommendation: 'Correct soil potassium and zinc deficiencies. Apply Propiconazole or Tricyclazole + Mancozeb spray.',
  },

  // --- COTTON ---
  'Cotton___healthy': {
    plant: 'Cotton',
    plant_display: 'Cotton (పత్తి)',
    health_status: 'Healthy',
    diagnosis: null,
    severity: 'None',
    is_healthy: true,
    symptoms: ['Clean broad lobed leaves without vein browning or sucking pest damage.'],
    recommendation: 'Monitor weekly for pink bollworm and sucking pests using pheromone and yellow sticky traps.',
  },
  'Cotton___Bacterial_Blight': {
    plant: 'Cotton',
    plant_display: 'Cotton (పత్తి)',
    health_status: 'Diseased',
    diagnosis: 'Bacterial Blight / Angular Leaf Spot (కోణీయ మచ్చ తెగులు - Xanthomonas albilineans)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Angular water-soaked spots restricted by veins on the underside of leaves, turning dark brown.'],
    recommendation: 'Spray Copper Oxychloride (3g/L) mixed with Streptocycline (100mg/L) upon early symptom detection.',
  },

  // --- CHILLI / PEPPER ---
  'Chilli___healthy': {
    plant: 'Chilli',
    plant_display: 'Chilli / Pepper (మిరప)',
    health_status: 'Healthy',
    diagnosis: null,
    severity: 'None',
    is_healthy: true,
    symptoms: ['Dark green glossy ovate leaves without curling, mosaic patterns, or necrotic spots.'],
    recommendation: 'Maintain balanced micro-nutrients (Zinc, Boron) and prophylactic Neem oil spray (1000 ppm).',
  },
  'Chilli___Bacterial_spot': {
    plant: 'Chilli',
    plant_display: 'Chilli / Pepper (మిరప)',
    health_status: 'Diseased',
    diagnosis: 'Bacterial Leaf Spot (బాక్టీరియా మచ్చ తెగులు - Xanthomonas campestris)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Small circular or irregular dark brown water-soaked spots with pale margins on foliage.'],
    recommendation: 'Apply Copper Hydroxide or Copper Oxychloride (3g/L) combined with plant antibiotic Streptocycline.',
  },

  // --- APPLE ---
  'Apple___healthy': {
    plant: 'Apple',
    plant_display: 'Apple (ఆపిల్)',
    health_status: 'Healthy',
    diagnosis: null,
    severity: 'None',
    is_healthy: true,
    symptoms: ['Uniform green ovate leaves without velvety scab lesions or powdery mildew.'],
    recommendation: 'Ensure proper winter pruning and orchard sanitation to prevent fungal spore carryover.',
  },
  'Apple___Apple_scab': {
    plant: 'Apple',
    plant_display: 'Apple (ఆపిల్)',
    health_status: 'Diseased',
    diagnosis: 'Apple Scab (వెంKeychain స్కాబ్ - Venturia inaequalis)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Olive-green to dull brown velvety circular lesions on upper leaf surfaces.'],
    recommendation: 'Rake and destroy fallen leaf litter. Spray Difenoconazole or Mancozeb during pink bud and petal fall stages.',
  },

  // --- MANGO ---
  'Mango___healthy': {
    plant: 'Mango',
    plant_display: 'Mango (మామిడి)',
    health_status: 'Healthy',
    diagnosis: null,
    severity: 'None',
    is_healthy: true,
    symptoms: ['Deep green, leathery lanceolate leaves with prominent light green midribs and clean vegetative flushes.'],
    recommendation: 'Apply post-harvest organic compost and maintain orchard weeding and light canopy pruning.',
  },
  'Mango___Anthracnose': {
    plant: 'Mango',
    plant_display: 'Mango (మామిడి)',
    health_status: 'Diseased',
    diagnosis: 'Anthracnose (మచ్చ తెగులు - Colletotrichum gloeosporioides)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Irregular dark brown to black necrotic spots on leaves, blossoms, and young panicles.'],
    recommendation: 'Remove severely infected twigs. Spray Carbendazim (1g/L) or Copper Oxychloride (3g/L) before flowering and fruit set.',
  },

  // --- GRAPE ---
  'Grape___healthy': {
    plant: 'Grape',
    plant_display: 'Grape (ద్రాక్ష)',
    health_status: 'Healthy',
    diagnosis: null,
    severity: 'None',
    is_healthy: true,
    symptoms: ['Large lobed green leaves without mildew oil spots or marginal scorch.'],
    recommendation: 'Maintain proper trellis canopy training and balanced micro-irrigation.',
  },
  'Grape___Black_rot': {
    plant: 'Grape',
    plant_display: 'Grape (ద్రాక్ష)',
    health_status: 'Diseased',
    diagnosis: 'Black Rot (నల్ల కుళ్ళు తెగులు - Guignardia bidwellii)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Reddish-brown circular spots on leaves containing tiny black fungal pycnidia dots.'],
    recommendation: 'Apply protective Mancozeb or Myclobutanil sprays starting from early shoot development.',
  },

  // --- NEEM ---
  'Neem___healthy': {
    plant: 'Neem',
    plant_display: 'Neem (వేప)',
    health_status: 'Healthy',
    diagnosis: null,
    severity: 'None',
    is_healthy: true,
    symptoms: ['Vibrant green, serrated falcate pinnate leaflets with uniform arrangement and natural vigor.'],
    recommendation: 'Neem is a hardy natural bio-pesticide and medicinal tree. Maintain moderate watering and harvest mature leaves as organic mulch.',
  },
  'Neem___leaf_spot_blight': {
    plant: 'Neem',
    plant_display: 'Neem (వేప)',
    health_status: 'Diseased',
    diagnosis: 'Leaf Spot / Foliar Blight (వేప ఆకు మచ్చ తెగులు - Pseudocercospora / Colletotrichum)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Dark brown necrotic spots with yellow halos on pinnate leaflets and shoot dieback.'],
    recommendation: 'Thin crowded tree canopies to improve sunlight penetration. Spray Mancozeb (2.5g/L) during humid monsoon spells.',
  },

  // --- BANANA ---
  'Banana___healthy': {
    plant: 'Banana',
    plant_display: 'Banana (అరటి)',
    health_status: 'Healthy',
    diagnosis: null,
    severity: 'None',
    is_healthy: true,
    symptoms: ['Large broad paddle-shaped green leaves without yellow streaks or marginal necrosis.'],
    recommendation: 'Provide adequate potassium fertilization and regular drip irrigation; remove excess side suckers.',
  },
  'Banana___Black_Sigatoka': {
    plant: 'Banana',
    plant_display: 'Banana (అరటి)',
    health_status: 'Diseased',
    diagnosis: 'Black Sigatoka / Leaf Streak (సిగటోకా ఆకు ఎండు తెగులు - Pseudocercospora fijiensis)',
    severity: 'Severe',
    is_healthy: false,
    symptoms: ['Dark reddish-brown to black narrow elliptical streaks running parallel to leaf veins.'],
    recommendation: 'De-leaf severely infected foliage to reduce spore load. Apply mineral oil emulsion + Propiconazole (1ml/L).',
  },

  // --- CITRUS ---
  'Citrus___healthy': {
    plant: 'Citrus',
    plant_display: 'Citrus (నిమ్మ / బత్తాయి)',
    health_status: 'Healthy',
    diagnosis: null,
    severity: 'None',
    is_healthy: true,
    symptoms: ['Dark green glossy winged leaves without corky canker lesions or yellow mottle.'],
    recommendation: 'Apply balanced micronutrient foliar spray (Zinc + Iron + Magnesium) and follow drip irrigation schedules.',
  },
  'Citrus___Citrus_canker': {
    plant: 'Citrus',
    plant_display: 'Citrus (నిమ్మ / బత్తాయి)',
    health_status: 'Diseased',
    diagnosis: 'Citrus Canker (గజ్జి తెగులు - Xanthomonas axonopodis pv. citri)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Raised corky brownish-tan crater-like pustules with oily water-soaked yellow halos on leaves.'],
    recommendation: 'Prune cankered twigs before monsoon. Spray Copper Oxychloride (3g/L) + Streptocycline (100mg/L).',
  },

  // --- APPLE BLACK ROT ---
  'Apple___Black_rot': {
    plant: 'Apple',
    plant_display: 'Apple (ఆపిల్)',
    health_status: 'Diseased',
    diagnosis: 'Black Rot / Frog-Eye Leaf Spot (నల్ల కుళ్ళు తెగులు - Botryosphaeria obtusa)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Small purple specks expanding into circular frog-eye lesions with dark borders.'],
    recommendation: 'Prune out dead wood and cankers. Apply Captan or Thiophanate-methyl fungicides.',
  },

  // --- CITRUS GREENING ---
  'Citrus___Citrus_greening': {
    plant: 'Citrus',
    plant_display: 'Citrus (నిమ్మ / బత్తాయి)',
    health_status: 'Diseased',
    diagnosis: 'Huanglongbing / Citrus Greening (హ్వాంగ్లాంగ్‌బింగ్ - Candidatus Liberibacter)',
    severity: 'Severe',
    is_healthy: false,
    symptoms: ['Asymmetric blotchy mottling on leaves, yellow shoot dieback, and small lopsided bitter fruits.'],
    recommendation: 'Control Asian citrus psyllid vectors with Imidacloprid. Remove severely infected trees and source disease-free nursery budwood.',
  },

  // --- CORN NORTHERN LEAF BLIGHT ---
  'Corn___Northern_Leaf_Blight': {
    plant: 'Corn',
    plant_display: 'Corn / Maize (మొక్కజొన్న)',
    health_status: 'Diseased',
    diagnosis: 'Northern Corn Leaf Blight (ఆకు ఎండు తెగులు - Exserohilum turcicum)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Long elliptical grayish-green or tan cigar-shaped lesions on leaf blades.'],
    recommendation: 'Rotate crops and destroy infected stover. Apply Mancozeb (2.5g/L) upon early lesion appearance.',
  },

  // --- GRAPE ESCA ---
  'Grape___Esca': {
    plant: 'Grape',
    plant_display: 'Grape (ద్రాక్ష)',
    health_status: 'Diseased',
    diagnosis: 'Esca / Black Measles (ఎస్కా తెగులు - Phaeomoniella chlamydospora)',
    severity: 'Severe',
    is_healthy: false,
    symptoms: ["'Tiger-stripe' chlorotic and necrotic patterns between leaf veins."],
    recommendation: 'Prune during dry weather and seal large pruning wounds with fungicide paste.',
  },

  // --- RICE BACTERIAL BLIGHT ---
  'Rice___Bacterial_Blight': {
    plant: 'Rice',
    plant_display: 'Rice / Paddy (వరి)',
    health_status: 'Diseased',
    diagnosis: 'Bacterial Leaf Blight (బాక్టీరియా ఎండు తెగులు - Xanthomonas oryzae)',
    severity: 'Severe',
    is_healthy: false,
    symptoms: ['Wavy water-soaked yellow-orange lesions progressing from leaf tips along margins.'],
    recommendation: 'Drain excess stagnant water. Apply Copper Oxychloride (2.5g/L) + Streptocycline (100mg/L) and avoid excess nitrogen.',
  },

  // --- ADDITIONAL TOMATO DISEASES ---
  'Tomato___Septoria_leaf_spot': {
    plant: 'Tomato',
    plant_display: 'Tomato (టమాటా)',
    health_status: 'Diseased',
    diagnosis: 'Septoria Leaf Spot (సెప్టోరియా ఆకు మచ్చ - Septoria lycopersici)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Numerous small circular spots with gray centers and dark brown borders on lower foliage.'],
    recommendation: 'Remove lower infected foliage. Apply Chlorothalonil or Mancozeb sprays and mulch soil around plant bases.',
  },
  'Tomato___Bacterial_spot': {
    plant: 'Tomato',
    plant_display: 'Tomato (టమాటా)',
    health_status: 'Diseased',
    diagnosis: 'Bacterial Spot (బాక్టీరియా మచ్చ - Xanthomonas campestris pv. vesicatoria)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Small angular water-soaked dark brown spots that turn greasy and scabby with yellow chlorotic halos.'],
    recommendation: 'Apply Copper Hydroxide (2.5g/L) + Streptocycline (100mg/L). Avoid overhead irrigation.',
  },
  'Tomato___Spider_mites': {
    plant: 'Tomato',
    plant_display: 'Tomato (టమాటా)',
    health_status: 'Pest Damage',
    diagnosis: 'Two-Spotted Spider Mites (ఎర్ర నల్లి నష్టం - Tetranychus urticae)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Fine pale yellow stippling and speckled chlorosis on upper leaf surface with delicate webbing underneath.'],
    recommendation: 'Spray Spiromesifen (1ml/L) or Wettable Sulfur (3g/L) on lower leaf undersides; wash foliage with strong water sprays.',
  },
  'Tomato___Target_Spot': {
    plant: 'Tomato',
    plant_display: 'Tomato (టమాటా)',
    health_status: 'Diseased',
    diagnosis: 'Target Spot (టార్గెట్ స్పాట్ తెగులు - Corynespora cassiicola)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Pinpoint brown lesions that enlarge into target-like circular necrotic zones with concentric rings.'],
    recommendation: 'Ensure proper plant spacing for air circulation. Spray Azoxystrobin or Difenoconazole.',
  },
  'Tomato___Mosaic_virus': {
    plant: 'Tomato',
    plant_display: 'Tomato (టమాటా)',
    health_status: 'Diseased',
    diagnosis: 'Tomato Mosaic Virus (మొజాయిక్ వైరస్ - ToMV)',
    severity: 'Severe',
    is_healthy: false,
    symptoms: ['Mottled light and dark green mosaic patterns, blistering, leaf distortion, and fern-like foliage.'],
    recommendation: 'Rogue and burn infected plants. Disinfect pruning tools with 10% trisodium phosphate; wash hands before handling.',
  },

  // --- PEACH ---
  'Peach___healthy': {
    plant: 'Peach',
    plant_display: 'Peach (పీచ్)',
    health_status: 'Healthy',
    diagnosis: null,
    severity: 'None',
    is_healthy: true,
    symptoms: ['Clean lanceolate leaves with smooth margins and healthy green color.'],
    recommendation: 'Maintain regular orchard pruning and balanced winter fertilizing.',
  },
  'Peach___Bacterial_spot': {
    plant: 'Peach',
    plant_display: 'Peach (పీచ్)',
    health_status: 'Diseased',
    diagnosis: 'Bacterial Spot (బాక్టీరియల్ స్పాట్ - Xanthomonas arboricola)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ["Small angular water-soaked purple-brown lesions that drop out leaving 'shot-hole' appearance."],
    recommendation: 'Spray Copper compounds during dormant and bloom stages.',
  },

  // --- STRAWBERRY ---
  'Strawberry___healthy': {
    plant: 'Strawberry',
    plant_display: 'Strawberry (స్ట్రాబెర్రీ)',
    health_status: 'Healthy',
    diagnosis: null,
    severity: 'None',
    is_healthy: true,
    symptoms: ['Trifoliate bright green leaves with serrated margins and healthy crowns.'],
    recommendation: 'Ensure raised bed drainage, organic straw mulching, and balanced drip irrigation.',
  },
  'Strawberry___Leaf_scorch': {
    plant: 'Strawberry',
    plant_display: 'Strawberry (స్ట్రాబెర్రీ)',
    health_status: 'Diseased',
    diagnosis: 'Leaf Scorch (ఆకు ముడుత తెగులు - Diplocarpon earlianum)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['Small dark purple irregular blotches that coalesce into widespread brown scorching.'],
    recommendation: 'Remove old infected leaves after harvest; spray Captan or Copper fungicide.',
  },

  // --- CHERRY, BLUEBERRY, RASPBERRY, SOYBEAN ---
  'Cherry___healthy': {
    plant: 'Cherry',
    plant_display: 'Cherry (చెర్రీ)',
    health_status: 'Healthy',
    diagnosis: null,
    severity: 'None',
    is_healthy: true,
    symptoms: ['Deep green glossy ovate leaves without shot-holes or powdery mildew.'],
    recommendation: 'Maintain proper tree canopy pruning and orchard floor hygiene.',
  },
  'Cherry___Powdery_mildew': {
    plant: 'Cherry',
    plant_display: 'Cherry (చెర్రీ)',
    health_status: 'Diseased',
    diagnosis: 'Powdery Mildew (బూడిద తెగులు - Podosphaera clandestina)',
    severity: 'Moderate',
    is_healthy: false,
    symptoms: ['White powdery superficial fungal patches causing leaf curling and distorted shoot growth.'],
    recommendation: 'Apply Sulfur or Myclobutanil sprays starting from shuck fall stage.',
  },
  'Blueberry___healthy': {
    plant: 'Blueberry',
    plant_display: 'Blueberry (బ్లూబెర్రీ)',
    health_status: 'Healthy',
    diagnosis: null,
    severity: 'None',
    is_healthy: true,
    symptoms: ['Glossy elliptical dark green foliage without chlorosis or leaf spots.'],
    recommendation: 'Maintain acidic soil pH (4.5–5.2) with organic pine bark mulch.',
  },
  'Raspberry___healthy': {
    plant: 'Raspberry',
    plant_display: 'Raspberry (రాస్ప్బెర్రీ)',
    health_status: 'Healthy',
    diagnosis: null,
    severity: 'None',
    is_healthy: true,
    symptoms: ['Compound pinnate green leaves with silvery undersides and healthy cane vigor.'],
    recommendation: 'Prune out spent floricanes after harvest and maintain trellis support.',
  },
  'Soybean___healthy': {
    plant: 'Soybean',
    plant_display: 'Soybean (సోయాబీన్)',
    health_status: 'Healthy',
    diagnosis: null,
    severity: 'None',
    is_healthy: true,
    symptoms: ['Trifoliate lush green leaves without rust pustules or bacterial pustules.'],
    recommendation: 'Maintain proper rhizobium inoculation and balanced phosphorus fertilization.',
  },

  // --- BACKGROUND NON-LEAF ---
  'Background___non_leaf': {
    plant: 'Non-Leaf Object',
    plant_display: 'Non-Leaf Object (ఆకు కాదు)',
    health_status: 'Unknown',
    diagnosis: null,
    severity: 'Unknown',
    is_healthy: false,
    symptoms: ['Image does not depict agricultural foliage or plant tissue.'],
    recommendation: 'Please upload a clear close-up photo of a real crop or plant leaf in natural daylight.',
  },

  // --- UNKNOWN / OUT OF DISTRIBUTION ---
  'Unknown___unsupported': {
    plant: 'Unknown',
    plant_display: 'Unknown Plant',
    health_status: 'Unknown',
    diagnosis: null,
    severity: 'Unknown',
    is_healthy: false,
    symptoms: ['The visual morphology does not match high-confidence botanical profiles in the database.'],
    recommendation: 'The image could not be reliably identified. Please upload a clear close-up image of the leaf or consult a local agricultural officer.',
  },
};

export const STANDARD_CLASSES = Object.keys(UNIVERSAL_PATHOLOGY_DATABASE);

// Backwards compatibility database
export const DISEASE_DATABASE: Record<string, any> = {};
for (const [k, v] of Object.entries(UNIVERSAL_PATHOLOGY_DATABASE)) {
  DISEASE_DATABASE[k] = {
    crop: v.plant_display,
    disease: v.diagnosis || 'Healthy Crop (ఆరోగ్యకరమైన పంట)',
    is_healthy: v.is_healthy,
    health_status: v.health_status,
    symptoms: v.symptoms,
    recommended_actions: [v.recommendation],
  };
}

import { StructuredRecommendation } from '../services/diseaseGuidance.service';

export interface UniversalScannerResult {
  success: boolean;
  isValid?: boolean;
  is_valid?: boolean;
  isSupportedSpecies?: boolean;
  species?: string | null;
  speciesConfidence?: number;
  disease?: string | null;
  diseaseConfidence?: number;
  jointClass?: string;
  is_tomato?: boolean;
  detectedCrop?: string;
  modelVersion?: number;
  plant?: {
    name: string;
    displayName?: string;
    confidence: number;
  };
  health?: {
    status: string;
    confidence: number;
  };
  diagnosis?: {
    name: string;
    confidence?: number;
  } | null;
  severity?: string;
  recommendation?: any;
  structuredRecommendation?: StructuredRecommendation;
  safety_note?: string;
  // Legacy / backward compatibility
  is_confident?: boolean;
  crop?: string;
  condition?: string;
  is_healthy?: boolean;
  confidence?: number;
  top5?: Array<{
    className: string;
    crop: string;
    plant: string;
    disease: string;
    health_status: string;
    probability: number;
  }>;
  symptoms?: string[];
  recommended_actions?: string[];
  disclaimer?: string;
  error?: string;
  reason?: string;
  message?: string;
}

/**
 * Health check endpoint for Universal Leaf Scanner Engine
 * GET /api/crop-health/health
 */
export const getCropHealthServiceStatus = async (_req: Request, res: Response): Promise<void> => {
  const modelInfo = onnxPathologyEngine.getModelInfo();
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'AgroMitra Universal Leaf Scanner & Plant Health Diagnostic Engine',
    model: 'Universal-MobileNetV3-PlantTaxonomy',
    modelVersion: modelInfo.version,
    modelPath: modelInfo.modelPath,
    engineInitialized: modelInfo.initialized,
    speciesCount: Object.keys(PLANT_SPECIES_DATABASE).length,
    classesCount: STANDARD_CLASSES.length,
    supportedSpecies: Object.keys(PLANT_SPECIES_DATABASE),
    remoteServiceUrl: AI_SERVICE_URL,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Upload and analyze plant/crop leaf image using Universal Leaf Scanner Pipeline
 * POST /api/crop-health/analyze
 */
export const analyzeCropHealth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;

    if (!req.file) {
      res.status(400).json({
        success: false,
        isValid: false,
        isPlant: false,
        species: null,
        speciesConfidence: null,
        speciesSource: null,
        disease: null,
        diseaseConfidence: null,
        healthStatus: null,
        diagnosisStatus: 'INVALID_IMAGE',
        recommendations: [],
        products: [],
        nearbyShops: [],
        error: 'NO_FILE_UPLOADED',
        message: 'Please upload an image file of the plant leaf to analyze.',
      });
      return;
    }

    const { originalname, mimetype, buffer } = req.file;

    // Resolve Farmer coordinates from request body or user profile
    const customLat =
      req.body?.latitude !== undefined && req.body?.latitude !== null && !isNaN(Number(req.body.latitude))
        ? Number(req.body.latitude)
        : undefined;
    const customLon =
      req.body?.longitude !== undefined && req.body?.longitude !== null && !isNaN(Number(req.body.longitude))
        ? Number(req.body.longitude)
        : undefined;

    const farmerCoords = {
      latitude:
        customLat ??
        (user?.address?.latitude !== undefined && !isNaN(Number(user.address.latitude))
          ? Number(user.address.latitude)
          : undefined),
      longitude:
        customLon ??
        (user?.address?.longitude !== undefined && !isNaN(Number(user.address.longitude))
          ? Number(user.address.longitude)
          : undefined),
    };

    let providerResult: any = null;
    let predictionData: UniversalScannerResult | null = null;
    let outsideDiagnosis: any = null;

    // =========================================================================
    // STAGE 1 — OPEN-WORLD BOTANICAL VISION & QUALITY / NON-PLANT GATING
    // =========================================================================
    const generalResult = await generalPlantIdentificationProvider.identifyPlant(
      buffer,
      originalname,
      mimetype
    );

    // Image quality check
    if (
      generalResult.error === 'INVALID_IMAGE_QUALITY' ||
      generalResult.error === 'IMAGE_DECODE_FAILED'
    ) {
      res.status(400).json({
        success: false,
        isValid: false,
        isPlant: false,
        species: null,
        speciesConfidence: null,
        speciesSource: null,
        disease: null,
        diseaseConfidence: null,
        healthStatus: null,
        diagnosisStatus: 'INVALID_IMAGE',
        recommendations: [],
        products: [],
        nearbyShops: [],
        error: generalResult.error,
        message: 'Please upload or scan a clear crop leaf image with adequate illumination.',
        is_valid: false,
        isSupportedSpecies: false,
        is_tomato: false,
      });
      return;
    }

    // Non-plant image gate check
    if (!generalResult.isPlant || generalResult.error === 'NON_PLANT_IMAGE') {
      res.status(400).json({
        success: false,
        isValid: false,
        isPlant: false,
        species: null,
        speciesConfidence: null,
        speciesSource: null,
        disease: null,
        diseaseConfidence: null,
        healthStatus: null,
        diagnosisStatus: 'NON_PLANT',
        recommendations: [],
        products: [],
        nearbyShops: [],
        error: 'NON_PLANT',
        message: 'Non-foliar or non-plant image detected. Disease inference was not run.',
        is_valid: false,
        isSupportedSpecies: false,
        is_tomato: false,
      });
      return;
    }

    // =========================================================================
    // STAGE 2 — SPECIES IDENTIFICATION & SPECIES CONFIRMATION
    // =========================================================================
    let speciesName: string | null = null;
    let speciesConfidence: number | null = null;
    let speciesSource: SpeciesSource = null;
    let diseaseName: string | null = null;
    let diseaseConfidence: number | null = null;
    let healthStatus: HealthStatus = null;
    let diagnosisStatus: DiagnosisStatus = 'UNKNOWN_SPECIES';
    let isHealthy = false;

    if (generalResult.species) {
      // Species identified by general botanical model
      const isSpecialistCrop = ExistingModelProvider.isSupportedSpecies(generalResult.species);

      if (isSpecialistCrop) {
        // Confirmed within 18 specialist crops: Run specialist ONNX pathology engine
        try {
          providerResult = await existingModelProvider.process(buffer, originalname, mimetype);
          predictionData = providerResult?.rawResult;
        } catch (onnxErr: any) {
          console.warn('⚠️ [ONNX Engine Notice]:', onnxErr.message);
        }

        speciesName = generalResult.species;
        speciesConfidence = providerResult?.plantResult?.confidence || generalResult.confidence;
        speciesSource = 'EXISTING_ONNX';
        diseaseName = providerResult?.diagnosisResult?.disease || (providerResult?.diagnosisResult?.isHealthy ? 'Healthy Leaf' : null);
        diseaseConfidence = providerResult?.diagnosisResult?.confidence || 0.88;
        healthStatus = providerResult?.diagnosisResult?.healthStatus || (providerResult?.diagnosisResult?.isHealthy ? 'Healthy' : 'Disease Detected');
        diagnosisStatus = providerResult?.diagnosisResult?.diagnosisStatus || (providerResult?.diagnosisResult?.isHealthy ? 'HEALTHY' : 'DIAGNOSED');
        isHealthy = providerResult?.diagnosisResult?.isHealthy ?? false;
      } else {
        // Confirmed Open-World Species Outside 18 Crops (Squash, Bell Pepper, Guava, Tulsi, Wheat, Sugarcane, Rose, etc.)
        speciesName = generalResult.species;
        speciesConfidence = generalResult.confidence;
        speciesSource = 'GENERAL_PLANT_MODEL';

        outsideDiagnosis = diseaseDiagnosisProvider.diagnoseOutsideSpecies(
          speciesName,
          buffer,
          originalname,
          mimetype,
          generalResult.rawDetails
        );
        diseaseName = outsideDiagnosis.disease;
        diseaseConfidence = outsideDiagnosis.confidence;
        healthStatus = outsideDiagnosis.healthStatus;
        diagnosisStatus = outsideDiagnosis.diagnosisStatus;
        isHealthy = outsideDiagnosis.isHealthy;
      }
    } else {
      // Botanical species is outside supported classes or cannot be identified with high confidence:
      // Safely return UNKNOWN_SPECIES without guessing Tomato or Neem
      res.status(400).json({
        success: false,
        isValid: false,
        isPlant: true,
        species: null,
        speciesConfidence: null,
        speciesSource: 'GENERAL_PLANT_MODEL',
        disease: null,
        diseaseConfidence: null,
        healthStatus: null,
        diagnosisStatus: 'UNKNOWN_SPECIES',
        recommendations: [],
        products: [],
        nearbyShops: [],
        error: 'UNKNOWN_SPECIES',
        reason: 'unsupported_species',
        message: 'The plant foliage could not be reliably matched to a supported agricultural species. AgroMitra does not guess unsupported species.',
        is_valid: false,
        isSupportedSpecies: false,
        is_tomato: false,
      });
      return;
    }

    // 5. Query dynamic real product recommendations and nearby shop inventory
    const { products, nearbyShops } = await agriculturalRecommendationProvider.getRecommendationsAndShops(
      speciesName,
      diseaseName,
      isHealthy,
      farmerCoords
    );

    // Base64 thumbnail generation for history display
    let imageDataUri: string | undefined;
    if (buffer.length <= 1.5 * 1024 * 1024) {
      imageDataUri = `data:${mimetype};base64,${buffer.toString('base64')}`;
    }

    const plantInfo = speciesName
      ? (PLANT_SPECIES_DATABASE[speciesName] || OPEN_WORLD_BOTANICAL_REGISTRY[speciesName])
      : null;
    const teluguName = (plantInfo as any)?.telugu || (plantInfo as any)?.teluguName;
    const cropDisplay =
      (speciesSource === 'GENERAL_PLANT_MODEL' && plantInfo)
        ? `${speciesName}${teluguName ? ` (${teluguName})` : ''}`
        : predictionData?.crop ||
          (plantInfo && speciesName ? `${speciesName}${teluguName ? ` (${teluguName})` : ''}` : speciesName || 'Crop');

    const outsideRec =
      (diagnosisStatus === 'DISEASE_UNCERTAIN' || speciesSource === 'GENERAL_PLANT_MODEL')
        ? outsideDiagnosis?.recommendation
        : null;

    const recText =
      outsideRec?.explanation ||
      (typeof predictionData?.recommendation === 'string'
        ? predictionData.recommendation
        : predictionData?.recommendation?.explanation ||
          'Continue regular crop care and periodic scouting.');

    const recActions: string[] =
      outsideRec?.disease_management?.length
        ? [recText, ...outsideRec.disease_management.slice(0, 2)]
        : outsideRec?.prevention?.length
        ? [recText, ...outsideRec.prevention.slice(0, 2)]
        : predictionData?.recommended_actions ||
          (predictionData?.recommendation?.disease_management
            ? [recText, ...predictionData.recommendation.disease_management.slice(0, 2)]
            : [recText]);

    let analysisRecord: any;
    if (req.user && req.user._id) {
      analysisRecord = await CropAnalysis.create({
        farmer: req.user._id,
        imageName: originalname,
        imageData: imageDataUri,
        crop: cropDisplay,
        disease: diseaseName || (isHealthy ? 'Healthy Leaf' : 'Pathology Detected'),
        isHealthy,
        confidence: speciesConfidence ?? 0,
        isConfident: (speciesConfidence ?? 0) >= 0.35,
        symptoms: outsideDiagnosis?.symptoms || predictionData?.symptoms || [],
        recommendedActions: recActions,
        disclaimer: predictionData?.disclaimer || outsideRec?.safety_note || DEFAULT_DISCLAIMER,
      });
      analysisRecord = analysisRecord.toObject ? analysisRecord.toObject() : analysisRecord;
      analysisRecord.isValid = true;
      analysisRecord.is_valid = true;
      analysisRecord.isSupportedSpecies = true;
      analysisRecord.species = speciesName;
      analysisRecord.is_tomato = speciesName === 'Tomato';
    } else {
      analysisRecord = {
        imageName: originalname,
        imageData: imageDataUri,
        crop: cropDisplay,
        disease: diseaseName || (isHealthy ? 'Healthy Leaf' : 'Pathology Detected'),
        isValid: true,
        is_valid: true,
        isSupportedSpecies: true,
        species: speciesName,
        is_tomato: speciesName === 'Tomato',
        isHealthy,
        confidence: speciesConfidence ?? 0,
        isConfident: (speciesConfidence ?? 0) >= 0.35,
        symptoms: outsideDiagnosis?.symptoms || predictionData?.symptoms || [],
        recommendedActions: recActions,
        disclaimer: predictionData?.disclaimer || outsideRec?.safety_note || DEFAULT_DISCLAIMER,
        createdAt: new Date().toISOString(),
      };
    }

    const responsePayload: StandardAgriculturalResponse = {
      success: true,
      isValid: true,
      isPlant: true,
      species: speciesName,
      speciesConfidence: speciesConfidence !== null ? Number(speciesConfidence.toFixed(4)) : null,
      speciesSource,
      disease: diseaseName,
      diseaseConfidence: diseaseConfidence !== null ? Number(diseaseConfidence.toFixed(4)) : null,
      healthStatus,
      diagnosisStatus,
      recommendations: recActions,
      products,
      nearbyShops,
      error: null,
      // Backward compatibility fields
      crop: cropDisplay,
      condition: diseaseName || undefined,
      is_healthy: isHealthy,
      confidence: speciesConfidence ?? 0,
      plant: predictionData?.plant || (speciesName ? {
        name: speciesName,
        displayName: cropDisplay,
        confidence: Math.round((speciesConfidence ?? 0) * 100),
      } : undefined),
      health: predictionData?.health || {
        status: isHealthy ? 'Healthy' : diagnosisStatus === 'DISEASE_UNCERTAIN' ? 'Uncertain' : 'Diseased',
        confidence: Math.round((diseaseConfidence ?? speciesConfidence ?? 0) * 100),
      },
      diagnosis: predictionData?.diagnosis || (diseaseName && !isHealthy ? {
        name: diseaseName,
        confidence: Math.round((diseaseConfidence ?? 0) * 100),
      } : null),
      severity: outsideDiagnosis?.severity || predictionData?.severity || (isHealthy ? 'None' : diagnosisStatus === 'DISEASE_UNCERTAIN' ? 'Unknown' : 'Moderate'),
      recommendation: outsideRec || predictionData?.structuredRecommendation || predictionData?.recommendation,
      safety_note: outsideRec?.safety_note || predictionData?.safety_note || DEFAULT_DISCLAIMER,
      top5: predictionData?.top5,
      data: analysisRecord,
      analysis: analysisRecord,
      is_tomato: speciesName === 'Tomato',
      is_valid: true,
      isSupportedSpecies: true,
      message: `${speciesName} leaf analysis completed successfully.`,
    };

    res.status(200).json(responsePayload);

  } catch (error) {
    next(error);
  }
};

/**
 * Get authenticated farmer's prediction history
 * GET /api/crop-health/history
 */
export const getPredictionHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const filter = user.role === 'ADMIN' ? {} : { farmer: user._id };
    const history = await CropAnalysis.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single prediction by ID
 * GET /api/crop-health/history/:id
 */
export const getPredictionById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const { id } = req.params;
    const filter = user.role === 'ADMIN' ? { _id: id } : { _id: id, farmer: user._id };
    const analysis = await CropAnalysis.findOne(filter);

    if (!analysis) {
      res.status(404).json({
        success: false,
        message: 'Analysis record not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      analysis,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete prediction record
 * DELETE /api/crop-health/history/:id
 */
export const deletePrediction = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const { id } = req.params;
    const filter = user.role === 'ADMIN' ? { _id: id } : { _id: id, farmer: user._id };
    const deleted = await CropAnalysis.findOneAndDelete(filter);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Analysis record not found or already deleted.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Analysis record deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
