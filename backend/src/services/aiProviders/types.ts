export type DiagnosisStatus =
  | 'DIAGNOSED'
  | 'HEALTHY'
  | 'UNKNOWN_SPECIES'
  | 'DISEASE_UNCERTAIN'
  | 'NON_PLANT'
  | 'INVALID_IMAGE';

export type SpeciesSource = 'EXISTING_ONNX' | 'GENERAL_PLANT_MODEL' | null;

export type HealthStatus = 'Healthy' | 'Disease Detected' | 'Uncertain' | null;

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

export interface StandardAgriculturalResponse {
  success: boolean;
  isValid: boolean;
  isPlant: boolean;
  species: string | null;
  speciesConfidence: number | null;
  speciesSource: SpeciesSource;
  disease: string | null;
  diseaseConfidence: number | null;
  healthStatus: HealthStatus;
  diagnosisStatus: DiagnosisStatus;
  recommendations: string[];
  products: RecommendedProduct[];
  nearbyShops: NearbyShopSummary[];
  error: string | null;

  // Compatibility and rich guidance fields for existing frontend & clients
  crop?: string | null;
  condition?: string | null;
  is_healthy?: boolean;
  confidence?: number;
  plant?: {
    name: string;
    scientificName?: string;
    family?: string;
    teluguName?: string;
    displayName?: string;
    confidence?: number;
  };
  health?: {
    status: 'Healthy' | 'Diseased' | 'Uncertain' | string;
    confidence?: number;
  };
  diagnosis?: {
    name: string;
    severity?: string;
    confidence?: number;
  } | null;
  severity?: string;
  recommendation?: any;
  safety_note?: string;
  top5?: Array<{
    crop: string;
    disease: string;
    probability: number;
    jointClass?: string;
  }>;
  data?: any;
  analysis?: any;
  message?: string;
  is_tomato?: boolean;
  is_valid?: boolean;
  isSupportedSpecies?: boolean;
}

export interface PlantIdentificationResult {
  isPlant: boolean;
  species: string | null;
  confidence: number | null;
  source: SpeciesSource;
  isSupportedSpecies: boolean;
  error?: string | null;
  rawDetails?: any;
}

export interface DiseaseDiagnosisResult {
  disease: string | null;
  confidence: number | null;
  healthStatus: HealthStatus;
  diagnosisStatus: DiagnosisStatus;
  isHealthy: boolean;
  severity?: string;
  symptoms?: string[];
  recommendation?: any;
  top5?: any[];
  error?: string | null;
}
