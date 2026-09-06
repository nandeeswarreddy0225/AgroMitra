export type PaymentStatus = 'CREATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';

export interface StorePaymentConfig {
  id?: string;
  storeName: string;
  upiId: string;
  phoneNumber?: string;
  merchantName?: string;
  isActive: boolean;
  updatedAt?: string;
}

export interface StorePaymentConfigResponse {
  success: boolean;
  configured: boolean;
  config: StorePaymentConfig | null;
  message?: string;
}

export interface OrderUpiDetailsResponse {
  success: boolean;
  upiConfigured: boolean;
  storeName?: string;
  merchantName?: string;
  upiId?: string;
  phoneNumber?: string;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  paymentStatus: string;
  upiIntentUrl?: string;
  message?: string;
}

export interface AdminPaymentRecord {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  farmer: {
    name: string;
    phone: string;
    email: string;
  };
  transactionId: string;
  paymentCreatedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  adminNotes?: string;
}

export interface AdminPaymentsResponse {
  success: boolean;
  count: number;
  payments: AdminPaymentRecord[];
}

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
