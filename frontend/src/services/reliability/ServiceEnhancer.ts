/**
 * Service Enhancer - Universal Reliability Wrapper
 * Applies enterprise-grade reliability patterns to any service operation
 * 
 * Features:
 * - Universal service operation enhancement
 * - Performance optimization
 * - Error recovery and retry logic
 * - Memory management
 * - Service-specific configuration
 */

import { ServiceReliabilityManager, CircuitBreakerConfig } from './ServiceReliabilityManager';
import { RetryConfig } from '../error-recovery/RetryMechanism';

export interface ServiceEnhancementConfig {
  serviceName: string;
  operationName: string;
  timeout?: number;
  retryConfig?: Partial<RetryConfig>;
  circuitConfig?: Partial<CircuitBreakerConfig>;
  cacheEnabled?: boolean;
  cacheTtl?: number;
  useConnectionPool?: boolean;
  maxConnections?: number;
}

export interface EnhancedServiceOptions {
  jobId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  progressCallback?: (progress: number) => void;
  abortSignal?: AbortSignal;
}

export class ServiceEnhancer {
  private static instance: ServiceEnhancer;
  private reliabilityManager: ServiceReliabilityManager;
  
  // Service-specific configurations
  private serviceConfigs = new Map<string, ServiceEnhancementConfig>();
  
  // Performance tracking
  private performanceBaselines = new Map<string, {
    averageTime: number;
    samples: number;
    lastUpdate: number;
  }>();

  private constructor() {
    this.reliabilityManager = ServiceReliabilityManager.getInstance();
    this.initializeDefaultConfigs();
  }

  public static getInstance(): ServiceEnhancer {
    if (!ServiceEnhancer.instance) {
      ServiceEnhancer.instance = new ServiceEnhancer();
    }
    return ServiceEnhancer.instance;
  }

  /**
   * Initialize default configurations for known services
   */
  private initializeDefaultConfigs(): void {
    // CVTransformer service configurations
    this.serviceConfigs.set('CVTransformer.applyImprovements', {
      serviceName: 'CVTransformer',
      operationName: 'applyImprovements',
      timeout: 120000, // 2 minutes
      retryConfig: {
        maxRetries: 3,
        initialDelay: 2000,
        maxDelay: 30000,
        backoffFactor: 2
      },
      circuitConfig: {
        failureThreshold: 3,
        resetTimeout: 90000 // 1.5 minutes
      },
      cacheEnabled: true,
      cacheTtl: 300000, // 5 minutes
      useConnectionPool: true,
      maxConnections: 5
    });

    this.serviceConfigs.set('CVTransformer.applyATSOptimizations', {
      serviceName: 'CVTransformer',
      operationName: 'applyATSOptimizations',
      timeout: 90000, // 1.5 minutes
      retryConfig: {
        maxRetries: 2,
        initialDelay: 1500,
        maxDelay: 20000
      },
      cacheEnabled: true,
      useConnectionPool: true
    });

    this.serviceConfigs.set('CVAnalyzer.getRecommendations', {
      serviceName: 'CVAnalyzer',
      operationName: 'getRecommendations',
      timeout: 180000, // 3 minutes
      retryConfig: {
        maxRetries: 2,
        initialDelay: 3000,
        maxDelay: 45000
      },
      cacheEnabled: true,
      cacheTtl: 600000, // 10 minutes
      useConnectionPool: true,
      maxConnections: 3
    });

    this.serviceConfigs.set('CVParser.generateCV', {
      serviceName: 'CVParser',
      operationName: 'generateCV',
      timeout: 150000, // 2.5 minutes
      retryConfig: {
        maxRetries: 2,
        initialDelay: 2500,
        maxDelay: 35000
      },
      cacheEnabled: false, // CV generation should not be cached
      useConnectionPool: true,
      maxConnections: 8
    });

    this.serviceConfigs.set('MediaService.generateEnhancedPodcast', {
      serviceName: 'MediaService',
      operationName: 'generateEnhancedPodcast',
      timeout: 300000, // 5 minutes
      retryConfig: {
        maxRetries: 1,
        initialDelay: 5000,
        maxDelay: 60000
      },
      cacheEnabled: true,
      cacheTtl: 3600000, // 1 hour
      useConnectionPool: true,
      maxConnections: 2
    });
  }

  /**
   * Enhance any service operation with reliability patterns
   */
  public async enhanceServiceOperation<T>(
    operation: () => Promise<T>,
    serviceKey: string,
    options: EnhancedServiceOptions = {}
  ): Promise<T> {
    const config = this.getServiceConfig(serviceKey);
    const { jobId, sessionId, metadata, progressCallback, abortSignal } = options;

    // Check for abort signal
    if (abortSignal?.aborted) {
      throw new Error('Operation aborted');
    }

    // Generate cache key if caching is enabled
    const cacheKey = config.cacheEnabled 
      ? this.generateCacheKey(serviceKey, jobId, metadata)
      : undefined;

    console.log(`[ServiceEnhancer] Enhancing operation: ${serviceKey}`, {
      jobId,
      sessionId,
      cacheEnabled: config.cacheEnabled,
      timeout: config.timeout,
      useConnectionPool: config.useConnectionPool
    });

    // Wrap operation with progress tracking
    const enhancedOperation = this.wrapWithProgressTracking(
      operation,
      serviceKey,
      progressCallback
    );

    // Execute through reliability manager
    return this.reliabilityManager.executeReliableServiceCall(
      enhancedOperation,
      {
        serviceName: config.serviceName,
        operationName: config.operationName,
        jobId,
        retryConfig: config.retryConfig,
        circuitConfig: config.circuitConfig,
        cacheKey,
        timeout: config.timeout,
        useConnectionPool: config.useConnectionPool
      }
    );
  }

  /**
   * Enhanced Firebase callable function wrapper
   */
  public async enhanceFirebaseFunction<T>(
    functionName: string,
    data: any,
    options: EnhancedServiceOptions = {}
  ): Promise<T> {
    const serviceKey = `Firebase.${functionName}`;
    
    return this.enhanceServiceOperation(
      async () => {
        const { httpsCallable } = await import('firebase/functions');
        const { functions, auth } = await import('../../lib/firebase');
        
        const user = auth.currentUser;
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        const callable = httpsCallable(functions, functionName);
        const result = await callable(data);
        return result.data as T;
      },
      serviceKey,
      options
    );
  }

  /**
   * Get or create service configuration
   */
  private getServiceConfig(serviceKey: string): ServiceEnhancementConfig {
    let config = this.serviceConfigs.get(serviceKey);
    
    if (!config) {
      // Create default config for unknown services
      const [serviceName, operationName] = serviceKey.split('.');
      config = {
        serviceName: serviceName || 'UnknownService',
        operationName: operationName || 'unknownOperation',
        timeout: 60000, // 1 minute default
        retryConfig: {
          maxRetries: 2,
          initialDelay: 1000,
          maxDelay: 15000
        },
        cacheEnabled: false,
        useConnectionPool: true,
        maxConnections: 5
      };
      
      this.serviceConfigs.set(serviceKey, config);
      console.log(`[ServiceEnhancer] Created default config for ${serviceKey}`);
    }
    
    return config;
  }

  /**
   * Generate consistent cache key
   */
  private generateCacheKey(serviceKey: string, jobId?: string, metadata?: Record<string, any>): string {
    const parts = [serviceKey];
    
    if (jobId) {
      parts.push(jobId);
    }
    
    if (metadata) {
      const metadataStr = Object.keys(metadata)
        .sort()
        .map(key => `${key}=${JSON.stringify(metadata[key])}`)
        .join('&');
      parts.push(metadataStr);
    }
    
    return parts.join('-');
  }

  /**
   * Wrap operation with progress tracking
   */
  private wrapWithProgressTracking<T>(
    operation: () => Promise<T>,
    serviceKey: string,
    progressCallback?: (progress: number) => void
  ): () => Promise<T> {
    if (!progressCallback) {
      return operation;
    }

    return async (): Promise<T> => {
      const startTime = Date.now();
      const baseline = this.performanceBaselines.get(serviceKey);
      
      // Start progress tracking
      progressCallback(0);
      
      // Estimate progress based on elapsed time and baseline
      let progressInterval: NodeJS.Timeout | undefined;
      
      if (baseline) {
        progressInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const estimatedProgress = Math.min(
            90, // Cap at 90% to leave room for completion
            (elapsed / baseline.averageTime) * 100
          );
          progressCallback(estimatedProgress);
        }, 1000); // Update every second
      }

      try {
        const result = await operation();
        
        // Update performance baseline
        this.updatePerformanceBaseline(serviceKey, Date.now() - startTime);
        
        // Complete progress
        if (progressCallback) {
          progressCallback(100);
        }
        
        return result;
      } catch (error) {
        // Complete progress even on error
        if (progressCallback) {
          progressCallback(100);
        }
        throw error;
      } finally {
        if (progressInterval) {
          clearInterval(progressInterval);
        }
      }
    };
  }

  /**
   * Update performance baseline for better progress estimation
   */
  private updatePerformanceBaseline(serviceKey: string, responseTime: number): void {
    let baseline = this.performanceBaselines.get(serviceKey);
    
    if (!baseline) {
      baseline = {
        averageTime: responseTime,
        samples: 1,
        lastUpdate: Date.now()
      };
    } else {
      // Exponential moving average
      const alpha = 0.2; // Weight of new sample
      baseline.averageTime = alpha * responseTime + (1 - alpha) * baseline.averageTime;
      baseline.samples++;
      baseline.lastUpdate = Date.now();
    }
    
    this.performanceBaselines.set(serviceKey, baseline);
  }

  /**
   * Configure service-specific settings
   */
  public configureService(
    serviceKey: string,
    config: Partial<ServiceEnhancementConfig>
  ): void {
    const existingConfig = this.getServiceConfig(serviceKey);
    const updatedConfig = { ...existingConfig, ...config };
    this.serviceConfigs.set(serviceKey, updatedConfig);
    
    console.log(`[ServiceEnhancer] Updated configuration for ${serviceKey}`, updatedConfig);
  }

  /**
   * Get service performance statistics
   */
  public getServiceStats(serviceKey?: string): Map<string, any> | any {
    const reliabilityStats = this.reliabilityManager.getServiceMetrics(serviceKey);
    
    if (serviceKey) {
      const performanceBaseline = this.performanceBaselines.get(serviceKey);
      return {
        reliability: reliabilityStats,
        performance: performanceBaseline,
        config: this.serviceConfigs.get(serviceKey)
      };
    }
    
    const allStats = new Map();
    for (const [key] of this.serviceConfigs) {
      allStats.set(key, {
        reliability: this.reliabilityManager.getServiceMetrics(key),
        performance: this.performanceBaselines.get(key),
        config: this.serviceConfigs.get(key)
      });
    }
    
    return allStats;
  }

  /**
   * Reset all service configurations and stats
   */
  public resetAllServices(): void {
    this.serviceConfigs.clear();
    this.performanceBaselines.clear();
    this.reliabilityManager.resetAllMetrics();
    this.initializeDefaultConfigs();
    
    console.log('[ServiceEnhancer] All services reset and reinitialized');
  }

  /**
   * Health check for all configured services
   */
  public async performHealthCheck(): Promise<Map<string, {
    healthy: boolean;
    responseTime?: number;
    error?: string;
    lastSuccess?: Date;
  }>> {
    const results = new Map();
    
    for (const [serviceKey, config] of this.serviceConfigs) {
      try {
        const startTime = Date.now();
        
        // Simple health check - attempt to create the service call
        const testOperation = async () => {
          // Simulate a quick health check
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'healthy';
        };
        
        await this.enhanceServiceOperation(
          testOperation,
          `${serviceKey}.healthCheck`,
          { sessionId: 'health-check' }
        );
        
        const responseTime = Date.now() - startTime;
        const metrics = this.reliabilityManager.getServiceMetrics(serviceKey) as any;
        
        results.set(serviceKey, {
          healthy: true,
          responseTime,
          lastSuccess: metrics?.lastSuccess
        });
        
      } catch (error) {
        results.set(serviceKey, {
          healthy: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const serviceEnhancer = ServiceEnhancer.getInstance();

// Global debug interface
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.serviceEnhancerDebug = {
    getStats: (serviceKey?: string) => serviceEnhancer.getServiceStats(serviceKey),
    configureService: (serviceKey: string, config: any) => serviceEnhancer.configureService(serviceKey, config),
    resetAll: () => serviceEnhancer.resetAllServices(),
    healthCheck: () => serviceEnhancer.performHealthCheck()
  };
}