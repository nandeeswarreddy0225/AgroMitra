import mongoose, { Document, Schema, Types } from 'mongoose';

export type PaymentStatus = 'CREATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';

export const PAYMENT_STATUSES: PaymentStatus[] = [
  'CREATED',
  'AUTHORIZED',
  'CAPTURED',
  'FAILED',
  'REFUNDED',
];

export interface IPayment extends Document {
  _id: Types.ObjectId;
  order: Types.ObjectId;
  farmer: Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paymentMethod?: 'RAZORPAY' | 'UPI_QR' | 'CASH_ON_DELIVERY';
  upiTransactionId?: string;
  upiPayerApp?: string;
  upiId?: string;
  storeName?: string;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  adminNotes?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    farmer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: undefined,
      index: true,
    },
    razorpaySignature: {
      type: String,
      default: undefined,
    },
    paymentMethod: {
      type: String,
      enum: ['RAZORPAY', 'UPI_QR', 'CASH_ON_DELIVERY'],
      default: 'RAZORPAY',
      index: true,
    },
    upiTransactionId: {
      type: String,
      trim: true,
      default: undefined,
      index: true,
    },
    upiPayerApp: {
      type: String,
      trim: true,
      default: undefined,
    },
    upiId: {
      type: String,
      trim: true,
      default: undefined,
    },
    storeName: {
      type: String,
      trim: true,
      default: undefined,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
    verifiedAt: {
      type: Date,
      default: undefined,
    },
    adminNotes: {
      type: String,
      trim: true,
      default: undefined,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'CREATED',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
