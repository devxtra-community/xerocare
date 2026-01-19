import './config/env';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Options } from 'http-proxy-middleware';
import healthRouter from './routes/health';
import { httpLogger } from './middleware/httplogger';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';

const app: Express = express();
// app.use(express.json());

const PORT = process.env.PORT || 3001;
const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
const VENDOR_INVENTORY_SERVICE_URL =
  process.env.VENDOR_INVENTORY_SERVICE_URL || 'http://localhost:3003';

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  }),
);

const empProxyOptions: Options = {
  target: EMPLOYEE_SERVICE_URL,
  changeOrigin: true,
};

const invProxyOptions: Options = {
  target: VENDOR_INVENTORY_SERVICE_URL,
  changeOrigin: true,
};

app.use(httpLogger);
app.use('/', healthRouter);
app.use('/e', createProxyMiddleware(empProxyOptions));
app.use('/i', createProxyMiddleware(invProxyOptions));

app.use((err: Error, req: Request, res: Response) => {
  logger.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
});

app.use(errorHandler);
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Proxying to Employee Service at ${EMPLOYEE_SERVICE_URL}`);
});
