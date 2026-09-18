import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Order, IOrderItem } from '../models/Order.model';
import { Cart } from '../models/Cart.model';
import { Product } from '../models/Product.model';
import { User } from '../models/User.model';
import { ShopMatchingService } from '../services/shopMatching.service';

export const createOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const userDoc = await User.findById(req.user._id);

    // Support direct single product purchase (e.g. from AI scan result) or cart purchase
    let requestedItems: { product: any; quantity: number; shopOwnerId?: any }[] = [];
    let isDirectOrder = false;

    if (req.body.productId) {
      isDirectOrder = true;
      const qty = Math.max(1, Number(req.body.quantity) || 1);
      requestedItems = [{ product: req.body.productId, quantity: qty, shopOwnerId: req.body.shopOwnerId }];
    } else if (Array.isArray(req.body.items) && req.body.items.length > 0) {
      isDirectOrder = true;
      requestedItems = req.body.items.map((it: any) => ({
        product: it.productId || it.product,
        quantity: Math.max(1, Number(it.quantity) || 1),
        shopOwnerId: it.shopOwnerId || it.shopOwner,
      }));
    } else {
      // Load Farmer's Cart from MongoDB
      const cart = await Cart.findOne({ farmer: req.user._id });
      if (!cart || cart.items.length === 0) {
        res.status(400).json({ success: false, message: 'Your cart is empty. Add items before checkout.' });
        return;
      }
      requestedItems = cart.items.map((it) => ({
        product: it.product,
        quantity: it.quantity,
      }));
    }

    // Determine delivery address with intelligent defaults from farmer user profile
    const customAddress = req.body.deliveryAddress;

    const rawLat =
      customAddress?.latitude !== undefined && customAddress?.latitude !== null && !isNaN(Number(customAddress.latitude))
        ? Number(customAddress.latitude)
        : userDoc?.address?.latitude;
    const rawLon =
      customAddress?.longitude !== undefined && customAddress?.longitude !== null && !isNaN(Number(customAddress.longitude))
        ? Number(customAddress.longitude)
        : userDoc?.address?.longitude;

    const street = (customAddress?.street || userDoc?.address?.street || '').trim() || 'Agricultural Field / Farm Gate';
    const city = (customAddress?.city || userDoc?.address?.city || '').trim() || 'Local District';
    const state = (customAddress?.state || userDoc?.address?.state || '').trim() || 'Andhra Pradesh';
    const pincode = (customAddress?.pincode || userDoc?.address?.pincode || '').trim() || '518001';

    const deliveryAddress = {
      street,
      city,
      state,
      pincode,
      latitude: rawLat !== undefined && !isNaN(rawLat) ? rawLat : undefined,
      longitude: rawLon !== undefined && !isNaN(rawLon) ? rawLon : undefined,
    };

    // Validate each product against live MongoDB data
    const orderItems: IOrderItem[] = [];
    let totalAmount = 0;
    let designatedShopOwner: mongoose.Types.ObjectId | undefined = undefined;

    for (const item of requestedItems) {
      const product = await Product.findById(item.product);
      if (!product || product.isActive === false) {
        res.status(400).json({
          success: false,
          message: `Product '${product?.name || 'Item'}' is no longer available for purchase in the marketplace.`,
        });
        return;
      }

      if (product.stock < item.quantity) {
        res.status(400).json({
          success: false,
          message: `Insufficient stock for '${product.name}'. Available: ${product.stock} ${product.unit}, requested: ${item.quantity}.`,
        });
        return;
      }

      const itemSubtotal = product.price * item.quantity;
      totalAmount += itemSubtotal;

      const shopOwnerId = item.shopOwnerId && mongoose.Types.ObjectId.isValid(item.shopOwnerId)
        ? new mongoose.Types.ObjectId(item.shopOwnerId)
        : product.shopOwner;

      if (!designatedShopOwner) {
        designatedShopOwner = shopOwnerId;
      }

      orderItems.push({
        product: product._id,
        shopOwner: shopOwnerId,
        productNameSnapshot: product.name,
        price: product.price,
        quantity: item.quantity,
        unit: product.unit,
        subtotal: itemSubtotal,
      });
    }

    // Atomically decrement stock for all ordered products
    for (const item of requestedItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    // Extract payment method preference
    const rawPaymentMethod = req.body.paymentMethod;
    const paymentMethod = ['UPI_QR', 'RAZORPAY', 'CASH_ON_DELIVERY'].includes(rawPaymentMethod)
      ? rawPaymentMethod
      : 'UPI_QR';

    // Generate unique order number
    const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `AGM-${Date.now().toString().slice(-6)}-${uniqueSuffix}`;

    // Create Order document in MongoDB with WAITING_FOR_SHOP status and assignedShopOwner
    const order = await Order.create({
      orderNumber,
      farmer: req.user._id,
      items: orderItems,
      totalAmount,
      deliveryAddress,
      status: 'WAITING_FOR_SHOP',
      assignedShopOwner: designatedShopOwner,
      paymentStatus: 'PENDING',
      paymentMethod,
      statusTimeline: [
        {
          status: 'WAITING_FOR_SHOP',
          timestamp: new Date(),
          message:
            paymentMethod === 'CASH_ON_DELIVERY'
              ? 'Order placed by farmer (Cash on Delivery). Locating nearby store...'
              : 'Order placed by farmer. Locating nearby store...',
        },
      ],
    });

    // Clear Farmer Cart if order was placed via cart checkout
    if (!isDirectOrder) {
      await Cart.findOneAndUpdate({ farmer: req.user._id }, { items: [] });
    }

    // Trigger nearby shop matching service for general cart orders without designated shop
    if (!isDirectOrder || !designatedShopOwner) {
      try {
        await ShopMatchingService.assignOrderToBestShop(order._id);
      } catch (matchErr) {
        console.warn('⚠️ [OrderRouting]: Error during automatic shop matching:', matchErr);
      }
    }

    const populatedOrder = await Order.findById(order._id).populate([
      { path: 'farmer', select: 'name email phone' },
      { path: 'items.shopOwner', select: 'name email phone address shopName upiId qrCodeUrl' },
      { path: 'assignedShopOwner', select: 'name email phone address shopName' },
      { path: 'acceptedShopOwner', select: 'name email phone address shopName' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully and routed to nearby retail store.',
      order: populatedOrder || order,
    });
  } catch (error) {
    next(error);
  }
};

export const getFarmerOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const orders = await Order.find({ farmer: req.user._id })
      .sort({ createdAt: -1 })
      .populate('farmer', 'name email phone address')
      .populate('items.shopOwner', 'name email phone address shopName upiId qrCodeUrl');

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

export const getShopOwnerOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const userIdStr = req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    // 1. Find all product IDs belonging to this shop owner
    const myProducts = await Product.find({ shopOwner: req.user._id }).select('_id');
    const myProductIds = myProducts.map((p) => p._id);
    const myProductIdsStr = new Set(myProducts.map((p) => p._id.toString()));

    // 2. Find orders (all orders if Admin, or orders containing items or assigned/accepted/eligible for shop owner)
    const orderQuery = isAdmin
      ? {}
      : {
          $or: [
            { assignedShopOwner: req.user._id },
            { acceptedShopOwner: req.user._id },
            { 'eligibleShops.shopOwner': req.user._id },
            { 'items.shopOwner': req.user._id },
            { 'items.product': { $in: myProductIds } },
          ],
        };

    const orders = await Order.find(orderQuery)
      .sort({ createdAt: -1 })
      .populate('farmer', 'name email phone address')
      .populate('items.shopOwner', 'name email phone address shopName upiId qrCodeUrl');

    // 3. Filter items specifically belonging to this shop owner (or all if assigned/accepted or Admin)
    const formattedOrders = orders
      .map((order) => {
        const isAssignedToMe = order.assignedShopOwner?.toString() === userIdStr;
        const isAcceptedByMe = order.acceptedShopOwner?.toString() === userIdStr;
        const eligibleEntry = (order.eligibleShops || []).find(
          (e) => e.shopOwner.toString() === userIdStr
        );

        const myItems = isAdmin || isAssignedToMe || isAcceptedByMe
          ? order.items
          : order.items.filter((item) => {
              const itemShopOwnerId =
                (item.shopOwner as any)?._id?.toString() ||
                (item.shopOwner as any)?.id?.toString() ||
                item.shopOwner?.toString();
              const itemProdId =
                (item.product as any)?._id?.toString() ||
                (item.product as any)?.id?.toString() ||
                item.product?.toString();

              return (
                itemShopOwnerId === userIdStr ||
                (itemProdId && myProductIdsStr.has(itemProdId))
              );
            });

        if (myItems.length === 0) return null;

        const shopSubtotal = myItems.reduce((acc, curr) => acc + curr.subtotal, 0);
        const distanceKm = eligibleEntry ? eligibleEntry.distanceKm : undefined;

        // Privacy-preserving farmer view (do NOT expose phone until accepted)
        const sanitizedFarmer = isAcceptedByMe || isAdmin
          ? order.farmer
          : {
              _id: (order.farmer as any)?._id,
              name: (order.farmer as any)?.name,
              phone: (order.farmer as any)?.phone
                ? `${(order.farmer as any).phone.slice(0, 3)}****${(order.farmer as any).phone.slice(-3)}`
                : '',
              address: {
                city: (order.farmer as any)?.address?.city || order.deliveryAddress?.city,
                state: (order.farmer as any)?.address?.state || order.deliveryAddress?.state,
              },
            };

        // Privacy-preserving delivery address
        const sanitizedAddress = isAcceptedByMe || isAdmin
          ? order.deliveryAddress
          : {
              street: 'Rural Mandal / Delivery Zone (Details revealed upon acceptance)',
              city: order.deliveryAddress.city,
              state: order.deliveryAddress.state,
              pincode: order.deliveryAddress.pincode,
            };

        return {
          id: order._id.toString(),
          _id: order._id.toString(),
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus || 'PENDING',
          paymentMethod: order.paymentMethod || 'UPI_QR',
          rejectionReason: order.rejectionReason,
          statusTimeline: order.statusTimeline || [],
          farmer: sanitizedFarmer,
          deliveryAddress: sanitizedAddress,
          items: myItems,
          allOrderItemsCount: order.items.length,
          shopSubtotal,
          orderTotal: order.totalAmount,
          assignedShopOwner: order.assignedShopOwner,
          acceptedShopOwner: order.acceptedShopOwner,
          acceptedAt: order.acceptedAt,
          distanceKm,
          isAssignedToMe,
          isAcceptedByMe,
          canAccept:
            ['PENDING', 'WAITING_FOR_SHOP'].includes(order.status) &&
            !order.acceptedShopOwner &&
            (isAssignedToMe || Boolean(eligibleEntry) || isAdmin),
          deliveryBoy: order.deliveryBoy,
          deliveryBoyName: order.deliveryBoyName,
          deliveryBoyPhone: order.deliveryBoyPhone,
          deliveryAssignedAt: order.deliveryAssignedAt,
          deliveryResponseStatus: order.deliveryResponseStatus,
          deliveryRespondedAt: order.deliveryRespondedAt,
          deliveryRejectionReason: order.deliveryRejectionReason,
          deliveryPickedUpAt: order.deliveryPickedUpAt,
          deliveryDeliveredAt: order.deliveryDeliveredAt,
          deliveryStatus: order.deliveryStatus,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        };
      })
      .filter((o): o is NonNullable<typeof o> => o !== null);


    res.status(200).json({
      success: true,
      count: formattedOrders.length,
      orders: formattedOrders,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (
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
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const order = await Order.findById(id)
      .populate('farmer', 'name email phone address')
      .populate('items.shopOwner', 'name email phone address shopName upiId qrCodeUrl')
      .populate({
        path: 'items.product',
        select: 'name price unit images shopOwner',
        populate: {
          path: 'shopOwner',
          select: 'name email phone address shopName upiId qrCodeUrl',
        },
      });


    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const userIdStr = req.user._id.toString();
    const myProducts = await Product.find({ shopOwner: req.user._id }).select('_id');
    const myProductIdsStr = new Set(myProducts.map((p) => p._id.toString()));

    const isFarmerOwner =
      order.farmer._id?.toString() === userIdStr || order.farmer.toString() === userIdStr;
    const isShopOwnerOfItem = order.items.some((item) => {
      const itemShopOwnerId =
        (item.shopOwner as any)?._id?.toString() ||
        (item.shopOwner as any)?.id?.toString() ||
        item.shopOwner?.toString();
      const itemProdId =
        (item.product as any)?._id?.toString() ||
        (item.product as any)?.id?.toString() ||
        item.product?.toString();

      return itemShopOwnerId === userIdStr || (itemProdId && myProductIdsStr.has(itemProdId));
    });
    const isDeliveryBoyOfOrder =
      Boolean(order.deliveryBoy && order.deliveryBoy.toString() === userIdStr);
    const isAdmin = req.user.role === 'ADMIN';

    if (!isFarmerOwner && !isShopOwnerOfItem && !isDeliveryBoyOfOrder && !isAdmin) {
      res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to view this order.' });
      return;
    }


    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (
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
    const { status, rejectionReason, message } = req.body;

    const validStatuses = [
      'ACCEPTED',
      'PREPARING',
      'PROCESSING',
      'READY_FOR_DELIVERY',
      'PACKED',
      'OUT_FOR_DELIVERY',
      'DISPATCHED',
      'DELIVERED',
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
    ];


    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}.`,
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const userIdStr = req.user._id.toString();
    const myProducts = await Product.find({ shopOwner: req.user._id }).select('_id');
    const myProductIdsStr = new Set(myProducts.map((p) => p._id.toString()));

    // Check if this shop owner owns at least one item in the order
    const isShopOwnerOfItem = order.items.some((item) => {
      const itemShopOwnerId =
        (item.shopOwner as any)?._id?.toString() ||
        (item.shopOwner as any)?.id?.toString() ||
        item.shopOwner?.toString();
      const itemProdId =
        (item.product as any)?._id?.toString() ||
        (item.product as any)?.id?.toString() ||
        item.product?.toString();

      return itemShopOwnerId === userIdStr || (itemProdId && myProductIdsStr.has(itemProdId));
    });
    const isAdmin = req.user.role === 'ADMIN';

    if (!isShopOwnerOfItem && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to update this order.',
      });
      return;
    }

    if (order.status === 'CANCELLED') {
      res.status(400).json({
        success: false,
        message: 'Cannot update a cancelled order.',
      });
      return;
    }

    // If changing to REJECTED, restore product stock for this shop owner's items
    if (status === 'REJECTED' && order.status !== 'REJECTED') {
      for (const item of order.items) {
        const itemShopOwnerId =
          (item.shopOwner as any)?._id?.toString() ||
          (item.shopOwner as any)?.id?.toString() ||
          item.shopOwner?.toString();
        const itemProdId =
          (item.product as any)?._id?.toString() ||
          (item.product as any)?.id?.toString() ||
          item.product?.toString();

        if (isAdmin || itemShopOwnerId === userIdStr || (itemProdId && myProductIdsStr.has(itemProdId))) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity },
          });
        }
      }
    }

    const timelineMessage =
      message ||
      (status === 'ACCEPTED'
        ? 'Order accepted by store'
        : status === 'PREPARING' || status === 'PROCESSING'
        ? 'Order is being prepared'
        : status === 'READY_FOR_DELIVERY' || status === 'PACKED'
        ? 'Order is ready for delivery'
        : status === 'OUT_FOR_DELIVERY' || status === 'DISPATCHED'
        ? 'Order is out for delivery'
        : status === 'DELIVERED' || status === 'COMPLETED'
        ? 'Order successfully delivered to farmer'
        : status === 'REJECTED'
        ? rejectionReason
          ? `Order rejected: ${rejectionReason}`
          : 'Order rejected by store'
        : `Order updated to ${status}`);


    if (!order.statusTimeline) {
      order.statusTimeline = [];
    }
    order.statusTimeline.push({
      status,
      timestamp: new Date(),
      message: timelineMessage,
    });

    if (status === 'REJECTED' && rejectionReason) {
      order.rejectionReason = rejectionReason;
    }

    if (req.body.paymentStatus && ['PENDING', 'PAID', 'FAILED', 'REFUNDED'].includes(req.body.paymentStatus)) {
      order.paymentStatus = req.body.paymentStatus;
    } else if (status === 'DELIVERED' && order.paymentMethod === 'CASH_ON_DELIVERY') {
      order.paymentStatus = 'PAID';
    }

    order.status = status;
    await order.save();

    await order.populate([
      { path: 'farmer', select: 'name email phone address' },
      { path: 'items.shopOwner', select: 'name email phone address shopName upiId qrCodeUrl' },
    ]);

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}.`,
      order,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (
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
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    // Security: Only the farmer who placed the order can cancel it
    if (order.farmer.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You can only cancel your own orders.',
      });
      return;
    }

    if (order.status !== 'PENDING' && order.status !== 'WAITING_FOR_SHOP') {
      res.status(400).json({
        success: false,
        message: `Order cannot be cancelled because its current status is ${order.status}.`,
      });
      return;
    }

    // Restore stock for all products in the cancelled order
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    if (!order.statusTimeline) {
      order.statusTimeline = [];
    }
    order.statusTimeline.push({
      status: 'CANCELLED',
      timestamp: new Date(),
      message: 'Order cancelled by farmer',
    });

    order.status = 'CANCELLED';
    await order.save();

    await order.populate([
      { path: 'farmer', select: 'name email phone address' },
      { path: 'items.shopOwner', select: 'name email phone address' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully and stock restored.',
      order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Accept Order by Nearby Shop Owner (Atomic Concurrency Protection)
 * POST /api/orders/:id/accept
 */
export const acceptShopOrder = async (
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
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const userId = req.user._id;
    const userIdStr = userId.toString();
    const isAdmin = req.user.role === 'ADMIN';

    // Locate order first to check existence and business rules
    const existingOrder = await Order.findById(id);
    if (!existingOrder) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    // Phase 10 Payment Safety:
    // If order was placed with online Razorpay and not yet verified, block acceptance
    if (existingOrder.paymentMethod === 'RAZORPAY' && existingOrder.paymentStatus !== 'PAID') {
      res.status(400).json({
        success: false,
        message: 'Cannot accept order: Online payment via Razorpay has not been completed or verified.',
      });
      return;
    }

    // Phase 7 & 11: Database-Level Atomic Concurrency Check
    // Using findOneAndUpdate with condition that status must be PENDING or WAITING_FOR_SHOP and acceptedShopOwner is not yet set
    const filterQuery: any = {
      _id: id,
      status: { $in: ['PENDING', 'WAITING_FOR_SHOP'] },
      acceptedShopOwner: { $exists: false },
    };

    if (!isAdmin) {
      filterQuery.$or = [
        { assignedShopOwner: userId },
        { 'eligibleShops.shopOwner': userId },
        { 'items.shopOwner': userId },
      ];
    }

    const shopName = req.user.shopName || req.user.name || 'Agro Store';

    const updatedOrder = await Order.findOneAndUpdate(
      filterQuery,
      {
        $set: {
          status: 'SHOP_ACCEPTED',
          acceptedShopOwner: userId,
          assignedShopOwner: userId,
          acceptedAt: new Date(),
        },
        $push: {
          statusTimeline: {
            status: 'SHOP_ACCEPTED',
            timestamp: new Date(),
            message: `Order accepted by store (${shopName}).`,
          },
        },
      },
      { new: true }
    )
      .populate('farmer', 'name email phone address')
      .populate('items.shopOwner', 'name email phone address shopName upiId qrCodeUrl')
      .populate('assignedShopOwner', 'name email phone address shopName')
      .populate('acceptedShopOwner', 'name email phone address shopName');

    if (!updatedOrder) {
      const current = await Order.findById(id);
      if (!current) {
        res.status(404).json({ success: false, message: 'Order not found.' });
        return;
      }

      if (
        current.acceptedShopOwner ||
        ['SHOP_ACCEPTED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(current.status)
      ) {
        res.status(409).json({
          success: false,
          message: 'Conflict: This order has already been accepted by another store.',
        });
        return;
      }

      res.status(403).json({
        success: false,
        message: 'You are not authorized or eligible to accept this order.',
      });
      return;
    }

    // Update status in eligibleShops array
    if (updatedOrder.eligibleShops) {
      const entry = updatedOrder.eligibleShops.find(
        (e) => e.shopOwner.toString() === userIdStr
      );
      if (entry) {
        entry.status = 'ACCEPTED';
        await updatedOrder.save();
      }
    }

    res.status(200).json({
      success: true,
      message: `Order #${updatedOrder.orderNumber} successfully accepted.`,
      order: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject Order by Nearby Shop Owner (Automatic Rerouting to Next Nearest Shop)
 * POST /api/orders/:id/reject
 */
export const rejectShopOrder = async (
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
    const { rejectionReason } = req.body;

    if (!rejectionReason || typeof rejectionReason !== 'string' || !rejectionReason.trim()) {
      res.status(400).json({
        success: false,
        message: 'A specific rejection reason is required (e.g. Out of stock, Unable to fulfill, Store closed, Other).',
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const userId = req.user._id;
    const userIdStr = userId.toString();
    const isAdmin = req.user.role === 'ADMIN';

    // Validate that order has not already been claimed/accepted by another shop
    if (
      order.acceptedShopOwner &&
      order.acceptedShopOwner.toString() !== userIdStr &&
      !isAdmin
    ) {
      res.status(400).json({
        success: false,
        message: 'Cannot reject an order that has already been accepted by another store.',
      });
      return;
    }

    // Record rejection in history
    const cleanReason = rejectionReason.trim();
    if (!order.rejectionHistory) {
      order.rejectionHistory = [];
    }
    order.rejectionHistory.push({
      shopOwner: userId,
      rejectedAt: new Date(),
      rejectionReason: cleanReason,
    });

    if (order.eligibleShops) {
      const entry = order.eligibleShops.find(
        (e) => e.shopOwner.toString() === userIdStr
      );
      if (entry) {
        entry.status = 'REJECTED';
        entry.rejectedAt = new Date();
        entry.rejectionReason = cleanReason;
      }
    }

    order.rejectionReason = cleanReason;
    const shopName = req.user.shopName || req.user.name || 'Store';

    order.statusTimeline.push({
      status: order.status,
      timestamp: new Date(),
      message: `Order declined by ${shopName}: ${cleanReason}. Finding next available nearby store...`,
    });

    await order.save();

    // Trigger automatic rerouting to next eligible nearby shop
    const routingResult = await ShopMatchingService.routeOrderToNextShop(order._id);

    const populatedOrder = await Order.findById(order._id).populate([
      { path: 'farmer', select: 'name email phone address' },
      { path: 'items.shopOwner', select: 'name email phone address shopName upiId qrCodeUrl' },
      { path: 'assignedShopOwner', select: 'name email phone address shopName' },
      { path: 'acceptedShopOwner', select: 'name email phone address shopName' },
    ]);

    res.status(200).json({
      success: true,
      message: routingResult.exhausted
        ? 'Order rejected. No other nearby stores available.'
        : `Order declined. Automatically rerouted to next nearest store.`,
      routing: routingResult,
      order: populatedOrder || order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Advance Order to PREPARING
 * PUT /api/orders/:id/prepare
 */
export const prepareShopOrder = async (
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
    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const userIdStr = req.user._id.toString();
    const isOwner =
      req.user.role === 'ADMIN' ||
      order.acceptedShopOwner?.toString() === userIdStr ||
      order.assignedShopOwner?.toString() === userIdStr ||
      order.items.some((i) => i.shopOwner.toString() === userIdStr);

    if (!isOwner) {
      res.status(403).json({ success: false, message: 'Forbidden: You do not own this order.' });
      return;
    }

    order.status = 'PREPARING';
    order.statusTimeline.push({
      status: 'PREPARING',
      timestamp: new Date(),
      message: 'Store has begun preparing and packaging your order.',
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order status updated to PREPARING.',
      order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Advance Order to READY_FOR_PICKUP
 * PUT /api/orders/:id/ready-for-pickup
 */
export const readyForPickupShopOrder = async (
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
    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const userIdStr = req.user._id.toString();
    const isOwner =
      req.user.role === 'ADMIN' ||
      order.acceptedShopOwner?.toString() === userIdStr ||
      order.assignedShopOwner?.toString() === userIdStr ||
      order.items.some((i) => i.shopOwner.toString() === userIdStr);

    if (!isOwner) {
      res.status(403).json({ success: false, message: 'Forbidden: You do not own this order.' });
      return;
    }

    order.status = 'READY_FOR_PICKUP';
    order.statusTimeline.push({
      status: 'READY_FOR_PICKUP',
      timestamp: new Date(),
      message: 'Order is packed and ready for delivery partner pickup.',
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order status updated to READY_FOR_PICKUP.',
      order,
    });
  } catch (error) {
    next(error);
  }
};
