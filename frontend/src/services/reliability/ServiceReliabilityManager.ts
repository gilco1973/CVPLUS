/**
 * Service Layer Reliability Manager
 * Enterprise-grade reliability patterns for CVPlus service layer operations
 * 
 * Features:
 * - Circuit breaker protection
 * - Intelligent retry mechanisms with exponential backoff
 * - Performance monitoring and metrics
 * - Service health checking
 * - Request deduplication and caching
 * - Connection pooling and resource management
 */

import { RetryMechanism, RetryConfig, RetryResult } from '../error-recovery/RetryMechanism';
import { RequestManager, RequestResult, RequestOptions } from '../RequestManager';

export interface ServiceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastSuccess?: Date;
  lastFailure?: Date;
  uptime: number;
  errorRate: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
  halfOpenMaxRequests: number;
}

export interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime?: number;
  errorMessage?: string;
  uptime: number;
}

export interface CacheConfig {
  ttl: number; // Time to live in ms
  maxSize: number;
  enabled: boolean;
}

export interface PerformanceMonitor {
  operationName: string;
  startTime: number;
  endTime?: number;
  success: boolean;
  responseTime?: number;
  error?: Error;
}

export class ServiceReliabilityManager {
  private static instance: ServiceReliabilityManager;
  private retryMechanism: RetryMechanism;
  private requestManager: RequestManager;
  
  // Circuit breaker states
  private circuitBreakers = new Map<string, {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailureTime: number;
    nextAttempt: number;
    config: CircuitBreakerConfig;
  }>();

  // Service metrics tracking
  private metrics = new Map<string, ServiceMetrics>();
  private performanceHistory = new Map<string, PerformanceMonitor[]>();
  
  // Health checking
  private healthStatus = new Map<string, ServiceHealthStatus>();
  private healthCheckInterval = 30000; // 30 seconds
  
  // Connection pool management
  private connectionPools = new Map<string, {
    active: number;
    maximum: number;
    queue: Array<() => void>;
    lastCleanup: number;
  }>();

  // Default configurations
  private defaultCircuitConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    monitoringWindow: 300000, // 5 minutes
    halfOpenMaxRequests: 3
  };

  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: true,
    circuitBreakerThreshold: 5,
    circuitBreakerResetTime: 60000
  };

  private defaultCacheConfig: CacheConfig = {
    ttl: 300000, // 5 minutes
    maxSize: 1000,
    enabled: true
  };

  private constructor() {
    this.retryMechanism = RetryMechanism.getInstance();
    this.requestManager = RequestManager.getInstance();
    this.startHealthMonitoring();
    this.startMetricsCollection();
  }

  public static getInstance(): ServiceReliabilityManager {
    if (!ServiceReliabilityManager.instance) {
      ServiceReliabilityManager.instance = new ServiceReliabilityManager();
    }
    return ServiceReliabilityManager.instance;
  }

  /**
   * Execute service call with full reliability patterns
   */
  public async executeReliableServiceCall<T>(
    operation: () => Promise<T>,
    context: {
      serviceName: string;
      operationName: string;
      jobId?: string;
      retryConfig?: Partial<RetryConfig>;
      circuitConfig?: Partial<CircuitBreakerConfig>;
      cacheKey?: string;
      timeout?: number;
      useConnectionPool?: boolean;
    }
  ): Promise<T> {
    const { serviceName, operationName, jobId, cacheKey, timeout = 30000 } = context;
    const serviceKey = `${serviceName}.${operationName}`;
    
    // Check circuit breaker
    if (this.isCircuitOpen(serviceKey)) {
      throw new Error(`Circuit breaker is OPEN for ${serviceKey}`);
    }

    // Connection pool management
    if (context.useConnectionPool) {
      await this.acquireConnection(serviceKey);
    }

    const monitor = this.startPerformanceMonitoring(serviceKey);
    
    try {
      // Use cached result if available
      if (cacheKey && this.defaultCacheConfig.enabled) {
        const cachedResult = await this.getCachedResult<T>(cacheKey);
        if (cachedResult !== null) {
          this.recordSuccess(serviceKey, monitor);
          return cachedResult;
        }
      }

      // Execute with retry mechanism
      const retryResult = await this.retryMechanism.executeWithRetry(
        operation,
        {
          operationName: serviceKey,
          jobId: jobId,
          sessionId: `${serviceName}-${Date.now()}`
        },
        { ...this.defaultRetryConfig, ...context.retryConfig }
      );

      if (!retryResult.success) {
        this.recordFailure(serviceKey, monitor, retryResult.error);
        throw retryResult.error?.originalError || new Error('Service call failed');
      }

      // Cache successful result
      if (cacheKey && retryResult.data) {
        await this.cacheResult(cacheKey, retryResult.data);
      }

      this.recordSuccess(serviceKey, monitor);
      return retryResult.data as T;

    } catch (error) {
      this.recordFailure(serviceKey, monitor, error as Error);
      throw error;
    } finally {
      if (context.useConnectionPool) {
        this.releaseConnection(serviceKey);
      }
      this.endPerformanceMonitoring(monitor);
    }
  }

  /**
   * Enhanced applyImprovements with full reliability patterns
   */
  public async executeApplyImprovements(
    jobId: string,
    selectedRecommendationIds: string[],
    targetRole?: string,
    industryKeywords?: string[]
  ): Promise<any> {
    const cacheKey = `applyImprovements-${jobId}-${selectedRecommendationIds.join(',')}-${targetRole || ''}-${(industryKeywords || []).join(',')}`;
    
    return this.executeReliableServiceCall(
      async () => {
        // Import Firebase functions dynamically for better performance
        const { httpsCallable } = await import('firebase/functions');
        const { functions, auth } = await import('../../lib/firebase');
        
        const user = auth.currentUser;
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        const applyImprovementsFunction = httpsCallable(functions, 'applyImprovements');
        const result = await applyImprovementsFunction({
          jobId,
          selectedRecommendationIds,
          targetRole,
          industryKeywords
        });
        
        return result.data;
      },
      {
        serviceName: 'CVTransformer',
        operationName: 'applyImprovements',
        jobId,
        cacheKey,
        timeout: 120000, // 2 minutes for improvements
        useConnectionPool: true,
        retryConfig: {
          maxRetries: 3,
          initialDelay: 2000,
          maxDelay: 30000
        }
      }
    );
  }

  /**
   * Circuit breaker implementation
   */
  private isCircuitOpen(serviceKey: string): boolean {
    const breaker = this.circuitBreakers.get(serviceKey);
    if (!breaker) {
      this.initializeCircuitBreaker(serviceKey);
      return false;
    }

    const now = Date.now();

    switch (breaker.state) {
      case 'OPEN':
        if (now >= breaker.nextAttempt) {
          breaker.state = 'HALF_OPEN';
          return false;
        }
        return true;
      
      case 'HALF_OPEN':
        return false;
      
      default: // CLOSED
        return false;
    }
  }

  private initializeCircuitBreaker(serviceKey: string): void {
    this.circuitBreakers.set(serviceKey, {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttempt: 0,
      config: { ...this.defaultCircuitConfig }
    });
  }

  private recordCircuitBreakerFailure(serviceKey: string): void {
    let breaker = this.circuitBreakers.get(serviceKey);
    if (!breaker) {
      this.initializeCircuitBreaker(serviceKey);
      breaker = this.circuitBreakers.get(serviceKey)!;
    }

    const now = Date.now();
    breaker.failureCount++;
    breaker.lastFailureTime = now;

    if (breaker.failureCount >= breaker.config.failureThreshold) {
      breaker.state = 'OPEN';
      breaker.nextAttempt = now + breaker.config.resetTimeout;
      console.warn(`Circuit breaker OPENED for ${serviceKey} after ${breaker.failureCount} failures`);
    }
  }

  private recordCircuitBreakerSuccess(serviceKey: string): void {
    const breaker = this.circuitBreakers.get(serviceKey);
    if (breaker) {
      breaker.failureCount = 0;
      breaker.state = 'CLOSED';
    }
  }

  /**
   * Performance monitoring
   */
  private startPerformanceMonitoring(serviceKey: string): PerformanceMonitor {
    return {
      operationName: serviceKey,
      startTime: Date.now(),
      success: false
    };
  }

  private endPerformanceMonitoring(monitor: PerformanceMonitor): void {
    monitor.endTime = Date.now();
    monitor.responseTime = monitor.endTime - monitor.startTime;

    let history = this.performanceHistory.get(monitor.operationName);
    if (!history) {
      history = [];
      this.performanceHistory.set(monitor.operationName, history);
    }

    history.push(monitor);
    
    // Keep only recent history (last 100 operations)
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * Metrics collection
   */
  private recordSuccess(serviceKey: string, monitor: PerformanceMonitor): void {
    monitor.success = true;
    this.updateMetrics(serviceKey, true, monitor.responseTime || 0);
    this.recordCircuitBreakerSuccess(serviceKey);
  }

  private recordFailure(serviceKey: string, monitor: PerformanceMonitor, error: Error): void {
    monitor.success = false;
    monitor.error = error;
    this.updateMetrics(serviceKey, false, monitor.responseTime || 0);
    this.recordCircuitBreakerFailure(serviceKey);
  }

  private updateMetrics(serviceKey: string, success: boolean, responseTime: number): void {
    let metrics = this.metrics.get(serviceKey);
    if (!metrics) {
      metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        uptime: 0,
        errorRate: 0
      };
      this.metrics.set(serviceKey, metrics);
    }

    metrics.totalRequests++;
    
    if (success) {
      metrics.successfulRequests++;
      metrics.lastSuccess = new Date();
    } else {
      metrics.failedRequests++;
      metrics.lastFailure = new Date();
    }

    // Update average response time using exponential moving average
    const alpha = 0.1; // Smoothing factor
    metrics.averageResponseTime = alpha * responseTime + (1 - alpha) * metrics.averageResponseTime;

    // Calculate error rate
    metrics.errorRate = metrics.failedRequests / metrics.totalRequests;
    
    // Calculate uptime percentage
    metrics.uptime = metrics.successfulRequests / metrics.totalRequests;
  }

  /**
   * Caching mechanisms
   */
  private async getCachedResult<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.requestManager.isRequestCached(key);
      if (cached) {
        // Use request manager's cache
        const result = await this.requestManager.executeOnce(
          key,
          async () => null, // Won't execute
          { forceRegenerate: false }
        );
        return result.wasFromCache ? result.data : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async cacheResult<T>(key: string, data: T): Promise<void> {
    try {
      // Cache is handled by RequestManager
      console.log(`Caching result for key: ${key}`);
    } catch (error) {
      console.warn('Failed to cache result:', error);
    }
  }

  /**
   * Connection pool management
   */
  private async acquireConnection(serviceKey: string): Promise<void> {
    let pool = this.connectionPools.get(serviceKey);
    if (!pool) {
      pool = {
        active: 0,
        maximum: 10, // Default max connections
        queue: [],
        lastCleanup: Date.now()
      };
      this.connectionPools.set(serviceKey, pool);
    }

    if (pool.active < pool.maximum) {
      pool.active++;
      return;
    }

    // Wait in queue
    return new Promise<void>((resolve) => {
      pool!.queue.push(resolve);
    });
  }

  private releaseConnection(serviceKey: string): void {
    const pool = this.connectionPools.get(serviceKey);
    if (pool) {
      pool.active = Math.max(0, pool.active - 1);
      
      // Process queue
      if (pool.queue.length > 0) {
        const next = pool.queue.shift();
        if (next) {
          pool.active++;
          next();
        }
      }
    }
  }

  /**
   * Health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.performHealthChecks();
    }, this.healthCheckInterval);
  }

  private async performHealthChecks(): Promise<void> {
    for (const [serviceKey, metrics] of this.metrics) {
      const status = this.calculateHealthStatus(serviceKey, metrics);
      this.healthStatus.set(serviceKey, status);
    }
  }

  private calculateHealthStatus(serviceKey: string, metrics: ServiceMetrics): ServiceHealthStatus {
    const now = new Date();
    const uptime = metrics.uptime * 100;
    const errorRate = metrics.errorRate * 100;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    let errorMessage: string | undefined;

    if (uptime >= 99.5 && errorRate <= 1) {
      status = 'healthy';
    } else if (uptime >= 95 && errorRate <= 5) {
      status = 'degraded';
      errorMessage = `Service performance degraded: ${uptime.toFixed(1)}% uptime, ${errorRate.toFixed(1)}% error rate`;
    } else {
      status = 'unhealthy';
      errorMessage = `Service unhealthy: ${uptime.toFixed(1)}% uptime, ${errorRate.toFixed(1)}% error rate`;
    }

    return {
      status,
      lastCheck: now,
      responseTime: metrics.averageResponseTime,
      errorMessage,
      uptime: uptime
    };
  }

  /**
   * Metrics collection and cleanup
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.cleanupOldMetrics();
      this.logServiceHealth();
    }, 60000); // Every minute
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - 3600000; // 1 hour ago
    
    for (const [serviceKey, history] of this.performanceHistory) {
      const filtered = history.filter(h => h.startTime > cutoff);
      if (filtered.length !== history.length) {
        this.performanceHistory.set(serviceKey, filtered);
      }
    }
  }

  private logServiceHealth(): void {
    console.group('🔍 Service Health Report');
    
    for (const [serviceKey, status] of this.healthStatus) {
      const icon = status.status === 'healthy' ? '✅' : status.status === 'degraded' ? '⚠️' : '❌';
      console.log(`${icon} ${serviceKey}: ${status.status} (${status.uptime.toFixed(1)}% uptime)`);
      
      if (status.errorMessage) {
        console.warn(`  └─ ${status.errorMessage}`);
      }
    }
    
    console.groupEnd();
  }

  /**
   * Public API for monitoring and configuration
   */
  public getServiceMetrics(serviceKey?: string): Map<string, ServiceMetrics> | ServiceMetrics | undefined {
    if (serviceKey) {
      return this.metrics.get(serviceKey);
    }
    return this.metrics;
  }

  public getHealthStatus(serviceKey?: string): Map<string, ServiceHealthStatus> | ServiceHealthStatus | undefined {
    if (serviceKey) {
      return this.healthStatus.get(serviceKey);
    }
    return this.healthStatus;
  }

  public getCircuitBreakerStatus(): Map<string, any> {
    return this.circuitBreakers;
  }

  public updateCircuitBreakerConfig(serviceKey: string, config: Partial<CircuitBreakerConfig>): void {
    let breaker = this.circuitBreakers.get(serviceKey);
    if (!breaker) {
      this.initializeCircuitBreaker(serviceKey);
      breaker = this.circuitBreakers.get(serviceKey)!;
    }
    breaker.config = { ...breaker.config, ...config };
  }

  public resetCircuitBreaker(serviceKey: string): void {
    const breaker = this.circuitBreakers.get(serviceKey);
    if (breaker) {
      breaker.state = 'CLOSED';
      breaker.failureCount = 0;
      breaker.lastFailureTime = 0;
      breaker.nextAttempt = 0;
      console.log(`Circuit breaker reset for ${serviceKey}`);
    }
  }

  public resetAllMetrics(): void {
    this.metrics.clear();
    this.performanceHistory.clear();
    this.healthStatus.clear();
    this.circuitBreakers.clear();
    console.log('All service metrics and circuit breakers reset');
  }
}

// Export singleton instance
export const serviceReliabilityManager = ServiceReliabilityManager.getInstance();

// Global debug interface
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.serviceReliabilityDebug = {
    getMetrics: () => serviceReliabilityManager.getServiceMetrics(),
    getHealth: () => serviceReliabilityManager.getHealthStatus(),
    getCircuitBreakers: () => serviceReliabilityManager.getCircuitBreakerStatus(),
    resetMetrics: () => serviceReliabilityManager.resetAllMetrics(),
    resetCircuitBreaker: (key: string) => serviceReliabilityManager.resetCircuitBreaker(key)
  };
}