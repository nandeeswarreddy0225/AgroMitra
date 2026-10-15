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
  Building2,
  HeartHandshake,
  ShieldCheck,
  Leaf,
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
import { AgroMitraLogo } from '../components/common/AgroMitraLogo';

// Safe image fallback helper
const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackSrc: string = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80'
) => {
  const target = e.currentTarget;
  if (target.src !== fallbackSrc) {
    target.src = fallbackSrc;
  }
};

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
        console.warn('Could not fetch homepage mandi prices:', err);
      } finally {
        setIsLoadingMandi(false);
      }
    };

    // 4. Fetch Real Government Schemes from API
    const fetchSchemes = async () => {
      try {
        const res = await getSchemesApi({});
        if (res.success && Array.isArray(res.schemes)) {
          setSchemes(res.schemes.slice(0, 3));
        }
      } catch (err) {
        console.warn('Could not fetch homepage schemes:', err);
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
      {/* 1. HERO SECTION: Modern Indian Agriculture with Animated Alive Elements  */}
      {/* ========================================================================= */}
      <section className="relative min-h-[620px] lg:min-h-[700px] flex items-center bg-stone-950 text-white overflow-hidden rounded-3xl mx-2 sm:mx-4 lg:mx-8 mt-3 shadow-2xl border border-emerald-950">
        {/* Real Indian Agriculture Hero Photograph with Ken-Burns Motion */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1920&q=80"
            alt="Indian farmer inspecting lush green agricultural crop field at golden sunrise"
            onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1920&q=80')}
            className="w-full h-full object-cover object-center animate-ken-burns opacity-75"
          />
          {/* Multi-stop emerald & forest-green gradient overlay for text readability & contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-stone-950/90 to-emerald-950/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-transparent to-stone-950/30" />
          {/* Subtle animated ambient light glow */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse-glow pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl animate-pulse-glow pointer-events-none" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 lg:py-24 w-full">
          <div className="max-w-3xl space-y-7">
            
            {/* Live Network & Brand Pill with Glowing Green Beacon */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-xs font-bold tracking-wide shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{t('liveNetworkPill', 'Live Network Active • APMC + Weather Synced')}</span>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold">
                <AgroMitraLogo variant="mark" size="sm" />
                <span>{t('heroBadge', 'Smart Farming • High-Tech Agri Platform')}</span>
              </div>
            </div>

            {/* Main Headline: Grow Smarter. Harvest Better. */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight leading-[1.14] text-white">
              {t('heroTitleMain', 'Grow Smarter.')}<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-300">
                {t('heroTitleHighlight', 'Harvest Better.')}
              </span>
            </h1>

            {/* Supporting Platform Description */}
            <p className="text-base sm:text-lg text-stone-200 leading-relaxed max-w-2xl font-normal">
              {t(
                'heroDescription',
                'AgroMitra connects farmers, verified agricultural input retailers, APMC mandi yards, and logistics partners into one unified digital ecosystem. Empowering rural agriculture with computer vision disease diagnosis, transparent spot market pricing, and doorstep delivery.'
              )}
            </p>

            {/* Live Telemetry Ticker (Real Live Weather & APMC Indicators) */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {liveWeather && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-emerald-400/25 text-emerald-300 text-xs font-medium">
                  <CloudSun className="w-4 h-4 text-amber-300" />
                  <span>
                    {liveWeather.location.city || liveWeather.location.state || 'India'}:{' '}
                    <strong className="text-white font-bold">{liveWeather.temperature}°C</strong> ({liveWeather.condition})
                  </span>
                </div>
              )}

              {mandiPrices.length > 0 && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-amber-400/25 text-amber-300 text-xs font-medium">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span>
                    {mandiPrices[0].commodity}:{' '}
                    <strong className="text-white font-bold">₹{mandiPrices[0].modalPrice}/Qtl</strong> ({mandiPrices[0].market})
                  </span>
                </div>
              )}
            </div>

            {/* Primary Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-heading font-bold text-sm shadow-xl shadow-emerald-950/50 hover:shadow-emerald-900/70 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <Store className="w-4 h-4 text-emerald-200" />
                <span>{t('heroExploreMarket', 'Explore Marketplace')}</span>
                <ArrowRight className="w-4 h-4 text-emerald-200" />
              </Link>

              <Link
                to="/ai/crop-disease"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 text-white font-heading font-bold text-sm transition-all hover:-translate-y-0.5 shadow-md active:translate-y-0"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
                <span>{t('heroScanCrop', 'Scan Your Crop')}</span>
              </Link>
            </div>

            {/* Trust Indicators Bar */}
            <div className="pt-8 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
                  <Leaf className="w-4 h-4" />
                </div>
                <span>{t('trustCropAi', 'Smart Crop AI')}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span>{t('trustApmcSpot', 'APMC Spot Rates')}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-300 shrink-0">
                  <CloudSun className="w-4 h-4" />
                </div>
                <span>{t('trustHyperlocalWeather', 'Hyperlocal Weather')}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-300 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>{t('trustGenuineInputs', '100% Genuine Inputs')}</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. PLATFORM FEATURES: 6 Core Capabilities with Real Photography & Direct CTAs */}
      {/* ========================================================================= */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            {t('corePlatformSuper', 'Intelligent Agro-Tech')}
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-slate-900 dark:text-white">
            {t('corePlatformTitle', 'Core Platform Capabilities')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('corePlatformSubtitle', 'Everything your agricultural operation requires — from real-time field diagnostics to direct marketplace commerce.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          
          {/* Feature 1: AI Crop Disease Scanner */}
          <div className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-emerald-400 dark:hover:border-emerald-600 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1">
            <div>
              <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80"
                  alt="Farmer inspecting crop foliage for plant pathology"
                  onError={(e) => handleImageError(e)}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-sm flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('cardScannerTag', 'Computer Vision')}</span>
                </span>
              </div>
              <div className="p-6 space-y-2">
                <h3 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {t('cardScannerTitle', 'AI Crop Disease Scanner')}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t('cardScannerDesc', 'Capture or upload leaf specimens for instantaneous botanical identification and foliar disease diagnosis, paired with verified curative and organic treatment recommendations.')}
                </p>
              </div>
            </div>
            <div className="p-6 pt-0">
              <Link
                to="/ai/crop-disease"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-600 text-emerald-800 dark:text-emerald-300 hover:text-white font-heading font-bold text-xs transition-all"
              >
                <span>{t('cardScannerBtn', 'Launch Scanner')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Feature 2: Agricultural Marketplace */}
          <div className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-emerald-400 dark:hover:border-emerald-600 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1">
            <div>
              <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80"
                  alt="Agricultural seeds and fertilizers at local verified supply store"
                  onError={(e) => handleImageError(e)}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-600 text-white shadow-sm flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5" />
                  <span>{t('cardMarketTag', 'Direct Inputs')}</span>
                </span>
              </div>
              <div className="p-6 space-y-2">
                <h3 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {t('cardMarketTitle', 'Agricultural Marketplace')}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t('cardMarketDesc', 'Browse verified certified seeds, bio-pesticides, organic nutrients, and farming tools listed by trusted local agricultural dealers with transparent pricing and live stock.')}
                </p>
              </div>
            </div>
            <div className="p-6 pt-0">
              <Link
                to="/marketplace"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-600 text-amber-800 dark:text-amber-300 hover:text-white font-heading font-bold text-xs transition-all"
              >
                <span>{t('cardMarketBtn', 'Browse Catalog')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Feature 3: Live Weather Information */}
          <div className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-emerald-400 dark:hover:border-emerald-600 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1">
            <div>
              <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=800&q=80"
                  alt="Sun breaking through clouds over farmland"
                  onError={(e) => handleImageError(e)}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal-600 text-white shadow-sm flex items-center gap-1.5">
                  <CloudSun className="w-3.5 h-3.5" />
                  <span>{t('cardWeatherTag', 'Hyperlocal Telemetry')}</span>
                </span>
              </div>
              <div className="p-6 space-y-2">
                <h3 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {t('cardWeatherTitle', 'Live Agro-Weather')}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t('cardWeatherDesc', "Real-time temperature, precipitation probability, humidity, and wind speed tailored to the farmer's GPS coordinates, enabling proactive irrigation and spraying decisions.")}
                </p>
              </div>
            </div>
            <div className="p-6 pt-0">
              <Link
                to="/dashboard"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-600 text-teal-800 dark:text-teal-300 hover:text-white font-heading font-bold text-xs transition-all"
              >
                <span>{t('cardWeatherBtn', 'View Live Weather')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Feature 4: APMC Mandi Spot Rates */}
          <div className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-emerald-400 dark:hover:border-emerald-600 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1">
            <div>
              <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80"
                  alt="Fresh farm produce at Indian agricultural APMC mandi"
                  onError={(e) => handleImageError(e)}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-600 text-white shadow-sm flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{t('cardMandiTag', 'Spot Transparency')}</span>
                </span>
              </div>
              <div className="p-6 space-y-2">
                <h3 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {t('cardMandiTitle', 'APMC Mandi Spot Prices')}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t('cardMandiDesc', 'Daily commodity modal, minimum, and maximum rates synchronized from authorized market yards across districts, ensuring fair price discovery for farmers.')}
                </p>
              </div>
            </div>
            <div className="p-6 pt-0">
              <Link
                to="/market/prices"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-600 text-indigo-800 dark:text-indigo-300 hover:text-white font-heading font-bold text-xs transition-all"
              >
                <span>{t('cardMandiBtn', 'Check Mandi Rates')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Feature 5: Government Welfare Schemes */}
          <div className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-emerald-400 dark:hover:border-emerald-600 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1">
            <div>
              <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80"
                  alt="Young green sprout growing in rich soil"
                  onError={(e) => handleImageError(e)}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-700 text-white shadow-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t('cardSchemesTag', 'Verified Subsidies')}</span>
                </span>
              </div>
              <div className="p-6 space-y-2">
                <h3 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {t('cardSchemesTitle', 'Government Schemes')}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t('cardSchemesDesc', 'Verified central and state agricultural subsidies, crop insurance eligibility, direct benefit transfer schemes, and application guidelines curated for Indian farmers.')}
                </p>
              </div>
            </div>
            <div className="p-6 pt-0">
              <Link
                to="/schemes"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-700 text-emerald-800 dark:text-emerald-300 hover:text-white font-heading font-bold text-xs transition-all"
              >
                <span>{t('cardSchemesBtn', 'Explore Schemes')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Feature 6: Farm Delivery Logistics */}
          <div className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-emerald-400 dark:hover:border-emerald-600 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1">
            <div>
              <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=800&q=80"
                  alt="Rural agricultural distribution and farm logistics"
                  onError={(e) => handleImageError(e)}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-600 text-white shadow-sm flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  <span>{t('cardDeliveryTag', 'Farm Dispatch')}</span>
                </span>
              </div>
              <div className="p-6 space-y-2">
                <h3 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {t('cardDeliveryTitle', 'Delivery Tracking')}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t('cardDeliveryDesc', 'End-to-end milestone tracking from local retailer acceptance to field delivery. Includes phone coordination and proof of delivery verification.')}
                </p>
              </div>
            </div>
            <div className="p-6 pt-0">
              <Link
                to={isAuthenticated ? '/orders' : '/login?role=FARMER'}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-600 text-blue-800 dark:text-blue-300 hover:text-white font-heading font-bold text-xs transition-all"
              >
                <span>{t('cardDeliveryBtn', 'Track Orders')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. USER PORTALS: 5 Distinct Role Cards with Strict RBAC Isolation */}
      {/* ========================================================================= */}
      <section id="portals" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            {t('portalsSuper', 'Dedicated Stakeholder Workspaces')}
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-slate-900 dark:text-white">
            {t('portalsTitle', 'Built for Every Pillar of Agriculture')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('portalsSubtitle', 'Specialized portals engineered specifically for farmers, retail store owners, agricultural partners, field logistics, and APMC yard managers.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          
          {/* Portal 1: FARMER */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-emerald-100 dark:border-emerald-950/80 p-6 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all space-y-5 hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                <Sprout className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {t('portalFarmerRole', 'Primary Producer')}
                </span>
                <h3 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white">
                  {t('portalFarmerTitle', 'Farmer')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('portalFarmerDesc', 'Smart tools for crop diagnostics, schemes & marketplace orders.')}
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /><span>{t('portalFarmerF1', 'AI Leaf Disease Scanner')}</span></li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /><span>{t('portalFarmerF2', 'APMC Mandi Spot Prices')}</span></li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /><span>{t('portalFarmerF3', 'Hyperlocal Weather Advisory')}</span></li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /><span>{t('portalFarmerF4', 'Direct Input Ordering')}</span></li>
              </ul>
            </div>

            <Link
              to={isAuthenticated && user?.role === 'FARMER' ? '/dashboard' : '/login?role=FARMER'}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs shadow-sm transition-all"
            >
              <span>{isAuthenticated && user?.role === 'FARMER' ? t('openDashboard', 'Open Dashboard') : t('portalFarmerSignIn', 'Farmer Sign In')}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Portal 2: SHOP OWNER */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-100 dark:border-amber-950/80 p-6 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all space-y-5 hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-300">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {t('portalShopRole', 'Retail Merchant')}
                </span>
                <h3 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white">
                  {t('portalShopTitle', 'Shop Owner')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('portalShopDesc', 'Manage physical store inventory, orders, and customer billing.')}
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" /><span>{t('portalShopF1', 'Catalog & Live Stock')}</span></li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" /><span>{t('portalShopF2', 'Order Processing & Pickup')}</span></li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" /><span>{t('portalShopF3', 'Store UPI QR Integration')}</span></li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" /><span>{t('portalShopF4', 'Delivery Assignment')}</span></li>
              </ul>
            </div>

            <Link
              to={isAuthenticated && user?.role === 'SHOP_OWNER' ? '/shop/products' : '/login?role=SHOP_OWNER'}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-heading font-bold text-xs shadow-sm transition-all"
            >
              <span>{isAuthenticated && user?.role === 'SHOP_OWNER' ? t('openDashboard', 'Open Dashboard') : t('portalShopSignIn', 'Shop Sign In')}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Portal 3: AGRI PARTNER */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-teal-100 dark:border-teal-950/80 p-6 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all space-y-5 hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-300">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  {t('portalPartnerRole', 'Ecosystem Services')}
                </span>
                <h3 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white">
                  {t('portalPartnerTitle', 'Agri Partner')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('portalPartnerDesc', 'Institutional distributors, advisors, and corporate partners.')}
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" /><span>{t('portalPartnerF1', 'Bulk Input Distribution')}</span></li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" /><span>{t('portalPartnerF2', 'Partner Advisory Ops')}</span></li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" /><span>{t('portalPartnerF3', 'Supply Chain Fulfillment')}</span></li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" /><span>{t('portalPartnerF4', 'Partner Portal Analytics')}</span></li>
              </ul>
            </div>

            <Link
              to={isAuthenticated && user?.role === 'AGRI_PARTNER' ? '/shop/products' : '/login?role=AGRI_PARTNER'}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-heading font-bold text-xs shadow-sm transition-all"
            >
              <span>{isAuthenticated && user?.role === 'AGRI_PARTNER' ? t('openDashboard', 'Open Dashboard') : t('portalPartnerSignIn', 'Partner Sign In')}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Portal 4: DELIVERY BOY */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-blue-100 dark:border-blue-950/80 p-6 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all space-y-5 hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-300">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {t('portalDeliveryRole', 'Field Logistics')}
                </span>
                <h3 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white">
                  {t('portalDeliveryTitle', 'Delivery Boy')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('portalDeliveryDesc', 'Accept store pickups and deliver agricultural supplies to farms.')}
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" /><span>{t('portalDeliveryF1', 'Instant Order Notifications')}</span></li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" /><span>{t('portalDeliveryF2', 'Pickup & Drop Routing')}</span></li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" /><span>{t('portalDeliveryF3', 'Delivery Status Milestone')}</span></li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" /><span>{t('portalDeliveryF4', 'Delivery History Logs')}</span></li>
              </ul>
            </div>

            <Link
              to={isAuthenticated && user?.role === 'DELIVERY_BOY' ? '/delivery/dashboard' : '/login?role=DELIVERY_BOY'}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-xs shadow-sm transition-all"
            >
              <span>{isAuthenticated && user?.role === 'DELIVERY_BOY' ? t('openDashboard', 'Open Dashboard') : t('portalDeliverySignIn', 'Rider Sign In')}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Portal 5: MARKET OWNER */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-indigo-100 dark:border-indigo-950/80 p-6 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all space-y-5 hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {t('portalMandiRole', 'APMC Mandi')}
                </span>
                <h3 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white">
                  {t('portalMandiTitle', 'Market Owner')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('portalMandiDesc', 'Publish daily arrivals, commodity spot rates, and yard updates.')}
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" /><span>{t('portalMandiF1', 'Daily Price Publishing')}</span></li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" /><span>{t('portalMandiF2', 'Min/Max Modal Rates')}</span></li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" /><span>{t('portalMandiF3', 'Mandi Profile & Hours')}</span></li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" /><span>{t('portalMandiF4', 'Arrival Volume Logs')}</span></li>
              </ul>
            </div>

            <Link
              to={isAuthenticated && user?.role === 'MARKET_OWNER' ? '/market-owner/dashboard' : '/login?role=MARKET_OWNER'}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-heading font-bold text-xs shadow-sm transition-all"
            >
              <span>{isAuthenticated && user?.role === 'MARKET_OWNER' ? t('openDashboard', 'Open Dashboard') : t('portalMandiSignIn', 'Mandi Sign In')}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FROM SEED TO MARKET: 4 Visual Lifecycle Steps */}
      {/* ========================================================================= */}
      <section id="ecosystem" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            {t('lifecycleSuper', 'Lifecycle Ecosystem')}
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-slate-900 dark:text-white">
            {t('lifecycleTitle', 'From Seed to Market')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('lifecycleSubtitle', 'An integrated agricultural workflow supporting every stage of seasonal cultivation.')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Step 01: PLAN */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-sm group hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 group-hover:scale-110 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              <span className="text-2xl font-mono font-black text-slate-300 dark:text-slate-700">01</span>
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                {t('step01Plan', '🌱 PLAN')}
              </div>
              <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white mt-1">
                {t('step01Title', 'Crop & Soil Guidance')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {t('step01Desc', 'Determine suitable seasonal crops based on soil morphology, geographic zone, and historical weather patterns.')}
              </p>
            </div>
          </div>

          {/* Step 02: GROW */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 hover:border-purple-300 dark:hover:border-purple-700 transition-all shadow-sm group hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-700 dark:text-purple-300 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-2xl font-mono font-black text-slate-300 dark:text-slate-700">02</span>
            </div>
            <div>
              <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                {t('step02Grow', '🌿 GROW')}
              </div>
              <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white mt-1">
                {t('step02Title', 'Weather & AI Protection')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {t('step02Desc', 'Monitor field humidity, incoming rain showers, and run mobile leaf scans to arrest fungal and bacterial blights early.')}
              </p>
            </div>
          </div>

          {/* Step 03: BUY */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 hover:border-amber-300 dark:hover:border-amber-700 transition-all shadow-sm group hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-300 group-hover:scale-110 transition-transform">
                <Store className="w-6 h-6" />
              </div>
              <span className="text-2xl font-mono font-black text-slate-300 dark:text-slate-700">03</span>
            </div>
            <div>
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                {t('step03Buy', '🛒 BUY')}
              </div>
              <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white mt-1">
                {t('step03Title', 'Certified Farm Inputs')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {t('step03Desc', 'Order genuine fertilizers, micronutrients, certified seeds, and bio-protection directly from local dealers.')}
              </p>
            </div>
          </div>

          {/* Step 04: DELIVER */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-sm group hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-300 group-hover:scale-110 transition-transform">
                <Truck className="w-6 h-6" />
              </div>
              <span className="text-2xl font-mono font-black text-slate-300 dark:text-slate-700">04</span>
            </div>
            <div>
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                {t('step04Deliver', '🚚 DELIVER')}
              </div>
              <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white mt-1">
                {t('step04Title', 'Farm-to-Gate Delivery')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {t('step04Desc', 'Dedicated delivery riders transport agricultural bags and products directly to farm gates without disrupting labor.')}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FEATURED PRODUCTS: Real Database Products with Cart Integration */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              {t('featuredSuper', 'Direct Input Marketplace')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
              {t('featuredTitle', 'Essential Inputs for Your Farm')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('featuredSubtitle', 'Certified seeds, bio-pesticides, and crop care formulations from verified local agricultural store partners.')}
            </p>
          </div>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 whitespace-nowrap"
          >
            <span>{t('featuredExploreCatalog', 'Explore Full Catalog →')}</span>
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
                        onError={(e) => handleImageError(e, 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=600&q=80')}
                        loading="lazy"
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
                        {product.brand || 'Krishi Certified'} • {product.unit || 'Standard Unit'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        {t('featuredPriceLabel', 'Price')}
                      </span>
                      <span className="text-base font-heading font-black text-emerald-600 dark:text-emerald-400">
                        ₹{Number(product.price).toFixed(2)}
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
                          <span>{t('featuredAdded', 'Added')}</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{t('featuredAddToCart', 'Add to Cart')}</span>
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
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('featuredEmpty', 'Verified agricultural products are syncing from store partners.')}
            </p>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 6. REAL-TIME DATA DUAL SECTION: APMC Mandi Spot Rates & Hyperlocal Weather */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left: Mandi Spot Rates */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 block">
                  {t('dualMandiSuper', 'APMC Daily Spot Rates')}
                </span>
                <h3 className="text-lg sm:text-xl font-heading font-extrabold text-slate-900 dark:text-white">
                  {t('dualMandiTitle', 'Market Transparency')}
                </h3>
              </div>
              <Link
                to="/market/prices"
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                {t('dualMandiViewAll', 'View All Mandi Rates →')}
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
                    className="p-3.5 rounded-2xl bg-stone-50 dark:bg-slate-800/60 border border-stone-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block text-sm">{item.commodity}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{item.market}, {item.district}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono font-black text-emerald-700 dark:text-emerald-400 block">
                        ₹{item.modalPrice} {t('dualMandiPerQtl', '/ Qtl')}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {item.priceDate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">
                {t('dualMandiEmpty', 'Live market arrivals syncing from national APMC network.')}
              </p>
            )}
          </div>

          {/* Right: Hyperlocal Weather Telemetry */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block">
                  {t('dualWeatherSuper', 'Field Agro-Weather')}
                </span>
                <h3 className="text-lg sm:text-xl font-heading font-extrabold text-slate-900 dark:text-white">
                  {t('dualWeatherTitle', 'Field Conditions & Advisory')}
                </h3>
              </div>
              <Link
                to="/dashboard"
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {t('dualWeatherDetail', 'Detailed Weather →')}
              </Link>
            </div>

            {isLoadingWeather ? (
              <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ) : liveWeather ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-50 via-teal-50 to-stone-50 dark:from-slate-800 dark:to-emerald-950/40 border border-emerald-200/60 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                      {t('dualWeatherLocation', 'Location:')} {liveWeather.location.city || liveWeather.location.state || 'India'}
                    </span>
                    <span className="text-3xl font-heading font-black text-slate-900 dark:text-white mt-1 block">
                      {liveWeather.temperature}°C
                    </span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                      {liveWeather.condition}
                    </span>
                  </div>
                  <CloudSun className="w-14 h-14 text-emerald-600 dark:text-emerald-400 opacity-90 animate-float" />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <Droplets className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                    <span className="text-[10px] text-slate-400 block">{t('dualWeatherHumidity', 'Humidity')}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{liveWeather.humidity}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <Wind className="w-4 h-4 text-teal-500 mx-auto mb-1" />
                    <span className="text-[10px] text-slate-400 block">{t('dualWeatherWind', 'Wind')}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{liveWeather.windSpeed} km/h</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <Thermometer className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                    <span className="text-[10px] text-slate-400 block">{t('dualWeatherRainChance', 'Rain Chance')}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{liveWeather.rainProbability}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">
                {t('dualWeatherFetching', 'Fetching live weather telemetry.')}
              </p>
            )}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. GOVERNMENT WELFARE SCHEMES: Central & State Subsidies */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              {t('schemesSuper', 'Institutional Welfare')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
              {t('schemesSectionTitle', 'Farmer Support & Welfare Schemes')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('schemesSectionSubtitle', 'Verified Central and State agricultural subsidy programs, equipment incentives, and financial welfare.')}
            </p>
          </div>
          <Link
            to="/schemes"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline whitespace-nowrap"
          >
            <span>{t('schemesViewAll', 'Explore All Schemes →')}</span>
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
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-sm group hover:-translate-y-1"
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
                    <span>{t('schemesViewDetails', 'View Details')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* ========================================================================= */}
      {/* 8. VISUAL TRIBUTE: Life Behind Every Harvest (Real Photography Gallery) */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            {t('tributeSuper', 'Field Photography')}
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-slate-900 dark:text-white">
            {t('tributeTitle', 'Life Behind Every Harvest')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('tributeSubtitle', 'Honoring the resilience, dedication, and agronomy driving Indian agricultural fields forward every day.')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Photo 1: Sowing */}
          <div className="group relative h-64 sm:h-72 rounded-3xl overflow-hidden shadow-md hover:-translate-y-1 transition-all">
            <img
              src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80"
              alt="Indian farmer preparing soil and sowing crops in rich agricultural ground"
              onError={(e) => handleImageError(e)}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent flex flex-col justify-end p-5 text-white">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                {t('tributeCaption1Title', 'Precision Sowing')}
              </span>
              <p className="text-xs text-stone-200 mt-1 font-medium">
                {t('tributeCaption1Desc', 'Early morning field preparation and seedbed planning.')}
              </p>
            </div>
          </div>

          {/* Photo 2: Water Irrigation */}
          <div className="group relative h-64 sm:h-72 rounded-3xl overflow-hidden shadow-md hover:-translate-y-1 transition-all">
            <img
              src="https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=800&q=80"
              alt="Farmer managing farm water irrigation channel"
              onError={(e) => handleImageError(e)}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent flex flex-col justify-end p-5 text-white">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                {t('tributeCaption2Title', 'Water Management')}
              </span>
              <p className="text-xs text-stone-200 mt-1 font-medium">
                {t('tributeCaption2Desc', 'Optimal hydration for maximum seasonal crop vitality.')}
              </p>
            </div>
          </div>

          {/* Photo 3: Foliar Health Inspection */}
          <div className="group relative h-64 sm:h-72 rounded-3xl overflow-hidden shadow-md hover:-translate-y-1 transition-all">
            <img
              src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80"
              alt="Farmer inspecting crop foliage and leaf pathology"
              onError={(e) => handleImageError(e)}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent flex flex-col justify-end p-5 text-white">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                {t('tributeCaption3Title', 'Crop Health Monitoring')}
              </span>
              <p className="text-xs text-stone-200 mt-1 font-medium">
                {t('tributeCaption3Desc', 'Proactive leaf scouting and diagnostic protection.')}
              </p>
            </div>
          </div>

          {/* Photo 4: Abundant Harvest */}
          <div className="group relative h-64 sm:h-72 rounded-3xl overflow-hidden shadow-md hover:-translate-y-1 transition-all">
            <img
              src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80"
              alt="Abundant agricultural grain harvest in rural field"
              onError={(e) => handleImageError(e)}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent flex flex-col justify-end p-5 text-white">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                {t('tributeCaption4Title', 'Abundant Harvest')}
              </span>
              <p className="text-xs text-stone-200 mt-1 font-medium">
                {t('tributeCaption4Desc', 'Reaping the rewards of disciplined agronomic practices.')}
              </p>
            </div>
          </div>

          {/* Photo 5: Retail Store Fulfillment */}
          <div className="group relative h-64 sm:h-72 rounded-3xl overflow-hidden shadow-md hover:-translate-y-1 transition-all">
            <img
              src="https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&w=800&q=80"
              alt="Agri store partner preparing genuine inputs and certified seeds"
              onError={(e) => handleImageError(e)}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent flex flex-col justify-end p-5 text-white">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wide">
                {t('tributeCaption5Title', 'Store Fulfillment')}
              </span>
              <p className="text-xs text-stone-200 mt-1 font-medium">
                {t('tributeCaption5Desc', 'Agri Store Partners preparing genuine farmer orders.')}
              </p>
            </div>
          </div>

          {/* Photo 6: Field Technology */}
          <div className="group relative h-64 sm:h-72 rounded-3xl overflow-hidden shadow-md hover:-translate-y-1 transition-all">
            <img
              src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80"
              alt="Green agricultural farmland with digital technology connection"
              onError={(e) => handleImageError(e)}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent flex flex-col justify-end p-5 text-white">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                {t('tributeCaption6Title', 'Digital Field Agriculture')}
              </span>
              <p className="text-xs text-stone-200 mt-1 font-medium">
                {t('tributeCaption6Desc', 'Farmers leveraging mobile computer vision directly in the field.')}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. THREE-PARTY LOGISTICS SUPPLY CHAIN TIMELINE */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-stone-950 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden border border-emerald-900/60">
          <div className="max-w-2xl space-y-2 mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              {t('supplySuper', 'Supply Chain Synergy')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold">
              {t('supplyTitle', 'Connected Agricultural Delivery')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              {t('supplySubtitle', 'A transparent digital supply chain linking farmers, registered retail stores, and field delivery riders.')}
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center mx-auto">
                <Sprout className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {t('supplyStep1Title', '1. Farmer Order')}
              </h4>
              <p className="text-[11px] text-slate-300">
                {t('supplyStep1Desc', 'Farmer places an order for certified inputs or curative products.')}
              </p>
            </div>

            <div className="hidden md:flex items-center justify-center text-emerald-400">
              <ArrowRight className="w-6 h-6" />
            </div>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center mx-auto">
                <Store className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {t('supplyStep2Title', '2. Store Dispatch')}
              </h4>
              <p className="text-[11px] text-slate-300">
                {t('supplyStep2Desc', 'Nearest eligible retail store verifies inventory and assigns rider.')}
              </p>
            </div>

            <div className="hidden md:flex items-center justify-center text-emerald-400">
              <ArrowRight className="w-6 h-6" />
            </div>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center mx-auto">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {t('supplyStep3Title', '3. Field Delivery')}
              </h4>
              <p className="text-[11px] text-slate-300">
                {t('supplyStep3Desc', 'Delivery partner picks up inputs and fulfills directly to the farm.')}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. FINAL CALL TO ACTION: Build a Smarter Agricultural Future */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-14 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-600/30">
            <Sprout className="w-8 h-8" />
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-4xl font-heading font-extrabold text-slate-900 dark:text-white">
              {t('ctaHeading', "Let's Build a Smarter Agricultural Future.")}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {t('ctaSubtitle', 'Join thousands of farmers, store retailers, mandi managers, and delivery partners collaborating on AgroMitra today.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-heading font-bold text-sm shadow-md shadow-emerald-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>{t('ctaJoinFree', 'Join AgroMitra Free')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-heading font-bold text-sm transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>{t('ctaExploreMarket', 'Explore Marketplace')}</span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};
