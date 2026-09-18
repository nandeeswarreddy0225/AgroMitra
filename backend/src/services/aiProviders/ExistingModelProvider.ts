import { onnxPathologyEngine } from '../onnxInference.service';
import { UniversalScannerResult } from '../../controllers/cropHealth.controller';
import {
  PlantIdentificationResult,
  DiseaseDiagnosisResult,
  DiagnosisStatus,
  HealthStatus,
} from './types';

export class ExistingModelProvider {
  public static readonly SUPPORTED_SPECIES: string[] = [
    'Apple',
    'Banana',
    'Blueberry',
    'Cherry',
    'Chilli',
    'Citrus',
    'Corn',
    'Cotton',
    'Grape',
    'Mango',
    'Neem',
    'Peach',
    'Potato',
    'Raspberry',
    'Rice',
    'Soybean',
    'Strawberry',
    'Tomato',
  ];

  public static isSupportedSpecies(speciesName: string | null | undefined): boolean {
    if (!speciesName) return false;
    const clean = speciesName.trim().toLowerCase();
    return this.SUPPORTED_SPECIES.some((s) => s.toLowerCase() === clean);
  }

  public async process(
    buffer: Buffer,
    originalname: string,
    mimetype: string
  ): Promise<{
    plantResult: PlantIdentificationResult;
    diagnosisResult: DiseaseDiagnosisResult;
    rawResult: UniversalScannerResult | null;
  }> {
    const rawResult = await onnxPathologyEngine.predict(buffer, originalname, mimetype);

    if (!rawResult) {
      return {
        plantResult: {
          isPlant: false,
          species: null,
          confidence: null,
          source: null,
          isSupportedSpecies: false,
          error: 'INFERENCE_FAILED',
          rawDetails: null,
        },
        diagnosisResult: {
          disease: null,
          confidence: null,
          healthStatus: null,
          diagnosisStatus: 'INVALID_IMAGE',
          isHealthy: false,
          error: 'INFERENCE_FAILED',
        },
        rawResult: null,
      };
    }

    // 1. Check if image quality failed
    if (
      rawResult.error === 'INVALID_IMAGE_QUALITY' ||
      rawResult.error === 'IMAGE_DECODE_FAILED'
    ) {
      return {
        plantResult: {
          isPlant: false,
          species: null,
          confidence: null,
          source: null,
          isSupportedSpecies: false,
          error: rawResult.error,
          rawDetails: rawResult,
        },
        diagnosisResult: {
          disease: null,
          confidence: null,
          healthStatus: null,
          diagnosisStatus: 'INVALID_IMAGE',
          isHealthy: false,
          error: rawResult.error,
        },
        rawResult,
      };
    }

    // 2. Check if detected as Non-Plant / Background / Unknown rejection
    if (!rawResult.isValid || !rawResult.isSupportedSpecies || !rawResult.species) {
      const isExplicitNonPlant =
        rawResult.error === 'NON_PLANT_REJECTED' ||
        rawResult.error === 'NON_PLANT_IMAGE' ||
        rawResult.species === 'Background' ||
        rawResult.detectedCrop === 'Background' ||
        rawResult.reason === 'non_plant_rejection';

      return {
        plantResult: {
          isPlant: !isExplicitNonPlant && rawResult.species !== null,
          species: null,
          confidence: rawResult.speciesConfidence ?? null,
          source: null,
          isSupportedSpecies: false,
          error: rawResult.error || 'UNSUPPORTED_SPECIES',
          rawDetails: rawResult,
        },
        diagnosisResult: {
          disease: null,
          confidence: null,
          healthStatus: null,
          diagnosisStatus: isExplicitNonPlant ? 'NON_PLANT' : 'UNKNOWN_SPECIES',
          isHealthy: false,
          error: rawResult.error || 'UNSUPPORTED_SPECIES',
        },
        rawResult,
      };
    }

    // 3. Supported plant species detected
    const species = rawResult.species;
    const speciesConf = rawResult.speciesConfidence ?? rawResult.confidence ?? 0;
    const isHealthy = Boolean(rawResult.is_healthy ?? (rawResult.health?.status === 'Healthy'));
    const diseaseName = rawResult.disease || (isHealthy ? 'Healthy Leaf' : null);
    const diseaseConf = rawResult.diseaseConfidence ?? rawResult.confidence ?? 0;

    let diagnosisStatus: DiagnosisStatus = isHealthy ? 'HEALTHY' : 'DIAGNOSED';
    let healthStatus: HealthStatus = isHealthy ? 'Healthy' : 'Disease Detected';

    // If disease confidence is too low or uncertain
    if (!isHealthy && (!diseaseName || diseaseConf < 0.3)) {
      diagnosisStatus = 'DISEASE_UNCERTAIN';
      healthStatus = 'Uncertain';
    }

    return {
      plantResult: {
        isPlant: true,
        species,
        confidence: speciesConf,
        source: 'EXISTING_ONNX',
        isSupportedSpecies: true,
        rawDetails: rawResult,
      },
      diagnosisResult: {
        disease: isHealthy ? 'Healthy' : diseaseName,
        confidence: diseaseConf,
        healthStatus,
        diagnosisStatus,
        isHealthy,
        severity: rawResult.severity,
        symptoms: rawResult.symptoms,
        recommendation: rawResult.structuredRecommendation || rawResult.recommendation,
        top5: rawResult.top5,
      },
      rawResult,
    };
  }
}

export const existingModelProvider = new ExistingModelProvider();
