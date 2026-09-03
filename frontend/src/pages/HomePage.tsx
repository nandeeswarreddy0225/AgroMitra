import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout,
  Store,
  Truck,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CloudSun,
  Droplets,
  Wind,
  Thermometer,
  ShoppingCart,
  CheckCircle2,
  Compass,
  Check,
} from 'lucide-react';
import {
  getProductsApi,
  getLiveWeatherApi,
  getMandiPricesApi,
  getSchemesApi,
} from '../services/api';
import { Product } from '../types/product';
import { WeatherData } from '../types/weather';
import { MandiPriceRecord } from '../types/mandiPrice';
import { Scheme } from '../types/scheme';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTranslation } from '../context/LanguageContext';

export const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { t } = useTranslation();

  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedSuccessId, setAddedSuccessId] = useState<string | null>(null);

  const [liveWeather, setLiveWeather] = useState<WeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);

  const [mandiPrices, setMandiPrices] = useState<MandiPriceRecord[]>([]);
  const [isLoadingMandi, setIsLoadingMandi] = useState(true);

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [isLoadingSchemes, setIsLoadingSchemes] = useState(true);

  useEffect(() => {
    // 1. Fetch Real Featured Products from MongoDB
    const fetchProducts = async () => {
      try {
        const res = await getProductsApi({ limit: 4 });
        if (res.success && Array.isArray(res.products)) {
          setFeaturedProducts(res.products.slice(0, 4));
        }
      } catch (err) {
        console.warn('Could not fetch featured products:', err);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    // 2. Fetch Live Weather Data from API
    const fetchWeather = async () => {
      try {
        const res = await getLiveWeatherApi();
        if (res.success && res.weather) {
          setLiveWeather(res.weather);
        }
      } catch (err) {
        console.warn('Could not fetch homepage weather:', err);
      } finally {
        setIsLoadingWeather(false);
      }
    };

    // 3. Fetch Real APMC Mandi Spot Prices from API
    const fetchMandi = async () => {
      try {
        const res = await getMandiPricesApi({ limit: 4 });
        if (res.success && Array.isArray(res.records)) {
          setMandiPrices(res.records.slice(0, 4));
        }
      } catch (err) {
        console.warn('Could not fetch mandi rates:', err);
      } finally {
        setIsLoadingMandi(false);
      }
    };

    // 4. Fetch Verified Government Schemes from API
    const fetchSchemes = async () => {
      try {
        const res = await getSchemesApi({});
        if (res.success && Array.isArray(res.schemes)) {
          setSchemes(res.schemes.slice(0, 3));
        }
      } catch (err) {
        console.warn('Could not fetch schemes:', err);
      } finally {
        setIsLoadingSchemes(false);
      }
    };

    fetchProducts();
    fetchWeather();
    fetchMandi();
    fetchSchemes();
  }, []);

  const handleAddToCart = async (product: Product) => {
    const productId = product.id || product._id;
    if (!productId) return;
    setAddingId(productId);
    try {
      await addToCart(productId, 1);
      setAddedSuccessId(productId);
      setTimeout(() => setAddedSuccessId(null), 2500);
    } catch {
      // Handled in CartContext
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="space-y-20 pb-24 overflow-hidden">
      
      {/* ========================================================================= */}
      {/* 1. HERO SECTION: Full-width Agricultural Hero with Real Imagery & Trust Metrics */}
      {/* ========================================================================= */}
      <section className="relative min-h-[580px] lg:min-h-[640px] flex items-center bg-stone-900 text-white overflow-hidden rounded-3xl mx-2 sm:mx-4 lg:mx-8 mt-3 shadow-xl">
        {/* Real Indian Agriculture Hero Photograph */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1920&q=80"
            alt="Indian farmer inspecting lush green agricultural crop field"
            className="w-full h-full object-cover object-center scale-105 transform animate-in fade-in duration-700"
          />
          {/* Subtle multi-stop gradient overlay for high text contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-900/80 to-stone-900/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 lg:py-24 w-full">
          <div className="max-w-2xl space-y-6">
            
            {/* Brand Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/40 text-emerald-300 text-xs font-bold tracking-wide shadow-sm">
              <Sprout className="w-4 h-4 text-emerald-400" />
              <span>{t('brandName', 'AgroMitra')} • {t('brandTagline', 'Smart Farming. Better Decisions. Stronger Connections.')}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight leading-[1.12] text-white">
              Smart Farming.<br />
              <span className="text-emerald-400">Better Decisions.</span>
            </h1>

            {/* Supporting Text */}
            <p className="text-sm sm:text-base lg:text-lg text-stone-200/90 leading-relaxed max-w-xl font-normal">
              {t(
                'brandHeroSubtitle',
                'AgroMitra connects farmers, agri store partners and delivery partners in one intelligent agricultural platform.'
              )}

            </p>

            {/* Primary Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 px-6 sm:px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-sm shadow-lg shadow-emerald-900/40 hover:shadow-emerald-900/60 transition-all hover:-translate-y-0.5"
              >
                <span>{t('exploreProductsBtn', 'Explore Products')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/ai/crop-disease"
                className="inline-flex items-center gap-2 px-6 sm:px-7 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-heading font-bold text-sm transition-all hover:-translate-y-0.5"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>{t('scanCropBtn', 'Scan Your Crop')}</span>
              </Link>
            </div>

            {/* Trust Indicators (Actual Working Capabilities Only) */}
            <div className="pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-stone-300">
              <div className="flex items-center gap-2">
                <span className="text-base">🌾</span>
                <span>{t('trustSmartFarming', 'Smart Farming')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">💰</span>
                <span>{t('trustMarketIntel', 'Market Intelligence')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">🌦️</span>
                <span>{t('trustLiveWeather', 'Live Weather')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">🤖</span>
                <span>{t('trustAiAssistance', 'AI Crop Assistance')}</span>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ========================================================================= */}
      {/* 2. FROM SEED TO MARKET STORY: 4 Visual Steps of the Agricultural Journey */}
      {/* ========================================================================= */}
      <section id="ecosystem" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Lifecycle Ecosystem
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-slate-900 dark:text-white">
            {t('seedToMarketTitle', 'From Seed to Market')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('seedToMarketSub', 'An integrated ecosystem supporting every stage of the agricultural journey.')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Step 01: PLAN */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-sm group">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 group-hover:scale-110 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              <span className="text-2xl font-mono font-black text-slate-300 dark:text-slate-700">01</span>
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                🌱 {t('step01Title', 'PLAN')}
              </div>
              <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white mt-1">
                Crop & Soil Guidance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {t('step01Desc', 'Crop & soil guidance tailored to your farm.')}
              </p>
            </div>
          </div>

          {/* Step 02: GROW */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-sm group">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-700 dark:text-purple-300 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-2xl font-mono font-black text-slate-300 dark:text-slate-700">02</span>
            </div>
            <div>
              <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                🌿 {t('step02Title', 'GROW')}
              </div>
              <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white mt-1">
                Weather & AI Protection
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {t('step02Desc', 'Hyperlocal weather forecasts and AI crop pathology diagnosis.')}
              </p>
            </div>
          </div>

          {/* Step 03: BUY */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-sm group">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-300 group-hover:scale-110 transition-transform">
                <Store className="w-6 h-6" />
              </div>
              <span className="text-2xl font-mono font-black text-slate-300 dark:text-slate-700">03</span>
            </div>
            <div>
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                🛒 {t('step03Title', 'BUY')}
              </div>
              <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white mt-1">
                Agricultural Products
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {t('step03Desc', 'Certified seeds, bio-protection, and equipment.')}
              </p>

            </div>
          </div>

          {/* Step 04: DELIVER */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-sm group">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-300 group-hover:scale-110 transition-transform">
                <Truck className="w-6 h-6" />
              </div>
              <span className="text-2xl font-mono font-black text-slate-300 dark:text-slate-700">04</span>
            </div>
            <div>
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                🚚 {t('step04Title', 'DELIVER')}
              </div>
              <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white mt-1">
                Field Delivery
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {t('step04Desc', 'Fast and reliable retailer-to-farmer field delivery.')}
              </p>
            </div>
          </div>

        </div>
      </section>


      {/* ========================================================================= */}
      {/* 3. THREE PRIMARY USERS: Farmer, Agri Store Partner, Delivery Partner */}
      {/* ========================================================================= */}

      <section id="users" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            One Unified Platform
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-slate-900 dark:text-white">
            {t('builtForAgriTitle', 'Built for Agriculture')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('builtForAgriSub', 'Empowering all three pillars of Indian agriculture with specialized digital tools.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: FARMER */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-emerald-100 dark:border-emerald-950/80 p-7 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow space-y-6">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                <Sprout className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white">
                  👨‍🌾 {t('farmerCardTitle', 'FARMER')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('farmerCardSub', 'Everything a farmer needs to make smarter decisions.')}
                </p>
              </div>

              {/* Feature Checklist */}
              <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Live Hyperlocal Weather Advisory</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>APMC Mandi Spot Prices & Trends</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Soil & Seasonal Crop Advisor</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>AI Leaf Disease Pathology Scanner</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Verified Government Welfare Schemes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Direct Input Marketplace & Tracking</span>
                </li>
              </ul>
            </div>

            <Link
              to={isAuthenticated && user?.role === 'FARMER' ? '/dashboard' : '/marketplace'}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs shadow-sm transition-all"
            >
              <span>{t('farmerCta', 'Explore Farmer Tools')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: AGRI STORE PARTNER */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-100 dark:border-amber-950/80 p-7 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow space-y-6">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-300">
                <Store className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white">
                  🏪 {t('partnerCardTitle', 'AGRI STORE PARTNER')}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('partnerCardSub', 'Manage your agricultural business and serve farmers better.')}
                </p>
              </div>

              {/* Feature Checklist */}
              <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Product Catalog & Pricing Management</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Live Inventory & Stock Tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Farmer Order Reception & Processing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Direct Store UPI QR & Razorpay Payments</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Delivery Partner Discovery & Assignment</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Order Lifecycle & Status Progression</span>
                </li>
              </ul>
            </div>

            <Link
              to={isAuthenticated && user?.role === 'SHOP_OWNER' ? '/shop/orders' : '/register'}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-heading font-bold text-xs shadow-sm transition-all"
            >
              <span>{t('partnerCta', 'Manage Your Store')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: DELIVERY PARTNER */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-blue-100 dark:border-blue-950/80 p-7 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow space-y-6">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-300">
                <Truck className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white">
                  🚚 {t('deliveryCardTitle', 'DELIVERY PARTNER')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('deliveryCardSub', 'Connect stores with farmers through reliable delivery.')}
                </p>
              </div>

              {/* Feature Checklist */}
              <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Real-time Delivery Assignment Requests</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Instant Request Acceptance & Rejection</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Store Pickup Verification & Navigation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Out for Delivery Real-time Milestones</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Direct Delivery Confirmation to Farmer</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Shipment History & Performance Log</span>
                </li>
              </ul>
            </div>

            <Link
              to={isAuthenticated && user?.role === 'DELIVERY_BOY' ? '/delivery/dashboard' : '/register'}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-xs shadow-sm transition-all"
            >
              <span>{t('deliveryCta', 'Manage Deliveries')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </section>


      {/* ========================================================================= */}
      {/* 4. AGRICULTURE IMAGE GALLERY: "Life Behind Every Harvest" */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Visual Tribute
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-slate-900 dark:text-white">
            {t('lifeBehindHarvestTitle', 'Life Behind Every Harvest')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('lifeBehindHarvestSub', 'Honoring the dedication, resilience, and science powering Indian fields every single day.')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Photo 1: Sowing */}
          <div className="group relative h-64 sm:h-72 rounded-3xl overflow-hidden shadow-md">
            <img
              src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80"
              alt="Indian farmer preparing the soil and sowing seeds in the field"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent flex flex-col justify-end p-5 text-white">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                {t('gallerySowing', 'Precision Sowing')}
              </span>
              <p className="text-xs text-stone-200 mt-1 font-medium">
                {t('gallerySowingDesc', 'Early morning field preparation and seedbed planning.')}
              </p>
            </div>
          </div>

          {/* Photo 2: Water Irrigation */}
          <div className="group relative h-64 sm:h-72 rounded-3xl overflow-hidden shadow-md">
            <img
              src="https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=800&q=80"
              alt="Farmer managing farm water irrigation"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent flex flex-col justify-end p-5 text-white">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                {t('galleryIrrigation', 'Water Management')}
              </span>
              <p className="text-xs text-stone-200 mt-1 font-medium">
                {t('galleryIrrigationDesc', 'Optimal hydration for maximum seasonal crop vitality.')}
              </p>
            </div>
          </div>

          {/* Photo 3: Leaf Inspection */}
          <div className="group relative h-64 sm:h-72 rounded-3xl overflow-hidden shadow-md">
            <img
              src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80"
              alt="Farmer inspecting crop plant health and foliage"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent flex flex-col justify-end p-5 text-white">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                {t('galleryInspection', 'Crop Inspection')}
              </span>
              <p className="text-xs text-stone-200 mt-1 font-medium">
                {t('galleryInspectionDesc', 'Proactive leaf monitoring and soil health checks.')}
              </p>
            </div>
          </div>

          {/* Photo 4: Harvest */}
          <div className="group relative h-64 sm:h-72 rounded-3xl overflow-hidden shadow-md">
            <img
              src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80"
              alt="Abundant agricultural grain harvest in rural India"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent flex flex-col justify-end p-5 text-white">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                {t('galleryHarvest', 'Abundant Harvest')}
              </span>
              <p className="text-xs text-stone-200 mt-1 font-medium">
                {t('galleryHarvestDesc', 'Reaping the rewards of disciplined agronomic practices.')}
              </p>
            </div>
          </div>

          {/* Photo 5: Store Fulfillment */}
          <div className="group relative h-64 sm:h-72 rounded-3xl overflow-hidden shadow-md">
            <img
              src="https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&w=800&q=80"
              alt="Agri store partner fulfilling certified seeds and agricultural supplies"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent flex flex-col justify-end p-5 text-white">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                {t('galleryFulfillment', 'Store Fulfillment')}
              </span>
              <p className="text-xs text-stone-200 mt-1 font-medium">
                {t('galleryFulfillmentDesc', 'Agri Store Partners preparing genuine inputs.')}
              </p>
            </div>

          </div>

          {/* Photo 6: Mobile Technology in Field */}
          <div className="group relative h-64 sm:h-72 rounded-3xl overflow-hidden shadow-md">
            <img
              src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80"
              alt="Smart agricultural technology and data across green farmland"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent flex flex-col justify-end p-5 text-white">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wide">
                {t('gallerySmartAgri', 'Smart Technology')}
              </span>
              <p className="text-xs text-stone-200 mt-1 font-medium">
                {t('gallerySmartAgriDesc', 'Farmers leveraging mobile AI tools right in the field.')}
              </p>
            </div>
          </div>

        </div>
      </section>


      {/* ========================================================================= */}
      {/* 5. SMART AGRICULTURE: Technology That Works With Farmers */}
      {/* ========================================================================= */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Intelligent Agriculture
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-slate-900 dark:text-white">
            {t('techWorksTitle', 'Technology That Works With Farmers')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('techWorksSub', 'Practical, honest AI and data services built for real field conditions.')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 1: AI Crop Diagnosis */}
          <Link
            to="/ai/crop-disease"
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-700 transition-all shadow-sm group hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-300">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🤖 {t('techAiTitle', 'AI Crop Diagnosis')}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {t('techAiDesc', 'Scan crop leaves and receive model-based analysis.')}
                </p>
              </div>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400">
              <span>Scan Leaf Now</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 2: Live Weather */}
          <Link
            to="/dashboard"
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-sm group hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
                <CloudSun className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🌦️ {t('techWeatherTitle', 'Live Weather')}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {t('techWeatherDesc', 'Get weather based on the farmer\'s current location.')}
                </p>
              </div>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>View Weather</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 3: Market Intelligence */}
          <Link
            to="/dashboard"
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between hover:border-amber-300 dark:hover:border-amber-700 transition-all shadow-sm group hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-300">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>📈 {t('techMarketTitle', 'Market Intelligence')}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {t('techMarketDesc', 'Understand actual mandi market observations and trends.')}
                </p>
              </div>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
              <span>View Mandi Rates</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 4: Crop Advisor */}
          <Link
            to="/dashboard"
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-sm group hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🌱 {t('techAdvisorTitle', 'Crop Advisor')}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {t('techAdvisorDesc', 'Combine farmer-selected soil, location, season and weather.')}
                </p>
              </div>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
              <span>Open Advisor</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>
      </section>


      {/* ========================================================================= */}
      {/* 6. MARKETPLACE PREVIEW: Real Database Products */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Direct Agricultural Inputs
            </span>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
              {t('everythingFarmNeedsTitle', 'Everything Your Farm Needs')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('everythingFarmNeedsSub', 'Certified seeds, bio-pesticides, and crop protection from trusted local stores.')}
            </p>

          </div>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 whitespace-nowrap"
          >
            <span>{t('viewMarketplaceLink', 'View Marketplace →')}</span>
          </Link>
        </div>

        {isLoadingProducts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3">
                <div className="h-44 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => {
              const prodId = product.id || product._id;
              const isAdding = addingId === prodId;
              const isAdded = addedSuccessId === prodId;

              return (
                <div
                  key={prodId}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-sm group hover:-translate-y-1"
                >
                  <div className="space-y-3">
                    <div className="relative h-44 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={product.images?.[0] || 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=600&q=80'}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 backdrop-blur-md shadow-xs">
                        {product.category}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-heading font-bold text-slate-900 dark:text-white line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {product.brand || 'Krishi Certified'} • {product.unit || 'Unit'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Price</span>
                      <span className="text-base font-heading font-black text-emerald-600 dark:text-emerald-400">
                        ₹{product.price.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={isAdding || product.stock <= 0}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-heading font-bold text-xs shadow-sm transition-all"
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{t('addToCartBtn', 'Add to Cart')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500">Products are currently loading from store catalog.</p>
          </div>
        )}
      </section>


      {/* ========================================================================= */}
      {/* 7. LIVE DATA DUAL SECTION: Mandi Spot Rates & Live Weather */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left: Mandi Prices Preview */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 block">
                  APMC Spot Rates
                </span>
                <h3 className="text-lg sm:text-xl font-heading font-extrabold text-slate-900 dark:text-white">
                  {t('knowYourMarketTitle', 'Know Your Market')}
                </h3>
              </div>
              <Link
                to="/dashboard"
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                View Mandi Rates →
              </Link>
            </div>

            {isLoadingMandi ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : mandiPrices.length > 0 ? (
              <div className="space-y-2.5">
                {mandiPrices.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">{item.commodity}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{item.market}, {item.district}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-black text-slate-900 dark:text-white block">
                        ₹{item.modalPrice} / Qtl
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        {item.priceDate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">Live market arrivals syncing from APMC network.</p>
            )}
          </div>

          {/* Right: Hyperlocal Weather Preview */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block">
                  Agro-Weather
                </span>
                <h3 className="text-lg sm:text-xl font-heading font-extrabold text-slate-900 dark:text-white">
                  {t('weatherForFarmTitle', 'Weather for Your Farm')}
                </h3>
              </div>
              <Link
                to="/dashboard"
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Detailed Weather →
              </Link>
            </div>

            {isLoadingWeather ? (
              <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ) : liveWeather ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-emerald-950/40 border border-emerald-200/60 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                      Location: {liveWeather.location.city || liveWeather.location.state || 'India'}
                    </span>
                    <span className="text-3xl font-heading font-black text-slate-900 dark:text-white mt-1 block">
                      {liveWeather.temperature}°C
                    </span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                      {liveWeather.condition}
                    </span>
                  </div>
                  <CloudSun className="w-14 h-14 text-emerald-600 dark:text-emerald-400 opacity-90" />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <Droplets className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                    <span className="text-[10px] text-slate-400 block">Humidity</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{liveWeather.humidity}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <Wind className="w-4 h-4 text-teal-500 mx-auto mb-1" />
                    <span className="text-[10px] text-slate-400 block">Wind</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{liveWeather.windSpeed} km/h</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <Thermometer className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                    <span className="text-[10px] text-slate-400 block">Rain Chance</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{liveWeather.rainProbability}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">Fetching live weather telemetry.</p>
            )}
          </div>

        </div>
      </section>


      {/* ========================================================================= */}
      {/* 8. GOVERNMENT SUPPORT & SCHEMES PREVIEW */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Institutional Welfare
            </span>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
              {t('discoverGovtTitle', 'Discover Farmer Support')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('discoverGovtSub', 'Explore verified Central and State agricultural welfare and subsidy schemes.')}
            </p>
          </div>
          <Link
            to="/schemes"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline whitespace-nowrap"
          >
            <span>{t('viewGovtSchemesLink', 'Explore Government Schemes →')}</span>
          </Link>
        </div>

        {isLoadingSchemes ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-36 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : schemes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {schemes.map((s) => (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-sm group"
              >
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {s.category}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">{s.state}</span>
                  </div>
                  <h3 className="text-sm font-heading font-bold text-slate-900 dark:text-white line-clamp-1">
                    {s.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {s.description}
                  </p>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 line-clamp-1 max-w-[180px]">{s.benefits}</span>
                  <Link
                    to="/schemes"
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform shrink-0"
                  >
                    <span>View Scheme</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>


      {/* ========================================================================= */}
      {/* 9. CONNECTED AGRICULTURAL DELIVERY WORKFLOW TIMELINE */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="max-w-2xl space-y-2 mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Three-Party Network
            </span>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold">
              {t('deliveryWorkflowTitle', 'Connected Agricultural Delivery')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              {t('deliveryWorkflowSub', 'A transparent supply chain connecting farmers, retail stores, and delivery personnel.')}
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center space-y-1.5">
              <span className="text-xl">🌾</span>
              <h4 className="text-xs font-bold text-white uppercase">1. Farmer</h4>
              <p className="text-[11px] text-slate-300">Places Order for Seeds & Bio-Inputs</p>
            </div>


            <div className="hidden md:flex items-center justify-center text-emerald-400">
              <ArrowRight className="w-6 h-6" />
            </div>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center space-y-1.5">
              <span className="text-xl">🏪</span>
              <h4 className="text-xs font-bold text-white uppercase">2. Store Partner</h4>
              <p className="text-[11px] text-slate-300">Accepts & Assigns Delivery Partner</p>
            </div>


            <div className="hidden md:flex items-center justify-center text-emerald-400">
              <ArrowRight className="w-6 h-6" />
            </div>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center space-y-1.5">
              <span className="text-xl">🚚</span>
              <h4 className="text-xs font-bold text-white uppercase">3. Delivery Partner</h4>
              <p className="text-[11px] text-slate-300">Picks Up & Delivers to Farmer's Farm</p>
            </div>

          </div>
        </div>
      </section>


      {/* ========================================================================= */}
      {/* 10. FINAL CALL TO ACTION: "Let's Build a Smarter Agricultural Future." */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-14 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-green-600 to-emerald-500 flex items-center justify-center text-white mx-auto shadow-md shadow-emerald-600/30">
            <Sprout className="w-8 h-8" />
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-4xl font-heading font-extrabold text-slate-900 dark:text-white">
              {t('finalCtaTitle', 'Let\'s Build a Smarter Agricultural Future.')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {t('finalCtaSub', 'One platform connecting farmers, agricultural businesses and delivery partners.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-sm shadow-md shadow-emerald-600/20 transition-all hover:-translate-y-0.5"
            >
              <span>{t('joinAgroMitraBtn', 'Join AgroMitra')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-heading font-bold text-sm transition-all"
            >
              <span>{t('explorePlatformBtn', 'Explore the Platform')}</span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};
