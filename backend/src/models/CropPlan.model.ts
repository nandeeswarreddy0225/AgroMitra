import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISoilTest {
  pH?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  organicCarbon?: number;
  electricalConductivity?: number;
}

export interface ICropPlan extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  soilType: string;
  soilTest?: ISoilTest;
  selectedCropId: string;
  selectedCropName: string;
  selectedCropIcon?: string;
  season: 'KHARIF' | 'RABI' | 'ZAID';
  location: {
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SoilTestSchema = new Schema<ISoilTest>(
  {
    pH: { type: Number, default: undefined },
    nitrogen: { type: Number, default: undefined },
    phosphorus: { type: Number, default: undefined },
    potassium: { type: Number, default: undefined },
    organicCarbon: { type: Number, default: undefined },
    electricalConductivity: { type: Number, default: undefined },
  },
  { _id: false }
);

const CropPlanSchema = new Schema<ICropPlan>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    soilType: {
      type: String,
      required: [true, 'Soil type is required'],
      trim: true,
    },
    soilTest: {
      type: SoilTestSchema,
      default: undefined,
    },
    selectedCropId: {
      type: String,
      required: [true, 'Selected crop ID is required'],
      trim: true,
    },
    selectedCropName: {
      type: String,
      required: [true, 'Selected crop name is required'],
      trim: true,
    },
    selectedCropIcon: {
      type: String,
      default: '🌾',
    },
    season: {
      type: String,
      enum: ['KHARIF', 'RABI', 'ZAID'],
      required: true,
      default: 'KHARIF',
    },
    location: {
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      latitude: { type: Number, default: undefined },
      longitude: { type: Number, default: undefined },
    },
    notes: {
      type: String,
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

export const CropPlan: Model<ICropPlan> = mongoose.model<ICropPlan>('CropPlan', CropPlanSchema);
