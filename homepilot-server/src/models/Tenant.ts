import { Schema, model, Document, Types } from 'mongoose';

export interface ITenant extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  unit: Types.ObjectId;
  leaseStart?: Date;
  leaseEnd?: Date;
  rentAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    unit: { type: Schema.Types.ObjectId, ref: 'PropertyUnit', required: true, unique: true },
    leaseStart: { type: Date },
    leaseEnd: { type: Date },
    rentAmount: { type: Number, min: 0 },
  },
  { timestamps: true },
);

tenantSchema.index({ user: 1 });

export const Tenant = model<ITenant>('Tenant', tenantSchema);
