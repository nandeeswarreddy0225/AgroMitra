import { Request, Response } from 'express';
import { WeatherService } from '../services/weather.service';
import { LocationService } from '../services/location.service';

export const getLiveWeatherController = async (req: Request, res: Response): Promise<void> => {
  try {
    const latStr = (req.query.lat || req.query.latitude) as string | undefined;
    const lonStr = (req.query.lon || req.query.lng || req.query.longitude) as string | undefined;
    let city = (req.query.city || req.query.district || req.query.q) as string | undefined;
    let state = req.query.state as string | undefined;
    const pincode = (req.query.pincode || req.query.pin) as string | undefined;

    let lat: number | undefined;
    let lon: number | undefined;

    if (latStr !== undefined || lonStr !== undefined) {
      const coordValidation = LocationService.validateCoordinates(latStr, lonStr);
      if (!coordValidation.isValid) {
        res.status(400).json({
          success: false,
          message: coordValidation.message || 'Invalid coordinates provided.',
        });
        return;
      }
      lat = coordValidation.latitude;
      lon = coordValidation.longitude;
    } else if (pincode && pincode.trim().length === 6) {
      const pinResult = await LocationService.lookupPincode(pincode.trim());
      if (pinResult.success) {
        city = pinResult.district || pinResult.city || city;
        state = pinResult.state || state;
      }
    }

    const weather = await WeatherService.getLiveWeather({
      lat,
      lon,
      city,
      state,
      district: req.query.district as string | undefined,
    });

    res.status(200).json({
      success: true,
      weather,
      temperature: weather.temperature,
      feelsLike: weather.feelsLike,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
      rainProbability: weather.rainProbability,
      precipitation: weather.precipitation,
      condition: weather.condition,
      conditionCode: weather.conditionCode,
      icon: weather.icon,
      advisory: weather.advisory,
      location: weather.location,
      forecast: weather.forecast,
    });
  } catch (error: any) {
    console.error('[WeatherController] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Unable to load live weather right now.',
      error: error.message,
    });
  }
};

export const getCurrentWeatherController = getLiveWeatherController;

export const getWeatherForecastController = async (req: Request, res: Response): Promise<void> => {
  try {
    const latStr = (req.query.lat || req.query.latitude) as string | undefined;
    const lonStr = (req.query.lon || req.query.lng || req.query.longitude) as string | undefined;
    let city = (req.query.city || req.query.district || req.query.q) as string | undefined;
    let state = req.query.state as string | undefined;
    const pincode = (req.query.pincode || req.query.pin) as string | undefined;

    let lat: number | undefined;
    let lon: number | undefined;

    if (latStr !== undefined || lonStr !== undefined) {
      const coordValidation = LocationService.validateCoordinates(latStr, lonStr);
      if (!coordValidation.isValid) {
        res.status(400).json({
          success: false,
          message: coordValidation.message || 'Invalid coordinates provided.',
        });
        return;
      }
      lat = coordValidation.latitude;
      lon = coordValidation.longitude;
    } else if (pincode && pincode.trim().length === 6) {
      const pinResult = await LocationService.lookupPincode(pincode.trim());
      if (pinResult.success) {
        city = pinResult.district || pinResult.city || city;
        state = pinResult.state || state;
      }
    }

    const weather = await WeatherService.getLiveWeather({
      lat,
      lon,
      city,
      state,
      district: req.query.district as string | undefined,
    });

    res.status(200).json({
      success: true,
      weather,
      forecast: weather.forecast || [],
      location: weather.location,
      temperature: weather.temperature,
      humidity: weather.humidity,
      rainProbability: weather.rainProbability,
      windSpeed: weather.windSpeed,
    });
  } catch (error: any) {
    console.error('[WeatherForecastController] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Unable to load weather forecast right now.',
      error: error.message,
    });
  }
};

