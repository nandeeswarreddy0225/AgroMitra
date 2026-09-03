export type CropSeason = 'KHARIF' | 'RABI' | 'ZAID';
export type WaterRequirement = 'Low' | 'Medium' | 'High';
export type SuitabilityTier = 'Highly Suitable' | 'Suitable' | 'Consider';

export const SOIL_TYPE_OPTIONS = [
  'Red Soil',
  'Black Soil',
  'Alluvial Soil',
  'Sandy Soil',
  'Clay Soil',
  'Loamy Soil',
  'Laterite Soil',
  'Silty Soil',
  'Other / Not Sure',
] as const;

export type SoilType = typeof SOIL_TYPE_OPTIONS[number];

export interface ISoilTest {
  pH?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  organicCarbon?: number;
  electricalConductivity?: number;
}

export interface SeasonalCropItem {
  id: string;
  name: string;
  scientificName?: string;
  icon: string;
  category: string;
  season: CropSeason;
  sowingPeriod: string;
  harvestPeriod: string;
  durationMonths: string;
  waterRequirement: WaterRequirement;
  soilTypes: string[];
  suitableStates: string[];
  advantages: string[];
  thingsToConsider: string[];
  agronomicTip: string;
  stages: {
    beforePlanting: string;
    duringPlanting: string;
    duringGrowth: string;
    beforeHarvest: string;
  };
}

export interface EvaluatedCropItem extends SeasonalCropItem {
  suitabilityScore: number;
  suitabilityTier: SuitabilityTier;
  suitabilityBadge: string;
  soilSuitabilityNote: string;
  weatherSuitabilityNote: string;
}

export interface SeasonInfo {
  code: CropSeason;
  name: string;
  hindiName: string;
  icon: string;
  periodDescription: string;
  monthsActive: string;
  currentDateIso: string;
  currentMonthName: string;
  isCurrentSeason: boolean;
}

export interface SeasonalAdvisorResponse {
  success: boolean;
  currentSeason: SeasonInfo;
  allSeasons: SeasonInfo[];
  availableSoilTypes: readonly string[];
  selectedSoil?: string;
  soilTestProvided: boolean;
  locationContext: {
    state?: string;
    city?: string;
    isLocationSpecific: boolean;
  };
  recommendedCrops: EvaluatedCropItem[];
  cropCount: number;
  generalFarmingGuidance: {
    stage: string;
    title: string;
    tips: string[];
  }[];
  safeChemicalNotice: string;
  message?: string;
}

export interface SeasonalCropQueryParams {
  season?: CropSeason;
  soilType?: string;
  state?: string;
  city?: string;
  temperature?: number;
  rainProbability?: number;
  pH?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  organicCarbon?: number;
  electricalConductivity?: number;
}

export interface FullCropPlanResult {
  selectedCrop: SeasonalCropItem;
  soilType: string;
  soilTest?: ISoilTest;
  season: CropSeason;
  location: {
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  };
  suitabilityTier: SuitabilityTier;
  soilSuitabilityAnalysis: string;
  weatherSuitabilityAnalysis: string;
  sowingGuidance: string;
  irrigationGuidance: string;
  nutrientGuidance: string;
  pestMonitoringGuidance: string;
  growthStages: {
    stage: string;
    timeline: string;
    instructions: string;
  }[];
  expectedHarvestPeriod: string;
  safeNotice: string;
  savedAt?: string;
}

export interface SaveCropPlanPayload {
  soilType: string;
  soilTest?: ISoilTest;
  selectedCropId: string;
  selectedCropName: string;
  selectedCropIcon?: string;
  season: CropSeason;
  location?: {
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  };
  notes?: string;
}
