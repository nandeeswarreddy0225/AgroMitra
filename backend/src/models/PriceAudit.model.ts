import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPriceAudit extends Document {
  _id: mongoose.Types.ObjectId;
  market: mongoose.Types.ObjectId;
  marketName: string;
  commodity: mongoose.Types.ObjectId;
  commodityName: string;
  marketPrice?: mongoose.Types.ObjectId;
  changedBy: mongoose.Types.ObjectId;
  changedByName: string;
  changedByRole: string;
  action: 'CREATE' | 'UPDATE' | 'DISABLE' | 'DELETE';
  previousPrice?: {
    minPrice?: number;
    maxPrice?: number;
    modalPrice?: number;
    unit?: string;
  };
  newPrice: {
    minPrice: number;
    maxPrice: number;
    modalPrice: number;
    unit: string;
  };
  priceDate: string;
  updatedTime: string;
  notes?: string;
  isFlaggedSuspicious?: boolean;
  suspicionReason?: string;
  createdAt: Date;
}

const PriceAuditSchema = new Schema<IPriceAudit>(
  {
    market: {
      type: Schema.Types.ObjectId,
      ref: 'Market',
      required: true,
      index: true,
    },
    marketName: {
      type: String,
      required: true,
      trim: true,
    },
    commodity: {
      type: Schema.Types.ObjectId,
      ref: 'Commodity',
      required: true,
      index: true,
    },
    commodityName: {
      type: String,
      required: true,
      trim: true,
    },
    marketPrice: {
      type: Schema.Types.ObjectId,
      ref: 'MarketPrice',
      index: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    changedByName: {
      type: String,
      required: true,
      trim: true,
    },
    changedByRole: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'DISABLE', 'DELETE'],
      required: true,
    },
    previousPrice: {
      minPrice: { type: Number },
      maxPrice: { type: Number },
      modalPrice: { type: Number },
      unit: { type: String },
    },
    newPrice: {
      minPrice: { type: Number, required: true },
      maxPrice: { type: Number, required: true },
      modalPrice: { type: Number, required: true },
      unit: { type: String, required: true },
    },
    priceDate: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    updatedTime: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    isFlaggedSuspicious: {
      type: Boolean,
      default: false,
      index: true,
    },
    suspicionReason: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

PriceAuditSchema.index({ market: 1, commodity: 1, createdAt: -1 });

export const PriceAudit: Model<IPriceAudit> = mongoose.model<IPriceAudit>('PriceAudit', PriceAuditSchema);
export default PriceAudit;
