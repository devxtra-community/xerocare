import './env';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { Admin } from '../entities/adminEntities';
import { Employee } from '../entities/employeeEntities';
import { Auth } from '../entities/authEntities';

import { Branch } from '../entities/branchEntity';
import { LeaveApplication } from '../entities/leaveApplicationEntity';
import { Payroll } from '../entities/payrollEntity'; // [x] Define `Payroll` entity
import { Notification } from '../entities/notificationEntity';

import { logger } from './logger';

const getDirectDbUrl = (url?: string) => {
  if (!url) return '';
  return url.replace('-pooler.', '.');
};

export const Source = new DataSource({
  // [/] Update `DataSource` configuration
  type: 'postgres',
  url: getDirectDbUrl(process.env.EMPLOYEE_DATABASE_URL),
  ssl: {
    rejectUnauthorized: false,
  },
  synchronize: false,
  entities: [Admin, Employee, Auth, Branch, LeaveApplication, Payroll, Notification],
  extra: {
    max: 20,
    connectionTimeoutMillis: 5000,
    keepAlive: true,
  },
});

export const connectWithRetry = async (initialDelayMs = 2000): Promise<DataSource> => {
  let attempt = 1;
  let delay = initialDelayMs;

  while (true) {
    try {
      if (!Source.isInitialized) {
        logger.info(`Attempting database connection (Attempt ${attempt})...`);
        await Source.initialize();
        logger.info('Database connected successfully.');
      }
      return Source;
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      logger.error(`Database connection failed on attempt ${attempt}: ${err.code || err.message}`);
      logger.info(`Waiting ${delay / 1000} seconds before retrying...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
      delay = Math.min(delay * 2, 30000);
    }
  }
};
