// Jest `globalSetup` — runs exactly ONCE in the main process before any worker/test file
// starts (unlike `setupFiles`/`setupFilesAfterEnv`, which run per test file). Dropping and
// recreating the test databases has to happen here, not per-file: with several test files
// per service, a per-file DROP DATABASE would race the file that's still mid-run.
//
// Per-test isolation (so tests don't see each other's rows) is NOT full DB recreation —
// see backend/test-setup.ts and individual test files for that.
/* eslint-disable @typescript-eslint/no-require-imports -- plain CommonJS config file */
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.test') });
/* eslint-enable @typescript-eslint/no-require-imports */

const TEST_DB_URLS = [
  process.env.EMPLOYEE_DATABASE_URL,
  process.env.BILLING_DATABASE_URL,
  process.env.VENDOR_DATABASE_URL,
  process.env.CRM_DATABASE_URL,
].filter(Boolean);

async function resetDatabase(connectionString) {
  if (connectionString.includes('neon.tech')) {
    throw new Error(`Refusing to reset a neon.tech database: ${connectionString}`);
  }

  const target = new URL(connectionString);
  const dbName = target.pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    throw new Error(`Refusing to reset "${dbName}" — test database names must end in _test.`);
  }

  const adminUrl = new URL(connectionString);
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    // Drop any lingering connections from a previous run that didn't shut down cleanly.
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [dbName],
    );
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    await client.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await client.end();
  }
}

module.exports = async function globalSetup() {
  for (const url of TEST_DB_URLS) {
    await resetDatabase(url);
  }
};
