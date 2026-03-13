import 'reflect-metadata';
import express from 'express';
import './config/env'; // Restart for Lease fix & Schema Sync
import { logger } from './config/logger';
import { errorHandler } from './middlewares/errorHandler';
import { httpLogger } from './middlewares/httpLogger';
import healthRouter from './routes/healthRoutes';
import { connectWithRetry } from './config/dataSource';
import { getRabbitChannel } from './config/rabbitmq';
import invoiceRouter from './routes/invoiceRoutes';
import usageRouter from './routes/usageRoutes';
import { startEmailWorker } from './workers/emailWorker';

const app = express();

app.use(express.json());
app.use(httpLogger);

app.use('/health', healthRouter);
app.use('/invoices', invoiceRouter);
app.use('/usage', usageRouter);

app.use(errorHandler);

/**
 * Handle uncaught underlying DB disconnects or generic unhandled errors.
 * This prevents pm2 from crashing entirely if an idle PG connection drops unexpectedly.
 */
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception (preventing crash):', err);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection (preventing crash):', reason);
});

const startServer = async () => {
  try {
    logger.info('Starting Billing Service initialization...');

    // Attempt DB connection with resilience and backoff
    // Blocks app startup until successfully connected, but does NOT crash loops
    await connectWithRetry();

    await getRabbitChannel();
    startEmailWorker();

    const PORT = process.env.PORT || 3004;

    app.listen(PORT, () => {
      logger.info(`Billing service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Billing service startup encountered a fatal error', error);
    // process.exit(1) is removed intentionally so the service doesn't fall into a crash loop.
    // Instead, rely on Docker/PM2 health-checks or logging mechanisms.
  }
};

startServer();
