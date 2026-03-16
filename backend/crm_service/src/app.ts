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

/**
 * This is the main engine for the CRM (Customer Relationship Management) Service.
 * This service is the "Memory" of our business—it stores all information about
 * our customers and potential new business interests (leads).
 */
const app = express();

/**
 * Preparation: Set up the internal tools.
 * - express.json(): Helps the server understand the data people send to it.
 * - httpLogger: Keeps a record of every visit to the service for safety and debugging.
 */
app.use(express.json());
app.use(httpLogger);

/**
 * Routing: Directing people to the right department.
 * - healthRouter: Checks if the service is awake and healthy.
 * - customerRouter: Handles the details and history of our existing customers.
 * - leadRouter: Manages information about potential new customers (leads).
 */
app.use('/', healthRouter);
app.use('/customers', customerRouter);
app.use('/leads', leadRouter);

/**
 * Safety Net: Handling mistakes.
 * If anything goes wrong in the departments above, this step ensures
 * we send a polite error message instead of letting the system crash.
 */
app.use(errorHandler);

/**
 * Resilience: Staying alive.
 * These settings ensure that the service tries to keep running even if
 * there's a minor technical hiccup or an unexpected connection issue.
 */
process.on('uncaughtException', (err) => {
  logger.error('Unexpected problem (staying alive):', err);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Request issue (staying alive):', reason);
});

/**
 * Launch Sequence: Opening the CRM Department.
 * This function connects to our two main memory banks (Databases)
 * and starts listening for requests.
 */
const startServer = async () => {
  try {
    logger.info('Preparing the CRM Department...');

    // Connect to the main customer database
    await connectWithRetry();

    // Connect to the flexible data storage (Mongo)
    await connectMongo();

    const PORT = process.env.CRM_PORT || process.env.PORT || 3005;

    // Start listening for requests from other parts of the system
    app.listen(PORT, () => {
      logger.info(`CRM Department is open and ready on port ${PORT}`);
    });
  } catch (error) {
    logger.error('The CRM Department failed to open:', error);
  }
};

startServer();
