import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Order } from '../models/Order.model';
import { Payment } from '../models/Payment.model';
import { StorePaymentConfig } from '../models/StorePaymentConfig.model';
import { User } from '../models/User.model';

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error('Razorpay API keys are not configured in server environment.');
  }

  return new Razorpay({
    key_id,
    key_secret,
  });
};

// ----------------------------------------------------------------------
// STORE PAYMENT CONFIGURATION (ADMIN ONLY)
// ----------------------------------------------------------------------

export const getStorePaymentConfig = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const config = await StorePaymentConfig.findOne({ isActive: true }).sort({ updatedAt: -1 });

    if (!config || !config.upiId || !config.upiId.trim()) {
      res.status(200).json({
        success: true,
        configured: false,
        config: null,
        message: 'The Agri Store Partner has not configured a UPI ID.',
      });
      return;
    }

    const configData = {
      id: config._id.toString(),
      storeName: config.storeName,
      upiId: config.upiId,
      phoneNumber: config.phoneNumber || '',
      merchantName: config.merchantName || config.storeName,
      isActive: config.isActive,
      updatedAt: config.updatedAt,
    };

    res.status(200).json({
      success: true,
      configured: true,
      config: configData,
      data: configData,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStorePaymentConfig = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const isAuthorized =
      req.user.role === 'ADMIN' || req.user.role === 'SHOP_OWNER' || req.user.role === 'AGRI_PARTNER';

    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Only authorized Administrators or Agri Store Partners can configure store payment settings.',
      });
      return;
    }

    const { storeName, upiId, phoneNumber, merchantName, isActive } = req.body;

    if (!storeName || typeof storeName !== 'string' || !storeName.trim()) {
      res.status(400).json({
        success: false,
        message: 'Store name is required.',
      });
      return;
    }

    if (!upiId || typeof upiId !== 'string' || !upiId.trim()) {
      res.status(400).json({
        success: false,
        message: 'Valid UPI ID is required (e.g. store@bank).',
      });
      return;
    }

    const cleanUpi = upiId.trim();
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,100}@[a-zA-Z0-9]{2,64}$/;
    if (!upiRegex.test(cleanUpi)) {
      res.status(400).json({
        success: false,
        message: 'Invalid UPI ID format. UPI ID must be in the format username@bank (e.g. store@icici or 9876543210@upi).',
      });
      return;
    }

    const cleanStoreName = storeName.trim();
    const cleanMerchant = (merchantName || cleanStoreName).trim();
    const cleanPhone = (phoneNumber || '').trim();
    const activeFlag = isActive !== undefined ? Boolean(isActive) : true;

    // Find existing config or create new
    let config = await StorePaymentConfig.findOne({}).sort({ updatedAt: -1 });
    if (!config) {
      config = new StorePaymentConfig({
        storeName: cleanStoreName,
        upiId: cleanUpi,
        phoneNumber: cleanPhone,
        merchantName: cleanMerchant,
        isActive: activeFlag,
        updatedBy: req.user._id,
      });
    } else {
      config.storeName = cleanStoreName;
      config.upiId = cleanUpi;
      config.phoneNumber = cleanPhone;
      config.merchantName = cleanMerchant;
      config.isActive = activeFlag;
      config.updatedBy = req.user._id;
    }

    await config.save();

    // Also update Admin user's upiId & shopName for full ecosystem compatibility
    await User.findByIdAndUpdate(req.user._id, {
      upiId: cleanUpi,
      shopName: cleanStoreName,
    });

    const configData = {
      id: config._id.toString(),
      storeName: config.storeName,
      upiId: config.upiId,
      phoneNumber: config.phoneNumber,
      merchantName: config.merchantName,
      isActive: config.isActive,
      updatedAt: config.updatedAt,
    };

    res.status(200).json({
      success: true,
      message: 'Store payment UPI configuration saved successfully.',
      config: configData,
      data: configData,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStorePaymentConfig = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const isAuthorized =
      req.user.role === 'ADMIN' || req.user.role === 'SHOP_OWNER' || req.user.role === 'AGRI_PARTNER';

    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Only authorized Administrators or Agri Store Partners can delete store payment settings.',
      });
      return;
    }

    await StorePaymentConfig.updateMany({}, { $set: { isActive: false, upiId: '' } });
    await User.findByIdAndUpdate(req.user._id, { upiId: '' });

    res.status(200).json({
      success: true,
      message: 'Store UPI payment configuration removed/deactivated.',
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------
// ORDER DYNAMIC UPI DETAILS (SERVER-VALIDATED AMOUNT)
// ----------------------------------------------------------------------

export const getOrderUpiDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { orderId } = req.params;
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      res.status(400).json({ success: false, message: 'Valid Order ID is required.' });
      return;
    }

    const order = await Order.findById(orderId).populate('farmer', 'name email phone');
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const userIdStr = req.user._id.toString();
    const isFarmerOwner = (order.farmer as any)?._id?.toString() === userIdStr || order.farmer.toString() === userIdStr;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isFarmerOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You can only view payment details for your own orders.',
      });
      return;
    }

    // 1. Check if this order already has an established Payment transaction snapshot
    const existingPayment = await Payment.findOne({ order: order._id }).sort({ createdAt: -1 });

    let rawUpi = '';
    let storeName = '';
    let merchantName = '';
    let phone = '';

    if (existingPayment && existingPayment.upiId && existingPayment.paymentMethod === 'UPI_QR') {
      rawUpi = existingPayment.upiId.trim();
      storeName = existingPayment.storeName?.trim() || 'AgroMitra Agri Store';
      merchantName = storeName;
    } else {
      // 2. Fetch latest active StorePaymentConfig from MongoDB
      const storeConfig = await StorePaymentConfig.findOne({ isActive: true }).sort({ updatedAt: -1 });

      rawUpi = storeConfig?.upiId?.trim() || '';
      storeName = storeConfig?.storeName?.trim() || '';
      merchantName = storeConfig?.merchantName?.trim() || storeName || 'AgroMitra Agri Store';
      phone = storeConfig?.phoneNumber?.trim() || '';

      // Fallback check on shopOwner/Admin user document if StorePaymentConfig not explicitly populated
      if (!rawUpi) {
        const adminUser = await User.findOne({ role: 'ADMIN', upiId: { $exists: true, $ne: '' } });
        if (adminUser && adminUser.upiId && adminUser.upiId.trim()) {
          rawUpi = adminUser.upiId.trim();
          storeName = adminUser.shopName || adminUser.name || 'AgroMitra Super Store';
          merchantName = storeName;
          phone = adminUser.phone || '';
        }
      }
    }

    if (!rawUpi) {
      res.status(200).json({
        success: true,
        upiConfigured: false,
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        message: 'The Agri Store Partner has not configured a UPI ID. Please pay via Razorpay or contact store.',
      });
      return;
    }

    // Standard NPCI UPI URI Specification with server-validated amount from MongoDB Order
    const formattedUpi = rawUpi.trim();
    const amountStr = Number(order.totalAmount).toFixed(2);
    // Minimal Standard NPCI UPI URI Specification: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR
    const upiIntentUrl = `upi://pay?pa=${formattedUpi}&pn=${encodeURIComponent(
      merchantName
    )}&am=${amountStr}&cu=INR`;

    const upiResponseData = {
      storeName: storeName || merchantName,
      merchantName,
      upiId: formattedUpi,
      phoneNumber: phone,
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      amount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      upiIntentUrl,
      upiUri: upiIntentUrl,
    };

    res.status(200).json({
      success: true,
      upiConfigured: true,
      ...upiResponseData,
      data: upiResponseData,
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------
// RAZORPAY PAYMENT WORKFLOW
// ----------------------------------------------------------------------

export const createPaymentOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { orderId } = req.body;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      res.status(400).json({ success: false, message: 'Valid AgriMart Order ID is required.' });
      return;
    }

    const order = await Order.findById(orderId).populate('farmer', 'name email phone');
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    // Security: Only the farmer who placed the order can initiate payment
    const farmerIdStr = (order.farmer as any)?._id?.toString() || order.farmer.toString();
    if (farmerIdStr !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You can only make payments for your own orders.',
      });
      return;
    }

    // Duplicate Payment Protection
    if (order.paymentStatus === 'PAID') {
      res.status(400).json({
        success: false,
        message: 'This order has already been paid.',
      });
      return;
    }

    if (order.status === 'CANCELLED' || order.status === 'REJECTED') {
      res.status(400).json({
        success: false,
        message: `Cannot pay for an order with status ${order.status}.`,
      });
      return;
    }

    // Calculate amount from trusted MongoDB Order total
    const amountInINR = order.totalAmount;
    const amountPaise = Math.round(amountInINR * 100);

    if (amountPaise <= 0) {
      res.status(400).json({ success: false, message: 'Invalid order amount for payment.' });
      return;
    }

    const razorpay = getRazorpayInstance();

    // Create server-side Razorpay Order
    const rzpOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: order.orderNumber,
      notes: {
        agrimartOrderId: order._id.toString(),
        orderNumber: order.orderNumber,
        farmerId: req.user._id.toString(),
      },
    });

    // Store/Update Payment document in MongoDB
    let payment = await Payment.findOne({ order: order._id, status: 'CREATED' });
    if (!payment) {
      payment = new Payment({
        order: order._id,
        farmer: req.user._id,
        razorpayOrderId: rzpOrder.id,
        amount: amountInINR,
        currency: 'INR',
        paymentMethod: 'RAZORPAY',
        status: 'CREATED',
      });
    } else {
      payment.razorpayOrderId = rzpOrder.id;
      payment.amount = amountInINR;
      payment.paymentMethod = 'RAZORPAY';
      payment.status = 'CREATED';
    }
    await payment.save();

    // Return ONLY safe frontend parameters (NEVER return secret)
    res.status(200).json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: rzpOrder.id,
      amount: amountInINR,
      amountPaise,
      currency: 'INR',
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      farmer: {
        name: (order.farmer as any)?.name || req.user.name,
        email: (order.farmer as any)?.email || req.user.email,
        phone: (order.farmer as any)?.phone || req.user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!orderId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      res.status(400).json({
        success: false,
        message: 'Missing required payment verification parameters.',
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      res.status(400).json({ success: false, message: 'Valid Order ID is required.' });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const farmerIdStr = order.farmer.toString();
    if (farmerIdStr !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You can only verify payments for your own orders.',
      });
      return;
    }

    // Retrieve the server-created Razorpay order ID stored in MongoDB
    let payment = await Payment.findOne({
      order: order._id,
      razorpayOrderId: razorpay_order_id,
    });

    if (!payment) {
      payment = await Payment.findOne({ order: order._id }).sort({ createdAt: -1 });
    }

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'No corresponding payment record found for this order.',
      });
      return;
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      res.status(500).json({
        success: false,
        message: 'Server configuration error: Key Secret missing.',
      });
      return;
    }

    // Cryptographic signature verification using HMAC-SHA256
    const serverStoredRazorpayOrderId = payment.razorpayOrderId;
    const bodyToSign = `${serverStoredRazorpayOrderId}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(bodyToSign)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
    const receivedBuffer = Buffer.from(razorpay_signature, 'utf-8');

    let isSignatureValid = false;
    if (expectedBuffer.length === receivedBuffer.length) {
      isSignatureValid = crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    }

    if (!isSignatureValid) {
      payment.status = 'FAILED';
      await payment.save();

      order.paymentStatus = 'FAILED';
      await order.save();

      res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Payment verification failed.',
      });
      return;
    }

    // Signature verified successfully -> Mark CAPTURED & Order PAID
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.paymentMethod = 'RAZORPAY';
    payment.status = 'CAPTURED';
    await payment.save();

    order.paymentStatus = 'PAID';
    order.paymentMethod = 'RAZORPAY';
    order.payment = payment._id;
    if (!order.statusTimeline) order.statusTimeline = [];
    order.statusTimeline.push({
      status: order.status,
      timestamp: new Date(),
      message: `Payment verified successfully via Razorpay (Txn ID: ${razorpay_payment_id})`,
    });
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified and order marked as PAID.',
      order: {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
      },
      payment: {
        id: payment._id.toString(),
        razorpayPaymentId: payment.razorpayPaymentId,
        razorpayOrderId: payment.razorpayOrderId,
        amount: payment.amount,
        status: payment.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      res.status(404).json({ success: false, message: 'Invalid order ID.' });
      return;
    }

    const order = await Order.findById(orderId).populate('farmer', 'name email phone address');
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const isFarmerOwner = order.farmer._id.toString() === req.user._id.toString();
    const isShopOwnerOfItem = order.items.some(
      (item) => item.shopOwner.toString() === req.user?._id.toString()
    );
    const isAdmin = req.user.role === 'ADMIN';

    if (!isFarmerOwner && !isShopOwnerOfItem && !isAdmin) {
      res.status(403).json({ success: false, message: 'Forbidden: You cannot view this payment.' });
      return;
    }

    const payment = await Payment.findOne({ order: order._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      order: {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalAmount,
      },
      payment,
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------
// DIRECT STORE PARTNER UPI PAYMENT RECORDING (CUSTOMER SUBMISSION)
// ----------------------------------------------------------------------

export const recordDirectUpiPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { orderId, upiRefNumber, upiPayerApp } = req.body;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      res.status(400).json({ success: false, message: 'Valid Order ID is required.' });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const farmerIdStr = order.farmer.toString();
    if (farmerIdStr !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You can only record payments for your own orders.',
      });
      return;
    }

    let payment = await Payment.findOne({ order: order._id });
    const upiOrderId = `UPI_DIR_${order.orderNumber}_${Date.now()}`;
    const cleanRef = (upiRefNumber || '').trim();

    // Fetch active StorePaymentConfig to lock the transaction snapshot
    const activeStoreConfig = await StorePaymentConfig.findOne({ isActive: true }).sort({ updatedAt: -1 });
    const activeUpi = activeStoreConfig?.upiId?.trim() || '';
    const activeStoreName = activeStoreConfig?.storeName?.trim() || activeStoreConfig?.merchantName?.trim() || 'AgroMitra Agri Store';

    if (!payment) {
      payment = new Payment({
        order: order._id,
        farmer: req.user._id,
        amount: order.totalAmount,
        currency: 'INR',
        paymentMethod: 'UPI_QR',
        status: 'AUTHORIZED',
        razorpayOrderId: upiOrderId,
        razorpayPaymentId: cleanRef ? `UPI_UTR_${cleanRef}` : `UPI_INTENT_${Date.now()}`,
        upiTransactionId: cleanRef || undefined,
        upiPayerApp: upiPayerApp || 'UPI App',
        upiId: activeUpi || undefined,
        storeName: activeStoreName || undefined,
      });
    } else {
      payment.status = 'AUTHORIZED';
      payment.paymentMethod = 'UPI_QR';
      if (cleanRef) {
        payment.razorpayPaymentId = `UPI_UTR_${cleanRef}`;
        payment.upiTransactionId = cleanRef;
      }
      if (upiPayerApp) {
        payment.upiPayerApp = upiPayerApp;
      }
      if (!payment.upiId && activeUpi) {
        payment.upiId = activeUpi;
        payment.storeName = activeStoreName;
      }
    }
    await payment.save();

    // Maintain paymentStatus as PENDING until verified by Admin/Store Partner
    order.paymentStatus = 'PENDING';
    order.paymentMethod = 'UPI_QR';
    order.payment = payment._id;
    if (!order.statusTimeline) order.statusTimeline = [];
    order.statusTimeline.push({
      status: order.status,
      timestamp: new Date(),
      message: cleanRef
        ? `UPI Transaction Reference #${cleanRef} submitted by customer. Awaiting verification.`
        : 'UPI payment QR scan initiated by customer. Awaiting payment reference.',
    });
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Direct UPI payment reference registered. Store Partner notified for verification.',
      order: {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------------
// ADMIN PAYMENT VERIFICATION WORKFLOW
// ----------------------------------------------------------------------

export const getAdminPayments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SHOP_OWNER' && req.user.role !== 'AGRI_PARTNER')) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view store payment records.',
      });
      return;
    }

    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .populate('farmer', 'name email phone address')
      .populate('payment');

    const paymentRecords = orders.map((order) => {
      const paymentDoc = order.payment as any;
      return {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod || 'UPI_QR',
        farmer: {
          name: (order.farmer as any)?.name || 'Farmer Customer',
          phone: (order.farmer as any)?.phone || '',
          email: (order.farmer as any)?.email || '',
        },
        transactionId: paymentDoc?.upiTransactionId || paymentDoc?.razorpayPaymentId || 'N/A',
        paymentCreatedAt: paymentDoc?.createdAt || order.createdAt,
        verifiedAt: paymentDoc?.verifiedAt,
        verifiedBy: paymentDoc?.verifiedBy,
        adminNotes: paymentDoc?.adminNotes,
      };
    });

    res.status(200).json({
      success: true,
      count: paymentRecords.length,
      payments: paymentRecords,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyDirectUpiPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SHOP_OWNER' && req.user.role !== 'AGRI_PARTNER')) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Only authorized admins or store partners can verify direct UPI payments.',
      });
      return;
    }

    const { orderId, status, notes } = req.body;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      res.status(400).json({ success: false, message: 'Valid Order ID is required.' });
      return;
    }

    if (!['PAID', 'FAILED'].includes(status)) {
      res.status(400).json({ success: false, message: "Status must be either 'PAID' or 'FAILED'." });
      return;
    }

    const order = await Order.findById(orderId).populate('farmer', 'name email phone');
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    let payment = await Payment.findOne({ order: order._id });
    if (!payment) {
      payment = new Payment({
        order: order._id,
        farmer: order.farmer,
        amount: order.totalAmount,
        currency: 'INR',
        paymentMethod: order.paymentMethod || 'UPI_QR',
        razorpayOrderId: `UPI_VERIFIED_${order.orderNumber}`,
      });
    }

    payment.status = status === 'PAID' ? 'CAPTURED' : 'FAILED';
    payment.verifiedBy = req.user._id;
    payment.verifiedAt = new Date();
    if (notes) payment.adminNotes = notes;
    await payment.save();

    order.paymentStatus = status as any;
    order.payment = payment._id;
    if (!order.statusTimeline) order.statusTimeline = [];
    order.statusTimeline.push({
      status: order.status,
      timestamp: new Date(),
      message: `Payment status marked as ${status} by ${req.user.name} (${req.user.role})${notes ? `: ${notes}` : ''}`,
    });
    await order.save();

    res.status(200).json({
      success: true,
      message: `Payment successfully marked as ${status}.`,
      order: {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
      },
    });
  } catch (error) {
    next(error);
  }
};
