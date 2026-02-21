import './config/env';
import express, { Express } from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Options } from 'http-proxy-middleware';
import healthRouter from './routes/health';
import { startCustomerConsumer } from './events/consumers/customerUpdatedConsumer';
import invoiceRouter from './routes/invoiceRoutes';
import { httpLogger } from './middleware/httplogger';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';

import { otpSendLimiter, otpVerifyLimiter, loginLimiter } from './middleware/rateLimitter';
import {
  globalRateLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  loginLimiter,
} from './middleware/rateLimitter';

const app: Express = express();
app.set('trust proxy', 1);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
logger.info(`CORS Configured for origin: ${CLIENT_URL}`);

const allowedOrigins = [CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'].filter(
  Boolean,
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);

app.use(httpLogger);
app.use(globalRateLimiter);

(async () => {
  await startCustomerConsumer();
  logger.info('Customer Consumer initialized');
})();

const PORT = process.env.PORT;
const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL;
const VENDOR_INVENTORY_SERVICE_URL = process.env.VENDOR_INVENTORY_SERVICE_URL;
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL;
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL;

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
logger.info(`CORS Configured for origin: ${CLIENT_URL}`);

const app: Express = express();
app.set('trust proxy', 1);

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  }),
);

// app.use(globalRateLimiter);

(async () => {
  await startCustomerConsumer();
  logger.info('Customer Consumer initialized');
})();

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

const crmProxyOptions: Options = {
  target: CRM_SERVICE_URL,
  changeOrigin: true,
};

app.use(httpLogger);
app.use('/health', healthRouter);
app.use('/b/invoices', express.json(), invoiceRouter);
app.use('/e', createProxyMiddleware(empProxyOptions));
app.use('/i', createProxyMiddleware(invProxyOptions));
app.use('/b', createProxyMiddleware(billProxyOptions));
app.use('/c', createProxyMiddleware(crmProxyOptions));

app.use(errorHandler);
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} `);
});
