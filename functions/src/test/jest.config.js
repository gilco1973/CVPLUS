/**
 * Jest Configuration for Portal Generation System Tests
 * 
 * Comprehensive test configuration supporting unit tests, integration tests,
 * and performance benchmarks for the portal generation system.
 * 
 * @author Gil Klainert
 * @created 2025-08-19
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directory for tests
  rootDir: '../',

  // Test file patterns
  testMatch: [
    '<rootDir>/test/**/*.test.ts',
    '<rootDir>/test/**/*.test.js',
    '<rootDir>/services/**/*.test.ts',
    '<rootDir>/functions/**/*.test.ts'
  ],

  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/.git/'
  ],

  // TypeScript support
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },

  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Module name mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@types/(.*)$': '<rootDir>/types/$1',
    '^@test/(.*)$': '<rootDir>/test/$1'
  },

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/test/setup.ts'
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts',

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'services/**/*.ts',
    'functions/**/*.ts',
    '!**/*.test.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**'
  ],
  
  coverageDirectory: '<rootDir>/coverage',
  
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Specific requirements for core services
    './services/portal-generation.service.ts': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    },
    './services/vector-database.service.ts': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    },
    './services/portal-integration.service.ts': {
      branches: 80,
      functions: 85,
      lines: 80,
      statements: 80
    }
  },

  // Test timeout
  testTimeout: 60000, // 60 seconds for integration tests

  // Parallel testing
  maxWorkers: '50%',

  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Error handling
  errorOnDeprecated: true,

  // Test suites configuration
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: [
        '<rootDir>/services/**/*.test.ts',
        '<rootDir>/test/**/unit/**/*.test.ts'
      ],
      testTimeout: 10000
    },
    {
      displayName: 'Integration Tests',
      testMatch: [
        '<rootDir>/test/**/integration/**/*.test.ts',
        '<rootDir>/test/**/*integration*.test.ts'
      ],
      testTimeout: 30000
    },
    {
      displayName: 'Performance Tests',
      testMatch: [
        '<rootDir>/test/**/performance/**/*.test.ts',
        '<rootDir>/test/**/*performance*.test.ts',
        '<rootDir>/test/**/*benchmark*.test.ts'
      ],
      testTimeout: 120000 // 2 minutes for performance tests
    },
    {
      displayName: 'End-to-End Tests',
      testMatch: [
        '<rootDir>/test/**/e2e/**/*.test.ts',
        '<rootDir>/test/**/*e2e*.test.ts'
      ],
      testTimeout: 180000 // 3 minutes for E2E tests
    }
  ],

  // Reporters
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'Portal Generation Test Results',
        outputPath: '<rootDir>/test-results/test-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],

  // Environment variables for testing
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    FIRESTORE_EMULATOR_HOST: 'localhost:8080',
    FIREBASE_STORAGE_EMULATOR_HOST: 'localhost:9199',
    FUNCTIONS_EMULATOR: 'true'
  },

  // Custom matchers and utilities
  setupFilesAfterEnv: [
    '<rootDir>/test/custom-matchers.ts',
    '<rootDir>/test/test-utils.ts'
  ],

  // Watch mode configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Snapshot configuration
  snapshotSerializers: [
    'jest-serializer-json'
  ],

  // Additional configuration for Firebase testing
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
      isolatedModules: true
    }
  },

  // Handle ES modules
  extensionsToTreatAsEsm: ['.ts'],

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(firebase|@firebase)/)'
  ],

  // Memory leak detection
  detectLeaks: true,
  detectOpenHandles: true,

  // Bail configuration
  bail: false,

  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache',

  // Notify configuration for watch mode
  notify: true,
  notifyMode: 'failure-change',

  // Test results processor
  testResultsProcessor: '<rootDir>/test/results-processor.js'
};