import './config/env';
import 'reflect-metadata';
import express, { urlencoded } from 'express';
import { connectWithRetry } from './config/dataSource';
import adminRouter from './routes/adminRouter';
import employeeRouter from './routes/employeeRouter';
import authRouter from './routes/authRouter';
import leaveApplicationRouter from './routes/leaveApplicationRouter';
import payrollRouter from './routes/payrollRouter';
import notificationRouter from './routes/notificationRouter';
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
// CORS is handled by API Gateway - do not set CORS headers here

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception (preventing crash):', err);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection (preventing crash):', reason);
});

const startServer = async () => {
  try {
    logger.info('Starting Employee Service initialization...');
    await connectWithRetry();
    await getRabbitChannel();
    logger.info('RabbitMQ channel connected');
    await startWorker();
    await startBranchConsumer();

    const PORT = process.env.EMPLOYEE_PORT || process.env.PORT || 3002;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('CRITICAL ERROR DURING STARTUP:', error);
    logger.error('Employee service startup encountered a fatal error', error);
  }
};
app.use(httpLogger);
app.use('/', healthRouter);
app.use('/auth', authRouter);
app.use('/employee', employeeRouter);
app.use('/admin', adminRouter);
app.use('/leave-applications', leaveApplicationRouter);
app.use('/payroll', payrollRouter);
app.use('/notifications', notificationRouter);

app.use(errorHandler);

startServer();
