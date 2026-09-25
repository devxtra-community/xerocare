/** Jest project config for billing_service — real local Postgres test DB, mocked mail/S3. */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- plain CommonJS config file
const path = require('path');

module.exports = {
  displayName: 'billing_service',
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  setupFiles: ['<rootDir>/../jest.env-setup.js'],
  setupFilesAfterEnv: ['<rootDir>/../test-setup.ts'],
  globalSetup: '<rootDir>/../global-setup.js',
  transform: {
    '^.+\\.ts$': ['ts-jest', { isolatedModules: true, tsconfig: '<rootDir>/tsconfig.json' }],
  },
  // billing_service pins uuid@13, which ships ESM-only — `require('uuid')` (what ts-jest's
  // CommonJS output calls) fails under this Jest/Node combination. Redirect to the older,
  // CJS-built copy already hoisted at the repo root for tests only; production is untouched
  // (same v4() API, so behavior is identical).
  moduleNameMapper: {
    // Resolve from the repo root, not from this file's own directory — billing_service's
    // own node_modules/uuid is the problematic ESM-only v13 copy (see comment above).
    '^uuid$': require.resolve('uuid', { paths: [path.resolve(__dirname, '..', '..')] }),
  },
};
