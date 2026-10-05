/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testTimeout: 20000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
