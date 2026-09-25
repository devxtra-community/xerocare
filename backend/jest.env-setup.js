// Jest `setupFiles` entry — runs in every worker BEFORE any test file (and therefore
// before any service's own `./config/env` -> `dotenv.config()`) executes. dotenv never
// overwrites a variable that's already in process.env, so loading `.env.test` here first
// guarantees the app connects to the test databases even though its own dotenv.config()
// call still runs later.
/* eslint-disable @typescript-eslint/no-require-imports -- plain CommonJS config file */
const path = require('path');
const dotenv = require('dotenv');
/* eslint-enable @typescript-eslint/no-require-imports */

dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });
process.env.NODE_ENV = 'test';

// Hard stop against ever pointing a test run at the real Neon/production databases —
// a bug here would mean DROP DATABASE (see global-setup.js) running against prod data.
const dbUrlVars = [
  'EMPLOYEE_DATABASE_URL',
  'BILLING_DATABASE_URL',
  'VENDOR_DATABASE_URL',
  'CRM_DATABASE_URL',
];
for (const varName of dbUrlVars) {
  const url = process.env[varName];
  if (url && url.includes('neon.tech')) {
    throw new Error(
      `${varName} points at a neon.tech host — refusing to run tests against it. ` +
        'Tests must use .env.test, which should only ever point at local/disposable databases.',
    );
  }
}
