export interface WeatherLocation {
  city: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface WeatherData {
  location: WeatherLocation;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  rainProbability: number;
  precipitation: number;
  condition: string;
  conditionCode: number;
  icon: string;
  advisory: string;
  lastUpdated: string;
  cached?: boolean;
}

export interface WeatherResponse {
  success: boolean;
  weather: WeatherData;
  message?: string;
}

export interface WeatherQueryParams {
  lat?: number;
  lon?: number;
  city?: string;
  state?: string;
}
