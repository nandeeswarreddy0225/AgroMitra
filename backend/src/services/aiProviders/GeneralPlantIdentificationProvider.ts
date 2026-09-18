import { PlantIdentificationResult } from './types';

export interface GeneralPlantVisionPlugin {
  identifyPlant(buffer: Buffer, originalname: string, mimetype: string): Promise<PlantIdentificationResult>;
}

export class GeneralPlantIdentificationProvider {
  private plugin: GeneralPlantVisionPlugin | null = null;

  constructor() {
    // Check if custom provider or plugin is configured via environment
    const providerName = process.env.PLANT_AI_PROVIDER;
    const apiKey = process.env.GENERAL_PLANT_API_KEY;

    if (providerName && apiKey) {
      // Future pluggable providers can be initialized here
      // e.g. PlantNet, Kindwise, Gemini Vision
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.plugin || (process.env.PLANT_AI_PROVIDER && process.env.GENERAL_PLANT_API_KEY));
  }

  public registerPlugin(plugin: GeneralPlantVisionPlugin): void {
    this.plugin = plugin;
  }

  public async identifyPlant(
    buffer: Buffer,
    originalname: string,
    mimetype: string
  ): Promise<PlantIdentificationResult> {
    if (!this.isConfigured()) {
      return {
        isPlant: false,
        species: null,
        confidence: null,
        source: 'GENERAL_PLANT_MODEL',
        isSupportedSpecies: false,
        error: 'GENERAL_PLANT_MODEL_NOT_CONFIGURED',
      };
    }

    if (this.plugin) {
      try {
        return await this.plugin.identifyPlant(buffer, originalname, mimetype);
      } catch (err: any) {
        return {
          isPlant: false,
          species: null,
          confidence: null,
          source: 'GENERAL_PLANT_MODEL',
          isSupportedSpecies: false,
          error: `GENERAL_PLANT_PROVIDER_ERROR: ${err.message}`,
        };
      }
    }

    return {
      isPlant: false,
      species: null,
      confidence: null,
      source: 'GENERAL_PLANT_MODEL',
      isSupportedSpecies: false,
      error: 'GENERAL_PLANT_MODEL_NOT_CONFIGURED',
    };
  }
}

export const generalPlantIdentificationProvider = new GeneralPlantIdentificationProvider();
