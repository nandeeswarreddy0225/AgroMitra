import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getNotificationsController,
  markAsReadController,
  markAllAsReadController,
} from '../controllers/notification.controller';

export const notificationRouter = Router();

// All notification routes require authentication
notificationRouter.use(authenticate);

notificationRouter.get('/', getNotificationsController);
notificationRouter.patch('/read-all', markAllAsReadController);
notificationRouter.patch('/:id/read', markAsReadController);

export default notificationRouter;
