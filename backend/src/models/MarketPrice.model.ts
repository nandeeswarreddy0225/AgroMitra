import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IMarketPrice extends Document {
  _id: mongoose.Types.ObjectId;
  commodity: mongoose.Types.ObjectId;
  commodityName: string;
  category?: string;
  market: mongoose.Types.ObjectId;
  marketName: string;
  state: string;
  district: string;
  city?: string;
  marketOwner: mongoose.Types.ObjectId;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  unit: string;
  priceDate: string; // YYYY-MM-DD
  updatedTime: string; // e.g. "09:30 AM"
  status: 'ACTIVE' | 'SUPERSEDED';
  priceChangePercent?: number | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MarketPriceSchema = new Schema<IMarketPrice>(
  {
    commodity: {
      type: Schema.Types.ObjectId,
      ref: 'Commodity',
      required: [true, 'Commodity reference is required'],
      index: true,
    },
    commodityName: {
      type: String,
      required: [true, 'Commodity name is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    market: {
      type: Schema.Types.ObjectId,
      ref: 'Market',
      required: [true, 'Market reference is required'],
      index: true,
    },
    marketName: {
      type: String,
      required: [true, 'Market name is required'],
      trim: true,
      index: true,
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
      trim: true,
      default: '',
    },
    marketOwner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Market owner reference is required'],
      index: true,
    },
    minPrice: {
      type: Number,
      required: [true, 'Minimum price is required'],
      min: [0, 'Minimum price cannot be negative'],
    },
    maxPrice: {
      type: Number,
      required: [true, 'Maximum price is required'],
      min: [0, 'Maximum price cannot be negative'],
    },
    modalPrice: {
      type: Number,
      required: [true, 'Modal price is required'],
      min: [0, 'Modal price cannot be negative'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true,
      default: 'quintal',
    },
    priceDate: {
      type: String,
      required: [true, 'Price date (YYYY-MM-DD) is required'],
      trim: true,
      index: true,
    },
    updatedTime: {
      type: String,
      required: [true, 'Updated time is required'],
      trim: true,
      default: () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUPERSEDED'],
      default: 'ACTIVE',
      index: true,
    },
    priceChangePercent: {
      type: Number,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
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

MarketPriceSchema.index({ market: 1, commodity: 1, priceDate: -1 });
MarketPriceSchema.index({ commodityName: 1, state: 1, priceDate: -1 });

export const MarketPrice: Model<IMarketPrice> = mongoose.model<IMarketPrice>('MarketPrice', MarketPriceSchema);
export default MarketPrice;
