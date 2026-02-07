import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function fixEnums(
  serviceName: string,
  servicePath: string,
  enumName: string,
  newValue: string,
) {
  console.log(`Fixing enums for ${serviceName}...`);
  dotenv.config({ path: path.join(servicePath, '.env') });

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await dataSource.initialize();
    console.log(`Connected to database for ${serviceName}`);

    // Check if value exists first (optional but safer)
    await dataSource.query(`ALTER TYPE ${enumName} ADD VALUE IF NOT EXISTS '${newValue}'`);
    console.log(`Successfully added '${newValue}' to ${enumName}`);
  } catch (error) {
    console.error(`Failed to update ${serviceName}:`, error);
  } finally {
    await dataSource.destroy();
  }
}

async function run() {
  const rootPath = '/home/riyas/Desktop/xerocare/backend';

  // Fix billing_service
  await fixEnums(
    'billing_service',
    path.join(rootPath, 'billing_service'),
    'invoices_status_enum',
    'APPROVED',
  );

  // Fix employee_service
  await fixEnums(
    'employee_service',
    path.join(rootPath, 'employee_service'),
    'employee_employee_job_enum',
    'EMPLOYEE_MANAGER',
  );
}

run();
