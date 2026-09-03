import { Router } from 'express';
import { getLiveWeatherController } from '../controllers/weather.controller';

export const weatherRouter = Router();

// GET /api/weather
weatherRouter.get('/', getLiveWeatherController);

export default weatherRouter;
