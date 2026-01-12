import './config/env';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Options } from 'http-proxy-middleware';
import healthRouter from './routes/health';
import invoiceRouter from './routes/invoiceRoutes';
import { httpLogger } from './middleware/httplogger';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';

import {
  globalRateLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  loginLimiter,
} from './middleware/rateLimitter';

const app: Express = express();
app.use(express.json());
app.set('trust proxy', 1);

app.use(globalRateLimiter);

const PORT = process.env.PORT || 3001;
const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
const VENDOR_INVENTORY_SERVICE_URL =
  process.env.VENDOR_INVENTORY_SERVICE_URL || 'http://localhost:3003';
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:3004';

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  }),
);

// Specific Rate Limits
app.post('/e/auth/login', loginLimiter);
app.post(
  ['/e/auth/login/verify', '/e/auth/forgot-password/verify', '/e/auth/magic-link/verify'],
  otpVerifyLimiter,
);
app.post(['/e/auth/forgot-password', '/e/auth/magic-link'], otpSendLimiter);

const empProxyOptions: Options = {
  target: EMPLOYEE_SERVICE_URL,
  changeOrigin: true,
};

const invProxyOptions: Options = {
  target: VENDOR_INVENTORY_SERVICE_URL,
  changeOrigin: true,
};

const billProxyOptions: Options = {
  target: BILLING_SERVICE_URL,
  changeOrigin: true,
};

app.use(httpLogger);
app.use('/health', healthRouter);
app.use('/b/invoices', invoiceRouter);
app.use('/e', createProxyMiddleware(empProxyOptions));
app.use('/i', createProxyMiddleware(invProxyOptions));
app.use('/b', createProxyMiddleware(billProxyOptions));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
});

app.use(errorHandler);
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
