import { Schema, model, Document, Types } from 'mongoose';

export interface IProviderReview extends Document {
  _id: Types.ObjectId;
  provider: Types.ObjectId;
  serviceRequest: Types.ObjectId;
  user: Types.ObjectId;
  ratingOverall: number;
  ratingProfessionalism?: number;
  ratingPunctuality?: number;
  ratingQuality?: number;
  ratingCommunication?: number;
  ratingValue?: number;
  comment?: string;
  createdAt: Date;
}

const providerReviewSchema = new Schema<IProviderReview>(
  {
    provider: { type: Schema.Types.ObjectId, ref: 'Provider', required: true },
    serviceRequest: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ratingOverall: { type: Number, required: true, min: 1, max: 5 },
    ratingProfessionalism: { type: Number, min: 1, max: 5 },
    ratingPunctuality: { type: Number, min: 1, max: 5 },
    ratingQuality: { type: Number, min: 1, max: 5 },
    ratingCommunication: { type: Number, min: 1, max: 5 },
    ratingValue: { type: Number, min: 1, max: 5 },
    comment: { type: String, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

providerReviewSchema.index({ provider: 1, createdAt: -1 });

export const ProviderReview = model<IProviderReview>('ProviderReview', providerReviewSchema);
