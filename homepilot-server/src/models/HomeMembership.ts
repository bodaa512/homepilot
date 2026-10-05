import { Schema, model, Document, Types } from 'mongoose';
import { HomeRole } from '../constants/roles';

export interface IHomeMembership extends Document {
  _id: Types.ObjectId;
  home: Types.ObjectId;
  user: Types.ObjectId;
  role: HomeRole;
  invitedBy?: Types.ObjectId;
  status: 'pending' | 'active';
  createdAt: Date;
  updatedAt: Date;
}

const homeMembershipSchema = new Schema<IHomeMembership>(
  {
    home: { type: Schema.Types.ObjectId, ref: 'Home', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: Object.values(HomeRole), required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'active'], default: 'active' },
  },
  { timestamps: true },
);

homeMembershipSchema.index({ home: 1, user: 1 }, { unique: true });

export const HomeMembership = model<IHomeMembership>('HomeMembership', homeMembershipSchema);
