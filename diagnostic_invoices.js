/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require('pg');
require('dotenv').config({ path: '/home/riyas/Desktop/xerocare/backend/billing_service/.env' });

async function checkInvoices() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const res = await client.query(
      'SELECT status, type, "saleType", COUNT(*), SUM("totalAmount") as total FROM invoices GROUP BY status, type, "saleType"',
    );
    console.table(res.rows);

    const allInvoices = await client.query(
      'SELECT "invoiceNumber", status, type, "saleType", "totalAmount" FROM invoices LIMIT 10',
    );
    console.table(allInvoices.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkInvoices();
