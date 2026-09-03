export type PaymentStatus = 'CREATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';

export interface CreatePaymentOrderResponse {
  success: boolean;
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  amountPaise: number;
  currency: string;
  orderId: string;
  orderNumber: string;
  farmer: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface VerifyPaymentPayload {
  orderId: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
  };
  payment: {
    id: string;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    amount: number;
    status: string;
  };
}
