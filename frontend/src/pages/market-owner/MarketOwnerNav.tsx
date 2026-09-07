import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  History,
  Building2,
  CloudSun,
  User,
  ExternalLink,
} from 'lucide-react';

interface MarketOwnerNavProps {
  marketName?: string;
  marketDistrict?: string;
  marketState?: string;
}

export const MarketOwnerNav: React.FC<MarketOwnerNavProps> = ({
  marketName,
  marketDistrict,
  marketState,
}) => {
  const location = useLocation();

  const currentPath = location.pathname;

  const navItems = [
    {
      path: '/market-owner/dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      path: '/market-owner/prices',
      label: 'Daily Prices',
      icon: TrendingUp,
    },
    {
      path: '/market-owner/price-history',
      label: 'Price History & Audits',
      icon: History,
    },
    {
      path: '/market-owner/market',
      label: 'Mandi Profile',
      icon: Building2,
    },
    {
      path: '/market-owner/weather',
      label: 'Mandi Weather',
      icon: CloudSun,
    },
    {
      path: '/market-owner/profile',
      label: 'My Profile',
      icon: User,
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-2 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 py-1">
        {/* Mandi Tag / Info */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-slate-900 dark:text-white font-bold truncate max-w-[200px] sm:max-w-[280px]">
            {marketName || 'Authorized APMC Mandi'}
          </span>
          {marketDistrict && (
            <span className="hidden sm:inline text-slate-400 font-normal">
              ({marketDistrict}, {marketState})
            </span>
          )}
        </div>

        {/* Public Mandi Rates Preview Link */}
        <Link
          to="/market/prices"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors self-end sm:self-auto"
        >
          <span>Public Farmer View</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 border-t border-slate-100 dark:border-slate-800/80 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || (item.path === '/market-owner/dashboard' && currentPath === '/market-owner');

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MarketOwnerNav;
