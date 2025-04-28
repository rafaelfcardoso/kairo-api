import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['**/test/*.e2e-spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
        allowJs: true,
      },
    ],
  },
  globalSetup: '<rootDir>/test/setup-test-db.ts',
  globalTeardown: '<rootDir>/test/teardown-test-db.ts',
  forceExit: true,
  detectOpenHandles: true,
  testTimeout: 30000,
};

export default config;
