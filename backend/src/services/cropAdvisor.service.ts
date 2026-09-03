import {
  CropSeason,
  SeasonalCropItem,
  SEASONAL_CROPS_DATA,
  VALID_SOIL_TYPES,
  SoilType,
} from '../data/seasonalCrops.data';
import { CropPlan, ICropPlan, ISoilTest } from '../models/CropPlan.model';
import mongoose from 'mongoose';

export type SuitabilityTier = 'Highly Suitable' | 'Suitable' | 'Consider';

export interface EvaluatedCropItem extends SeasonalCropItem {
  suitabilityScore: number; // 0 - 100 indicative score
  suitabilityTier: SuitabilityTier;
  suitabilityBadge: string; // '🥇 Highly Suitable' | '🥈 Suitable' | '🥉 Consider'
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export class CropAdvisorService {
  /**
   * Determine current active Indian agricultural season based on system date
   */
  public static calculateSeason(dateInput?: Date): CropSeason {
    const date = dateInput || new Date();
    const month = date.getMonth(); // 0 = Jan, 1 = Feb, ..., 8 = Sep, 11 = Dec

    // Kharif: June (5) to October (9)
    if (month >= 5 && month <= 9) {
      return 'KHARIF';
    }
    // Zaid: March (2) to May (4)
    if (month >= 2 && month <= 4) {
      return 'ZAID';
    }
    // Rabi: October (9) / November (10) to February (1) / March (2)
    return 'RABI';
  }

  public static getSeasonDetails(seasonCode: CropSeason, referenceDate: Date = new Date()): SeasonInfo {
    const activeCode = this.calculateSeason(referenceDate);
    const monthIndex = referenceDate.getMonth();
    const monthName = MONTH_NAMES[monthIndex];

    const metadata: Record<CropSeason, { name: string; hindiName: string; icon: string; desc: string; months: string }> = {
      KHARIF: {
        name: 'Kharif',
        hindiName: 'खरीफ (Monsoon Season)',
        icon: '🌧️',
        desc: 'Monsoon / Autumn cropping season relying on South-West Monsoon rains.',
        months: 'June – October',
      },
      RABI: {
        name: 'Rabi',
        hindiName: 'रबी (Winter Season)',
        icon: '❄️',
        desc: 'Winter cropping season requiring cooler temperatures and assured irrigation or residual soil moisture.',
        months: 'October/November – March/April',
      },
      ZAID: {
        name: 'Zaid',
        hindiName: 'जायद (Summer Season)',
        icon: '☀️',
        desc: 'Short summer cropping season between Rabi harvest and Kharif monsoon arrival.',
        months: 'March – June',
      },
    };

    const item = metadata[seasonCode];
    return {
      code: seasonCode,
      name: item.name,
      hindiName: item.hindiName,
      icon: item.icon,
      periodDescription: item.desc,
      monthsActive: item.months,
      currentDateIso: referenceDate.toISOString(),
      currentMonthName: monthName,
      isCurrentSeason: seasonCode === activeCode,
    };
  }

  /**
   * Evaluate compatibility between selected soil and crop
   */
  private static evaluateSoilMatch(crop: SeasonalCropItem, selectedSoil?: string): {
    score: number;
    note: string;
  } {
    if (!selectedSoil || selectedSoil === 'Other / Not Sure') {
      return {
        score: 30,
        note: 'General soil suitability. Ensure good soil organic matter and internal drainage.',
      };
    }

    const normSoil = selectedSoil.toLowerCase().trim();
    const directMatch = crop.soilTypes.some((st) => st.toLowerCase().includes(normSoil) || normSoil.includes(st.toLowerCase()));

    if (directMatch) {
      return {
        score: 45,
        note: `Highly suitable for ${selectedSoil}. Physical texture and mineral structure support healthy root development.`,
      };
    }

    // Check specific soil nuances
    if (normSoil.includes('black') && (crop.id === 'cotton-kapas' || crop.id === 'soybean' || crop.id === 'chilli-peppers')) {
      return { score: 45, note: 'Black soil provides superior moisture retention and cation exchange capacity.' };
    }
    if (normSoil.includes('red') && (crop.id === 'groundnut-peanut' || crop.id === 'ragi-finger-millet' || crop.id === 'red-gram-tur')) {
      return { score: 45, note: 'Red soil provides excellent friability and drainage ideal for root/pod growth.' };
    }
    if (normSoil.includes('clay') && crop.id === 'paddy-rice') {
      return { score: 45, note: 'Clay soil creates an impermeable puddle layer that conserves standing water.' };
    }
    if (normSoil.includes('sandy') && crop.id === 'groundnut-peanut') {
      return { score: 40, note: 'Sandy loam allows effortless pegging and easy harvesting with minimal pod loss.' };
    }

    return {
      score: 20,
      note: `Moderate suitability on ${selectedSoil}. Incorporate organic compost and ensure adequate drainage management.`,
    };
  }

  /**
   * Get filtered, ranked crop recommendations based on SOIL + LOCATION + SEASON + WEATHER
   */
  public static getRecommendations(options: {
    seasonOverride?: CropSeason;
    soilType?: string;
    soilTest?: ISoilTest;
    state?: string;
    city?: string;
    temperature?: number;
    rainProbability?: number;
    referenceDate?: Date;
  }): SeasonalAdvisorResponse {
    const refDate = options.referenceDate || new Date();
    const currentActiveSeason = this.calculateSeason(refDate);
    const selectedSeason = options.seasonOverride || currentActiveSeason;

    const seasonInfo = this.getSeasonDetails(selectedSeason, refDate);
    const allSeasons: SeasonInfo[] = (['KHARIF', 'RABI', 'ZAID'] as CropSeason[]).map((s) =>
      this.getSeasonDetails(s, refDate)
    );

    const userState = options.state ? options.state.trim().toLowerCase() : '';
    const selectedSoil = options.soilType;

    // Filter crops by active/selected season
    const seasonCrops = SEASONAL_CROPS_DATA.filter((crop) => crop.season === selectedSeason);

    // Evaluate each crop
    const evaluatedCrops: EvaluatedCropItem[] = seasonCrops.map((crop) => {
      let score = 30; // base score for season match

      // 1. Soil Match (up to 45 points)
      const soilEval = this.evaluateSoilMatch(crop, selectedSoil);
      score += soilEval.score;

      // 2. Region Match (up to 20 points)
      let regionMatch = false;
      if (userState) {
        regionMatch = crop.suitableStates.some((st) => st.toLowerCase().includes(userState));
        if (regionMatch) score += 20;
      } else {
        score += 10;
      }

      // 3. Live Weather Adjustment (up to 15 points)
      let weatherNote = 'Weather conditions are within normal physiological thresholds.';
      if (options.rainProbability !== undefined) {
        if (options.rainProbability >= 60) {
          if (crop.waterRequirement === 'High') {
            score += 10;
            weatherNote = 'Favorable: High rainfall supports early water ponding requirements.';
          } else {
            weatherNote = 'Monitor: High rain expected; ensure adequate field drainage to prevent waterlogging.';
          }
        } else if (options.rainProbability <= 20) {
          if (crop.waterRequirement === 'Low') {
            score += 10;
            weatherNote = 'Favorable: Low moisture requirement matches dry weather conditions.';
          } else {
            weatherNote = 'Monitor: Dry conditions; schedule supplemental irrigation.';
          }
        }
      }

      // Soil test pH adjustment if provided
      if (options.soilTest?.pH) {
        const ph = options.soilTest.pH;
        if (ph >= 6.0 && ph <= 7.8) {
          score += 5;
        }
      }

      // Determine Tier
      let tier: SuitabilityTier = 'Suitable';
      let badge = '🥈 Suitable';
      if (score >= 75) {
        tier = 'Highly Suitable';
        badge = '🥇 Highly Suitable';
      } else if (score < 55) {
        tier = 'Consider';
        badge = '🥉 Consider';
      }

      return {
        ...crop,
        suitabilityScore: Math.min(score, 98),
        suitabilityTier: tier,
        suitabilityBadge: badge,
        soilSuitabilityNote: soilEval.note,
        weatherSuitabilityNote: weatherNote,
      };
    });

    // Sort by suitability score descending
    evaluatedCrops.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    const generalGuidance = [
      {
        stage: 'Before Planting',
        title: 'Land Preparation & Seed Selection',
        tips: [
          'Carry out deep summer ploughing to eradicate weed seeds and soil-borne pathogens.',
          'Choose certified seed varieties adapted to your micro-climatic zone and soil texture.',
          'Test seed germination rate and perform bio-fungicide/Rhizobium seed treatment.',
          'Check local rainfall forecasts and soil moisture before sowing.',
        ],
      },
      {
        stage: 'During Planting',
        title: 'Sowing & Spacing Precision',
        tips: [
          'Maintain recommended row-to-row and plant-to-plant spacing for optimal solar interception.',
          'Ensure accurate sowing depth (2–5 cm based on seed size) into moist soil layer.',
          'Ensure ridge-furrow alignment to prevent waterlogging during heavy downpours.',
        ],
      },
      {
        stage: 'During Growth',
        title: 'Crop Nutrition & Weed Management',
        tips: [
          'Perform manual or mechanical inter-cultivation at 20–25 and 40–45 days after sowing.',
          'Apply split nitrogen doses synchronized with active tillering and flowering stages.',
          'Install sticky traps and pheromone traps for early pest monitoring.',
        ],
      },
      {
        stage: 'Before Harvest',
        title: 'Maturity Scouting & Storage Preparation',
        tips: [
          'Scout for physical maturity indicators (e.g. golden earheads, rattling pods, hard grain).',
          'Stop irrigation 10–14 days before harvest to facilitate smooth harvesting operations.',
          'Dry harvested produce thoroughly to safe storage moisture (<12%) before bagging.',
        ],
      },
    ];

    return {
      currentSeason: seasonInfo,
      allSeasons,
      availableSoilTypes: VALID_SOIL_TYPES,
      selectedSoil: options.soilType,
      soilTestProvided: Boolean(options.soilTest && Object.values(options.soilTest).some((v) => v !== undefined)),
      locationContext: {
        state: options.state,
        city: options.city,
        isLocationSpecific: Boolean(options.state || options.city),
      },
      recommendedCrops: evaluatedCrops,
      cropCount: evaluatedCrops.length,
      generalFarmingGuidance: generalGuidance,
      safeChemicalNotice:
        'Consult a qualified local agricultural extension officer or follow approved pesticide product labels before chemical application. Use the KrishiSetu AI Leaf Scanner for accurate disease diagnosis.',
    };
  }

  /**
   * Generate an in-depth Farm Plan for the farmer's chosen crop
   */
  public static generateCropPlan(options: {
    cropId: string;
    soilType: string;
    soilTest?: ISoilTest;
    seasonOverride?: CropSeason;
    state?: string;
    city?: string;
    temperature?: number;
    rainProbability?: number;
  }): FullCropPlanResult {
    const crop = SEASONAL_CROPS_DATA.find((c) => c.id === options.cropId) || SEASONAL_CROPS_DATA[0];
    const season = options.seasonOverride || this.calculateSeason();
    const soil = options.soilType || 'Loamy Soil';

    const soilMatch = this.evaluateSoilMatch(crop, soil);

    // Dynamic guidance components
    const sowingGuide = `Sow during ${crop.sowingPeriod}. Plant in well-prepared ${soil} at optimal spacing to achieve recommended plant population.`;
    
    let irrGuide = `Water requirement is ${crop.waterRequirement}. `;
    if (soil.toLowerCase().includes('sandy')) {
      irrGuide += 'Sandy soil has lower water retention; schedule frequent, light irrigations or use drip irrigation.';
    } else if (soil.toLowerCase().includes('black') || soil.toLowerCase().includes('clay')) {
      irrGuide += 'Soil holds moisture well; avoid over-watering and maintain proper drainage to prevent waterlogging.';
    } else {
      irrGuide += 'Irrigate at critical growth milestones: establishment, flowering, and grain/pod development.';
    }

    let nutGuide = 'Apply well-decomposed Farmyard Manure (5–10 tonnes/acre) during basal land preparation. ';
    if (options.soilTest?.nitrogen !== undefined) {
      nutGuide += `Soil test indicates Nitrogen: ${options.soilTest.nitrogen} kg/ha. Adjust chemical urea doses accordingly. `;
    }
    if (options.soilTest?.pH !== undefined) {
      nutGuide += `Soil pH is ${options.soilTest.pH}. `;
      if (options.soilTest.pH < 6.0) nutGuide += 'Apply agricultural lime to neutralize soil acidity. ';
      if (options.soilTest.pH > 8.0) nutGuide += 'Apply gypsum to manage soil alkalinity. ';
    }
    nutGuide += 'Split nitrogen applications into 2–3 doses for higher uptake efficiency.';

    const pestGuide = `Scout field weekly for early pest signs. ${crop.agronomicTip} For unknown leaf symptoms or spots, scan leaf with the AI Leaf Scanner.`;

    const weatherAnalysis = options.temperature !== undefined
      ? `Current local weather (${options.temperature}°C, ${options.rainProbability || 0}% rain probability) is aligned with ${season} season growth requirements.`
      : `Growing conditions match seasonal temperature ranges for ${crop.name}.`;

    const stages = [
      {
        stage: 'Stage 1: Land Prep & Sowing',
        timeline: `Day 0 – 15 (${crop.sowingPeriod})`,
        instructions: crop.stages.beforePlanting,
      },
      {
        stage: 'Stage 2: Vegetative Growth & Weeding',
        timeline: 'Day 16 – 45',
        instructions: crop.stages.duringPlanting,
      },
      {
        stage: 'Stage 3: Flowering & Pod/Grain Development',
        timeline: 'Day 46 – 85',
        instructions: crop.stages.duringGrowth,
      },
      {
        stage: 'Stage 4: Ripening & Harvest',
        timeline: `${crop.durationMonths} (${crop.harvestPeriod})`,
        instructions: crop.stages.beforeHarvest,
      },
    ];

    let tier: SuitabilityTier = 'Suitable';
    if (soilMatch.score >= 40) tier = 'Highly Suitable';

    return {
      selectedCrop: crop,
      soilType: soil,
      soilTest: options.soilTest,
      season,
      location: {
        city: options.city,
        state: options.state,
      },
      suitabilityTier: tier,
      soilSuitabilityAnalysis: soilMatch.note,
      weatherSuitabilityAnalysis: weatherAnalysis,
      sowingGuidance: sowingGuide,
      irrigationGuidance: irrGuide,
      nutrientGuidance: nutGuide,
      pestMonitoringGuidance: pestGuide,
      growthStages: stages,
      expectedHarvestPeriod: crop.harvestPeriod,
      safeNotice:
        'Always consult qualified agronomy specialists before applying regulated chemical inputs. Product labels must be followed strictly.',
    };
  }

  /**
   * Save or Update Farmer's Crop Plan in MongoDB
   */
  public static async saveFarmerCropPlan(
    userId: string,
    planData: {
      soilType: string;
      soilTest?: ISoilTest;
      selectedCropId: string;
      selectedCropName: string;
      selectedCropIcon?: string;
      season: 'KHARIF' | 'RABI' | 'ZAID';
      location?: {
        city?: string;
        state?: string;
        latitude?: number;
        longitude?: number;
      };
      notes?: string;
    }
  ): Promise<ICropPlan> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const updatedPlan = await CropPlan.findOneAndUpdate(
      { userId: userObjectId },
      {
        userId: userObjectId,
        soilType: planData.soilType,
        soilTest: planData.soilTest,
        selectedCropId: planData.selectedCropId,
        selectedCropName: planData.selectedCropName,
        selectedCropIcon: planData.selectedCropIcon || '🌾',
        season: planData.season,
        location: planData.location || {},
        notes: planData.notes || '',
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return updatedPlan;
  }

  /**
   * Get Farmer's Saved Crop Plan from MongoDB
   */
  public static async getFarmerCropPlan(userId: string): Promise<ICropPlan | null> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    return CropPlan.findOne({ userId: userObjectId });
  }

}
