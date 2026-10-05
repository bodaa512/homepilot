import { Schema, model, Document, Types } from 'mongoose';

export enum ServiceCategory {
  PLUMBING = 'plumbing',
  ELECTRICITY = 'electricity',
  AC = 'ac',
  APPLIANCE_REPAIR = 'appliance_repair',
  CLEANING = 'cleaning',
  PAINTING = 'painting',
  CARPENTRY = 'carpentry',
  LOCKSMITH = 'locksmith',
  INTERNET = 'internet',
  HOME_INSPECTION = 'home_inspection',
}

export enum ProviderVerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export interface IProvider extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  businessName: string;
  categories: ServiceCategory[];
  serviceAreas: string[];
  bio?: string;
  verificationStatus: ProviderVerificationStatus;
  ratingAverage: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const providerSchema = new Schema<IProvider>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true, trim: true, maxlength: 120 },
    categories: { type: [String], enum: Object.values(ServiceCategory), default: [] },
    serviceAreas: { type: [String], default: [] },
    bio: { type: String, maxlength: 1000 },
    verificationStatus: {
      type: String,
      enum: Object.values(ProviderVerificationStatus),
      default: ProviderVerificationStatus.UNVERIFIED,
    },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// Powers the "find providers for this category in this area" matching engine.
// MongoDB disallows a single compound index across two array fields
// ("cannot index parallel arrays") once a document has multiple entries in
// both — so categories and serviceAreas each get their own multikey index
// instead of one combined index. Any future "match by category AND area"
// query still works fine; Mongo just uses one index and filters the rest.
providerSchema.index({ categories: 1 });
providerSchema.index({ serviceAreas: 1 });
providerSchema.index({ verificationStatus: 1 });

export const Provider = model<IProvider>('Provider', providerSchema);
