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
} from '../controllers/cropHealth.controller';
import {
  getCropAndConditionGuidance,
  StructuredRecommendation,
  DEFAULT_SAFETY_NOTE,
} from './diseaseGuidance.service';

interface ModelMetadata {
  species_list: string[];
  condition_list: string[];
  classes: string[];
  version?: number;
  num_classes?: number;
  num_species?: number;
  num_conditions?: number;
}

interface DecodedImage {
  width: number;
  height: number;
  data: Uint8Array | Buffer;
}

export class NodeOnnxPathologyEngine {
  private session: ort.InferenceSession | null = null;
  private metadata: ModelMetadata | null = null;
  private initialized: boolean = false;
  private initPromise: Promise<boolean> | null = null;
  private cropToIndices: Record<string, number[]> = {};
  private loadedModelPath: string = '';
  private loadedMetaPath: string = '';

  constructor() {
    this.initPromise = this.initialize();
  }

  public getModelInfo(): {
    modelPath: string;
    metaPath: string;
    version: number;
    numClasses: number;
    initialized: boolean;
  } {
    return {
      modelPath: this.loadedModelPath,
      metaPath: this.loadedMetaPath,
      version: this.metadata?.version || (this.metadata?.classes?.length === 49 ? 3 : 1),
      numClasses: this.metadata?.classes?.length || 0,
      initialized: this.initialized,
    };
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

      this.loadedModelPath = modelPath;
      this.loadedMetaPath = metaPath;

      if (metaPath) {
        const metaRaw = fs.readFileSync(metaPath, 'utf-8');
        this.metadata = JSON.parse(metaRaw);

        // Precompute crop to class index mapping
        if (this.metadata && this.metadata.classes) {
          this.cropToIndices = {};
          for (let i = 0; i < this.metadata.classes.length; i++) {
            const cls = this.metadata.classes[i];
            const crop = this.extractCrop(cls);
            if (!this.cropToIndices[crop]) {
              this.cropToIndices[crop] = [];
            }
            this.cropToIndices[crop].push(i);
          }
        }
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

  private extractCrop(clsName: string): string {
    if (clsName.includes('___')) {
      const c = clsName.split('___')[0];
      return c === 'Pepper_bell' ? 'Chilli' : c;
    }
    return 'Unknown';
  }

  private decodeImageBuffer(buffer: Buffer, mimetype: string): DecodedImage | null {
    try {
      if (mimetype.includes('png') || (buffer[0] === 0x89 && buffer[1] === 0x50)) {
        const png = PNG.sync.read(buffer);
        return { width: png.width, height: png.height, data: png.data };
      }

      const decoded = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true });
      if (decoded && decoded.width > 0 && decoded.height > 0) {
        return { width: decoded.width, height: decoded.height, data: decoded.data };
      }

      return null;
    } catch (err) {
      return null;
    }
  }

  private validateDecodedFoliarQuality(decoded: DecodedImage): { isValid: boolean; message: string } {
    const { width, height, data } = decoded;
    if (width < 64 || height < 64) {
      return { isValid: false, message: 'Please upload or scan a clear crop leaf image (minimum 100x100 pixels).' };
    }

    const totalPixels = width * height;
    const sampleStep = Math.max(1, Math.floor(totalPixels / 10000));
    let foliarCount = 0;
    let lumSum = 0;
    let lumSqSum = 0;
    let sampledCount = 0;

    for (let i = 0; i < totalPixels; i += sampleStep) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      lumSum += lum;
      lumSqSum += lum * lum;
      sampledCount++;

      // Check foliar spectral characteristics on decoded RGB
      const isGreen = g > r * 0.88 && g > b * 1.05 && g > 30;
      const isYellowChlorotic = r > 100 && g > 100 && b < 110 && Math.abs(r - g) < 55;
      const isNecroticBrown = r > 60 && g > 35 && b < 65 && r > g && g > b;
      const isOlive = g > b && g > 25 && r < 140 && (2 * g - r - b) > -10;

      if (isGreen || isYellowChlorotic || isNecroticBrown || isOlive) {
        foliarCount++;
      }
    }

    const meanLum = sampledCount > 0 ? lumSum / sampledCount : 128;
    const varLum = sampledCount > 0 ? (lumSqSum / sampledCount) - (meanLum * meanLum) : 100;
    const stdLum = Math.sqrt(Math.max(0, varLum));
    const foliarRatio = sampledCount > 0 ? foliarCount / sampledCount : 0;

    if (meanLum < 10) {
      return { isValid: false, message: 'Image is too dark to analyze. Please capture a clear leaf photo in daylight.' };
    }
    if (meanLum > 248 && stdLum < 8) {
      return { isValid: false, message: 'Image is overexposed or blank. Please upload a clear photo of a crop leaf.' };
    }
    if (foliarRatio < 0.03 && stdLum < 40) {
      return { isValid: false, message: 'Please upload or scan a clear crop leaf image.' };
    }

    // Discrete Laplacian variance check for blurriness
    if (width >= 10 && height >= 10) {
      let lapSum = 0;
      let lapSqSum = 0;
      let lapCount = 0;
      for (let y = 1; y < height - 1; y += 2) {
        for (let x = 1; x < width - 1; x += 2) {
          const cIdx = (y * width + x) * 4;
          const uIdx = ((y - 1) * width + x) * 4;
          const dIdx = ((y + 1) * width + x) * 4;
          const lIdx = (y * width + (x - 1)) * 4;
          const rIdx = (y * width + (x + 1)) * 4;

          const gC = 0.299 * data[cIdx] + 0.587 * data[cIdx + 1] + 0.114 * data[cIdx + 2];
          const gU = 0.299 * data[uIdx] + 0.587 * data[uIdx + 1] + 0.114 * data[uIdx + 2];
          const gD = 0.299 * data[dIdx] + 0.587 * data[dIdx + 1] + 0.114 * data[dIdx + 2];
          const gL = 0.299 * data[lIdx] + 0.587 * data[lIdx + 1] + 0.114 * data[lIdx + 2];
          const gR = 0.299 * data[rIdx] + 0.587 * data[rIdx + 1] + 0.114 * data[rIdx + 2];

          const lap = gU + gD + gL + gR - 4 * gC;
          lapSum += lap;
          lapSqSum += lap * lap;
          lapCount++;
        }
      }
      const lapVar = lapCount > 0 ? (lapSqSum / lapCount) - Math.pow(lapSum / lapCount, 2) : 100;
      if (lapVar < 20.0) {
        return {
          isValid: false,
          message: 'The image is too blurry or out of focus. Please hold the camera steady and capture a sharp photo of the leaf.'
        };
      }
    }

    return { isValid: true, message: 'OK' };
  }

  private preprocessImage(decoded: DecodedImage): Float32Array {
    const { width, height, data } = decoded;
    const targetW = 224;
    const targetH = 224;
    const floatTensor = new Float32Array(3 * targetW * targetH);

    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    // High quality bilinear sampling from source image to 224x224
    for (let y = 0; y < targetH; y++) {
      const srcY = (y + 0.5) * (height / targetH) - 0.5;
      const y0 = Math.max(0, Math.min(height - 1, Math.floor(srcY)));
      const y1 = Math.max(0, Math.min(height - 1, Math.ceil(srcY)));
      const yWeight = srcY - y0;

      for (let x = 0; x < targetW; x++) {
        const srcX = (x + 0.5) * (width / targetW) - 0.5;
        const x0 = Math.max(0, Math.min(width - 1, Math.floor(srcX)));
        const x1 = Math.max(0, Math.min(width - 1, Math.ceil(srcX)));
        const xWeight = srcX - x0;

        const idx00 = (y0 * width + x0) * 4;
        const idx10 = (y0 * width + x1) * 4;
        const idx01 = (y1 * width + x0) * 4;
        const idx11 = (y1 * width + x1) * 4;

        // Bilinear interpolation for R, G, B
        for (let c = 0; c < 3; c++) {
          const top = (1 - xWeight) * data[idx00 + c] + xWeight * data[idx10 + c];
          const bottom = (1 - xWeight) * data[idx01 + c] + xWeight * data[idx11 + c];
          const val = ((1 - yWeight) * top + yWeight * bottom) / 255.0;

          const targetIdx = y * targetW + x;
          floatTensor[c * targetW * targetH + targetIdx] = (val - mean[c]) / std[c];
        }
      }
    }

    return floatTensor;
  }

  private softmax(logits: Float32Array | number[]): number[] {
    const maxVal = Math.max(...logits);
    const exps = Array.from(logits).map((v) => Math.exp(v - maxVal));
    const sumExp = exps.reduce((acc, v) => acc + v, 0);
    return exps.map((v) => v / (sumExp || 1));
  }

  public async predict(
    buffer: Buffer,
    originalname: string = 'image.jpg',
    mimetype: string = 'image/jpeg'
  ): Promise<UniversalScannerResult | null> {
    if (!this.initialized && this.initPromise) {
      await this.initPromise;
    }

    if (!this.session || !this.metadata) {
      return null;
    }

    const decoded = this.decodeImageBuffer(buffer, mimetype);
    if (!decoded) {
      // Decode not supported by jpeg-js (e.g. webp or progressive jpeg)
      return null;
    }

    // Stage 0: True Decoded Foliar Quality Check
    const quality = this.validateDecodedFoliarQuality(decoded);
    if (!quality.isValid) {
      return {
        success: false,
        error: 'INVALID_IMAGE_QUALITY',
        message: quality.message,
        plant: { name: 'Unknown', confidence: 0 },
        health: { status: 'Unknown', confidence: 0 },
        diagnosis: null,
        severity: 'Unknown',
        recommendation: quality.message,
        is_confident: false,
        crop: 'Unknown Plant',
        disease: quality.message,
        is_healthy: false,
        confidence: 0,
        disclaimer: DEFAULT_DISCLAIMER,
      };
    }

    const floatData = this.preprocessImage(decoded);

    try {
      const tensor = new ort.Tensor('float32', floatData, [1, 3, 224, 224]);
      const results = await this.session.run({ image: tensor });

      // 1. Stage 1: Crop/Species Identification via Species Head ONLY
      const speciesLogits = results.species_logits.data as Float32Array;
      const speciesProbs = this.softmax(speciesLogits);
      const speciesList = this.metadata.species_list || [];

      let bestSpeciesIdx = 0;
      let bestCropProb = speciesProbs[0] || 0;
      for (let i = 1; i < speciesProbs.length; i++) {
        if (speciesProbs[i] > bestCropProb) {
          bestCropProb = speciesProbs[i];
          bestSpeciesIdx = i;
        }
      }
      const bestCrop = speciesList[bestSpeciesIdx] || 'Unknown';

      const CONFIDENCE_THRESHOLD = 0.35;
      const isNonLeaf =
        bestCrop === 'Background' ||
        bestCrop === 'Unknown' ||
        bestCropProb < CONFIDENCE_THRESHOLD;

      // 2. Stage 2: Crop-Constrained Pathology Diagnostic Head with Hard Masking
      const jointLogits = results.joint_logits.data as Float32Array;
      const classesList = this.metadata.classes;
      const subIndices = this.cropToIndices[bestCrop] || [];

      let selectedClass = 'Unknown___unsupported';
      let selectedClassProb = 0;
      let sortedJoint: Array<{
        className: string;
        crop: string;
        plant: string;
        disease: string;
        health_status: string;
        probability: number;
      }> = [];

      if (subIndices.length > 0) {
        // Evaluate softmax ONLY across the subclasses of bestCrop
        const subLogitsArray = new Float32Array(subIndices.map(idx => jointLogits[idx]));
        const subProbs = this.softmax(subLogitsArray);

        let bestSubLocalIdx = 0;
        let maxSubP = subProbs[0] || 0;
        for (let i = 1; i < subProbs.length; i++) {
          if (subProbs[i] > maxSubP) {
            maxSubP = subProbs[i];
            bestSubLocalIdx = i;
          }
        }

        const winningGlobalIdx = subIndices[bestSubLocalIdx];
        selectedClass = classesList[winningGlobalIdx];
        selectedClassProb = maxSubP;

        // Top distribution constrained ONLY to allowed classes of bestCrop (forbidden classes are 0)
        sortedJoint = subIndices
          .map((globalIdx, localIdx) => {
            const cls = classesList[globalIdx];
            const pInfo = UNIVERSAL_PATHOLOGY_DATABASE[cls] || {
              plant: bestCrop,
              plant_display: bestCrop,
              health_status: 'Healthy',
              diagnosis: null,
              severity: 'None',
              is_healthy: true,
            };
            const plantInfo = PLANT_SPECIES_DATABASE[bestCrop];
            const displayCrop = plantInfo ? `${bestCrop} (${plantInfo.telugu})` : bestCrop;

            return {
              className: cls,
              crop: displayCrop,
              plant: bestCrop,
              disease: pInfo.diagnosis || (pInfo.is_healthy ? 'Healthy Crop' : 'Pathology'),
              health_status: pInfo.health_status,
              probability: Number(subProbs[localIdx].toFixed(4)),
            };
          })
          .sort((a, b) => b.probability - a.probability);
      }

      if (bestCropProb < CONFIDENCE_THRESHOLD || isNonLeaf) {
        return {
          success: false,
          error: 'LOW_CONFIDENCE',
          message: 'The AI could not confidently identify this leaf. Please capture a clearer image with the leaf filling most of the frame.',
          plant: { name: 'Unknown', confidence: Math.round(bestCropProb * 100) },
          health: { status: 'Unknown', confidence: 0 },
          diagnosis: null,
          severity: 'Unknown',
          recommendation: 'The image could not be reliably identified. Please capture a clear close-up image with the leaf blade filling most of the viewfinder.',
          is_confident: false,
          crop: 'Unknown Plant',
          disease: 'Insufficient visual evidence or unsupported plant species.',
          is_healthy: false,
          confidence: Number(bestCropProb.toFixed(4)),
          top5: sortedJoint,
          symptoms: ['Visual leaf morphology does not match known high-confidence plant categories in the database.'],
          recommended_actions: [
            'Capture a sharp close-up photo of the leaf in natural daylight.',
            'Consult your local Agricultural Extension Officer (AEO) for field confirmation.',
          ],
          disclaimer: DEFAULT_DISCLAIMER,
        };
      }

      // Resolve pathology details
      const pathology = UNIVERSAL_PATHOLOGY_DATABASE[selectedClass] || {
        plant: bestCrop,
        plant_display: bestCrop,
        health_status: 'Diseased',
        diagnosis: selectedClass.replace('___', ' '),
        severity: 'Moderate',
        is_healthy: false,
        recommendation: 'Consult local agricultural officer.',
        symptoms: ['Visual foliar symptoms consistent with analyzed specimen.'],
      };

      const isHealthy = pathology.is_healthy || selectedClass.endsWith('___healthy');
      const healthStatus = isHealthy ? 'Healthy' : pathology.health_status;
      const diagnosisName = pathology.diagnosis || (isHealthy ? 'Healthy Crop (ఆరోగ్యకరమైన పంట)' : 'Detected Pathology');

      const plantInfo = PLANT_SPECIES_DATABASE[bestCrop];
      const plantDisplay = plantInfo ? `${bestCrop} (${plantInfo.telugu})` : bestCrop;

      // Structured Agricultural Recommendations Engine
      const structuredGuidance: StructuredRecommendation = getCropAndConditionGuidance(
        selectedClass,
        bestCrop,
        diagnosisName,
        isHealthy
      );

      const diagnosisObj = !isHealthy && pathology.diagnosis
        ? {
            name: pathology.diagnosis,
            confidence: Math.round(selectedClassProb * 100),
          }
        : null;

      return {
        success: true,
        plant: {
          name: bestCrop,
          displayName: plantDisplay,
          confidence: Math.round(bestCropProb * 100),
        },
        health: {
          status: healthStatus,
          confidence: Math.round(selectedClassProb * 100),
        },
        diagnosis: diagnosisObj,
        severity: isHealthy ? 'None' : pathology.severity,
        recommendation: structuredGuidance.explanation || pathology.recommendation,
        is_confident: true,
        crop: plantDisplay,
        disease: isHealthy ? 'Healthy Crop (ఆరోగ్యకరమైన పంట)' : (pathology.diagnosis || 'Detected Pathology'),
        is_healthy: isHealthy,
        confidence: Number(bestCropProb.toFixed(4)),
        top5: sortedJoint,
        symptoms: pathology.symptoms,
        recommended_actions: [
          structuredGuidance.explanation,
          ...structuredGuidance.disease_management.slice(0, 2),
        ],
        structuredRecommendation: structuredGuidance,
        safety_note: DEFAULT_SAFETY_NOTE,
        disclaimer: DEFAULT_DISCLAIMER,
        modelVersion: this.metadata?.version || 3,
      };
    } catch (err: any) {
      console.error('ONNX prediction error:', err);
      return null;
    }
  }
}

export const onnxPathologyEngine = new NodeOnnxPathologyEngine();
