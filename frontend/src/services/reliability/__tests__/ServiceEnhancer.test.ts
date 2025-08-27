/**
 * Service Enhancer Tests
 * Test suite for universal service operation enhancement
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { ServiceEnhancer } from '../ServiceEnhancer';

// Mock dependencies
jest.mock('../ServiceReliabilityManager');

describe('ServiceEnhancer', () => {
  let serviceEnhancer: ServiceEnhancer;

  beforeEach(() => {
    serviceEnhancer = ServiceEnhancer.getInstance();
    serviceEnhancer.resetAllServices();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should be a singleton', () => {
      const instance1 = ServiceEnhancer.getInstance();
      const instance2 = ServiceEnhancer.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with default service configurations', () => {
      const stats = serviceEnhancer.getServiceStats();
      expect(stats).toBeDefined();
      expect(stats instanceof Map).toBe(true);
    });
  });

  describe('Service Operation Enhancement', () => {
    it('should enhance service operations with reliability patterns', async () => {
      const mockOperation = jest.fn().mockResolvedValue('enhanced-result');
      
      // Mock ServiceReliabilityManager
      const { ServiceReliabilityManager } = await import('../ServiceReliabilityManager');
      const mockReliabilityManager = {
        executeReliableServiceCall: jest.fn().mockResolvedValue('enhanced-result')
      };
      (ServiceReliabilityManager.getInstance as jest.Mock).mockReturnValue(mockReliabilityManager);

      const result = await serviceEnhancer.enhanceServiceOperation(
        mockOperation,
        'TestService.testOperation',
        {
          jobId: 'test-job-1',
          sessionId: 'test-session-1'
        }
      );

      expect(result).toBe('enhanced-result');
      expect(mockReliabilityManager.executeReliableServiceCall).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          serviceName: 'TestService',
          operationName: 'testOperation',
          jobId: 'test-job-1'
        })
      );
    });

    it('should handle abort signals', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');
      const abortController = new AbortController();
      abortController.abort();

      await expect(
        serviceEnhancer.enhanceServiceOperation(
          mockOperation,
          'TestService.abortTest',
          {
            abortSignal: abortController.signal
          }
        )
      ).rejects.toThrow('Operation aborted');

      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should handle progress tracking', async () => {
      const mockOperation = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('result'), 100))
      );
      
      const progressUpdates: number[] = [];
      const progressCallback = (progress: number) => {
        progressUpdates.push(progress);
      };

      const { ServiceReliabilityManager } = await import('../ServiceReliabilityManager');
      const mockReliabilityManager = {
        executeReliableServiceCall: jest.fn().mockImplementation(async (operation) => {
          return await operation();
        })
      };
      (ServiceReliabilityManager.getInstance as jest.Mock).mockReturnValue(mockReliabilityManager);

      const result = await serviceEnhancer.enhanceServiceOperation(
        mockOperation,
        'TestService.progressTest',
        {
          progressCallback
        }
      );

      expect(result).toBe('result');
      expect(progressUpdates).toContain(0); // Start
      expect(progressUpdates).toContain(100); // Complete
      expect(progressUpdates.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Firebase Function Enhancement', () => {
    it('should enhance Firebase callable functions', async () => {
      // Mock Firebase imports
      const mockCallableFunction = jest.fn().mockResolvedValue({ data: 'firebase-result' });
      const mockHttpsCallable = jest.fn().mockReturnValue(mockCallableFunction);
      const mockAuth = { currentUser: { uid: 'test-user' } };
      const mockFunctions = {};

      jest.doMock('firebase/functions', () => ({
        httpsCallable: mockHttpsCallable
      }));

      jest.doMock('../../lib/firebase', () => ({
        functions: mockFunctions,
        auth: mockAuth
      }));

      const { ServiceReliabilityManager } = await import('../ServiceReliabilityManager');
      const mockReliabilityManager = {
        executeReliableServiceCall: jest.fn().mockImplementation(async (operation) => {
          return await operation();
        })
      };
      (ServiceReliabilityManager.getInstance as jest.Mock).mockReturnValue(mockReliabilityManager);

      const result = await serviceEnhancer.enhanceFirebaseFunction(
        'testFunction',
        { input: 'test-data' },
        {
          jobId: 'test-job-1',
          progressCallback: jest.fn()
        }
      );

      expect(result).toBe('firebase-result');
      expect(mockHttpsCallable).toHaveBeenCalledWith(mockFunctions, 'testFunction');
      expect(mockCallableFunction).toHaveBeenCalledWith({ input: 'test-data' });
    });

    it('should handle authentication errors in Firebase functions', async () => {
      const mockAuth = { currentUser: null };

      jest.doMock('../../lib/firebase', () => ({
        functions: {},
        auth: mockAuth
      }));

      const { ServiceReliabilityManager } = await import('../ServiceReliabilityManager');
      const mockReliabilityManager = {
        executeReliableServiceCall: jest.fn().mockImplementation(async (operation) => {
          return await operation();
        })
      };
      (ServiceReliabilityManager.getInstance as jest.Mock).mockReturnValue(mockReliabilityManager);

      await expect(
        serviceEnhancer.enhanceFirebaseFunction(
          'testFunction',
          { input: 'test-data' }
        )
      ).rejects.toThrow('User not authenticated');
    });
  });

  describe('Service Configuration', () => {
    it('should allow service configuration updates', () => {
      serviceEnhancer.configureService('CustomService.customOperation', {
        timeout: 45000,
        retryConfig: {
          maxRetries: 5
        },
        cacheEnabled: false
      });

      const stats = serviceEnhancer.getServiceStats('CustomService.customOperation');
      expect(stats.config.timeout).toBe(45000);
      expect(stats.config.retryConfig.maxRetries).toBe(5);
      expect(stats.config.cacheEnabled).toBe(false);
    });

    it('should create default configurations for unknown services', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');
      
      const { ServiceReliabilityManager } = await import('../ServiceReliabilityManager');
      const mockReliabilityManager = {
        executeReliableServiceCall: jest.fn().mockResolvedValue('result')
      };
      (ServiceReliabilityManager.getInstance as jest.Mock).mockReturnValue(mockReliabilityManager);

      await serviceEnhancer.enhanceServiceOperation(
        mockOperation,
        'UnknownService.unknownOperation'
      );

      const stats = serviceEnhancer.getServiceStats('UnknownService.unknownOperation');
      expect(stats.config).toBeDefined();
      expect(stats.config.serviceName).toBe('UnknownService');
      expect(stats.config.operationName).toBe('unknownOperation');
      expect(stats.config.timeout).toBe(60000); // Default timeout
    });
  });

  describe('Performance Baseline Management', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('should update performance baselines', async () => {
      const mockOperation = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('result'), 500))
      );

      const { ServiceReliabilityManager } = await import('../ServiceReliabilityManager');
      const mockReliabilityManager = {
        executeReliableServiceCall: jest.fn().mockImplementation(async (operation) => {
          const startTime = Date.now();
          const result = await operation();
          // Simulate processing time
          jest.advanceTimersByTime(500);
          return result;
        })
      };
      (ServiceReliabilityManager.getInstance as jest.Mock).mockReturnValue(mockReliabilityManager);

      // Execute operation to establish baseline
      await serviceEnhancer.enhanceServiceOperation(
        mockOperation,
        'BaselineService.baselineOperation'
      );

      const stats = serviceEnhancer.getServiceStats('BaselineService.baselineOperation');
      expect(stats.performance).toBeDefined();
      expect(stats.performance.samples).toBe(1);
    });

    it('should use baselines for progress estimation', async () => {
      // First execution to establish baseline
      const quickOperation = jest.fn().mockResolvedValue('quick-result');
      
      const { ServiceReliabilityManager } = await import('../ServiceReliabilityManager');
      const mockReliabilityManager = {
        executeReliableServiceCall: jest.fn().mockImplementation(async (operation) => {
          return await operation();
        })
      };
      (ServiceReliabilityManager.getInstance as jest.Mock).mockReturnValue(mockReliabilityManager);

      await serviceEnhancer.enhanceServiceOperation(
        quickOperation,
        'ProgressService.progressOperation'
      );

      // Second execution with progress tracking
      const progressUpdates: number[] = [];
      const slowOperation = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('slow-result'), 1000))
      );

      mockReliabilityManager.executeReliableServiceCall = jest.fn().mockImplementation(async (operation) => {
        // Simulate progress updates during operation
        setTimeout(() => jest.advanceTimersByTime(500), 0);
        setTimeout(() => jest.advanceTimersByTime(500), 100);
        return await operation();
      });

      await serviceEnhancer.enhanceServiceOperation(
        slowOperation,
        'ProgressService.progressOperation',
        {
          progressCallback: (progress) => progressUpdates.push(progress)
        }
      );

      expect(progressUpdates.length).toBeGreaterThanOrEqual(2);
      expect(progressUpdates).toContain(0);
      expect(progressUpdates).toContain(100);
    });
  });

  describe('Health Checking', () => {
    it('should perform health checks on configured services', async () => {
      // Configure some test services
      serviceEnhancer.configureService('HealthService1.operation1', {
        timeout: 30000
      });
      serviceEnhancer.configureService('HealthService2.operation2', {
        timeout: 45000
      });

      const { ServiceReliabilityManager } = await import('../ServiceReliabilityManager');
      const mockReliabilityManager = {
        executeReliableServiceCall: jest.fn().mockResolvedValue('healthy'),
        getServiceMetrics: jest.fn().mockReturnValue({ lastSuccess: new Date() })
      };
      (ServiceReliabilityManager.getInstance as jest.Mock).mockReturnValue(mockReliabilityManager);

      const healthResults = await serviceEnhancer.performHealthCheck();

      expect(healthResults.size).toBeGreaterThan(0);
      
      for (const [serviceKey, health] of healthResults) {
        expect(typeof health.healthy).toBe('boolean');
        if (health.healthy) {
          expect(typeof health.responseTime).toBe('number');
        } else {
          expect(typeof health.error).toBe('string');
        }
      }
    });

    it('should handle health check failures', async () => {
      serviceEnhancer.configureService('FailingService.failingOperation', {
        timeout: 1000
      });

      const { ServiceReliabilityManager } = await import('../ServiceReliabilityManager');
      const mockReliabilityManager = {
        executeReliableServiceCall: jest.fn().mockRejectedValue(new Error('Health check failed'))
      };
      (ServiceReliabilityManager.getInstance as jest.Mock).mockReturnValue(mockReliabilityManager);

      const healthResults = await serviceEnhancer.performHealthCheck();
      const failingServiceHealth = healthResults.get('FailingService.failingOperation');

      expect(failingServiceHealth).toBeDefined();
      expect(failingServiceHealth?.healthy).toBe(false);
      expect(failingServiceHealth?.error).toBe('Health check failed');
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys', async () => {
      const mockOperation = jest.fn().mockResolvedValue('cached-result');
      
      const { ServiceReliabilityManager } = await import('../ServiceReliabilityManager');
      const mockReliabilityManager = {
        executeReliableServiceCall: jest.fn().mockImplementation(async (operation, context) => {
          // Verify cache key is generated correctly
          expect(context.cacheKey).toBeDefined();
          return await operation();
        })
      };
      (ServiceReliabilityManager.getInstance as jest.Mock).mockReturnValue(mockReliabilityManager);

      // Configure service to use caching
      serviceEnhancer.configureService('CachedService.cachedOperation', {
        cacheEnabled: true,
        cacheTtl: 300000
      });

      await serviceEnhancer.enhanceServiceOperation(
        mockOperation,
        'CachedService.cachedOperation',
        {
          jobId: 'cache-job-1',
          metadata: { param1: 'value1', param2: 'value2' }
        }
      );

      expect(mockReliabilityManager.executeReliableServiceCall).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          cacheKey: expect.stringContaining('CachedService.cachedOperation')
        })
      );
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide comprehensive service statistics', async () => {
      const mockOperation = jest.fn().mockResolvedValue('stats-result');
      
      const { ServiceReliabilityManager } = await import('../ServiceReliabilityManager');
      const mockReliabilityManager = {
        executeReliableServiceCall: jest.fn().mockResolvedValue('stats-result'),
        getServiceMetrics: jest.fn().mockReturnValue({
          totalRequests: 5,
          successfulRequests: 4,
          failedRequests: 1,
          uptime: 0.8,
          errorRate: 0.2
        })
      };
      (ServiceReliabilityManager.getInstance as jest.Mock).mockReturnValue(mockReliabilityManager);

      // Execute some operations
      await serviceEnhancer.enhanceServiceOperation(
        mockOperation,
        'StatsService.statsOperation'
      );

      const stats = serviceEnhancer.getServiceStats('StatsService.statsOperation');
      expect(stats).toBeDefined();
      expect(stats.reliability).toBeDefined();
      expect(stats.config).toBeDefined();
    });

    it('should provide all service stats when no specific service requested', () => {
      const allStats = serviceEnhancer.getServiceStats();
      expect(allStats instanceof Map).toBe(true);
    });
  });

  describe('Service Reset Functionality', () => {
    it('should reset all services and reinitialize defaults', async () => {
      // Configure custom service
      serviceEnhancer.configureService('CustomService.operation', {
        timeout: 99999
      });

      let stats = serviceEnhancer.getServiceStats('CustomService.operation');
      expect(stats.config.timeout).toBe(99999);

      // Reset all services
      serviceEnhancer.resetAllServices();

      // Verify default configurations are restored
      const { ServiceReliabilityManager } = await import('../ServiceReliabilityManager');
      const mockReliabilityManager = {
        resetAllMetrics: jest.fn()
      };
      (ServiceReliabilityManager.getInstance as jest.Mock).mockReturnValue(mockReliabilityManager);

      expect(mockReliabilityManager.resetAllMetrics).toHaveBeenCalled();
    });
  });

  describe('Default Service Configurations', () => {
    it('should have appropriate default configurations for known services', () => {
      const cvTransformerStats = serviceEnhancer.getServiceStats('CVTransformer.applyImprovements');
      expect(cvTransformerStats.config).toBeDefined();
      expect(cvTransformerStats.config.timeout).toBe(120000); // 2 minutes
      expect(cvTransformerStats.config.cacheEnabled).toBe(true);
      expect(cvTransformerStats.config.useConnectionPool).toBe(true);

      const cvAnalyzerStats = serviceEnhancer.getServiceStats('CVAnalyzer.getRecommendations');
      expect(cvAnalyzerStats.config).toBeDefined();
      expect(cvAnalyzerStats.config.timeout).toBe(180000); // 3 minutes
      expect(cvAnalyzerStats.config.cacheTtl).toBe(600000); // 10 minutes

      const mediaServiceStats = serviceEnhancer.getServiceStats('MediaService.generateEnhancedPodcast');
      expect(mediaServiceStats.config).toBeDefined();
      expect(mediaServiceStats.config.timeout).toBe(300000); // 5 minutes
      expect(mediaServiceStats.config.maxConnections).toBe(2); // Limited for resource-intensive operations
    });
  });
});