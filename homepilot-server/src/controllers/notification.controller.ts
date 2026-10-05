import { NotificationService } from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError } from '../errors/specificErrors';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user) throw new AuthenticationError();
  return req.user.id;
}

export const NotificationController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const unreadOnly = req.query.unread === 'true';
    const notifications = await NotificationService.listForUser(requireUserId(req), unreadOnly);
    const unreadCount = await NotificationService.unreadCount(requireUserId(req));
    sendSuccess(res, { notifications, unreadCount });
  }),

  markRead: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const notification = await NotificationService.markAsRead(requireUserId(req), req.params.notificationId);
    sendSuccess(res, { notification }, 'Notification marked as read');
  }),

  markAllRead: asyncHandler(async (req: AuthenticatedRequest, res) => {
    await NotificationService.markAllAsRead(requireUserId(req));
    sendSuccess(res, null, 'All notifications marked as read');
  }),
};
