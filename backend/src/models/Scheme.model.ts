import mongoose, { Document, Schema } from 'mongoose';

export type GovernmentLevel = 'State' | 'Central';

export interface IScheme extends Document {
  id: string;
  name: string;
  code: string;
  governmentType: GovernmentLevel;
  ministry: string;
  category: string;
  state: string;
  whoCanApply: string;
  beneficiaryCategory: string[];
  description: string;
  benefits: string;
  subsidyDetails: string;
  eligibility: string[];
  documentsRequired: string[];
  howToApply: string[];
  officialPortalUrl: string;
  applicationGuideUrl?: string;
  verifiedDate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SchemeSchema = new Schema<IScheme>(
  {
    name: {
      type: String,
      required: [true, 'Scheme name is required'],
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: [true, 'Scheme code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    governmentType: {
      type: String,
      enum: ['State', 'Central'],
      default: 'State',
      index: true,
    },
    ministry: {
      type: String,
      required: [true, 'Ministry/Department is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      index: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      index: true,
    },
    whoCanApply: {
      type: String,
      default: 'All Eligible Farmers',
      trim: true,
    },
    beneficiaryCategory: {
      type: [String],
      default: ['All Farmers'],
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    benefits: {
      type: String,
      required: true,
      trim: true,
    },
    subsidyDetails: {
      type: String,
      required: true,
      trim: true,
    },
    eligibility: {
      type: [String],
      required: true,
    },
    documentsRequired: {
      type: [String],
      required: true,
    },
    howToApply: {
      type: [String],
      required: true,
    },
    officialPortalUrl: {
      type: String,
      required: true,
      trim: true,
    },
    applicationGuideUrl: {
      type: String,
      trim: true,
    },
    verifiedDate: {
      type: String,
      default: 'August 2026',
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

SchemeSchema.index({ name: 'text', description: 'text', benefits: 'text', ministry: 'text', whoCanApply: 'text' });

export const Scheme = mongoose.model<IScheme>('Scheme', SchemeSchema);
