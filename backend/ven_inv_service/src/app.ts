import 'reflect-metadata';
import express from 'express';
import './config/env';
import vendorRouter from './routes/vendorRoute';
import { errorHandler } from './middlewares/errorHandler';
import { logger } from './config/logger';
import healthRouter from './routes/health';
import { Source } from './config/db';

const app = express();

app.use(express.json());

app.use('/', healthRouter);
app.use('/vendors', vendorRouter);

app.use(errorHandler);

const startServer = async () => {
  try {
    await Source.initialize();
    logger.info('Database connected');

    const PORT = process.env.PORT;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('DB connection failed', error);
    process.exit(1);
  }
};

startServer();
