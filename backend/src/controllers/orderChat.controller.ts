import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Order } from '../models/Order.model';
import { OrderMessage, MessageSenderRole } from '../models/OrderMessage.model';
import { Product } from '../models/Product.model';

// Helper to verify user access to this order
const verifyOrderAccess = async (orderId: string, userId: string, role: string) => {
  const order = await Order.findById(orderId)
    .populate('farmer', '_id name phone')
    .populate('items.shopOwner', '_id name phone shopName')
    .populate('acceptedShopOwner', '_id name phone shopName')
    .populate('assignedShopOwner', '_id name phone shopName')
    .populate('deliveryBoy', '_id name phone');

  if (!order) return { order: null, authorized: false };

  if (role === 'ADMIN') return { order, authorized: true };

  const isFarmerOwner =
    order.farmer?._id?.toString() === userId || order.farmer?.toString() === userId;

  const isShopOwnerOfOrder =
    order.acceptedShopOwner?._id?.toString() === userId ||
    order.assignedShopOwner?._id?.toString() === userId ||
    order.items.some((item) => {
      const itemShopOwnerId =
        (item.shopOwner as any)?._id?.toString() ||
        (item.shopOwner as any)?.id?.toString() ||
        item.shopOwner?.toString();
      return itemShopOwnerId === userId;
    });

  const isDeliveryBoyOfOrder =
    Boolean(order.deliveryBoy && ((order.deliveryBoy as any)._id?.toString() === userId || order.deliveryBoy.toString() === userId));

  const authorized = isFarmerOwner || isShopOwnerOfOrder || isDeliveryBoyOfOrder;
  return { order, authorized };
};

export const getOrderMessages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ success: false, message: 'Invalid Order ID.' });
      return;
    }

    const userIdStr = req.user._id.toString();
    const { order, authorized } = await verifyOrderAccess(id, userIdStr, req.user.role);

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    if (!authorized) {
      res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to view messages for this order.' });
      return;
    }

    // Fetch messages
    const messages = await OrderMessage.find({ order: order._id })
      .sort({ createdAt: 1 })
      .lean();

    // Mark messages as read by this user
    await OrderMessage.updateMany(
      { order: order._id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

export const sendOrderMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const { message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ success: false, message: 'Invalid Order ID.' });
      return;
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Message content cannot be empty.' });
      return;
    }

    const userIdStr = req.user._id.toString();
    const { order, authorized } = await verifyOrderAccess(id, userIdStr, req.user.role);

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    if (!authorized) {
      res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to post messages on this order.' });
      return;
    }

    const roleMap: Record<string, MessageSenderRole> = {
      FARMER: 'FARMER',
      SHOP_OWNER: 'SHOP_OWNER',
      AGRI_PARTNER: 'AGRI_PARTNER',
      DELIVERY_BOY: 'DELIVERY_BOY',
      ADMIN: 'ADMIN',
    };

    const senderRole: MessageSenderRole = roleMap[req.user.role] || 'FARMER';
    const senderName = req.user.name || 'Agro Partner';

    const newMessage = await OrderMessage.create({
      order: order._id,
      sender: req.user._id,
      senderName,
      senderRole,
      message: message.trim(),
      readBy: [req.user._id],
    });

    res.status(201).json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    next(error);
  }
};

export const markOrderMessagesRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ success: false, message: 'Invalid Order ID.' });
      return;
    }

    await OrderMessage.updateMany(
      { order: id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as read.',
    });
  } catch (error) {
    next(error);
  }
};
