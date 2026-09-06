import * as ort from 'onnxruntime-node';
import * as path from 'path';
import * as fs from 'fs';
import * as jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import {
  UNIVERSAL_PATHOLOGY_DATABASE,
  PLANT_SPECIES_DATABASE,
  UniversalScannerResult,
  DEFAULT_DISCLAIMER,
  analyzeLeafBuffer,
} from '../controllers/cropHealth.controller';

interface ModelMetadata {
  species_list: string[];
  condition_list: string[];
  classes: string[];
}

export class NodeOnnxPathologyEngine {
  private session: ort.InferenceSession | null = null;
  private metadata: ModelMetadata | null = null;
  private initialized: boolean = false;
  private initPromise: Promise<boolean> | null = null;

  constructor() {
    this.initPromise = this.initialize();
  }

  public async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      const modelCandidates = [
        path.join(__dirname, '..', '..', 'crop_disease_model.onnx'),
        path.join(process.cwd(), 'crop_disease_model.onnx'),
        path.join(process.cwd(), 'backend', 'crop_disease_model.onnx'),
        path.join(__dirname, 'crop_disease_model.onnx'),
      ];

      const metaCandidates = [
        path.join(__dirname, '..', '..', 'model_metadata.json'),
        path.join(process.cwd(), 'model_metadata.json'),
        path.join(process.cwd(), 'backend', 'model_metadata.json'),
        path.join(__dirname, 'model_metadata.json'),
      ];

      let modelPath = '';
      for (const p of modelCandidates) {
        if (fs.existsSync(p)) {
          modelPath = p;
          break;
        }
      }

      let metaPath = '';
      for (const p of metaCandidates) {
        if (fs.existsSync(p)) {
          metaPath = p;
          break;
        }
      }

      if (!modelPath) {
        console.warn('⚠️ [ONNX Engine]: crop_disease_model.onnx not found at any candidate paths.');
        return false;
      }

      if (metaPath) {
        const metaRaw = fs.readFileSync(metaPath, 'utf-8');
        this.metadata = JSON.parse(metaRaw);
      }

      this.session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
      });

      this.initialized = true;
      console.log(`✅ [ONNX Engine]: Successfully loaded deep learning model from ${modelPath}`);
      return true;
    } catch (err: any) {
      console.error('❌ [ONNX Engine Init Error]:', err.message);
      return false;
    }
  }

  private preprocessImage(buffer: Buffer, mimetype: string): Float32Array | null {
    try {
      let width = 0;
      let height = 0;
      let rgbaData: Uint8Array | Buffer | null = null;

      if (mimetype.includes('png') || (buffer[0] === 0x89 && buffer[1] === 0x50)) {
        const png = PNG.sync.read(buffer);
        width = png.width;
        height = png.height;
        rgbaData = png.data;
      } else {
        const decoded = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true });
        width = decoded.width;
        height = decoded.height;
        rgbaData = decoded.data;
      }

      if (!rgbaData || width === 0 || height === 0) {
        return null;
      }

      const targetW = 224;
      const targetH = 224;
      const floatTensor = new Float32Array(3 * targetW * targetH);

      const mean = [0.485, 0.456, 0.406];
      const std = [0.229, 0.224, 0.225];

      for (let y = 0; y < targetH; y++) {
        const srcY = Math.min(height - 1, Math.floor((y / targetH) * height));
        for (let x = 0; x < targetW; x++) {
          const srcX = Math.min(width - 1, Math.floor((x / targetW) * width));
          const srcIdx = (srcY * width + srcX) * 4;

          const r = rgbaData[srcIdx] / 255.0;
          const g = rgbaData[srcIdx + 1] / 255.0;
          const b = rgbaData[srcIdx + 2] / 255.0;

          const targetIdx = y * targetW + x;
          floatTensor[0 * targetW * targetH + targetIdx] = (r - mean[0]) / std[0];
          floatTensor[1 * targetW * targetH + targetIdx] = (g - mean[1]) / std[1];
          floatTensor[2 * targetW * targetH + targetIdx] = (b - mean[2]) / std[2];
        }
      }

      return floatTensor;
    } catch (err) {
      console.error('Image preprocessing error:', err);
      return null;
    }
  }

  private softmax(logits: Float32Array | number[]): number[] {
    const maxVal = Math.max(...logits);
    const exps = Array.from(logits).map((v) => Math.exp(v - maxVal));
    const sumExp = exps.reduce((acc, v) => acc + v, 0);
    return exps.map((v) => v / (sumExp || 1));
  }

  public async predict(buffer: Buffer, originalname: string = 'image.jpg', mimetype: string = 'image/jpeg'): Promise<UniversalScannerResult | null> {
    if (!this.initialized && this.initPromise) {
      await this.initPromise;
    }

    if (!this.session || !this.metadata) {
      return null;
    }

    const feat = analyzeLeafBuffer(buffer);
    if (!feat.isFoliar) {
      return {
        success: false,
        error: 'INVALID_IMAGE_QUALITY',
        message: 'Please upload a clear photo of a plant leaf.',
        plant: { name: 'Unknown', confidence: 0 },
        health: { status: 'Unknown', confidence: 0 },
        diagnosis: null,
        severity: 'Unknown',
        recommendation: 'Please upload a clear close-up photo of a plant leaf in natural daylight.',
        is_confident: false,
        crop: 'Unknown Plant',
        disease: 'Please upload a clear photo of a plant leaf.',
        is_healthy: false,
        confidence: 0,
        disclaimer: DEFAULT_DISCLAIMER,
      };
    }

    const floatData = this.preprocessImage(buffer, mimetype);
    if (!floatData) {
      return null;
    }

    try {
      const tensor = new ort.Tensor('float32', floatData, [1, 3, 224, 224]);
      const results = await this.session.run({ image: tensor });

      const speciesLogits = results.species_logits.data as Float32Array;
      const conditionLogits = results.condition_logits.data as Float32Array;
      const jointLogits = results.joint_logits.data as Float32Array;

      const speciesProbs = this.softmax(speciesLogits);
      const conditionProbs = this.softmax(conditionLogits);
      const jointProbs = this.softmax(jointLogits);

      const speciesList = this.metadata.species_list;
      const conditionList = this.metadata.condition_list;
      const classesList = this.metadata.classes;

      // 1. Decoupled Top-1 Species
      let topSpeciesIdx = 0;
      let topSpeciesProb = 0;
      for (let i = 0; i < speciesProbs.length; i++) {
        if (speciesProbs[i] > topSpeciesProb) {
          topSpeciesProb = speciesProbs[i];
          topSpeciesIdx = i;
        }
      }
      const predSpecies = speciesList[topSpeciesIdx] || 'Unknown';

      // 2. Decoupled Top-1 Condition
      let topCondIdx = 0;
      let topCondProb = 0;
      for (let i = 0; i < conditionProbs.length; i++) {
        if (conditionProbs[i] > topCondProb) {
          topCondProb = conditionProbs[i];
          topCondIdx = i;
        }
      }
      const rawCondition = conditionList[topCondIdx] || 'Healthy';

      // 3. Decoupled Top-1 Joint Pathology
      let topJointIdx = 0;
      let topJointProb = 0;
      for (let i = 0; i < jointProbs.length; i++) {
        if (jointProbs[i] > topJointProb) {
          topJointProb = jointProbs[i];
          topJointIdx = i;
        }
      }
      const jointClass = classesList[topJointIdx] || 'Unknown___unsupported';

      // Map raw condition to user-facing health status
      let healthStatus = 'Diseased';
      if (rawCondition === 'Healthy' || jointClass.endsWith('___healthy')) {
        healthStatus = 'Healthy';
      } else if (rawCondition === 'Viral_Infection' || jointClass.includes('virus') || jointClass.includes('Virus')) {
        healthStatus = 'Viral Infection';
      } else if (rawCondition === 'Pest_Damage' || jointClass.includes('mite') || jointClass.includes('Mite')) {
        healthStatus = 'Pest Damage';
      } else if (rawCondition === 'Non_Foliar_Background' || predSpecies === 'Background' || predSpecies === 'Unknown') {
        healthStatus = 'Unknown';
      }

      // Resolve plant display name
      const plantInfo = PLANT_SPECIES_DATABASE[predSpecies];
      const plantDisplay = plantInfo ? `${predSpecies} (${plantInfo.telugu})` : predSpecies;

      // Resolve diagnosis details from pathology database
      const pathology = UNIVERSAL_PATHOLOGY_DATABASE[jointClass] || {
        plant: predSpecies,
        plant_display: plantDisplay,
        health_status: healthStatus,
        diagnosis: null,
        severity: 'None',
        is_healthy: healthStatus === 'Healthy',
        recommendation: 'No visible disease detected. Maintain standard agronomic practices.',
        symptoms: ['Normal vegetative foliage.'],
      };

      const isHealthy = healthStatus === 'Healthy';
      const CONFIDENCE_THRESHOLD = 0.35;

      if (topSpeciesProb < CONFIDENCE_THRESHOLD || predSpecies === 'Background' || predSpecies === 'Unknown') {
        return {
          success: true,
          plant: { name: 'Unknown', confidence: Math.round(topSpeciesProb * 100) },
          health: { status: 'Unknown', confidence: Math.round(topCondProb * 100) },
          diagnosis: null,
          severity: 'Unknown',
          recommendation: 'The image could not be reliably identified. Please upload a clear close-up image of the leaf.',
          is_confident: false,
          crop: 'Unknown Plant',
          disease: 'Insufficient visual evidence or unsupported plant species.',
          is_healthy: false,
          confidence: Number(topSpeciesProb.toFixed(4)),
          symptoms: ['Visual leaf morphology does not match known high-confidence plant categories in the database.'],
          recommended_actions: ['Capture a sharp close-up photo of the leaf in natural daylight.', 'Consult your local Agricultural Extension Officer (AEO) for field confirmation.'],
          disclaimer: DEFAULT_DISCLAIMER,
        };
      }

      const diagnosisObj = !isHealthy && pathology.diagnosis ? {
        name: pathology.diagnosis,
        confidence: Math.round(topJointProb * 100),
      } : null;

      // Build Top-5 Joint Predictions
      const sortedJoint = classesList.map((cls, idx) => {
        const pInfo = UNIVERSAL_PATHOLOGY_DATABASE[cls] || {
          plant: cls.split('___')[0],
          plant_display: cls.split('___')[0],
          health_status: 'Healthy',
          diagnosis: null,
          severity: 'None',
          is_healthy: true,
        };
        return {
          className: cls,
          crop: pInfo.plant_display,
          plant: pInfo.plant,
          disease: pInfo.diagnosis || (pInfo.is_healthy ? 'Healthy Crop' : 'Pathology'),
          health_status: pInfo.health_status,
          probability: Number(jointProbs[idx].toFixed(4)),
        };
      }).sort((a, b) => b.probability - a.probability).slice(0, 5);

      return {
        success: true,
        plant: {
          name: predSpecies,
          displayName: plantDisplay,
          confidence: Math.round(topSpeciesProb * 100),
        },
        health: {
          status: healthStatus,
          confidence: Math.round(topCondProb * 100),
        },
        diagnosis: diagnosisObj,
        severity: isHealthy ? 'None' : pathology.severity,
        recommendation: pathology.recommendation,
        is_confident: true,
        crop: plantDisplay,
        disease: isHealthy ? 'Healthy Crop (ఆరోగ్యకరమైన పంట)' : (pathology.diagnosis || 'Detected Pathology'),
        is_healthy: isHealthy,
        confidence: Number(topSpeciesProb.toFixed(4)),
        top5: sortedJoint,
        symptoms: pathology.symptoms,
        recommended_actions: [pathology.recommendation],
        disclaimer: DEFAULT_DISCLAIMER,
      };
    } catch (err: any) {
      console.error('ONNX prediction error:', err);
      return null;
    }
  }
}

export const onnxPathologyEngine = new NodeOnnxPathologyEngine();
