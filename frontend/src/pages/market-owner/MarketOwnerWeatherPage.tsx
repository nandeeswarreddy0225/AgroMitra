import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { MarketOwnerNav } from './MarketOwnerNav';
import { AgroMitraLogo } from '../../components/common/AgroMitraLogo';
import { LiveWeatherCard } from '../../components/weather/LiveWeatherCard';
import { getMarketOwnerDashboardApi } from '../../services/api';
import { MarketOwnerDashboardData } from '../../types/marketOwner';

export const MarketOwnerWeatherPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<MarketOwnerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await getMarketOwnerDashboardApi();
      if (res.success) {
        setDashboardData(res);
      }
    } catch {
      setErrorMsg('Failed to load mandi profile for weather integration.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
                APMC Mandi Real-Time Weather Intelligence
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
              Live Mandi Weather & Advisory
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Live meteorological observations and 3-day harvest transport & grain storage forecast for {dashboardData?.market?.name || 'your authorized APMC mandi'}.
            </p>
          </div>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing || isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="font-bold text-rose-700">✕</button>
        </div>
      )}

      {/* Mandi Location & Weather Integration Component */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <span className="text-xs font-medium">Acquiring mandi weather and forecasts...</span>
        </div>
      ) : (
      <div className="space-y-4">
        <LiveWeatherCard
          initialCity={dashboardData?.market?.district || dashboardData?.market?.city}
          initialState={dashboardData?.market?.state}
        />
      </div>
      )}
    </div>
  );
};

export default MarketOwnerWeatherPage;
