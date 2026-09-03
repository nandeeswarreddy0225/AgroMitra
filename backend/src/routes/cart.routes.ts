import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
} from '../controllers/cart.controller';

const router = Router();

// All Cart routes are protected and restricted to FARMER role
router.use(authenticate);
router.use(authorize('FARMER'));

router.get('/', getCart);
router.post('/', addToCart);
router.post('/items', addToCart);
router.put('/items/:productId', updateCartItemQuantity);
router.delete('/items/:productId', removeCartItem);
router.delete('/', clearCart);


export default router;
