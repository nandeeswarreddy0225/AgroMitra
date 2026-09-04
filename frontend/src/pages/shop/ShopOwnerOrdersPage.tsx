import React, { useEffect, useState } from 'react';
import {
  Package,
  Clock,
  RefreshCw,
  User,
  Phone,
  MapPin,
  Loader2,
  X,
  Check,
  Ban,
  ShieldCheck,
  Truck,
  Box,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Search,
  CreditCard,
  TrendingUp,
} from 'lucide-react';
import {
  getShopOwnerOrdersApi,
  updateOrderStatusApi,
  getShopDeliveryBoysApi,
  assignDeliveryBoyToOrderApi,
} from '../../services/api';
import { ShopOwnerOrderView, OrderStatus, OrderPaymentStatus } from '../../types/order';
import { DeliveryBoy } from '../../types/delivery';
import axios from 'axios';

export const ShopOwnerOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<ShopOwnerOrderView[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active filter tab
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED'>('ALL');

  // Search Query state
  const [searchQuery, setSearchQuery] = useState('');

  // Rejection Modal State
  const [rejectModalOrder, setRejectModalOrder] = useState<{ id: string; orderNumber: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Assign Delivery Boy Modal State
  const [assignModalOrder, setAssignModalOrder] = useState<{ id: string; orderNumber: string } | null>(null);
  const [selectedDeliveryBoyId, setSelectedDeliveryBoyId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Expanded timelines map
  const [expandedTimelines, setExpandedTimelines] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [ordersRes, deliveryRes] = await Promise.all([
        getShopOwnerOrdersApi(),
        getShopDeliveryBoysApi().catch(() => ({ success: false, deliveryBoys: [] })),
      ]);

      if (ordersRes.success && Array.isArray(ordersRes.orders)) {
        setOrders(ordersRes.orders);
      }
      if (deliveryRes.success && Array.isArray(deliveryRes.deliveryBoys)) {
        setDeliveryBoys(deliveryRes.deliveryBoys);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to load retail orders and delivery staff.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (
    orderId: string,
    orderNumber: string,
    newStatus: OrderStatus,
    reason?: string,
    paymentStatus?: OrderPaymentStatus
  ) => {
    setUpdatingId(orderId);
    setErrorMsg(null);
    try {
      const res = await updateOrderStatusApi(orderId, newStatus, reason, undefined, paymentStatus);
      if (res.success) {
        setSuccessMsg(`Order ${orderNumber} updated to ${newStatus}${paymentStatus ? ` (Payment: ${paymentStatus})` : ''}.`);
        if (rejectModalOrder) {
          setRejectModalOrder(null);
          setRejectionReason('');
        }
        await fetchData();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg(`Failed to update order status to ${newStatus}.`);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleVerifyPayment = async (orderId: string, orderNumber: string, currentStatus: OrderStatus) => {
    if (!window.confirm(`Confirm payment receipt for Order #${orderNumber}? This will mark payment status as PAID.`)) {
      return;
    }
    await handleUpdateStatus(orderId, orderNumber, currentStatus, undefined, 'PAID');
  };

  const handleAssignDeliveryBoy = async () => {
    if (!assignModalOrder || !selectedDeliveryBoyId) return;

    setIsAssigning(true);
    setErrorMsg(null);
    try {
      const res = await assignDeliveryBoyToOrderApi({
        orderId: assignModalOrder.id,
        deliveryBoyId: selectedDeliveryBoyId,
      });

      if (res.success) {
        setSuccessMsg(`Delivery partner assigned to Order ${assignModalOrder.orderNumber} successfully.`);
        setAssignModalOrder(null);
        setSelectedDeliveryBoyId('');
        await fetchData();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to assign delivery partner. Please try again.');
      }
    } finally {
      setIsAssigning(false);
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

  // Filter orders based on active tab and search query
  const filteredOrders = orders.filter((order) => {
    // Tab filter
    if (activeTab === 'PENDING' && order.status !== 'PENDING') return false;
    if (activeTab === 'IN_PROGRESS' && !['ACCEPTED', 'PROCESSING', 'PACKED', 'DISPATCHED'].includes(order.status)) return false;
    if (activeTab === 'DELIVERED' && !['DELIVERED', 'COMPLETED'].includes(order.status)) return false;
    if (activeTab === 'CANCELLED' && !['CANCELLED', 'REJECTED'].includes(order.status)) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNumber = order.orderNumber.toLowerCase().includes(q);
      const matchFarmer = order.farmer?.name?.toLowerCase().includes(q) || order.farmer?.phone?.includes(q);
      const matchItems = order.items.some((item) => item.productNameSnapshot.toLowerCase().includes(q));
      return matchNumber || matchFarmer || matchItems;
    }

    return true;
  });

  const counts = {
    ALL: orders.length,
    PENDING: orders.filter((o) => o.status === 'PENDING').length,
    IN_PROGRESS: orders.filter((o) => ['ACCEPTED', 'PROCESSING', 'PACKED', 'DISPATCHED'].includes(o.status)).length,
    DELIVERED: orders.filter((o) => ['DELIVERED', 'COMPLETED'].includes(o.status)).length,
    CANCELLED: orders.filter((o) => ['CANCELLED', 'REJECTED'].includes(o.status)).length,
  };

  const totalStoreSales = orders
    .filter((o) => o.status !== 'CANCELLED' && o.status !== 'REJECTED')
    .reduce((acc, curr) => acc + (curr.shopSubtotal || 0), 0);

  const pendingDeliveries = orders.filter((o) => !o.deliveryBoyName && ['ACCEPTED', 'PROCESSING', 'PACKED', 'DISPATCHED'].includes(o.status)).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            <span>Agri Store Partner Orders & Fulfillment</span>
          </h1>

          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review incoming farmer orders, assign delivery staff, process packaging, and track shipments in real-time.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Sales Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Store Sales</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-heading font-black text-slate-900 dark:text-white">
            ₹{totalStoreSales.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Total active order volume</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
            <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-heading font-black text-slate-900 dark:text-white">
            {counts.ALL}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Received orders</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Review</span>
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-heading font-black text-blue-600 dark:text-blue-400">
            {counts.PENDING}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Requires store approval</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Need Dispatch</span>
            <Truck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-heading font-black text-purple-600 dark:text-purple-400">
            {pendingDeliveries}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Awaiting delivery partner</span>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order #, Farmer Name, Phone Number, or Product Name..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          {[
            { key: 'ALL', label: 'All Orders', count: counts.ALL },
            { key: 'PENDING', label: 'Pending Approval', count: counts.PENDING },
            { key: 'IN_PROGRESS', label: 'In Progress', count: counts.IN_PROGRESS },
            { key: 'DELIVERED', label: 'Delivered', count: counts.DELIVERED },
            { key: 'CANCELLED', label: 'Rejected / Cancelled', count: counts.CANCELLED },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-amber-600 text-white shadow-sm'
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
      </div>

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
          <Loader2 className="w-10 h-10 text-amber-600 dark:text-amber-400 animate-spin mb-3" />
          <p className="text-base font-medium text-slate-700 dark:text-slate-300">Loading store partner orders...</p>
        </div>

      ) : filteredOrders.length === 0 ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-white">No orders found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            {activeTab === 'ALL'
              ? 'No farmer purchase orders have been received yet.'
              : `No orders currently match the ${activeTab.toLowerCase().replace('_', ' ')} filter.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => {
            const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            const isUpdating = updatingId === order.id;
            const isTimelineOpen = !!expandedTimelines[order.id];

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all divide-y divide-slate-100 dark:divide-slate-800"
              >
                {/* Header Bar */}
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

                    {/* Delivery Assignment Badge */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase hidden sm:inline">Delivery:</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          order.deliveryBoyName
                            ? 'bg-purple-50 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Truck className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        <span>{order.deliveryBoyName ? `${order.deliveryBoyName}` : 'Unassigned'}</span>
                      </span>
                    </div>

                    {/* Progressive Fulfillment Actions */}
                    <div className="flex items-center gap-2 ml-auto sm:ml-2">
                      {order.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(order.id, order.orderNumber, 'ACCEPTED')}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept Order</span>
                          </button>
                          <button
                            onClick={() => setRejectModalOrder({ id: order.id, orderNumber: order.orderNumber })}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {/* Assign Delivery Partner Button */}
                      {['ACCEPTED', 'PROCESSING', 'PACKED', 'DISPATCHED'].includes(order.status) && (
                        <button
                          onClick={() => setAssignModalOrder({ id: order.id, orderNumber: order.orderNumber })}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-colors"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{order.deliveryBoyName ? 'Change Delivery Partner' : 'Assign Delivery Partner'}</span>
                        </button>
                      )}

                      {order.status === 'ACCEPTED' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, order.orderNumber, 'PREPARING')}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                        >
                          <Box className="w-3.5 h-3.5" />
                          <span>Mark Preparing</span>
                        </button>
                      )}

                      {['PREPARING', 'PROCESSING'].includes(order.status) && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, order.orderNumber, 'READY_FOR_DELIVERY')}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                        >
                          <Box className="w-3.5 h-3.5" />
                          <span>Ready for Delivery</span>
                        </button>
                      )}

                      {['READY_FOR_DELIVERY', 'PACKED'].includes(order.status) && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, order.orderNumber, 'OUT_FOR_DELIVERY')}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Out for Delivery</span>
                        </button>
                      )}

                      {['OUT_FOR_DELIVERY', 'DISPATCHED'].includes(order.status) && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, order.orderNumber, 'DELIVERED')}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Delivered</span>
                        </button>
                      )}

                      {['DELIVERED', 'COMPLETED'].includes(order.status) && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>DELIVERED</span>
                        </span>
                      )}

                      {/* Verify Payment Button */}
                      {order.paymentStatus !== 'PAID' && !['CANCELLED', 'REJECTED'].includes(order.status) && (
                        <button
                          onClick={() => handleVerifyPayment(order.id, order.orderNumber, order.status)}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-xs font-bold transition-colors disabled:opacity-50"
                          title="Mark order payment as received/verified"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Verify Payment</span>
                        </button>
                      )}

                    </div>
                  </div>
                </div>

                {/* Delivery Partner Response & Dispatch Status Banner */}
                {order.deliveryBoyName && (
                  <div
                    className={`p-3.5 sm:px-6 border-b flex flex-wrap items-center justify-between gap-3 text-xs ${
                      order.deliveryResponseStatus === 'REJECTED'
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                        : order.deliveryResponseStatus === 'ACCEPTED'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 shrink-0" />
                      <div>
                        <span className="font-bold">
                          Delivery Partner: {order.deliveryBoyName} {order.deliveryBoyPhone && `(${order.deliveryBoyPhone})`}
                        </span>
                        <span className="block text-[11px] opacity-90 mt-0.5">
                          {order.deliveryResponseStatus === 'REJECTED'
                            ? `Delivery Partner rejected this assignment: ${order.deliveryRejectionReason || 'Unavailable'}. Please assign another available partner.`
                            : order.deliveryResponseStatus === 'ACCEPTED'
                            ? `Delivery Partner accepted the assignment. Status: ${(order.deliveryStatus || 'ACCEPTED').replace(/_/g, ' ')}`
                            : 'Assigned to Delivery Partner. Awaiting response (PENDING)...'}
                        </span>
                      </div>
                    </div>

                    {order.deliveryResponseStatus === 'REJECTED' && (
                      <button
                        onClick={() => setAssignModalOrder({ id: order.id, orderNumber: order.orderNumber })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Re-assign Delivery Partner</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Farmer Customer Info */}
                <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-800/40 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">

                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">Farmer Customer:</span>
                      <strong className="text-slate-900 dark:text-white text-sm">{order.farmer?.name}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">Contact Phone:</span>
                      <strong className="text-slate-900 dark:text-white text-sm">{order.farmer?.phone}</strong>
                    </div>
                  </div>
                </div>

                {/* Rejection notice if order was rejected */}
                {order.status === 'REJECTED' && order.rejectionReason && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2 border-b border-rose-100 dark:border-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Rejection Reason: </span>
                      <span>{order.rejectionReason}</span>
                    </div>
                  </div>
                )}

                {/* Products in this order */}
                <div className="p-4 sm:p-6 space-y-3">
                  <span className="text-xs font-heading font-bold text-slate-900 dark:text-white uppercase tracking-wide block">
                    Products in this Order
                  </span>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="font-heading font-bold text-slate-900 dark:text-white text-sm block">
                            {item.productNameSnapshot}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            Quantity: <strong>{item.quantity} {item.unit}</strong> @ ₹{item.price} / {item.unit}
                          </span>
                        </div>

                        <span className="font-heading font-black text-slate-900 dark:text-white text-sm">
                          ₹{item.subtotal.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Address & Store Subtotal */}
                <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300 max-w-md">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Farmer Delivery Address: </span>
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

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleTimeline(order.id)}
                      className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 font-semibold"
                    >
                      <span>Timeline ({order.statusTimeline?.length || 1})</span>
                      {isTimelineOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Retail Total</span>
                      <span className="text-xl font-heading font-black text-amber-600 dark:text-amber-400">₹{order.shopSubtotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Expandable Status Timeline */}
                {isTimelineOpen && order.statusTimeline && order.statusTimeline.length > 0 && (
                  <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-xs font-heading font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
                      Order Fulfillment & Delivery History
                    </h4>
                    <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700 pl-6">
                      {order.statusTimeline.map((item, idx) => (
                        <div key={idx} className="relative text-xs">
                          <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-amber-600 ring-4 ring-white dark:ring-slate-800" />
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

      {/* Assign Delivery Partner Modal */}
      {assignModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>Assign Delivery Agent</span>
              </h3>
              <button
                onClick={() => {
                  setAssignModalOrder(null);
                  setSelectedDeliveryBoyId('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select an authorized delivery partner registered under your dealership for order <strong>#{assignModalOrder.orderNumber}</strong>.
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Available Delivery Staff ({deliveryBoys.length})
              </label>

              {deliveryBoys.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs text-center border border-slate-200 dark:border-slate-700">
                  No delivery personnel currently available. You can fulfill orders directly using the delivery status buttons above.
                </div>
              ) : (

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {deliveryBoys.map((db) => {
                    const isSelected = selectedDeliveryBoyId === db.id;
                    return (
                      <div
                        key={db.id}
                        onClick={() => setSelectedDeliveryBoyId(db.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/50 shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-slate-900 dark:text-white">{db.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{db.phone}</span>
                            <span>•</span>
                            <span>{db.vehicleType}</span>
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setAssignModalOrder(null);
                  setSelectedDeliveryBoyId('');
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignDeliveryBoy}
                disabled={!selectedDeliveryBoyId || isAssigning}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-colors disabled:opacity-50"
              >
                {isAssigning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Assign Staff</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Order Reason Modal */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 transition-colors">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <span>Reject Order #{rejectModalOrder.orderNumber}</span>
              </h3>
              <button
                onClick={() => {
                  setRejectModalOrder(null);
                  setRejectionReason('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Please provide a reason for rejecting this order. The farmer will be notified and any reserved product inventory will be automatically restored to your stock.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Rejection <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Out of stock, delivery location unreachable, etc."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setRejectModalOrder(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleUpdateStatus(
                    rejectModalOrder.id,
                    rejectModalOrder.orderNumber,
                    'REJECTED',
                    rejectionReason || 'Supplier unable to fulfill'
                  )
                }
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
