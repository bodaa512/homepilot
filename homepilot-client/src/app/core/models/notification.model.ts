/** يطابق NotificationType/INotification في السيرفر (models/Notification.ts). */
export type NotificationType =
  | 'MAINTENANCE'
  | 'WARRANTY'
  | 'APPOINTMENT'
  | 'SERVICE'
  | 'PAYMENT'
  | 'SUBSCRIPTION'
  | 'DOCUMENT'
  | 'SYSTEM'
  | 'SECURITY';

export interface AppNotification {
  _id: string;
  type: NotificationType;
  title: string;
  body?: string;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: AppNotification[];
  unreadCount: number;
}
