import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
} from 'lucide-react';
import { MarketOwnerNav } from './MarketOwnerNav';
import { AgroMitraLogo } from '../../components/common/AgroMitraLogo';
import {
  getMarketOwnerDashboardApi,
  updateMyMarketApi,
} from '../../services/api';
import { lookupPincode } from '../../utils/pincode';
import { getAccurateDeviceLocation } from '../../utils/geolocation';
import { MarketOwnerDashboardData } from '../../types/marketOwner';
import axios from 'axios';

export const MarketOwnerMarketPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<MarketOwnerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPincodeLoading, setIsPincodeLoading] = useState<boolean>(false);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);

  // Form Fields
  const [marketName, setMarketName] = useState<string>('');
  const [marketAddress, setMarketAddress] = useState<string>('');
  const [marketState, setMarketState] = useState<string>('');
  const [marketDistrict, setMarketDistrict] = useState<string>('');
  const [marketCity, setMarketCity] = useState<string>('');
  const [marketPincode, setMarketPincode] = useState<string>('');
  const [marketLat, setMarketLat] = useState<string>('');
  const [marketLon, setMarketLon] = useState<string>('');
  const [marketHours, setMarketHours] = useState<string>('06:00 AM - 06:00 PM');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');

  // Alerts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await getMarketOwnerDashboardApi();
      if (res.success && res.market) {
        setDashboardData(res);
        const m = res.market;
        setMarketName(m.name || '');
        setMarketAddress(m.address || '');
        setMarketState(m.state || '');
        setMarketDistrict(m.district || '');
        setMarketCity(m.city || '');
        setMarketPincode(m.pincode || '');
        setMarketLat(m.latitude ? String(m.latitude) : '');
        setMarketLon(m.longitude ? String(m.longitude) : '');
        setContactPerson(m.contactPerson || '');
        setContactPhone(m.contactPhone || '');
        const hoursStr = typeof m.operatingHours === 'object'
          ? `${m.operatingHours.open || '06:00 AM'} - ${m.operatingHours.close || '06:00 PM'}`
          : (m.operatingHours || '06:00 AM - 06:00 PM');
        setMarketHours(hoursStr);
      }
    } catch {
      setErrorMsg('Failed to load market profile.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle PIN Code Change & Auto-Fill
  const handlePincodeChange = async (pin: string) => {
    setMarketPincode(pin);
    const clean = pin.trim();
    if (clean.length === 6 && !isNaN(Number(clean))) {
      setIsPincodeLoading(true);
      setErrorMsg(null);
      const res = await lookupPincode(clean);
      setIsPincodeLoading(false);
      if (res.success) {
        if (res.state) setMarketState(res.state);
        if (res.district) setMarketDistrict(res.district);
        if (res.city) setMarketCity(res.city);
        setSuccessMsg(`Location auto-filled from PIN ${clean}: ${res.city || res.district}, ${res.state}`);
      }
    }
  };

  // Handle GPS Auto-Detect
  const handleDetectGps = async () => {
    setIsDetectingGps(true);
    setErrorMsg(null);
    try {
      const pos = await getAccurateDeviceLocation();
      setIsDetectingGps(false);
      setMarketLat(String(Number(pos.latitude.toFixed(5))));
      setMarketLon(String(Number(pos.longitude.toFixed(5))));
      setSuccessMsg(`GPS Coordinates acquired: (${pos.latitude.toFixed(4)}, ${pos.longitude.toFixed(4)})`);
    } catch (err: any) {
      setIsDetectingGps(false);
      setErrorMsg(`GPS detection: ${err.message}`);
    }
  };

  // Handle Form Submit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketName.trim() || !marketState.trim() || !marketDistrict.trim()) {
      setErrorMsg('Market name, state, and district are required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await updateMyMarketApi({
        name: marketName.trim(),
        address: marketAddress.trim(),
        state: marketState.trim(),
        district: marketDistrict.trim(),
        city: marketCity.trim() || marketDistrict.trim(),
        pincode: marketPincode.trim(),
        latitude: marketLat ? parseFloat(marketLat) : undefined,
        longitude: marketLon ? parseFloat(marketLon) : undefined,
        operatingHours: marketHours.trim(),
      });

      if (res.success) {
        setSuccessMsg('Mandi profile and location details updated successfully.');
        await loadData();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to update market profile.');
      }
    } finally {
      setIsSaving(false);
    }
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
                APMC Yard Profile & Geolocation
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
              Authorized Mandi Information
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage mandi address, operating hours, and verified coordinates for accurate proximity calculations.
            </p>
          </div>
        </div>

        <span className="px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold self-start sm:self-auto border border-emerald-200 dark:border-emerald-800">
          Code: {dashboardData?.market?.marketCode || 'APMC-REGIONAL'}
        </span>
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

      {/* Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <span className="text-xs font-medium">Loading mandi details...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Market Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Authorized Mandi Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={marketName}
                onChange={(e) => setMarketName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Operating Hours */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Trading & Auction Hours
              </label>
              <input
                type="text"
                value={marketHours}
                onChange={(e) => setMarketHours(e.target.value)}
                placeholder="e.g. 06:00 AM - 06:00 PM"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Yard Street Address
            </label>
            <input
              type="text"
              value={marketAddress}
              onChange={(e) => setMarketAddress(e.target.value)}
              placeholder="e.g. APMC Commercial Complex, NH 44 Bypass"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Contact Person & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Market Administrator / Contact Person
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Mandi Secretary / Supervisor"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mandi Helpline / Contact Phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* PIN, State, District, City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                PIN Code (Auto-Fill)
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={marketPincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  placeholder="6-digit PIN"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                {isPincodeLoading && (
                  <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-emerald-600" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                District <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={marketDistrict}
                onChange={(e) => setMarketDistrict(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                State <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={marketState}
                onChange={(e) => setMarketState(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                City / Town
              </label>
              <input
                type="text"
                value={marketCity}
                onChange={(e) => setMarketCity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* GPS Coordinates Section */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-600" />
                  <span>Verified Yard GPS Coordinates</span>
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Enables farmers to calculate accurate road distance to your mandi.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDetectGps}
                disabled={isDetectingGps}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 self-start sm:self-auto"
              >
                <Compass className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
                <span>{isDetectingGps ? 'Detecting GPS...' : 'Auto-Detect Mandi GPS'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Latitude
                </label>
                <input
                  type="text"
                  value={marketLat}
                  onChange={(e) => setMarketLat(e.target.value)}
                  placeholder="e.g. 15.8281"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Longitude
                </label>
                <input
                  type="text"
                  value={marketLon}
                  onChange={(e) => setMarketLon(e.target.value)}
                  placeholder="e.g. 78.0373"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end pt-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Mandi Profile</span>
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default MarketOwnerMarketPage;
