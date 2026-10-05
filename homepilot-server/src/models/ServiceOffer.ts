import { Schema, model, Document, Types } from 'mongoose';

export enum ServiceOfferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export interface IServiceOffer extends Document {
  _id: Types.ObjectId;
  serviceRequest: Types.ObjectId;
  provider: Types.ObjectId;
  price: number;
  currency: string;
  estimatedDurationHours?: number;
  proposedDate?: Date;
  message?: string;
  warrantyPeriodDays?: number;
  status: ServiceOfferStatus;
  createdAt: Date;
  updatedAt: Date;
}

const serviceOfferSchema = new Schema<IServiceOffer>(
  {
    serviceRequest: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
    provider: { type: Schema.Types.ObjectId, ref: 'Provider', required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'EGP' },
    estimatedDurationHours: { type: Number, min: 0 },
    proposedDate: { type: Date },
    message: { type: String, maxlength: 1000 },
    warrantyPeriodDays: { type: Number, min: 0 },
    status: { type: String, enum: Object.values(ServiceOfferStatus), default: ServiceOfferStatus.PENDING },
  },
  { timestamps: true },
);

serviceOfferSchema.index({ serviceRequest: 1 });
serviceOfferSchema.index({ provider: 1 });

export const ServiceOffer = model<IServiceOffer>('ServiceOffer', serviceOfferSchema);
