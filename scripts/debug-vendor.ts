import { Client } from 'pg';

const VEN_INV_DB =
  'postgresql://neondb_owner:npg_ld3M8xOfwpGP@ep-empty-bush-a1medazg-pooler.ap-southeast-1.aws.neon.tech/vendor_inventory_db?sslmode=require';

async function debugVendor() {
  console.log('--- Debugging Vendor Data ---');

  const venInvClient = new Client({ connectionString: VEN_INV_DB });
  await venInvClient.connect();

  const vendors = await venInvClient.query('SELECT id, name FROM vendors LIMIT 5;');
  console.log('Sample Vendors:', vendors.rows);

  const productVendors = await venInvClient.query(
    'SELECT DISTINCT vendor_id FROM products LIMIT 5;',
  );
  console.log('Sample Product Vendor IDs:', productVendors.rows);

  if (vendors.rows.length > 0 && productVendors.rows.length > 0) {
    const matchCount = await venInvClient.query(`
      SELECT count(*) 
      FROM products p
      JOIN vendors v ON p.vendor_id = v.id;
    `);
    console.log('Products with valid vendors:', matchCount.rows[0].count);
  }

  await venInvClient.end();
  console.log('-----------------------------');
}

debugVendor().catch(console.error);
