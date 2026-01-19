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
import { getRabbitChannel } from './config/rabbitmq';
import modelRoute from './routes/modelRoute';
import inventoryRouter from './routes/inventoryRoutes';

const app = express();

app.use(express.json());

app.use('/', healthRouter);
app.use('/vendors', vendorRouter);
app.use('/branch', branchRouter);
app.use('/warehouses', warehouseRouter);
app.use('/models', modelRoute);
app.use('/products', productRoute);
app.use('/inventory', inventoryRouter);
app.use(errorHandler);

const startServer = async () => {
  try {
    await Source.initialize();
    await getRabbitChannel();
    await startEmployeeConsumer();
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
