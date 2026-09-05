import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { normalizePhoneNumber } from '../utils/phone';

export type UserRole = 'FARMER' | 'SHOP_OWNER' | 'AGRI_PARTNER' | 'DELIVERY_BOY' | 'ADMIN';

export interface IAddress {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: UserRole;
  address?: IAddress;
  shopName?: string;
  upiId?: string;
  qrCodeUrl?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const AddressSchema = new Schema<IAddress>(
  {
    street: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      unique: true,
      index: true,
      sparse: true,
      match: [
        /^[0-9+\s-]{8,20}$/,
        'Please provide a valid phone number (minimum 8 digits)',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Do not include password by default in queries
    },
    role: {
      type: String,
      enum: {
        values: ['FARMER', 'SHOP_OWNER', 'AGRI_PARTNER', 'DELIVERY_BOY', 'ADMIN'],
        message: '{VALUE} is not a valid role',
      },
      required: [true, 'Role is required'],
      default: 'FARMER',
    },
    address: {
      type: AddressSchema,
      default: () => ({}),
    },
    shopName: {
      type: String,
      trim: true,
      default: '',
    },
    upiId: {
      type: String,
      trim: true,
      default: '',
    },
    qrCodeUrl: {
      type: String,
      trim: true,
      default: '',
    },
    resetPasswordToken: {
      type: String,
      default: undefined,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      default: undefined,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        return ret;
      },
    },
  }
);

// Hash password before saving if not already a valid bcrypt hash, and normalize phone
UserSchema.pre<IUser>('save', async function (next) {
  if (this.isModified('phone') && this.phone) {
    this.phone = normalizePhoneNumber(this.phone);
  }

  if (!this.isModified('password') || !this.password) {
    return next();
  }

  const pwd = (this.password || '').trim();
  // If password is already a valid standard bcrypt hash ($2a$ / $2b$ / $2y$ / $2x$), skip rehashing
  const isAlreadyBcryptHash =
    pwd.length === 60 &&
    (pwd.startsWith('$2a$') ||
      pwd.startsWith('$2b$') ||
      pwd.startsWith('$2y$') ||
      pwd.startsWith('$2x$'));

  if (isAlreadyBcryptHash) {
    this.password = pwd;
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: unknown) {
    next(err as Error);
  }
});

// Compare candidate plain-text password with stored bcrypt hash or legacy plaintext with auto-upgrade
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password || typeof candidatePassword !== 'string') {
    return false;
  }

  const stored = (this.password || '').trim();
  const candidate = candidatePassword;
  const trimmedCandidate = candidate.trim();

  // 1. Direct Bcrypt comparison (standard secure flow)
  try {
    const match = await bcrypt.compare(candidate, stored);
    if (match) return true;

    // Also test trimmed candidate in case client input contained leading/trailing whitespace
    if (candidate !== trimmedCandidate) {
      const trimmedMatch = await bcrypt.compare(trimmedCandidate, stored);
      if (trimmedMatch) return true;
    }
  } catch {
    // If stored is not a valid bcrypt hash structure, proceed to fallback check
  }

  // 2. Direct plaintext equality check (for legacy unhashed accounts in DB)
  if (stored === candidate || stored === trimmedCandidate) {
    // Transparently upgrade plaintext password to standard bcrypt hash in background
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(stored, salt);
      await mongoose.model('User').updateOne({ _id: this._id }, { $set: { password: hashedPassword } });
    } catch (migrateErr) {
      console.warn('⚠️ [Auth]: Non-fatal auto-hash migration error:', migrateErr);
    }
    return true;
  }

  return false;
};

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
