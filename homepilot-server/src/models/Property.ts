import { Schema, model, Document, Types } from 'mongoose';

export interface IProperty extends Document {
  _id: Types.ObjectId;
  manager: Types.ObjectId;
  name: string;
  address?: string;
  city?: string;
  createdAt: Date;
  updatedAt: Date;
}

const propertySchema = new Schema<IProperty>(
  {
    manager: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
  },
  { timestamps: true },
);

propertySchema.index({ manager: 1 });

export const Property = model<IProperty>('Property', propertySchema);
