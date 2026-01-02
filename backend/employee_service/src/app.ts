import 'reflect-metadata';
import express, { urlencoded } from 'express';
import { Source } from './config/dataSource';
import './config/env';
import adminRouter from './routes/adminRouter';
import employeeRouter from './routes/employeeRouter';
import authRouter from './routes/authRouter';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { getRabbitChannel } from './config/rabbitmq';
import { startWorker } from './workers/emailWorker';
import { httpLogger } from './middleware/httplogger';
import healthRouter from './routes/health';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

const startServer = async () => {
  try {
    await Source.initialize();
    await getRabbitChannel();
    console.log('rabbit mq channel connected');
    await startWorker();
    console.log('Database connected');

    const PORT = process.env.PORT;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('DB connection failed', error);
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
