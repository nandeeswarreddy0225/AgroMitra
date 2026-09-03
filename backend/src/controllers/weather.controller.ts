import { Request, Response } from 'express';
import { WeatherService } from '../services/weather.service';

export const getLiveWeatherController = async (req: Request, res: Response): Promise<void> => {
  try {
    const latStr = req.query.lat as string | undefined;
    const lonStr = req.query.lon as string | undefined;
    const city = req.query.city as string | undefined;
    const state = req.query.state as string | undefined;

    const lat = latStr ? parseFloat(latStr) : undefined;
    const lon = lonStr ? parseFloat(lonStr) : undefined;

    const weather = await WeatherService.getLiveWeather({
      lat,
      lon,
      city,
      state,
    });

    res.status(200).json({
      success: true,
      weather,
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
