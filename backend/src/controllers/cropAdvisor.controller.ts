import { Request, Response } from 'express';
import { CropAdvisorService } from '../services/cropAdvisor.service';
import { CropSeason } from '../data/seasonalCrops.data';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const getSeasonalRecommendationsController = (req: Request, res: Response): void => {
  try {
    const seasonQuery = req.query.season as string | undefined;
    const soilType = req.query.soilType as string | undefined;
    const stateQuery = req.query.state as string | undefined;
    const cityQuery = req.query.city as string | undefined;

    const tempStr = req.query.temperature as string | undefined;
    const rainStr = req.query.rainProbability as string | undefined;

    const temperature = tempStr !== undefined ? parseFloat(tempStr) : undefined;
    const rainProbability = rainStr !== undefined ? parseFloat(rainStr) : undefined;

    // Optional soil test query params
    const phStr = req.query.pH as string | undefined;
    const nStr = req.query.nitrogen as string | undefined;
    const pStr = req.query.phosphorus as string | undefined;
    const kStr = req.query.potassium as string | undefined;
    const ocStr = req.query.organicCarbon as string | undefined;
    const ecStr = req.query.electricalConductivity as string | undefined;

    const soilTest = {
      pH: phStr !== undefined ? parseFloat(phStr) : undefined,
      nitrogen: nStr !== undefined ? parseFloat(nStr) : undefined,
      phosphorus: pStr !== undefined ? parseFloat(pStr) : undefined,
      potassium: kStr !== undefined ? parseFloat(kStr) : undefined,
      organicCarbon: ocStr !== undefined ? parseFloat(ocStr) : undefined,
      electricalConductivity: ecStr !== undefined ? parseFloat(ecStr) : undefined,
    };

    let seasonOverride: CropSeason | undefined;
    if (seasonQuery) {
      const upper = seasonQuery.toUpperCase();
      if (upper === 'KHARIF' || upper === 'RABI' || upper === 'ZAID') {
        seasonOverride = upper as CropSeason;
      }
    }

    const advisorData = CropAdvisorService.getRecommendations({
      seasonOverride,
      soilType,
      soilTest,
      state: stateQuery,
      city: cityQuery,
      temperature,
      rainProbability,
    });

    res.status(200).json({
      success: true,
      ...advisorData,
    });
  } catch (error: any) {
    console.error('[CropAdvisorController] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Seasonal recommendations are temporarily unavailable.',
      error: error.message,
    });
  }
};

export const generateCropPlanController = (req: Request, res: Response): void => {
  try {
    const {
      cropId,
      soilType,
      soilTest,
      season,
      state,
      city,
      temperature,
      rainProbability,
    } = req.body;

    if (!cropId) {
      res.status(400).json({
        success: false,
        message: 'Please select a crop to generate a farm plan.',
      });
      return;
    }

    let seasonOverride: CropSeason | undefined;
    if (season) {
      const upper = season.toUpperCase();
      if (upper === 'KHARIF' || upper === 'RABI' || upper === 'ZAID') {
        seasonOverride = upper as CropSeason;
      }
    }

    const plan = CropAdvisorService.generateCropPlan({
      cropId,
      soilType: soilType || 'Red Soil',
      soilTest,
      seasonOverride,
      state,
      city,
      temperature,
      rainProbability,
    });

    res.status(200).json({
      success: true,
      plan,
    });
  } catch (error: any) {
    console.error('[CropAdvisorController] Generate Plan Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Unable to generate crop plan at this time.',
      error: error.message,
    });
  }
};

export const saveFarmerCropPlanController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required to save your crop plan.',
      });
      return;
    }

    const {
      soilType,
      soilTest,
      selectedCropId,
      selectedCropName,
      selectedCropIcon,
      season,
      location,
      notes,
    } = req.body;

    if (!soilType || !selectedCropId || !selectedCropName) {
      res.status(400).json({
        success: false,
        message: 'Soil type and crop selection are required to save a plan.',
      });
      return;
    }

    const savedPlan = await CropAdvisorService.saveFarmerCropPlan(
      req.user._id.toString(),
      {
        soilType,
        soilTest,
        selectedCropId,
        selectedCropName,
        selectedCropIcon: selectedCropIcon || '🌾',
        season: season || 'KHARIF',
        location,
        notes,
      }
    );

    res.status(200).json({
      success: true,
      message: 'Crop plan saved successfully to your farm profile.',
      plan: savedPlan,
    });
  } catch (error: any) {
    console.error('[CropAdvisorController] Save Plan Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to save crop plan.',
      error: error.message,
    });
  }
};

export const getFarmerCropPlanController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required to view your saved crop plan.',
      });
      return;
    }

    const savedPlan = await CropAdvisorService.getFarmerCropPlan(req.user._id.toString());

    if (!savedPlan) {
      res.status(200).json({
        success: true,
        plan: null,
        message: 'No active saved crop plan found.',
      });
      return;
    }

    // Generate enriched plan analysis using saved parameters
    const enriched = CropAdvisorService.generateCropPlan({
      cropId: savedPlan.selectedCropId,
      soilType: savedPlan.soilType,
      soilTest: savedPlan.soilTest,
      seasonOverride: savedPlan.season,
      state: savedPlan.location?.state,
      city: savedPlan.location?.city,
    });

    res.status(200).json({
      success: true,
      plan: {
        ...savedPlan,
        detailedAnalysis: enriched,
      },
    });
  } catch (error: any) {
    console.error('[CropAdvisorController] Get Plan Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve saved crop plan.',
      error: error.message,
    });
  }
};
