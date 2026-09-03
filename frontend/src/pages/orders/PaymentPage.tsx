import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Store,
  MapPin,
  Clock,
  QrCode,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  Info,
  Send,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  getOrderByIdApi,
  createPaymentOrderApi,
  verifyPaymentApi,
  recordDirectUpiPaymentApi,
} from '../../services/api';
import { Order } from '../../types/order';
import { loadRazorpayScript } from '../../utils/loadRazorpay';
import { useTranslation } from '../../context/LanguageContext';
import axios from 'axios';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const PaymentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Dynamic QR Code & UPI State
  const [dynamicQrUrl, setDynamicQrUrl] = useState<string | null>(null);
  const [upiIntentUrl, setUpiIntentUrl] = useState<string>('');
  const [partnerUpiId, setPartnerUpiId] = useState<string>('');
  const [partnerShopName, setPartnerShopName] = useState<string>('');
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);

  // Direct UPI UTR submission
  const [upiUtrNumber, setUpiUtrNumber] = useState<string>('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState<boolean>(false);
  const [utrSubmitted, setUtrSubmitted] = useState<boolean>(false);

  const [verifiedPayment, setVerifiedPayment] = useState<{
    paymentId: string;
    amount: number;
    orderNumber: string;
  } | null>(null);

  // Detect mobile vs desktop
  useEffect(() => {
    const isMobile =
      typeof navigator !== 'undefined' &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobileDevice(isMobile);
  }, []);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await getOrderByIdApi(id);
      if (res.success && res.order) {
        setOrder(res.order);

        // Extract store partner payment info from order items
        const firstItem = res.order.items?.[0];
        let shop = typeof firstItem?.shopOwner === 'object' ? firstItem.shopOwner : null;
        if (!shop && typeof (firstItem?.product as any)?.shopOwner === 'object') {
          shop = (firstItem?.product as any).shopOwner;
        }

        const rawUpi = (shop?.upiId || '').trim();
        const shopName = (shop?.shopName || shop?.name || 'Agri Store Partner').trim();


        if (rawUpi) {
          // Ensure valid standard UPI VPA format
          const formattedUpi = rawUpi.includes('@') ? rawUpi : `${rawUpi}@upi`;
          setPartnerUpiId(formattedUpi);
          setPartnerShopName(shopName);

          const orderRef = res.order.orderNumber;
          const amountStr = Number(res.order.totalAmount).toFixed(2);

          // Standard NPCI UPI URI Specification
          const intent = `upi://pay?pa=${encodeURIComponent(formattedUpi)}&pn=${encodeURIComponent(
            shopName
          )}&am=${encodeURIComponent(amountStr)}&cu=INR&tn=${encodeURIComponent(
            `AgroMitra Order ${orderRef}`
          )}&tr=${encodeURIComponent(orderRef)}`;


          setUpiIntentUrl(intent);

          // Generate dynamic high-contrast QR Code Data URL
          try {
            const qrData = await QRCode.toDataURL(intent, {
              width: 280,
              margin: 2,
              errorCorrectionLevel: 'M',
              color: {
                dark: '#022c22', // High-contrast deep forest green
                light: '#ffffff',
              },
            });
            setDynamicQrUrl(qrData);
          } catch (qrErr) {
            console.error('Failed to generate dynamic QR:', qrErr);
          }
        } else {
          setPartnerUpiId('');
          setPartnerShopName(shopName);
          setUpiIntentUrl('');
          setDynamicQrUrl(null);
        }
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to load order information.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleCopyUpi = () => {
    if (!partnerUpiId) return;
    navigator.clipboard.writeText(partnerUpiId);
    setCopiedUpi(true);
    setSuccessMsg(t('upiCopiedSuccess', 'Store UPI ID copied to clipboard!'));
    setTimeout(() => {
      setCopiedUpi(false);
      setSuccessMsg(null);
    }, 3000);
  };

  const handleCopyLink = () => {
    if (!upiIntentUrl) return;
    navigator.clipboard.writeText(upiIntentUrl);
    setCopiedLink(true);
    setSuccessMsg(t('linkCopiedSuccess', 'Payment link copied to clipboard!'));
    setTimeout(() => {
      setCopiedLink(false);
      setSuccessMsg(null);
    }, 3000);
  };

  const handleRecordDirectUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !upiUtrNumber.trim()) return;

    setIsSubmittingUtr(true);
    setErrorMsg(null);
    try {
      const res = await recordDirectUpiPaymentApi(id, upiUtrNumber.trim(), isMobileDevice ? 'PhonePe/Mobile' : 'QR Scan');
      if (res.success) {
        setUtrSubmitted(true);
        setSuccessMsg(
          'UPI transaction reference submitted. Your order payment status will be updated upon Store Partner verification.'
        );

        await fetchOrder();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Failed to register UPI transaction reference.');
      }
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  const handlePayNow = async () => {
    if (!order || !id) return;
    setErrorMsg(null);
    setIsProcessingPayment(true);

    try {
      // 1. Ensure Razorpay Checkout SDK is loaded
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error('Failed to load Razorpay Checkout SDK. Please check your internet connection.');
      }

      // 2. Call backend create-order endpoint (secure server-side creation)
      const res = await createPaymentOrderApi(id);
      if (!res.success) {
        throw new Error('Failed to initiate server-side payment order.');
      }

      // 3. Configure Razorpay Standard Checkout options
      const options = {
        key: res.keyId,
        amount: res.amountPaise,
        currency: res.currency,
        name: 'AgroMitra Agricultural Platform',
        description: `Payment for Order #${res.orderNumber}`,
        order_id: res.razorpayOrderId,
        prefill: {
          name: res.farmer.name,
          email: res.farmer.email,
          contact: res.farmer.phone,
        },
        theme: {
          color: '#16a34a', // AgroMitra emerald
        },

        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // 4. Send signature to backend for cryptographic HMAC-SHA256 verification
            const verifyRes = await verifyPaymentApi({
              orderId: id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.success) {
              setVerifiedPayment({
                paymentId: response.razorpay_payment_id,
                amount: order.totalAmount,
                orderNumber: order.orderNumber,
              });
              await fetchOrder();
            }
          } catch (verifyErr: unknown) {
            if (axios.isAxiosError(verifyErr) && verifyErr.response?.data?.message) {
              setErrorMsg(verifyErr.response.data.message);
            } else {
              setErrorMsg('Payment signature verification failed. Please contact support.');
            }
          } finally {
            setIsProcessingPayment(false);
          }
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', (failResponse: any) => {
        setIsProcessingPayment(false);
        setErrorMsg(
          failResponse.error?.description || 'Payment was declined or cancelled. Please try again.'
        );
      });
      razorpayInstance.open();
    } catch (err: unknown) {
      setIsProcessingPayment(false);
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to process payment with Razorpay.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center max-w-7xl mx-auto px-4 py-16">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-3" />
        <p className="text-base font-medium text-slate-700 dark:text-slate-300">
          {t('loading', 'Loading order payment details...')}
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">Order Not Found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The requested order could not be located in our database.
        </p>
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('navOrders', 'Back to My Orders')}</span>
        </Link>
      </div>
    );
  }

  // Payment Success Screen (Verified in DB)
  if (verifiedPayment || order.paymentStatus === 'PAID') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-16">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-lg text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Payment</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
              Payment Successful!
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Your payment has been securely verified in AgroMitra. The Agri Store Partner has been notified for packing and delivery dispatch.
            </p>


          </div>

          {/* Payment receipt card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-6 text-left text-xs sm:text-sm space-y-3">
            <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400">Order Reference</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">{order.orderNumber}</span>
            </div>
            {verifiedPayment?.paymentId && (
              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Transaction ID</span>
                <span className="font-bold font-mono text-slate-900 dark:text-white">{verifiedPayment.paymentId}</span>
              </div>
            )}
            <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400">{t('status', 'Payment Status')}</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 uppercase">PAID</span>
            </div>
            <div className="flex justify-between pt-1 text-base font-extrabold text-slate-900 dark:text-white">
              <span>{t('orderTotal', 'Total Paid')}</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-lg font-heading">
                ₹{order.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/orders')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-sm shadow-md transition-all"
            >
              <span>{t('navOrders', 'View My Orders & Track Delivery')}</span>
            </button>
            <Link
              to="/marketplace"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all"
            >
              <span>{t('navMarketplace', 'Explore Marketplace')}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('navOrders', 'Back to My Orders')}</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          <span>{t('paymentTitle', 'Order Payment & Fulfillment')} — #{order.orderNumber}</span>
        </h1>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-sm text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 dark:text-emerald-300 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-sm text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 dark:text-rose-300 text-xs font-semibold">
            {t('cancel', 'Dismiss')}
          </button>
        </div>
      )}

      {/* Dual Payment Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Payment Option 1: Razorpay Checkout */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-sm space-y-5 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                Option 1: Gateway
              </span>
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>

            <h3 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white">
              {t('razorpayOption', 'Razorpay Online Gateway')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Pay with Debit/Credit Cards, NetBanking, UPI, or Wallets with server-side HMAC cryptographic verification.
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Order Reference:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('orderTotal', 'Amount Payable')}:</span>
                <span className="font-heading font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                  ₹{order.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handlePayNow}
            disabled={isProcessingPayment}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-extrabold text-sm shadow-md shadow-emerald-600/30 transition-all disabled:opacity-60"
          >
            {isProcessingPayment ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Opening Gateway...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                <span>{t('payWithRazorpayBtn', 'Pay Now via Razorpay')} (₹{order.totalAmount.toFixed(2)})</span>
              </>
            )}
          </button>
        </div>

        {/* Payment Option 2: Store Partner Dynamic UPI QR Code */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-sm space-y-4 hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                Option 2: Direct Store UPI QR
              </span>
              <QrCode className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>

            <div>
              <h3 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white">
                {t('directUpiOption', 'Direct Agri Store Partner UPI QR')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Store: <strong className="text-slate-900 dark:text-white">{partnerShopName}</strong>
              </p>
            </div>


            {/* Dynamic QR Display & Copy Buttons */}
            {partnerUpiId ? (
              <div className="bg-slate-50 dark:bg-slate-800/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
                {dynamicQrUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={dynamicQrUrl}
                      alt={`Dynamic UPI QR for ${partnerShopName}`}
                      className="w-44 h-44 mx-auto rounded-2xl shadow-md bg-white p-2 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                ) : (
                  <div className="h-44 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-xs text-slate-400">
                    Generating Dynamic QR Code...
                  </div>
                )}

                {/* Amount & Reference Details */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-1 text-left">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Payable Amount:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">₹{order.totalAmount.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Payee UPI VPA:</span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200">{partnerUpiId}</strong>
                  </div>
                </div>

                {/* Device-specific prompt */}
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                  {isMobileDevice
                    ? 'Scan with camera or tap the button below to open your installed UPI application.'
                    : t(
                        'scanQrDesktopPrompt',
                        'Scan this QR code using PhonePe, Google Pay, Paytm, BHIM, or any banking UPI app.'
                      )}
                </p>

                {/* Copy UPI ID & Payment Link */}
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs pt-1">
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    title="Copy Store UPI ID"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 font-mono text-xs shadow-sm transition-all"
                  >
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{partnerUpiId}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    title="Copy Dynamic UPI URI"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold shadow-sm transition-all"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{t('copyPaymentLinkBtn', 'Copy UPI Payment Link')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {t(
                    'paymentErrorMissingUpi',
                    'The Agri Store Partner has not configured a UPI ID. Please pay via Razorpay or contact store.'
                  )}
                </span>
              </div>

            )}
          </div>

          {/* Deep link button */}
          {upiIntentUrl && (
            <a
              href={upiIntentUrl}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-heading font-bold text-xs shadow-sm transition-all"
            >
              <Smartphone className="w-4 h-4" />
              <span>{isMobileDevice ? t('openInPhonePe', 'Open in PhonePe / UPI App') : 'Open in UPI App'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Direct UPI Reference submission */}
          {partnerUpiId && (
            <form onSubmit={handleRecordDirectUpi} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {t(
                  'upiConfirmationNote',
                  'After completing payment in your UPI app, submit reference ID for partner confirmation:'
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={upiUtrNumber}
                  onChange={(e) => setUpiUtrNumber(e.target.value)}
                  placeholder="e.g. 12-digit UPI UTR / Reference ID"
                  disabled={utrSubmitted || isSubmittingUtr}
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!upiUtrNumber.trim() || isSubmittingUtr || utrSubmitted}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1"
                >
                  {isSubmittingUtr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{utrSubmitted ? 'Submitted' : 'Submit UTR'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Payment verification pending — Submitting or opening the UPI application initiates the transfer. Order payment status remains PENDING until verified.
              </p>
            </form>
          )}

        </div>

      </div>

      {/* Order Details & Summary Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs text-slate-400 font-semibold block">Order Reference</span>
            <span className="text-lg font-heading font-black text-slate-900 dark:text-white font-mono">
              {order.orderNumber}
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{orderDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              {t('status', 'Payment Status')}: {order.paymentStatus}
            </span>
          </div>
        </div>

        {/* Products List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
            Order Items Breakdown
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {order.items.map((item, idx) => {
              const shop = typeof item.shopOwner === 'object' ? item.shopOwner : null;
              return (
                <div key={idx} className="py-3 flex items-center justify-between text-xs sm:text-sm">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 dark:text-white block">{item.productNameSnapshot}</span>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                      <span>{item.quantity} {item.unit} × ₹{item.price} / {item.unit}</span>
                      {shop?.name && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <Store className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Supplier: {shop.shopName || shop.name}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="font-heading font-black text-slate-900 dark:text-white">
                    ₹{item.subtotal.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Address */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
          <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900 dark:text-white">{t('addressDetails', 'Delivery Address')}: </span>
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
      </div>
    </div>
  );
};
