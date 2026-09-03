import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Order } from '../models/Order.model';
import { Payment } from '../models/Payment.model';

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
        status: 'CREATED',
      });
    } else {
      payment.razorpayOrderId = rzpOrder.id;
      payment.amount = amountInINR;
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
    payment.status = 'CAPTURED';
    await payment.save();

    order.paymentStatus = 'PAID';
    order.payment = payment._id;
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

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const isFarmerOwner = order.farmer.toString() === req.user._id.toString();
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
        totalAmount: order.totalAmount,
      },
      payment,
    });
  } catch (error) {
    next(error);
  }
};

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
      res.status(403).json({ success: false, message: 'Forbidden: You can only record payments for your own orders.' });
      return;
    }

    let payment = await Payment.findOne({ order: order._id });
    const upiOrderId = `UPI_DIR_${order.orderNumber}_${Date.now()}`;
    if (!payment) {
      payment = new Payment({
        order: order._id,
        farmer: req.user._id,
        amount: order.totalAmount,
        currency: 'INR',
        status: 'AUTHORIZED',
        razorpayOrderId: upiOrderId,
        razorpayPaymentId: upiRefNumber ? `UPI_UTR_${upiRefNumber}` : `UPI_INTENT_${Date.now()}`,
      });
    } else {
      payment.status = 'AUTHORIZED';
      if (upiRefNumber) {
        payment.razorpayPaymentId = `UPI_UTR_${upiRefNumber}`;
      }
    }
    await payment.save();

    // Set order paymentStatus to PENDING (transparently avoiding false PAID claims)
    order.paymentStatus = 'PENDING';
    order.payment = payment._id;
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Direct UPI payment reference registered. Store Partner notified for verification.',
      order: {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

