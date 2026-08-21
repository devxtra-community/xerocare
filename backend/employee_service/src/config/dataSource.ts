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
  synchronize: false,
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

        // Fresh database (no admin table yet): create the schema from entities.
        const adminTable = await Source.query(`SELECT to_regclass('public.admin') AS tbl;`);
        if (!adminTable[0].tbl) {
          logger.info('Fresh database — creating schema from entities via synchronize...');
          await Source.synchronize();
          logger.info('Schema created from entities.');
        }

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

        // Retire the standalone TECHNICIAN job. It only ever granted the 'reading'
        // module (meter entry for Rent/Lease) while SERVICE_TECHNICIAN granted
        // 'service'; the two are now one job that holds both. Postgres cannot drop a
        // value from an enum, so the type has to be rebuilt: move every row off
        // TECHNICIAN first, then swap the column onto a type that no longer has it.
        //
        // Failures here are fatal rather than warned past — leaving the enum with a
        // value the application no longer knows means HR can still pick a job that
        // grants nothing, and the fix gets silently skipped on every later boot.
        try {
          await Source.query(`
            DO $$
            DECLARE
              t record;
              col record;
              new_labels text;
              old_type text;
            BEGIN
              FOR t IN
                SELECT ty.typname
                  FROM pg_type ty
                 WHERE ty.typname IN ('employee_employee_job_enum', 'employees_employee_job_enum')
                   AND EXISTS (
                     SELECT 1 FROM pg_enum e
                      WHERE e.enumtypid = ty.oid AND e.enumlabel = 'TECHNICIAN'
                   )
              LOOP
                -- A column default would still reference the old type after the swap.
                -- employee_job has none; fail loudly rather than corrupt one silently.
                IF EXISTS (
                  SELECT 1
                    FROM information_schema.columns c
                   WHERE c.udt_name = t.typname AND c.column_default IS NOT NULL
                ) THEN
                  RAISE EXCEPTION 'Cannot rebuild %: a column using it has a default', t.typname;
                END IF;

                FOR col IN
                  SELECT c.table_schema, c.table_name, c.column_name
                    FROM information_schema.columns c
                   WHERE c.udt_name = t.typname
                LOOP
                  EXECUTE format(
                    'UPDATE %I.%I SET %I = %L WHERE %I = %L',
                    col.table_schema, col.table_name, col.column_name,
                    'SERVICE_TECHNICIAN', col.column_name, 'TECHNICIAN'
                  );
                END LOOP;

                -- Rebuild from the type's own labels so no other value is lost.
                SELECT string_agg(quote_literal(e.enumlabel), ',' ORDER BY e.enumsortorder)
                  INTO new_labels
                  FROM pg_enum e
                  JOIN pg_type ty ON ty.oid = e.enumtypid
                 WHERE ty.typname = t.typname AND e.enumlabel <> 'TECHNICIAN';

                old_type := t.typname || '_old';
                EXECUTE format('ALTER TYPE %I RENAME TO %I', t.typname, old_type);
                EXECUTE format('CREATE TYPE %I AS ENUM (%s)', t.typname, new_labels);

                FOR col IN
                  SELECT c.table_schema, c.table_name, c.column_name
                    FROM information_schema.columns c
                   WHERE c.udt_name = old_type
                LOOP
                  EXECUTE format(
                    'ALTER TABLE %I.%I ALTER COLUMN %I TYPE %I USING %I::text::%I',
                    col.table_schema, col.table_name, col.column_name,
                    t.typname, col.column_name, t.typname
                  );
                END LOOP;

                EXECUTE format('DROP TYPE %I', old_type);
              END LOOP;
            END
            $$;
          `);
          logger.info("Retired the 'TECHNICIAN' job; existing holders moved to SERVICE_TECHNICIAN");
        } catch (err) {
          logger.error("Failed to retire the 'TECHNICIAN' job enum value:", err);
          throw err;
        }

        // notifications.employee_id was created as a real FK to employee(id) by an
        // earlier synchronize() run, but it's a recipient ID that must also accept
        // Admin IDs (a separate table, not an Employee row) — every notifyAdmins
        // broadcast insert was silently failing on this constraint. Drop it;
        // notificationEntity.ts's relation no longer recreates it on fresh syncs.
        try {
          await Source.query(`
            DO $$
            DECLARE
              fk_name text;
            BEGIN
              SELECT tc.constraint_name INTO fk_name
              FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
              WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = 'notifications'
                AND kcu.column_name = 'employee_id'
              LIMIT 1;

              IF fk_name IS NOT NULL THEN
                EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I', fk_name);
              END IF;
            END
            $$;
          `);
          logger.info(
            'Guaranteed notifications.employee_id has no FK constraint (Admin recipients allowed).',
          );
        } catch (err) {
          logger.warn('Could not drop notifications employee_id FK constraint:', err);
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
