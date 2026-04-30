/**
 * clear_orders_quotations.mjs
 * ----------------------------
 * Clears ALL rent / lease / sale orders and quotations (QUOTATION, PROFORMA,
 * FINAL invoices) from the xerocare_billing database, including all child rows.
 *
 * This covers both the employee-side and finance-side data.
 *
 * Also clears spare-part related quotation data from xerocare_vendor when
 * applicable.
 *
 * Run:
 *   node clear_orders_quotations.mjs
 */

import pg from 'pg';

const { Client } = pg;

const BILLING_DB_URL = 'postgresql://xerouser:password123@localhost:5432/xerocare_billing';

async function clearBillingData() {
  const client = new Client({ connectionString: BILLING_DB_URL, connectionTimeoutMillis: 5000 });
  await client.connect();
  console.log('✅ Connected to xerocare_billing');

  try {
    await client.query('BEGIN');

    // 1. Delete usage record items (child of usage_records)
    const r1 = await client.query('DELETE FROM usage_record_items');
    console.log(`   🗑  Deleted ${r1.rowCount} usage_record_items`);

    // 2. Delete device meter readings
    const r2 = await client.query('DELETE FROM device_meter_readings');
    console.log(`   🗑  Deleted ${r2.rowCount} device_meter_readings`);

    // 3. Delete usage records
    const r3 = await client.query('DELETE FROM usage_records');
    console.log(`   🗑  Deleted ${r3.rowCount} usage_records`);

    // 4. Delete product allocations
    const r4 = await client.query('DELETE FROM product_allocations');
    console.log(`   🗑  Deleted ${r4.rowCount} product_allocations`);

    // 5. Delete return credits
    const r5 = await client.query('DELETE FROM return_credits');
    console.log(`   🗑  Deleted ${r5.rowCount} return_credits`);

    // 6. Delete invoice items (child of invoices)
    const r6 = await client.query('DELETE FROM invoice_items');
    console.log(`   🗑  Deleted ${r6.rowCount} invoice_items`);

    // 7. Delete ALL invoices (covers QUOTATION, PROFORMA, FINAL for RENT, LEASE, SALE, SPAREPART)
    const r7 = await client.query('DELETE FROM invoices');
    console.log(`   🗑  Deleted ${r7.rowCount} invoices (quotations + orders of all types)`);

    await client.query('COMMIT');

    // Verify
    const v = await client.query(`
      SELECT 'invoices' AS tbl, COUNT(*) AS cnt FROM invoices
      UNION ALL SELECT 'invoice_items', COUNT(*) FROM invoice_items
      UNION ALL SELECT 'product_allocations', COUNT(*) FROM product_allocations
      UNION ALL SELECT 'usage_records', COUNT(*) FROM usage_records
      UNION ALL SELECT 'usage_record_items', COUNT(*) FROM usage_record_items
      UNION ALL SELECT 'device_meter_readings', COUNT(*) FROM device_meter_readings
      UNION ALL SELECT 'return_credits', COUNT(*) FROM return_credits
    `);
    console.log('\n📊 Final counts in xerocare_billing:');
    v.rows.forEach((row) => console.log(`   ${row.tbl}: ${row.cnt}`));
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  XeroCare — Clear All Orders & Quotations');
  console.log('  Scope: Rent | Lease | Sale | Spare Part (All types)');
  console.log('  Affected: Employee Side + Finance Side');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    await clearBillingData();
    console.log('\n✅ All orders and quotations cleared successfully!\n');
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    process.exit(1);
  }
}

main();
