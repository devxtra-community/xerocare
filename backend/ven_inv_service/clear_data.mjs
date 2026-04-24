import pg from 'pg';

const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://xerouser:password123@localhost:5432/xerocare_vendor',
  connectionTimeoutMillis: 5000,
});

async function clearData() {
  try {
    await client.connect();
    console.log('✅ Connected to xerocare_vendor database');

    // 1. Nullify spare_part_id references in products first (SET NULL FK)
    const r1 = await client.query(`UPDATE products SET spare_part_id = NULL WHERE spare_part_id IS NOT NULL`);
    console.log(`   Updated ${r1.rowCount} products (cleared spare_part_id FK references)`);

    // 2. Delete spare_part_inventory (references spare_parts)
    const r2 = await client.query(`DELETE FROM spare_part_inventory`);
    console.log(`   Deleted ${r2.rowCount} spare_part_inventory rows`);

    // 3. Delete all products
    const r3 = await client.query(`DELETE FROM products`);
    console.log(`   Deleted ${r3.rowCount} products`);

    // 4. Delete spare_parts_models junction table
    const r4 = await client.query(`DELETE FROM spare_parts_models`);
    console.log(`   Deleted ${r4.rowCount} spare_parts_models rows`);

    // 5. Delete all spare parts
    const r5 = await client.query(`DELETE FROM spare_parts`);
    console.log(`   Deleted ${r5.rowCount} spare_parts`);

    // Verify
    const v1 = await client.query(`SELECT COUNT(*) AS cnt FROM products`);
    const v2 = await client.query(`SELECT COUNT(*) AS cnt FROM spare_parts`);
    console.log('\n📊 Final counts:');
    console.log(`   products remaining: ${v1.rows[0].cnt}`);
    console.log(`   spare_parts remaining: ${v2.rows[0].cnt}`);
    console.log('\n✅ Done! All products and spare parts have been deleted successfully.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

clearData();
