/**
 * Cache Services Index - CVPlus Performance Optimization
 * 
 * Centralized exports for all Redis caching services, providing
 * high-performance caching layer for CVPlus applications.
 * 
 * @author Gil Klainert
 * @version 2.0.0
 * @updated 2025-08-28
 */

// Core cache infrastructure
export { redisClient } from './redis-client.service';
export { cacheService } from './cache.service';

// Specialized cache services
export { pricingCacheService } from './pricing-cache.service';
export { subscriptionCacheService } from './subscription-cache.service';
export { featureAccessCacheService } from './feature-access-cache.service';
export { usageBatchCacheService } from './usage-batch-cache.service';
export { analyticsCacheService } from './analytics-cache.service';

// Monitoring and performance
export { 
  cachePerformanceMonitor,
  CacheHealthStatus,
  CachePerformanceReport
} from './cache-performance-monitor.service';

// Legacy exports for backward compatibility
export { SubscriptionCacheService, subscriptionCache } from '../subscription-cache.service';
export { 
  CachedSubscriptionService, 
  cachedSubscriptionService,
  UserSubscriptionData 
} from '../cached-subscription.service';
export { 
  SubscriptionManagementService,
  subscriptionManagementService 
} from '../subscription-management.service';
export { 
  CacheMonitorService,
  cacheMonitor,
  CacheHealthReport 
} from '../cache-monitor.service';
export { getUserSubscriptionInternal, invalidateUserSubscriptionCache } from '../../../../packages/payments/src/backend/functions';

// Type exports
export type { 
  CacheOptions, 
  CacheResult, 
  BatchCacheResult 
} from './cache.service';

export type { 
  PricingRequest, 
  PricingResult 
} from './pricing-cache.service';

export type { 
  SubscriptionCacheResult 
} from './subscription-cache.service';

export type { 
  FeatureAccessRequest, 
  FeatureAccessResult, 
  FeatureKey 
} from './feature-access-cache.service';

export type { 
  UsageEvent, 
  BatchedUsageData 
} from './usage-batch-cache.service';

export type { 
  AnalyticsQuery, 
  AnalyticsResult, 
  AnalyticsQueryType 
} from './analytics-cache.service';

export type { 
  CacheAlert, 
  CacheRecommendation 
} from './cache-performance-monitor.service';

/**
 * Initialize all cache services
 */
export async function initializeCacheServices(): Promise<void> {
  try {
    // Import services dynamically to avoid circular dependencies
    const { redisClient } = await import('./redis-client.service');
    const { pricingCacheService } = await import('./pricing-cache.service');
    const { subscriptionCacheService } = await import('./subscription-cache.service');
    const { featureAccessCacheService } = await import('./feature-access-cache.service');
    const { analyticsCacheService } = await import('./analytics-cache.service');
    
    // Initialize Redis client
    await redisClient.initialize();
    
    // Warm critical caches
    await Promise.allSettled([
      pricingCacheService.warmCache(['common_user']),
      subscriptionCacheService.warmCache(['common_user']),
      featureAccessCacheService.warmCache(['common_user']),
      analyticsCacheService.warmCache()
    ]);
    
    console.log('Cache services initialized successfully');
  } catch (error) {
    console.error('Cache services initialization error:', error);
    throw error;
  }
}

/**
 * Perform comprehensive health check on all cache services
 */
export async function performCacheHealthCheck(): Promise<CacheHealthStatus> {
  const { cachePerformanceMonitor } = await import('./cache-performance-monitor.service');
  return await cachePerformanceMonitor.performHealthCheck();
}

/**
 * Generate performance report for all cache services
 */
export async function generateCachePerformanceReport(): Promise<CachePerformanceReport> {
  const { cachePerformanceMonitor } = await import('./cache-performance-monitor.service');
  return await cachePerformanceMonitor.generatePerformanceReport();
}

/**
 * Warm all cache services with common data
 */
export async function warmAllCaches(): Promise<any> {
  const { cachePerformanceMonitor } = await import('./cache-performance-monitor.service');
  return await cachePerformanceMonitor.warmAllCaches();
}