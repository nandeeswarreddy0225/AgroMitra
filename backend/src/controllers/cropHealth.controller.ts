import { Response, NextFunction } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { CropAnalysis } from '../models/CropAnalysis.model';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Configure Multer memory storage
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type '${file.mimetype}'. Only JPEG, PNG, and WebP images are allowed.`));
    }
  },
});

/**
 * Upload and analyze crop/leaf image using real AI service
 * POST /api/crop-health/analyze
 */
export const analyzeCropHealth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'Please upload an image file of the crop leaf to analyze.',
      });
      return;
    }

    const { originalname, mimetype, buffer } = req.file;

    // Send image to Python FastAPI AI Service
    const formData = new FormData();
    formData.append('image', buffer, {
      filename: originalname,
      contentType: mimetype,
    });

    let aiResponse;
    try {
      aiResponse = await axios.post(`${AI_SERVICE_URL}/predict`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 15000,
      });
    } catch (aiErr: any) {
      console.error('❌ [AI Service Error]:', aiErr.message);
      if (aiErr.code === 'ECONNREFUSED' || aiErr.code === 'ENOTFOUND') {
        res.status(503).json({
          success: false,
          message: 'AI Crop Disease Detection Service is currently offline. Please ensure the AI service is running on port 8000.',
        });
        return;
      }
      if (aiErr.response?.data?.message) {
        res.status(aiErr.response.status || 400).json({
          success: false,
          message: aiErr.response.data.message,
        });
        return;
      }
      if (aiErr.response?.data?.detail) {
        res.status(aiErr.response.status || 400).json({
          success: false,
          message: typeof aiErr.response.data.detail === 'string' ? aiErr.response.data.detail : JSON.stringify(aiErr.response.data.detail),
        });
        return;
      }
      if (aiErr.response?.data?.error) {
        res.status(aiErr.response.status || 400).json({
          success: false,
          message: aiErr.response.data.error,
        });
        return;
      }
      res.status(502).json({
        success: false,
        message: 'AI Service returned an error during image processing. Please check the image format and try again.',
      });
      return;
    }


    const predictionData = aiResponse.data;

    // Optional Base64 thumbnail generation for history display
    let imageDataUri: string | undefined;
    if (buffer.length <= 1.5 * 1024 * 1024) {
      imageDataUri = `data:${mimetype};base64,${buffer.toString('base64')}`;
    }

    let analysisRecord: any;

    if (user) {
      // Persist real prediction in MongoDB associated strictly with authenticated farmer
      analysisRecord = await CropAnalysis.create({
        farmer: user._id,
        imageName: originalname,
        imageData: imageDataUri,
        crop: predictionData.crop || 'Unknown Crop',
        disease: predictionData.disease || 'Unknown Condition',
        isHealthy: predictionData.is_healthy ?? false,
        confidence: predictionData.confidence ?? 0,
        isConfident: predictionData.is_confident ?? true,
        symptoms: predictionData.symptoms || [],
        recommendedActions: predictionData.recommended_actions || [],
        disclaimer: predictionData.disclaimer || 'AI crop diagnosis is for informational guidance only.',
      });
    } else {
      analysisRecord = {
        imageName: originalname,
        imageData: imageDataUri,
        crop: predictionData.crop || 'Unknown Crop',
        disease: predictionData.disease || 'Unknown Condition',
        isHealthy: predictionData.is_healthy ?? false,
        confidence: predictionData.confidence ?? 0,
        isConfident: predictionData.is_confident ?? true,
        symptoms: predictionData.symptoms || [],
        recommendedActions: predictionData.recommended_actions || [],
        disclaimer: predictionData.disclaimer || 'AI crop diagnosis is for informational guidance only.',
        createdAt: new Date().toISOString(),
      };
    }

    res.status(200).json({
      success: true,
      message: 'Crop analysis completed successfully.',
      analysis: analysisRecord,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Get authenticated farmer's prediction history
 * GET /api/crop-health/history
 */
export const getPredictionHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    // Strictly fetch predictions belonging to the authenticated farmer
    const history = await CropAnalysis.find({ farmer: user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single prediction by ID
 * GET /api/crop-health/history/:id
 */
export const getPredictionById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const { id } = req.params;

    const analysis = await CropAnalysis.findById(id);
    if (!analysis) {
      res.status(404).json({
        success: false,
        message: 'Prediction record not found.',
      });
      return;
    }

    // Security check: strictly verify ownership
    if (analysis.farmer.toString() !== user._id.toString() && user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Access forbidden: You cannot access another farmer\'s prediction history.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      analysis,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete single prediction by ID
 * DELETE /api/crop-health/history/:id
 */
export const deletePrediction = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const { id } = req.params;

    const analysis = await CropAnalysis.findById(id);
    if (!analysis) {
      res.status(404).json({
        success: false,
        message: 'Prediction record not found.',
      });
      return;
    }

    // Security check: verify ownership
    if (analysis.farmer.toString() !== user._id.toString() && user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Access forbidden: You cannot delete another farmer\'s prediction history.',
      });
      return;
    }

    await CropAnalysis.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Prediction record deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
