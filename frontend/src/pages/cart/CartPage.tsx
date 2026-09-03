import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Package,
  AlertCircle,
  Loader2,
  Store,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, items, totalItems, subtotal, total, isLoading, updateQuantity, removeItem, clearCart } = useCart();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpdateQty = async (productId: string, newQty: number, maxStock: number, unit: string) => {
    if (newQty <= 0) return;
    if (newQty > maxStock) {
      setErrorMsg(`Cannot increase quantity. Only ${maxStock} ${unit} available in stock.`);
      return;
    }
    setErrorMsg(null);
    setActionLoading(productId);
    try {
      await updateQuantity(productId, newQty);
    } catch (err: unknown) {
      setErrorMsg('Failed to update cart quantity.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    setErrorMsg(null);
    setActionLoading(productId);
    try {
      await removeItem(productId);
    } catch (err: unknown) {
      setErrorMsg('Failed to remove item from cart.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearCart = async () => {
    setErrorMsg(null);
    try {
      await clearCart();
    } catch (err: unknown) {
      setErrorMsg('Failed to clear cart.');
    }
  };

  if (isLoading && !cart) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center max-w-7xl mx-auto px-4 py-16">
        <Loader2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-spin mb-3" />
        <p className="text-base font-medium text-slate-700 dark:text-slate-300">Loading your cart from database...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
          <ShoppingCart className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 dark:text-white">Your Cart is Empty</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            You don't have any agricultural products in your cart yet. Explore the Marketplace to source certified seeds, crop protection, and tools.
          </p>

        </div>
        <div className="pt-2">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Browse Marketplace</span>
          </Link>
        </div>
      </div>
    );
  }

  const hasUnavailableItems = items.some((item) => !item.isAvailable);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            <span>Shopping Cart ({totalItems} items)</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review and adjust order quantities before proceeding to checkout.
          </p>
        </div>

        <button
          onClick={handleClearCart}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 self-start transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear Entire Cart</span>
        </button>
      </div>

      {/* Error Banner */}
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

      {hasUnavailableItems && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <span>
            Some items in your cart exceed available stock. Please adjust quantities before proceeding to checkout.
          </span>
        </div>
      )}

      {/* Cart Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Items List */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => {
            const prod = item.product;
            const prodId = prod?._id || prod?.id || '';
            const isItemLoading = actionLoading === prodId;
            const shop = typeof prod?.shopOwner === 'object' ? prod.shopOwner : null;

            return (
              <div
                key={prodId}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 sm:p-6 transition-all shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  !item.isAvailable
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-950/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Product Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                    {prod?.images && prod.images[0] ? (
                      <img
                        src={prod.images[0]}
                        alt={prod.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=600';
                        }}
                      />
                    ) : (
                      <Package className="w-8 h-8 text-slate-400" />
                    )}
                  </div>

                  <div className="space-y-1 flex-1">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                      {prod?.brand || 'Agri Supplier'} • {prod?.category}
                    </span>
                    <Link
                      to={`/marketplace/product/${prodId}`}
                      className="text-base font-heading font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors line-clamp-1"
                    >
                      {prod?.name}
                    </Link>

                    {shop?.name && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        <span>Supplier: {shop.name}</span>
                      </div>
                    )}

                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        ₹{item.currentPrice}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">/ {item.unit}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">• Available: {item.currentStock} {item.unit}</span>
                    </div>

                    {!item.isAvailable && (
                      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 pt-1">
                        Requested {item.quantity} exceeds available {item.currentStock} {item.unit}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quantity Controls & Subtotal */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Subtotal</span>
                    <span className="text-lg font-heading font-black text-slate-900 dark:text-white">₹{item.subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Quantity modifier */}
                    <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                      <button
                        onClick={() => handleUpdateQty(prodId, item.quantity - 1, item.currentStock, item.unit)}
                        disabled={item.quantity <= 1 || isItemLoading}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors text-slate-700 dark:text-slate-200"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center text-xs font-bold font-mono text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQty(prodId, item.quantity + 1, item.currentStock, item.unit)}
                        disabled={item.quantity >= item.currentStock || isItemLoading}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors text-slate-700 dark:text-slate-200"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => handleRemoveItem(prodId)}
                      disabled={isItemLoading}
                      className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="Remove product from cart"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm sticky top-24">
            <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Order Summary
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Items</span>
                <span className="font-semibold text-slate-900 dark:text-white">{totalItems}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900 dark:text-white">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Estimated Taxes & Platform Fee</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹0.00 (Free)</span>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-between text-base font-heading font-extrabold text-slate-900 dark:text-white">
                <span>Total Amount</span>
                <span className="text-xl text-emerald-600 dark:text-emerald-400">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              disabled={hasUnavailableItems}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center">
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Continue Shopping</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
