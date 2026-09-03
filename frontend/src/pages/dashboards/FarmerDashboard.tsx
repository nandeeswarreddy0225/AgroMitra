import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { LiveWeatherCard } from '../../components/weather/LiveWeatherCard';
import { SeasonalCropAdvisorCard } from '../../components/crops/SeasonalCropAdvisorCard';
import { LiveMandiPricesCard } from '../../components/market/LiveMandiPricesCard';
import { AIMarketIntelligenceSection } from '../../components/market/AIMarketIntelligenceSection';
import { WeatherData } from '../../types/weather';




import {
  Sprout,
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Landmark,
  ShoppingBag,
  Package,
  Sparkles,
  Bot,
} from 'lucide-react';



export const FarmerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);

  return (

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
            <Sprout className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                AgroMitra Intelligent Agriculture
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
              AgroMitra Farmer Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('welcomeBack', 'Welcome back')}, <strong className="text-slate-800 dark:text-slate-200">{user?.name || 'Farmer'}</strong> • Field Intelligence & Input Marketplace
            </p>

          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold self-start sm:self-auto">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{t('roleFarmer', 'Farmer Account')}</span>
        </div>
      </div>

      {/* 2. Top Primary Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <Link
          to="/ai/crop-disease"
          className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-between group"
        >

          <div className="space-y-1">
            <span className="text-xs font-bold text-purple-200 uppercase tracking-wide">AI Diagnosis</span>
            <h3 className="text-base font-heading font-extrabold text-white">
              {t('toolLeafScanner', 'AI Leaf Scanner')}
            </h3>
            <p className="text-xs text-purple-100">Deep learning leaf diagnosis</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
        </Link>

        <Link
          to="/marketplace"
          className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Procurement</span>
            <h3 className="text-base font-heading font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {t('navMarketplace', 'Marketplace')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Authentic seeds & crop protection</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </Link>

        <Link
          to="/orders"
          className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Tracking</span>
            <h3 className="text-base font-heading font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {t('navOrders', 'My Orders')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Delivery tracking & status</p>
          </div>

          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Package className="w-5 h-5" />
          </div>
        </Link>

        <Link
          to="/schemes"
          className="bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl p-6 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wide">Subsidies</span>
            <h3 className="text-base font-heading font-extrabold text-white">
              {t('navSchemes', 'Govt Schemes')}
            </h3>
            <p className="text-xs text-emerald-100">17 verified subsidies</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
            <Landmark className="w-5 h-5" />
          </div>
        </Link>

      </div>

      {/* 3. Live Intelligence & Agronomy Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col 1 & 2: Live Weather & Smart Crop Advisory */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Real Live Weather Card */}
          <LiveWeatherCard onWeatherLoaded={setCurrentWeather} />

          {/* 🌾 Seasonal Crop Advisor */}
          <SeasonalCropAdvisorCard weather={currentWeather} />

          {/* Smart Advisory & Crop Planner */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-heading font-bold text-base">
                <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>{t('smartAdvisoryTitle', 'Field Intelligence')} & Crop Planner</span>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {new Date().toLocaleString('en-US', { month: 'short' })} {new Date().getFullYear()}
              </span>
            </div>


            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold shrink-0">
                  Day 35
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Paddy (Basmati) — Tillering Stage</h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Apply second split dose of Urea (25 kg/acre) mixed with Zinc Sulphate. Keep 2–3 cm standing water.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold shrink-0">
                  Alert
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Chilli & Cotton — Thrips & Mites Monitoring</h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Use blue sticky traps (10/acre) and consider neem-based bio-pesticide spray for early nymph prevention.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Col 3: Farmer Profile & Mandi Rates */}
        <div className="space-y-6">
          
          {/* Profile Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              Farmer Profile Details
            </h3>
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-900 dark:text-white">{user?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{user?.phone || '8519813077'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>
                  {[user?.address?.street, user?.address?.city, user?.address?.state, user?.address?.pincode]
                    .filter(Boolean)
                    .join(', ') || 'Andhra Pradesh, 518001'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 4. Real Mandi Market Prices Section */}
      <LiveMandiPricesCard weather={currentWeather} />

      {/* 5. AI Market Intelligence & Forecast Section */}
      <AIMarketIntelligenceSection weather={currentWeather} />

    </div>
  );
};


