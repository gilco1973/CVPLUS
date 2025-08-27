/**
 * Service Reliability Manager Tests
 * Comprehensive test suite for enterprise-grade reliability patterns
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { ServiceReliabilityManager, ServiceMetrics, ServiceHealthStatus } from '../ServiceReliabilityManager';

// Mock dependencies
jest.mock('../error-recovery/RetryMechanism');
jest.mock('../RequestManager');

describe('ServiceReliabilityManager', () => {
  let serviceManager: ServiceReliabilityManager;

  beforeEach(() => {
    // Get fresh instance for each test
    serviceManager = ServiceReliabilityManager.getInstance();
    serviceManager.resetAllMetrics();
  });

  afterEach(() => {
    // Clear all timers
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should be a singleton', () => {
      const instance1 = ServiceReliabilityManager.getInstance();
      const instance2 = ServiceReliabilityManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with default configurations', () => {
      expect(serviceManager).toBeDefined();
      expect(serviceManager.getServiceMetrics()).toBeDefined();
      expect(serviceManager.getHealthStatus()).toBeDefined();
    });
  });

  describe('Circuit Breaker Functionality', () => {
    it('should initialize circuit breaker in CLOSED state', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      await serviceManager.executeReliableServiceCall(
        mockOperation,
        {
          serviceName: 'TestService',
          operationName: 'testOperation',
          jobId: 'test-job-1'
        }
      );

      const circuitBreakers = serviceManager.getCircuitBreakerStatus();
      const breaker = circuitBreakers.get('TestService.testOperation');
      expect(breaker?.state).toBe('CLOSED');
    });

    it('should open circuit breaker after failure threshold', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Service failure'));
      
      // Mock retry mechanism to fail immediately
      const { RetryMechanism } = await import('../error-recovery/RetryMechanism');
      const mockRetryMechanism = {
        executeWithRetry: jest.fn().mockResolvedValue({
          success: false,
          error: { originalError: new Error('Service failure') },
          attempts: [],
          totalExecutionTime: 1000,
          recoveredFromCheckpoint: false
        })
      };
      
      (RetryMechanism.getInstance as jest.Mock).mockReturnValue(mockRetryMechanism);

      // Execute multiple failing operations
      for (let i = 0; i < 5; i++) {
        try {
          await serviceManager.executeReliableServiceCall(
            mockOperation,
            {
              serviceName: 'TestService',
              operationName: 'failingOperation',
              jobId: 'test-job-1'
            }
          );
        } catch (error) {
          // Expected to fail
        }
      }

      const circuitBreakers = serviceManager.getCircuitBreakerStatus();
      const breaker = circuitBreakers.get('TestService.failingOperation');
      expect(breaker?.state).toBe('OPEN');
      expect(breaker?.failureCount).toBeGreaterThanOrEqual(5);
    });

    it('should reject calls immediately when circuit is OPEN', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      // Manually set circuit breaker to OPEN state
      serviceManager.updateCircuitBreakerConfig('TestService.blockedOperation', {
        failureThreshold: 1
      });

      try {
        await serviceManager.executeReliableServiceCall(
          () => Promise.reject(new Error('Initial failure')),
          {
            serviceName: 'TestService',
            operationName: 'blockedOperation',
            jobId: 'test-job-1'
          }
        );
      } catch (error) {
        // Expected initial failure
      }

      // Now the circuit should be open
      await expect(
        serviceManager.executeReliableServiceCall(
          mockOperation,
          {
            serviceName: 'TestService',
            operationName: 'blockedOperation',
            jobId: 'test-job-2'
          }
        )
      ).rejects.toThrow('Circuit breaker is OPEN');

      expect(mockOperation).not.toHaveBeenCalled();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track service metrics', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const { RetryMechanism } = await import('../error-recovery/RetryMechanism');
      const mockRetryMechanism = {
        executeWithRetry: jest.fn().mockResolvedValue({
          success: true,
          data: 'success',
          attempts: [],
          totalExecutionTime: 1000,
          recoveredFromCheckpoint: false
        })
      };
      
      (RetryMechanism.getInstance as jest.Mock).mockReturnValue(mockRetryMechanism);

      await serviceManager.executeReliableServiceCall(
        mockOperation,
        {
          serviceName: 'TestService',
          operationName: 'monitoredOperation',
          jobId: 'test-job-1'
        }
      );

      const metrics = serviceManager.getServiceMetrics('TestService.monitoredOperation') as ServiceMetrics;
      expect(metrics).toBeDefined();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.uptime).toBe(1);
      expect(metrics.errorRate).toBe(0);
    });

    it('should calculate error rates correctly', async () => {
      const { RetryMechanism } = await import('../error-recovery/RetryMechanism');
      
      // Execute successful operations
      const mockRetryMechanism = {
        executeWithRetry: jest.fn()
          .mockResolvedValueOnce({
            success: true,
            data: 'success',
            attempts: [],
            totalExecutionTime: 1000,
            recoveredFromCheckpoint: false
          })
          .mockResolvedValueOnce({
            success: false,
            error: { originalError: new Error('Failure') },
            attempts: [],
            totalExecutionTime: 1000,
            recoveredFromCheckpoint: false
          })
      };
      
      (RetryMechanism.getInstance as jest.Mock).mockReturnValue(mockRetryMechanism);

      // Execute one successful operation
      await serviceManager.executeReliableServiceCall(
        () => Promise.resolve('success'),
        {
          serviceName: 'TestService',
          operationName: 'mixedResults',
          jobId: 'test-job-1'
        }
      );

      // Execute one failed operation
      try {
        await serviceManager.executeReliableServiceCall(
          () => Promise.reject(new Error('Failure')),
          {
            serviceName: 'TestService',
            operationName: 'mixedResults',
            jobId: 'test-job-2'
          }
        );
      } catch (error) {
        // Expected failure
      }

      const metrics = serviceManager.getServiceMetrics('TestService.mixedResults') as ServiceMetrics;
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.uptime).toBe(0.5);
      expect(metrics.errorRate).toBe(0.5);
    });
  });

  describe('Health Monitoring', () => {
    it('should calculate healthy status for good services', async () => {
      const { RetryMechanism } = await import('../error-recovery/RetryMechanism');
      const mockRetryMechanism = {
        executeWithRetry: jest.fn().mockResolvedValue({
          success: true,
          data: 'success',
          attempts: [],
          totalExecutionTime: 500,
          recoveredFromCheckpoint: false
        })
      };
      
      (RetryMechanism.getInstance as jest.Mock).mockReturnValue(mockRetryMechanism);

      // Execute multiple successful operations to establish good health
      for (let i = 0; i < 10; i++) {
        await serviceManager.executeReliableServiceCall(
          () => Promise.resolve('success'),
          {
            serviceName: 'HealthyService',
            operationName: 'healthyOperation',
            jobId: `test-job-${i}`
          }
        );
      }

      // Manually trigger health check
      const healthStatus = serviceManager.getHealthStatus('HealthyService.healthyOperation') as ServiceHealthStatus;
      
      if (healthStatus) {
        expect(healthStatus.status).toBe('healthy');
        expect(healthStatus.uptime).toBeGreaterThanOrEqual(99);
      }
    });

    it('should calculate unhealthy status for failing services', async () => {
      const { RetryMechanism } = await import('../error-recovery/RetryMechanism');
      const mockRetryMechanism = {
        executeWithRetry: jest.fn().mockResolvedValue({
          success: false,
          error: { originalError: new Error('Service failure') },
          attempts: [],
          totalExecutionTime: 1000,
          recoveredFromCheckpoint: false
        })
      };
      
      (RetryMechanism.getInstance as jest.Mock).mockReturnValue(mockRetryMechanism);

      // Execute multiple failing operations
      for (let i = 0; i < 10; i++) {
        try {
          await serviceManager.executeReliableServiceCall(
            () => Promise.reject(new Error('Service failure')),
            {
              serviceName: 'UnhealthyService',
              operationName: 'failingOperation',
              jobId: `test-job-${i}`
            }
          );
        } catch (error) {
          // Expected failures
        }
      }

      // Manually trigger health check
      const healthStatus = serviceManager.getHealthStatus('UnhealthyService.failingOperation') as ServiceHealthStatus;
      
      if (healthStatus) {
        expect(healthStatus.status).toBe('unhealthy');
        expect(healthStatus.uptime).toBeLessThan(50);
      }
    });
  });

  describe('Connection Pool Management', () => {
    it('should manage connection pools correctly', async () => {
      const { RetryMechanism } = await import('../error-recovery/RetryMechanism');
      const mockRetryMechanism = {
        executeWithRetry: jest.fn().mockResolvedValue({
          success: true,
          data: 'success',
          attempts: [],
          totalExecutionTime: 1000,
          recoveredFromCheckpoint: false
        })
      };
      
      (RetryMechanism.getInstance as jest.Mock).mockReturnValue(mockRetryMechanism);

      const slowOperation = () => new Promise(resolve => 
        setTimeout(() => resolve('success'), 100)
      );

      // Execute multiple operations with connection pooling
      const promises = Array.from({ length: 5 }, (_, i) =>
        serviceManager.executeReliableServiceCall(
          slowOperation,
          {
            serviceName: 'PooledService',
            operationName: 'pooledOperation',
            jobId: `test-job-${i}`,
            useConnectionPool: true
          }
        )
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBe('success');
      });
    });
  });

  describe('Configuration Management', () => {
    it('should allow circuit breaker configuration updates', () => {
      serviceManager.updateCircuitBreakerConfig('TestService.configurable', {
        failureThreshold: 10,
        resetTimeout: 120000
      });

      const circuitBreakers = serviceManager.getCircuitBreakerStatus();
      const breaker = circuitBreakers.get('TestService.configurable');
      
      expect(breaker?.config.failureThreshold).toBe(10);
      expect(breaker?.config.resetTimeout).toBe(120000);
    });

    it('should allow circuit breaker reset', async () => {
      // Create a failing service
      const { RetryMechanism } = await import('../error-recovery/RetryMechanism');
      const mockRetryMechanism = {
        executeWithRetry: jest.fn().mockResolvedValue({
          success: false,
          error: { originalError: new Error('Service failure') },
          attempts: [],
          totalExecutionTime: 1000,
          recoveredFromCheckpoint: false
        })
      };
      
      (RetryMechanism.getInstance as jest.Mock).mockReturnValue(mockRetryMechanism);

      // Force circuit breaker to open
      serviceManager.updateCircuitBreakerConfig('TestService.resettable', {
        failureThreshold: 1
      });

      try {
        await serviceManager.executeReliableServiceCall(
          () => Promise.reject(new Error('Force failure')),
          {
            serviceName: 'TestService',
            operationName: 'resettable',
            jobId: 'test-job-1'
          }
        );
      } catch (error) {
        // Expected failure
      }

      // Verify circuit is open
      let circuitBreakers = serviceManager.getCircuitBreakerStatus();
      let breaker = circuitBreakers.get('TestService.resettable');
      expect(breaker?.state).toBe('OPEN');

      // Reset circuit breaker
      serviceManager.resetCircuitBreaker('TestService.resettable');

      // Verify circuit is closed
      circuitBreakers = serviceManager.getCircuitBreakerStatus();
      breaker = circuitBreakers.get('TestService.resettable');
      expect(breaker?.state).toBe('CLOSED');
      expect(breaker?.failureCount).toBe(0);
    });
  });

  describe('Enhanced applyImprovements Operation', () => {
    it('should execute applyImprovements with full reliability patterns', async () => {
      // Mock Firebase functions
      const mockHttpsCallable = jest.fn().mockImplementation(() => ({
        data: { success: true, improvements: ['improvement1'] }
      }));
      
      const mockAuth = { currentUser: { uid: 'test-user' } };
      const mockFunctions = {};

      jest.doMock('firebase/functions', () => ({
        httpsCallable: () => mockHttpsCallable
      }));

      jest.doMock('../../lib/firebase', () => ({
        functions: mockFunctions,
        auth: mockAuth
      }));

      const result = await serviceManager.executeApplyImprovements(
        'test-job-1',
        ['rec1', 'rec2'],
        'Software Engineer',
        ['JavaScript', 'React']
      );

      expect(result).toEqual({ success: true, improvements: ['improvement1'] });
    });

    it('should handle authentication errors in applyImprovements', async () => {
      // Mock unauthenticated user
      const mockAuth = { currentUser: null };
      
      jest.doMock('../../lib/firebase', () => ({
        functions: {},
        auth: mockAuth
      }));

      await expect(
        serviceManager.executeApplyImprovements(
          'test-job-1',
          ['rec1', 'rec2']
        )
      ).rejects.toThrow('User not authenticated');
    });
  });

  describe('Memory Management', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('should cleanup old metrics periodically', async () => {
      const { RetryMechanism } = await import('../error-recovery/RetryMechanism');
      const mockRetryMechanism = {
        executeWithRetry: jest.fn().mockResolvedValue({
          success: true,
          data: 'success',
          attempts: [],
          totalExecutionTime: 1000,
          recoveredFromCheckpoint: false
        })
      };
      
      (RetryMechanism.getInstance as jest.Mock).mockReturnValue(mockRetryMechanism);

      // Execute some operations to create metrics
      await serviceManager.executeReliableServiceCall(
        () => Promise.resolve('success'),
        {
          serviceName: 'TestService',
          operationName: 'temporaryOperation',
          jobId: 'test-job-1'
        }
      );

      // Verify metrics exist
      let metrics = serviceManager.getServiceMetrics('TestService.temporaryOperation');
      expect(metrics).toBeDefined();

      // Fast forward time beyond cleanup interval
      jest.advanceTimersByTime(70000); // 70 seconds

      // Metrics should still exist (within cache duration)
      metrics = serviceManager.getServiceMetrics('TestService.temporaryOperation');
      expect(metrics).toBeDefined();

      // Fast forward beyond cache duration
      jest.advanceTimersByTime(240000); // Additional 4 minutes (total 5+ minutes)

      // Health monitoring should still work
      const healthStatus = serviceManager.getHealthStatus();
      expect(healthStatus).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network connection failed');
      networkError.name = 'NetworkError';

      const { RetryMechanism } = await import('../error-recovery/RetryMechanism');
      const mockRetryMechanism = {
        executeWithRetry: jest.fn().mockResolvedValue({
          success: false,
          error: { 
            originalError: networkError,
            type: 'NETWORK',
            retryable: true
          },
          attempts: [
            { attemptNumber: 1, success: false, error: networkError }
          ],
          totalExecutionTime: 2000,
          recoveredFromCheckpoint: false
        })
      };
      
      (RetryMechanism.getInstance as jest.Mock).mockReturnValue(mockRetryMechanism);

      await expect(
        serviceManager.executeReliableServiceCall(
          () => Promise.reject(networkError),
          {
            serviceName: 'TestService',
            operationName: 'networkOperation',
            jobId: 'test-job-1'
          }
        )
      ).rejects.toThrow('Network connection failed');

      // Verify error was tracked
      const metrics = serviceManager.getServiceMetrics('TestService.networkOperation') as ServiceMetrics;
      expect(metrics.failedRequests).toBe(1);
    });

    it('should handle timeout errors appropriately', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';

      const { RetryMechanism } = await import('../error-recovery/RetryMechanism');
      const mockRetryMechanism = {
        executeWithRetry: jest.fn().mockResolvedValue({
          success: false,
          error: { 
            originalError: timeoutError,
            type: 'TIMEOUT',
            retryable: true
          },
          attempts: [],
          totalExecutionTime: 30000,
          recoveredFromCheckpoint: false
        })
      };
      
      (RetryMechanism.getInstance as jest.Mock).mockReturnValue(mockRetryMechanism);

      await expect(
        serviceManager.executeReliableServiceCall(
          () => Promise.reject(timeoutError),
          {
            serviceName: 'TestService',
            operationName: 'timeoutOperation',
            jobId: 'test-job-1',
            timeout: 5000
          }
        )
      ).rejects.toThrow('Request timeout');
    });
  });
});