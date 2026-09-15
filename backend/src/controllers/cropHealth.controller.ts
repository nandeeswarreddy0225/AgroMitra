import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { CropAnalysis } from '../models/CropAnalysis.model';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { onnxPathologyEngine } from '../services/onnxInference.service';

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
  modelVersion?: number;
  plant: {
    name: string;
    displayName?: string;
    confidence: number;
  };
  health: {
    status: string;
    confidence: number;
  };
  diagnosis: {
    name: string;
    confidence?: number;
  } | null;
  severity: string;
  recommendation: any;
  structuredRecommendation?: StructuredRecommendation;
  safety_note?: string;
  // Legacy / backward compatibility
  is_confident?: boolean;
  crop?: string;
  disease?: string;
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
        message: 'Please upload an image file of the plant leaf to analyze.',
      });
      return;
    }

    const { originalname, mimetype, buffer } = req.file;

    let predictionData: UniversalScannerResult | null = null;

    // 1. In-process deep learning inference using embedded ONNX model
    try {
      predictionData = await onnxPathologyEngine.predict(buffer, originalname, mimetype);
    } catch (onnxErr: any) {
      console.warn('⚠️ [ONNX Engine Notice]: Embedded inference notice:', onnxErr.message);
    }

    // 2. If in-process ONNX did not produce a result, connect to Python AI microservice
    if (!predictionData && AI_SERVICE_URL) {
      try {
        const formData = new FormData();
        formData.append('image', buffer, {
          filename: originalname,
          contentType: mimetype,
        });

        const aiResponse = await axios.post(`${AI_SERVICE_URL}/predict`, formData, {
          headers: { ...formData.getHeaders() },
          timeout: 10000,
          validateStatus: () => true,
        });

        if (aiResponse.data) {
          predictionData = aiResponse.data;
        }
      } catch (aiErr: any) {
        console.warn(`⚠️ [AI Service Notice]: Remote AI service unavailable at ${AI_SERVICE_URL} (${aiErr.message})`);
      }
    }

    if (!predictionData) {
      res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'AI leaf analysis is temporarily unavailable. Please try again.',
      });
      return;
    }

    // If Stage 0 Image Quality check failed or low confidence, return user-facing 400 rejection
    if (!predictionData.success) {
      res.status(400).json({
        success: false,
        error: predictionData.error || 'ANALYSIS_FAILED',
        reason: predictionData.reason || 'invalid_image',
        message: predictionData.message || 'Please upload or scan a clear crop leaf image.',
        plant: predictionData.plant,
        health: predictionData.health,
        diagnosis: null,
        severity: 'Unknown',
        recommendation: predictionData.recommendation,
      });
      return;
    }

    // Base64 thumbnail generation for history display
    let imageDataUri: string | undefined;
    if (buffer.length <= 1.5 * 1024 * 1024) {
      imageDataUri = `data:${mimetype};base64,${buffer.toString('base64')}`;
    }

    let analysisRecord: any;

    const cropName = predictionData.crop || (predictionData.plant ? predictionData.plant.displayName || predictionData.plant.name : 'Unknown Plant');
    const diseaseName = predictionData.disease || (predictionData.diagnosis ? predictionData.diagnosis.name : (predictionData.health?.status === 'Healthy' ? 'Healthy Crop' : 'Unknown Condition'));

    const recText = typeof predictionData.recommendation === 'string'
      ? predictionData.recommendation
      : (predictionData.recommendation?.explanation || 'Continue regular crop care and periodic scouting.');

    const recActions = predictionData.recommended_actions || (
      predictionData.recommendation?.disease_management
        ? [recText, ...predictionData.recommendation.disease_management.slice(0, 2)]
        : [recText]
    );

    if (user) {
      analysisRecord = await CropAnalysis.create({
        farmer: user._id,
        imageName: originalname,
        imageData: imageDataUri,
        crop: cropName,
        disease: diseaseName,
        isHealthy: predictionData.is_healthy ?? (predictionData.health?.status === 'Healthy'),
        confidence: predictionData.confidence ?? (predictionData.plant?.confidence ? predictionData.plant.confidence / 100 : 0),
        isConfident: predictionData.is_confident ?? (predictionData.plant?.name !== 'Unknown'),
        symptoms: predictionData.symptoms || [],
        recommendedActions: recActions,
        disclaimer: predictionData.disclaimer || DEFAULT_DISCLAIMER,
      });
    } else {
      analysisRecord = {
        imageName: originalname,
        imageData: imageDataUri,
        crop: cropName,
        disease: diseaseName,
        isHealthy: predictionData.is_healthy ?? (predictionData.health?.status === 'Healthy'),
        confidence: predictionData.confidence ?? (predictionData.plant?.confidence ? predictionData.plant.confidence / 100 : 0),
        isConfident: predictionData.is_confident ?? (predictionData.plant?.name !== 'Unknown'),
        symptoms: predictionData.symptoms || [],
        recommendedActions: recActions,
        disclaimer: predictionData.disclaimer || DEFAULT_DISCLAIMER,
        createdAt: new Date().toISOString(),
      };
    }

    res.status(200).json({
      success: true,
      message: 'Universal leaf analysis completed successfully.',
      crop: cropName,
      condition: diseaseName,
      confidence: predictionData.confidence,
      is_healthy: predictionData.is_healthy,
      plant: predictionData.plant,
      health: predictionData.health,
      diagnosis: predictionData.diagnosis,
      severity: predictionData.severity,
      recommendation: predictionData.structuredRecommendation || predictionData.recommendation,
      safety_note: predictionData.safety_note || DEFAULT_DISCLAIMER,
      top5: predictionData.top5,
      analysis: analysisRecord,
    });
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
