import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        strict: true,
        esModuleInterop: true,
        moduleResolution: 'node',
        module: 'commonjs',
      },
    }],
  },
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
};

export default config;
