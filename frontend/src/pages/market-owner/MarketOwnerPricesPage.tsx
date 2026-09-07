import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { MarketOwnerNav } from './MarketOwnerNav';
import { AgroMitraLogo } from '../../components/common/AgroMitraLogo';
import {
  getMarketOwnerDashboardApi,
  addOrUpdateMarketPriceApi,
  getCommoditiesApi,
  createCommodityApi,
  updateCommodityApi,
} from '../../services/api';
import {
  MarketOwnerDashboardData,
  MarketPriceRecord,
  Commodity,
  AddPricePayload,
} from '../../types/marketOwner';
import axios from 'axios';

export const MarketOwnerPricesPage: React.FC = () => {

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

  // Load Dashboard Data
  const loadData = useCallback(async (isRefresh = false) => {
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
      }

      if (commRes.success && Array.isArray(commRes.commodities)) {
        setAllCommodities(commRes.commodities);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to load market prices.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        await loadData(true);
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
        await loadData(true);
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
        await loadData(true);
      }
    } catch {
      setErrorMsg('Failed to update commodity status.');
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
                Daily Mandi Price Management
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
              Commodity Price Quotes
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Publish and update wholesale rates for {dashboardData?.todayDate || 'today'}. Changes sync instantly to farmers.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsCommodityModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>New Commodity</span>
          </button>
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
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

      {/* Daily Price Management Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
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
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Commodity Table */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <span className="text-xs font-medium">Loading mandi commodities...</span>
          </div>
        ) : filteredCommodities.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-2">
            <p>No commodities found matching your filter criteria.</p>
            <button
              onClick={() => setIsCommodityModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
            >
              Add New Commodity
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-bold tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Commodity</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Min Price</th>
                  <th className="py-3 px-4">Max Price</th>
                  <th className="py-3 px-4">Modal Price (Current)</th>
                  <th className="py-3 px-4">Today&apos;s Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCommodities.map((commodity) => {
                  const commId = commodity._id || commodity.id;
                  const todayPrice = dashboardData?.todayPrices?.find((p) => {
                    const pCommId = typeof p.commodity === 'object' ? (p.commodity._id || (p.commodity as any).id) : p.commodity;
                    return pCommId === commId;
                  });

                  return (
                    <tr key={commId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{commodity.icon || '🌾'}</span>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{commodity.name}</span>
                            <span className="text-[10px] text-slate-400">{commodity.variety || 'Standard'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {commodity.category}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {todayPrice ? `₹${todayPrice.minPrice}` : '—'}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {todayPrice ? `₹${todayPrice.maxPrice}` : '—'}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                        {todayPrice ? `₹${todayPrice.modalPrice} / ${todayPrice.unit || 'quintal'}` : 'Not Published'}
                      </td>

                      <td className="py-3.5 px-4">
                        {todayPrice ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            <Check className="w-3 h-3" /> Updated ({todayPrice.updatedTime})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                            Pending Quote
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openPriceModal(commodity, todayPrice)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] transition-all"
                          >
                            {todayPrice ? 'Update Rate' : '+ Set Rate'}
                          </button>
                          <button
                            onClick={() => handleToggleCommodity(commodity)}
                            className={`p-1.5 rounded-xl transition-all ${
                              commodity.isActive ? 'text-slate-400 hover:text-rose-600' : 'text-slate-300 hover:text-emerald-600'
                            }`}
                            title={commodity.isActive ? 'Disable Commodity' : 'Activate Commodity'}
                          >
                            {commodity.isActive ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-500" />}
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

      {/* Set Daily Price Modal */}
      {isPriceModalOpen && selectedCommodityForPrice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white">
                  Set Daily Price: {selectedCommodityForPrice.name}
                </h3>
              </div>
              <button onClick={() => setIsPriceModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePrice} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Min Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 2800"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Modal Rate (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 3050"
                    value={modalPriceInput}
                    onChange={(e) => setModalPriceInput(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Max Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 3200"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Pricing Unit
                </label>
                <select
                  value={unitInput}
                  onChange={(e) => setUnitInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="quintal">Quintal (100 kg)</option>
                  <option value="kg">Kilogram (kg)</option>
                  <option value="tonne">Tonne (1000 kg)</option>
                  <option value="bag">Bag / Sack</option>
                  <option value="crate">Crate</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Auction Notes / Quality Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fair Average Quality (FAQ), moisture < 12%"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPriceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPrice}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Daily Price</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Commodity Modal */}
      {isCommodityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white">
                  Add New Commodity to Catalog
                </h3>
              </div>
              <button onClick={() => setIsCommodityModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCommodity} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Commodity Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sona Masoori Paddy, Tomato"
                  value={commodityNameInput}
                  onChange={(e) => setCommodityNameInput(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={commodityCategoryInput}
                  onChange={(e) => setCommodityCategoryInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Cereals">Cereals (Paddy, Wheat, Maize)</option>
                  <option value="Pulses">Pulses (Red Gram, Bengal Gram, Green Gram)</option>
                  <option value="Oilseeds">Oilseeds (Groundnut, Mustard, Soybean)</option>
                  <option value="Vegetables">Vegetables (Tomato, Onion, Chilli)</option>
                  <option value="Fruits">Fruits (Mango, Banana, Citrus)</option>
                  <option value="Spices">Spices (Turmeric, Coriander, Pepper)</option>
                  <option value="Commercial / Cash Crops">Commercial (Cotton, Sugarcane, Tobacco)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Default Pricing Unit
                </label>
                <select
                  value={commodityUnitInput}
                  onChange={(e) => setCommodityUnitInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="quintal">Quintal (100 kg)</option>
                  <option value="kg">Kilogram (kg)</option>
                  <option value="tonne">Tonne (1000 kg)</option>
                  <option value="bag">Bag / Sack</option>
                  <option value="crate">Crate</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Variety / Grade
                </label>
                <input
                  type="text"
                  placeholder="e.g. FAQ / Grade A / Hybrid"
                  value={commodityVarietyInput}
                  onChange={(e) => setCommodityVarietyInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCommodityModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCommodity}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingCommodity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Commodity</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketOwnerPricesPage;
