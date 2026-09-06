import { Product } from './product';
import { UserAddress } from './auth';

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'PROCESSING'
  | 'READY_FOR_DELIVERY'
  | 'PACKED'
  | 'OUT_FOR_DELIVERY'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type OrderPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'UPI_QR' | 'RAZORPAY' | 'CASH_ON_DELIVERY';

export interface OrderItem {
  product: Product | string;
  shopOwner?: string;
  productNameSnapshot: string;
  price: number;
  quantity: number;
  unit: string;
  subtotal: number;
}

export interface Order {
  id: string;
  _id?: string;
  orderNumber: string;
  farmer: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryAddress: UserAddress;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paymentMethod?: PaymentMethod;
  deliveryBoyName?: string;
  deliveryBoyPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  deliveryAddress: UserAddress;
  paymentMethod?: PaymentMethod | string;
}

export interface OrdersResponse {
  success: boolean;
  orders: Order[];
}

export interface SingleOrderResponse {
  success: boolean;
  order: Order;
  message?: string;
}
