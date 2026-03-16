import 'reflect-metadata';
import express from 'express';
import './config/env';
import vendorRouter from './routes/vendorRoute';
import { errorHandler } from './middlewares/errorHandler';
import { logger } from './config/logger';
import healthRouter from './routes/health';
import { connectWithRetry } from './config/db';
import productRoute from './routes/productRoute';
import branchRouter from './routes/branchRoutes';
import warehouseRouter from './routes/warehouseRoutes';
import { startEmployeeConsumer } from './events/consumers/employeeConsumer';
import { startProductStatusConsumer } from './worker/productStatusUpdateWorker';
import { getRabbitChannel } from './config/rabbitmq';
import modelRoute from './routes/modelRoute';
import inventoryRouter from './routes/inventoryRoutes';
import sparePartRouter from './routes/sparePartRoutes';
import brandRouter from './routes/brandRoute';
import lotRouter from './routes/lotRoutes';
import rfqRouter from './routes/rfqRoute';
import purchaseRouter from './routes/purchaseRoutes';
import { httpLogger } from './middlewares/httpLogger';

/**
 * This is the main engine for the Vendor & Inventory Service.
 * This service manages everything "physical" in our company: the products we sell,
 * the vendors we buy from, the warehouses where we store stock, and the office
 * branches that need supplies.
 */
const app = express();

/**
 * Preparation: Set up internal tools.
 * - express.json(): Helps the server understand data sent about products or vendors.
 * - httpLogger: Keeps a record of every visit to this service for company security.
 */
app.use(express.json());
app.use(httpLogger);

/**
 * Routing: Directing requests to the right department.
 * - /vendors: Managing our suppliers and their contact info.
 * - /branch: Information about our different office locations.
 * - /warehouses: Tracking where our products are physically stored.
 * - /models & /products: The catalog of items we handle.
 * - /inventory: Tracking how many items we have in stock right now.
 * - /spare-parts: Managing small components used for repairs.
 * - /brands: Categorizing products by their manufacturer name.
 * - /lots & /rfq: Handling large bulk orders and price requests from vendors.
 * - /purchases: Keeping records of the money spent on new stock.
 */
app.use('/', healthRouter);
app.use('/vendors', vendorRouter);
app.use('/branch', branchRouter);
app.use('/warehouses', warehouseRouter);
app.use('/models', modelRoute);
app.use('/products', productRoute);
app.use('/inventory', inventoryRouter);
app.use('/spare-parts', sparePartRouter);
app.use('/brands', brandRouter);
app.use('/lots', lotRouter);
app.use('/rfq', rfqRouter);
app.use('/purchases', purchaseRouter);

/**
 * Safety Net: Handling mistakes.
 * If something goes wrong in any of the departments above, this step ensures
 * we send back a polite error message instead of letting the system crash.
 */
app.use(errorHandler);

/**
 * Resilience: Staying alive.
 * These settings ensure the service tries to keep running even if
 * there's a minor technical hiccup or a connection issue.
 */
process.on('uncaughtException', (err) => {
  logger.error('Unexpected problem (staying alive):', err);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Request issue (staying alive):', reason);
});

/**
 * Launch Sequence: Opening the Vendor & Inventory Department.
 * This function connects to the database (where all stock records are kept),
 * opens communication channels, and starts listening for requests.
 */
const startServer = async () => {
  try {
    logger.info('Preparing the Vendor & Inventory Department...');

    // Connect to the stock memory bank (Database)
    await connectWithRetry();

    // Open communication channels with other departments
    await getRabbitChannel();

    // Start listening for updates about employees and product statuses
    await startEmployeeConsumer();
    await startProductStatusConsumer();

    const PORT = process.env.PORT;

    // Start listening for requests from our staff
    app.listen(PORT, () => {
      logger.info(`Vendor & Inventory Department is open on port ${PORT}`);
    });
  } catch (error) {
    logger.error('The Vendor & Inventory Department failed to open:', error);
  }
};

startServer();
