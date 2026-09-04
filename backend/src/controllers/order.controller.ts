import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Order, IOrderItem } from '../models/Order.model';
import { Cart } from '../models/Cart.model';
import { Product } from '../models/Product.model';
import { User } from '../models/User.model';

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

    // Load Farmer's Cart from MongoDB
    const cart = await Cart.findOne({ farmer: req.user._id });
    if (!cart || cart.items.length === 0) {
      res.status(400).json({ success: false, message: 'Your cart is empty. Add items before checkout.' });
      return;
    }

    // Determine delivery address
    const customAddress = req.body.deliveryAddress;
    const userDoc = await User.findById(req.user._id);
    const deliveryAddress = {
      street: customAddress?.street || userDoc?.address?.street || '',
      city: customAddress?.city || userDoc?.address?.city || '',
      state: customAddress?.state || userDoc?.address?.state || '',
      pincode: customAddress?.pincode || userDoc?.address?.pincode || '',
    };

    if (
      !deliveryAddress.street.trim() ||
      !deliveryAddress.city.trim() ||
      !deliveryAddress.state.trim() ||
      !deliveryAddress.pincode.trim()
    ) {
      res.status(400).json({
        success: false,
        message: 'Complete delivery address (street, city, state, pincode) is required.',
      });
      return;
    }

    // Validate each product against live MongoDB data
    const orderItems: IOrderItem[] = [];
    let totalAmount = 0;

    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        res.status(400).json({
          success: false,
          message: `A product in your cart is no longer available in the marketplace.`,
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

      orderItems.push({
        product: product._id,
        shopOwner: product.shopOwner,
        productNameSnapshot: product.name,
        price: product.price,
        quantity: item.quantity,
        unit: product.unit,
        subtotal: itemSubtotal,
      });
    }

    // Atomically decrement stock for all ordered products
    for (const item of cart.items) {
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

    // Create Order document in MongoDB
    const order = await Order.create({
      orderNumber,
      farmer: req.user._id,
      items: orderItems,
      totalAmount,
      deliveryAddress,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod,
      statusTimeline: [
        {
          status: 'PENDING',
          timestamp: new Date(),
          message:
            paymentMethod === 'CASH_ON_DELIVERY'
              ? 'Order placed by farmer (Cash on Delivery)'
              : 'Order placed by farmer',
        },
      ],
    });

    // Clear Farmer Cart
    cart.items = [];
    await cart.save();

    await order.populate([
      { path: 'farmer', select: 'name email phone' },
      { path: 'items.shopOwner', select: 'name email phone address shopName upiId qrCodeUrl' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      order,
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

    // 1. Find all product IDs belonging to this shop owner
    const myProducts = await Product.find({ shopOwner: req.user._id }).select('_id');
    const myProductIds = myProducts.map((p) => p._id);
    const myProductIdsStr = new Set(myProducts.map((p) => p._id.toString()));

    // 2. Find orders containing either items.shopOwner = req.user._id OR items.product in myProductIds
    const orders = await Order.find({
      $or: [
        { 'items.shopOwner': req.user._id },
        { 'items.product': { $in: myProductIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .populate('farmer', 'name email phone address')
      .populate('items.shopOwner', 'name email phone address shopName upiId qrCodeUrl');

    // 3. Filter items specifically belonging to this shop owner
    const formattedOrders = orders
      .map((order) => {
        const myItems = order.items.filter((item) => {
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

        return {
          id: order._id.toString(),
          _id: order._id.toString(),
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus || 'PENDING',
          paymentMethod: order.paymentMethod || 'UPI_QR',
          rejectionReason: order.rejectionReason,
          statusTimeline: order.statusTimeline || [],
          farmer: order.farmer,
          deliveryAddress: order.deliveryAddress,
          items: myItems,
          allOrderItemsCount: order.items.length,
          shopSubtotal,
          orderTotal: order.totalAmount,
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

    if (order.status !== 'PENDING') {
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
