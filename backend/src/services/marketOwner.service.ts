import mongoose from 'mongoose';
import { Market, IMarket } from '../models/Market.model';
import { Commodity, ICommodity } from '../models/Commodity.model';
import { MarketPrice, IMarketPrice } from '../models/MarketPrice.model';
import { PriceAudit, IPriceAudit } from '../models/PriceAudit.model';
import { User, IUser } from '../models/User.model';
import { NotificationService } from './notification.service';
import { MandiPriceService } from './mandiPrice.service';

// Standard Indian agricultural commodity seeds for instant bootstrapping
const DEFAULT_COMMODITY_SEEDS = [
  { name: 'Paddy (Common)', category: 'Cereals', defaultUnit: 'quintal', icon: '🌾' },
  { name: 'Paddy (Basmati)', category: 'Cereals', defaultUnit: 'quintal', icon: '🌾' },
  { name: 'Wheat', category: 'Cereals', defaultUnit: 'quintal', icon: '🌾' },
  { name: 'Maize (Corn)', category: 'Cereals', defaultUnit: 'quintal', icon: '🌽' },
  { name: 'Jowar (Sorghum)', category: 'Cereals', defaultUnit: 'quintal', icon: '🌾' },
  { name: 'Bajra (Pearl Millet)', category: 'Cereals', defaultUnit: 'quintal', icon: '🌾' },
  { name: 'Ragi (Finger Millet)', category: 'Cereals', defaultUnit: 'quintal', icon: '🌾' },
  { name: 'Red Gram (Tur/Arhar)', category: 'Pulses', defaultUnit: 'quintal', icon: '🥣' },
  { name: 'Green Gram (Moong)', category: 'Pulses', defaultUnit: 'quintal', icon: '🥣' },
  { name: 'Black Gram (Urad)', category: 'Pulses', defaultUnit: 'quintal', icon: '🥣' },
  { name: 'Bengal Gram (Chana)', category: 'Pulses', defaultUnit: 'quintal', icon: '🥣' },
  { name: 'Groundnut (Peanut)', category: 'Oilseeds', defaultUnit: 'quintal', icon: '🥜' },
  { name: 'Soybean', category: 'Oilseeds', defaultUnit: 'quintal', icon: '🌱' },
  { name: 'Sunflower', category: 'Oilseeds', defaultUnit: 'quintal', icon: '🌻' },
  { name: 'Mustard', category: 'Oilseeds', defaultUnit: 'quintal', icon: '🌱' },
  { name: 'Cotton (Kapas)', category: 'Commercial / Cash Crops', defaultUnit: 'quintal', icon: '☁️' },
  { name: 'Chilli Red (Dry)', category: 'Spices', defaultUnit: 'quintal', icon: '🌶️' },
  { name: 'Turmeric (Haldi)', category: 'Spices', defaultUnit: 'quintal', icon: '🌿' },
  { name: 'Tomato', category: 'Vegetables', defaultUnit: 'quintal', icon: '🍅' },
  { name: 'Onion', category: 'Vegetables', defaultUnit: 'quintal', icon: '🧅' },
  { name: 'Potato', category: 'Vegetables', defaultUnit: 'quintal', icon: '🥔' },
  { name: 'Brinjal (Eggplant)', category: 'Vegetables', defaultUnit: 'quintal', icon: '🍆' },
  { name: 'Cabbage', category: 'Vegetables', defaultUnit: 'quintal', icon: '🥬' },
  { name: 'Banana', category: 'Fruits', defaultUnit: 'quintal', icon: '🍌' },
  { name: 'Mango', category: 'Fruits', defaultUnit: 'quintal', icon: '🥭' },
];

/**
 * Calculate Great-Circle Distance (Haversine formula in kilometers)
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export class MarketOwnerService {
  /**
   * Ensure standard commodities exist in DB
   */
  public static async ensureDefaultCommodities(): Promise<void> {
    const count = await Commodity.countDocuments();
    if (count === 0) {
      console.log('🌱 [MarketOwnerService] Bootstrapping default commodities...');
      for (const item of DEFAULT_COMMODITY_SEEDS) {
        await Commodity.create({
          ...item,
          allowedUnits: ['quintal', 'kg', 'tonne', 'bag', 'crate'],
          isActive: true,
        });
      }
    }
  }

  /**
   * Get or assign the market owned by this user
   */
  public static async getOwnerMarket(userId: string | mongoose.Types.ObjectId): Promise<IMarket | null> {
    // 1. Check if user has explicit market ref
    const user = await User.findById(userId);
    if (!user) return null;

    if (user.market) {
      const m = await Market.findById(user.market);
      if (m) return m;
    }

    // 2. Check if Market has owner = userId
    let market = await Market.findOne({ owner: userId });
    if (market) {
      if (!user.market || user.market.toString() !== market._id.toString()) {
        user.market = market._id;
        await user.save();
      }
      return market;
    }

    // 3. If none exists yet, auto-create a default Mandi profile from user address
    const shopOrMarketName = user.shopName || `${user.name}'s APMC Mandi`;
    market = await Market.create({
      name: shopOrMarketName,
      address: user.address?.street || 'APMC Yard, Main Road',
      state: user.address?.state || 'Andhra Pradesh',
      district: user.address?.city || 'Kurnool',
      city: user.address?.city || 'Kurnool',
      pincode: user.address?.pincode || '518001',
      latitude: 15.8281,
      longitude: 78.0373,
      owner: user._id,
      contactPerson: user.name,
      contactPhone: user.phone,
      operatingHours: '06:00 AM - 06:00 PM',
      isActive: true,
    });

    user.market = market._id;
    await user.save();
    return market;
  }

  /**
   * Update market location & profile
   */
  public static async updateOwnerMarket(
    userId: string | mongoose.Types.ObjectId,
    data: Partial<IMarket>
  ): Promise<IMarket> {
    const market = await this.getOwnerMarket(userId);
    if (!market) {
      throw new Error('Authorized market not found for this user.');
    }

    if (data.name) market.name = data.name.trim();
    if (data.address !== undefined) market.address = data.address.trim();
    if (data.state) market.state = data.state.trim();
    if (data.district) market.district = data.district.trim();
    if (data.city) market.city = data.city.trim();
    if (data.pincode) market.pincode = data.pincode.trim();
    if (data.latitude !== undefined && !isNaN(Number(data.latitude))) market.latitude = Number(data.latitude);
    if (data.longitude !== undefined && !isNaN(Number(data.longitude))) market.longitude = Number(data.longitude);
    if (data.contactPerson) market.contactPerson = data.contactPerson.trim();
    if (data.contactPhone) market.contactPhone = data.contactPhone.trim();
    if (data.operatingHours) market.operatingHours = data.operatingHours.trim();

    await market.save();
    return market;
  }

  /**
   * Market Owner Dashboard Statistics & Summary
   */
  public static async getOwnerDashboard(userId: string | mongoose.Types.ObjectId): Promise<{
    market: IMarket;
    todayDate: string;
    totalCommodities: number;
    updatedTodayCount: number;
    pendingTodayCount: number;
    recentUpdates: IMarketPrice[];
    todayPrices: IMarketPrice[];
    recentAudits: IPriceAudit[];
  }> {
    await this.ensureDefaultCommodities();
    const market = await this.getOwnerMarket(userId);
    if (!market) {
      throw new Error('No authorized market associated with this account.');
    }

    const todayDate = new Date().toISOString().split('T')[0];

    // Total active commodities in system
    const totalCommodities = await Commodity.countDocuments({ isActive: true });

    // Prices updated today for this market
    const todayPrices = await MarketPrice.find({
      market: market._id,
      priceDate: todayDate,
      status: 'ACTIVE',
    }).populate('commodity');

    const updatedTodayCount = todayPrices.length;
    const pendingTodayCount = Math.max(0, totalCommodities - updatedTodayCount);

    // Recent price updates for this market
    const recentUpdates = await MarketPrice.find({
      market: market._id,
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('commodity');

    // Recent audits for this market
    const recentAudits = await PriceAudit.find({
      market: market._id,
    })
      .sort({ createdAt: -1 })
      .limit(8);

    return {
      market,
      todayDate,
      totalCommodities,
      updatedTodayCount,
      pendingTodayCount,
      recentUpdates,
      todayPrices,
      recentAudits,
    };
  }

  /**
   * Add or Update Daily Market Price
   */
  public static async addOrUpdateDailyPrice(
    user: IUser,
    payload: {
      commodityId: string;
      minPrice: number;
      maxPrice: number;
      modalPrice: number;
      unit?: string;
      priceDate?: string;
      notes?: string;
    }
  ): Promise<{ marketPrice: IMarketPrice; audit: IPriceAudit; message: string }> {
    const market = await this.getOwnerMarket(user._id);
    if (!market) {
      throw new Error('No authorized market associated with this user.');
    }

    const { commodityId, minPrice, maxPrice, modalPrice, unit = 'quintal', notes = '' } = payload;
    const priceDate = payload.priceDate || new Date().toISOString().split('T')[0];

    // Validation
    const minP = Number(minPrice);
    const maxP = Number(maxPrice);
    const modalP = Number(modalPrice);

    if (isNaN(minP) || minP < 0 || isNaN(maxP) || maxP < 0 || isNaN(modalP) || modalP < 0) {
      throw new Error('Prices must be non-negative valid numbers.');
    }

    if (minP > modalP || modalP > maxP) {
      throw new Error('Price range violation: Minimum Price ≤ Modal Price ≤ Maximum Price is required.');
    }

    const commodity = await Commodity.findById(commodityId);
    if (!commodity) {
      throw new Error('Selected commodity does not exist.');
    }

    // Check if there is an existing price record for this commodity & market on this date
    const existingPrice = await MarketPrice.findOne({
      market: market._id,
      commodity: commodity._id,
      priceDate,
    });

    const nowTimeStr = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    let previousPriceInfo: any = undefined;
    let isPriceJump = false;
    let suspicionReason = '';

    // Calculate price change vs baseline (existing price or previous session)
    const lastRecentPrice = await MarketPrice.findOne({
      market: market._id,
      commodity: commodity._id,
      priceDate: { $lt: priceDate },
    }).sort({ priceDate: -1 });

    const baselinePrice = existingPrice || lastRecentPrice;
    let priceChangePercent: number | null = null;
    if (baselinePrice && baselinePrice.modalPrice > 0) {
      const diff = modalP - baselinePrice.modalPrice;
      priceChangePercent = Number(((diff / baselinePrice.modalPrice) * 100).toFixed(2));
      if (Math.abs(priceChangePercent) >= 25) {
        isPriceJump = true;
        suspicionReason = `Price shifted by ${priceChangePercent}% from baseline ₹${baselinePrice.modalPrice} to ₹${modalP}`;
      }
    }

    let savedMarketPrice: IMarketPrice;
    let actionType: 'CREATE' | 'UPDATE' = 'CREATE';

    if (existingPrice) {
      actionType = 'UPDATE';
      previousPriceInfo = {
        minPrice: existingPrice.minPrice,
        maxPrice: existingPrice.maxPrice,
        modalPrice: existingPrice.modalPrice,
        unit: existingPrice.unit,
      };

      existingPrice.minPrice = minP;
      existingPrice.maxPrice = maxP;
      existingPrice.modalPrice = modalP;
      existingPrice.unit = unit;
      existingPrice.updatedTime = nowTimeStr;
      existingPrice.status = 'ACTIVE';
      existingPrice.priceChangePercent = priceChangePercent;
      existingPrice.notes = notes;
      existingPrice.marketOwner = user._id;
      savedMarketPrice = await existingPrice.save();
    } else {
      actionType = 'CREATE';
      // Mark any older entries for this commodity on future dates as superseded if needed
      savedMarketPrice = await MarketPrice.create({
        commodity: commodity._id,
        commodityName: commodity.name,
        category: commodity.category,
        market: market._id,
        marketName: market.name,
        state: market.state,
        district: market.district,
        city: market.city,
        marketOwner: user._id,
        minPrice: minP,
        maxPrice: maxP,
        modalPrice: modalP,
        unit,
        priceDate,
        updatedTime: nowTimeStr,
        status: 'ACTIVE',
        priceChangePercent,
        notes,
      });
    }

    // Record Audit Log
    const audit = await PriceAudit.create({
      market: market._id,
      marketName: market.name,
      commodity: commodity._id,
      commodityName: commodity.name,
      marketPrice: savedMarketPrice._id,
      changedBy: user._id,
      changedByName: user.name,
      changedByRole: user.role,
      action: actionType,
      previousPrice: previousPriceInfo,
      newPrice: {
        minPrice: minP,
        maxPrice: maxP,
        modalPrice: modalP,
        unit,
      },
      priceDate,
      updatedTime: nowTimeStr,
      notes,
      isFlaggedSuspicious: isPriceJump,
      suspicionReason: isPriceJump ? suspicionReason : undefined,
    });

    // Asynchronously broadcast in-app notification to farmers if price revised
    if (previousPriceInfo && previousPriceInfo.modalPrice !== modalP) {
      NotificationService.broadcastPriceChange(
        commodity.name,
        previousPriceInfo.modalPrice,
        modalP,
        unit,
        market.name
      ).catch((e) => console.warn('[MarketOwnerService] Notification broadcast error:', e));
    }

    // Immediately invalidate live mandi cache so farmers instantly observe new rates
    MandiPriceService.clearCache();

    return {
      marketPrice: savedMarketPrice,
      audit,
      message: `Price for ${commodity.name} saved successfully. Updated today at ${nowTimeStr}.`,
    };
  }

  /**
   * Get Price History (Today, Yesterday, 7-Day, 30-Day, Trend Chart Data)
   */
  /**
   * Get Price History (Today, Yesterday, 7-Day, 30-Day, Trend Chart Data)
   */
  public static async getPriceHistory(options: {
    commodityId?: string;
    commodityName?: string;
    marketId?: string;
    days?: number;
  }): Promise<{
    commodity: string;
    market: string;
    todayPrice: IMarketPrice | null;
    yesterdayPrice: IMarketPrice | null;
    sevenDayHistory: IMarketPrice[];
    thirtyDayHistory: IMarketPrice[];
    previousPrice: number | null;
    currentPrice: number | null;
    absoluteChange: number | null;
    trend: 'Rising' | 'Falling' | 'Stable';
    percentageChange: number | null;
    highestPrice: number;
    lowestPrice: number;
    averagePrice: number;
    insufficientData: boolean;
    dataPointsCount: number;
    historyPoints: { date: string; minPrice: number; maxPrice: number; modalPrice: number; updatedTime: string }[];
  }> {
    const { commodityId, commodityName, marketId, days = 30 } = options;

    const query: any = { status: 'ACTIVE' };
    if (commodityId) query.commodity = commodityId;
    if (commodityName) query.commodityName = new RegExp(`^${commodityName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');
    if (marketId) query.market = marketId;

    const records = await MarketPrice.find(query)
      .sort({ priceDate: -1, createdAt: -1 })
      .limit(days)
      .populate('commodity')
      .populate('market');

    const todayDateStr = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayDateStr = yesterdayDate.toISOString().split('T')[0];

    const todayPrice = records.find((r) => r.priceDate === todayDateStr) || (records.length > 0 ? records[0] : null);
    const yesterdayPrice = records.find((r) => r.priceDate === yesterdayDateStr) || (records.length > 1 ? records[1] : null);

    const sevenDayHistory = records.slice(0, 7);
    const thirtyDayHistory = records;

    const modalPrices = records.map((r) => r.modalPrice).filter((p) => p > 0);
    const highestPrice = modalPrices.length > 0 ? Math.max(...modalPrices) : 0;
    const lowestPrice = modalPrices.length > 0 ? Math.min(...modalPrices) : 0;
    const averagePrice = modalPrices.length > 0 ? Math.round(modalPrices.reduce((a, b) => a + b, 0) / modalPrices.length) : 0;

    let trend: 'Rising' | 'Falling' | 'Stable' = 'Stable';
    let percentageChange: number | null = null;
    let absoluteChange: number | null = null;
    let previousPrice: number | null = null;
    let currentPrice: number | null = null;

    if (records.length >= 1) {
      currentPrice = records[0].modalPrice;
    }

    if (records.length >= 2) {
      const latest = records[0].modalPrice;
      const prev = records[1].modalPrice;
      previousPrice = prev;
      absoluteChange = latest - prev;
      if (prev > 0) {
        percentageChange = Number((((latest - prev) / prev) * 100).toFixed(2));
        if (percentageChange >= 0.5) trend = 'Rising';
        else if (percentageChange <= -0.5) trend = 'Falling';
        else trend = 'Stable';
      }
    }

    const insufficientData = records.length < 2;
    const dataPointsCount = records.length;

    // Chronological points for SVG/Interactive Chart
    const historyPoints = records
      .map((r) => ({
        date: r.priceDate,
        minPrice: r.minPrice,
        maxPrice: r.maxPrice,
        modalPrice: r.modalPrice,
        updatedTime: r.updatedTime,
      }))
      .reverse();

    const targetCommodityName = records[0]?.commodityName || commodityName || 'Commodity';
    const targetMarketName = records[0]?.marketName || 'APMC Mandi';

    return {
      commodity: targetCommodityName,
      market: targetMarketName,
      todayPrice,
      yesterdayPrice,
      sevenDayHistory,
      thirtyDayHistory,
      previousPrice,
      currentPrice,
      absoluteChange,
      trend,
      percentageChange,
      highestPrice,
      lowestPrice,
      averagePrice,
      insufficientData,
      dataPointsCount,
      historyPoints,
    };
  }

  /**
   * Compare Nearby Markets for a Commodity with Distance (Haversine km)
   */
  public static async compareNearbyMarkets(options: {
    commodityId?: string;
    commodityName?: string;
    lat?: number;
    lon?: number;
    maxDistanceKm?: number;
    district?: string;
    state?: string;
  }): Promise<{
    commodity: string;
    userLocation: { lat?: number; lon?: number };
    totalMarkets: number;
    highestPriceMarket: { marketId: string; marketName: string; modalPrice: number; district: string; state: string } | null;
    lowestPriceMarket: { marketId: string; marketName: string; modalPrice: number; district: string; state: string } | null;
    averageModalPrice: number;
    priceSpread: number;
    comparisons: {
      marketId: string;
      marketName: string;
      district: string;
      state: string;
      distanceKm: number | null;
      minPrice: number;
      maxPrice: number;
      modalPrice: number;
      previousModalPrice: number | null;
      absoluteChange: number | null;
      percentageChange: number | null;
      trend: 'Rising' | 'Falling' | 'Stable';
      isHighest: boolean;
      isLowest: boolean;
      unit: string;
      priceDate: string;
      updatedTime: string;
      lastUpdatedText: string;
      isToday: boolean;
      contactPhone?: string;
    }[];
  }> {
    await this.ensureDefaultCommodities();
    const { commodityId, commodityName, lat, lon } = options;

    let commodityDoc: ICommodity | null = null;
    if (commodityId) {
      commodityDoc = await Commodity.findById(commodityId);
    } else if (commodityName) {
      commodityDoc = await Commodity.findOne({
        name: new RegExp(`^${commodityName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i'),
      });
    }

    const commodityQuery: any = {};
    if (commodityDoc) {
      commodityQuery.commodity = commodityDoc._id;
    } else if (commodityName) {
      commodityQuery.commodityName = new RegExp(commodityName, 'i');
    }

    // Find all active prices for this commodity across all markets
    const allMarketPrices = await MarketPrice.find({
      ...commodityQuery,
      status: 'ACTIVE',
    })
      .sort({ priceDate: -1, createdAt: -1 })
      .populate('market');

    // Group all price records by market to obtain latest price and previous price
    const marketRecordsMap = new Map<string, IMarketPrice[]>();
    for (const p of allMarketPrices) {
      const mId = p.market?.toString() || p.marketName;
      if (!marketRecordsMap.has(mId)) {
        marketRecordsMap.set(mId, []);
      }
      marketRecordsMap.get(mId)!.push(p);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const comparisonList: any[] = [];

    let highestRate = -Infinity;
    let lowestRate = Infinity;

    for (const [, recordsList] of marketRecordsMap) {
      if (recordsList.length === 0) continue;
      const latestPrice = recordsList[0];
      const priorPrice = recordsList.length > 1 ? recordsList[1] : null;

      const market = latestPrice.market as unknown as IMarket;
      let distanceKm: number | null = null;

      if (lat !== undefined && lon !== undefined && market?.latitude && market?.longitude) {
        distanceKm = calculateHaversineDistanceKm(lat, lon, market.latitude, market.longitude);
      }

      const isToday = latestPrice.priceDate === todayStr;
      const lastUpdatedText = isToday
        ? `Updated today at ${latestPrice.updatedTime}`
        : `Updated on ${latestPrice.priceDate} at ${latestPrice.updatedTime}`;

      let previousModalPrice: number | null = null;
      let absoluteChange: number | null = null;
      let percentageChange: number | null = null;
      let trend: 'Rising' | 'Falling' | 'Stable' = 'Stable';

      if (priorPrice && priorPrice.modalPrice > 0) {
        previousModalPrice = priorPrice.modalPrice;
        absoluteChange = latestPrice.modalPrice - priorPrice.modalPrice;
        percentageChange = Number((((latestPrice.modalPrice - priorPrice.modalPrice) / priorPrice.modalPrice) * 100).toFixed(2));
        if (percentageChange >= 0.5) trend = 'Rising';
        else if (percentageChange <= -0.5) trend = 'Falling';
        else trend = 'Stable';
      }

      if (latestPrice.modalPrice > highestRate) highestRate = latestPrice.modalPrice;
      if (latestPrice.modalPrice < lowestRate) lowestRate = latestPrice.modalPrice;

      comparisonList.push({
        marketId: market?._id?.toString() || latestPrice.market?.toString(),
        marketName: latestPrice.marketName || market?.name || 'APMC Mandi',
        district: latestPrice.district || market?.district || '',
        state: latestPrice.state || market?.state || '',
        distanceKm,
        minPrice: latestPrice.minPrice,
        maxPrice: latestPrice.maxPrice,
        modalPrice: latestPrice.modalPrice,
        previousModalPrice,
        absoluteChange,
        percentageChange,
        trend,
        isHighest: false,
        isLowest: false,
        unit: latestPrice.unit || 'quintal',
        priceDate: latestPrice.priceDate,
        updatedTime: latestPrice.updatedTime,
        lastUpdatedText,
        isToday,
        contactPhone: market?.contactPhone,
      });
    }

    // Flag highest and lowest rates
    if (comparisonList.length > 0) {
      for (const item of comparisonList) {
        item.isHighest = item.modalPrice === highestRate;
        item.isLowest = item.modalPrice === lowestRate;
      }
    }

    // Sort by distance if available, else by modalPrice descending
    comparisonList.sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }
      return b.modalPrice - a.modalPrice;
    });

    const highestPriceMarket = comparisonList.find((c) => c.isHighest)
      ? {
          marketId: comparisonList.find((c) => c.isHighest)!.marketId,
          marketName: comparisonList.find((c) => c.isHighest)!.marketName,
          modalPrice: comparisonList.find((c) => c.isHighest)!.modalPrice,
          district: comparisonList.find((c) => c.isHighest)!.district,
          state: comparisonList.find((c) => c.isHighest)!.state,
        }
      : null;

    const lowestPriceMarket = comparisonList.find((c) => c.isLowest)
      ? {
          marketId: comparisonList.find((c) => c.isLowest)!.marketId,
          marketName: comparisonList.find((c) => c.isLowest)!.marketName,
          modalPrice: comparisonList.find((c) => c.isLowest)!.modalPrice,
          district: comparisonList.find((c) => c.isLowest)!.district,
          state: comparisonList.find((c) => c.isLowest)!.state,
        }
      : null;

    const modalValues = comparisonList.map((c) => c.modalPrice);
    const averageModalPrice = modalValues.length > 0 ? Math.round(modalValues.reduce((a, b) => a + b, 0) / modalValues.length) : 0;
    const priceSpread = comparisonList.length > 0 && highestRate !== -Infinity && lowestRate !== Infinity ? highestRate - lowestRate : 0;

    return {
      commodity: commodityDoc?.name || commodityName || 'All Commodities',
      userLocation: { lat, lon },
      totalMarkets: comparisonList.length,
      highestPriceMarket,
      lowestPriceMarket,
      averageModalPrice,
      priceSpread,
      comparisons: comparisonList,
    };
  }

  /**
   * Commodity Management (CRUD)
   */
  public static async getCommodities(filter?: {
    category?: string;
    search?: string;
    includeInactive?: boolean;
  }): Promise<ICommodity[]> {
    await this.ensureDefaultCommodities();
    const query: any = {};
    if (!filter?.includeInactive) {
      query.isActive = true;
    }
    if (filter?.category && filter.category !== 'ALL') {
      query.category = filter.category;
    }
    if (filter?.search && filter.search.trim()) {
      query.name = new RegExp(filter.search.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
    }
    return Commodity.find(query).sort({ name: 1 });
  }

  public static async createCommodity(
    user: IUser,
    payload: {
      name: string;
      category: string;
      variety?: string;
      defaultUnit?: string;
      allowedUnits?: string[];
      icon?: string;
    }
  ): Promise<ICommodity> {
    const cleanName = payload.name.trim();
    const existing = await Commodity.findOne({ name: new RegExp(`^${cleanName}$`, 'i') });
    if (existing) {
      throw new Error(`Commodity with name '${cleanName}' already exists.`);
    }

    const commodity = await Commodity.create({
      name: cleanName,
      category: payload.category || 'Vegetables',
      variety: payload.variety?.trim() || 'Standard / FAQ',
      defaultUnit: payload.defaultUnit || 'quintal',
      allowedUnits: payload.allowedUnits || ['quintal', 'kg', 'tonne'],
      icon: payload.icon || '🌾',
      isActive: true,
      createdBy: user._id,
    });

    return commodity;
  }

  public static async updateCommodity(
    commodityId: string,
    payload: Partial<ICommodity>
  ): Promise<ICommodity> {
    const commodity = await Commodity.findById(commodityId);
    if (!commodity) {
      throw new Error('Commodity not found.');
    }

    if (payload.name) commodity.name = payload.name.trim();
    if (payload.category) commodity.category = payload.category as any;
    if (payload.variety !== undefined) commodity.variety = payload.variety.trim();
    if (payload.defaultUnit) commodity.defaultUnit = payload.defaultUnit as any;
    if (payload.allowedUnits) commodity.allowedUnits = payload.allowedUnits;
    if (payload.icon) commodity.icon = payload.icon.trim();
    if (payload.isActive !== undefined) commodity.isActive = payload.isActive;

    await commodity.save();
    return commodity;
  }

  /**
   * Admin Operations: Markets, Owners, Audits
   */
  public static async getAllMarkets(): Promise<IMarket[]> {
    return Market.find().populate('owner', 'name email phone role isApproved status').sort({ name: 1 });
  }

  public static async getAllMarketOwners(): Promise<IUser[]> {
    return User.find({ role: 'MARKET_OWNER' })
      .populate('market')
      .sort({ createdAt: -1 });
  }

  public static async setMarketOwnerStatus(
    ownerId: string,
    status: 'ACTIVE' | 'PENDING' | 'DISABLED',
    isApproved?: boolean
  ): Promise<IUser> {
    const owner = await User.findById(ownerId);
    if (!owner) {
      throw new Error('Market Owner user not found.');
    }

    owner.status = status;
    if (isApproved !== undefined) {
      owner.isApproved = isApproved;
    }
    await owner.save();
    return owner;
  }

  public static async assignMarketOwner(marketId: string, ownerId: string): Promise<IMarket> {
    const market = await Market.findById(marketId);
    if (!market) {
      throw new Error('Market not found.');
    }

    const owner = await User.findById(ownerId);
    if (!owner) {
      throw new Error('User not found.');
    }

    market.owner = owner._id;
    await market.save();

    owner.market = market._id;
    await owner.save();

    return market;
  }

  public static async getPriceAudits(filter?: {
    marketId?: string;
    commodityId?: string;
    onlySuspicious?: boolean;
    limit?: number;
  }): Promise<IPriceAudit[]> {
    const query: any = {};
    if (filter?.marketId) query.market = filter.marketId;
    if (filter?.commodityId) query.commodity = filter.commodityId;
    if (filter?.onlySuspicious) query.isFlaggedSuspicious = true;

    return PriceAudit.find(query)
      .sort({ createdAt: -1 })
      .limit(filter?.limit || 50)
      .populate('changedBy', 'name email role phone');
  }
}

export default MarketOwnerService;
