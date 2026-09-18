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

  private validateDecodedFoliarQuality(decoded: DecodedImage): {
    isValid: boolean;
    isNonPlant?: boolean;
    message: string;
    foliarRatio: number;
    greenRatio: number;
    chlorophyllRatio: number;
    meanLum: number;
    stdLum: number;
    lapVar: number;
  } {
    const { width, height, data } = decoded;
    if (width < 64 || height < 64) {
      return {
        isValid: false,
        message: 'Please upload or scan a clear crop leaf image (minimum 100x100 pixels).',
        foliarRatio: 0,
        greenRatio: 0,
        chlorophyllRatio: 0,
        meanLum: 0,
        stdLum: 0,
        lapVar: 0,
      };
    }

    const totalPixels = width * height;
    const sampleStep = Math.max(1, Math.floor(totalPixels / 10000));
    let foliarCount = 0;
    let greenCount = 0;
    let chloroCount = 0;
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
      const isGreen = g > r * 0.95 && g > b * 1.05 && g > 25;
      const isYellowChlorotic = r > 100 && g > 90 && b < 110 && Math.abs(r - g) < 45 && g > r * 0.88;
      const isNecroticBrown = r > 50 && r < 155 && g > 30 && g < 120 && b < 70 && r > g && g > b;
      const isOlive = g > b * 1.08 && g > 25 && r < 140 && g > r * 0.85 && (2 * g - r - b) > 0;

      if (isGreen) {
        greenCount++;
      }
      if (isGreen || isOlive) {
        chloroCount++;
      }
      if (isGreen || isYellowChlorotic || isNecroticBrown || isOlive) {
        foliarCount++;
      }
    }

    const meanLum = sampledCount > 0 ? lumSum / sampledCount : 128;
    const varLum = sampledCount > 0 ? (lumSqSum / sampledCount) - (meanLum * meanLum) : 100;
    const stdLum = Math.sqrt(Math.max(0, varLum));
    const foliarRatio = sampledCount > 0 ? foliarCount / sampledCount : 0;
    const greenRatio = sampledCount > 0 ? greenCount / sampledCount : 0;
    const chlorophyllRatio = sampledCount > 0 ? chloroCount / sampledCount : 0;

    let lapVar = 100;
    // Discrete Laplacian variance check on normalized 224x224 grid to prevent false rejection of high-resolution images
    if (width >= 10 && height >= 10) {
      const targetW = 224;
      const targetH = 224;
      const gray = new Float32Array(targetW * targetH);

      for (let y = 0; y < targetH; y++) {
        const srcY = Math.floor(y * (height / targetH));
        for (let x = 0; x < targetW; x++) {
          const srcX = Math.floor(x * (width / targetW));
          const idx = (srcY * width + srcX) * 4;
          gray[y * targetW + x] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        }
      }

      let lapSum = 0;
      let lapSqSum = 0;
      let lapCount = 0;

      for (let y = 1; y < targetH - 1; y++) {
        for (let x = 1; x < targetW - 1; x++) {
          const gC = gray[y * targetW + x];
          const gU = gray[(y - 1) * targetW + x];
          const gD = gray[(y + 1) * targetW + x];
          const gL = gray[y * targetW + (x - 1)];
          const gR = gray[y * targetW + (x + 1)];

          const lap = gU + gD + gL + gR - 4 * gC;
          lapSum += lap;
          lapSqSum += lap * lap;
          lapCount++;
        }
      }

      lapVar = lapCount > 0 ? (lapSqSum / lapCount) - Math.pow(lapSum / lapCount, 2) : 100;
    }

    if (meanLum <= 15) {
      return {
        isValid: false,
        message: 'Image is too dark to analyze. Please capture a clear leaf photo in daylight.',
        foliarRatio,
        greenRatio,
        chlorophyllRatio,
        meanLum,
        stdLum,
        lapVar,
      };
    }
    if (meanLum > 248 && stdLum < 8) {
      return {
        isValid: false,
        message: 'Image is overexposed or blank. Please upload a clear photo of a crop leaf.',
        foliarRatio,
        greenRatio,
        chlorophyllRatio,
        meanLum,
        stdLum,
        lapVar,
      };
    }
    // Plant leaves must exhibit genuine foliar chromaticity
    if (foliarRatio < 0.06) {
      return {
        isValid: false,
        isNonPlant: true,
        message: 'Non-foliar or non-plant image detected. Please upload a clear crop leaf image.',
        foliarRatio,
        greenRatio,
        chlorophyllRatio,
        meanLum,
        stdLum,
        lapVar,
      };
    }

    if (lapVar < 15.0) {
      return {
        isValid: false,
        message: 'The image is too blurry or out of focus. Please hold the camera steady and capture a sharp photo of the leaf.',
        foliarRatio,
        greenRatio,
        chlorophyllRatio,
        meanLum,
        stdLum,
        lapVar,
      };
    }

    return {
      isValid: true,
      message: 'OK',
      foliarRatio,
      greenRatio,
      chlorophyllRatio,
      meanLum,
      stdLum,
      lapVar,
    };
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
      console.log(`[AI SCANNER] image received: ${originalname}`);
      console.log(`[AI SCANNER] image decode = FAILED (unsupported or malformed image format)`);
      console.log(`[AI SCANNER] species prediction = UNKNOWN`);
      console.log(`[AI SCANNER] FINAL = REJECT`);
      console.log(`[AI SCANNER] disease inference = NOT RUN`);
      return {
        success: false,
        isValid: false,
        is_valid: false,
        isSupportedSpecies: false,
        species: null,
        speciesConfidence: 0,
        disease: null,
        diseaseConfidence: 0,
        error: 'IMAGE_DECODE_FAILED',
        reason: 'invalid_image',
        message: 'Unable to decode image. Please upload a clear photo of a crop leaf.',
        is_tomato: false,
      };
    }

    // -------------------------------------------------------------------------
    // STAGE 0 — IMAGE VALIDITY / FOLIAR QUALITY
    // -------------------------------------------------------------------------
    const quality = this.validateDecodedFoliarQuality(decoded);
    if (!quality.isValid) {
      console.log(`[AI SCANNER] image received: ${originalname}`);
      console.log(`[AI SCANNER] IMAGE QUALITY = FAIL (${quality.message})`);
      console.log(`[AI SCANNER] TOP SPECIES = UNKNOWN`);
      console.log(`[AI SCANNER] SPECIES CONFIDENCE = 0.0%`);
      console.log(`[AI SCANNER] SPECIES MARGIN = 0.0%`);
      console.log(`[AI SCANNER] JOINT TOP = Unknown`);
      console.log(`[AI SCANNER] PLANT EVIDENCE = LOW`);
      console.log(`[AI SCANNER] SPECIES CONSISTENCY = FAIL`);
      console.log(`[AI SCANNER] species prediction = UNKNOWN/NON_PLANT`);
      console.log(`[AI SCANNER] FINAL = REJECT`);
      console.log(`[AI SCANNER] disease inference = NOT RUN`);

      return {
        success: false,
        isValid: false,
        is_valid: false,
        isSupportedSpecies: false,
        species: null,
        speciesConfidence: 0,
        disease: null,
        diseaseConfidence: 0,
        error: quality.isNonPlant ? 'NON_PLANT_REJECTED' : 'INVALID_IMAGE_QUALITY',
        reason: quality.isNonPlant ? 'non_plant_rejection' : 'invalid_image',
        message: quality.message || 'Please upload a clear agricultural plant/leaf image.',
        detectedCrop: quality.isNonPlant ? 'Non-Plant' : 'Invalid Image',
        is_tomato: false,
      };
    }

    const floatData = this.preprocessImage(decoded);

    try {
      const tensor = new ort.Tensor('float32', floatData, [1, 3, 224, 224]);
      const results = await this.session.run({ image: tensor });

      // -----------------------------------------------------------------------
      // STAGE 1 — SPECIES HEAD
      // -----------------------------------------------------------------------
      const speciesLogits = results.species_logits.data as Float32Array;
      const speciesProbs = this.softmax(speciesLogits);
      const speciesList = this.metadata.species_list || [];

      // Rank top species and calculate margin
      let bestSpeciesIdx = 0;
      let secondSpeciesIdx = 1;
      if (speciesProbs[1] > speciesProbs[0]) {
        bestSpeciesIdx = 1;
        secondSpeciesIdx = 0;
      }
      for (let i = 2; i < speciesProbs.length; i++) {
        if (speciesProbs[i] > speciesProbs[bestSpeciesIdx]) {
          secondSpeciesIdx = bestSpeciesIdx;
          bestSpeciesIdx = i;
        } else if (speciesProbs[i] > speciesProbs[secondSpeciesIdx]) {
          secondSpeciesIdx = i;
        }
      }
      const bestCrop = speciesList[bestSpeciesIdx] || 'Unknown';
      const bestCropProb = speciesProbs[bestSpeciesIdx] || 0;
      const secondCropProb = speciesProbs[secondSpeciesIdx] || 0;
      const confidenceMargin = bestCropProb - secondCropProb;

      // -----------------------------------------------------------------------
      // STAGE 2 — GLOBAL JOINT-HEAD CONSISTENCY
      // -----------------------------------------------------------------------
      const jointLogits = results.joint_logits.data as Float32Array;
      const globalJointProbs = this.softmax(jointLogits);
      let bestGlobalJointIdx = 0;
      let maxGlobalJointProb = globalJointProbs[0] || 0;
      for (let i = 1; i < globalJointProbs.length; i++) {
        if (globalJointProbs[i] > maxGlobalJointProb) {
          maxGlobalJointProb = globalJointProbs[i];
          bestGlobalJointIdx = i;
        }
      }
      const globalTopClass = this.metadata.classes[bestGlobalJointIdx] || 'Unknown';
      const globalTopCrop = this.extractCrop(globalTopClass);

      const bestCropIndices = this.cropToIndices[bestCrop] || [];
      const bestCropJointMass = bestCropIndices.reduce((sum, idx) => sum + (globalJointProbs[idx] || 0), 0);

      // Rejection class evidence check
      const bgIdx = speciesList.indexOf('Background');
      const unkIdx = speciesList.indexOf('Unknown');
      const rejectionProb = (bgIdx >= 0 ? speciesProbs[bgIdx] : 0) + (unkIdx >= 0 ? speciesProbs[unkIdx] : 0);

      // -----------------------------------------------------------------------
      // STAGE 3 — PLANT-LEAF EVIDENCE / AMBIGUITY CHECK
      // -----------------------------------------------------------------------
      // Multi-signal evaluation:
      // 1. Botanical Identity Support (must be one of 18 supported agricultural crops, not Background/Unknown)
      const isSupported =
        bestCrop !== 'Background' &&
        bestCrop !== 'Unknown' &&
        globalTopCrop !== 'Background' &&
        globalTopCrop !== 'Unknown' &&
        speciesList.includes(bestCrop);

      // 2. Dual-Head Strict Agreement: Species Head top crop MUST match Joint Head top crop
      const speciesAgreement = bestCrop === globalTopCrop;

      // 3. Absolute Confidence & Margin Policy
      const hasSufficientConfidence =
        bestCropProb >= 0.45 && (bestCropProb >= 0.60 || confidenceMargin >= 0.12);

      // 4. Joint Head Probability Mass for Detected Species
      const hasSufficientJointMass = bestCropJointMass >= 0.25;

      // 5. In-Model Non-Plant Rejection Probability Evidence
      const isRejectionLow = rejectionProb < 0.35;

      // 6. Physiological & Foliar Structural Evidence:
      // A) If claimed condition is 'Healthy', genuine plant leaves MUST contain active chlorophyll (green/olive >= 0.02).
      //    Diseased leaves (blight, scorch, curl, rust, canker) are NOT required to be green.
      const isClaimedHealthy = globalTopClass.endsWith('___healthy');
      const chlorophyllEvidence = !isClaimedHealthy || quality.chlorophyllRatio >= 0.02;

      // B) Structural Foliar Evidence:
      // Texture gradient (lapVar >= 15.0), meaningful foliar area (foliarRatio >= 0.06), natural lighting spread (stdLum >= 8)
      // GREEN PIXELS ARE NOT THE SOLE VALIDATION CRITERION (supports olive, yellow chlorotic, and necrotic lesions)
      const structuralFoliarEvidence =
        quality.foliarRatio >= 0.06 && quality.lapVar >= 15.0 && quality.stdLum >= 8;

      const plantEvidencePass = chlorophyllEvidence && structuralFoliarEvidence;
      const speciesConsistencyPass =
        isSupported &&
        speciesAgreement &&
        hasSufficientConfidence &&
        hasSufficientJointMass &&
        isRejectionLow;

      const isSpeciesApproved = speciesConsistencyPass && plantEvidencePass;

      // Diagnostic Logging exactly matching specification:
      console.log(`[AI SCANNER] image received: ${originalname}`);
      console.log(`[AI SCANNER] IMAGE QUALITY = ${quality.isValid ? 'PASS' : 'FAIL'}`);
      console.log(`[AI SCANNER] TOP SPECIES = ${bestCrop}`);
      console.log(`[AI SCANNER] SPECIES CONFIDENCE = ${(bestCropProb * 100).toFixed(1)}%`);
      console.log(`[AI SCANNER] SPECIES MARGIN = ${(confidenceMargin * 100).toFixed(1)}%`);
      console.log(`[AI SCANNER] JOINT TOP = ${globalTopClass}`);
      console.log(`[AI SCANNER] PLANT EVIDENCE = ${plantEvidencePass ? 'HIGH' : 'LOW'}`);
      console.log(`[AI SCANNER] SPECIES CONSISTENCY = ${speciesConsistencyPass ? 'PASS' : 'FAIL'}`);

      if (!isSpeciesApproved) {
        console.log(`[AI SCANNER] species prediction = UNKNOWN/NON_PLANT`);
        console.log(`[AI SCANNER] FINAL = REJECT`);
        console.log(`[AI SCANNER] disease inference = NOT RUN`);

        let errorType = 'SPECIES_AMBIGUOUS';
        let reasonStr = 'species_ambiguous';
        let messageStr = 'Please upload a clear agricultural plant/leaf image.';

        if (bestCrop === 'Background' || globalTopCrop === 'Background') {
          errorType = 'NON_PLANT_REJECTED';
          reasonStr = 'non_plant_rejection';
          messageStr = 'Non-foliar or background image detected. Please upload a clear crop leaf photo.';
        } else if (bestCrop === 'Unknown' || globalTopCrop === 'Unknown' || !isSupported) {
          errorType = 'UNSUPPORTED_SPECIES';
          reasonStr = 'unsupported_species';
          messageStr = 'The species is outside the 18 supported agricultural crops.';
        } else if (!speciesAgreement || !plantEvidencePass) {
          errorType = 'SPECIES_AMBIGUOUS';
          reasonStr = 'species_ambiguous';
          messageStr = 'Please upload a clear agricultural plant/leaf image.';
        } else if (!hasSufficientConfidence) {
          errorType = 'LOW_CONFIDENCE';
          reasonStr = 'low_confidence';
          messageStr = `The AI could not confidently identify this ${bestCrop} leaf. Please capture a clearer close-up in good lighting.`;
        }

        return {
          success: false,
          isValid: false,
          is_valid: false,
          isSupportedSpecies: false,
          species: null,
          speciesConfidence: 0,
          disease: null,
          diseaseConfidence: 0,
          error: errorType,
          reason: reasonStr,
          message: messageStr,
          detectedCrop: bestCrop,
          is_tomato: false,
        };
      }

      // -----------------------------------------------------------------------
      // STAGE 4 — SPECIES-CONSTRAINED DISEASE INFERENCE (ONLY RUN WHEN APPROVED!)
      // -----------------------------------------------------------------------
      const classesList = this.metadata.classes;
      const subIndices = bestCropIndices;

      let selectedClass = `${bestCrop}___healthy`;
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
        // Evaluate softmax STRICTLY across the subclasses of detected bestCrop
        const subLogitsArray = new Float32Array(subIndices.map((idx) => jointLogits[idx]));
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
        selectedClassProb = subProbs[bestSubLocalIdx];

        const plantInfo = PLANT_SPECIES_DATABASE[bestCrop];
        const displayCrop = plantInfo ? `${bestCrop} (${plantInfo.telugu})` : bestCrop;

        sortedJoint = subIndices
          .map((globalIdx, localIdx) => {
            const cls = classesList[globalIdx];
            const pInfo = UNIVERSAL_PATHOLOGY_DATABASE[cls] || {
              plant: bestCrop,
              plant_display: displayCrop,
              health_status: 'Healthy',
              diagnosis: null,
              severity: 'None',
              is_healthy: true,
            };

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

      // Resolve pathology details
      const pathology = UNIVERSAL_PATHOLOGY_DATABASE[selectedClass] || {
        plant: bestCrop,
        plant_display: bestCrop,
        health_status: 'Diseased',
        diagnosis: selectedClass.replace('___', ' '),
        severity: 'Moderate',
        is_healthy: false,
        recommendation: 'Consult local agricultural extension officer.',
        symptoms: ['Visual foliar symptoms consistent with analyzed specimen.'],
      };

      const isHealthy = pathology.is_healthy || selectedClass.endsWith('___healthy');
      const healthStatus = isHealthy ? 'Healthy' : pathology.health_status;
      const fullDiagnosisName = pathology.diagnosis || (isHealthy ? 'Healthy Crop (ఆరోగ్యకరమైన పంట)' : 'Detected Pathology');
      const shortDiseaseName = isHealthy
        ? 'Healthy'
        : (pathology.diagnosis?.split(' (')[0] || pathology.diagnosis || 'Detected Pathology');

      const plantInfo = PLANT_SPECIES_DATABASE[bestCrop];
      const plantDisplay = plantInfo ? `${bestCrop} (${plantInfo.telugu})` : bestCrop;

      // Structured Agricultural Recommendations Engine
      const structuredGuidance: StructuredRecommendation = getCropAndConditionGuidance(
        selectedClass,
        bestCrop,
        fullDiagnosisName,
        isHealthy
      );

      const diagnosisObj = !isHealthy && pathology.diagnosis
        ? {
            name: pathology.diagnosis,
            confidence: Math.round(selectedClassProb * 100),
          }
        : null;

      console.log(`[AI SCANNER] image received: ${originalname}`);
      console.log(`[AI SCANNER] species prediction = ${bestCrop}`);
      console.log(`[AI SCANNER] species confidence = ${bestCropProb.toFixed(2)}`);
      console.log(`[AI SCANNER] joint prediction = ${globalTopClass}`);
      console.log(`[AI SCANNER] joint confidence = ${maxGlobalJointProb.toFixed(2)}`);
      console.log(`[AI SCANNER] species agreement = TRUE`);
      console.log(`[AI SCANNER] FINAL = ${bestCrop} / ${shortDiseaseName}`);

      return {
        success: true,
        isValid: true,
        is_valid: true,
        isSupportedSpecies: true,
        species: bestCrop,
        speciesConfidence: Number(bestCropProb.toFixed(4)),
        disease: shortDiseaseName,
        diseaseConfidence: Number(selectedClassProb.toFixed(4)),
        jointClass: selectedClass,
        message: `${bestCrop} leaf analysis completed successfully.`,
        detectedCrop: bestCrop,
        crop: plantDisplay,
        condition: fullDiagnosisName,
        confidence: Number(bestCropProb.toFixed(4)),
        is_healthy: isHealthy,
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
        is_tomato: bestCrop === 'Tomato',
      };
    } catch (err: any) {
      console.error('ONNX prediction error:', err);
      return null;
    }
  }
}

export const onnxPathologyEngine = new NodeOnnxPathologyEngine();
