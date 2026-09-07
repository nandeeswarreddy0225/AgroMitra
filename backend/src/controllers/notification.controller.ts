import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { NotificationService } from '../services/notification.service';
import { User } from '../models/User.model';

export const getNotificationsController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const { notifications, unreadCount } = await NotificationService.getUserNotifications(req.user._id, limit);

    res.status(200).json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error: any) {
    console.error('[NotificationController] getNotifications error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications.',
    });
  }
};

export const markAsReadController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const updated = await NotificationService.markAsRead(id, req.user._id);

    res.status(200).json({
      success: true,
      updated,
      message: updated ? 'Notification marked as read.' : 'Notification not found or already read.',
    });
  } catch (error: any) {
    console.error('[NotificationController] markAsRead error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification.',
    });
  }
};

export const markAllAsReadController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const count = await NotificationService.markAllAsRead(req.user._id);

    res.status(200).json({
      success: true,
      markedCount: count,
      message: 'All notifications marked as read.',
    });
  } catch (error: any) {
    console.error('[NotificationController] markAllAsRead error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read.',
    });
  }
};
