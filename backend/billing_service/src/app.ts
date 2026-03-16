import 'reflect-metadata';
import express from 'express';
import './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middlewares/errorHandler';
import { httpLogger } from './middlewares/httpLogger';
import healthRouter from './routes/healthRoutes';
import { connectWithRetry } from './config/dataSource';
import { getRabbitChannel } from './config/rabbitmq';
import invoiceRouter from './routes/invoiceRoutes';
import usageRouter from './routes/usageRoutes';
import { startEmailWorker } from './workers/emailWorker';

/**
 * This is the main engine for the Billing Service.
 * This service is responsible for everything related to money:
 * creating bills, tracking usage, and sending invoices to customers.
 */
const app = express();

/**
 * Preparation: Set up the internal tools.
 * - express.json(): Helps the server understand the data customers send to it.
 * - httpLogger: Keeps a diary of who visits the server and why.
 */
app.use(express.json());
app.use(httpLogger);

/**
 * Routing: Directing users to the right department.
 * - /health: A quick check to see if the service is awake.
 * - /invoices: Everything related to bills and payments.
 * - /usage: Tracks how much of our service a customer has used.
 */
app.use('/health', healthRouter);
app.use('/invoices', invoiceRouter);
app.use('/usage', usageRouter);

/**
 * Safety Net: Handling mistakes.
 * If something goes wrong in any of the departments above, this step
 * ensures we send a polite error message instead of letting the system crash.
 */
app.use(errorHandler);

/**
 * Resilience: Keeping the lights on.
 * These settings ensure that if there's a minor hiccup or a temporary connection
 * problem, the service tries to stay running rather than giving up entirely.
 */
process.on('uncaughtException', (err) => {
  logger.error('Unexpected problem (staying alive):', err);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Request issue (staying alive):', reason);
});

/**
 * Launch Sequence: Starting the Billing Department.
 * This function connects to our database (where we store all the bills)
 * and starts our email sender to keep customers informed.
 */
const startServer = async () => {
  try {
    logger.info('Preparing the Billing Department...');

    // Connect to the memory bank (Database)
    await connectWithRetry();

    // Open the communication channel (RabbitMQ)
    await getRabbitChannel();

    // Start the automatic email sender
    startEmailWorker();

    const PORT = process.env.PORT || 3004;

    // Start listening for requests
    app.listen(PORT, () => {
      logger.info(`Billing Department is open and ready on port ${PORT}`);
    });
  } catch (error) {
    logger.error('The Billing Department failed to open:', error);
  }
};

startServer();
