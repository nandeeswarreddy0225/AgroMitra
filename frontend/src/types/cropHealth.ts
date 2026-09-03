export interface CropAnalysis {
  id: string;
  farmer: string;
  imageName: string;
  imageData?: string;
  crop: string;
  disease: string;
  isHealthy: boolean;
  confidence: number;
  isConfident: boolean;
  symptoms: string[];
  recommendedActions: string[];
  disclaimer: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyzeCropResponse {
  success: boolean;
  message: string;
  analysis: CropAnalysis;
}

export interface PredictionHistoryResponse {
  success: boolean;
  count: number;
  history: CropAnalysis[];
}
