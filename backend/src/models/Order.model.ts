import mongoose, { Document, Schema, Types } from 'mongoose';

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

export const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'ACCEPTED',
  'PREPARING',
  'PROCESSING',
  'READY_FOR_DELIVERY',
  'PACKED',
  'OUT_FOR_DELIVERY',
  'DISPATCHED',
  'DELIVERED',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
];

export const ORDER_PAYMENT_STATUSES: OrderPaymentStatus[] = [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
];

export const DELIVERY_RESPONSE_STATUSES: DeliveryResponseStatus[] = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
];

export const DELIVERY_STATUSES: DeliveryStatus[] = [
  'NOT_ASSIGNED',
  'PENDING_ACCEPTANCE',
  'ASSIGNED',
  'ACCEPTED',
  'PICKUP_PENDING',
  'PICKED_UP',
  'READY_FOR_DELIVERY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'REJECTED',
];


export interface IOrderItem {
  product: Types.ObjectId;
  shopOwner: Types.ObjectId;
  productNameSnapshot: string;
  price: number;
  quantity: number;
  unit: string;
  subtotal: number;
}

export interface IOrderAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
}

export interface IStatusTimeline {
  status: OrderStatus;
  timestamp: Date;
  message?: string;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderNumber: string;
  farmer: Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  deliveryAddress: IOrderAddress;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  payment?: Types.ObjectId;
  rejectionReason?: string;
  statusTimeline: IStatusTimeline[];
  // Delivery Partner Assignment & Workflow
  deliveryBoy?: Types.ObjectId;
  deliveryBoyName?: string;
  deliveryBoyPhone?: string;
  deliveryAssignedAt?: Date;
  deliveryAssignedBy?: Types.ObjectId;
  deliveryResponseStatus?: DeliveryResponseStatus;
  deliveryRespondedAt?: Date;
  deliveryRejectionReason?: string;
  deliveryPickedUpAt?: Date;
  deliveryDeliveredAt?: Date;
  deliveryStatus: DeliveryStatus;
  createdAt: Date;
  updatedAt: Date;
}


const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    shopOwner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    productNameSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative'],
    },
  },
  { _id: false }
);

const OrderAddressSchema = new Schema<IOrderAddress>(
  {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const StatusTimelineSchema = new Schema<IStatusTimeline>(
  {
    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    message: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    farmer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: function (val: IOrderItem[]) {
          return val.length > 0;
        },
        message: 'Order must contain at least one item.',
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },
    deliveryAddress: {
      type: OrderAddressSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'PENDING',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ORDER_PAYMENT_STATUSES,
      default: 'PENDING',
      index: true,
    },
    payment: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      default: undefined,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: undefined,
    },
    statusTimeline: {
      type: [StatusTimelineSchema],
      default: () => [
        {
          status: 'PENDING',
          timestamp: new Date(),
          message: 'Order placed by farmer',
        },
      ],
    },
    deliveryBoy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: undefined,
    },
    deliveryBoyName: {
      type: String,
      trim: true,
      default: undefined,
    },
    deliveryBoyPhone: {
      type: String,
      trim: true,
      default: undefined,
    },
    deliveryAssignedAt: {
      type: Date,
      default: undefined,
    },
    deliveryAssignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
    deliveryResponseStatus: {
      type: String,
      enum: DELIVERY_RESPONSE_STATUSES,
      default: undefined,
      index: true,
    },
    deliveryRespondedAt: {
      type: Date,
      default: undefined,
    },
    deliveryRejectionReason: {
      type: String,
      trim: true,
      default: undefined,
    },
    deliveryPickedUpAt: {
      type: Date,
      default: undefined,
    },
    deliveryDeliveredAt: {
      type: Date,
      default: undefined,
    },
    deliveryStatus: {
      type: String,
      enum: DELIVERY_STATUSES,
      default: 'NOT_ASSIGNED',
      index: true,
    },

  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
