export interface Market {
  id: string;
  _id?: string;
  name: string;
  marketCode?: string;
  address: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  location?: { lat: number; lon: number };
  owner?: any;
  contactPerson?: string;
  contactPhone?: string;
  operatingHours?: string | { open?: string; close?: string };
  status?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Commodity {
  id: string;
  _id?: string;
  name: string;
  category: string;
  variety?: string;
  defaultUnit: string;
  allowedUnits: string[];
  icon: string;
  isActive: boolean;
}

export interface MarketPriceRecord {
  id: string;
  _id?: string;
  commodity: string | Commodity;
  commodityName: string;
  category?: string;
  market: string | Market;
  marketName: string;
  state: string;
  district: string;
  city?: string;
  marketOwner?: any;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  unit: string;
  priceDate: string;
  updatedTime: string;
  status: 'ACTIVE' | 'SUPERSEDED';
  priceChangePercent?: number | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MarketPriceHistoryData {
  success?: boolean;
  message?: string;
  commodity: string;
  market: string;
  todayPrice: MarketPriceRecord | null;
  yesterdayPrice: MarketPriceRecord | null;
  sevenDayHistory: MarketPriceRecord[];
  thirtyDayHistory: MarketPriceRecord[];
  previousPrice?: number | null;
  currentPrice?: number | null;
  absoluteChange?: number | null;
  trend: 'Rising' | 'Falling' | 'Stable';
  percentageChange: number | null;
  highestPrice: number;
  lowestPrice: number;
  averagePrice: number;
  insufficientData?: boolean;
  dataPointsCount?: number;
  historyPoints: {
    date: string;
    minPrice: number;
    maxPrice: number;
    modalPrice: number;
    updatedTime: string;
  }[];
}

export interface MarketComparisonItem {
  marketId: string;
  marketName: string;
  district: string;
  state: string;
  distanceKm: number | null;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  previousModalPrice?: number | null;
  absoluteChange?: number | null;
  percentageChange?: number | null;
  trend?: 'Rising' | 'Falling' | 'Stable';
  isHighest?: boolean;
  isLowest?: boolean;
  unit: string;
  priceDate: string;
  updatedTime: string;
  lastUpdatedText: string;
  isToday: boolean;
  contactPhone?: string;
}

export interface MarketComparisonResponse {
  success: boolean;
  commodity: string;
  userLocation: { lat?: number; lon?: number };
  totalMarkets: number;
  highestPriceMarket?: {
    marketId: string;
    marketName: string;
    modalPrice: number;
    district: string;
    state: string;
  } | null;
  lowestPriceMarket?: {
    marketId: string;
    marketName: string;
    modalPrice: number;
    district: string;
    state: string;
  } | null;
  averageModalPrice?: number;
  priceSpread?: number;
  comparisons: MarketComparisonItem[];
}

export interface PriceAuditRecord {
  id: string;
  _id?: string;
  market: string | Market;
  marketName: string;
  commodity: string | Commodity;
  commodityName: string;
  user?: any;
  changedBy?: any;
  changedByName?: string;
  changedByRole?: string;
  action: 'CREATE' | 'UPDATE' | 'DISABLE' | 'DELETE';
  previousPrice?: {
    minPrice?: number;
    maxPrice?: number;
    modalPrice?: number;
    unit?: string;
  };
  newPrice: {
    minPrice: number;
    maxPrice: number;
    modalPrice: number;
    unit: string;
  };
  priceDate: string;
  updatedTime: string;
  notes?: string;
  isFlaggedSuspicious?: boolean;
  isSuspiciousChange?: boolean;
  suspicionReason?: string;
  createdAt: string;
}

export interface MarketOwnerDashboardData {
  success: boolean;
  market: Market;
  todayDate: string;
  totalCommodities: number;
  updatedTodayCount: number;
  pendingTodayCount: number;
  recentUpdates: MarketPriceRecord[];
  todayPrices: MarketPriceRecord[];
  recentAudits: PriceAuditRecord[];
}

export interface AddPricePayload {
  commodityId: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  unit?: string;
  priceDate?: string;
  notes?: string;
}

export interface PincodeLookupResponse {
  success: boolean;
  pincode: string;
  state: string;
  district: string;
  city: string;
  postOfficeName?: string;
  offices?: string[];
  source?: string;
  message?: string;
}
