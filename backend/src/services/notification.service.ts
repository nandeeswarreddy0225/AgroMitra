import mongoose from 'mongoose';
import { Notification, INotification, NotificationType } from '../models/Notification.model';
import { User } from '../models/User.model';

export class NotificationService {
  /**
   * Create an in-app notification for a user
   */
  public static async createNotification(payload: {
    userId: string | mongoose.Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
  }): Promise<INotification> {
    return await Notification.create({
      user: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data || {},
      read: false,
    });
  }

  /**
   * Broadcast price alert to interested farmers when price shifts significantly
   */
  public static async broadcastPriceChange(commodityName: string, oldPrice: number, newPrice: number, unit: string, marketName: string): Promise<void> {
    try {
      const change = newPrice - oldPrice;
      const pct = oldPrice > 0 ? ((change / oldPrice) * 100).toFixed(1) : '0';
      const direction = change > 0 ? 'increased' : 'decreased';
      const arrow = change > 0 ? '📈' : '📉';

      const title = `${arrow} ${commodityName} Rate Update (${marketName})`;
      const message = `${commodityName} price ${direction} from ₹${oldPrice} to ₹${newPrice}/${unit} (${pct}% change) at ${marketName}.`;

      // Find active farmers to notify
      const farmers = await User.find({ role: 'FARMER', status: 'ACTIVE' }).limit(50).select('_id');
      const docs = farmers.map((f) => ({
        user: f._id,
        type: 'PRICE_ALERT' as NotificationType,
        title,
        message,
        data: { commodityName, oldPrice, newPrice, unit, marketName },
        read: false,
      }));

      if (docs.length > 0) {
        await Notification.insertMany(docs);
      }
    } catch (err) {
      console.warn('[NotificationService] Broadcast price change warning:', err);
    }
  }

  /**
   * Get user notifications
   */
  public static async getUserNotifications(userId: string | mongoose.Types.ObjectId, limit = 20): Promise<{
    notifications: INotification[];
    unreadCount: number;
  }> {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(limit),
      Notification.countDocuments({ user: userId, read: false }),
    ]);

    return { notifications, unreadCount };
  }

  /**
   * Mark notification as read
   */
  public static async markAsRead(notificationId: string, userId: string | mongoose.Types.ObjectId): Promise<boolean> {
    const res = await Notification.updateOne(
      { _id: notificationId, user: userId },
      { $set: { read: true } }
    );
    return res.modifiedCount > 0;
  }

  /**
   * Mark all notifications as read
   */
  public static async markAllAsRead(userId: string | mongoose.Types.ObjectId): Promise<number> {
    const res = await Notification.updateMany(
      { user: userId, read: false },
      { $set: { read: true } }
    );
    return res.modifiedCount;
  }
}
