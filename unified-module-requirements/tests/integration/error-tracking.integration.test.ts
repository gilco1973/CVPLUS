import { ErrorTracking, ErrorTrackingConfig } from '../../src/integrations/error-tracking.js';
import { ValidationService } from '../../src/services/ValidationService.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ErrorTracking Integration', () => {
  let errorTracking: ErrorTracking;
  let validationService: ValidationService;
  let tempDir: string;

  beforeEach(async () => {
    validationService = new ValidationService();

    const config: ErrorTrackingConfig = {
      enabled: true,
      provider: 'sentry',
      environment: 'test',
      tags: {},
      filters: {
        enabledLevels: ['error', 'warning', 'info'],
        excludeRules: [],
        includeModules: [],
        excludeModules: []
      },
      reporting: {
        realTime: false, // Disable for tests
        batchSize: 10,
        flushInterval: 5000,
        retryAttempts: 3
      },
      integration: {
        sourceMap: true,
        breadcrumbs: true,
        userContext: false,
        performanceTracking: false
      }
    };

    errorTracking = new ErrorTracking(config);

    // Create temporary directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'error-tracking-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('captureError', () => {
    it('should capture validation errors successfully', async () => {
      const error = new Error('Test validation error');
      const context = {
        module: 'test-module',
        rule: 'test-rule',
        file: 'test.ts',
        line: 42
      };

      const eventId = await errorTracking.captureError(error, context);

      expect(eventId).toBeTruthy();
      expect(typeof eventId).toBe('string');
    });

    it('should return empty string when disabled', async () => {
      const disabledConfig: ErrorTrackingConfig = {
        enabled: false,
        provider: 'sentry',
        environment: 'test',
        tags: {},
        filters: {
          enabledLevels: ['error'],
          excludeRules: [],
          includeModules: [],
          excludeModules: []
        },
        reporting: {
          realTime: false,
          batchSize: 10,
          flushInterval: 5000,
          retryAttempts: 3
        },
        integration: {
          sourceMap: true,
          breadcrumbs: true,
          userContext: false,
          performanceTracking: false
        }
      };

      const disabledTracking = new ErrorTracking(disabledConfig);
      const error = new Error('Test error');

      const eventId = await disabledTracking.captureError(error);

      expect(eventId).toBe('');
    });
  });

  describe('captureValidationError', () => {
    it('should capture validation warnings successfully', async () => {
      const ruleId = 'warning-rule';
      const message = 'Test validation warning';
      const level = 'warning' as const;
      const context = {
        module: 'test-module'
      };

      const eventId = await errorTracking.captureValidationError(ruleId, message, level, context);

      expect(eventId).toBeTruthy();
      expect(typeof eventId).toBe('string');
    });
  });

  describe('captureValidationError info', () => {
    it('should capture validation info messages successfully', async () => {
      const ruleId = 'info-rule';
      const message = 'Test validation info';
      const level = 'info' as const;
      const context = {
        module: 'test-module'
      };

      const eventId = await errorTracking.captureValidationError(ruleId, message, level, context);

      expect(eventId).toBeTruthy();
      expect(typeof eventId).toBe('string');
    });
  });

  describe('addBreadcrumb', () => {
    it('should add breadcrumbs successfully', () => {
      // This should not throw
      expect(() => {
        errorTracking.addBreadcrumb('validation', 'Validation started', 'info', { module: 'test-module' });
      }).not.toThrow();
    });
  });

  describe('setTag', () => {
    it('should set tags successfully', () => {
      expect(() => {
        errorTracking.setTag('environment', 'test');
        errorTracking.setTag('version', '1.0.0');
      }).not.toThrow();
    });
  });

  describe('setUserContext', () => {
    it('should set user context successfully', () => {
      const user = {
        id: 'test-user',
        email: 'test@example.com'
      };

      expect(() => {
        errorTracking.setUserContext(user);
      }).not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should integrate with ValidationService for error reporting', async () => {
      // Create a module structure
      const moduleDir = path.join(tempDir, 'test-module');
      await fs.mkdir(moduleDir, { recursive: true });
      await fs.writeFile(
        path.join(moduleDir, 'package.json'),
        JSON.stringify({
          name: 'test-module',
          version: '1.0.0'
        }, null, 2)
      );

      // Simulate validation process with error tracking
      const startTime = Date.now();

      errorTracking.addBreadcrumb({
        message: 'Starting validation',
        category: 'validation',
        level: 'info',
        data: { module: moduleDir }
      });

      try {
        // This might fail, but we can capture the error
        const result = await validationService.validateModule(moduleDir, []);

        // If successful, capture info
        await errorTracking.captureValidationError(
          'validation-success',
          'Validation completed successfully',
          'info',
          {
            module: moduleDir
          },
          { duration: Date.now() - startTime }
        );
      } catch (error) {
        // Capture the error
        const eventId = await errorTracking.captureError(error as Error, {
          module: moduleDir,
          rule: 'validation-process'
        });

        expect(eventId).toBeTruthy();
      }
    });

    it('should handle multiple concurrent error captures', async () => {
      const errors = [
        new Error('Error 1'),
        new Error('Error 2'),
        new Error('Error 3')
      ];

      const contexts = [
        { module: 'module-1', rule: 'rule-1' },
        { module: 'module-2', rule: 'rule-2' },
        { module: 'module-3', rule: 'rule-3' }
      ];

      // Capture all errors concurrently
      const eventIds = await Promise.all(
        errors.map((error, index) =>
          errorTracking.captureError(error, contexts[index])
        )
      );

      // All should return valid event IDs
      eventIds.forEach(eventId => {
        expect(eventId).toBeTruthy();
        expect(typeof eventId).toBe('string');
      });

      // All event IDs should be unique
      const uniqueIds = new Set(eventIds);
      expect(uniqueIds.size).toBe(eventIds.length);
    });

    it('should respect filtering configuration', async () => {
      // Create error tracking with specific filters
      const filteredConfig: ErrorTrackingConfig = {
        enabled: true,
        provider: 'sentry',
        environment: 'test',
        tags: {},
        filters: {
          enabledLevels: ['error', 'warning'], // Include warnings for this test
          excludeRules: ['ignored-rule'],
          includeModules: ['allowed-module'],
          excludeModules: ['forbidden-module']
        },
        reporting: {
          realTime: false,
          batchSize: 10,
          flushInterval: 5000,
          retryAttempts: 3
        },
        integration: {
          sourceMap: true,
          breadcrumbs: true,
          userContext: false,
          performanceTracking: false
        }
      };

      const filteredTracking = new ErrorTracking(filteredConfig);

      // Test error capture (should work)
      const errorId = await filteredTracking.captureError(
        new Error('Test error'),
        { module: 'allowed-module', rule: 'test-rule' }
      );
      expect(errorId).toBeTruthy();

      // Test warning capture (should work even though level filtering
      // might be applied at provider level)
      const warningId = await filteredTracking.captureValidationError(
        'test-rule',
        'Test warning',
        'warning',
        { module: 'allowed-module' }
      );
      expect(warningId).toBeTruthy();
    });
  });

  describe('configuration validation', () => {
    it('should work with different provider configurations', () => {
      const sentryConfig: ErrorTrackingConfig = {
        enabled: true,
        provider: 'sentry',
        dsn: 'https://test@sentry.io/123456',
        environment: 'test',
        tags: {},
        filters: {
          enabledLevels: ['error'],
          excludeRules: [],
          includeModules: [],
          excludeModules: []
        },
        reporting: {
          realTime: false,
          batchSize: 10,
          flushInterval: 5000,
          retryAttempts: 3
        },
        integration: {
          sourceMap: true,
          breadcrumbs: true,
          userContext: false,
          performanceTracking: false
        }
      };

      expect(() => new ErrorTracking(sentryConfig)).not.toThrow();

      const bugsnagConfig: ErrorTrackingConfig = {
        enabled: true,
        provider: 'bugsnag',
        apiKey: 'test-api-key',
        environment: 'test',
        tags: {},
        filters: {
          enabledLevels: ['error'],
          excludeRules: [],
          includeModules: [],
          excludeModules: []
        },
        reporting: {
          realTime: false,
          batchSize: 10,
          flushInterval: 5000,
          retryAttempts: 3
        },
        integration: {
          sourceMap: true,
          breadcrumbs: true,
          userContext: false,
          performanceTracking: false
        }
      };

      expect(() => new ErrorTracking(bugsnagConfig)).not.toThrow();
    });
  });
});