import mongoose, { Document, Schema, Model } from 'mongoose';

export const PRODUCT_CATEGORIES = [
  'Seeds',
  'Fertilizers',
  'Bio-Fertilizers',
  'Soil Conditioners',
  'Growth Promoters',
  'Pesticides',
  'Insecticides',
  'Fungicides',
  'Herbicides',
  'Bio Products',
  'Crop Protection Products',
  'Agricultural Equipment',
  'Irrigation Equipment',
  'Tools & Machinery',
  'Animal Feed',
] as const;

export type StandardProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductCategory = StandardProductCategory | string;

export interface IProductAddress {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  unit: string;
  stock: number;
  images: string[];
  shopOwner: mongoose.Types.ObjectId;
  location?: IProductAddress;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductLocationSchema = new Schema<IProductAddress>(
  {
    street: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters long'],
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      minlength: [5, 'Description must be at least 5 characters long'],
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      minlength: [2, 'Product category must be at least 2 characters long'],
      maxlength: [100, 'Product category cannot exceed 100 characters'],
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      default: 'Generic',
      maxlength: [100, 'Brand name cannot exceed 100 characters'],
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0.01, 'Price must be greater than 0'],
    },
    unit: {
      type: String,
      required: [true, 'Product unit is required (e.g. kg, liter, bag, bottle, packet)'],
      trim: true,
    },
    stock: {
      type: Number,
      required: [true, 'Product stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    images: {
      type: [String],
      default: [],
    },
    shopOwner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Shop owner reference is required'],
      index: true,
    },
    location: {
      type: ProductLocationSchema,
      default: () => ({}),
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
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Add text index for fast keyword search
ProductSchema.index({ name: 'text', description: 'text', brand: 'text', category: 'text' });

export const Product: Model<IProduct> = mongoose.model<IProduct>('Product', ProductSchema);
