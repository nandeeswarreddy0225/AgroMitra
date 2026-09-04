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

export type DeliveryResponseStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export type DeliveryStatus =
  | 'NOT_ASSIGNED'
  | 'PENDING_ACCEPTANCE'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'PICKUP_PENDING'
  | 'PICKED_UP'
  | 'READY_FOR_DELIVERY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'REJECTED';


export interface StatusTimelineItem {
  status: OrderStatus;
  timestamp: string;
  message?: string;
}

export interface OrderItem {
  product: string | { _id: string; id?: string; name: string; images?: string[] };
  shopOwner: {
    _id?: string;
    id?: string;
    name: string;
    email: string;
    phone: string;
    shopName?: string;
    upiId?: string;
    qrCodeUrl?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
  };
  productNameSnapshot: string;
  price: number;
  quantity: number;
  unit: string;
  subtotal: number;
}

export interface OrderDeliveryAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
}

export type PaymentMethod = 'UPI_QR' | 'RAZORPAY' | 'CASH_ON_DELIVERY';

export interface Order {
  _id?: string;
  id: string;
  orderNumber: string;
  farmer: {
    _id?: string;
    id?: string;
    name: string;
    email: string;
    phone: string;
    address?: OrderDeliveryAddress;
  };
  items: OrderItem[];
  totalAmount: number;
  deliveryAddress: OrderDeliveryAddress;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paymentMethod?: PaymentMethod;
  payment?: string;
  rejectionReason?: string;
  statusTimeline?: StatusTimelineItem[];
  // Delivery Boy assignment
  deliveryBoy?: string;
  deliveryBoyName?: string;
  deliveryBoyPhone?: string;
  deliveryAssignedAt?: string;
  deliveryResponseStatus?: DeliveryResponseStatus;
  deliveryRespondedAt?: string;
  deliveryRejectionReason?: string;
  deliveryPickedUpAt?: string;
  deliveryDeliveredAt?: string;
  deliveryStatus?: DeliveryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ShopOwnerOrderView {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paymentMethod?: PaymentMethod;
  rejectionReason?: string;
  statusTimeline?: StatusTimelineItem[];
  farmer: {
    _id?: string;
    name: string;
    email: string;
    phone: string;
  };
  deliveryAddress: OrderDeliveryAddress;
  items: OrderItem[];
  allOrderItemsCount: number;
  shopSubtotal: number;
  orderTotal: number;
  deliveryBoy?: string;
  deliveryBoyName?: string;
  deliveryBoyPhone?: string;
  deliveryAssignedAt?: string;
  deliveryResponseStatus?: DeliveryResponseStatus;
  deliveryRespondedAt?: string;
  deliveryRejectionReason?: string;
  deliveryPickedUpAt?: string;
  deliveryDeliveredAt?: string;
  deliveryStatus?: DeliveryStatus;
  createdAt: string;
  updatedAt: string;
}


export interface OrdersResponse {
  success: boolean;
  count: number;
  orders: Order[];
}

export interface ShopOwnerOrdersResponse {
  success: boolean;
  count: number;
  orders: ShopOwnerOrderView[];
}

export interface SingleOrderResponse {
  success: boolean;
  order: Order;
  message?: string;
}

export interface CreateOrderInput {
  deliveryAddress?: Partial<OrderDeliveryAddress>;
  paymentMethod?: PaymentMethod;
}
