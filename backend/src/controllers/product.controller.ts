import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Product, PRODUCT_CATEGORIES, ProductCategory } from '../models/Product.model';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const createProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, category, brand, price, unit, stock, images, image, location } = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required to create products.',
      });
      return;
    }

    // Required field validation
    if (!name || !description || !category || price === undefined || stock === undefined || !unit) {
      res.status(400).json({
        success: false,
        message: 'Name, description, category, price, unit, and stock are required fields.',
      });
      return;
    }

    // Category validation - accepts any non-empty valid category string (e.g. Fertilizers, Seeds, Equipment, or custom category)
    if (!category || typeof category !== 'string' || category.trim().length < 2) {
      res.status(400).json({
        success: false,
        message: 'Product category is required and must be at least 2 characters long.',
      });
      return;
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      res.status(400).json({
        success: false,
        message: 'Price must be a valid number greater than 0.',
      });
      return;
    }

    const numStock = Number(stock);
    if (isNaN(numStock) || numStock < 0) {
      res.status(400).json({
        success: false,
        message: 'Stock must be a non-negative number.',
      });
      return;
    }

    // Process images
    let imageList: string[] = [];
    if (Array.isArray(images)) {
      imageList = images.filter((img) => typeof img === 'string' && img.trim() !== '');
    } else if (image && typeof image === 'string' && image.trim() !== '') {
      imageList = [image.trim()];
    }

    // Location default to shopOwner address if not provided
    const productLocation = location || {
      street: req.user.address?.street || '',
      city: req.user.address?.city || '',
      state: req.user.address?.state || '',
      pincode: req.user.address?.pincode || '',
    };

    const product = new Product({
      name: name.trim(),
      description: description.trim(),
      category: category as ProductCategory,
      brand: brand ? brand.trim() : 'Generic',
      price: numPrice,
      unit: unit.trim(),
      stock: numStock,
      images: imageList,
      shopOwner: req.user._id,
      location: productLocation,
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product,
    });
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { search, category, minPrice, maxPrice, inStock, sort } = req.query;

    const filter: Record<string, any> = {};

    // Search by text or regex on name, brand, category, description
    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { brand: searchRegex },
        { category: searchRegex },
        { description: searchRegex },
      ];
    }

    // Category filter
    if (category && typeof category === 'string' && category.trim() !== '' && category !== 'All') {
      filter.category = category.trim();
    }

    // Price range filters
    if (minPrice !== undefined && minPrice !== '') {
      const numMin = Number(minPrice);
      if (!isNaN(numMin)) {
        filter.price = { ...(filter.price || {}), $gte: numMin };
      }
    }

    if (maxPrice !== undefined && maxPrice !== '') {
      const numMax = Number(maxPrice);
      if (!isNaN(numMax)) {
        filter.price = { ...(filter.price || {}), $lte: numMax };
      }
    }

    // Availability / In-stock filter
    if (inStock === 'true') {
      filter.stock = { $gt: 0 };
    }

    // Sorting
    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === 'price_asc') {
      sortOption = { price: 1 };
    } else if (sort === 'price_desc') {
      sortOption = { price: -1 };
    } else if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'name_asc') {
      sortOption = { name: 1 };
    }

    const products = await Product.find(filter)
      .populate('shopOwner', 'name email phone address')
      .sort(sortOption);

    // Guarantee distinct product documents by _id
    const seenIds = new Set<string>();
    const uniqueProducts = products.filter((p) => {
      const idStr = p._id.toString();
      if (seenIds.has(idStr)) return false;
      seenIds.add(idStr);
      return true;
    });

    res.status(200).json({
      success: true,
      count: uniqueProducts.length,
      products: uniqueProducts,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyProducts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    // If Admin, return all products; if Shop Owner, return their own products
    const query = req.user.role === 'ADMIN' ? {} : { shopOwner: req.user._id };
    const products = await Product.find(query)
      .populate('shopOwner', 'name email phone address')
      .sort({ createdAt: -1 });

    // Guarantee distinct products
    const seenIds = new Set<string>();
    const uniqueProducts = products.filter((p) => {
      const idStr = p._id.toString();
      if (seenIds.has(idStr)) return false;
      seenIds.add(idStr);
      return true;
    });

    res.status(200).json({
      success: true,
      count: uniqueProducts.length,
      products: uniqueProducts,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({
        success: false,
        message: 'Product not found with specified ID.',
      });
      return;
    }

    const product = await Product.findById(id).populate('shopOwner', 'name email phone address');

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
      return;
    }

    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
      return;
    }

    // Security Check: Only the product's shopOwner or ADMIN can update it
    if (product.shopOwner.toString() !== req.user?._id.toString() && req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to update this product.',
      });
      return;
    }

    const { name, description, category, brand, price, unit, stock, images, image, location } = req.body;

    if (name !== undefined) {
      if (name.trim().length < 2) {
        res.status(400).json({
          success: false,
          message: 'Product name must be at least 2 characters long.',
        });
        return;
      }
      product.name = name.trim();
    }

    if (description !== undefined) {
      if (description.trim().length < 5) {
        res.status(400).json({
          success: false,
          message: 'Product description must be at least 5 characters long.',
        });
        return;
      }
      product.description = description.trim();
    }

    if (brand !== undefined) {
      product.brand = brand.trim() || 'Generic';
    }

    if (unit !== undefined) {
      if (!unit.trim()) {
        res.status(400).json({
          success: false,
          message: 'Product unit cannot be empty.',
        });
        return;
      }
      product.unit = unit.trim();
    }

    if (category !== undefined) {
      if (typeof category !== 'string' || category.trim().length < 2) {
        res.status(400).json({
          success: false,
          message: 'Product category must be at least 2 characters long.',
        });
        return;
      }
      product.category = category.trim();
    }

    if (price !== undefined) {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        res.status(400).json({
          success: false,
          message: 'Price must be a valid number greater than 0.',
        });
        return;
      }
      product.price = numPrice;
    }

    if (stock !== undefined) {
      const numStock = Number(stock);
      if (isNaN(numStock) || numStock < 0) {
        res.status(400).json({
          success: false,
          message: 'Stock must be a non-negative number.',
        });
        return;
      }
      product.stock = numStock;
    }

    if (images !== undefined) {
      if (Array.isArray(images)) {
        product.images = images.filter((img) => typeof img === 'string' && img.trim() !== '');
      }
    } else if (image !== undefined && typeof image === 'string') {
      product.images = image.trim() !== '' ? [image.trim()] : [];
    }

    if (location !== undefined) {
      product.location = {
        street: location.street !== undefined ? location.street.trim() : (product.location?.street || ''),
        city: location.city !== undefined ? location.city.trim() : (product.location?.city || ''),
        state: location.state !== undefined ? location.state.trim() : (product.location?.state || ''),
        pincode: location.pincode !== undefined ? location.pincode.trim() : (product.location?.pincode || ''),
      };
    }

    await product.save();
    await product.populate('shopOwner', 'name email phone address');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      product,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
      return;
    }

    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
      return;
    }

    // Security Check: Only the product's shopOwner or ADMIN can delete it
    if (product.shopOwner.toString() !== req.user?._id.toString() && req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to delete this product.',
      });
      return;
    }


    await Product.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
