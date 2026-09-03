import { Router, Request, Response } from 'express';
import {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
} from '../controllers/auth.controller';
import { authenticate, authorize, AuthenticatedRequest } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);

// Role-protected test routes (enforcing backend authorization)
router.get(
  '/farmer-only',
  authenticate,
  authorize('FARMER'),
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Welcome to Farmer Protected API',
      user: req.user,
    });
  }
);

router.get(
  '/shop-owner-only',
  authenticate,
  authorize('SHOP_OWNER'),
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Welcome to Shop Owner Protected API',
      user: req.user,
    });
  }
);

router.get(
  '/admin-only',
  authenticate,
  authorize('ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Welcome to Admin Protected API',
      user: req.user,
    });
  }
);

export default router;
