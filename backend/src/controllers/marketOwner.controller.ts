import { Request, Response } from 'express';
import { MarketOwnerService } from '../services/marketOwner.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { MarketPrice } from '../models/MarketPrice.model';
import { LocationService } from '../services/location.service';

export const getOwnerDashboardController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const data = await MarketOwnerService.getOwnerDashboard(req.user._id);
    res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    console.error('[MarketOwnerController] getOwnerDashboard error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load Market Owner dashboard.',
    });
  }
};

export const getMyMarketController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const market = await MarketOwnerService.getOwnerMarket(req.user._id);
    res.status(200).json({
      success: true,
      market,
    });
  } catch (error: any) {
    console.error('[MarketOwnerController] getMyMarket error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load market profile.',
    });
  }
};

export const updateMyMarketController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const market = await MarketOwnerService.updateOwnerMarket(req.user._id, req.body);
    res.status(200).json({
      success: true,
      message: 'Market details updated successfully.',
      market,
    });
  } catch (error: any) {
    console.error('[MarketOwnerController] updateMyMarket error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update market details.',
    });
  }
};

export const addOrUpdateDailyPriceController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { commodityId, minPrice, maxPrice, modalPrice, unit, priceDate, notes } = req.body;

    if (!commodityId || minPrice === undefined || maxPrice === undefined || modalPrice === undefined) {
      res.status(400).json({
        success: false,
        message: 'Commodity ID, minimum price, maximum price, and modal price are required.',
      });
      return;
    }

    const result = await MarketOwnerService.addOrUpdateDailyPrice(req.user, {
      commodityId,
      minPrice: Number(minPrice),
      maxPrice: Number(maxPrice),
      modalPrice: Number(modalPrice),
      unit: unit || 'quintal',
      priceDate,
      notes,
    });

    res.status(200).json({
      success: true,
      price: result.marketPrice,
      ...result,
    });
  } catch (error: any) {
    console.error('[MarketOwnerController] addOrUpdateDailyPrice error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to save market price.',
    });
  }
};

export const getCommoditiesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const includeInactive = req.query.includeInactive === 'true';

    const commodities = await MarketOwnerService.getCommodities({
      category,
      search,
      includeInactive,
    });

    res.status(200).json({
      success: true,
      count: commodities.length,
      commodities,
    });
  } catch (error: any) {
    console.error('[MarketOwnerController] getCommodities error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve commodities list.',
    });
  }
};

export const createCommodityController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { name, category, variety, defaultUnit, allowedUnits, icon } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        message: 'Commodity name is required.',
      });
      return;
    }

    const commodity = await MarketOwnerService.createCommodity(req.user, {
      name,
      category,
      variety,
      defaultUnit,
      allowedUnits,
      icon,
    });

    res.status(201).json({
      success: true,
      message: `Commodity '${commodity.name}' added successfully.`,
      commodity,
    });
  } catch (error: any) {
    console.error('[MarketOwnerController] createCommodity error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to add commodity.',
    });
  }
};

export const updateCommodityController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id;
    const commodity = await MarketOwnerService.updateCommodity(id, req.body);

    res.status(200).json({
      success: true,
      message: `Commodity '${commodity.name}' updated successfully.`,
      commodity,
    });
  } catch (error: any) {
    console.error('[MarketOwnerController] updateCommodity error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update commodity.',
    });
  }
};

export const getTodayPricesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const state = req.query.state as string | undefined;
    const district = req.query.district as string | undefined;
    const marketId = req.query.marketId as string | undefined;
    const commodity = req.query.commodity as string | undefined;
    const todayDate = req.query.date as string || new Date().toISOString().split('T')[0];

    const query: any = { status: 'ACTIVE' };
    if (todayDate) query.priceDate = todayDate;
    if (state && state.trim()) query.state = state.trim();
    if (district && district.trim()) query.district = district.trim();
    if (marketId && marketId.trim()) query.market = marketId.trim();
    if (commodity && commodity.trim()) {
      query.commodityName = new RegExp(commodity.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
    }

    const records = await MarketPrice.find(query)
      .sort({ updatedAt: -1 })
      .populate('commodity')
      .populate('market');

    res.status(200).json({
      success: true,
      date: todayDate,
      totalRecords: records.length,
      records,
      prices: records,
    });
  } catch (error: any) {
    console.error('[MarketOwnerController] getTodayPrices error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve today market prices.',
    });
  }
};

export const getPriceHistoryController = async (req: Request, res: Response): Promise<void> => {
  try {
    const commodityId = req.query.commodityId as string | undefined;
    const commodityName = req.query.commodity as string | undefined;
    const marketId = req.query.marketId as string | undefined;
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;

    const data = await MarketOwnerService.getPriceHistory({
      commodityId,
      commodityName,
      marketId,
      days,
    });

    res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    console.error('[MarketOwnerController] getPriceHistory error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve price history.',
    });
  }
};

export const compareMarketsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const commodityId = req.query.commodityId as string | undefined;
    const commodityName = req.query.commodity as string | undefined;
    const latStr = (req.query.lat || req.query.latitude) as string | undefined;
    const lonStr = (req.query.lon || req.query.lng || req.query.longitude) as string | undefined;
    const district = req.query.district as string | undefined;
    const state = req.query.state as string | undefined;

    let lat = latStr ? parseFloat(latStr) : undefined;
    let lon = lonStr ? parseFloat(lonStr) : undefined;

    if (lat !== undefined && lon !== undefined) {
      const coordVal = LocationService.validateCoordinates(lat, lon);
      if (coordVal.isValid) {
        lat = coordVal.latitude;
        lon = coordVal.longitude;
      }
    }

    const data = await MarketOwnerService.compareNearbyMarkets({
      commodityId,
      commodityName,
      lat,
      lon,
      district,
      state,
    });

    res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    console.error('[MarketOwnerController] compareMarkets error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to compare nearby markets.',
    });
  }
};

export const getAdminMarketsController = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const markets = await MarketOwnerService.getAllMarkets();
    res.status(200).json({
      success: true,
      count: markets.length,
      markets,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminOwnersController = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const owners = await MarketOwnerService.getAllMarketOwners();
    res.status(200).json({
      success: true,
      count: owners.length,
      owners,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const setAdminOwnerStatusController = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ownerId = req.params.id;
    const { status, isApproved } = req.body;
    const user = await MarketOwnerService.setMarketOwnerStatus(ownerId, status, isApproved);

    res.status(200).json({
      success: true,
      message: `Market Owner status updated to '${status}'.`,
      user,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const assignAdminMarketOwnerController = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { marketId, ownerId } = req.body;
    if (!marketId || !ownerId) {
      res.status(400).json({ success: false, message: 'Both marketId and ownerId are required.' });
      return;
    }

    const market = await MarketOwnerService.assignMarketOwner(marketId, ownerId);
    res.status(200).json({
      success: true,
      message: 'Market owner assigned successfully.',
      market,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAdminAuditsController = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const marketId = req.query.marketId as string | undefined;
    const commodityId = req.query.commodityId as string | undefined;
    const onlySuspicious = req.query.suspicious === 'true';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const audits = await MarketOwnerService.getPriceAudits({
      marketId,
      commodityId,
      onlySuspicious,
      limit,
    });

    res.status(200).json({
      success: true,
      count: audits.length,
      audits,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
