import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Compass,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BarChart3,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Sparkles,
  Info,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getCommoditiesApi,
  getMarketPricesTodayApi,
  getMarketPriceHistoryApi,
  compareNearbyMarketsApi,
} from '../../services/api';
import { lookupPincode } from '../../utils/pincode';
import { getAccurateDeviceLocation } from '../../utils/geolocation';
import {
  Commodity,
  MarketPriceRecord,
  MarketPriceHistoryData,
  MarketComparisonItem,
  MarketComparisonResponse,
} from '../../types/marketOwner';
import { AgroMitraLogo } from '../../components/common/AgroMitraLogo';

export const FarmerMarketPricesPage: React.FC = () => {
  const { user } = useAuth();
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [selectedCommodity, setSelectedCommodity] = useState<string>('');
  const [selectedCommodityDoc, setSelectedCommodityDoc] = useState<Commodity | null>(null);

  // Selected commodity price
  const [selectedMarketPrice, setSelectedMarketPrice] = useState<MarketPriceRecord | null>(null);

  // Price history
  const [historyData, setHistoryData] = useState<MarketPriceHistoryData | null>(null);
  const [historyDays, setHistoryDays] = useState<number>(30);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Market comparison with GPS Distance
  const [comparisonResponse, setComparisonResponse] = useState<MarketComparisonResponse | null>(null);
  const [comparisonItems, setComparisonItems] = useState<MarketComparisonItem[]>([]);
  const [isLoadingComparison, setIsLoadingComparison] = useState<boolean>(false);

  // Location / PIN modal state
  const [farmerCoords, setFarmerCoords] = useState<{ lat?: number; lon?: number }>({});
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [gpsLocationLabel, setGpsLocationLabel] = useState<string>('Detecting location...');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [pincodeInput, setPincodeInput] = useState<string>('');
  const [isPincodeLoading, setIsPincodeLoading] = useState<boolean>(false);
  const [pincodeSuccessMsg, setPincodeSuccessMsg] = useState<string | null>(null);

  const [isLoadingCommodities, setIsLoadingCommodities] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Initial Load: GPS Location & Commodities
  useEffect(() => {
    setIsDetectingGps(true);
    getAccurateDeviceLocation()
      .then((pos) => {
        setIsDetectingGps(false);
        const coords = { lat: pos.latitude, lon: pos.longitude };
        setFarmerCoords(coords);
        setGpsLocationLabel(`GPS (${coords.lat.toFixed(2)}°, ${coords.lon.toFixed(2)}°)`);
      })
      .catch(() => {
        setIsDetectingGps(false);
        setGpsLocationLabel('Set Location / PIN');
      });

    const init = async () => {
      setIsLoadingCommodities(true);
      try {
        const commRes = await getCommoditiesApi({ includeInactive: false });
        if (commRes.success && commRes.commodities.length > 0) {
          setCommodities(commRes.commodities);
          setSelectedCommodity(commRes.commodities[0].name);
          setSelectedCommodityDoc(commRes.commodities[0]);
        }
      } catch {
        setErrorMsg('Unable to load market commodities.');
      } finally {
        setIsLoadingCommodities(false);
      }
    };

    init();
  }, []);

  // 2. Fetch prices & comparisons when commodity or coords change
  const fetchMarketDataForCommodity = useCallback(
    async (commName: string, coords?: { lat?: number; lon?: number }) => {
      if (!commName) return;
      setErrorMsg(null);

      try {
        // Today prices
        const todayRes = await getMarketPricesTodayApi({ commodity: commName });
        if (todayRes.success) {
          if (todayRes.records.length > 0) {
            setSelectedMarketPrice(todayRes.records[0]);
          } else {
            setSelectedMarketPrice(null);
          }
        }

        // History
        setIsLoadingHistory(true);
        const histRes = await getMarketPriceHistoryApi({
          commodity: commName,
          days: historyDays,
        });
        if (histRes) {
          setHistoryData(histRes);
        }
        setIsLoadingHistory(false);

        // Comparisons
        setIsLoadingComparison(true);
        const compRes = await compareNearbyMarketsApi({
          commodity: commName,
          lat: coords?.lat,
          lon: coords?.lon,
        });
        if (compRes.success) {
          setComparisonResponse(compRes);
          setComparisonItems(compRes.comparisons || []);
        }
        setIsLoadingComparison(false);
      } catch {
        setErrorMsg('Failed to fetch commodity market rates.');
        setIsLoadingHistory(false);
        setIsLoadingComparison(false);
      }
    },
    [historyDays]
  );

  useEffect(() => {
    if (selectedCommodity) {
      fetchMarketDataForCommodity(selectedCommodity, farmerCoords);
    }
  }, [selectedCommodity, farmerCoords, fetchMarketDataForCommodity]);

  const handleSelectCommodity = (comm: Commodity) => {
    setSelectedCommodity(comm.name);
    setSelectedCommodityDoc(comm);
  };

  const handleRequestGps = async () => {
    setIsDetectingGps(true);
    setErrorMsg(null);
    try {
      const pos = await getAccurateDeviceLocation();
      setIsDetectingGps(false);
      const coords = { lat: pos.latitude, lon: pos.longitude };
      setFarmerCoords(coords);
      setGpsLocationLabel(`GPS (${coords.lat.toFixed(2)}°, ${coords.lon.toFixed(2)}°)`);
      setIsLocationModalOpen(false);
    } catch (err: any) {
      setIsDetectingGps(false);
      setErrorMsg(`GPS detection: ${err.message}`);
    }
  };

  const handlePincodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = pincodeInput.trim();
    if (pin.length !== 6 || isNaN(Number(pin))) {
      setErrorMsg('Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    setIsPincodeLoading(true);
    setErrorMsg(null);
    const pinRes = await lookupPincode(pin);
    setIsPincodeLoading(false);

    if (pinRes.success) {
      setGpsLocationLabel(`PIN ${pin} (${pinRes.city || pinRes.district})`);
      setPincodeSuccessMsg(`Resolved to ${pinRes.district}, ${pinRes.state}`);
      fetchMarketDataForCommodity(selectedCommodity, farmerCoords);
      setTimeout(() => {
        setIsLocationModalOpen(false);
        setPincodeSuccessMsg(null);
      }, 1000);
    } else {
      setErrorMsg(pinRes.message || 'Pincode not found. Please verify.');
    }
  };

  // Render SVG Price Trend Chart
  const renderTrendChart = () => {
    if (!historyData || !historyData.historyPoints || historyData.historyPoints.length === 0) {
      return (
        <div className="py-12 text-center text-slate-400 text-xs">
          No historical auction sessions available for this commodity.
        </div>
      );
    }

    if (historyData.historyPoints.length === 1) {
      const single = historyData.historyPoints[0];
      return (
        <div className="py-8 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800">
            <Info className="w-3.5 h-3.5" />
            <span>Single Session Recorded</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Auction quote of <strong className="text-slate-900 dark:text-white">₹{single.modalPrice}</strong> recorded on {single.date}. Multi-session trend graphs and rate shift analytics will automatically appear after subsequent daily updates.
          </p>
        </div>
      );
    }

    const points = historyData.historyPoints;
    const values = points.map((p) => p.modalPrice);
    const minVal = Math.min(...values) * 0.95;
    const maxVal = Math.max(...values) * 1.05;
    const range = maxVal - minVal || 1;

    const width = 600;
    const height = 180;
    const paddingX = 40;
    const paddingY = 25;

    const getX = (index: number) =>
      paddingX + (index / Math.max(1, points.length - 1)) * (width - 2 * paddingX);
    const getY = (val: number) =>
      height - paddingY - ((val - minVal) / range) * (height - 2 * paddingY);

    const pathD = points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.modalPrice)}`)
      .join(' ');

    const areaD = `${pathD} L ${getX(points.length - 1)} ${height - paddingY} L ${getX(0)} ${height - paddingY} Z`;

    return (
      <div className="space-y-3">
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 select-none">
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line
              x1={paddingX}
              y1={paddingY}
              x2={width - paddingX}
              y2={paddingY}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
            <line
              x1={paddingX}
              y1={height / 2}
              x2={width - paddingX}
              y2={height / 2}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
            <line
              x1={paddingX}
              y1={height - paddingY}
              x2={width - paddingX}
              y2={height - paddingY}
              stroke="#cbd5e1"
            />

            {/* Area Fill */}
            <path d={areaD} fill="url(#priceGradient)" />

            {/* Price Line */}
            <path
              d={pathD}
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Points */}
            {points.map((p, idx) => (
              <g key={idx} className="group">
                <circle
                  cx={getX(idx)}
                  cy={getY(p.modalPrice)}
                  r="4.5"
                  fill="#059669"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-transform hover:scale-150 cursor-pointer"
                />
                <text
                  x={getX(idx)}
                  y={getY(p.modalPrice) - 10}
                  textAnchor="middle"
                  className="text-[10px] font-bold fill-slate-700 dark:fill-slate-200"
                >
                  ₹{p.modalPrice}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Date Labels */}
        <div className="flex justify-between text-[10px] text-slate-400 font-mono px-4">
          <span>{points[0]?.date}</span>
          <span>Price Trend ({points.length} Sessions)</span>
          <span>{points[points.length - 1]?.date}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-4">
          <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <AgroMitraLogo variant="mark" size="lg" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Daily Mandi Realizations & Price Intelligence
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
              Agricultural Market Comparison
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Compare wholesale commodity rates across authorized APMC mandis, view 7/30-day historical price trends, and identify optimal selling venues.
            </p>
          </div>
        </div>

        {/* Location & Mandi Portal Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-all shadow-xs"
          >
            <Compass className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
            <span>{gpsLocationLabel}</span>
          </button>

          <Link
            to={user?.role === 'MARKET_OWNER' ? '/market-owner/dashboard' : '/market-owner'}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{user?.role === 'MARKET_OWNER' ? 'Mandi Dashboard' : 'Mandi Owner Portal'}</span>
          </Link>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-xs sm:text-sm text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="font-bold text-rose-700">✕</button>
        </div>
      )}

      {/* 2. Commodity Selector Pills */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Select Commodity
          </span>
          <span className="text-xs text-slate-400">
            {commodities.length} active commodities
          </span>
        </div>

        {isLoadingCommodities ? (
          <div className="py-4 flex items-center justify-center text-slate-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600 mr-2" />
            <span>Loading commodities...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {commodities.map((c) => {
              const isSelected = selectedCommodity === c.name;
              return (
                <button
                  key={c.id || c._id}
                  onClick={() => handleSelectCommodity(c)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{c.icon || '🌾'}</span>
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Market Intelligence Summary Cards (Highest vs Lowest vs Spread) */}
      {comparisonResponse && comparisonResponse.totalMarkets > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Best Selling Price */}
          <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Highest Rate Mandi
              </span>
              <Trophy className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-2xl font-heading font-black text-emerald-900 dark:text-emerald-100">
                ₹{comparisonResponse.highestPriceMarket?.modalPrice?.toLocaleString('en-IN') || 0}
              </h3>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 truncate mt-0.5">
                {comparisonResponse.highestPriceMarket?.marketName || 'APMC Yard'} ({comparisonResponse.highestPriceMarket?.district})
              </p>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold">⭐ Recommended selling mandi</span>
          </div>

          {/* Lowest Price Mandi */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Lowest Rate Mandi
              </span>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <h3 className="text-2xl font-heading font-black text-slate-900 dark:text-white">
                ₹{comparisonResponse.lowestPriceMarket?.modalPrice?.toLocaleString('en-IN') || 0}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {comparisonResponse.lowestPriceMarket?.marketName || 'APMC Yard'} ({comparisonResponse.lowestPriceMarket?.district})
              </p>
            </div>
            <span className="text-[10px] text-slate-400">Regional baseline rate</span>
          </div>

          {/* Inter-Mandi Price Spread */}
          <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                Market Price Spread
              </span>
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-2xl font-heading font-black text-amber-900 dark:text-amber-100">
                ₹{comparisonResponse.priceSpread?.toLocaleString('en-IN') || 0}
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Max gain across markets
              </p>
            </div>
            <span className="text-[10px] text-amber-600 font-bold">Arbitrage advantage for farmers</span>
          </div>

          {/* Average Market Modal */}
          <div className="p-5 rounded-3xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                Average Market Modal
              </span>
              <BarChart3 className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="text-2xl font-heading font-black text-purple-900 dark:text-purple-100">
                ₹{comparisonResponse.averageModalPrice?.toLocaleString('en-IN') || 0}
              </h3>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                Across {comparisonResponse.totalMarkets} active mandis
              </p>
            </div>
            <span className="text-[10px] text-purple-600 font-bold">Weighted regional benchmark</span>
          </div>
        </div>
      )}

      {/* 4. Primary Rate Card & Trend Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: Selected Commodity Live Price Highlight & Price Shift */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl">{selectedCommodityDoc?.icon || '🌾'}</span>
                <div>
                  <h2 className="font-heading font-extrabold text-xl text-slate-900 dark:text-white">
                    {selectedCommodity}
                  </h2>
                  <span className="text-xs text-slate-400">{selectedCommodityDoc?.category}</span>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 text-[10px] font-bold">
                Live Mandi
              </span>
            </div>

            {/* Price Box */}
            {selectedMarketPrice ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Today&apos;s Modal Price
                  </span>
                  {historyData?.percentageChange !== null && historyData?.percentageChange !== undefined && (
                    <span
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        historyData.trend === 'Rising'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : historyData.trend === 'Falling'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {historyData.trend === 'Rising' && <TrendingUp className="w-3 h-3" />}
                      {historyData.trend === 'Falling' && <TrendingDown className="w-3 h-3" />}
                      {historyData.trend === 'Stable' && <Minus className="w-3 h-3" />}
                      <span>
                        {historyData.percentageChange > 0 ? '+' : ''}
                        {historyData.percentageChange}%
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-heading font-black text-slate-900 dark:text-white">
                    ₹{selectedMarketPrice.modalPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-bold text-slate-500">per {selectedMarketPrice.unit}</span>
                </div>

                {/* Previous Price & Absolute Change */}
                {historyData?.previousPrice && (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>Previous Session: <strong>₹{historyData.previousPrice}</strong></span>
                    <span>
                      Shift:{' '}
                      <strong
                        className={
                          (historyData.absoluteChange || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }
                      >
                        {(historyData.absoluteChange || 0) >= 0 ? '+' : ''}
                        ₹{historyData.absoluteChange}
                      </strong>
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 pt-1">
                  <span>Min: <strong>₹{selectedMarketPrice.minPrice}</strong></span>
                  <span>Max: <strong>₹{selectedMarketPrice.maxPrice}</strong></span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Updated today at {selectedMarketPrice.updatedTime}</span>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center space-y-1">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No quotes published today yet
                </span>
                <p className="text-xs text-slate-400">Check previous session history or nearby markets below.</p>
              </div>
            )}

            {/* Market Info */}
            <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Primary Mandi:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {selectedMarketPrice?.marketName || 'APMC Yard'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>District / State:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {selectedMarketPrice?.district || 'Regional'}, {selectedMarketPrice?.state || 'India'}
                </strong>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified APMC Record</span>
            </span>
          </div>
        </div>

        {/* Col 2 & 3: Price Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-heading font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                Price History & Trend Analysis
              </h3>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setHistoryDays(7)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  historyDays === 7
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                7-Day
              </button>
              <button
                onClick={() => setHistoryDays(30)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  historyDays === 30
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                30-Day
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          {historyData && (
            <div className="grid grid-cols-4 gap-3 text-center text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Current</span>
                <span className="text-base font-heading font-black text-slate-900 dark:text-white">
                  ₹{(historyData.currentPrice || historyData.todayPrice?.modalPrice || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Highest</span>
                <span className="text-base font-heading font-black text-slate-900 dark:text-white">
                  ₹{historyData.highestPrice.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Average</span>
                <span className="text-base font-heading font-black text-slate-900 dark:text-white">
                  ₹{historyData.averagePrice.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Trend</span>
                <span
                  className={`text-base font-heading font-black ${
                    historyData.trend === 'Rising'
                      ? 'text-emerald-600'
                      : historyData.trend === 'Falling'
                      ? 'text-rose-600'
                      : 'text-amber-600'
                  }`}
                >
                  {historyData.trend}
                </span>
              </div>
            </div>
          )}

          {/* SVG Line Chart */}
          {isLoadingHistory ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <span className="text-xs">Loading price history...</span>
            </div>
          ) : (
            renderTrendChart()
          )}
        </div>
      </div>

      {/* 5. Nearby Market Comparison Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <span>Nearby Market Comparison for {selectedCommodity}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Compare rates across authorized APMC mandis sorted by proximity to your coordinates.
            </p>
          </div>

          <span className="text-xs text-slate-400 font-semibold">
            {comparisonItems.length} Authorized Mandis
          </span>
        </div>

        {isLoadingComparison ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <span className="text-xs">Comparing nearby mandis...</span>
          </div>
        ) : comparisonItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No authorized markets have published prices for {selectedCommodity} yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparisonItems.map((item) => (
              <div
                key={item.marketId}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 shadow-xs ${
                  item.isHighest
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-400'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-heading font-extrabold text-sm text-slate-900 dark:text-white">
                          {item.marketName}
                        </h4>
                        {item.isHighest && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                            <Trophy className="w-2.5 h-2.5" /> Best Rate
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {item.district}, {item.state}
                      </span>
                    </div>

                    {item.distanceKm !== null ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                        {item.distanceKm} km away
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold shrink-0">
                        Regional
                      </span>
                    )}
                  </div>

                  {/* Modal Price Highlight */}
                  <div className="mt-3.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Current Modal Rate
                      </span>
                      {item.percentageChange !== null && item.percentageChange !== undefined && (
                        <span
                          className={`text-[10px] font-bold flex items-center gap-0.5 ${
                            item.trend === 'Rising'
                              ? 'text-emerald-600'
                              : item.trend === 'Falling'
                              ? 'text-rose-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.trend === 'Rising' && <ArrowUpRight className="w-3 h-3" />}
                          {item.trend === 'Falling' && <ArrowDownRight className="w-3 h-3" />}
                          {item.percentageChange > 0 ? '+' : ''}
                          {item.percentageChange}%
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-heading font-black text-slate-900 dark:text-white">
                        ₹{item.modalPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">per {item.unit}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>Min: <strong>₹{item.minPrice}</strong></span>
                      <span>Max: <strong>₹{item.maxPrice}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-center justify-between">
                  <span>{item.lastUpdatedText}</span>
                  {item.contactPhone && (
                    <span className="text-[10px] text-slate-400 font-mono">📞 {item.contactPhone}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Location Filter Modal (GPS or Indian PIN Code) */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white">
                  Set Your Farm Location
                </h3>
              </div>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set your location to accurately calculate road distances to nearby APMC mandis and compare rates.
            </p>

            {/* Option A: GPS Auto-Detect */}
            <button
              onClick={handleRequestGps}
              disabled={isDetectingGps}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Compass className={`w-4 h-4 ${isDetectingGps ? 'animate-spin' : ''}`} />
              <span>{isDetectingGps ? 'Detecting Precise Coordinates...' : 'Use My Current GPS Location'}</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span>OR ENTER PIN CODE</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Option B: Indian PIN Code */}
            <form onSubmit={handlePincodeSearch} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit Indian PIN (e.g. 518001)"
                  value={pincodeInput}
                  onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                {isPincodeLoading && (
                  <Loader2 className="w-4 h-4 animate-spin absolute right-3.5 top-3 text-emerald-600" />
                )}
              </div>

              {pincodeSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{pincodeSuccessMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={pincodeInput.length !== 6 || isPincodeLoading}
                className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors disabled:opacity-50"
              >
                Lookup PIN Code
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerMarketPricesPage;
