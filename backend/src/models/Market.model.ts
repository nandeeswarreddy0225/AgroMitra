import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IMarket extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  marketCode?: string;
  address: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  owner?: mongoose.Types.ObjectId;
  contactPerson?: string;
  contactPhone?: string;
  operatingHours?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MarketSchema = new Schema<IMarket>(
  {
    name: {
      type: String,
      required: [true, 'Market name is required'],
      trim: true,
      index: true,
    },
    marketCode: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      index: true,
    },
    district: {
      type: String,
      required: [true, 'District is required'],
      trim: true,
      index: true,
    },
    city: {
      type: String,
      required: [true, 'City/Town is required'],
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true,
      match: [/^\d{6}$/, 'Please provide a valid 6-digit Indian pincode'],
      index: true,
    },
    latitude: {
      type: Number,
      default: undefined,
    },
    longitude: {
      type: Number,
      default: undefined,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
      index: true,
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '',
    },
    contactPhone: {
      type: String,
      trim: true,
      default: '',
    },
    operatingHours: {
      type: String,
      trim: true,
      default: '06:00 AM - 06:00 PM',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

MarketSchema.index({ state: 1, district: 1 });
MarketSchema.index({ latitude: 1, longitude: 1 });

export const Market: Model<IMarket> = mongoose.model<IMarket>('Market', MarketSchema);
export default Market;
