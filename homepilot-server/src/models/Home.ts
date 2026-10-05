import { Schema, model, Document, Types } from 'mongoose';

export enum HomeType {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  VILLA = 'villa',
  OFFICE = 'office',
  VACATION_PROPERTY = 'vacation_property',
  RENTAL_PROPERTY = 'rental_property',
  COMMERCIAL_PROPERTY = 'commercial_property',
}

export enum OwnershipType {
  OWN = 'own',
  RENT = 'rent',
}

export interface IHome extends Document {
  _id: Types.ObjectId;
  name: string;
  type: HomeType;
  address?: string;
  city?: string;
  country?: string;
  ownershipType: OwnershipType;
  numberOfRooms?: number;
  numberOfResidents?: number;
  images: string[];
  notes?: string;
  createdBy: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const homeSchema = new Schema<IHome>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: Object.values(HomeType), required: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    country: { type: String, trim: true },
    ownershipType: { type: String, enum: Object.values(OwnershipType), default: OwnershipType.OWN },
    numberOfRooms: { type: Number, min: 0 },
    numberOfResidents: { type: Number, min: 0 },
    images: { type: [String], default: [] },
    notes: { type: String, maxlength: 2000 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

homeSchema.index({ createdBy: 1 });

export const Home = model<IHome>('Home', homeSchema);
