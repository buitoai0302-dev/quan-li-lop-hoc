module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/staging/**/*.staging.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  testTimeout: 30000,
};
