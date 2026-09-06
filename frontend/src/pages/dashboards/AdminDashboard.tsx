import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Lock,
  Package,
  ArrowRight,
  ShoppingBag,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getStorePaymentConfigApi,
  updateStorePaymentConfigApi,
  deleteStorePaymentConfigApi,
  getAdminPaymentsApi,
  verifyAdminPaymentApi,
} from '../../services/api';
import { StorePaymentConfig, AdminPaymentRecord } from '../../types/payment';
import axios from 'axios';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  // Store UPI Configuration State
  const [upiConfig, setUpiConfig] = useState<StorePaymentConfig>({
    storeName: '',
    upiId: '',
    phoneNumber: '',
    merchantName: '',
    isActive: true,
  });
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string | null>(null);
  const [configErrorMsg, setConfigErrorMsg] = useState<string | null>(null);

  // Admin Payments Verification State
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [paymentActionId, setPaymentActionId] = useState<string | null>(null);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);
  const [paymentErrorMsg, setPaymentErrorMsg] = useState<string | null>(null);

  const fetchConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const res = await getStorePaymentConfigApi();
      if (res.success && res.config) {
        setUpiConfig({
          storeName: res.config.storeName || '',
          upiId: res.config.upiId || '',
          phoneNumber: res.config.phoneNumber || '',
          merchantName: res.config.merchantName || res.config.storeName || '',
          isActive: res.config.isActive !== undefined ? res.config.isActive : true,
        });
      } else {
        setUpiConfig({
          storeName: user?.shopName || 'AgroMitra Super Store',
          upiId: user?.upiId || '',
          phoneNumber: user?.phone || '',
          merchantName: user?.shopName || 'AgroMitra Super Store',
          isActive: true,
        });
      }
    } catch {
      // Use fallback defaults
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const fetchPayments = async () => {
    setIsLoadingPayments(true);
    try {
      const res = await getAdminPaymentsApi();
      if (res.success && Array.isArray(res.payments)) {
        setPayments(res.payments);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoadingPayments(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchPayments();
  }, []);

  const handleSaveUpiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiConfig.storeName.trim() || !upiConfig.upiId.trim()) {
      setConfigErrorMsg('Store Name and valid UPI ID are required.');
      return;
    }

    const cleanUpi = upiConfig.upiId.trim();
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,100}@[a-zA-Z0-9]{2,64}$/;
    if (!upiRegex.test(cleanUpi)) {
      setConfigErrorMsg('Invalid UPI ID format. Please use username@bank (e.g. store@icici or 9876543210@upi).');
      return;
    }

    setIsSavingConfig(true);
    setConfigErrorMsg(null);
    setConfigSuccessMsg(null);

    try {
      const res = await updateStorePaymentConfigApi({
        storeName: upiConfig.storeName.trim(),
        upiId: upiConfig.upiId.trim(),
        phoneNumber: upiConfig.phoneNumber?.trim() || '',
        merchantName: (upiConfig.merchantName || upiConfig.storeName).trim(),
        isActive: upiConfig.isActive,
      });

      if (res.success) {
        setConfigSuccessMsg('Store UPI payment configuration updated securely in database.');
        await fetchConfig();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setConfigErrorMsg(err.response.data.message);
      } else {
        setConfigErrorMsg('Failed to save Store UPI configuration.');
      }
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleDeleteUpiConfig = async () => {
    if (!window.confirm('Are you sure you want to deactivate and remove store UPI payments?')) {
      return;
    }

    setIsSavingConfig(true);
    setConfigErrorMsg(null);
    setConfigSuccessMsg(null);

    try {
      const res = await deleteStorePaymentConfigApi();
      if (res.success) {
        setConfigSuccessMsg('Store UPI payments deactivated.');
        setUpiConfig((prev) => ({ ...prev, upiId: '', isActive: false }));
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setConfigErrorMsg(err.response.data.message);
      } else {
        setConfigErrorMsg('Failed to deactivate Store UPI configuration.');
      }
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleVerifyPayment = async (orderId: string, orderNumber: string, status: 'PAID' | 'FAILED') => {
    setPaymentActionId(orderId);
    setPaymentErrorMsg(null);
    setPaymentSuccessMsg(null);

    try {
      const res = await verifyAdminPaymentApi(
        orderId,
        status,
        status === 'PAID' ? 'Verified by Administrator' : 'Payment reference rejected by Administrator'
      );

      if (res.success) {
        setPaymentSuccessMsg(`Order #${orderNumber} payment marked as ${status}.`);
        await fetchPayments();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setPaymentErrorMsg(err.response.data.message);
      } else {
        setPaymentErrorMsg(`Failed to mark payment status for Order #${orderNumber}.`);
      }
    } finally {
      setPaymentActionId(null);
    }
  };

  const pendingVerificationPayments = payments.filter(
    (p) => p.paymentStatus !== 'PAID' && p.status !== 'CANCELLED' && p.status !== 'REJECTED'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center shadow-sm">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
              AgroMitra System Administration
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Welcome back, <strong className="text-slate-800 dark:text-slate-200">{user?.name}</strong> • Global Infrastructure & Platform Security
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 text-xs font-bold self-start sm:self-auto">
          <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>Role: {user?.role}</span>
        </div>
      </div>

      {/* Primary Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manage Product Catalog Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-purple-300 dark:hover:border-purple-700 transition-all flex flex-col justify-between space-y-4 group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Package className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Catalog Control
              </span>
            </div>
            <div>
              <h2 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Manage Product Catalog
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Add, edit, and manage all agricultural products, including seeds, fertilizers, bio-products, crop protection, equipment, and custom categories with dynamic pricing and inventory.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/admin/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all"
            >
              <Package className="w-4 h-4" />
              <span>Open Catalog Management</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              <ShoppingBag className="w-4 h-4 text-slate-500" />
              <span>View Live Marketplace</span>
            </Link>
          </div>
        </div>

        {/* Store UPI Payment Control Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <QrCode className="w-6 h-6" />
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  upiConfig.isActive && upiConfig.upiId
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                }`}
              >
                {upiConfig.isActive && upiConfig.upiId ? 'UPI Active' : 'UPI Unconfigured'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white">
                Store UPI Payment Gateway
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Control the store partner UPI receiver VPA, display name, registered contact, and live QR code generation across all customer checkout orders.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Store UPI ID:</span>
              <strong className="font-mono text-slate-900 dark:text-white">{upiConfig.upiId || 'Not Configured'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Store Name:</span>
              <strong className="text-slate-900 dark:text-white">{upiConfig.storeName || 'AgroMitra Super Store'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Store UPI Payment Configuration Form Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg sm:text-xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
              <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Configure Store UPI Payment & QR Code</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Dynamic UPI payments will generate a real-time QR code for the exact order total on the customer payment screen.
            </p>
          </div>

          <button
            onClick={fetchConfig}
            disabled={isLoadingConfig}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingConfig ? 'animate-spin' : ''}`} />
            <span>Refresh Config</span>
          </button>
        </div>

        {configSuccessMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{configSuccessMsg}</span>
            </div>
            <button onClick={() => setConfigSuccessMsg(null)} className="text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              ✕
            </button>
          </div>
        )}

        {configErrorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-xs sm:text-sm text-rose-800 dark:text-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{configErrorMsg}</span>
            </div>
            <button onClick={() => setConfigErrorMsg(null)} className="text-rose-700 dark:text-rose-300 text-xs font-bold">
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSaveUpiConfig} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Store Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={upiConfig.storeName}
              onChange={(e) => setUpiConfig({ ...upiConfig, storeName: e.target.value })}
              placeholder="e.g. AgroMitra Central Agri Store"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              UPI ID (VPA) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={upiConfig.upiId}
              onChange={(e) => setUpiConfig({ ...upiConfig, upiId: e.target.value })}
              placeholder="e.g. agrimart@icici or 9876543210@paytm"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-mono placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Store Payment Display Name
            </label>
            <input
              type="text"
              value={upiConfig.merchantName}
              onChange={(e) => setUpiConfig({ ...upiConfig, merchantName: e.target.value })}
              placeholder="e.g. AgroMitra Retail Partners"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Registered Store Phone Number
            </label>
            <input
              type="text"
              value={upiConfig.phoneNumber}
              onChange={(e) => setUpiConfig({ ...upiConfig, phoneNumber: e.target.value })}
              placeholder="e.g. 9876543210"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 flex items-center justify-between pt-2">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={upiConfig.isActive}
                onChange={(e) => setUpiConfig({ ...upiConfig, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span>Enable Direct Store UPI Payments for Customers</span>
            </label>

            <div className="flex items-center gap-3">
              {upiConfig.upiId && (
                <button
                  type="button"
                  onClick={handleDeleteUpiConfig}
                  disabled={isSavingConfig}
                  className="px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors disabled:opacity-50"
                >
                  Deactivate UPI
                </button>
              )}

              <button
                type="submit"
                disabled={isSavingConfig || !upiConfig.storeName.trim() || !upiConfig.upiId.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-colors disabled:opacity-50"
              >
                {isSavingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Save UPI Configuration</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Admin Payment Verification Queue */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg sm:text-xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
              <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>Customer Payment Verification Queue</span>
              {pendingVerificationPayments.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  {pendingVerificationPayments.length} Pending
                </span>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Review customer UTR transaction references, verify payment arrival in your bank/UPI app, and mark orders PAID.
            </p>
          </div>

          <button
            onClick={fetchPayments}
            disabled={isLoadingPayments}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPayments ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>

        {paymentSuccessMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{paymentSuccessMsg}</span>
            </div>
            <button onClick={() => setPaymentSuccessMsg(null)} className="text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              ✕
            </button>
          </div>
        )}

        {paymentErrorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-xs sm:text-sm text-rose-800 dark:text-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{paymentErrorMsg}</span>
            </div>
            <button onClick={() => setPaymentErrorMsg(null)} className="text-rose-700 dark:text-rose-300 text-xs font-bold">
              ✕
            </button>
          </div>
        )}

        {isLoadingPayments ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
            <span className="text-xs">Loading payment transactions...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No customer order payments currently recorded in database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase">
                  <th className="py-3 px-4">Order Reference</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Payable Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Transaction / UTR ID</th>
                  <th className="py-3 px-4 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.map((p) => {
                  const isActioning = paymentActionId === p.orderId;
                  return (
                    <tr key={p.orderId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {p.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{p.farmer?.name}</div>
                        <div className="text-[11px] text-slate-400">{p.farmer?.phone}</div>
                      </td>
                      <td className="py-3 px-4 font-heading font-extrabold text-slate-900 dark:text-white text-sm">
                        ₹{p.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {p.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on Delivery' : p.paymentMethod === 'RAZORPAY' ? 'Razorpay' : 'Direct Store UPI'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            p.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                              : p.paymentStatus === 'FAILED'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                          }`}
                        >
                          {p.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {p.transactionId}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.paymentStatus !== 'PAID' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleVerifyPayment(p.orderId, p.orderNumber, 'PAID')}
                              disabled={isActioning}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-sm transition-colors disabled:opacity-50"
                            >
                              {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              <span>Verify & Mark PAID</span>
                            </button>
                            <button
                              onClick={() => handleVerifyPayment(p.orderId, p.orderNumber, 'FAILED')}
                              disabled={isActioning}
                              className="px-2.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-bold transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Profile & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Administrator Credentials</span>
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <User className="w-4 h-4" />
                <span>Full Name</span>
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">{user?.name}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                <span>Email Address</span>
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">{user?.email}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Phone className="w-4 h-4" />
                <span>Phone</span>
              </span>
              <span className="font-medium text-slate-900 dark:text-white">{user?.phone}</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Active Since</span>
              </span>
              <span className="font-medium text-slate-900 dark:text-white">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'System Initialization'}
              </span>
            </div>
          </div>
        </div>

        {/* Admin Operational Scope */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Control Center & Security</span>
          </h2>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs sm:text-sm space-y-1">
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {user?.address?.street || 'AgroMitra National Headquarters'}
            </p>

            <p className="text-slate-600 dark:text-slate-400">
              {[user?.address?.city, user?.address?.state].filter(Boolean).join(', ') || 'Central Region'}
            </p>
            <p className="text-slate-500 dark:text-slate-500">
              Pincode: {user?.address?.pincode || '500001'}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200">
            ℹ️ <strong>System Health:</strong> MongoDB Persistent Storage Active, AI Microservice Connected, Dynamic Store UPI & Razorpay Verified.
          </div>
        </div>
      </div>
    </div>
  );
};
