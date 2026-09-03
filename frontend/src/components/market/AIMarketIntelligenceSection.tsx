import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Building2,
  AlertCircle,
  Loader2,
  Info,
  ShieldCheck,
  LineChart as LineChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from 'lucide-react';

import { getMarketIntelligenceApi } from '../../services/api';
import {
  AIMarketIntelligenceResponse,
  HistoricalPricePoint,
} from '../../types/mandiPrice';
import { WeatherData } from '../../types/weather';

interface AIMarketIntelligenceSectionProps {
  weather?: WeatherData | null;
  className?: string;
  defaultCommodity?: string;
}

const POPULAR_COMMODITIES = [
  'Paddy(Common)',
  'Maize',
  'Ground Nut Seed',
  'Cotton',
  'Chilli Red',
  'Soyabean',
  'Sunflower/Sunflower Seed',
];

export const AIMarketIntelligenceSection: React.FC<AIMarketIntelligenceSectionProps> = ({
  weather,
  className = '',
  defaultCommodity = 'Paddy(Common)',
}) => {
  const [selectedCommodity, setSelectedCommodity] = useState<string>(defaultCommodity);
  const [selectedState, setSelectedState] = useState<string>('');
  const [intelligence, setIntelligence] = useState<AIMarketIntelligenceResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state with farmer's detected location
  useEffect(() => {
    if (weather?.location?.state && !selectedState) {
      setSelectedState(weather.location.state);
    }
  }, [weather?.location?.state, selectedState]);

  const fetchIntelligence = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      setErrorMsg(null);

      try {
        const stateToQuery = selectedState || weather?.location?.state;
        const res = await getMarketIntelligenceApi({
          commodity: selectedCommodity,
          state: stateToQuery,
        });

        if (res.success) {
          setIntelligence(res);
        } else {
          setErrorMsg(res.message || 'Market intelligence temporarily unavailable.');
        }
      } catch (err: any) {
        setErrorMsg('Unable to retrieve AI market intelligence at this time.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedCommodity, selectedState, weather?.location?.state]
  );

  useEffect(() => {
    fetchIntelligence();
  }, [selectedCommodity, selectedState, fetchIntelligence]);

  const getCommodityIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('paddy') || n.includes('rice')) return '🌾';
    if (n.includes('cotton') || n.includes('kapas')) return '☁️';
    if (n.includes('chilli') || n.includes('mirchi')) return '🌶️';
    if (n.includes('maize') || n.includes('corn')) return '🌽';
    if (n.includes('ground') || n.includes('peanut')) return '🥜';
    if (n.includes('soy') || n.includes('soya')) return '🌱';
    if (n.includes('sunflower')) return '🌻';
    return '🌿';
  };

  // Helper to render pure SVG chart for Historical + Forecast points
  const renderPriceChart = (
    history: HistoricalPricePoint[],
    forecastPoints: HistoricalPricePoint[] = []
  ) => {
    const allPoints = [...history, ...forecastPoints];
    if (allPoints.length === 0) return null;

    const prices = allPoints.map((p) => p.price);
    const minPrice = Math.min(...prices) * 0.96;
    const maxPrice = Math.max(...prices) * 1.04;
    const priceRange = maxPrice - minPrice || 1;

    const width = 600;
    const height = 180;
    const paddingX = 40;
    const paddingY = 25;

    const getX = (index: number) => {
      const step = (width - paddingX * 2) / Math.max(1, allPoints.length - 1);
      return paddingX + index * step;
    };

    const getY = (price: number) => {
      const normalized = (price - minPrice) / priceRange;
      return height - paddingY - normalized * (height - paddingY * 2);
    };

    // Build historical path
    const histPoints = history.map((p, idx) => `${getX(idx)},${getY(p.price)}`);
    const histPathD = histPoints.length > 0 ? `M ${histPoints.join(' L ')}` : '';

    // Build forecast path starting from last historical point
    const forecastPathPoints: string[] = [];
    if (history.length > 0 && forecastPoints.length > 0) {
      const lastHistIndex = history.length - 1;
      forecastPathPoints.push(`${getX(lastHistIndex)},${getY(history[lastHistIndex].price)}`);
      forecastPoints.forEach((p, idx) => {
        forecastPathPoints.push(`${getX(lastHistIndex + 1 + idx)},${getY(p.price)}`);
      });
    }
    const forecastPathD = forecastPathPoints.length > 0 ? `M ${forecastPathPoints.join(' L ')}` : '';

    return (
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 sm:h-52 overflow-visible select-none"
        >
          <defs>
            <linearGradient id="histGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={getY(maxPrice)}
            x2={width - paddingX}
            y2={getY(maxPrice)}
            stroke="currentColor"
            strokeDasharray="3 3"
            className="text-slate-200 dark:text-slate-800"
          />
          <line
            x1={paddingX}
            y1={getY(minPrice)}
            x2={width - paddingX}
            y2={getY(minPrice)}
            stroke="currentColor"
            strokeDasharray="3 3"
            className="text-slate-200 dark:text-slate-800"
          />

          {/* Historical Solid Line */}
          {histPathD && (
            <path
              d={histPathD}
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Forecast Dashed Line */}
          {forecastPathD && (
            <path
              d={forecastPathD}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeDasharray="5 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Historical Observation Circles */}
          {history.map((pt, idx) => {
            const cx = getX(idx);
            const cy = getY(pt.price);
            return (
              <g key={`hist-${idx}`} className="group">
                <circle cx={cx} cy={cy} r="4.5" fill="#10b981" className="stroke-white dark:stroke-slate-900 stroke-2" />
                {/* Price text above dot */}
                <text
                  x={cx}
                  y={cy - 9}
                  textAnchor="middle"
                  className="text-[10px] font-bold fill-slate-800 dark:fill-slate-200"
                >
                  ₹{Math.round(pt.price).toLocaleString('en-IN')}
                </text>
                {/* Date text below */}
                <text
                  x={cx}
                  y={height - 6}
                  textAnchor="middle"
                  className="text-[9px] font-semibold fill-slate-400"
                >
                  {pt.date.slice(0, 5)}
                </text>
              </g>
            );
          })}

          {/* Forecast Projection Dots */}
          {forecastPoints.map((pt, idx) => {
            const absIndex = history.length + idx;
            const cx = getX(absIndex);
            const cy = getY(pt.price);
            return (
              <g key={`fc-${idx}`}>
                <circle cx={cx} cy={cy} r="4" fill="#f59e0b" className="stroke-white dark:stroke-slate-900 stroke-2" />
                <text
                  x={cx}
                  y={cy - 9}
                  textAnchor="middle"
                  className="text-[10px] font-bold fill-amber-600 dark:fill-amber-400"
                >
                  ₹{Math.round(pt.price).toLocaleString('en-IN')}*
                </text>
                <text
                  x={cx}
                  y={height - 6}
                  textAnchor="middle"
                  className="text-[9px] font-bold fill-amber-500"
                >
                  {pt.date.split(' ')[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors ${className}`}
    >
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-purple-600/20">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 dark:text-white">
                AI Market Intelligence & Forecast
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] font-bold">
                FastAPI Analytics Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Time-series statistical analysis on official APMC auction records • Forecasts are model-based estimates.
            </p>
          </div>
        </div>

        {/* Commodity Selector Dropdown & Refresh */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <select
            value={selectedCommodity}
            onChange={(e) => setSelectedCommodity(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-purple-500"
          >
            {POPULAR_COMMODITIES.map((c) => (
              <option key={c} value={c}>
                {getCommodityIcon(c)} {c}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={isRefreshing || isLoading}
            onClick={() => fetchIntelligence(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-600' : ''}`} />
            <span>{isRefreshing ? 'Analyzing...' : 'Recalculate'}</span>
          </button>
        </div>
      </div>

      {/* 2. Commodity Quick Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {POPULAR_COMMODITIES.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedCommodity(c)}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCommodity === c
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-purple-300'
            }`}
          >
            <span>{getCommodityIcon(c)}</span>
            <span>{c.split('(')[0]}</span>
          </button>
        ))}
      </div>

      {/* 3. Loading State */}
      {isLoading && !intelligence && (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Running statistical time-series model on {selectedCommodity}...
          </p>
        </div>
      )}

      {/* 4. Error State */}
      {errorMsg && !intelligence && (
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
          <p className="text-xs font-bold text-rose-800 dark:text-rose-200">{errorMsg}</p>
          <button
            type="button"
            onClick={() => fetchIntelligence(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 5. Main Content */}
      {intelligence && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Metric 1: Latest Actual Modal Price */}
            <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Latest Mandi Price (Factual)
                </span>
                <Building2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-heading font-black text-slate-900 dark:text-white">
                  ₹{intelligence.latestPrice.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-500 font-semibold">/ Quintal</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                <span>{intelligence.latestMarket}</span> • <span>{intelligence.latestDate}</span>
              </div>
            </div>

            {/* Metric 2: Price Trend & % Change */}
            <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Observed Price Trend
                </span>
                {intelligence.trend === 'Rising' ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                ) : intelligence.trend === 'Falling' ? (
                  <ArrowDownRight className="w-4 h-4 text-rose-600" />
                ) : (
                  <Minus className="w-4 h-4 text-amber-500" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                    intelligence.trend === 'Rising'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                      : intelligence.trend === 'Falling'
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300'
                  }`}
                >
                  {intelligence.trend}
                  {intelligence.priceChangePercent !== null && (
                    <span> ({intelligence.priceChangePercent >= 0 ? '+' : ''}{intelligence.priceChangePercent}%)</span>
                  )}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {intelligence.previousPrice !== null ? (
                  <span>vs Previous: ₹{intelligence.previousPrice.toLocaleString('en-IN')} ({intelligence.previousDate})</span>
                ) : (
                  <span>Price change unavailable (single quote)</span>
                )}
              </div>
            </div>

            {/* Metric 3: Highest Observed Real Price */}
            <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Highest Observed Quote
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 dark:text-white">
                ₹{intelligence.highestObserved.price.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                <span>{intelligence.highestObserved.market}</span> • <span>{intelligence.highestObserved.date}</span>
              </div>
            </div>

            {/* Metric 4: Lowest Observed Real Price */}
            <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Lowest Observed Quote
                </span>
                <TrendingDown className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 dark:text-white">
                ₹{intelligence.lowestObserved.price.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                <span>{intelligence.lowestObserved.market}</span> • <span>{intelligence.lowestObserved.date}</span>
              </div>
            </div>

          </div>

          {/* Historical Observation Chart & Forecast Overlay */}
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <LineChartIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                  Real APMC Price Observations & 5-Day Projection
                </h3>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-3 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Actual APMC Auctions</span>
                </div>
                {intelligence.hasEnoughDataForForecast && (
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-dashed" />
                    <span>5-Day Statistical Forecast*</span>
                  </div>
                )}
              </div>
            </div>

            {/* Render SVG Line Chart */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              {renderPriceChart(
                intelligence.historicalData,
                intelligence.forecast?.projectionPoints || []
              )}
            </div>

            {/* Insufficient Data Warning if < 3 points */}
            {!intelligence.hasEnoughDataForForecast && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Forecast Notice:</strong> {intelligence.forecastMessage || 'Insufficient market data for reliable forecast'}. Projections activate when at least 3 historical trading observations are recorded.
                </span>
              </div>
            )}
          </div>

          {/* AI Explanation & Forecast Analysis Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* AI Analytical Explanation */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200/80 dark:border-purple-800/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>AI Market Analysis</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {intelligence.aiExplanation}
              </p>
            </div>

            {/* Forecast Projection Details */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>5-Day Statistical Forecast</span>
                </div>
                {intelligence.forecast?.confidenceScore && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                    Confidence: {(intelligence.forecast.confidenceScore * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {intelligence.forecast?.forecastSummary ||
                  'Statistical forecast is awaiting additional multi-session APMC trade records.'}
              </p>

              {intelligence.forecast?.disclaimer && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 italic pt-1">
                  *{intelligence.forecast.disclaimer}
                </p>
              )}
            </div>

          </div>

          {/* Source and Transparency Footer */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Source: <strong>{intelligence.source}</strong>. Analysis computed from verified APMC market observations.
              </span>
            </div>
            <span className="text-slate-400">
              Total Observations Analyzed: <strong>{intelligence.observationCount}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
