import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Cart } from '../models/Cart.model';
import { Product } from '../models/Product.model';

export const getCart = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    let cart = await Cart.findOne({ farmer: req.user._id }).populate({
      path: 'items.product',
      populate: {
        path: 'shopOwner',
        select: 'name email phone address',
      },
    });

    if (!cart) {
      cart = await Cart.create({ farmer: req.user._id, items: [] });
    }

    // Filter out items where product may have been removed from DB
    const validItems = cart.items.filter((item) => item.product !== null && item.product !== undefined);
    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    // Compute totals using live database pricing
    let totalItems = 0;
    let subtotal = 0;

    const formattedItems = cart.items.map((item: any) => {
      const prod = item.product;
      const currentPrice = prod ? prod.price : item.priceAtAdd;
      const currentStock = prod ? prod.stock : 0;
      const itemSubtotal = currentPrice * item.quantity;

      totalItems += item.quantity;
      subtotal += itemSubtotal;

      return {
        product: prod,
        quantity: item.quantity,
        priceAtAdd: item.priceAtAdd,
        currentPrice,
        currentStock,
        unit: prod?.unit || 'unit',
        subtotal: itemSubtotal,
        isAvailable: currentStock >= item.quantity && currentStock > 0,
      };
    });

    res.status(200).json({
      success: true,
      cart: {
        id: cart._id.toString(),
        farmer: cart.farmer,
        items: formattedItems,
        totalItems,
        subtotal,
        total: subtotal,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { productId, quantity } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({ success: false, message: 'Valid Product ID is required.' });
      return;
    }

    const numQty = parseInt(quantity, 10);
    if (isNaN(numQty) || numQty <= 0) {
      res.status(400).json({ success: false, message: 'Quantity must be a positive integer.' });
      return;
    }

    // Check product in MongoDB
    const product = await Product.findById(productId);
    if (!product || product.isActive === false) {
      res.status(404).json({ success: false, message: 'Product not found or is currently unavailable.' });
      return;
    }

    if (product.stock <= 0) {
      res.status(400).json({ success: false, message: 'Product is currently Out of Stock.' });
      return;
    }

    let cart = await Cart.findOne({ farmer: req.user._id });
    if (!cart) {
      cart = new Cart({ farmer: req.user._id, items: [] });
    }

    // Check if product is already in cart
    const existingIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingIndex > -1) {
      const newTotalQty = cart.items[existingIndex].quantity + numQty;
      if (newTotalQty > product.stock) {
        res.status(400).json({
          success: false,
          message: `Requested quantity exceeds available stock. Only ${product.stock} ${product.unit} available.`,
        });
        return;
      }
      cart.items[existingIndex].quantity = newTotalQty;
      cart.items[existingIndex].priceAtAdd = product.price;
    } else {
      if (numQty > product.stock) {
        res.status(400).json({
          success: false,
          message: `Requested quantity exceeds available stock. Only ${product.stock} ${product.unit} available.`,
        });
        return;
      }
      cart.items.push({
        product: product._id,
        quantity: numQty,
        priceAtAdd: product.price,
      });
    }

    await cart.save();

    // Call getCart logic to return fresh populated data
    return getCart(req, res, next);
  } catch (error) {
    next(error);
  }
};

export const updateCartItemQuantity = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { productId } = req.params;
    const { quantity } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({ success: false, message: 'Valid Product ID is required.' });
      return;
    }

    const numQty = parseInt(quantity, 10);
    if (isNaN(numQty) || numQty <= 0) {
      res.status(400).json({ success: false, message: 'Quantity must be a positive integer.' });
      return;
    }

    const product = await Product.findById(productId);
    if (!product || product.isActive === false) {
      res.status(404).json({ success: false, message: 'Product not found or is currently unavailable.' });
      return;
    }

    if (numQty > product.stock) {
      res.status(400).json({
        success: false,
        message: `Requested quantity exceeds available stock. Maximum available: ${product.stock} ${product.unit}.`,
      });
      return;
    }

    let cart = await Cart.findOne({ farmer: req.user._id });
    if (!cart) {
      res.status(404).json({ success: false, message: 'Cart not found.' });
      return;
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      res.status(404).json({ success: false, message: 'Product not found in your cart.' });
      return;
    }

    cart.items[itemIndex].quantity = numQty;
    cart.items[itemIndex].priceAtAdd = product.price;
    await cart.save();

    return getCart(req, res, next);
  } catch (error) {
    next(error);
  }
};

export const removeCartItem = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { productId } = req.params;

    let cart = await Cart.findOne({ farmer: req.user._id });
    if (!cart) {
      res.status(404).json({ success: false, message: 'Cart not found.' });
      return;
    }

    cart.items = cart.items.filter((item) => item.product.toString() !== productId);
    await cart.save();

    return getCart(req, res, next);
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    let cart = await Cart.findOne({ farmer: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully.',
      cart: {
        farmer: req.user._id,
        items: [],
        totalItems: 0,
        subtotal: 0,
        total: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
