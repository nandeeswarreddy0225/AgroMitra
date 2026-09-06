import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User.model';
import { DeliveryBoy } from '../models/DeliveryBoy.model';
import { Order, DeliveryStatus, DeliveryResponseStatus } from '../models/Order.model';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

/**
 * Get all real registered delivery partners available in MongoDB
 * GET /api/delivery/shop-delivery-boys
 */
export const getShopDeliveryBoys = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user || (user.role !== 'SHOP_OWNER' && user.role !== 'AGRI_PARTNER' && user.role !== 'ADMIN')) {
      res.status(403).json({
        success: false,
        message: 'Access restricted to Agri Retail Partners and Administrators.',
      });
      return;
    }

    // 1. Fetch all DeliveryBoy profiles
    let deliveryBoys = await DeliveryBoy.find()
      .sort({ isAvailable: -1, createdAt: -1 })
      .populate('user', 'name email phone role address');

    // 2. Also ensure any User with role 'DELIVERY_BOY' that doesn't have a DeliveryBoy profile has one
    const deliveryUsers = await User.find({ role: 'DELIVERY_BOY' });
    const existingUserIds = new Set(deliveryBoys.map((db) => db.user?._id?.toString() || db.user?.toString()));

    for (const dUser of deliveryUsers) {
      if (!existingUserIds.has(dUser._id.toString())) {
        const newProfile = await DeliveryBoy.create({
          user: dUser._id,
          name: dUser.name,
          phone: dUser.phone,
          email: dUser.email,
          vehicleType: 'Motorcycle / Two-Wheeler',
          deliveryArea: 'Local Agricultural Mandals & Rural Hub',
          isAvailable: true,
          activeOrdersCount: 0,
        });
        deliveryBoys.push(newProfile);
      }
    }

    res.status(200).json({
      success: true,
      count: deliveryBoys.length,
      deliveryBoys,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register a new Delivery Boy under the authenticated Agri Retail Partner
 * POST /api/delivery/create
 */
export const createShopDeliveryBoy = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user || (user.role !== 'SHOP_OWNER' && user.role !== 'AGRI_PARTNER' && user.role !== 'ADMIN')) {
      res.status(403).json({
        success: false,
        message: 'Access restricted to Agri Retail Partners and Administrators.',
      });
      return;
    }

    const { name, email, phone, password, vehicleType, deliveryArea } = req.body;

    if (!name || !email || !phone || !password) {
      res.status(400).json({
        success: false,
        message: 'Name, email, phone, and password are required.',
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
      return;
    }

    // 1. Create Delivery Boy User account
    const deliveryUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password, // Pre-save hook hashes with bcrypt
      role: 'DELIVERY_BOY',
      address: {
        city: user.address?.city || '',
        state: user.address?.state || '',
      },
    });

    // 2. Create DeliveryBoy profile document linked to shop owner
    const deliveryBoyProfile = await DeliveryBoy.create({
      user: deliveryUser._id,
      shopOwner: user._id,
      name: deliveryUser.name,
      phone: deliveryUser.phone,
      email: deliveryUser.email,
      vehicleType: vehicleType?.trim() || 'Motorcycle / Two-Wheeler',
      deliveryArea: deliveryArea?.trim() || 'Local Agricultural Mandals',
      isAvailable: true,
      activeOrdersCount: 0,
    });

    res.status(201).json({
      success: true,
      message: 'Delivery partner registered successfully under your shop.',
      deliveryBoy: deliveryBoyProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign a Delivery Partner to an Order by Agri Retail Partner or Admin
 * POST /api/delivery/assign-order
 */
export const assignDeliveryBoyToOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user || (user.role !== 'SHOP_OWNER' && user.role !== 'AGRI_PARTNER' && user.role !== 'ADMIN')) {
      res.status(403).json({
        success: false,
        message: 'Access restricted to Agri Retail Partners and Administrators.',
      });
      return;
    }

    const { orderId, deliveryBoyId } = req.body;

    if (!orderId || !deliveryBoyId) {
      res.status(400).json({
        success: false,
        message: 'Both orderId and deliveryBoyId are required.',
      });
      return;
    }

    // Locate the order
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
      return;
    }

    // Validate shop ownership or Admin / Agri Partner privileges
    const isOwner =
      user.role === 'ADMIN' ||
      user.role === 'AGRI_PARTNER' ||
      order.items.some(
        (item) => item.shopOwner && item.shopOwner.toString() === user._id.toString()
      );

    if (!isOwner) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You can only assign delivery staff to orders belonging to your shop.',
      });
      return;
    }

    // Locate Delivery Partner profile or User
    let deliveryBoyDoc = await DeliveryBoy.findOne({
      _id: mongoose.Types.ObjectId.isValid(deliveryBoyId) ? deliveryBoyId : null,
    });

    if (!deliveryBoyDoc) {
      // Check by user ID
      deliveryBoyDoc = await DeliveryBoy.findOne({
        user: mongoose.Types.ObjectId.isValid(deliveryBoyId) ? deliveryBoyId : null,
      });
    }

    let deliveryUserId = deliveryBoyDoc?.user;
    let deliveryName = deliveryBoyDoc?.name;
    let deliveryPhone = deliveryBoyDoc?.phone;

    if (!deliveryBoyDoc) {
      // Find directly in User model
      const dUser = await User.findOne({
        _id: mongoose.Types.ObjectId.isValid(deliveryBoyId) ? deliveryBoyId : null,
        role: 'DELIVERY_BOY',
      });

      if (!dUser) {
        res.status(400).json({
          success: false,
          message: 'The selected delivery partner was not found in registered delivery accounts.',
        });
        return;
      }

      deliveryUserId = dUser._id;
      deliveryName = dUser.name;
      deliveryPhone = dUser.phone;
    }

    // Update order with delivery assignment
    order.deliveryBoy = deliveryUserId;
    order.deliveryBoyName = deliveryName;
    order.deliveryBoyPhone = deliveryPhone;
    order.deliveryAssignedAt = new Date();
    order.deliveryAssignedBy = user._id;
    order.deliveryResponseStatus = 'PENDING';
    order.deliveryStatus = 'PENDING_ACCEPTANCE';
    order.deliveryRejectionReason = undefined;

    if (order.status === 'PENDING') {
      order.status = 'ACCEPTED';
    }

    order.statusTimeline.push({
      status: order.status,
      timestamp: new Date(),
      message: `Assigned to Delivery Partner: ${deliveryName} (${deliveryPhone}). Awaiting response.`,
    });

    await order.save();

    // Increment active orders count
    if (deliveryBoyDoc) {
      await DeliveryBoy.findByIdAndUpdate(deliveryBoyDoc._id, {
        $inc: { activeOrdersCount: 1 },
      });
    }

    res.status(200).json({
      success: true,
      message: `Order assigned to ${deliveryName} successfully.`,
      order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get assigned orders for the logged-in Delivery Partner
 * GET /api/delivery/assigned-orders
 */
export const getDeliveryBoyAssignedOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user || user.role !== 'DELIVERY_BOY') {
      res.status(403).json({
        success: false,
        message: 'Access restricted to Delivery Partners.',
      });
      return;
    }

    // Fetch ONLY orders assigned to this delivery partner
    const orders = await Order.find({ deliveryBoy: user._id })
      .sort({ createdAt: -1 })
      .populate('farmer', 'name phone email address')
      .populate('items.shopOwner', 'name shopName phone address upiId');

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Accept or Reject delivery assignment by Delivery Partner
 * POST /api/delivery/orders/:id/respond
 */
export const respondToDeliveryAssignment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user || user.role !== 'DELIVERY_BOY') {
      res.status(403).json({
        success: false,
        message: 'Access restricted to Delivery Partners.',
      });
      return;
    }

    const { id } = req.params;
    const { action, reason } = req.body; // action: 'ACCEPT' | 'REJECT'

    if (!['ACCEPT', 'REJECT'].includes(action)) {
      res.status(400).json({
        success: false,
        message: "Invalid action. Must be 'ACCEPT' or 'REJECT'.",
      });
      return;
    }

    const order = await Order.findById(id).populate('farmer', 'name phone address');
    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
      return;
    }

    // Security check: order must be assigned to THIS delivery partner
    if (!order.deliveryBoy || order.deliveryBoy.toString() !== user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You are not assigned to this delivery request.',
      });
      return;
    }

    // Concurrency / duplicate check: prevent accepting twice
    if (action === 'ACCEPT' && order.deliveryResponseStatus === 'ACCEPTED') {
      res.status(400).json({
        success: false,
        message: 'You have already accepted this delivery assignment.',
      });
      return;
    }

    if (action === 'ACCEPT') {
      order.deliveryResponseStatus = 'ACCEPTED';
      order.deliveryStatus = 'ACCEPTED';
      order.deliveryRespondedAt = new Date();
      order.deliveryRejectionReason = undefined;

      order.statusTimeline.push({
        status: order.status,
        timestamp: new Date(),
        message: `Delivery Partner ${user.name} accepted the dispatch request.`,
      });

      await order.save();

      res.status(200).json({
        success: true,
        message: 'Delivery request accepted successfully.',
        order,
      });
      return;
    }

    if (action === 'REJECT') {
      order.deliveryResponseStatus = 'REJECTED';
      order.deliveryStatus = 'REJECTED';
      order.deliveryRespondedAt = new Date();
      order.deliveryRejectionReason = reason?.trim() || 'Delivery partner is unavailable at this time';

      order.statusTimeline.push({
        status: order.status,
        timestamp: new Date(),
        message: `Delivery Partner ${user.name} rejected the assignment: ${order.deliveryRejectionReason}`,
      });

      await order.save();

      // Decrement active orders count
      await DeliveryBoy.findOneAndUpdate(
        { user: user._id },
        { $inc: { activeOrdersCount: -1 } }
      );

      res.status(200).json({
        success: true,
        message: 'Delivery request rejected.',
        order,
      });
      return;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Update delivery status by Delivery Partner (e.g. PICKUP_PENDING, PICKED_UP, OUT_FOR_DELIVERY, DELIVERED)
 * PATCH /api/delivery/orders/:id/status
 */
export const updateDeliveryStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user || user.role !== 'DELIVERY_BOY') {
      res.status(403).json({
        success: false,
        message: 'Access restricted to Delivery Partners.',
      });
      return;
    }

    const { id } = req.params;
    const { status, note } = req.body;

    const allowedDeliveryStatuses: DeliveryStatus[] = [
      'ACCEPTED',
      'PICKUP_PENDING',
      'PICKED_UP',
      'READY_FOR_DELIVERY',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ];

    if (!allowedDeliveryStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid delivery status. Allowed statuses: ${allowedDeliveryStatuses.join(', ')}`,
      });
      return;
    }

    const order = await Order.findById(id).populate('farmer', 'name phone address');
    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
      return;
    }

    // Security check: order must be assigned to THIS delivery partner
    if (!order.deliveryBoy || order.deliveryBoy.toString() !== user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You are not assigned to deliver this order.',
      });
      return;
    }

    // Ensure order was accepted before moving to later stages
    if (order.deliveryResponseStatus === 'REJECTED') {
      res.status(400).json({
        success: false,
        message: 'Cannot update status on a rejected delivery assignment.',
      });
      return;
    }

    order.deliveryStatus = status;

    if (status === 'PICKED_UP') {
      order.deliveryPickedUpAt = new Date();
      order.status = 'READY_FOR_DELIVERY';
      order.statusTimeline.push({
        status: 'READY_FOR_DELIVERY',
        timestamp: new Date(),
        message: note || `Package picked up from retail store by ${user.name}.`,
      });
    } else if (status === 'OUT_FOR_DELIVERY') {
      order.status = 'OUT_FOR_DELIVERY';
      order.statusTimeline.push({
        status: 'OUT_FOR_DELIVERY',
        timestamp: new Date(),
        message: note || `Out for delivery with ${user.name} (${user.phone}).`,
      });
    } else if (status === 'DELIVERED') {
      order.status = 'DELIVERED';
      order.deliveryDeliveredAt = new Date();
      order.statusTimeline.push({
        status: 'DELIVERED',
        timestamp: new Date(),
        message: note || 'Order successfully delivered to farmer.',
      });

      // Decrement active orders count on delivery completion
      await DeliveryBoy.findOneAndUpdate(
        { user: user._id },
        { $inc: { activeOrdersCount: -1 } }
      );
    } else {
      order.statusTimeline.push({
        status: order.status,
        timestamp: new Date(),
        message: note || `Delivery status updated to ${status}.`,
      });
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Delivery status updated to ${status}.`,
      order,
    });
  } catch (error) {
    next(error);
  }
};
