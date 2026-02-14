import { Client } from 'pg';

const BILLING_DB =
  'postgresql://neondb_owner:npg_ld3M8xOfwpGP@ep-empty-bush-a1medazg-pooler.ap-southeast-1.aws.neon.tech/xerocare_billing?sslmode=require';
const VEN_INV_DB =
  'postgresql://neondb_owner:npg_ld3M8xOfwpGP@ep-empty-bush-a1medazg-pooler.ap-southeast-1.aws.neon.tech/vendor_inventory_db?sslmode=require';
const EMPLOYEE_DB =
  'postgresql://neondb_owner:npg_ld3M8xOfwpGP@ep-empty-bush-a1medazg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function checkCounts() {
  console.log('--- Checking DB Counts ---');

  const billingClient = new Client({ connectionString: BILLING_DB });
  await billingClient.connect();
  const billingCount = await billingClient.query('SELECT count(*) FROM invoice;');
  console.log('Billing Service - Invoices:', billingCount.rows[0].count);
  await billingClient.end();

  const venInvClient = new Client({ connectionString: VEN_INV_DB });
  await venInvClient.connect();
  const branchCount = await venInvClient.query('SELECT count(*) FROM branch;');
  const warehouseCount = await venInvClient.query('SELECT count(*) FROM warehouse;');
  console.log('Ven Inv Service - Branches:', branchCount.rows[0].count);
  console.log('Ven Inv Service - Warehouses:', warehouseCount.rows[0].count);
  await venInvClient.end();

  const employeeClient = new Client({ connectionString: EMPLOYEE_DB });
  await employeeClient.connect();
  const employeeCount = await employeeClient.query('SELECT count(*) FROM employee;');
  console.log('Employee Service - Employees:', employeeCount.rows[0].count);
  await employeeClient.end();

  console.log('--------------------------');
}

checkCounts().catch(console.error);
