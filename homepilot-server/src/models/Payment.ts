import { Schema, model, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  plan: Types.ObjectId;
  amount: number;
  currency: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'usd' },
    stripeSessionId: { type: String },
    stripePaymentIntentId: { type: String },
    status: { type: String, enum: ['pending', 'succeeded', 'failed', 'refunded'], default: 'pending' },
  },
  { timestamps: true },
);

paymentSchema.index({ user: 1, createdAt: -1 });

export const Payment = model<IPayment>('Payment', paymentSchema);
