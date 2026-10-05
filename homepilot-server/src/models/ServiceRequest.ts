import { Schema, model, Document, Types } from 'mongoose';
import { ServiceCategory } from './Provider';

export enum ServiceRequestStatus {
  REQUESTED = 'REQUESTED',
  REVIEWING = 'REVIEWING',
  OFFERS_RECEIVED = 'OFFERS_RECEIVED',
  PROVIDER_SELECTED = 'PROVIDER_SELECTED',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REVIEWED = 'REVIEWED',
  CANCELLED = 'CANCELLED',
}

export enum ServiceRequestUrgency {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EMERGENCY = 'emergency',
}

interface StatusHistoryEntry {
  status: ServiceRequestStatus;
  changedAt: Date;
  changedBy: Types.ObjectId;
}

export interface IServiceRequest extends Document {
  _id: Types.ObjectId;
  home: Types.ObjectId;
  createdBy: Types.ObjectId;
  category: ServiceCategory;
  title: string;
  description?: string;
  urgency: ServiceRequestUrgency;
  location?: string;
  preferredDate?: Date;
  estimatedBudget?: number;
  photos: string[];
  asset?: Types.ObjectId;
  room?: Types.ObjectId;
  status: ServiceRequestStatus;
  selectedOffer?: Types.ObjectId;
  statusHistory: StatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const serviceRequestSchema = new Schema<IServiceRequest>(
  {
    home: { type: Schema.Types.ObjectId, ref: 'Home', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, enum: Object.values(ServiceCategory), required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, maxlength: 2000 },
    urgency: { type: String, enum: Object.values(ServiceRequestUrgency), default: ServiceRequestUrgency.MEDIUM },
    location: { type: String, trim: true },
    preferredDate: { type: Date },
    estimatedBudget: { type: Number, min: 0 },
    photos: { type: [String], default: [] },
    asset: { type: Schema.Types.ObjectId, ref: 'Asset' },
    room: { type: Schema.Types.ObjectId, ref: 'Room' },
    status: { type: String, enum: Object.values(ServiceRequestStatus), default: ServiceRequestStatus.REQUESTED },
    selectedOffer: { type: Schema.Types.ObjectId, ref: 'ServiceOffer' },
    statusHistory: {
      type: [
        {
          status: { type: String, enum: Object.values(ServiceRequestStatus), required: true },
          changedAt: { type: Date, default: Date.now },
          changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

// Powers the provider-facing "open requests matching my category" browse view.
serviceRequestSchema.index({ status: 1, category: 1 });
serviceRequestSchema.index({ home: 1 });

export const ServiceRequest = model<IServiceRequest>('ServiceRequest', serviceRequestSchema);
