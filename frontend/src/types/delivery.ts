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

export interface DeliveryBoy {
  id: string;
  user: string | { id: string; name: string; email: string; phone: string; role: string };
  shopOwner?: string;
  name: string;
  phone: string;
  email: string;
  vehicleType: string;
  deliveryArea: string;
  isAvailable: boolean;
  activeOrdersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShopDeliveryBoysResponse {
  success: boolean;
  count: number;
  deliveryBoys: DeliveryBoy[];
}

export interface CreateDeliveryBoyInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  vehicleType?: string;
  deliveryArea?: string;
}

export interface AssignDeliveryBoyInput {
  orderId: string;
  deliveryBoyId: string;
}

export interface RespondDeliveryInput {
  action: 'ACCEPT' | 'REJECT';
  reason?: string;
}
