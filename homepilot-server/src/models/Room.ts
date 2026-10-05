import { Schema, model, Document, Types } from 'mongoose';

export interface IRoom extends Document {
  _id: Types.ObjectId;
  home: Types.ObjectId;
  name: string;
  type?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    home: { type: Schema.Types.ObjectId, ref: 'Home', required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    type: { type: String, trim: true },
    notes: { type: String, maxlength: 1000 },
  },
  { timestamps: true },
);

roomSchema.index({ home: 1 });

export const Room = model<IRoom>('Room', roomSchema);
