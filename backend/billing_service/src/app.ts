import 'reflect-metadata';
import express from 'express';
import './config/env'; // Restart for Lease fix & Schema Sync
import { logger } from './config/logger';
import { errorHandler } from './middlewares/errorHandler';
import { httpLogger } from './middlewares/httpLogger';
import healthRouter from './routes/healthRoutes';
import { Source } from './config/dataSource';
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

const startServer = async () => {
  try {
    await Source.initialize();
    logger.info('Database connected');

    // FIX: Manually add missing enum values if they don't exist (TypeORM sync issue with Enums)
    try {
      // Check if type exists first
      const typeExists = await Source.query(
        `SELECT 1 FROM pg_type WHERE typname = 'invoice_status_enum'`,
      );
      if (typeExists && typeExists.length > 0) {
        await Source.query(
          `ALTER TYPE public.invoice_status_enum ADD VALUE IF NOT EXISTS 'EMPLOYEE_APPROVED'`,
        );
        await Source.query(
          `ALTER TYPE public.invoice_status_enum ADD VALUE IF NOT EXISTS 'FINANCE_APPROVED'`,
        );
        await Source.query(
          `ALTER TYPE public.invoice_status_enum ADD VALUE IF NOT EXISTS 'ACTIVE_LEASE'`,
        );
      }
    } catch (err) {
      console.warn('Enum migration warning (handled):', err);
    }

    await getRabbitChannel();
    startEmailWorker();
    // const PORT = process.env.BILLING_PORT;
    const PORT = process.env.PORT || 3004;

    app.listen(PORT, () => {
      logger.info(`Billing service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Billing service startup failed', error);
    process.exit(1);
  }
};

startServer();
