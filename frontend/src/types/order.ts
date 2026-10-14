export type OrderStatus =
  | 'PENDING'
  | 'WAITING_FOR_SHOP'
  | 'SHOP_ACCEPTED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'PROCESSING'
  | 'READY_FOR_PICKUP'
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
  latitude?: number;
  longitude?: number;
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
  // Nearby shop routing
  assignedShopOwner?: string;
  acceptedShopOwner?: string;
  acceptedAt?: string;
  distanceKm?: number;
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
  assignedShopOwner?: string;
  acceptedShopOwner?: string;
  acceptedAt?: string;
  distanceKm?: number;
  isAssignedToMe?: boolean;
  isAcceptedByMe?: boolean;
  canAccept?: boolean;
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
  productId?: string;
  quantity?: number;
  shopOwnerId?: string;
  items?: Array<{ productId: string; quantity: number; shopOwnerId?: string }>;
  deliveryAddress?: Partial<OrderDeliveryAddress>;
  paymentMethod?: PaymentMethod;
}

export interface TrackingCoordinate {
  latitude: number;
  longitude: number;
}

export interface TrackingMilestone {
  step: number;
  title: string;
  description: string;
  done: boolean;
  active: boolean;
  time?: string;
}

export interface TrackingTelemetry {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  deliveryStatus: DeliveryStatus;
  paymentStatus: OrderPaymentStatus;
  origin: {
    name: string;
    phone?: string;
    street: string;
    city: string;
    state: string;
    coordinate: TrackingCoordinate;
  };
  destination: {
    farmerName: string;
    phone?: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    coordinate: TrackingCoordinate;
  };
  currentLocation: {
    latitude: number;
    longitude: number;
    bearing: number;
    speedKmh: number;
  };
  route: {
    totalDistanceKm: number;
    distanceRemainingKm: number;
    etaMinutes: number;
    progressPercent: number;
    waypoints: TrackingCoordinate[];
  };
  deliveryPartner: {
    name: string;
    phone: string;
    vehicleType: string;
    deliveryArea: string;
  };
  deliveryOtp: string;
  milestones: TrackingMilestone[];
}

export interface OrderMessage {
  id: string;
  _id?: string;
  order: string;
  sender: string | { _id: string; name: string };
  senderName: string;
  senderRole: 'FARMER' | 'SHOP_OWNER' | 'AGRI_PARTNER' | 'DELIVERY_BOY' | 'ADMIN';
  message: string;
  readBy?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderMessagesResponse {
  success: boolean;
  count: number;
  messages: OrderMessage[];
}

