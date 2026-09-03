import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  RefreshCw,
  Search,
  MapPin,
  Calendar,
  Building2,
  Sparkles,
  AlertCircle,
  Loader2,
  Database,
  ShieldCheck,
} from 'lucide-react';
import { getMandiPricesApi } from '../../services/api';
import {
  MandiPriceResponse,
  MandiPriceQueryParams,
} from '../../types/mandiPrice';
import { WeatherData } from '../../types/weather';
import { Link } from 'react-router-dom';

interface LiveMandiPricesCardProps {
  weather?: WeatherData | null;
  className?: string;
  limit?: number;
}

export const LiveMandiPricesCard: React.FC<LiveMandiPricesCardProps> = ({
  weather,
  className = '',
  limit = 20,
}) => {

  const [data, setData] = useState<MandiPriceResponse | null>(null);
  const [selectedState, setSelectedState] = useState<string>('');
  const [searchCommodity, setSearchCommodity] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state with farmer's detected location if not manually chosen
  useEffect(() => {
    if (weather?.location?.state && !selectedState) {
      setSelectedState(weather.location.state);
    }
  }, [weather?.location?.state, selectedState]);

  const fetchPrices = useCallback(
    async (refresh = false, stateFilter?: string) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMsg(null);

      try {
        const queryState = stateFilter !== undefined ? stateFilter : (selectedState || weather?.location?.state);
        const params: MandiPriceQueryParams = {
          state: queryState || undefined,
          limit,
          refresh,
        };

        const res = await getMandiPricesApi(params);
        if (res.success) {
          setData(res);
        } else {
          setErrorMsg(res.message || 'Market prices are temporarily unavailable.');
        }
      } catch (err: any) {
        setErrorMsg('Market prices are temporarily unavailable.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedState, weather?.location?.state, limit]
  );

  useEffect(() => {
    fetchPrices(false, selectedState);
  }, [selectedState, fetchPrices]);

  // Filter records by search text
  const filteredRecords = data?.records.filter((r) => {
    if (!searchCommodity) return true;
    const q = searchCommodity.toLowerCase();
    return (
      r.commodity.toLowerCase().includes(q) ||
      r.market.toLowerCase().includes(q) ||
      r.district.toLowerCase().includes(q)
    );
  }) || [];

  const getCommodityIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('paddy') || n.includes('rice')) return '🌾';
    if (n.includes('cotton') || n.includes('kapas')) return '☁️';
    if (n.includes('chilli') || n.includes('mirchi')) return '🌶️';
    if (n.includes('maize') || n.includes('corn')) return '🌽';
    if (n.includes('ground') || n.includes('peanut')) return '🥜';
    if (n.includes('soy') || n.includes('soya')) return '🌱';
    if (n.includes('wheat')) return '🌾';
    if (n.includes('gram') || n.includes('arhar') || n.includes('tur') || n.includes('moong')) return '🥣';
    if (n.includes('sunflower')) return '🌻';
    if (n.includes('onion')) return '🧅';
    if (n.includes('potato')) return '🥔';
    if (n.includes('tomato')) return '🍅';
    return '🌿';
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors ${className}`}
    >
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 dark:text-white">
                Latest Mandi Market Prices
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                <Database className="w-3 h-3" />
                <span>Official APMC Data</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{selectedState ? `${selectedState} APMC Mandis` : 'National Mandi Network'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Latest Available: <strong>{data?.records[0]?.priceDate || 'Today'}</strong></span>
              </span>
              {data?.isCached && (
                <>
                  <span>•</span>
                  <span className="text-[11px] text-slate-400">
                    Cached bulletin ({new Date(data.cachedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action / Refresh Button */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            disabled={isRefreshing || isLoading}
            onClick={() => fetchPrices(true, selectedState)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isRefreshing ? 'Updating...' : 'Refresh Prices'}</span>
          </button>
        </div>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search input */}
        <div className="sm:col-span-2 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search commodity or market (e.g. Paddy, Cotton, Gangavathi)..."
            value={searchCommodity}
            onChange={(e) => setSearchCommodity(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* State selector */}
        <div className="relative">
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Indian States</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Andhra Pradesh">Andhra Pradesh</option>
            <option value="Telangana">Telangana</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Tamil Nadu">Tamil Nadu</option>
            <option value="Punjab">Punjab</option>
            <option value="Madhya Pradesh">Madhya Pradesh</option>
            <option value="Rajasthan">Rajasthan</option>
            <option value="Uttar Pradesh">Uttar Pradesh</option>
            <option value="Gujarat">Gujarat</option>
          </select>
        </div>
      </div>

      {/* 3. Loading State */}
      {isLoading && !data && (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Loading latest market prices from official APMC mandis...
          </p>
        </div>
      )}

      {/* 4. Error State */}
      {errorMsg && !data && (
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
          <p className="text-xs font-bold text-rose-800 dark:text-rose-200">{errorMsg}</p>
          <button
            type="button"
            onClick={() => fetchPrices(true, selectedState)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 5. Main Content */}
      {data && (
        <div className="space-y-6">
          {/* AI Market Insight Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-blue-600/10 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>🤖 AI Market Insight</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Analysis of {data.totalRecords} active market quotes
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
              {data.marketInsight}
            </p>
          </div>

          {/* Price Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecords.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col justify-between space-y-3.5 group shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{getCommodityIcon(item.commodity)}</span>
                      <div>
                        <h4 className="font-heading font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {item.commodity}
                        </h4>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[170px]">
                          {item.variety} • Grade: {item.grade}
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold shrink-0">
                      APMC
                    </span>
                  </div>

                  {/* Modal Price Highlight */}
                  <div className="mt-3.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Modal Wholesale Price
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl sm:text-2xl font-heading font-black text-slate-900 dark:text-white">
                        ₹{item.modalPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">per Quintal</span>
                    </div>

                    {/* Min - Max Range */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>Min: <strong className="text-slate-700 dark:text-slate-300">₹{item.minPrice.toLocaleString('en-IN')}</strong></span>
                      <span>Max: <strong className="text-slate-700 dark:text-slate-300">₹{item.maxPrice.toLocaleString('en-IN')}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Market & Date footer */}
                <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 truncate">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{item.market}, {item.district}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{item.state}</span>
                    <span>Date: {item.priceDate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredRecords.length === 0 && (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                No matching commodities found for &ldquo;{searchCommodity}&rdquo;.
              </p>
              <button
                type="button"
                onClick={() => setSearchCommodity('')}
                className="text-xs font-bold text-emerald-600 hover:underline"
              >
                Clear Search Filter
              </button>
            </div>
          )}

          {/* Official Source Attribution Notice */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Source: <strong>{data.source}</strong>. Daily wholesale mandi realizations across APMCs.
              </span>
            </div>
            <Link to="/marketplace" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline shrink-0">
              Browse Agri Marketplace →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
