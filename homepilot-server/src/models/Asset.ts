import { Schema, model, Document, Types } from 'mongoose';

export enum AssetCategory {
  REFRIGERATOR = 'refrigerator',
  WASHING_MACHINE = 'washing_machine',
  DISHWASHER = 'dishwasher',
  OVEN = 'oven',
  MICROWAVE = 'microwave',
  AIR_CONDITIONER = 'air_conditioner',
  TELEVISION = 'television',
  WATER_HEATER = 'water_heater',
  WATER_PUMP = 'water_pump',
  ROUTER = 'router',
  SECURITY_CAMERA = 'security_camera',
  SOLAR_PANEL = 'solar_panel',
  FURNITURE = 'furniture',
  SMART_DEVICE = 'smart_device',
  OTHER = 'other',
}

export enum AssetCondition {
  NEW = 'NEW',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  NEEDS_ATTENTION = 'NEEDS_ATTENTION',
  CRITICAL = 'CRITICAL',
  RETIRED = 'RETIRED',
}

export interface IAsset extends Document {
  _id: Types.ObjectId;
  home: Types.ObjectId;
  room?: Types.ObjectId;
  category: AssetCategory;
  name: string;
  brand?: string;
  modelName?: string;
  serialNumber?: string;
  purchaseDate?: Date;
  purchasePrice?: number;
  currency: string;
  warrantyStart?: Date;
  warrantyExpiration?: Date;
  expectedLifespanMonths?: number;
  condition: AssetCondition;
  imageUrl?: string;
  notes?: string;
  totalRepairCost: number;
  lastMaintenanceAt?: Date;
  nextMaintenanceAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const assetSchema = new Schema<IAsset>(
  {
    home: { type: Schema.Types.ObjectId, ref: 'Home', required: true },
    room: { type: Schema.Types.ObjectId, ref: 'Room' },
    category: { type: String, enum: Object.values(AssetCategory), required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    brand: { type: String, trim: true },
    modelName: { type: String, trim: true },
    serialNumber: { type: String, trim: true },
    purchaseDate: { type: Date },
    purchasePrice: { type: Number, min: 0 },
    currency: { type: String, default: 'EGP' },
    warrantyStart: { type: Date },
    warrantyExpiration: { type: Date },
    expectedLifespanMonths: { type: Number, min: 0 },
    condition: { type: String, enum: Object.values(AssetCondition), default: AssetCondition.NEW },
    imageUrl: { type: String },
    notes: { type: String, maxlength: 2000 },
    totalRepairCost: { type: Number, default: 0, min: 0 },
    lastMaintenanceAt: { type: Date },
    nextMaintenanceAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// Powers "all assets in this home" and "all assets in this room" list views.
assetSchema.index({ home: 1, room: 1 });
// Powers the Home Health Score / risk-center scan for at-risk assets per home.
assetSchema.index({ home: 1, condition: 1 });
// Powers warranty-expiration reminder cron scans.
assetSchema.index({ warrantyExpiration: 1 });

export const Asset = model<IAsset>('Asset', assetSchema);
