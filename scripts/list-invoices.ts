import { Client } from 'pg';

const BILLING_DB =
  'postgresql://neondb_owner:npg_ld3M8xOfwpGP@ep-empty-bush-a1medazg-pooler.ap-southeast-1.aws.neon.tech/xerocare_billing?sslmode=require';

async function listInvoices() {
  console.log('--- Listing Invoices ---');
  const client = new Client({ connectionString: BILLING_DB });
  await client.connect();
  const res = await client.query(
    'SELECT id, "invoiceNumber", "saleType", status, "totalAmount", "createdAt" FROM invoice ORDER BY "createdAt" DESC LIMIT 10;',
  );
  console.table(res.rows);
  await client.end();
  console.log('------------------------');
}

listInvoices().catch(console.error);
