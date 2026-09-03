import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getMyProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Public / Authenticated marketplace routes
router.get('/', getProducts);
router.get('/my', authenticate, authorize('SHOP_OWNER'), getMyProducts);
router.get('/:id', getProductById);

// Shop Owner product management routes
router.post('/', authenticate, authorize('SHOP_OWNER'), createProduct);
router.put('/:id', authenticate, authorize('SHOP_OWNER'), updateProduct);
router.delete('/:id', authenticate, authorize('SHOP_OWNER'), deleteProduct);

export default router;
