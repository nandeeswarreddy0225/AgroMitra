import mongoose, { Document, Schema } from 'mongoose';

export interface ICropAnalysis extends Document {
  id: string;
  farmer: mongoose.Types.ObjectId;
  imageName: string;
  imageData?: string;
  crop: string;
  disease: string;
  isHealthy: boolean;
  confidence: number;
  isConfident: boolean;
  symptoms: string[];
  recommendedActions: string[];
  disclaimer: string;
  createdAt: Date;
  updatedAt: Date;
}

const CropAnalysisSchema = new Schema<ICropAnalysis>(
  {
    farmer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer reference is required'],
      index: true,
    },
    imageName: {
      type: String,
      required: [true, 'Image name is required'],
      trim: true,
    },
    imageData: {
      type: String,
      trim: true,
    },
    crop: {
      type: String,
      required: true,
      trim: true,
    },
    disease: {
      type: String,
      required: true,
      trim: true,
    },
    isHealthy: {
      type: Boolean,
      required: true,
      default: false,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    isConfident: {
      type: Boolean,
      required: true,
      default: true,
    },
    symptoms: {
      type: [String],
      default: [],
    },
    recommendedActions: {
      type: [String],
      default: [],
    },
    disclaimer: {
      type: String,
      required: true,
      trim: true,
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

CropAnalysisSchema.index({ farmer: 1, createdAt: -1 });

export const CropAnalysis = mongoose.model<ICropAnalysis>('CropAnalysis', CropAnalysisSchema);
