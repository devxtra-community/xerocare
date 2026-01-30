const { DataSource } = require('typeorm');
const dotenv = require('dotenv');
const path = require('path');

async function listTables(serviceName, servicePath) {
  console.log(`Listing tables for ${serviceName}...`);
  dotenv.config({ path: path.join(servicePath, '.env') });

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await dataSource.initialize();
    const tables = await dataSource.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
    console.log(
      `Tables in ${serviceName}:`,
      tables.map((t) => t.table_name),
    );
  } catch (error) {
    console.error(`Failed for ${serviceName}:`, error.message);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

async function run() {
  const rootPath = '/home/riyas/Desktop/xerocare/backend';
  await listTables('employee_service', path.join(rootPath, 'employee_service'));
}

run().catch(console.error);
