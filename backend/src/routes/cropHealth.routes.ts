import { Router } from 'express';
import {
  analyzeCropHealth,
  getPredictionHistory,
  getPredictionById,
  deletePrediction,
  getCropHealthServiceStatus,
  upload,
} from '../controllers/cropHealth.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';

export const cropHealthRouter = Router();

// Health check endpoint for AI crop disease detection service
cropHealthRouter.get('/health', getCropHealthServiceStatus);

// Crop image analysis endpoint (supports multipart/form-data with optional user session)
cropHealthRouter.post('/analyze', optionalAuthenticate, upload.single('image'), analyzeCropHealth);

// Farmer prediction history endpoints (require authentication)
cropHealthRouter.get('/history', authenticate, getPredictionHistory);
cropHealthRouter.get('/history/:id', authenticate, getPredictionById);
cropHealthRouter.delete('/history/:id', authenticate, deletePrediction);

