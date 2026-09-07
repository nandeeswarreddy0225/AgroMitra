import { Router } from 'express';
import {
  getOwnerDashboardController,
  getMyMarketController,
  updateMyMarketController,
  addOrUpdateDailyPriceController,
  getCommoditiesController,
  createCommodityController,
  updateCommodityController,
  getTodayPricesController,
  getPriceHistoryController,
  compareMarketsController,
  getAdminMarketsController,
  getAdminOwnersController,
  setAdminOwnerStatusController,
  assignAdminMarketOwnerController,
  getAdminAuditsController,
} from '../controllers/marketOwner.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

export const marketOwnerRouter = Router();

// ==========================================
// Public Routes (Farmers, Consumers, General)
// ==========================================
marketOwnerRouter.get('/prices/today', getTodayPricesController);
marketOwnerRouter.get('/today', getTodayPricesController);
marketOwnerRouter.get('/prices/history', getPriceHistoryController);
marketOwnerRouter.get('/history', getPriceHistoryController);
marketOwnerRouter.get('/prices/compare', compareMarketsController);
marketOwnerRouter.get('/compare', compareMarketsController);
marketOwnerRouter.get('/commodities', getCommoditiesController);

// ==========================================
// Protected Routes: Market Owner & Admin
// ==========================================
marketOwnerRouter.get(
  '/dashboard',
  authenticate,
  authorize('MARKET_OWNER', 'ADMIN'),
  getOwnerDashboardController
);

marketOwnerRouter.get(
  '/my-market',
  authenticate,
  authorize('MARKET_OWNER', 'ADMIN'),
  getMyMarketController
);

marketOwnerRouter.put(
  '/my-market',
  authenticate,
  authorize('MARKET_OWNER', 'ADMIN'),
  updateMyMarketController
);

marketOwnerRouter.post(
  '/prices',
  authenticate,
  authorize('MARKET_OWNER', 'ADMIN'),
  addOrUpdateDailyPriceController
);

marketOwnerRouter.post(
  '/commodities',
  authenticate,
  authorize('MARKET_OWNER', 'ADMIN'),
  createCommodityController
);

marketOwnerRouter.put(
  '/commodities/:id',
  authenticate,
  authorize('MARKET_OWNER', 'ADMIN'),
  updateCommodityController
);

// ==========================================
// Protected Routes: Administrator Governance
// ==========================================
marketOwnerRouter.get(
  '/admin/markets',
  authenticate,
  authorize('ADMIN'),
  getAdminMarketsController
);

marketOwnerRouter.get(
  '/admin/owners',
  authenticate,
  authorize('ADMIN'),
  getAdminOwnersController
);

marketOwnerRouter.put(
  '/admin/owners/:id/status',
  authenticate,
  authorize('ADMIN'),
  setAdminOwnerStatusController
);

marketOwnerRouter.put(
  '/admin/markets/assign',
  authenticate,
  authorize('ADMIN'),
  assignAdminMarketOwnerController
);

marketOwnerRouter.get(
  '/admin/audits',
  authenticate,
  authorize('ADMIN'),
  getAdminAuditsController
);

export default marketOwnerRouter;
