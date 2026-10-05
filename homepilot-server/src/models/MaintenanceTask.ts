import { Schema, model, Document, Types } from 'mongoose';

export enum MaintenanceTaskType {
  ONE_TIME = 'one_time',
  RECURRING = 'recurring',
  AI_GENERATED = 'ai_generated',
  MANUFACTURER = 'manufacturer',
  MANUAL = 'manual',
}

export enum MaintenanceStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
  SKIPPED = 'SKIPPED',
  CANCELLED = 'CANCELLED',
}

export interface IMaintenanceTask extends Document {
  _id: Types.ObjectId;
  home: Types.ObjectId;
  asset?: Types.ObjectId;
  title: string;
  description?: string;
  type: MaintenanceTaskType;
  recurrenceIntervalDays?: number;
  status: MaintenanceStatus;
  dueDate: Date;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const maintenanceTaskSchema = new Schema<IMaintenanceTask>(
  {
    home: { type: Schema.Types.ObjectId, ref: 'Home', required: true },
    asset: { type: Schema.Types.ObjectId, ref: 'Asset' },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, maxlength: 2000 },
    type: { type: String, enum: Object.values(MaintenanceTaskType), default: MaintenanceTaskType.MANUAL },
    recurrenceIntervalDays: { type: Number, min: 1 },
    status: { type: String, enum: Object.values(MaintenanceStatus), default: MaintenanceStatus.PENDING },
    dueDate: { type: Date, required: true },
    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// Powers the "tasks for this home, filtered by status" list view.
maintenanceTaskSchema.index({ home: 1, status: 1 });
// Powers the daily cron scan: "all PENDING tasks due today or earlier".
maintenanceTaskSchema.index({ dueDate: 1, status: 1 });

export const MaintenanceTask = model<IMaintenanceTask>('MaintenanceTask', maintenanceTaskSchema);
