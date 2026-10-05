import { Notification, NotificationType } from '../models/Notification';
import { NotFoundError } from '../errors/specificErrors';
import { getIO } from '../config/socket';

interface CreateNotificationInput {
  user: string;
  type: NotificationType;
  title: string;
  body?: string;
  priority?: 'low' | 'medium' | 'high';
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
}

export const NotificationService = {
  async create(input: CreateNotificationInput) {
    const notification = await Notification.create(input);
    getIO()?.to(`user:${input.user}`).emit('newNotification', notification);
    return notification;
  },

  async listForUser(userId: string, unreadOnly = false) {
    const query: Record<string, unknown> = { user: userId };
    if (unreadOnly) query['isRead'] = false;
    return Notification.find(query).sort({ createdAt: -1 }).limit(50);
  },

  async markAsRead(userId: string, notificationId: string) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true, readAt: new Date() },
      { new: true },
    );
    if (!notification) throw new NotFoundError('Notification not found');
    return notification;
  },

  async markAllAsRead(userId: string) {
    await Notification.updateMany({ user: userId, isRead: false }, { isRead: true, readAt: new Date() });
  },

  async unreadCount(userId: string) {
    return Notification.countDocuments({ user: userId, isRead: false });
  },
};
