import { Schema, model, Document, Types } from 'mongoose';

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export interface IAppointment extends Document {
  _id: Types.ObjectId;
  serviceRequest: Types.ObjectId;
  customer: Types.ObjectId;
  provider: Types.ObjectId;
  home: Types.ObjectId;
  date: Date;
  status: AppointmentStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    serviceRequest: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: Schema.Types.ObjectId, ref: 'Provider', required: true },
    home: { type: Schema.Types.ObjectId, ref: 'Home', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: Object.values(AppointmentStatus), default: AppointmentStatus.SCHEDULED },
    notes: { type: String, maxlength: 1000 },
  },
  { timestamps: true },
);

appointmentSchema.index({ provider: 1, date: 1 });
appointmentSchema.index({ home: 1, date: 1 });

export const Appointment = model<IAppointment>('Appointment', appointmentSchema);
