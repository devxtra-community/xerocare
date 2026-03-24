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

/**
 * This is the main engine for the Employee Service.
 * This service handles everything related to our staff: hiring, login security,
 * vacation requests (leaves), and paying salaries (payroll).
 */
const app = express();

/**
 * Preparation: Set up the internal tools.
 * - express.json(): Helps the server understand data sent by staff.
 * - cookieParser(): Manages secure login "keys" (cookies).
 * - httpLogger: Keeps a record of every visit to the service for safety.
 */
app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));

/**
 * Resilience: Staying alive.
 * These settings ensure the service tries to keep running even if
 * there's a minor technical hiccup or connection issue.
 */
process.on('uncaughtException', (err) => {
  logger.error('Unexpected problem (staying alive):', err);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Request issue (staying alive):', reason);
});

/**
 * Routing: Directing staff to the right department.
 * - /auth: Security desk for logging in and out.
 * - /employee: General staff information and profiles.
 * - /admin: Management tools for controlling the system.
 * - /leave-applications: Handling requests for time off.
 * - /payroll: Managing salary payments and records.
 * - /notifications: Sending messages to staff members.
 */
app.use(httpLogger);
app.use('/', healthRouter);
app.use('/auth', authRouter);
app.use('/employee', employeeRouter);
app.use('/admin', adminRouter);
app.use('/leave-applications', leaveApplicationRouter);
app.use('/payroll', payrollRouter);
app.use('/notifications', notificationRouter);

/**
 * Safety Net: Handling mistakes.
 * If anything goes wrong in the departments above, this step ensures
 * we send a polite error message instead of letting the system crash.
 */
app.use(errorHandler);

/**
 * Launch Sequence: Opening the Employee Department.
 * This function connects to our database (where staff records are kept),
 * sets up communication channels, and starts listening for requests.
 */
const startServer = async () => {
  try {
    logger.info('Preparing the Employee Department...');

    // Connect to the memory bank (Database)
    await connectWithRetry();

    // Open communication channels (RabbitMQ)
    await getRabbitChannel();
    logger.info('Communication channel (RabbitMQ) is open');

    // Start the automatic email and office notification systems
    await startWorker();
    await startBranchConsumer();

    const PORT = process.env.EMPLOYEE_PORT || process.env.PORT || 3002;

    // Start listening for requests
    app.listen(PORT, () => {
      logger.info(`Employee Department is open and ready on port ${PORT}`);
    });
  } catch (error) {
    logger.error('The Employee Department failed to open:', error);
  }
};

startServer();
