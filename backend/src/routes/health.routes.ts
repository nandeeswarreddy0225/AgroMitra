import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'AgroMitra API Gateway is running',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/login',
      products: '/api/products',
      orders: '/api/orders',
      schemes: '/api/schemes',
      mandi: '/api/mandi-prices',
      weather: '/api/weather',
      cropHealth: '/api/crop-health',
    },
  });
});

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'AgriMart API is running',
  });
});

export default router;
