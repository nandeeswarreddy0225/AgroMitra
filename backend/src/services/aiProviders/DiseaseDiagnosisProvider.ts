import { ExistingModelProvider } from './ExistingModelProvider';
import { DiseaseDiagnosisResult } from './types';

export class DiseaseDiagnosisProvider {
  public static isSpeciesInExistingModel(species: string | null | undefined): boolean {
    return ExistingModelProvider.isSupportedSpecies(species);
  }

  /**
   * For species outside the 49-class model, or where disease confidence is uncertain,
   * safely return UNCERTAIN rather than fabricating a disease.
   */
  public diagnoseOutsideSpecies(species: string): DiseaseDiagnosisResult {
    return {
      disease: null,
      confidence: null,
      healthStatus: 'Uncertain',
      diagnosisStatus: 'DISEASE_UNCERTAIN',
      isHealthy: false,
      recommendation: {
        explanation: `Visual symptoms on ${species} cannot be matched with certainty against current foliar disease classes.`,
        disease_management: [
          'Scout for physical insect pests, fungal sporulation, or discoloration.',
          'Consult local Agricultural Extension Officer (AEO) or Krishi Vigyan Kendra (KVK) for certified plant pathology testing.',
        ],
        fertilizer: [
          'Maintain balanced soil moisture and balanced macro/micronutrient levels.',
        ],
        prevention: [
          'Isolate affected foliage to prevent spread to adjacent crops.',
        ],
        safety_note:
          'Informational advisory: Consult a local certified agronomist before applying chemical treatments.',
      },
    };
  }
}

export const diseaseDiagnosisProvider = new DiseaseDiagnosisProvider();
