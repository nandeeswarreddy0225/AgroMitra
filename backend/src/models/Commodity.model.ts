import mongoose, { Document, Schema, Model } from 'mongoose';

export type CommodityCategory =
  | 'Cereals'
  | 'Pulses'
  | 'Oilseeds'
  | 'Vegetables'
  | 'Fruits'
  | 'Spices'
  | 'Commercial / Cash Crops'
  | 'Other';

export interface ICommodity extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  category: CommodityCategory;
  variety?: string;
  defaultUnit: 'kg' | 'quintal' | 'tonne' | 'bag' | 'crate' | 'bunch';
  allowedUnits: string[];
  icon: string;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommoditySchema = new Schema<ICommodity>(
  {
    name: {
      type: String,
      required: [true, 'Commodity name is required'],
      trim: true,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Cereals',
        'Pulses',
        'Oilseeds',
        'Vegetables',
        'Fruits',
        'Spices',
        'Commercial / Cash Crops',
        'Other',
      ],
      default: 'Vegetables',
      index: true,
    },
    variety: {
      type: String,
      trim: true,
      default: 'Standard / FAQ',
    },
    defaultUnit: {
      type: String,
      enum: ['kg', 'quintal', 'tonne', 'bag', 'crate', 'bunch'],
      default: 'quintal',
    },
    allowedUnits: {
      type: [String],
      default: ['kg', 'quintal', 'tonne'],
    },
    icon: {
      type: String,
      trim: true,
      default: '🌾',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
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

export const Commodity: Model<ICommodity> = mongoose.model<ICommodity>('Commodity', CommoditySchema);
export default Commodity;
