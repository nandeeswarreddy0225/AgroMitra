import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { MarketOwnerNav } from './MarketOwnerNav';
import { AgroMitraLogo } from '../../components/common/AgroMitraLogo';
import {
  getMarketOwnerDashboardApi,
  getMarketPriceHistoryApi,
  getCommoditiesApi,
} from '../../services/api';
import {
  MarketOwnerDashboardData,
  MarketPriceHistoryData,
  Commodity,
} from '../../types/marketOwner';

export const MarketOwnerPriceHistoryPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<MarketOwnerDashboardData | null>(null);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [selectedCommodity, setSelectedCommodity] = useState<string>('');
  const [historyData, setHistoryData] = useState<MarketPriceHistoryData | null>(null);
  const [historyDays, setHistoryDays] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [dashRes, commRes] = await Promise.all([
        getMarketOwnerDashboardApi(),
        getCommoditiesApi({ includeInactive: true }),
      ]);

      if (dashRes.success) {
        setDashboardData(dashRes);
      }
      if (commRes.success && commRes.commodities.length > 0) {
        setCommodities(commRes.commodities);
        setSelectedCommodity(commRes.commodities[0].name);
      }
    } catch {
      setErrorMsg('Failed to load initial history data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadHistoryForCommodity = useCallback(async (commName: string, days: number) => {
    if (!commName) return;
    try {
      const histRes = await getMarketPriceHistoryApi({
        commodity: commName,
        days,
      });
      if (histRes) {
        setHistoryData(histRes);
      }
    } catch {
      console.warn('Failed to load history for commodity:', commName);
    }
  }, []);

  useEffect(() => {
    if (selectedCommodity) {
      loadHistoryForCommodity(selectedCommodity, historyDays);
    }
  }, [selectedCommodity, historyDays, loadHistoryForCommodity]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadInitial();
    if (selectedCommodity) {
      await loadHistoryForCommodity(selectedCommodity, historyDays);
    }
    setIsRefreshing(false);
  };

  // Render SVG Price Trend Chart
  const renderTrendChart = () => {
    if (!historyData || !historyData.historyPoints || historyData.historyPoints.length === 0) {
      return (
        <div className="py-12 text-center text-slate-400 text-xs">
          No historical auction sessions available for {selectedCommodity}.
        </div>
      );
    }

    if (historyData.historyPoints.length === 1) {
      const single = historyData.historyPoints[0];
      return (
        <div className="py-8 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-center space-y-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Single Auction Quote Recorded
          </span>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Modal price of <strong className="text-slate-900 dark:text-white">₹{single.modalPrice}</strong> on {single.date}. Multi-session trend chart will render after subsequent daily price updates.
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
              <linearGradient id="mandiHistoryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#e2e8f0" strokeDasharray="4 4" />
            <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#e2e8f0" strokeDasharray="4 4" />
            <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#cbd5e1" />

            <path d={areaD} fill="url(#mandiHistoryGradient)" />
            <path d={pathD} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {points.map((p, idx) => (
              <g key={idx}>
                <circle
                  cx={getX(idx)}
                  cy={getY(p.modalPrice)}
                  r="4.5"
                  fill="#059669"
                  stroke="#ffffff"
                  strokeWidth="2"
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

        <div className="flex justify-between text-[10px] text-slate-400 font-mono px-4">
          <span>{points[0]?.date}</span>
          <span>{points.length} Daily Sessions Recorded</span>
          <span>{points[points.length - 1]?.date}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Sub-Navigation */}
      <MarketOwnerNav
        marketName={dashboardData?.market?.name}
        marketDistrict={dashboardData?.market?.district}
        marketState={dashboardData?.market?.state}
      />

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-4">
          <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <AgroMitraLogo variant="mark" size="lg" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Audit Trail & Historical Price Trends
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
              Price History & Audits
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Review historical auction trends, price revision logs, and immutable governance audit trails.
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Global Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-xs sm:text-sm text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="font-bold text-rose-700">✕</button>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <span className="text-xs font-medium">Loading historical rates and audit logs...</span>
        </div>
      ) : (
        <>
      {/* Commodity Selector Pills */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
          Select Commodity for Trend Analysis
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {commodities.map((c) => {
            const isSelected = selectedCommodity === c.name;
            return (
              <button
                key={c.id || c._id}
                onClick={() => setSelectedCommodity(c.name)}
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
      </div>

      {/* Historical Trend Graph Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <span>{selectedCommodity} — Price Trend Analysis</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Wholesale modal realization curve over time
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setHistoryDays(7)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                historyDays === 7 ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              7-Day
            </button>
            <button
              onClick={() => setHistoryDays(30)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                historyDays === 30 ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              30-Day
            </button>
          </div>
        </div>

        {/* Quick Metrics */}
        {historyData && (
          <div className="grid grid-cols-4 gap-3 text-center text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Latest Rate</span>
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

        {renderTrendChart()}
      </div>

      {/* Price-Change Audit History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-heading font-extrabold text-base text-slate-900 dark:text-white">
              Price Revision & Audit Log History
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {dashboardData?.recentAudits?.length || 0} Audit entries recorded
          </span>
        </div>

        {dashboardData?.recentAudits && dashboardData.recentAudits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-bold tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp / Date</th>
                  <th className="py-3 px-4">Commodity</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Previous Rate</th>
                  <th className="py-3 px-4">New Rate</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4 text-right">Integrity Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dashboardData.recentAudits.map((audit) => (
                  <tr key={audit.id || audit._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 font-mono">
                      {audit.priceDate} {audit.updatedTime && `(${audit.updatedTime})`}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {audit.commodityName || 'Commodity'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          audit.action === 'CREATE'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {audit.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {audit.previousPrice ? `₹${audit.previousPrice.modalPrice}` : '—'}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      ₹{audit.newPrice.modalPrice} / {audit.newPrice.unit}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {audit.changedByName || 'Market Operator'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {audit.isFlaggedSuspicious ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                          <ShieldAlert className="w-3 h-3 text-amber-600" />
                          Price Shift Flagged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Verified
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            No price revision audits recorded yet for this mandi.
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};

export default MarketOwnerPriceHistoryPage;
