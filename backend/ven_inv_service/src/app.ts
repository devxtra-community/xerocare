import 'reflect-metadata';
import express from 'express';
import './config/env';
import vendorRouter from './routes/vendorRoute';
import { errorHandler } from './middlewares/errorHandler';
import { logger } from './config/logger';
import healthRouter from './routes/health';
import { Source } from './config/db';
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

const app = express();

app.use(express.json());
// Request logging middleware
app.use((req, res, next) => {
  logger.info(`[${req.method}] ${req.url}`);
  next();
});

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
app.use(errorHandler);

const startServer = async () => {
  try {
    await Source.initialize();
    await getRabbitChannel();
    await startEmployeeConsumer();
    await startProductStatusConsumer();
    logger.info('Database connected');

    const PORT = process.env.PORT;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('DB connection failed', error);
    process.exit(1);
  }
};

startServer();
