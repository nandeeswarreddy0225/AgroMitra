import React, { useEffect, useState } from 'react';
import {
  Truck,
  CheckCircle2,
  AlertCircle,
  Package,
  MapPin,
  Phone,
  RefreshCw,
  Loader2,
  Calendar,
  Check,
  User,
  Store,
  X,
  Ban,
  BellRing,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

import {
  getDeliveryBoyOrdersApi,
  respondToDeliveryAssignmentApi,
  updateDeliveryStatusApi,
} from '../../services/api';
import { DeliveryStatus } from '../../types/delivery';
import axios from 'axios';

export const DeliveryBoyDashboard: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reject modal state
  const [rejectModalOrder, setRejectModalOrder] = useState<{ id: string; orderNumber: string } | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const fetchOrders = async () => {
    setIsLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await getDeliveryBoyOrdersApi();
      if (res.success && Array.isArray(res.orders)) {
        setOrders(res.orders);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setFeedbackMsg({ type: 'error', text: err.response.data.message });
      } else {
        setFeedbackMsg({ type: 'error', text: 'Failed to fetch assigned shipments from server.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleRespond = async (orderId: string, action: 'ACCEPT' | 'REJECT', reason?: string) => {
    setUpdatingOrderId(orderId);
    setFeedbackMsg(null);
    try {
      const res = await respondToDeliveryAssignmentApi(orderId, { action, reason });
      if (res.success) {
        setFeedbackMsg({
          type: 'success',
          text:
            action === 'ACCEPT'
              ? 'Delivery assignment accepted! You can now proceed with store pickup.'
              : 'Delivery assignment rejected and returned to Agri Store Partner.',

        });
        if (rejectModalOrder) {
          setRejectModalOrder(null);
          setRejectReason('');
        }
        await fetchOrders();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setFeedbackMsg({ type: 'error', text: err.response.data.message });
      } else {
        setFeedbackMsg({ type: 'error', text: `Failed to ${action.toLowerCase()} delivery assignment.` });
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleStatusUpdate = async (orderId: string, status: DeliveryStatus, note?: string) => {
    setUpdatingOrderId(orderId);
    setFeedbackMsg(null);
    try {
      const res = await updateDeliveryStatusApi(orderId, status, note);
      if (res.success) {
        setFeedbackMsg({
          type: 'success',
          text: `Delivery status updated to ${status.replace(/_/g, ' ')}.`,
        });
        await fetchOrders();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setFeedbackMsg({ type: 'error', text: err.response.data.message });
      } else {
        setFeedbackMsg({ type: 'error', text: 'Failed to update delivery status. Please try again.' });
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Categorize orders
  const pendingRequests = orders.filter(
    (o) => o.deliveryResponseStatus === 'PENDING' || (!o.deliveryResponseStatus && o.deliveryStatus === 'PENDING_ACCEPTANCE')
  );

  const activeDeliveries = orders.filter(
    (o) =>
      o.deliveryResponseStatus === 'ACCEPTED' &&
      o.deliveryStatus !== 'DELIVERED' &&
      o.deliveryStatus !== 'REJECTED'
  );

  const completedDeliveries = orders.filter((o) => o.deliveryStatus === 'DELIVERED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 dark:text-white">
              Delivery Partner Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Welcome back, <strong className="text-slate-900 dark:text-white">{user?.name || 'Delivery Partner'}</strong> • Agri Supply Dispatch
            </p>
          </div>
        </div>

        <button
          onClick={fetchOrders}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Deliveries</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs font-bold opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 transition-colors">
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
            New Requests
          </span>
          <p className="text-2xl font-heading font-black text-amber-700 dark:text-amber-400">
            {pendingRequests.length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 transition-colors">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
            Active Deliveries
          </span>
          <p className="text-2xl font-heading font-black text-blue-700 dark:text-blue-400">
            {activeDeliveries.length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 transition-colors">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
            Delivered
          </span>
          <p className="text-2xl font-heading font-black text-emerald-700 dark:text-emerald-400">
            {completedDeliveries.length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 transition-colors">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
            Total Handled
          </span>
          <p className="text-2xl font-heading font-black text-slate-900 dark:text-white">{orders.length}</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. NEW DELIVERY REQUESTS SECTION (Pending Acceptance)          */}
      {/* ------------------------------------------------------------- */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50/60 dark:bg-amber-950/30 rounded-3xl p-6 sm:p-8 border border-amber-200 dark:border-amber-800/60 shadow-sm space-y-6">
          <div className="border-b border-amber-200/80 dark:border-amber-800/60 pb-3 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-heading font-extrabold text-amber-950 dark:text-amber-200 flex items-center gap-2">
              <BellRing className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-bounce" />
              <span>New Delivery Requests ({pendingRequests.length})</span>
            </h2>
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-700">
              Action Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendingRequests.map((order) => {
              const orderId = order.id || order._id;
              const isUpdating = updatingOrderId === orderId;
              const firstItem = order.items?.[0];
              const shop = typeof firstItem?.shopOwner === 'object' ? firstItem.shopOwner : null;

              return (
                <div
                  key={orderId}
                  className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-amber-300 dark:border-amber-700/80 shadow-md space-y-5"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Order Reference
                      </span>
                      <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                        {order.orderNumber}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 uppercase">
                      Pending Acceptance
                    </span>
                  </div>

                  {/* Store & Pickup Info */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                      <Store className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Store: {shop?.shopName || shop?.name || 'Agri Store Partner'}</span>
                    </div>

                    {shop?.phone && (
                      <p className="text-slate-500 dark:text-slate-400 pl-5">
                        Phone: <a href={`tel:${shop.phone}`} className="text-emerald-600 font-semibold">{shop.phone}</a>
                      </p>
                    )}
                  </div>

                  {/* Delivery Location / Farmer Info */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>
                        Deliver To: {order.farmer?.name || 'Farmer'} ({order.deliveryAddress?.city}, {order.deliveryAddress?.pincode})
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 pl-5">
                      Address: {order.deliveryAddress?.street}, {order.deliveryAddress?.city}, {order.deliveryAddress?.state} - {order.deliveryAddress?.pincode}
                    </p>
                    {order.farmer?.phone && (
                      <p className="text-slate-500 dark:text-slate-400 pl-5">
                        Farmer Phone: <a href={`tel:${order.farmer.phone}`} className="text-emerald-600 font-semibold">{order.farmer.phone}</a>
                      </p>
                    )}
                  </div>

                  {/* Items Summary & Total Amount */}
                  <div className="text-xs space-y-1 pt-1">
                    <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300">
                      <span>Items:</span>
                      <span>
                        {order.items?.map((it: any) => `${it.productNameSnapshot} (×${it.quantity})`).join(', ')}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>Order Total:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">
                        ₹{Number(order.totalAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Response Actions: ACCEPT or REJECT */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleRespond(orderId, 'ACCEPT')}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                    >
                      {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>ACCEPT DELIVERY</span>
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() =>
                        setRejectModalOrder({
                          id: orderId,
                          orderNumber: order.orderNumber,
                        })
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>REJECT</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. ACTIVE SHIPMENTS SECTION                                    */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Active & Assigned Deliveries ({orders.length})</span>
          </h2>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading assigned deliveries...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Truck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-heading font-bold text-slate-900 dark:text-white">No Orders Assigned Yet</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              When an Agri Store Partner assigns deliveries to you, they will appear here.
            </p>

          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const orderId = order.id || order._id;
              const currentStatus = order.deliveryStatus || 'ASSIGNED';
              const isUpdating = updatingOrderId === orderId;


              return (
                <div
                  key={orderId}
                  className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-5"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-black text-slate-900 dark:text-white px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {order.orderNumber}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          currentStatus === 'DELIVERED'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : currentStatus === 'OUT_FOR_DELIVERY'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : currentStatus === 'REJECTED'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {currentStatus.replace(/_/g, ' ')}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Payment: {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Customer & Destination Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                        Farmer Details
                      </span>
                      <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{order.farmer?.name || 'Farmer Customer'}</span>
                      </p>
                      {order.farmer?.phone && (
                        <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <a href={`tel:${order.farmer.phone}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">
                            {order.farmer.phone}
                          </a>
                        </p>
                      )}
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                        Delivery Destination
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>
                          {order.deliveryAddress?.street}, {order.deliveryAddress?.city}, {order.deliveryAddress?.state} - {order.deliveryAddress?.pincode}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Package Items */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Package Items:</span>
                    <div className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-4">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {item.productNameSnapshot}
                          </span>
                          <span className="font-bold text-slate-500">
                            Qty: {item.quantity} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status Progression Actions */}
                  {order.deliveryResponseStatus === 'ACCEPTED' && currentStatus !== 'DELIVERED' && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mr-2">
                        Update Shipment Stage:
                      </span>

                      {currentStatus === 'ACCEPTED' && (
                        <button
                          onClick={() => handleStatusUpdate(orderId, 'PICKED_UP', 'Package picked up from retail dealer')}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
                          <span>Confirm Store Pickup</span>
                        </button>
                      )}

                      {(currentStatus === 'ACCEPTED' || currentStatus === 'PICKED_UP' || currentStatus === 'READY_FOR_DELIVERY') && (
                        <button
                          onClick={() => handleStatusUpdate(orderId, 'OUT_FOR_DELIVERY', 'Shipment is out for delivery to farm')}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                          <span>Start Dispatch (Out for Delivery)</span>
                        </button>
                      )}

                      {currentStatus === 'OUT_FOR_DELIVERY' && (
                        <button
                          onClick={() => handleStatusUpdate(orderId, 'DELIVERED', 'Package safely delivered to farmer')}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                        >
                          {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          <span>Mark Order Delivered</span>
                        </button>
                      )}
                    </div>
                  )}

                  {currentStatus === 'DELIVERED' && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold">Shipment successfully delivered and closed.</span>
                    </div>
                  )}

                  {currentStatus === 'REJECTED' && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                      <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-bold">
                        Assignment Rejected: {order.deliveryRejectionReason || 'Unavailable'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 transition-colors">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <span>Reject Delivery Assignment</span>
              </h3>
              <button
                onClick={() => {
                  setRejectModalOrder(null);
                  setRejectReason('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Please let the Agri Store Partner know why you cannot accept this assignment for order <strong>#{rejectModalOrder.orderNumber}</strong>.
            </p>


            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Rejection
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Schedule conflict, distance too far, vehicle maintenance..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setRejectModalOrder(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRespond(rejectModalOrder.id, 'REJECT', rejectReason)}
                disabled={updatingOrderId === rejectModalOrder.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
              >
                {updatingOrderId === rejectModalOrder.id ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
