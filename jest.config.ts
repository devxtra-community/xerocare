/**
 * Jest config for Xerocare service-level unit/integration tests (real local Postgres test
 * DBs, mocked mail/S3/R2 — see backend/test-setup.ts and .env.test).
 *
 * This is separate from jest.config.js at this same path, which runs the plain-JS E2E
 * suite in e2e/ against a live/staging Gateway — that one is invoked explicitly with
 * `--config jest.config.js` and is untouched by this file. Every script here passes
 * `--config jest.config.ts` explicitly for the same reason.
 *
 * All 5 services now have test suites (employee, billing, ven_inv from Phase 1/2;
 * crm_service and api_gateway added in Phase 3).
 */
export default {
  projects: [
    '<rootDir>/backend/employee_service',
    '<rootDir>/backend/billing_service',
    '<rootDir>/backend/ven_inv_service',
    '<rootDir>/backend/crm_service',
    '<rootDir>/backend/api_gateway',
  ],
  // `globalSetup` (backend/global-setup.js, wired per-project) drops/recreates each test DB
  // exactly once for the whole run — serialize test FILES too, since several files in the
  // same project share that one DB and TypeORM's first-connection migrations aren't meant
  // to run concurrently against it.
  maxWorkers: 1,
};
