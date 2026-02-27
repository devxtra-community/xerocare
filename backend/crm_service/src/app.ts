import 'reflect-metadata';
import express from 'express';

import './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { httpLogger } from './middleware/httpLogger';
import healthRouter from './routes/health';
import customerRouter from './routes/customerRoutes';
import leadRouter from './routes/leadRoutes';
import { connectWithRetry } from './config/datasource';
import { connectMongo } from './config/mongo';

const app = express();

// Middleware
app.use(express.json());
app.use(httpLogger);

// Routes
app.use('/', healthRouter);
app.use('/customers', customerRouter);
app.use('/leads', leadRouter);

// Error handler (must be last)
app.use(errorHandler);

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception (preventing crash):', err);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection (preventing crash):', reason);
});

// Server startup
const startServer = async () => {
  try {
    logger.info('Starting CRM Service initialization...');
    await connectWithRetry();

    await connectMongo();

    const PORT = process.env.CRM_PORT;

    app.listen(PORT, () => {
      logger.info(`CRM service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('CRM service startup encountered a fatal error', error);
  }
};

startServer();
