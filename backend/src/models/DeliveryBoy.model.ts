import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IDeliveryBoy extends Document {
  id: string;
  user: mongoose.Types.ObjectId; // Reference to User with role 'DELIVERY_BOY'
  shopOwner?: mongoose.Types.ObjectId; // Reference to Fertilizer & Pesticide Shop Owner (optional for independent partners)
  name: string;
  phone: string;
  email: string;
  vehicleType: string;
  deliveryArea: string;
  isAvailable: boolean;
  activeOrdersCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryBoySchema = new Schema<IDeliveryBoy>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },
    shopOwner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
      default: undefined,
    },

    name: {
      type: String,
      required: [true, 'Delivery boy name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    vehicleType: {
      type: String,
      default: 'Motorcycle / Two-Wheeler',
      trim: true,
    },
    deliveryArea: {
      type: String,
      default: 'Local Agricultural Mandals & Rural Hub',
      trim: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    activeOrdersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

DeliveryBoySchema.index({ shopOwner: 1, isAvailable: 1 });

export const DeliveryBoy: Model<IDeliveryBoy> = mongoose.model<IDeliveryBoy>('DeliveryBoy', DeliveryBoySchema);
