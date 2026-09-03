import { Router } from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  getPaymentDetails,
  recordDirectUpiPayment,
} from '../controllers/payment.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

export const paymentRouter = Router();

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

export default paymentRouter;
