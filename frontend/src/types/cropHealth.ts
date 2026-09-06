export interface PlantInfo {
  name: string;
  displayName?: string;
  confidence: number;
}

export interface HealthInfo {
  status: 'Healthy' | 'Diseased' | 'Pest Damage' | 'Nutrient Deficiency' | 'Physical/Environmental Damage' | 'Other Abnormality' | 'Unknown';
  confidence: number;
}

export interface DiagnosisInfo {
  name: string;
  confidence?: number;
}

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
  plant?: PlantInfo;
  health?: HealthInfo;
  diagnosis?: DiagnosisInfo | null;
  severity?: 'None' | 'Mild' | 'Moderate' | 'Severe' | 'Unknown';
  recommendation?: string;
  top5?: Array<{
    className: string;
    crop: string;
    plant?: string;
    disease: string;
    health_status?: string;
    probability: number;
  }>;
  symptoms: string[];
  recommendedActions: string[];
  disclaimer: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyzeCropResponse {
  success: boolean;
  message: string;
  plant?: PlantInfo;
  health?: HealthInfo;
  diagnosis?: DiagnosisInfo | null;
  severity?: 'None' | 'Mild' | 'Moderate' | 'Severe' | 'Unknown';
  recommendation?: string;
  analysis: CropAnalysis;
  error?: string;
}

export interface PredictionHistoryResponse {
  success: boolean;
  count: number;
  history: CropAnalysis[];
}
