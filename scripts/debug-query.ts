import { Client } from 'pg';

const VEN_INV_DB =
  'postgresql://neondb_owner:npg_ld3M8xOfwpGP@ep-empty-bush-a1medazg-pooler.ap-southeast-1.aws.neon.tech/vendor_inventory_db?sslmode=require';

async function debugQuery() {
  console.log('--- Debugging Inventory Query ---');

  const client = new Client({ connectionString: VEN_INV_DB });
  await client.connect();

  // Simulate the query in the repository
  const query = `
    SELECT 
      v.name AS vendor_name,
      p.name AS product_name,
      count(p.id) AS total_qty
    FROM products p
    LEFT JOIN vendors v ON p.vendor_id = v.id
    GROUP BY v.name, p.name
    LIMIT 5;
  `;

  const res = await client.query(query);
  console.log('Query Result Keys:', Object.keys(res.rows[0] || {}));
  console.log('Query Result Data:', res.rows);

  await client.end();
}

debugQuery().catch(console.error);
