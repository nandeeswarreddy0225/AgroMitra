import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IStorePaymentConfig extends Document {
  _id: Types.ObjectId;
  storeName: string;
  upiId: string;
  phoneNumber?: string;
  merchantName?: string;
  isActive: boolean;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StorePaymentConfigSchema = new Schema<IStorePaymentConfig>(
  {
    storeName: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
      minlength: [2, 'Store name must be at least 2 characters'],
      maxlength: [120, 'Store name cannot exceed 120 characters'],
    },
    upiId: {
      type: String,
      required: [true, 'UPI ID is required'],
      trim: true,
      minlength: [3, 'UPI ID must be at least 3 characters'],
      maxlength: [100, 'UPI ID cannot exceed 100 characters'],
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: '',
    },
    merchantName: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
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

export const StorePaymentConfig = mongoose.model<IStorePaymentConfig>(
  'StorePaymentConfig',
  StorePaymentConfigSchema
);
