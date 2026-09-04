import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  Package,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  Building,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { createOrderApi } from '../../services/api';
import axios from 'axios';

import { PaymentMethod } from '../../types/order';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, totalItems, subtotal, total, clearCart } = useCart();

  const [address, setAddress] = useState({
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    pincode: user?.address?.pincode || '',
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI_QR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">Your cart is empty</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Please add products to your cart before proceeding to checkout.</p>
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go to Marketplace</span>
        </Link>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!address.street.trim() || !address.city.trim() || !address.state.trim() || !address.pincode.trim()) {
      setErrorMsg('Please provide a complete delivery address (street, city, state, pincode).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createOrderApi({
        deliveryAddress: address,
        paymentMethod,
      });

      if (res.success && res.order) {
        // Clear local cart context as well
        await clearCart();
        navigate(`/orders/${res.order.id || res.order._id}/payment`, {
          state: {
            newOrderNumber: res.order.orderNumber,
            paymentMethod,
          },
        });
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to place order. Please verify your connection and stock availability.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Back button & Title */}
      <div className="space-y-2">
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Shopping Cart</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
          Checkout & Place Order
        </h1>
      </div>

      {/* Payment Routing Notice */}
      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-sm text-blue-900 dark:text-blue-200 flex items-start gap-3 shadow-sm">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Seamless Settlement: </span>
          <span>
            Placing this order creates your verified order record. You will be redirected to complete payment directly via Agri Store Partner UPI QR or Razorpay.

          </span>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-sm text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 dark:text-rose-300 hover:text-rose-900 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Checkout Form */}
      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Delivery Address & Customer Info */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customer Details */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm transition-colors">
            <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Farmer Account Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold block">Full Name</span>
                <span className="font-bold text-slate-900 dark:text-white">{user?.name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold block">Contact Phone</span>
                <span className="font-bold text-slate-900 dark:text-white">{user?.phone}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold block">Email</span>
                <span className="font-bold text-slate-900 dark:text-white">{user?.email}</span>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm transition-colors">
            <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Farm / Delivery Address</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Street / Village / Farm Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Survey No. 42, Green Farm Road"
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  className="block w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City / Town <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kurnool"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="block w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Andhra Pradesh"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className="block w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pincode <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 518001"
                    value={address.pincode}
                    onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                    className="block w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm transition-colors">
            <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Select Payment Method</span>
            </h3>

            <div className="space-y-3">
              {/* UPI / QR Payment */}
              <label
                onClick={() => setPaymentMethod('UPI_QR')}
                className={`p-4 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                  paymentMethod === 'UPI_QR'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="UPI_QR"
                  checked={paymentMethod === 'UPI_QR'}
                  onChange={() => setPaymentMethod('UPI_QR')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                      Direct Agri Store Partner UPI QR
                    </span>
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Scan dealer's merchant QR via PhonePe, Google Pay, Paytm, BHIM, or any UPI app with zero transaction surcharge.
                  </p>
                </div>
              </label>

              {/* Razorpay Online Gateway */}
              <label
                onClick={() => setPaymentMethod('RAZORPAY')}
                className={`p-4 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                  paymentMethod === 'RAZORPAY'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="RAZORPAY"
                  checked={paymentMethod === 'RAZORPAY'}
                  onChange={() => setPaymentMethod('RAZORPAY')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-0.5 flex-1">
                  <span className="font-heading font-bold text-sm text-slate-900 dark:text-white block">
                    Razorpay Online Gateway
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pay securely using Debit/Credit Cards, NetBanking, UPI, or Digital Wallets with instant verification.
                  </p>
                </div>
              </label>

              {/* Cash on Delivery */}
              <label
                onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
                className={`p-4 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                  paymentMethod === 'CASH_ON_DELIVERY'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="CASH_ON_DELIVERY"
                  checked={paymentMethod === 'CASH_ON_DELIVERY'}
                  onChange={() => setPaymentMethod('CASH_ON_DELIVERY')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                      Cash on Delivery (COD)
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Doorstep
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pay in cash directly to the delivery partner upon arrival at your farm/doorstep.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Order Items Breakdown & Place Order */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm transition-colors">
            <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Order Items Snapshot ({totalItems})
            </h3>

            {/* Items List */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {items.map((item) => {
                const prod = item.product;
                const prodId = prod?._id || prod?.id;
                return (
                  <div key={prodId} className="flex justify-between items-start text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="space-y-0.5 flex-1 pr-2">
                      <span className="font-bold text-slate-900 dark:text-white block line-clamp-1">{prod?.name}</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {item.quantity} × ₹{item.currentPrice} / {item.unit}
                      </span>
                    </div>
                    <span className="font-heading font-black text-slate-900 dark:text-white text-sm">₹{item.subtotal.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            {/* Financial Totals */}
            <div className="space-y-2 text-sm pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900 dark:text-white">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Direct Delivery from Local Stores</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free</span>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-between text-base font-heading font-extrabold text-slate-900 dark:text-white">
                <span>Total Payable</span>
                <span className="text-2xl text-emerald-600 dark:text-emerald-400">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-60 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Order...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Place Order & Proceed to Pay (₹{total.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
