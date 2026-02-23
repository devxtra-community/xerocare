import pg from 'pg';
import dotenv from 'dotenv';
const { Client } = pg;
dotenv.config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/xerocare_inventory'
  });
  await client.connect();

  const models = await client.query('SELECT id FROM "model"');
  console.log(`Found ${models.rowCount} models. Syncing quantities...`);

  for (const m of models.rows) {
    const res = await client.query(`
      SELECT
         COUNT(*) as total,
         SUM(CASE WHEN "product_status" = 'AVAILABLE' THEN 1 ELSE 0 END) as available,
         SUM(CASE WHEN "product_status" = 'RENTED' THEN 1 ELSE 0 END) as rented,
         SUM(CASE WHEN "product_status" = 'LEASE' THEN 1 ELSE 0 END) as leased,
         SUM(CASE WHEN "product_status" = 'SOLD' THEN 1 ELSE 0 END) as sold
       FROM "products"
       WHERE "model_id" = $1
    `, [m.id]);

    const stats = res.rows[0];
    await client.query(`
      UPDATE "model"
      SET 
        quantity = $1,
        available = $2,
        rented = $3,
        leased = $4,
        sold = $5
      WHERE id = $6
    `, [
      parseInt(stats.total) || 0,
      parseInt(stats.available) || 0,
      parseInt(stats.rented) || 0,
      parseInt(stats.leased) || 0,
      parseInt(stats.sold) || 0,
      m.id
    ]);
    console.log(`Synced model ${m.id}`);
  }

  await client.end();
  console.log('Done!');
}

run().catch(console.error);
