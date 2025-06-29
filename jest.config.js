module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    "^.+\\.ts?$": "ts-jest"
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/interfaces/(.*)$': '<rootDir>/src/interfaces/$1',
    '^@/models/(.*)$': '<rootDir>/src/models/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/functions/(.*)$': '<rootDir>/src/functions/$1',
    '^@/functions/user/(.*)$': '<rootDir>/src/functions/user/$1',
    '^@/functions/notification/(.*)$': '<rootDir>/src/functions/notification/$1'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
}; 