import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRouter from './routes/health.routes';
import authRouter from './routes/auth.routes';
import productRouter from './routes/product.routes';
import cartRouter from './routes/cart.routes';
import orderRouter from './routes/order.routes';
import paymentRouter from './routes/payment.routes';
import schemeRouter from './routes/scheme.routes';
import { cropHealthRouter } from './routes/cropHealth.routes';
import { deliveryBoyRouter } from './routes/deliveryBoy.routes';
import { weatherRouter } from './routes/weather.routes';
import { cropAdvisorRouter } from './routes/cropAdvisor.routes';
import { mandiPriceRouter } from './routes/mandiPrice.routes';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler';

dotenv.config();

const app: Application = express();

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
];

const configuredOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : [];

const allowedOriginsSet = new Set([...defaultAllowedOrigins, ...configuredOrigins]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. mobile apps, test runners, curl)
      if (!origin) return callback(null, true);

      if (process.env.NODE_ENV !== 'production' || allowedOriginsSet.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy violation: Origin '${origin}' is not authorized.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/products', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/schemes', schemeRouter);
app.use('/api/crop-health', cropHealthRouter);
app.use('/api/delivery', deliveryBoyRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/crop-advisor', cropAdvisorRouter);
app.use('/api/mandi-prices', mandiPriceRouter);
app.use('/api/market-prices', mandiPriceRouter);
app.use('/api/market', mandiPriceRouter);


// 404 & Global Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
