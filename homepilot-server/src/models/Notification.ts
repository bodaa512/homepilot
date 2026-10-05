import { Schema, model, Document, Types } from 'mongoose';

export enum NotificationType {
  MAINTENANCE = 'MAINTENANCE',
  WARRANTY = 'WARRANTY',
  APPOINTMENT = 'APPOINTMENT',
  SERVICE = 'SERVICE',
  PAYMENT = 'PAYMENT',
  SUBSCRIPTION = 'SUBSCRIPTION',
  DOCUMENT = 'DOCUMENT',
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY',
}

export interface INotification extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  body?: string;
  priority: 'low' | 'medium' | 'high';
  relatedEntityType?: string;
  relatedEntityId?: Types.ObjectId;
  actionUrl?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: Object.values(NotificationType), required: true },
    title: { type: String, required: true, maxlength: 150 },
    body: { type: String, maxlength: 500 },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    relatedEntityType: { type: String },
    relatedEntityId: { type: Schema.Types.ObjectId },
    actionUrl: { type: String },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Powers the notification bell: "unread, newest first, for this user".
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', notificationSchema);
