/** Jest project config for api_gateway — no own DB; needs real Redis (rate limiters) and
 *  a local stub HTTP server standing in for every downstream service (see gateway.test.ts). */
module.exports = {
  displayName: 'api_gateway',
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  setupFiles: ['<rootDir>/../jest.env-setup.js'],
  setupFilesAfterEnv: ['<rootDir>/../test-setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { isolatedModules: true, tsconfig: '<rootDir>/tsconfig.json' }],
  },
};
