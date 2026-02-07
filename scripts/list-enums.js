const { DataSource } = require('typeorm');
const dotenv = require('dotenv');
const path = require('path');

async function listEnums(serviceName, servicePath) {
  console.log(`Listing enums for ${serviceName}...`);
  dotenv.config({ path: path.join(servicePath, '.env') });

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await dataSource.initialize();
    const results = await dataSource.query(`
            SELECT n.nspname as schema, t.typname as name
            FROM pg_type t
            LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
            WHERE (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid))
            AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
            AND n.nspname NOT IN ('pg_catalog', 'information_schema')
            AND t.typcategory = 'E'
        `);
    console.log(`Enums for ${serviceName}:`, JSON.stringify(results, null, 2));
  } catch (error) {
    console.error(`Failed to list enums for ${serviceName}:`, error);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

async function run() {
  const rootPath = '/home/riyas/Desktop/xerocare/backend';
  await listEnums('employee_service', path.join(rootPath, 'employee_service'));
}

run().catch(console.error);
