// Jest test setup file
// Global test configuration and utilities

import { jest } from '@jest/globals';

// Extend Jest timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
const originalConsole = console;

beforeEach(() => {
  // Suppress console.log in tests unless explicitly needed
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;

  // Clear all mocks
  jest.clearAllMocks();
});

// Global test utilities
declare global {
  var testUtils: {
    createMockModulePath: (name: string) => string;
    createMockValidationResult: () => any;
  };
}

(global as any).testUtils = {
  createMockModulePath: (name: string): string => `/test/modules/${name}`,
  createMockValidationResult: () => ({
    ruleId: 'TEST_RULE',
    status: 'PASS' as const,
    severity: 'WARNING' as const,
    message: 'Test validation result'
  })
};