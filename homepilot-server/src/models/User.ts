import { Schema, model, Document, Types } from 'mongoose';
import { GlobalRole } from '../constants/roles';

export interface IUser extends Document {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  passwordHash: string;
  role: GlobalRole;
  avatarUrl?: string;
  phone?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationExpires?: Date;
  passwordResetTokenHash?: string;
  passwordResetExpires?: Date;
  refreshTokenVersion: number;
  lastLoginAt?: Date;
  locale: string;
  timezone: string;
  planCode: 'free' | 'premium' | 'property_pro';
  planRenewsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(GlobalRole),
      default: GlobalRole.OWNER,
    },
    avatarUrl: { type: String },
    phone: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    refreshTokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    locale: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    planCode: { type: String, enum: ['free', 'premium', 'property_pro'], default: 'free' },
    planRenewsAt: { type: Date },
  },
  { timestamps: true },
);

// email index already created via `index: true` above (kept single source of truth)

export const User = model<IUser>('User', userSchema);
