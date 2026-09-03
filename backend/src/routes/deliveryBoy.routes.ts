import { Router } from 'express';
import {
  getShopDeliveryBoys,
  createShopDeliveryBoy,
  assignDeliveryBoyToOrder,
  getDeliveryBoyAssignedOrders,
  respondToDeliveryAssignment,
  updateDeliveryStatus,
} from '../controllers/deliveryBoy.controller';
import { authenticate } from '../middlewares/auth.middleware';

export const deliveryBoyRouter = Router();

// Apply authentication to all delivery routes
deliveryBoyRouter.use(authenticate);

// Shop Owner delivery endpoints
deliveryBoyRouter.get('/shop-delivery-boys', getShopDeliveryBoys);
deliveryBoyRouter.post('/create', createShopDeliveryBoy);
deliveryBoyRouter.post('/assign-order', assignDeliveryBoyToOrder);
deliveryBoyRouter.post('/assign', assignDeliveryBoyToOrder);

// Delivery Boy personal endpoints
deliveryBoyRouter.get('/assigned-orders', getDeliveryBoyAssignedOrders);
deliveryBoyRouter.get('/orders', getDeliveryBoyAssignedOrders);
deliveryBoyRouter.post('/orders/:id/respond', respondToDeliveryAssignment);
deliveryBoyRouter.patch('/orders/:id/status', updateDeliveryStatus);
deliveryBoyRouter.put('/orders/:id/status', updateDeliveryStatus);


