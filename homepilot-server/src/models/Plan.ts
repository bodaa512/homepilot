import { Schema, model, Document, Types } from 'mongoose';

interface PlanLimits {
  homes: number; // -1 means unlimited
  aiRequestsPerMonth: number;
}

export interface IPlan extends Document {
  _id: Types.ObjectId;
  code: 'free' | 'premium' | 'property_pro';
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: PlanLimits;
  stripePriceIdMonthly?: string;
}

const planSchema = new Schema<IPlan>({
  code: { type: String, enum: ['free', 'premium', 'property_pro'], required: true, unique: true },
  name: { type: String, required: true },
  priceMonthly: { type: Number, required: true },
  priceYearly: { type: Number, required: true },
  features: { type: [String], default: [] },
  limits: {
    homes: { type: Number, required: true },
    aiRequestsPerMonth: { type: Number, required: true },
  },
  stripePriceIdMonthly: { type: String },
});

export const Plan = model<IPlan>('Plan', planSchema);
