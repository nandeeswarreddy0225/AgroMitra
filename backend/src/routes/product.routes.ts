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
// Product management routes (Shop Owner & Admin)
router.get('/my', authenticate, authorize('SHOP_OWNER', 'ADMIN'), getMyProducts);
router.get('/:id', getProductById);

router.post('/', authenticate, authorize('SHOP_OWNER', 'ADMIN'), createProduct);
router.put('/:id', authenticate, authorize('SHOP_OWNER', 'ADMIN'), updateProduct);
router.delete('/:id', authenticate, authorize('SHOP_OWNER', 'ADMIN'), deleteProduct);

export default router;
