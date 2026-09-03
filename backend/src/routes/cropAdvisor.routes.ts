import { Router } from 'express';
import {
  getSeasonalRecommendationsController,
  generateCropPlanController,
  saveFarmerCropPlanController,
  getFarmerCropPlanController,
} from '../controllers/cropAdvisor.controller';
import { authenticate } from '../middlewares/auth.middleware';

export const cropAdvisorRouter = Router();

// GET /api/crop-advisor (Public: soil + location + season + live weather recommendations)
cropAdvisorRouter.get('/', getSeasonalRecommendationsController);

// POST /api/crop-advisor/generate-plan (Public: generate dynamic full crop plan)
cropAdvisorRouter.post('/generate-plan', generateCropPlanController);

// POST /api/crop-advisor/my-plan (Authenticated: Save crop plan to farmer profile in MongoDB)
cropAdvisorRouter.post('/my-plan', authenticate, saveFarmerCropPlanController);

// GET /api/crop-advisor/my-plan (Authenticated: Retrieve farmer's saved crop plan from MongoDB)
cropAdvisorRouter.get('/my-plan', authenticate, getFarmerCropPlanController);

export default cropAdvisorRouter;
