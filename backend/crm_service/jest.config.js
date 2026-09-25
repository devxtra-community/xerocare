/** Jest project config for crm_service — real local Postgres (customers) + Mongo (leads)
 *  test databases, mocked mail/S3. */
module.exports = {
  displayName: 'crm_service',
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  setupFiles: ['<rootDir>/../jest.env-setup.js'],
  setupFilesAfterEnv: ['<rootDir>/../test-setup.ts'],
  globalSetup: '<rootDir>/../global-setup.js',
  transform: {
    '^.+\\.ts$': ['ts-jest', { isolatedModules: true, tsconfig: '<rootDir>/tsconfig.json' }],
  },
};
