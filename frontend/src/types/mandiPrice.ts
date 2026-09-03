export interface MandiPriceRecord {
  id: string;
  commodity: string;
  variety: string;
  grade: string;
  state: string;
  district: string;
  market: string;
  minPrice: number;
  modalPrice: number;
  maxPrice: number;
  priceDate: string;
  source: string;
  priceChangePercent?: number | null;
}

export interface MandiPriceResponse {
  success: boolean;
  source: string;
  isCached: boolean;
  cachedAt: string;
  totalRecords: number;
  records: MandiPriceRecord[];
  filterOptions: {
    states: string[];
    commodities: string[];
  };
  marketInsight: string;
  message?: string;
}

export interface MandiPriceQueryParams {
  state?: string;
  district?: string;
  market?: string;
  commodity?: string;
  limit?: number;
  refresh?: boolean;
}

export interface HistoricalPricePoint {
  date: string;
  price: number;
  market?: string;
  isHistorical: boolean;
  type: string;
  lowerBound?: number;
  upperBound?: number;
}

export interface AIMarketForecast {
  trend: string;
  confidenceScore: number | null;
  forecastSummary: string;
  projectionPoints: HistoricalPricePoint[];
  disclaimer: string;
}

export interface AIMarketIntelligenceResponse {
  success: boolean;
  commodity: string;
  state?: string;
  latestPrice: number;
  latestDate: string;
  latestMarket: string;
  previousPrice: number | null;
  previousDate: string | null;
  priceChangeAmount: number | null;
  priceChangePercent: number | null;
  trend: 'Rising' | 'Falling' | 'Stable';
  highestObserved: {
    price: number;
    market: string;
    date: string;
  };
  lowestObserved: {
    price: number;
    market: string;
    date: string;
  };
  averagePrice: number;
  observationCount: number;
  aiExplanation: string;
  historicalData: HistoricalPricePoint[];
  hasEnoughDataForForecast: boolean;
  forecast: AIMarketForecast | null;
  forecastMessage: string | null;
  source: string;
  message?: string;
}
