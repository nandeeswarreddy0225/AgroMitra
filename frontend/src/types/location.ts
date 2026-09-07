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

export interface CoordinateValidationResponse {
  success: boolean;
  isValid: boolean;
  isWithinIndia: boolean;
  latitude?: number;
  longitude?: number;
  message?: string;
}

export interface ReverseGeocodeResponse {
  success: boolean;
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  state: string;
  country: string;
  formattedAddress: string;
  isWithinIndia: boolean;
  source: string;
  message?: string;
}

export interface GPSLocationState {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  formattedAddress?: string;
  isDetecting: boolean;
  isDenied: boolean;
  error?: string | null;
  source?: 'GPS' | 'PINCODE' | 'MANUAL';
  timestamp?: number;
}
