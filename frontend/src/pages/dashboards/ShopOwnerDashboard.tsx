import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import {
  Store,
  Shield,
  Package,
  Truck,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
} from 'lucide-react';
import QRCode from 'qrcode';
import { updateProfileApi, getMeApi } from '../../services/api';

export const ShopOwnerDashboard: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation();

  // Profile / UPI Form State
  const [shopName, setShopName] = useState(user?.shopName || user?.name || '');
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [street, setStreet] = useState(user?.address?.street || '');
  const [city, setCity] = useState(user?.address?.city || '');
  const [state, setState] = useState(user?.address?.state || '');
  const [pincode, setPincode] = useState(user?.address?.pincode || '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Dynamic QR Code Preview State
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string | null>(null);

  // 1. Fetch fresh profile directly from MongoDB on mount
  useEffect(() => {
    let isMounted = true;
    const fetchFreshProfile = async () => {
      try {
        const res = await getMeApi();
        if (isMounted && res.success && res.user) {
          updateUser(res.user);
          setShopName(res.user.shopName || res.user.name || '');
          setUpiId(res.user.upiId || '');
          setPhone(res.user.phone || '');
          setStreet(res.user.address?.street || '');
          setCity(res.user.address?.city || '');
          setState(res.user.address?.state || '');
          setPincode(res.user.address?.pincode || '');
        }
      } catch (err) {
        console.warn('[ShopOwnerDashboard] Profile fetch warning:', err);
      }
    };
    fetchFreshProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Synchronize form state whenever AuthContext user updates
  useEffect(() => {
    if (user) {
      setShopName(user.shopName || user.name || '');
      setUpiId(user.upiId || '');
      setPhone(user.phone || '');
      setStreet(user.address?.street || '');
      setCity(user.address?.city || '');
      setState(user.address?.state || '');
      setPincode(user.address?.pincode || '');
    }
  }, [user]);

  // Generate dynamic QR Code preview whenever UPI ID or Shop Name changes
  useEffect(() => {
    const generatePreviewQR = async () => {
      if (upiId && upiId.trim()) {
        const sampleAmount = 500;
        const upiString = `upi://pay?pa=${encodeURIComponent(upiId.trim())}&pn=${encodeURIComponent(
          shopName.trim() || 'Agri Store Partner'
        )}&am=${sampleAmount}&cu=INR&tn=AgroMitra-Sample-Order`;
        try {
          const url = await QRCode.toDataURL(upiString, {
            width: 220,
            margin: 2,
            color: {
              dark: '#064e3b', // Deep emerald
              light: '#ffffff',
            },
          });
          setPreviewQrDataUrl(url);
        } catch (err) {
          console.error('Failed to generate preview QR:', err);
        }
      } else {
        setPreviewQrDataUrl(null);
      }
    };
    generatePreviewQR();
  }, [upiId, shopName]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const res = await updateProfileApi({
        shopName: shopName.trim(),
        upiId: upiId.trim(),
        phone: phone.trim(),
        address: {
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        },
      });

      if (res.success && res.user) {
        updateUser(res.user);
        setSaveSuccess('Agri Store Partner profile and payment details updated successfully!');
        setTimeout(() => setSaveSuccess(null), 4000);
      }
    } catch (err: any) {
      setSaveError(err.response?.data?.message || 'Failed to update store partner profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/30">
            <Store className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                AgroMitra Partner Ecosystem
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
              Agri Store Partner Portal
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Welcome, <strong className="text-slate-800 dark:text-slate-200">{shopName || user?.name}</strong> • Store Operations & Catalog Management
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold self-start sm:self-auto">
          <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>{t('rolePartner', 'Agri Store Partner')}</span>
        </div>
      </div>


      {/* 2. Partner Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Link
          to="/shop-owner/products"
          className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-300 dark:hover:border-amber-700 transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Catalog & Pricing</span>
            <h3 className="text-base font-heading font-extrabold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              Manage Products
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Add seeds, pesticides & equipment</p>
          </div>

          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <Package className="w-5 h-5" />
          </div>
        </Link>

        <Link
          to="/shop-owner/orders"
          className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-300 dark:hover:border-amber-700 transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Fulfillment</span>
            <h3 className="text-base font-heading font-extrabold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              Orders & Dispatch
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Accept orders & assign delivery</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <Truck className="w-5 h-5" />
          </div>
        </Link>

        <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl p-6 text-white shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-200 uppercase tracking-wide">Instant Settlement</span>
            <h3 className="text-base font-heading font-extrabold text-white">
              Dynamic UPI QR
            </h3>
            <p className="text-xs text-amber-100">
              {upiId ? `Active: ${upiId}` : 'Set UPI ID below'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Editable Store Profile & UPI Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Section */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white">
              Store Partner Payment & Profile Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure your store's UPI ID. Farmers purchasing your products will generate dynamic UPI QR codes and payment intents linked directly to this UPI address.
            </p>
          </div>

          {saveSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {saveError && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Agri Store Name
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Sri Balaji Agri Kendra"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Store Partner UPI ID (PhonePe / GPay / BHIM)
                </label>

                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. 8519813077@ybl or shop@upi"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Mobile Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9848012345"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Street / Market Yard Location
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="e.g. Shop #14, Main Mandi Road"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">City / Town</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Kurnool"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Andhra Pradesh"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pincode</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="518001"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-heading font-bold text-xs shadow-md transition-all"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{t('save', 'Save Store Payment Details')}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Dynamic QR Live Preview Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white">
              Dynamic UPI QR Preview
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live preview of the dynamic payment QR generated for your store on farmer checkout screens.
            </p>

            {previewQrDataUrl ? (
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2 my-2">
                <img
                  src={previewQrDataUrl}
                  alt={`Live preview for ${shopName}`}
                  className="w-36 h-36 mx-auto rounded-xl shadow-sm bg-white p-1"
                />
                <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate">
                  {upiId}
                </div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  QR Active
                </span>
              </div>
            ) : (
              <div className="h-44 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-xs text-slate-400 p-4 text-center">
                Enter your UPI ID to generate your dynamic store QR code.
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
            <p>✓ All payments settle directly to your UPI bank account.</p>
            <p>✓ No commission deducted on direct QR transfers.</p>
          </div>
        </div>

      </div>

    </div>
  );
};
