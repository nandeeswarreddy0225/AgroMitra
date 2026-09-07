import axios from 'axios';
import { PincodeService, PincodeLookupResult } from './pincode.service';

export interface CoordinateValidationResult {
  isValid: boolean;
  isWithinIndia: boolean;
  latitude?: number;
  longitude?: number;
  message?: string;
}

export interface ReverseGeocodeResult {
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

export interface LocationPreparationPayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  state?: string;
  district?: string;
  city?: string;
  pincode?: string;
  source?: 'GPS' | 'PINCODE' | 'MANUAL';
  timestamp?: string;
}

// In-memory reverse-geocoding cache to prevent redundant external API hits
const reverseGeocodeCache = new Map<string, { data: ReverseGeocodeResult; expiresAt: number }>();
const REVERSE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Indian Agricultural Districts Reference Map for Offline Reverse Geocoding
const INDIAN_DISTRICT_REFERENCE: Record<string, { lat: number; lon: number; city: string; district: string; state: string }> = {
  // Andhra Pradesh
  kurnool: { lat: 15.8281, lon: 78.0373, city: 'Kurnool', district: 'Kurnool', state: 'Andhra Pradesh' },
  adoni: { lat: 15.6268, lon: 77.2750, city: 'Adoni', district: 'Kurnool', state: 'Andhra Pradesh' },
  nandyal: { lat: 15.4883, lon: 78.4832, city: 'Nandyal', district: 'Nandyal', state: 'Andhra Pradesh' },
  guntur: { lat: 16.3067, lon: 80.4365, city: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh' },
  tenali: { lat: 16.2437, lon: 80.6400, city: 'Tenali', district: 'Guntur', state: 'Andhra Pradesh' },
  vijayawada: { lat: 16.5062, lon: 80.6480, city: 'Vijayawada', district: 'Krishna', state: 'Andhra Pradesh' },
  anantapur: { lat: 14.6819, lon: 77.6006, city: 'Anantapur', district: 'Anantapur', state: 'Andhra Pradesh' },
  kadapa: { lat: 14.4673, lon: 78.8242, city: 'Kadapa', district: 'YSR Kadapa', state: 'Andhra Pradesh' },
  tirupati: { lat: 13.6288, lon: 79.4192, city: 'Tirupati', district: 'Tirupati', state: 'Andhra Pradesh' },
  visakhapatnam: { lat: 17.6868, lon: 83.2185, city: 'Visakhapatnam', district: 'Visakhapatnam', state: 'Andhra Pradesh' },
  nellore: { lat: 14.4426, lon: 79.9865, city: 'Nellore', district: 'Nellore', state: 'Andhra Pradesh' },
  eluru: { lat: 16.7107, lon: 81.0952, city: 'Eluru', district: 'Eluru', state: 'Andhra Pradesh' },
  kakinada: { lat: 16.9891, lon: 82.2475, city: 'Kakinada', district: 'Kakinada', state: 'Andhra Pradesh' },

  // Karnataka
  bengaluru: { lat: 12.9716, lon: 77.5946, city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka' },
  gangavathi: { lat: 15.4326, lon: 76.5312, city: 'Gangavathi', district: 'Koppal', state: 'Karnataka' },
  koppal: { lat: 15.3486, lon: 76.1554, city: 'Koppal', district: 'Koppal', state: 'Karnataka' },
  sindhanur: { lat: 15.7725, lon: 76.7617, city: 'Sindhanur', district: 'Raichur', state: 'Karnataka' },
  raichur: { lat: 16.2120, lon: 77.3439, city: 'Raichur', district: 'Raichur', state: 'Karnataka' },
  ballari: { lat: 15.1394, lon: 76.9214, city: 'Ballari', district: 'Ballari', state: 'Karnataka' },
  hiriyur: { lat: 13.9472, lon: 76.6214, city: 'Hiriyur', district: 'Chitradurga', state: 'Karnataka' },
  chitradurga: { lat: 14.2251, lon: 76.3980, city: 'Chitradurga', district: 'Chitradurga', state: 'Karnataka' },
  bidar: { lat: 17.9104, lon: 77.5199, city: 'Bidar', district: 'Bidar', state: 'Karnataka' },
  basavakalyan: { lat: 17.8732, lon: 76.9507, city: 'Basavakalyan', district: 'Bidar', state: 'Karnataka' },
  mysuru: { lat: 12.2958, lon: 76.6394, city: 'Mysuru', district: 'Mysuru', state: 'Karnataka' },
  hubballi: { lat: 15.3647, lon: 75.1240, city: 'Hubballi', district: 'Dharwad', state: 'Karnataka' },
  belagavi: { lat: 15.8497, lon: 74.4977, city: 'Belagavi', district: 'Belagavi', state: 'Karnataka' },
  vijayapura: { lat: 16.8302, lon: 75.7100, city: 'Vijayapura', district: 'Vijayapura', state: 'Karnataka' },

  // Telangana
  hyderabad: { lat: 17.3850, lon: 78.4867, city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana' },
  warangal: { lat: 17.9689, lon: 79.5941, city: 'Warangal', district: 'Warangal', state: 'Telangana' },
  karimnagar: { lat: 18.4386, lon: 79.1288, city: 'Karimnagar', district: 'Karimnagar', state: 'Telangana' },
  nalgonda: { lat: 17.0577, lon: 79.2684, city: 'Nalgonda', district: 'Nalgonda', state: 'Telangana' },
  khammam: { lat: 17.2473, lon: 80.1514, city: 'Khammam', district: 'Khammam', state: 'Telangana' },
  nizamabad: { lat: 18.6725, lon: 78.0941, city: 'Nizamabad', district: 'Nizamabad', state: 'Telangana' },
  mahabubnagar: { lat: 16.7488, lon: 77.9856, city: 'Mahabubnagar', district: 'Mahabubnagar', state: 'Telangana' },

  // Maharashtra
  mumbai: { lat: 19.0760, lon: 72.8777, city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra' },
  pune: { lat: 18.5204, lon: 73.8567, city: 'Pune', district: 'Pune', state: 'Maharashtra' },
  nagpur: { lat: 21.1458, lon: 79.0882, city: 'Nagpur', district: 'Nagpur', state: 'Maharashtra' },
  nashik: { lat: 19.9975, lon: 73.7898, city: 'Nashik', district: 'Nashik', state: 'Maharashtra' },
  aurangabad: { lat: 19.8762, lon: 75.3433, city: 'Chhatrapati Sambhajinagar', district: 'Chhatrapati Sambhajinagar', state: 'Maharashtra' },
  amravati: { lat: 20.9374, lon: 77.7796, city: 'Amravati', district: 'Amravati', state: 'Maharashtra' },
  solapur: { lat: 17.6599, lon: 75.9064, city: 'Solapur', district: 'Solapur', state: 'Maharashtra' },
  kolhapur: { lat: 16.7050, lon: 74.2433, city: 'Kolhapur', district: 'Kolhapur', state: 'Maharashtra' },

  // Tamil Nadu, Delhi, Punjab, MP, Rajasthan, Gujarat, UP
  chennai: { lat: 13.0827, lon: 80.2707, city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu' },
  coimbatore: { lat: 11.0168, lon: 76.9558, city: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu' },
  delhi: { lat: 28.6139, lon: 77.2090, city: 'New Delhi', district: 'New Delhi', state: 'Delhi' },
  ludhiana: { lat: 30.9010, lon: 75.8573, city: 'Ludhiana', district: 'Ludhiana', state: 'Punjab' },
  bhopal: { lat: 23.2599, lon: 77.4126, city: 'Bhopal', district: 'Bhopal', state: 'Madhya Pradesh' },
  indore: { lat: 22.7196, lon: 75.8577, city: 'Indore', district: 'Indore', state: 'Madhya Pradesh' },
  jaipur: { lat: 26.9124, lon: 75.7873, city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan' },
  ahmedabad: { lat: 23.0225, lon: 72.5714, city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat' },
  lucknow: { lat: 26.8467, lon: 80.9462, city: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh' },
  patna: { lat: 25.5941, lon: 85.1376, city: 'Patna', district: 'Patna', state: 'Bihar' },
};

export class LocationService {
  /**
   * Validate geographical coordinates
   */
  public static validateCoordinates(rawLat: any, rawLon: any): CoordinateValidationResult {
    if (rawLat === undefined || rawLat === null || rawLon === undefined || rawLon === null) {
      return {
        isValid: false,
        isWithinIndia: false,
        message: 'Both latitude and longitude coordinates are required.',
      };
    }

    const lat = Number(rawLat);
    const lon = Number(rawLon);

    if (isNaN(lat) || isNaN(lon)) {
      return {
        isValid: false,
        isWithinIndia: false,
        message: 'Coordinates must be valid decimal numbers.',
      };
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return {
        isValid: false,
        isWithinIndia: false,
        message: 'Latitude must be between -90 and 90, and longitude between -180 and 180.',
      };
    }

    // Indian Territorial Bounding Box: Latitude ~6.0° to 38.0° N, Longitude ~68.0° to 98.0° E
    const isWithinIndia = lat >= 6.0 && lat <= 38.0 && lon >= 68.0 && lon <= 98.0;

    return {
      isValid: true,
      isWithinIndia,
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lon.toFixed(6)),
      message: isWithinIndia ? 'Valid Indian agricultural coordinates.' : 'Coordinates are valid but outside India.',
    };
  }

  /**
   * Privacy-Preserving Reverse Geocoding with Multi-Tier Resolution
   */
  public static async reverseGeocode(rawLat: any, rawLon: any): Promise<ReverseGeocodeResult> {
    const val = this.validateCoordinates(rawLat, rawLon);
    if (!val.isValid || val.latitude === undefined || val.longitude === undefined) {
      return {
        success: false,
        latitude: Number(rawLat) || 0,
        longitude: Number(rawLon) || 0,
        city: '',
        district: '',
        state: '',
        country: '',
        formattedAddress: '',
        isWithinIndia: false,
        source: 'Validation Error',
        message: val.message,
      };
    }

    const lat = val.latitude;
    const lon = val.longitude;
    const cacheKey = `${lat.toFixed(3)}_${lon.toFixed(3)}`;

    // 1. Check in-memory reverse cache
    const cached = reverseGeocodeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.data };
    }

    // 2. Tier 1: Free BigDataCloud Reverse Geocoder
    try {
      const bdcRes = await axios.get('https://api.bigdatacloud.net/data/reverse-geocode-client', {
        params: { latitude: lat, longitude: lon, localityLanguage: 'en' },
        timeout: 4000,
      });

      if (bdcRes.data) {
        const d = bdcRes.data;
        const city = d.city || d.locality || d.principalSubdivision || 'Local Region';
        const state = d.principalSubdivision || '';
        const district = d.locality || d.city || state;
        const country = d.countryName || 'India';
        const formatted = [city, state, country].filter(Boolean).join(', ');

        const result: ReverseGeocodeResult = {
          success: true,
          latitude: lat,
          longitude: lon,
          city,
          district,
          state,
          country,
          formattedAddress: formatted,
          isWithinIndia: val.isWithinIndia,
          source: 'BigDataCloud Geocoder',
        };

        reverseGeocodeCache.set(cacheKey, { data: result, expiresAt: Date.now() + REVERSE_CACHE_TTL_MS });
        return result;
      }
    } catch {
      // Proceed to Tier 2
    }

    // 3. Tier 2: OpenStreetMap Nominatim
    try {
      const osmRes = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: { lat, lon, format: 'json', zoom: 10 },
        headers: { 'User-Agent': 'AgroMitra-LocationIntelligence/1.0' },
        timeout: 4000,
      });

      if (osmRes.data?.address) {
        const addr = osmRes.data.address;
        const city = addr.city || addr.town || addr.village || addr.suburb || addr.state_district || 'Local Area';
        const state = addr.state || '';
        const district = addr.county || addr.state_district || addr.district || city;
        const country = addr.country || 'India';
        const formatted = [city, district, state].filter(Boolean).join(', ');

        const result: ReverseGeocodeResult = {
          success: true,
          latitude: lat,
          longitude: lon,
          city,
          district,
          state,
          country,
          formattedAddress: formatted,
          isWithinIndia: val.isWithinIndia,
          source: 'OpenStreetMap Nominatim',
        };

        reverseGeocodeCache.set(cacheKey, { data: result, expiresAt: Date.now() + REVERSE_CACHE_TTL_MS });
        return result;
      }
    } catch {
      // Proceed to Tier 3
    }

    // 4. Tier 3: Local Nearest Indian District Reference Match (Haversine formula)
    let closest: { city: string; district: string; state: string } | null = null;
    let minDistance = Infinity;

    for (const ref of Object.values(INDIAN_DISTRICT_REFERENCE)) {
      const dLat = (ref.lat - lat) * (Math.PI / 180);
      const dLon = (ref.lon - lon) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat * (Math.PI / 180)) * Math.cos(ref.lat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distKm = 6371 * c;

      if (distKm < minDistance) {
        minDistance = distKm;
        closest = { city: ref.city, district: ref.district, state: ref.state };
      }
    }

    if (closest && minDistance <= 80) {
      const result: ReverseGeocodeResult = {
        success: true,
        latitude: lat,
        longitude: lon,
        city: closest.city,
        district: closest.district,
        state: closest.state,
        country: 'India',
        formattedAddress: `${closest.city}, ${closest.district}, ${closest.state}`,
        isWithinIndia: val.isWithinIndia,
        source: `Regional Reference (${Math.round(minDistance)} km from ${closest.city})`,
      };
      reverseGeocodeCache.set(cacheKey, { data: result, expiresAt: Date.now() + REVERSE_CACHE_TTL_MS });
      return result;
    }

    // 5. Clean GPS coordinate representation fallback
    const result: ReverseGeocodeResult = {
      success: true,
      latitude: lat,
      longitude: lon,
      city: `GPS (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
      district: val.isWithinIndia ? 'Indian Agricultural Zone' : 'International Region',
      state: val.isWithinIndia ? 'India' : 'Unknown',
      country: val.isWithinIndia ? 'India' : 'Unknown',
      formattedAddress: `GPS Coordinates (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`,
      isWithinIndia: val.isWithinIndia,
      source: 'Coordinate Geometry',
    };

    reverseGeocodeCache.set(cacheKey, { data: result, expiresAt: Date.now() + REVERSE_CACHE_TTL_MS });
    return result;
  }

  /**
   * Pincode Lookup proxying PincodeService
   */
  public static async lookupPincode(pincode: string): Promise<PincodeLookupResult> {
    return PincodeService.lookup(pincode);
  }
}

export default LocationService;
