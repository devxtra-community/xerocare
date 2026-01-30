import 'reflect-metadata';
import express from 'express';
import './config/env'; // Restart for Lease fix
import { logger } from './config/logger';
import { errorHandler } from './middlewares/errorHandler';
import healthRouter from './routes/healthRoutes';
import { Source } from './config/dataSource';
import { getRabbitChannel } from './config/rabbitmq';
import invoiceRouter from './routes/invoiceRoutes';
import usageRouter from './routes/usageRoutes';

const app = express();

app.use(express.json());

app.use('/health', healthRouter);
app.use('/invoices', invoiceRouter);
app.use('/usage', usageRouter);

app.use(errorHandler);

const startServer = async () => {
  try {
    await Source.initialize();
    logger.info('Database connected');
    await getRabbitChannel();
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
