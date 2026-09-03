import { Router } from 'express';
import {
  getMandiPricesController,
  getMarketIntelligenceController,
} from '../controllers/mandiPrice.controller';

export const mandiPriceRouter = Router();

// GET /api/mandi-prices and aliases
mandiPriceRouter.get('/', getMandiPricesController);
mandiPriceRouter.get('/prices', getMandiPricesController);

// GET /api/mandi-prices/intelligence and /analysis
mandiPriceRouter.get('/intelligence', getMarketIntelligenceController);
mandiPriceRouter.get('/analysis', getMarketIntelligenceController);

export default mandiPriceRouter;

