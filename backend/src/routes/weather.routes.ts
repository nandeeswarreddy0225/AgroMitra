import { Router } from 'express';
import {
  getLiveWeatherController,
  getCurrentWeatherController,
  getWeatherForecastController,
} from '../controllers/weather.controller';

export const weatherRouter = Router();

// GET /api/weather
weatherRouter.get('/', getLiveWeatherController);

// GET /api/weather/current?district=&state=
weatherRouter.get('/current', getCurrentWeatherController);

// GET /api/weather/forecast?district=&state=
weatherRouter.get('/forecast', getWeatherForecastController);

export default weatherRouter;

