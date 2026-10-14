import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import {
  createOrder,
  getFarmerOrders,
  getShopOwnerOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  acceptShopOrder,
  rejectShopOrder,
  prepareShopOrder,
  readyForPickupShopOrder,
} from '../controllers/order.controller';
import { getOrderTrackingTelemetry } from '../controllers/orderTracking.controller';
import {
  getOrderMessages,
  sendOrderMessage,
  markOrderMessagesRead,
} from '../controllers/orderChat.controller';

const router = Router();

router.use(authenticate);

// Farmer order placement & list (supports / and /my-orders)
router.post('/', authorize('FARMER'), createOrder);
router.get('/', authorize('FARMER', 'ADMIN'), getFarmerOrders);
router.get('/my-orders', authorize('FARMER', 'ADMIN'), getFarmerOrders);

// Shop Owner & Agri Partner orders list (supports both /shop-owner and /shop-orders)
router.get('/shop-owner', authorize('SHOP_OWNER', 'AGRI_PARTNER', 'ADMIN'), getShopOwnerOrders);
router.get('/shop-orders', authorize('SHOP_OWNER', 'AGRI_PARTNER', 'ADMIN'), getShopOwnerOrders);

// Individual order details (Farmer, Shop Owner of item, or Admin)
router.get('/:id', getOrderById);

// Live Delivery Tracking Telemetry & Simulation
router.get('/:id/tracking', getOrderTrackingTelemetry);

// Order In-App Direct Chat (Farmer <-> Shopkeeper <-> Delivery Boy)
router.get('/:id/messages', getOrderMessages);
router.post('/:id/messages', sendOrderMessage);
router.patch('/:id/messages/read', markOrderMessagesRead);

// Order actions (supports both PUT and PATCH)
router.put('/:id/cancel', authorize('FARMER', 'ADMIN'), cancelOrder);
router.patch('/:id/cancel', authorize('FARMER', 'ADMIN'), cancelOrder);
router.put('/:id/status', authorize('SHOP_OWNER', 'AGRI_PARTNER', 'ADMIN'), updateOrderStatus);
router.patch('/:id/status', authorize('SHOP_OWNER', 'AGRI_PARTNER', 'ADMIN'), updateOrderStatus);

// Nearby Shop Routing Specific Actions
router.post('/:id/accept', authorize('SHOP_OWNER', 'AGRI_PARTNER', 'ADMIN'), acceptShopOrder);
router.post('/:id/reject', authorize('SHOP_OWNER', 'AGRI_PARTNER', 'ADMIN'), rejectShopOrder);
router.put('/:id/prepare', authorize('SHOP_OWNER', 'AGRI_PARTNER', 'ADMIN'), prepareShopOrder);
router.patch('/:id/prepare', authorize('SHOP_OWNER', 'AGRI_PARTNER', 'ADMIN'), prepareShopOrder);
router.put('/:id/ready-for-pickup', authorize('SHOP_OWNER', 'AGRI_PARTNER', 'ADMIN'), readyForPickupShopOrder);
router.patch('/:id/ready-for-pickup', authorize('SHOP_OWNER', 'AGRI_PARTNER', 'ADMIN'), readyForPickupShopOrder);

export default router;

