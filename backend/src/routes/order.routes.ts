import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import {
  createOrder,
  getFarmerOrders,
  getShopOwnerOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
} from '../controllers/order.controller';

const router = Router();

router.use(authenticate);

// Farmer order placement & list (supports / and /my-orders)
router.post('/', authorize('FARMER'), createOrder);
router.get('/', authorize('FARMER', 'ADMIN'), getFarmerOrders);
router.get('/my-orders', authorize('FARMER', 'ADMIN'), getFarmerOrders);


// Shop Owner orders list (supports both /shop-owner and /shop-orders)
router.get('/shop-owner', authorize('SHOP_OWNER', 'ADMIN'), getShopOwnerOrders);
router.get('/shop-orders', authorize('SHOP_OWNER', 'ADMIN'), getShopOwnerOrders);

// Individual order details (Farmer, Shop Owner of item, or Admin)
router.get('/:id', getOrderById);

// Order actions (supports both PUT and PATCH)
router.put('/:id/cancel', authorize('FARMER', 'ADMIN'), cancelOrder);
router.patch('/:id/cancel', authorize('FARMER', 'ADMIN'), cancelOrder);
router.put('/:id/status', authorize('SHOP_OWNER', 'ADMIN'), updateOrderStatus);
router.patch('/:id/status', authorize('SHOP_OWNER', 'ADMIN'), updateOrderStatus);


export default router;
