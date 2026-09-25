/** Jest project config for ven_inv_service — real local Postgres test DB, mocked mail/S3. */
module.exports = {
  displayName: 'ven_inv_service',
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
