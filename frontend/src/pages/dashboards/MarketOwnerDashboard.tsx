import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Plus,
  Edit3,
  RefreshCw,
  Search,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  History,
  Clock,
  Check,
  X,
  Compass,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MarketOwnerNav } from '../market-owner/MarketOwnerNav';
import { AgroMitraLogo } from '../../components/common/AgroMitraLogo';
import { LiveWeatherCard } from '../../components/weather/LiveWeatherCard';
import {
  getMarketOwnerDashboardApi,
  addOrUpdateMarketPriceApi,
  getCommoditiesApi,
  createCommodityApi,
  updateCommodityApi,
  updateMyMarketApi,
} from '../../services/api';
import { lookupPincode } from '../../utils/pincode';
import {
  MarketOwnerDashboardData,
  MarketPriceRecord,
  Commodity,
  AddPricePayload,
} from '../../types/marketOwner';
import axios from 'axios';

export const MarketOwnerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const [dashboardData, setDashboardData] = useState<MarketOwnerDashboardData | null>(null);
  const [allCommodities, setAllCommodities] = useState<Commodity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchCommodity, setSearchCommodity] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Success / Error alerts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Price Modal State
  const [isPriceModalOpen, setIsPriceModalOpen] = useState<boolean>(false);
  const [selectedCommodityForPrice, setSelectedCommodityForPrice] = useState<Commodity | null>(null);
  const [minPriceInput, setMinPriceInput] = useState<string>('');
  const [maxPriceInput, setMaxPriceInput] = useState<string>('');
  const [modalPriceInput, setModalPriceInput] = useState<string>('');
  const [unitInput, setUnitInput] = useState<string>('quintal');
  const [notesInput, setNotesInput] = useState<string>('');
  const [isSavingPrice, setIsSavingPrice] = useState<boolean>(false);

  // Commodity Modal State
  const [isCommodityModalOpen, setIsCommodityModalOpen] = useState<boolean>(false);
  const [commodityNameInput, setCommodityNameInput] = useState<string>('');
  const [commodityCategoryInput, setCommodityCategoryInput] = useState<string>('Vegetables');
  const [commodityVarietyInput, setCommodityVarietyInput] = useState<string>('Standard / FAQ');
  const [commodityUnitInput, setCommodityUnitInput] = useState<string>('quintal');
  const [isSavingCommodity, setIsSavingCommodity] = useState<boolean>(false);

  // Market Location Edit Modal State
  const [isMarketEditOpen, setIsMarketEditOpen] = useState<boolean>(false);
  const [marketNameInput, setMarketNameInput] = useState<string>('');
  const [marketAddressInput, setMarketAddressInput] = useState<string>('');
  const [marketStateInput, setMarketStateInput] = useState<string>('');
  const [marketDistrictInput, setMarketDistrictInput] = useState<string>('');
  const [marketCityInput, setMarketCityInput] = useState<string>('');
  const [marketPincodeInput, setMarketPincodeInput] = useState<string>('');
  const [marketLatInput, setMarketLatInput] = useState<string>('');
  const [marketLonInput, setMarketLonInput] = useState<string>('');
  const [marketHoursInput, setMarketHoursInput] = useState<string>('');
  const [isSavingMarket, setIsSavingMarket] = useState<boolean>(false);
  const [isPincodeLoading, setIsPincodeLoading] = useState<boolean>(false);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);

  // Load Dashboard Data
  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const [dashRes, commRes] = await Promise.all([
        getMarketOwnerDashboardApi(),
        getCommoditiesApi({ includeInactive: true }),
      ]);

      if (dashRes.success) {
        setDashboardData(dashRes);
        if (dashRes.market) {
          setMarketNameInput(dashRes.market.name || '');
          setMarketAddressInput(dashRes.market.address || '');
          setMarketStateInput(dashRes.market.state || '');
          setMarketDistrictInput(dashRes.market.district || '');
          setMarketCityInput(dashRes.market.city || '');
          setMarketPincodeInput(dashRes.market.pincode || '');
          setMarketLatInput(dashRes.market.latitude ? String(dashRes.market.latitude) : '');
          setMarketLonInput(dashRes.market.longitude ? String(dashRes.market.longitude) : '');
          const hoursStr = typeof dashRes.market.operatingHours === 'object'
            ? `${dashRes.market.operatingHours.open || '06:00 AM'} - ${dashRes.market.operatingHours.close || '06:00 PM'}`
            : (dashRes.market.operatingHours || '06:00 AM - 06:00 PM');
          setMarketHoursInput(hoursStr);
        }
      }

      if (commRes.success && Array.isArray(commRes.commodities)) {
        setAllCommodities(commRes.commodities);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to load Market Owner dashboard.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Handle Pincode Auto-Fill for Market
  const handlePincodeChange = async (pin: string) => {
    setMarketPincodeInput(pin);
    const clean = pin.trim();
    if (clean.length === 6) {
      setIsPincodeLoading(true);
      const res = await lookupPincode(clean);
      setIsPincodeLoading(false);
      if (res.success) {
        if (res.state) setMarketStateInput(res.state);
        if (res.district) setMarketDistrictInput(res.district);
        if (res.city) setMarketCityInput(res.city);
        setSuccessMsg(`Location detected from Pincode: ${res.city || res.district}, ${res.state}`);
      }
    }
  };

  // Handle GPS Auto-Detect for Market
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        setMarketLatInput(String(Number(pos.coords.latitude.toFixed(5))));
        setMarketLonInput(String(Number(pos.coords.longitude.toFixed(5))));
        setSuccessMsg(`GPS Coordinates acquired: (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
      },
      (err) => {
        setIsDetectingGps(false);
        setErrorMsg(`GPS detection failed: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Open Daily Price Modal for a Commodity
  const openPriceModal = (commodity: Commodity, existingPrice?: MarketPriceRecord) => {
    setSelectedCommodityForPrice(commodity);
    if (existingPrice) {
      setMinPriceInput(String(existingPrice.minPrice));
      setMaxPriceInput(String(existingPrice.maxPrice));
      setModalPriceInput(String(existingPrice.modalPrice));
      setUnitInput(existingPrice.unit || commodity.defaultUnit || 'quintal');
      setNotesInput(existingPrice.notes || '');
    } else {
      setMinPriceInput('');
      setMaxPriceInput('');
      setModalPriceInput('');
      setUnitInput(commodity.defaultUnit || 'quintal');
      setNotesInput('');
    }
    setErrorMsg(null);
    setIsPriceModalOpen(true);
  };

  // Save Daily Price
  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommodityForPrice) return;

    const minP = Number(minPriceInput);
    const maxP = Number(maxPriceInput);
    const modalP = Number(modalPriceInput);

    if (isNaN(minP) || isNaN(maxP) || isNaN(modalP)) {
      setErrorMsg('Please enter valid numeric prices.');
      return;
    }

    if (minP > modalP || modalP > maxP) {
      setErrorMsg('Price range error: Minimum Price ≤ Modal Price ≤ Maximum Price.');
      return;
    }

    setIsSavingPrice(true);
    setErrorMsg(null);

    try {
      const payload: AddPricePayload = {
        commodityId: selectedCommodityForPrice._id || selectedCommodityForPrice.id,
        minPrice: minP,
        maxPrice: maxP,
        modalPrice: modalP,
        unit: unitInput,
        notes: notesInput.trim(),
      };

      const res = await addOrUpdateMarketPriceApi(payload);
      if (res.success) {
        setSuccessMsg(res.message);
        setIsPriceModalOpen(false);
        await loadDashboard(true);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to save daily market price.');
      }
    } finally {
      setIsSavingPrice(false);
    }
  };

  // Save New Commodity
  const handleSaveCommodity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commodityNameInput.trim()) {
      setErrorMsg('Commodity name is required.');
      return;
    }

    setIsSavingCommodity(true);
    setErrorMsg(null);

    try {
      const res = await createCommodityApi({
        name: commodityNameInput.trim(),
        category: commodityCategoryInput,
        variety: commodityVarietyInput.trim(),
        defaultUnit: commodityUnitInput,
      });

      if (res.success) {
        setSuccessMsg(`Commodity '${res.commodity.name}' added successfully.`);
        setIsCommodityModalOpen(false);
        setCommodityNameInput('');
        await loadDashboard(true);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to add new commodity.');
      }
    } finally {
      setIsSavingCommodity(false);
    }
  };

  // Toggle Commodity Active/Inactive
  const handleToggleCommodity = async (commodity: Commodity) => {
    try {
      const id = commodity._id || commodity.id;
      const res = await updateCommodityApi(id, { isActive: !commodity.isActive });
      if (res.success) {
        setSuccessMsg(`Commodity '${commodity.name}' is now ${!commodity.isActive ? 'Active' : 'Disabled'}.`);
        await loadDashboard(true);
      }
    } catch (err: unknown) {
      setErrorMsg('Failed to update commodity status.');
    }
  };

  // Save Market Location
  const handleSaveMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketNameInput.trim() || !marketStateInput.trim() || !marketDistrictInput.trim()) {
      setErrorMsg('Market name, state, and district are required.');
      return;
    }

    setIsSavingMarket(true);
    setErrorMsg(null);

    try {
      const res = await updateMyMarketApi({
        name: marketNameInput.trim(),
        address: marketAddressInput.trim(),
        state: marketStateInput.trim(),
        district: marketDistrictInput.trim(),
        city: marketCityInput.trim() || marketDistrictInput.trim(),
        pincode: marketPincodeInput.trim(),
        latitude: marketLatInput ? parseFloat(marketLatInput) : undefined,
        longitude: marketLonInput ? parseFloat(marketLonInput) : undefined,
        operatingHours: marketHoursInput.trim(),
      });

      if (res.success) {
        setSuccessMsg('Market details updated successfully.');
        setIsMarketEditOpen(false);
        await loadDashboard(true);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to update market profile.');
      }
    } finally {
      setIsSavingMarket(false);
    }
  };

  // Filter commodities
  const filteredCommodities = allCommodities.filter((c) => {
    const matchCategory = selectedCategory === 'ALL' || c.category === selectedCategory;
    const matchSearch =
      !searchCommodity ||
      c.name.toLowerCase().includes(searchCommodity.toLowerCase()) ||
      c.category.toLowerCase().includes(searchCommodity.toLowerCase());
    return matchCategory && matchSearch;
  });

  const categoriesList = ['ALL', 'Cereals', 'Pulses', 'Oilseeds', 'Vegetables', 'Fruits', 'Spices', 'Commercial / Cash Crops'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Sub-Navigation */}
      <MarketOwnerNav
        marketName={dashboardData?.market?.name}
        marketDistrict={dashboardData?.market?.district}
        marketState={dashboardData?.market?.state}
      />

      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-4">
          <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <AgroMitraLogo variant="mark" size="lg" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                APMC Mandi & Agricultural Market Intelligence
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
              Market Owner Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Welcome, <strong className="text-slate-800 dark:text-slate-200">{user?.name}</strong> •{' '}
              {dashboardData?.market?.name || 'Authorized APMC Mandi'} ({dashboardData?.market?.district}, {dashboardData?.market?.state})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsMarketEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
          >
            <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Market Profile</span>
          </button>
          <button
            onClick={() => loadDashboard(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all border border-rose-200 dark:border-rose-800"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold text-emerald-700">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-xs sm:text-sm text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="font-bold text-rose-700">✕</button>
        </div>
      )}

      {/* 2. Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Commodities */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Commodities</span>
            <h3 className="text-2xl font-heading font-black text-slate-900 dark:text-white">
              {allCommodities.filter((c) => c.isActive).length}
            </h3>
            <p className="text-[11px] text-slate-500">Active catalog items</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Updated Today */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Updated Today</span>
            <h3 className="text-2xl font-heading font-black text-slate-900 dark:text-white">
              {dashboardData?.updatedTodayCount || 0}
            </h3>
            <p className="text-[11px] text-slate-500">
              {dashboardData?.todayPrices[0]?.updatedTime ? `Latest at ${dashboardData.todayPrices[0].updatedTime}` : 'Ready for daily quotes'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Updates */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wide">Pending Quotes</span>
            <h3 className="text-2xl font-heading font-black text-slate-900 dark:text-white">
              {dashboardData?.pendingTodayCount || 0}
            </h3>
            <p className="text-[11px] text-slate-500">Unpublished for {dashboardData?.todayDate}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Market Status */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wide">Authorized Mandi</span>
            <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
              {dashboardData?.market?.name || 'APMC Yard'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {typeof dashboardData?.market?.operatingHours === 'object'
                ? `${dashboardData.market.operatingHours.open || '06:00 AM'} - ${dashboardData.market.operatingHours.close || '06:00 PM'}`
                : (dashboardData?.market?.operatingHours || 'Active Trading')}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Market Information & Quick Stats Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 font-heading font-bold text-base text-slate-900 dark:text-white">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <span>Mandi Information & Coordinates</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Mandi Code: {dashboardData?.market?.marketCode || 'APMC-REGIONAL'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 font-bold uppercase tracking-wider block">Address</span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{dashboardData?.market?.address || 'APMC Market Yard'}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 font-bold uppercase tracking-wider block">District & State</span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {dashboardData?.market?.district}, {dashboardData?.market?.state} (PIN: {dashboardData?.market?.pincode})
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 font-bold uppercase tracking-wider block">GPS Coordinates</span>
            <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              {dashboardData?.market?.latitude && dashboardData?.market?.longitude
                ? `${dashboardData.market.latitude}°, ${dashboardData.market.longitude}°`
                : 'Not Set'}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 font-bold uppercase tracking-wider block">Trading Hours</span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {typeof dashboardData?.market?.operatingHours === 'object'
                ? `${dashboardData.market.operatingHours.open || '06:00 AM'} - ${dashboardData.market.operatingHours.close || '06:00 PM'}`
                : (dashboardData?.market?.operatingHours || '06:00 AM - 06:00 PM')}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Mandi Yard Weather & Farm Advisory */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Authorized Mandi Real-Time Weather & Advisory
          </span>
        </div>
        <LiveWeatherCard
          initialCity={dashboardData?.market?.district || dashboardData?.market?.city}
          initialState={dashboardData?.market?.state}
        />
      </div>

      {/* 5. Daily Market Price Management Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>Daily Market Price Management</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Update daily wholesale commodity auction rates for {dashboardData?.todayDate}. Changes sync instantly to farmers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCommodityModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Commodity</span>
            </button>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search commodity (e.g. Paddy, Tomato, Chilli)..."
              value={searchCommodity}
              onChange={(e) => setSearchCommodity(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>{cat === 'ALL' ? 'All Categories' : cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Price Table */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <span className="text-xs">Loading commodities and prices...</span>
          </div>
        ) : filteredCommodities.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No commodities found. Click &quot;Add Commodity&quot; to add your first item.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase">
                  <th className="py-3 px-4">Commodity</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Today&apos;s Modal Price</th>
                  <th className="py-3 px-4">Min – Max Range</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCommodities.map((comm) => {
                  const commId = comm._id || comm.id;
                  const todayRecord = dashboardData?.todayPrices.find((p) => {
                    const cRef = typeof p.commodity === 'object' ? (p.commodity as any)._id : p.commodity;
                    return cRef?.toString() === commId?.toString() || p.commodityName === comm.name;
                  });

                  return (
                    <tr key={commId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{comm.icon || '🌾'}</span>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{comm.name}</div>
                            <div className="text-[10px] text-slate-400">{comm.variety || 'Standard / FAQ'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {comm.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {todayRecord ? (
                          <div className="font-heading font-black text-base text-slate-900 dark:text-white">
                            ₹{todayRecord.modalPrice.toLocaleString('en-IN')}
                            <span className="text-[10px] font-normal text-slate-400 ml-1">/{todayRecord.unit}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium italic">Pending Today</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {todayRecord ? (
                          <span>₹{todayRecord.minPrice.toLocaleString('en-IN')} – ₹{todayRecord.maxPrice.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono uppercase text-slate-500">
                        {todayRecord?.unit || comm.defaultUnit || 'quintal'}
                      </td>

                      <td className="py-3.5 px-4">
                        {todayRecord ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Updated today at {todayRecord.updatedTime}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-medium">Not updated today</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openPriceModal(comm, todayRecord)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{todayRecord ? 'Update Price' : 'Set Today Price'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Recent Price Update Audit Trail */}
      {dashboardData?.recentAudits && dashboardData.recentAudits.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              <span>Recent Price Update Audit Activity</span>
            </h3>
            <span className="text-xs text-slate-400">Immutable audit log</span>
          </div>

          <div className="space-y-2.5">
            {dashboardData.recentAudits.map((audit) => (
              <div
                key={audit.id || audit._id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{audit.commodityName}</span>
                    <span className="px-2 py-0.2 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-mono text-[10px]">
                      {audit.action}
                    </span>
                    {audit.isFlaggedSuspicious && (
                      <span className="px-2 py-0.2 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
                        Flagged Swing
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Modal: <strong>₹{audit.newPrice.modalPrice}</strong> (Min: ₹{audit.newPrice.minPrice}, Max: ₹{audit.newPrice.maxPrice} per {audit.newPrice.unit})
                    {audit.previousPrice?.modalPrice && (
                      <span className="text-slate-400 ml-1">
                        (Previous: ₹{audit.previousPrice.modalPrice})
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-400">
                  <span>{audit.priceDate} at {audit.updatedTime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: Daily Price Entry Modal */}
      {isPriceModalOpen && selectedCommodityForPrice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedCommodityForPrice.icon || '🌾'}</span>
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-slate-900 dark:text-white">
                    Set Daily Price: {selectedCommodityForPrice.name}
                  </h3>
                  <p className="text-xs text-slate-400">{dashboardData?.market?.name} • {dashboardData?.todayDate}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPriceModalOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrice} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Min Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 2800"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Modal Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 2950"
                    value={modalPriceInput}
                    onChange={(e) => setModalPriceInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Max Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 3100"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Unit of Measurement <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={unitInput}
                    onChange={(e) => setUnitInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="quintal">Quintal (100 kg)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="tonne">Tonne (1000 kg)</option>
                    <option value="bag">Bag (50 kg)</option>
                    <option value="crate">Crate (25 kg)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Notes / Quality Grade
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FAQ / Grade-A Moisture <12%"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPriceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPrice}
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md disabled:opacity-50"
                >
                  {isSavingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save & Publish Price</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Commodity Modal */}
      {isCommodityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-heading font-extrabold text-lg text-slate-900 dark:text-white">
                Add New Commodity
              </h3>
              <button
                onClick={() => setIsCommodityModalOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCommodity} className="space-y-4 text-xs sm:text-sm">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Commodity Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Red Chilli (Guntur Special)"
                  value={commodityNameInput}
                  onChange={(e) => setCommodityNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={commodityCategoryInput}
                    onChange={(e) => setCommodityCategoryInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {categoriesList.filter((c) => c !== 'ALL').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Default Unit
                  </label>
                  <select
                    value={commodityUnitInput}
                    onChange={(e) => setCommodityUnitInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="quintal">Quintal</option>
                    <option value="kg">kg</option>
                    <option value="tonne">Tonne</option>
                    <option value="bag">Bag</option>
                    <option value="crate">Crate</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Variety / Grade Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hybrid Local / Medium Staple"
                  value={commodityVarietyInput}
                  onChange={(e) => setCommodityVarietyInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCommodityModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCommodity}
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md disabled:opacity-50"
                >
                  {isSavingCommodity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Create Commodity</span>
                </button>
              </div>
            </form>

            {/* List of Existing Commodities to enable/disable */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                All Available Commodities ({allCommodities.length})
              </h4>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {allCommodities.map((c: Commodity) => (
                  <div key={c._id || c.id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                      <span className="text-[10px] text-slate-400 block">{c.category} • {c.defaultUnit}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleCommodity(c)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                        c.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Market Profile & Location Edit Modal */}
      {isMarketEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-heading font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <span>Edit Mandi Location & Profile</span>
              </h3>
              <button
                onClick={() => setIsMarketEditOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMarket} className="space-y-4 text-xs sm:text-sm">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Market / Mandi Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={marketNameInput}
                  onChange={(e) => setMarketNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Pincode with Auto-fill */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Indian Pincode (Auto-fills State & District) <span className="text-rose-500">*</span>
                  </label>
                  {isPincodeLoading && <span className="text-[10px] text-emerald-600 animate-pulse">Looking up PIN...</span>}
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 518001"
                  value={marketPincodeInput}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    District <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={marketDistrictInput}
                    onChange={(e) => setMarketDistrictInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={marketStateInput}
                    onChange={(e) => setMarketStateInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Street Address / Yard Location
                </label>
                <input
                  type="text"
                  value={marketAddressInput}
                  onChange={(e) => setMarketAddressInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* GPS Coordinates */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    GPS Coordinates (Latitude, Longitude)
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectGps}
                    disabled={isDetectingGps}
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold hover:underline"
                  >
                    <Compass className={`w-3 h-3 ${isDetectingGps ? 'animate-spin' : ''}`} />
                    <span>Auto-detect GPS</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Latitude (e.g. 15.8281)"
                    value={marketLatInput}
                    onChange={(e) => setMarketLatInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Longitude (e.g. 78.0373)"
                    value={marketLonInput}
                    onChange={(e) => setMarketLonInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMarketEditOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMarket}
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md disabled:opacity-50"
                >
                  {isSavingMarket ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Market Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketOwnerDashboard;
