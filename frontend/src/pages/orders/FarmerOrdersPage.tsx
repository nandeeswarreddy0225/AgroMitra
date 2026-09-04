import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Package,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Check,
  Box,
  Truck,
  X,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Store,
} from 'lucide-react';
import { getFarmerOrdersApi, cancelOrderApi } from '../../services/api';
import { Order, OrderStatus, OrderPaymentStatus } from '../../types/order';
import axios from 'axios';

export const FarmerOrdersPage: React.FC = () => {
  const location = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter tabs state
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED'>('ALL');

  // Expanded timelines map
  const [expandedTimelines, setExpandedTimelines] = useState<Record<string, boolean>>({});

  // Check if routed after checkout with a new order number
  const newOrderNumber = location.state?.newOrderNumber;

  const fetchOrders = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await getFarmerOrdersApi();
      if (res.success && Array.isArray(res.orders)) {
        setOrders(res.orders);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to fetch your orders. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelOrder = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`Are you sure you want to cancel Order #${orderNumber}?`)) {
      return;
    }

    setCancellingId(orderId);
    setErrorMsg(null);
    try {
      const res = await cancelOrderApi(orderId);
      if (res.success) {
        setSuccessMsg(`Order #${orderNumber} cancelled successfully.`);
        await fetchOrders();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to cancel order.');
      }
    } finally {
      setCancellingId(null);
    }
  };

  const toggleTimeline = (orderId: string) => {
    setExpandedTimelines((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'PROCESSING':
        return 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700';
      case 'PACKED':
        return 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700';
      case 'DISPATCHED':
        return 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700';
      case 'DELIVERED':
      case 'COMPLETED':
        return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
      case 'REJECTED':
        return 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700';
      case 'CANCELLED':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700';
      case 'PENDING':
      default:
        return 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700';
    }
  };

  const getPaymentBadge = (paymentStatus?: OrderPaymentStatus) => {
    switch (paymentStatus) {
      case 'PAID':
        return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
      case 'FAILED':
        return 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700';
      case 'REFUNDED':
        return 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700';
      case 'PENDING':
      default:
        return 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700';
    }
  };

  const getTimelineStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'ACCEPTED':
        return 1;
      case 'PREPARING':
      case 'PROCESSING':
        return 2;
      case 'READY_FOR_DELIVERY':
      case 'PACKED':
        return 3;
      case 'OUT_FOR_DELIVERY':
      case 'DISPATCHED':
        return 4;
      case 'DELIVERED':
      case 'COMPLETED':
        return 5;
      default:
        return -1;
    }
  };


  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'ACTIVE') {
      return ['PENDING', 'ACCEPTED', 'PROCESSING', 'PACKED', 'DISPATCHED'].includes(order.status);
    }
    if (activeTab === 'DELIVERED') {
      return ['DELIVERED', 'COMPLETED'].includes(order.status);
    }
    if (activeTab === 'CANCELLED') {
      return ['CANCELLED', 'REJECTED'].includes(order.status);
    }
    return true;
  });

  const counts = {
    ALL: orders.length,
    ACTIVE: orders.filter((o) =>
      ['PENDING', 'ACCEPTED', 'PROCESSING', 'PACKED', 'DISPATCHED'].includes(o.status)
    ).length,
    DELIVERED: orders.filter((o) => ['DELIVERED', 'COMPLETED'].includes(o.status)).length,
    CANCELLED: orders.filter((o) => ['CANCELLED', 'REJECTED'].includes(o.status)).length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            <span>My Farm Orders</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track real-time shipment status, Agri Store Partner updates, and delivery dispatch.
          </p>

        </div>

        <button
          onClick={fetchOrders}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { key: 'ALL', label: 'All Orders', count: counts.ALL },
          { key: 'ACTIVE', label: 'In Transit / Active', count: counts.ACTIVE },
          { key: 'DELIVERED', label: 'Delivered', count: counts.DELIVERED },
          { key: 'CANCELLED', label: 'Cancelled / Rejected', count: counts.CANCELLED },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 ${
              activeTab === tab.key
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* New Order Placed Alert */}
      {newOrderNumber && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold">Order Placed Successfully! </span>
            <span>Order Number: <strong>{newOrderNumber}</strong>. Your Agri Store Partner will fulfill your items.</span>
          </div>

        </div>
      )}

      {/* Status Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-sm text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 dark:text-rose-300 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Orders List */}
      {isLoading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-spin mb-3" />
          <p className="text-base font-medium text-slate-700 dark:text-slate-300">Loading your orders from database...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="min-h-[350px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-heading font-bold text-slate-900 dark:text-white">No orders found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
            {activeTab === 'ALL'
              ? 'You have not placed any orders yet. Visit the Marketplace to procure verified agricultural supplies.'
              : `No orders found in the ${activeTab.toLowerCase()} category.`}
          </p>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
          >
            <span>Explore Marketplace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => {
            const orderId = order.id || order._id || '';
            const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            const isPayable =
              order.paymentStatus !== 'PAID' &&
              order.status !== 'CANCELLED' &&
              order.status !== 'REJECTED';

            const stepIdx = getTimelineStepIndex(order.status);
            const isTimelineOpen = !!expandedTimelines[orderId];

            return (
              <div
                key={orderId}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all divide-y divide-slate-100 dark:divide-slate-800"
              >
                {/* Order Top Bar */}
                <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">Order Reference</span>
                    <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                      {order.orderNumber}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{orderDate}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* Order Fulfillment Status */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase hidden sm:inline">Order:</span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusBadge(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>

                    {/* Payment Status & Method */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase hidden sm:inline">Payment:</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${getPaymentBadge(
                          order.paymentStatus
                        )}`}
                      >
                        {order.paymentStatus === 'PAID' && <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                        <span>{order.paymentStatus || 'PENDING'}</span>
                      </span>

                      {/* Payment Method Badge */}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {order.paymentMethod === 'CASH_ON_DELIVERY'
                          ? 'Cash on Delivery'
                          : order.paymentMethod === 'RAZORPAY'
                          ? 'Razorpay'
                          : 'Direct UPI QR'}
                      </span>
                    </div>

                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => handleCancelOrder(orderId, order.orderNumber)}
                        disabled={cancellingId === orderId}
                        className="px-3 py-1 rounded-lg border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold disabled:opacity-50 transition-colors"
                      >
                        {cancellingId === orderId ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Delivery Staff Status Banner */}
                <div className="p-3.5 sm:px-6 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    {order.deliveryBoyName ? (
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Delivery Partner Assigned: {order.deliveryBoyName}
                        </span>
                        {order.deliveryBoyPhone && (
                          <span className="text-slate-500 dark:text-slate-400 block">
                            Phone: <a href={`tel:${order.deliveryBoyPhone}`} className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">{order.deliveryBoyPhone}</a>
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        Delivery partner awaiting dispatch
                      </span>
                    )}
                  </div>

                  {order.deliveryStatus && order.deliveryStatus !== 'NOT_ASSIGNED' && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                        order.deliveryStatus === 'DELIVERED'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : order.deliveryStatus === 'OUT_FOR_DELIVERY'
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : 'bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                      }`}
                    >
                      {order.deliveryStatus.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>

                {/* Visual Order Progress Tracker */}
                {stepIdx >= 0 && (
                  <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 relative">
                      {[
                        { label: 'Placed', icon: Package, idx: 0 },
                        { label: 'Accepted', icon: Check, idx: 1 },
                        { label: 'Preparing', icon: Box, idx: 2 },
                        { label: 'Ready', icon: Box, idx: 3 },
                        { label: 'Out for Delivery', icon: Truck, idx: 4 },
                        { label: 'Delivered', icon: CheckCircle2, idx: 5 },
                      ].map((step) => {
                        const isCompleted = stepIdx >= step.idx;
                        const isCurrent = stepIdx === step.idx;
                        const Icon = step.icon;

                        return (
                          <div key={step.label} className="flex flex-col items-center text-center space-y-1">
                            <div
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                isCurrent
                                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950 shadow-sm'
                                  : isCompleted
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                            <span
                              className={`text-[10px] sm:text-xs font-semibold ${
                                isCompleted ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}


                {/* Rejection Alert if rejected */}
                {order.status === 'REJECTED' && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2 border-b border-rose-100 dark:border-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Order Rejected by Store: </span>
                      <span>{order.rejectionReason || 'The supplier is unable to fulfill this order at this time.'}</span>
                    </div>
                  </div>
                )}

                {/* Items List in Order */}
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {order.items.map((item, idx) => {
                      const shop = typeof item.shopOwner === 'object' ? item.shopOwner : null;
                      return (
                        <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <span className="text-sm font-heading font-bold text-slate-900 dark:text-white">
                              {item.productNameSnapshot}
                            </span>
                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                              <span>
                                Quantity: <strong>{item.quantity} {item.unit}</strong>
                              </span>
                              <span>•</span>
                              <span>Price: ₹{item.price} / {item.unit}</span>
                              {shop?.name && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                    <Store className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>Agri Store Partner: {shop.name}</span>
                                  </span>

                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right font-heading font-black text-slate-900 dark:text-white text-sm">
                            ₹{item.subtotal.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Order Footer with Address & Total & Pay Button */}
                <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300 max-w-md">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Delivery Address: </span>
                      <span>
                        {[
                          order.deliveryAddress.street,
                          order.deliveryAddress.city,
                          order.deliveryAddress.state,
                          order.deliveryAddress.pincode,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    <button
                      onClick={() => toggleTimeline(orderId)}
                      className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold"
                    >
                      <span>Timeline ({order.statusTimeline?.length || 1})</span>
                      {isTimelineOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Amount</span>
                      <span className="text-xl font-heading font-black text-emerald-600 dark:text-emerald-400">₹{order.totalAmount.toFixed(2)}</span>
                    </div>

                    {isPayable ? (
                      <Link
                        to={`/orders/${orderId}/payment`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay Now</span>
                      </Link>
                    ) : order.paymentStatus === 'PAID' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Paid</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Expandable Status Timeline */}
                {isTimelineOpen && order.statusTimeline && order.statusTimeline.length > 0 && (
                  <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-xs font-heading font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
                      Order Tracking Updates
                    </h4>
                    <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700 pl-6">
                      {order.statusTimeline.map((item, idx) => (
                        <div key={idx} className="relative text-xs">
                          <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-white dark:ring-slate-800" />
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider">{item.status}</span>
                            <span className="text-slate-400 text-[10px]">
                              {new Date(item.timestamp).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {item.message && <p className="text-slate-600 dark:text-slate-300 mt-0.5">{item.message}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
