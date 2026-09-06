import { Router } from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  getPaymentDetails,
  recordDirectUpiPayment,
  getStorePaymentConfig,
  updateStorePaymentConfig,
  deleteStorePaymentConfig,
  getOrderUpiDetails,
  getAdminPayments,
  verifyDirectUpiPayment,
} from '../controllers/payment.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

export const paymentRouter = Router();

// Store Payment UPI Configuration
paymentRouter.get('/store-config', getStorePaymentConfig);
paymentRouter.put('/store-config', authenticate, authorize('ADMIN', 'SHOP_OWNER', 'AGRI_PARTNER'), updateStorePaymentConfig);
paymentRouter.post('/store-config', authenticate, authorize('ADMIN', 'SHOP_OWNER', 'AGRI_PARTNER'), updateStorePaymentConfig);
paymentRouter.delete('/store-config', authenticate, authorize('ADMIN', 'SHOP_OWNER', 'AGRI_PARTNER'), deleteStorePaymentConfig);

// Order Dynamic UPI details (server validated)
paymentRouter.get('/order/:orderId/upi', authenticate, getOrderUpiDetails);

// Create Razorpay order (Farmer only)
paymentRouter.post(
  '/create-order',
  authenticate,
  authorize('FARMER', 'ADMIN'),
  createPaymentOrder
);

// Verify Razorpay payment signature (Farmer only)
paymentRouter.post(
  '/verify',
  authenticate,
  authorize('FARMER', 'ADMIN'),
  verifyPayment
);

// Record Direct Store Partner UPI payment initiation / reference
paymentRouter.post(
  '/direct-upi',
  authenticate,
  authorize('FARMER', 'ADMIN'),
  recordDirectUpiPayment
);
paymentRouter.post(
  '/record-direct-upi',
  authenticate,
  authorize('FARMER', 'ADMIN'),
  recordDirectUpiPayment
);

// Get payment status for an order
paymentRouter.get(
  '/order/:orderId',
  authenticate,
  getPaymentDetails
);

// Admin / Store Partner Payment Management & Verification
paymentRouter.get(
  '/admin/all',
  authenticate,
  authorize('ADMIN', 'SHOP_OWNER', 'AGRI_PARTNER'),
  getAdminPayments
);

paymentRouter.post(
  '/admin/verify-upi',
  authenticate,
  authorize('ADMIN', 'SHOP_OWNER', 'AGRI_PARTNER'),
  verifyDirectUpiPayment
);

export default paymentRouter;
