import pg from 'pg';

const { Client } = pg;

const DB_URL =
    'postgresql://neondb_owner:npg_ld3M8xOfwpGP@ep-empty-bush-a1medazg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    statement_timeout: 60000,
});

async function run() {
    await client.connect();
    console.log('Connected to DB');

    // Step 1: Kill other connections (except our own) to release table locks
    const killResult = await client.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = 'neondb'
      AND pid <> pg_backend_pid()
      AND query NOT LIKE '%pg_terminate%'
  `);
    console.log(`Terminated ${killResult.rowCount} connections`);

    // Wait briefly for connections to drop
    await new Promise((r) => setTimeout(r, 2000));

    // Step 2: Check current enum values in DB
    const enumCheck = await client.query(`
    SELECT unnest(enum_range(NULL::employee_employee_job_enum))::text AS val
  `);
    console.log('Current enum values:', enumCheck.rows.map((r) => r.val));

    // Step 3: Perform the migration atomically
    // We use a transaction and lock_timeout to avoid hanging
    await client.query("SET lock_timeout = '10s'");

    try {
        await client.query('BEGIN');

        await client.query(`
      ALTER TYPE employee_employee_job_enum RENAME TO employee_employee_job_enum_old
    `);
        console.log('Renamed old enum type');

        await client.query(`
      CREATE TYPE employee_employee_job_enum AS ENUM (
        'SALES',
        'CRM',
        'RENT',
        'LEASE',
        'EMPLOYEE_MANAGER'
      )
    `);
        console.log('Created new enum type');

        await client.query(`
      ALTER TABLE employee
        ALTER COLUMN employee_job TYPE employee_employee_job_enum
        USING CASE
          WHEN employee_job::text IN ('SALES', 'CRM', 'RENT', 'LEASE', 'EMPLOYEE_MANAGER')
          THEN employee_job::text::employee_employee_job_enum
          ELSE NULL
        END
    `);
        console.log('Migrated employee.employee_job column');

        await client.query('DROP TYPE employee_employee_job_enum_old');
        console.log('Dropped old enum type');

        await client.query('COMMIT');
        console.log('Migration committed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration FAILED, rolled back:', err);
        process.exit(1);
    }

    // Step 4: Verify
    const verify = await client.query(`
    SELECT unnest(enum_range(NULL::employee_employee_job_enum))::text AS val
  `);
    console.log('New enum values:', verify.rows.map((r) => r.val));

    await client.end();
}

run().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
