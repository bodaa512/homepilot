import { Schema, model, Document, Types } from 'mongoose';

export interface IPropertyUnit extends Document {
  _id: Types.ObjectId;
  property: Types.ObjectId;
  home: Types.ObjectId;
  unitNumber: string;
  status: 'occupied' | 'vacant';
  createdAt: Date;
  updatedAt: Date;
}

const propertyUnitSchema = new Schema<IPropertyUnit>(
  {
    property: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    home: { type: Schema.Types.ObjectId, ref: 'Home', required: true, unique: true },
    unitNumber: { type: String, required: true, trim: true, maxlength: 30 },
    status: { type: String, enum: ['occupied', 'vacant'], default: 'vacant' },
  },
  { timestamps: true },
);

propertyUnitSchema.index({ property: 1 });

export const PropertyUnit = model<IPropertyUnit>('PropertyUnit', propertyUnitSchema);
