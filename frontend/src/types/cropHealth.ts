export interface PlantInfo {
  name: string;
  displayName?: string;
  confidence: number;
}

export interface HealthInfo {
  status: 'Healthy' | 'Diseased' | 'Pest Damage' | 'Nutrient Deficiency' | 'Physical/Environmental Damage' | 'Other Abnormality' | 'Unknown' | string;
  confidence: number;
}

export interface DiagnosisInfo {
  name: string;
  confidence?: number;
}

export interface StructuredRecommendation {
  explanation: string;
  fertilizer: string[];
  disease_management: string[];
  prevention: string[];
  safety_note?: string;
}

export interface RecommendedProductShop {
  shopOwnerId: string;
  shopName: string;
  phone?: string;
  city?: string;
  state?: string;
  pincode?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
}

export interface RecommendedProduct {
  productId: string;
  name: string;
  description?: string;
  category: string;
  brand: string;
  price: number;
  unit: string;
  stock: number;
  images: string[];
  shop: RecommendedProductShop;
}

export interface NearbyShopSummary {
  shopOwnerId: string;
  shopName: string;
  phone?: string;
  city?: string;
  address?: string;
  distanceKm: number;
  availableProductsCount: number;
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
  isValid?: boolean;
  is_valid?: boolean;
  isPlant?: boolean;
  isSupportedSpecies?: boolean;
  species?: string | null;
  speciesConfidence?: number;
  speciesSource?: string | null;
  diseaseConfidence?: number;
  healthStatus?: string | null;
  diagnosisStatus?: string;
  jointClass?: string;
  is_tomato?: boolean;
  detectedCrop?: string;
  plant?: PlantInfo;
  health?: HealthInfo;
  diagnosis?: DiagnosisInfo | null;
  severity?: 'None' | 'Mild' | 'Moderate' | 'Severe' | 'Unknown';
  recommendation?: string | StructuredRecommendation;
  recommendations?: string[];
  products?: RecommendedProduct[];
  nearbyShops?: NearbyShopSummary[];
  safety_note?: string;
  top5?: Array<{
    className?: string;
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
  isValid?: boolean;
  is_valid?: boolean;
  isPlant?: boolean;
  isSupportedSpecies?: boolean;
  species?: string | null;
  speciesConfidence?: number;
  speciesSource?: string | null;
  disease?: string | null;
  diseaseConfidence?: number;
  healthStatus?: string | null;
  diagnosisStatus?: string;
  recommendations?: string[];
  products?: RecommendedProduct[];
  nearbyShops?: NearbyShopSummary[];
  jointClass?: string;
  is_tomato?: boolean;
  detectedCrop?: string;
  crop?: string;
  condition?: string;
  confidence?: number;
  is_healthy?: boolean;
  plant?: PlantInfo;
  health?: HealthInfo;
  diagnosis?: DiagnosisInfo | null;
  severity?: 'None' | 'Mild' | 'Moderate' | 'Severe' | 'Unknown';
  recommendation?: string | StructuredRecommendation;
  safety_note?: string;
  top5?: Array<{
    className?: string;
    crop: string;
    plant?: string;
    disease: string;
    health_status?: string;
    probability: number;
  }>;
  analysis?: CropAnalysis;
  data?: any;
  error?: string;
  reason?: string;
}

export interface PredictionHistoryResponse {
  success: boolean;
  count: number;
  history: CropAnalysis[];
}
