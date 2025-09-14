/**
 * T016: Function logging middleware test in functions/src/__tests__/function-logging.integration.test.ts
 * CRITICAL: This test MUST FAIL before implementation
 */

import { FunctionLogger, functionLoggingMiddleware } from '../middleware/functionLoggingMiddleware';
import { LogLevel, LogDomain } from '@cvplus/logging/backend';
import { Request, Response } from 'express';

// Mock Firebase Functions context
const mockContext = {
  eventId: 'event-123',
  timestamp: '2023-11-15T18:30:00Z',
  resource: 'projects/cvplus-test/locations/us-central1/functions/testFunction'
};

describe('FunctionLogger Integration', () => {
  let functionLogger: FunctionLogger;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    functionLogger = new FunctionLogger('test-function');

    mockRequest = {
      method: 'POST',
      url: '/api/test/endpoint',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token',
        'user-agent': 'Jest Test Suite',
        'x-correlation-id': 'correlation-test-123'
      },
      body: {
        userId: 'user-function-test',
        operation: 'test_operation',
        data: { testField: 'testValue' }
      },
      ip: '192.168.1.100'
    };

    mockResponse = {
      statusCode: 200,
      locals: {},
      setHeader: jest.fn(),
      getHeader: jest.fn(),
      end: jest.fn(),
      json: jest.fn()
    };

    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Function Execution Logging', () => {
    it('should log function invocation with request context', async () => {
      const mockInvocation = {
        functionName: 'analyzeCV',
        userId: 'user-invocation-test',
        requestId: 'req-function-123',
        method: 'POST',
        endpoint: '/api/cv/analyze',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'CVPlus Frontend/1.0'
        },
        body: {
          cvId: 'cv-analyze-456',
          features: ['ats_optimization', 'personality_insights']
        },
        context: mockContext
      };

      const correlationId = functionLogger.functionInvoked(mockInvocation);

      expect(correlationId).toBeDefined();
      expect(correlationId).toMatch(/^[a-zA-Z0-9\-_]{21}$/);

      const logEntry = functionLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.INFO,
        domain: LogDomain.SYSTEM,
        message: 'Firebase Function invoked',
        context: {
          event: 'FUNCTION_INVOKED',
          functionName: 'analyzeCV',
          userId: 'user-invocation-test',
          requestId: 'req-function-123',
          method: 'POST',
          endpoint: '/api/cv/analyze',
          eventId: 'event-123',
          bodyKeys: ['cvId', 'features']
        },
        correlationId: expect.any(String)
      });

      // Ensure sensitive data is redacted
      expect(logEntry.context).not.toHaveProperty('body');
      expect(logEntry.context).not.toHaveProperty('headers');
    });

    it('should log function completion with performance metrics', async () => {
      const mockCompletion = {
        functionName: 'generateVideo',
        userId: 'user-completion-test',
        requestId: 'req-completion-456',
        executionDuration: 45000, // 45 seconds
        statusCode: 200,
        responseSize: 2048576, // 2MB
        memoryUsed: 512, // MB
        billableTime: 45100, // ms
        coldStart: false,
        retryAttempt: 0
      };

      const correlationId = functionLogger.functionCompleted(mockCompletion);

      expect(correlationId).toBeDefined();

      const logEntry = functionLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.INFO,
        domain: LogDomain.PERFORMANCE,
        message: 'Firebase Function completed',
        context: {
          event: 'FUNCTION_COMPLETED',
          functionName: 'generateVideo',
          userId: 'user-completion-test',
          requestId: 'req-completion-456',
          statusCode: 200,
          responseSize: 2048576,
          memoryUsed: 512,
          billableTime: 45100,
          coldStart: false,
          retryAttempt: 0,
          outcome: 'success'
        },
        performance: {
          duration: 45000
        }
      });
    });

    it('should log function errors with stack traces and context', async () => {
      const mockError = new Error('AI service temporarily unavailable');
      mockError.stack = 'Error: AI service temporarily unavailable\n    at analyzeCV (index.js:145:12)';

      const mockErrorContext = {
        functionName: 'analyzeCV',
        userId: 'user-error-test',
        requestId: 'req-error-789',
        error: mockError,
        executionDuration: 8000,
        statusCode: 500,
        memoryUsed: 256,
        retryable: true,
        errorCategory: 'external_service_error',
        affectedService: 'anthropic_claude_api'
      };

      const correlationId = functionLogger.functionFailed(mockErrorContext);

      expect(correlationId).toBeDefined();

      const logEntry = functionLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.ERROR,
        domain: LogDomain.SYSTEM,
        message: 'Firebase Function failed',
        context: {
          event: 'FUNCTION_FAILED',
          functionName: 'analyzeCV',
          userId: 'user-error-test',
          requestId: 'req-error-789',
          statusCode: 500,
          memoryUsed: 256,
          retryable: true,
          errorCategory: 'external_service_error',
          affectedService: 'anthropic_claude_api',
          outcome: 'error'
        },
        error: {
          message: 'AI service temporarily unavailable',
          stack: expect.stringContaining('analyzeCV (index.js:145:12)'),
          name: 'Error'
        },
        performance: {
          duration: 8000
        }
      });
    });
  });

  describe('Middleware Integration', () => {
    it('should automatically log requests and responses through middleware', async () => {
      const middleware = functionLoggingMiddleware({
        functionName: 'testMiddlewareFunction',
        enableRequestLogging: true,
        enableResponseLogging: true,
        enablePerformanceTracking: true
      });

      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);

      // Check if logging was initiated
      expect(mockResponse.locals).toHaveProperty('functionLogger');
      expect(mockResponse.locals).toHaveProperty('startTime');
      expect(mockResponse.locals?.correlationId).toMatch(/^[a-zA-Z0-9\-_]{21}$/);
    });

    it('should extract and propagate correlation IDs from headers', async () => {
      const middleware = functionLoggingMiddleware({
        functionName: 'testCorrelationFunction'
      });

      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Should use correlation ID from header
      expect(mockResponse.locals?.correlationId).toBe('correlation-test-123');
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should log cold start detection and performance impact', async () => {
      // Mock cold start scenario
      process.env.COLD_START = 'true';

      const middleware = functionLoggingMiddleware({
        functionName: 'testColdStartFunction',
        enableColdStartDetection: true
      });

      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      const logger = mockResponse.locals?.functionLogger as FunctionLogger;
      const logs = logger?.getAllLogEntries() || [];
      const coldStartLog = logs.find(log =>
        log.context?.event === 'COLD_START_DETECTED'
      );

      expect(coldStartLog).toBeDefined();
      expect(coldStartLog).toMatchObject({
        level: LogLevel.WARN,
        domain: LogDomain.PERFORMANCE,
        message: 'Function cold start detected',
        context: {
          event: 'COLD_START_DETECTED',
          functionName: 'testColdStartFunction'
        }
      });

      // Clean up
      delete process.env.COLD_START;
    });
  });

  describe('Authentication and Authorization Logging', () => {
    it('should log authentication context from Firebase Auth token', async () => {
      const mockAuthContext = {
        uid: 'auth-uid-123',
        email: 'user@example.com',
        customClaims: {
          role: 'premium_user',
          tier: 'professional'
        },
        tokenValidation: {
          valid: true,
          issuedAt: 1700000000,
          expiresAt: 1700003600
        }
      };

      const correlationId = functionLogger.authenticationContext(mockAuthContext);

      expect(correlationId).toBeDefined();

      const logEntry = functionLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.INFO,
        domain: LogDomain.SECURITY,
        message: 'Authentication context established',
        context: {
          event: 'AUTH_CONTEXT_ESTABLISHED',
          uid: 'auth-uid-123',
          email: '[EMAIL_REDACTED]',
          role: 'premium_user',
          tier: 'professional',
          tokenValid: true
        }
      });
    });

    it('should log authorization failures with permission details', async () => {
      const mockAuthFailure = {
        uid: 'auth-fail-uid-456',
        attemptedAction: 'premium_feature_access',
        requiredPermissions: ['premium:features:access'],
        userPermissions: ['basic:features:access'],
        reason: 'insufficient_permissions',
        endpoint: '/api/premium/generate-video',
        userTier: 'free'
      };

      const correlationId = functionLogger.authorizationFailed(mockAuthFailure);

      expect(correlationId).toBeDefined();

      const logEntry = functionLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.WARN,
        domain: LogDomain.SECURITY,
        message: 'Authorization failed',
        context: {
          event: 'AUTHORIZATION_FAILED',
          uid: 'auth-fail-uid-456',
          attemptedAction: 'premium_feature_access',
          reason: 'insufficient_permissions',
          endpoint: '/api/premium/generate-video',
          userTier: 'free',
          outcome: 'denied'
        }
      });

      // Ensure permission arrays are not logged in detail
      expect(logEntry.context).not.toHaveProperty('requiredPermissions');
      expect(logEntry.context).not.toHaveProperty('userPermissions');
    });
  });

  describe('External Service Integration Logging', () => {
    it('should log external API calls with costs and performance', async () => {
      const mockExternalCall = {
        service: 'Anthropic Claude API',
        endpoint: '/v1/messages',
        method: 'POST',
        requestSize: 1024,
        responseSize: 4096,
        duration: 2500,
        statusCode: 200,
        tokens: {
          input: 1500,
          output: 800,
          total: 2300
        },
        cost: 0.115, // $0.115
        retryAttempt: 0,
        success: true
      };

      const correlationId = functionLogger.externalServiceCall(mockExternalCall);

      expect(correlationId).toBeDefined();

      const logEntry = functionLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.INFO,
        domain: LogDomain.PERFORMANCE,
        message: 'External service call completed',
        context: {
          event: 'EXTERNAL_SERVICE_CALL',
          service: 'Anthropic Claude API',
          endpoint: '/v1/messages',
          method: 'POST',
          statusCode: 200,
          tokens: {
            input: 1500,
            output: 800,
            total: 2300
          },
          cost: 0.115,
          retryAttempt: 0,
          success: true
        },
        performance: {
          duration: 2500,
          requestSize: 1024,
          responseSize: 4096
        }
      });
    });

    it('should log database operations with query performance', async () => {
      const mockDatabaseOperation = {
        operation: 'query',
        collection: 'processed_cvs',
        query: {
          type: 'where',
          conditions: ['userId', '==', 'user-db-test']
        },
        resultCount: 5,
        executionTime: 150,
        readUnits: 5,
        writeUnits: 0,
        cacheHit: false,
        indexUsed: true
      };

      const correlationId = functionLogger.databaseOperation(mockDatabaseOperation);

      expect(correlationId).toBeDefined();

      const logEntry = functionLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.INFO,
        domain: LogDomain.PERFORMANCE,
        message: 'Database operation completed',
        context: {
          event: 'DATABASE_OPERATION',
          operation: 'query',
          collection: 'processed_cvs',
          resultCount: 5,
          readUnits: 5,
          writeUnits: 0,
          cacheHit: false,
          indexUsed: true
        },
        performance: {
          duration: 150
        }
      });

      // Ensure actual query conditions are not logged for privacy
      expect(logEntry.context).not.toHaveProperty('query');
    });
  });

  describe('Resource Management and Monitoring', () => {
    it('should track function resource usage and limits', async () => {
      const mockResourceUsage = {
        memoryAllocated: 512, // MB
        memoryUsed: 387, // MB
        cpuUsage: 0.65, // 65%
        executionTime: 12000, // 12 seconds
        timeoutLimit: 60000, // 60 seconds
        remainingTime: 48000, // 48 seconds
        concurrentExecutions: 5
      };

      const correlationId = functionLogger.resourceUsage(mockResourceUsage);

      expect(correlationId).toBeDefined();

      const logEntry = functionLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.INFO,
        domain: LogDomain.PERFORMANCE,
        message: 'Function resource usage recorded',
        context: {
          event: 'RESOURCE_USAGE',
          memoryAllocated: 512,
          memoryUsed: 387,
          memoryUtilization: expect.closeTo(0.757, 2),
          cpuUsage: 0.65,
          concurrentExecutions: 5
        },
        performance: {
          executionTime: 12000,
          timeoutLimit: 60000,
          remainingTime: 48000
        }
      });
    });

    it('should log function timeout warnings when approaching limits', async () => {
      const mockTimeoutWarning = {
        functionName: 'longRunningAnalysis',
        executionTime: 55000, // 55 seconds
        timeoutLimit: 60000, // 60 seconds
        remainingTime: 5000, // 5 seconds
        warningThreshold: 0.9, // 90%
        currentProgress: 'analyzing_personality_insights'
      };

      const correlationId = functionLogger.timeoutWarning(mockTimeoutWarning);

      expect(correlationId).toBeDefined();

      const logEntry = functionLogger.getLastLogEntry();
      expect(logEntry).toMatchObject({
        level: LogLevel.WARN,
        domain: LogDomain.PERFORMANCE,
        message: 'Function approaching timeout limit',
        context: {
          event: 'TIMEOUT_WARNING',
          functionName: 'longRunningAnalysis',
          warningThreshold: 0.9,
          currentProgress: 'analyzing_personality_insights',
          severity: 'high'
        },
        performance: {
          executionTime: 55000,
          timeoutLimit: 60000,
          remainingTime: 5000
        }
      });
    });
  });

  describe('Correlation and Context Management', () => {
    it('should maintain correlation across nested function calls', async () => {
      const parentCorrelationId = 'parent-function-correlation-123';

      const childCorrelationId = functionLogger.withCorrelation(parentCorrelationId, () => {
        return functionLogger.functionInvoked({
          functionName: 'childFunction',
          userId: 'user-nested-test',
          requestId: 'req-nested-456'
        });
      });

      expect(childCorrelationId).toBe(parentCorrelationId);

      const logEntry = functionLogger.getLastLogEntry();
      expect(logEntry.correlationId).toBe(parentCorrelationId);
    });

    it('should include Firebase Function context in all log entries', () => {
      functionLogger.functionInvoked({
        functionName: 'contextTestFunction',
        userId: 'user-context-test',
        context: mockContext
      });

      const logEntry = functionLogger.getLastLogEntry();
      expect(logEntry.context).toMatchObject({
        eventId: 'event-123',
        functionName: 'contextTestFunction'
      });
    });
  });
});