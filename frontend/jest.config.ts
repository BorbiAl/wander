import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Collect coverage from the lib files under test
  collectCoverageFrom: [
    'app/lib/hmm.ts',
    'app/lib/utils.ts',
    'app/lib/fileLock.ts',
    'app/lib/rateLimit.ts',
  ],
};

export default createJestConfig(config);
