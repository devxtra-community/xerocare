import 'reflect-metadata';
import express, { urlencoded } from 'express';
import { Source } from './config/dataSource';
import './config/env';
import adminRouter from './routes/adminRouter';
import employeeRouter from './routes/employeeRouter';
import authRouter from './routes/authRouter';
import cookieParser from 'cookie-parser';
import { getRabbitChannel } from './config/rabbitmq';
import { startWorker } from './workers/emailWorker';
import { startBranchConsumer } from './events/consumers/branchConsumer';
import { httpLogger } from './middleware/httplogger';
import healthRouter from './routes/health';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));
const startServer = async () => {
  try {
    await Source.initialize();
    await getRabbitChannel();
    logger.info('RabbitMQ channel connected');
    await startWorker();
    await startBranchConsumer();
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
app.use(httpLogger);
app.use('/', healthRouter);
app.use('/auth', authRouter);
app.use('/employee', employeeRouter);
app.use('/admin', adminRouter);

app.use(errorHandler);

startServer();
