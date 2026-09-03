import axios from 'axios';

export interface WeatherData {
  location: {
    city: string;
    state?: string;
    country?: string;
    latitude: number;
    longitude: number;
  };
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

interface CacheEntry {
  data: WeatherData;
  expiresAt: number;
}

const weatherCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

// WMO Weather Interpretation Codes (WW)
const WMO_CODE_MAP: Record<number, { condition: string; icon: string }> = {
  0: { condition: 'Clear Sky', icon: '☀️' },
  1: { condition: 'Mainly Clear', icon: '🌤️' },
  2: { condition: 'Partly Cloudy', icon: '⛅' },
  3: { condition: 'Overcast', icon: '☁️' },
  45: { condition: 'Foggy', icon: '🌫️' },
  48: { condition: 'Depositing Rime Fog', icon: '🌫️' },
  51: { condition: 'Light Drizzle', icon: '🌦️' },
  53: { condition: 'Moderate Drizzle', icon: '🌧️' },
  55: { condition: 'Dense Drizzle', icon: '🌧️' },
  61: { condition: 'Slight Rain', icon: '🌧️' },
  63: { condition: 'Moderate Rain', icon: '🌧️' },
  65: { condition: 'Heavy Rain', icon: '🌧️' },
  71: { condition: 'Slight Snowfall', icon: '🌨️' },
  73: { condition: 'Moderate Snowfall', icon: '🌨️' },
  75: { condition: 'Heavy Snowfall', icon: '❄️' },
  80: { condition: 'Slight Rain Showers', icon: '🌦️' },
  81: { condition: 'Moderate Rain Showers', icon: '🌧️' },
  82: { condition: 'Violent Rain Showers', icon: '⛈️' },
  95: { condition: 'Thunderstorm', icon: '⛈️' },
  96: { condition: 'Thunderstorm with Slight Hail', icon: '⛈️' },
  99: { condition: 'Thunderstorm with Heavy Hail', icon: '⛈️' },
};

function getConditionInfo(code: number): { condition: string; icon: string } {
  return WMO_CODE_MAP[code] || { condition: 'Partly Cloudy', icon: '🌤️' };
}

function generateFarmAdvisory(temp: number, humidity: number, rainProb: number, windSpeed: number): string {
  if (rainProb >= 60) {
    return `High rain probability (${rainProb}%). Delay irrigation and foliar chemical spraying. Protect open grain and harvested produce.`;
  }
  if (rainProb >= 30) {
    return `Moderate rain probability (${rainProb}%). Check field drainage channels and monitor clouds before scheduling heavy irrigation.`;
  }
  if (windSpeed >= 20) {
    return `Brisk winds (${windSpeed} km/h). Avoid chemical pesticide spraying to minimize spray drift and uneven crop coverage.`;
  }
  if (temp >= 36) {
    return `High daytime temperature (${temp}°C). Ensure adequate moisture in root zones; carry out intercultural operations during early morning or evening.`;
  }
  if (humidity >= 80 && temp >= 24) {
    return `High humidity (${humidity}%) and warm weather favor fungal pathogens. Inspect leaf undersides regularly for early blight or mildew.`;
  }
  return `Optimal farm conditions (${temp}°C, ${humidity}% humidity). Favorable window for foliar feeding, weeding, and standard field maintenance.`;
}

export class WeatherService {
  /**
   * Reverse Geocode coordinates to find city, state, country name
   */
  public static async reverseGeocode(lat: number, lon: number): Promise<{
    city: string;
    state?: string;
    country?: string;
  }> {
    // 1. Try BigDataCloud reverse geocoding API
    try {
      const bdcRes = await axios.get('https://api.bigdatacloud.net/data/reverse-geocode-client', {
        params: {
          latitude: lat,
          longitude: lon,
          localityLanguage: 'en',
        },
        timeout: 5000,
      });

      if (bdcRes.data) {
        const city = bdcRes.data.city || bdcRes.data.locality || bdcRes.data.principalSubdivision;
        const state = bdcRes.data.principalSubdivision;
        const country = bdcRes.data.countryName || 'India';
        if (city) {
          return { city, state, country };
        }
      }
    } catch (err: any) {
      console.warn('[WeatherService] BigDataCloud reverse geocode fallback:', err.message);
    }

    // 2. Try OpenStreetMap Nominatim as fallback
    try {
      const nomRes = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          format: 'json',
          lat: lat,
          lon: lon,
        },
        headers: {
          'User-Agent': 'KrishiSetu-Agronomy/1.0',
        },
        timeout: 5000,
      });

      if (nomRes.data && nomRes.data.address) {
        const addr = nomRes.data.address;
        const city = addr.city || addr.town || addr.village || addr.suburb || addr.state_district || 'Local Region';
        const state = addr.state;
        const country = addr.country || 'India';
        return { city, state, country };
      }
    } catch (err: any) {
      console.warn('[WeatherService] Nominatim reverse geocode fallback:', err.message);
    }

    return {
      city: 'Current Location',
      country: 'India',
    };
  }

  /**
   * Forward Geocode a city/state string into coordinates using Open-Meteo Geocoding
   */
  public static async geocodeCity(query: string): Promise<{
    city: string;
    state?: string;
    country?: string;
    latitude: number;
    longitude: number;
  }> {
    try {
      const response = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
        params: {
          name: query,
          count: 1,
          language: 'en',
          format: 'json',
        },
        timeout: 6000,
      });

      if (response.data && response.data.results && response.data.results.length > 0) {
        const top = response.data.results[0];
        return {
          city: top.name,
          state: top.admin1 || undefined,
          country: top.country || 'India',
          latitude: Number(top.latitude),
          longitude: Number(top.longitude),
        };
      }
    } catch (err: any) {
      console.warn(`[WeatherService] Geocoding fallback for query "${query}":`, err.message);
    }

    // Default fallback: Kurnool, Andhra Pradesh
    return {
      city: query || 'Kurnool',
      state: 'Andhra Pradesh',
      country: 'India',
      latitude: 15.8281,
      longitude: 78.0373,
    };
  }

  /**
   * Fetch real live weather from Open-Meteo API with coordinate-specific caching
   */
  public static async getLiveWeather(options: {
    lat?: number;
    lon?: number;
    city?: string;
    state?: string;
  }): Promise<WeatherData> {
    let lat = options.lat;
    let lon = options.lon;
    let cityName = options.city;
    let stateName = options.state;
    let countryName = 'India';

    const hasExplicitCoords = lat !== undefined && lon !== undefined && !isNaN(lat) && !isNaN(lon);

    if (hasExplicitCoords) {
      // When coordinates are passed, resolve the real city and state dynamically via reverse geocoding
      if (!cityName || cityName === 'Local Farm' || cityName === 'Current Location') {
        const geocoded = await this.reverseGeocode(lat!, lon!);
        cityName = geocoded.city;
        stateName = geocoded.state || stateName;
        countryName = geocoded.country || countryName;
      }
    } else {
      // When no coordinates are passed, forward geocode city/state
      const locationQuery = [cityName, stateName].filter(Boolean).join(', ') || 'Kurnool, Andhra Pradesh';
      const resolved = await this.geocodeCity(locationQuery);
      lat = resolved.latitude;
      lon = resolved.longitude;
      cityName = resolved.city;
      stateName = resolved.state || stateName;
      countryName = resolved.country || countryName;
    }

    // Key cache strictly by rounded coordinates (e.g. 12.97_77.59 for Bengaluru vs 15.83_78.04 for Kurnool)
    const cacheKey = `weather_${Number(lat).toFixed(2)}_${Number(lon).toFixed(2)}`;
    const cached = weatherCache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return {
        ...cached.data,
        cached: true,
      };
    }

    try {
      const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: lat,
          longitude: lon,
          current: [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'precipitation',
            'weather_code',
            'wind_speed_10m',
          ].join(','),
          hourly: 'precipitation_probability',
          timezone: 'auto',
          forecast_days: 1,
        },
        timeout: 8000,
      });

      const current = response.data?.current;
      if (!current) {
        throw new Error('Invalid response structure from weather provider');
      }

      const temp = Math.round(Number(current.temperature_2m || 0));
      const feelsLike = Math.round(Number(current.apparent_temperature || temp));
      const humidity = Math.round(Number(current.relative_humidity_2m || 0));
      const windSpeed = Math.round(Number(current.wind_speed_10m || 0));
      const precipitation = Number(current.precipitation || 0);
      const code = Number(current.weather_code || 0);

      // Extract current hour's precipitation probability if available
      let rainProbability = 0;
      const hourlyProbs = response.data?.hourly?.precipitation_probability;
      if (Array.isArray(hourlyProbs) && hourlyProbs.length > 0) {
        const currentHour = new Date().getHours();
        rainProbability = Number(hourlyProbs[currentHour] ?? hourlyProbs[0] ?? 0);
      }

      const { condition, icon } = getConditionInfo(code);
      const advisory = generateFarmAdvisory(temp, humidity, rainProbability, windSpeed);

      const weatherResult: WeatherData = {
        location: {
          city: cityName || 'Current Location',
          state: stateName,
          country: countryName,
          latitude: Number(lat),
          longitude: Number(lon),
        },
        temperature: temp,
        feelsLike: feelsLike,
        humidity: humidity,
        windSpeed: windSpeed,
        rainProbability: rainProbability,
        precipitation: precipitation,
        condition: condition,
        conditionCode: code,
        icon: icon,
        advisory: advisory,
        lastUpdated: new Date().toISOString(),
        cached: false,
      };

      // Save to cache
      weatherCache.set(cacheKey, {
        data: weatherResult,
        expiresAt: now + CACHE_TTL_MS,
      });

      return weatherResult;
    } catch (err: any) {
      console.error('[WeatherService] Live weather fetch error:', err.message);
      throw new Error(`Failed to fetch live weather data: ${err.message}`);
    }
  }
}
