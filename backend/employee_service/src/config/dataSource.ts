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
import { seedAdmin } from '../utils/seedAdmin';

export const Source = new DataSource({
  type: 'postgres',
  url: process.env.EMPLOYEE_DATABASE_URL,
  ssl: process.env.EMPLOYEE_DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
  synchronize: true,
  entities: [Admin, Employee, Auth, Branch, LeaveApplication, Payroll, Notification],
  poolSize: 1,
  extra: {
    max: 1,
    min: 0,
    connectionTimeoutMillis: 5000,
    keepAlive: true,
    idleTimeoutMillis: 30000,
    statement_timeout: 10000,
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

        // Run SQL migration to add job values to employee job enums if they don't exist
        try {
          await Source.query(`
            DO $$
            BEGIN
              -- employee_employee_job_enum
              IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_employee_job_enum') THEN
                IF NOT EXISTS (
                  SELECT 1 FROM pg_type t 
                  JOIN pg_enum e ON t.oid = e.enumtypid 
                  WHERE t.typname = 'employee_employee_job_enum' AND e.enumlabel = 'SERVICE_HELP_DESK'
                ) THEN
                  ALTER TYPE "employee_employee_job_enum" ADD VALUE 'SERVICE_HELP_DESK';
                END IF;
                IF NOT EXISTS (
                  SELECT 1 FROM pg_type t 
                  JOIN pg_enum e ON t.oid = e.enumtypid 
                  WHERE t.typname = 'employee_employee_job_enum' AND e.enumlabel = 'SERVICE_TECHNICIAN'
                ) THEN
                  ALTER TYPE "employee_employee_job_enum" ADD VALUE 'SERVICE_TECHNICIAN';
                END IF;
              END IF;

              -- employees_employee_job_enum
              IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employees_employee_job_enum') THEN
                IF NOT EXISTS (
                  SELECT 1 FROM pg_type t 
                  JOIN pg_enum e ON t.oid = e.enumtypid 
                  WHERE t.typname = 'employees_employee_job_enum' AND e.enumlabel = 'SERVICE_HELP_DESK'
                ) THEN
                  ALTER TYPE "employees_employee_job_enum" ADD VALUE 'SERVICE_HELP_DESK';
                END IF;
                IF NOT EXISTS (
                  SELECT 1 FROM pg_type t 
                  JOIN pg_enum e ON t.oid = e.enumtypid 
                  WHERE t.typname = 'employees_employee_job_enum' AND e.enumlabel = 'SERVICE_TECHNICIAN'
                ) THEN
                  ALTER TYPE "employees_employee_job_enum" ADD VALUE 'SERVICE_TECHNICIAN';
                END IF;
              END IF;
            END
            $$;
          `);
          logger.info(
            "Checked/updated job enums to include 'SERVICE_HELP_DESK' and 'SERVICE_TECHNICIAN'",
          );
        } catch (err) {
          logger.warn('Could not alter job enums:', err);
        }

        await seedAdmin(Source);
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
