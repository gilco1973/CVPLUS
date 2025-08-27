/**
 * Service Reliability Layer - Main Entry Point
 * Enterprise-grade reliability patterns for CVPlus service operations
 * 
 * Exports all reliability-related functionality:
 * - ServiceReliabilityManager: Core reliability patterns
 * - ServiceEnhancer: Universal service operation enhancement
 * - All related types and interfaces
 */

// Core reliability manager
export {
  ServiceReliabilityManager,
  serviceReliabilityManager,
  type ServiceMetrics,
  type CircuitBreakerConfig,
  type ServiceHealthStatus,
  type CacheConfig,
  type PerformanceMonitor
} from './ServiceReliabilityManager';

// Service enhancer for universal service operations
export {
  ServiceEnhancer,
  serviceEnhancer,
  type ServiceEnhancementConfig,
  type EnhancedServiceOptions
} from './ServiceEnhancer';

// Re-export related types from error recovery
export {
  type RetryConfig,
  type RetryResult,
  type RetryAttempt
} from '../error-recovery/RetryMechanism';

export {
  type RequestResult,
  type RequestOptions
} from '../RequestManager';

// Convenience functions for common operations
import { serviceEnhancer } from './ServiceEnhancer';
import { serviceReliabilityManager } from './ServiceReliabilityManager';

/**
 * Enhanced applyImprovements with full reliability patterns
 * Convenience function that wraps the most commonly used service operation
 */
export const enhancedApplyImprovements = (
  jobId: string,
  selectedRecommendationIds: string[],
  targetRole?: string,
  industryKeywords?: string[]
) => {
  return serviceReliabilityManager.executeApplyImprovements(
    jobId,
    selectedRecommendationIds,
    targetRole,
    industryKeywords
  );
};

/**
 * Enhanced Firebase function call with reliability patterns
 * Convenience function for Firebase callable functions
 */
export const enhancedFirebaseCall = <T>(
  functionName: string,
  data: any,
  options?: {
    jobId?: string;
    sessionId?: string;
    progressCallback?: (progress: number) => void;
    timeout?: number;
  }
) => {
  return serviceEnhancer.enhanceFirebaseFunction<T>(functionName, data, options);
};

/**
 * Enhanced service operation wrapper
 * Universal wrapper for any service operation
 */
export const enhancedServiceCall = <T>(
  operation: () => Promise<T>,
  serviceKey: string,
  options?: {
    jobId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
    progressCallback?: (progress: number) => void;
    abortSignal?: AbortSignal;
  }
) => {
  return serviceEnhancer.enhanceServiceOperation(operation, serviceKey, options);
};

/**
 * Service health dashboard
 * Get comprehensive health information for all services
 */
export const getServiceHealthDashboard = async () => {
  const reliabilityStats = serviceReliabilityManager.getServiceMetrics();
  const healthStatus = serviceReliabilityManager.getHealthStatus();
  const circuitBreakers = serviceReliabilityManager.getCircuitBreakerStatus();
  const enhancerStats = serviceEnhancer.getServiceStats();
  const healthCheck = await serviceEnhancer.performHealthCheck();

  return {
    reliability: Object.fromEntries(reliabilityStats as Map<string, any>),
    health: Object.fromEntries(healthStatus as Map<string, any>),
    circuits: Object.fromEntries(circuitBreakers),
    performance: Object.fromEntries(enhancerStats as Map<string, any>),
    liveness: Object.fromEntries(healthCheck),
    timestamp: new Date().toISOString()
  };
};

/**
 * Reset all reliability systems
 * Utility function for testing and maintenance
 */
export const resetAllReliabilitySystems = () => {
  serviceReliabilityManager.resetAllMetrics();
  serviceEnhancer.resetAllServices();
  console.log('All reliability systems have been reset');
};

/**
 * Configure service reliability settings
 * Utility function to configure multiple services at once
 */
export const configureServiceReliability = (configs: Record<string, {
  timeout?: number;
  maxRetries?: number;
  circuitBreakerThreshold?: number;
  cacheEnabled?: boolean;
  useConnectionPool?: boolean;
}>) => {
  for (const [serviceKey, config] of Object.entries(configs)) {
    serviceEnhancer.configureService(serviceKey, {
      timeout: config.timeout,
      retryConfig: {
        maxRetries: config.maxRetries
      },
      circuitConfig: {
        failureThreshold: config.circuitBreakerThreshold
      },
      cacheEnabled: config.cacheEnabled,
      useConnectionPool: config.useConnectionPool
    });
  }
  
  console.log('Service reliability configured for', Object.keys(configs).length, 'services');
};

// Global debug interface aggregation
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.reliabilityDebug = {
    // Service reliability manager debug methods
    reliability: {
      getMetrics: () => serviceReliabilityManager.getServiceMetrics(),
      getHealth: () => serviceReliabilityManager.getHealthStatus(),
      getCircuitBreakers: () => serviceReliabilityManager.getCircuitBreakerStatus(),
      resetMetrics: () => serviceReliabilityManager.resetAllMetrics(),
      resetCircuitBreaker: (key: string) => serviceReliabilityManager.resetCircuitBreaker(key)
    },
    
    // Service enhancer debug methods
    enhancer: {
      getStats: (serviceKey?: string) => serviceEnhancer.getServiceStats(serviceKey),
      configureService: (serviceKey: string, config: any) => serviceEnhancer.configureService(serviceKey, config),
      resetAll: () => serviceEnhancer.resetAllServices(),
      healthCheck: () => serviceEnhancer.performHealthCheck()
    },
    
    // Convenience debug methods
    dashboard: () => getServiceHealthDashboard(),
    resetAll: () => resetAllReliabilitySystems(),
    configure: (configs: any) => configureServiceReliability(configs)
  };
  
  console.log('🔧 Reliability Debug Interface available at window.reliabilityDebug');
}