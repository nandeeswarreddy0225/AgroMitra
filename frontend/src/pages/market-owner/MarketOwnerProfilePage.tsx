import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  LogOut,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MarketOwnerNav } from './MarketOwnerNav';
import { AgroMitraLogo } from '../../components/common/AgroMitraLogo';
import { getMarketOwnerDashboardApi } from '../../services/api';
import { MarketOwnerDashboardData } from '../../types/marketOwner';

export const MarketOwnerProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<MarketOwnerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getMarketOwnerDashboardApi();
      if (res.success) {
        setDashboardData(res);
      }
    } catch {
      console.warn('Failed to load profile details.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
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
                Authorized Operator Account
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
              Market Owner Profile
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage your operator credentials, assigned APMC mandi identity, and platform security.
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all border border-rose-200 dark:border-rose-800 self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Operator Details & Assigned Mandi Information Grid */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <span className="text-xs font-medium">Loading profile details...</span>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operator Credentials */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              <h2 className="font-heading font-extrabold text-base text-slate-900 dark:text-white">
                Account Information
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>MARKET_OWNER</span>
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider block">Full Name</span>
              <p className="font-bold text-base text-slate-900 dark:text-white">{user?.name || 'Operator'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider block">Contact Phone</span>
              <p className="font-mono font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{user?.phone || 'Not configured'}</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider block">Registered Email</span>
              <p className="font-mono text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>{user?.email || 'Not configured'}</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block">Account Status</span>
                <span className="font-bold text-emerald-600">Active & Verified</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">ID: {user?.id || '—'}</span>
            </div>
          </div>
        </div>

        {/* Assigned Mandi Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <h2 className="font-heading font-extrabold text-base text-slate-900 dark:text-white">
                Assigned APMC Mandi
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Code: {dashboardData?.market?.marketCode || 'APMC-REGIONAL'}
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider block">Mandi Name</span>
              <p className="font-bold text-base text-slate-900 dark:text-white">
                {dashboardData?.market?.name || 'APMC Market Yard'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider block">Location & Address</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {dashboardData?.market?.address || 'APMC Yard'}, {dashboardData?.market?.district}, {dashboardData?.market?.state} (PIN: {dashboardData?.market?.pincode})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-bold uppercase tracking-wider block">Trading Hours</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {typeof dashboardData?.market?.operatingHours === 'object'
                    ? `${dashboardData.market.operatingHours.open || '06:00 AM'} - ${dashboardData.market.operatingHours.close || '06:00 PM'}`
                    : (dashboardData?.market?.operatingHours || '06:00 AM - 06:00 PM')}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-bold uppercase tracking-wider block">GPS Position</span>
                <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {dashboardData?.market?.latitude && dashboardData?.market?.longitude
                    ? `${dashboardData.market.latitude}°, ${dashboardData.market.longitude}°`
                    : 'Configured'}
                </p>
              </div>
            </div>

            {/* Logout Action */}
            <div className="pt-2">
              <button
                onClick={handleLogout}
                className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Market Owner Portal</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default MarketOwnerProfilePage;
