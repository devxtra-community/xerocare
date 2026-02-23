import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { httpLogger } from './middleware/httpLogger';
import healthRouter from './routes/health';
import customerRouter from './routes/customerRoutes';
import leadRouter from './routes/leadRoutes';
import { Source } from './config/datasource';
import { connectMongo } from './config/mongo';

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(httpLogger);

// Routes
app.use('/', healthRouter);
app.use('/customers', customerRouter);
app.use('/leads', leadRouter);

// Error handler (must be last)
app.use(errorHandler);

// Server startup
const startServer = async () => {
  try {
    await Source.initialize();
    logger.info('Database connected');

    await connectMongo();

    const PORT = process.env.CRM_PORT;

    app.listen(PORT, () => {
      logger.info(`CRM service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('CRM service startup failed', error);
    process.exit(1);
  }
};

startServer();
