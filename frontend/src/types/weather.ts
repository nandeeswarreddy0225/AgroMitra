export interface WeatherLocation {
  city: string;
  district?: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface DayForecast {
  day: string;
  date: string;
  maxTemp: number;
  minTemp: number;
  rainProbability: number;
  condition: string;
  icon: string;
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
  forecast?: DayForecast[];
}

export interface WeatherResponse {
  success: boolean;
  weather: WeatherData;
  message?: string;
  forecast?: DayForecast[];
  temperature?: number;
  humidity?: number;
  rainProbability?: number;
  windSpeed?: number;
}

export interface WeatherQueryParams {
  lat?: number;
  lon?: number;
  city?: string;
  district?: string;
  state?: string;
}

