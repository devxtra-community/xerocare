const { DataSource } = require('typeorm');
const dotenv = require('dotenv');
const path = require('path');

async function fixEnums(serviceName, servicePath, searchPattern, newValue) {
  console.log(`Fixing enums for ${serviceName}...`);
  dotenv.config({ path: path.join(servicePath, '.env') });

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await dataSource.initialize();
    console.log(`Connected to database for ${serviceName}`);

    // Find ALL enums that look like they might be what we want
    const types = await dataSource.query(
      `
            SELECT n.nspname as schema, t.typname as name
            FROM pg_type t
            LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
            WHERE t.typcategory = 'E'
            AND n.nspname NOT IN ('pg_catalog', 'information_schema')
            AND t.typname ILIKE $1
        `,
      [`%${searchPattern}%`],
    );

    console.log(
      `Found ${types.length} matching types for ${serviceName}:`,
      JSON.stringify(types, null, 2),
    );

    if (types.length === 0) {
      console.error(`No enums found matching ${searchPattern} for ${serviceName}`);
      return;
    }

    for (const type of types) {
      const fullName = `"${type.schema}"."${type.name}"`;
      try {
        await dataSource.query(`ALTER TYPE ${fullName} ADD VALUE IF NOT EXISTS '${newValue}'`);
        console.log(`Successfully added '${newValue}' to ${fullName}`);
      } catch (e) {
        console.warn(`Failed to update ${fullName}: ${e.message}`);
      }
    }
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

  // Fix billing_service
  await fixEnums('billing_service', path.join(rootPath, 'billing_service'), 'status', 'APPROVED');

  // Fix employee_service
  await fixEnums(
    'employee_service',
    path.join(rootPath, 'employee_service'),
    'job',
    'EMPLOYEE_MANAGER',
  );
}

run().catch(console.error);
