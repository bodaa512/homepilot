import { Schema, model, Document, Types } from 'mongoose';

export enum BillingFrequency {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export interface ISubscription extends Document {
  _id: Types.ObjectId;
  home: Types.ObjectId;
  name: string;
  category?: string;
  price: number;
  currency: string;
  billingFrequency: BillingFrequency;
  nextBillingDate: Date;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    home: { type: Schema.Types.ObjectId, ref: 'Home', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'EGP' },
    billingFrequency: { type: String, enum: Object.values(BillingFrequency), default: BillingFrequency.MONTHLY },
    nextBillingDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// Powers "list active subscriptions for this home" and the renewal-reminder cron scan.
subscriptionSchema.index({ home: 1, nextBillingDate: 1 });

export const Subscription = model<ISubscription>('Subscription', subscriptionSchema);
