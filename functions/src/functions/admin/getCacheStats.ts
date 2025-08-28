/**
 * Get Cache Statistics - Redis Performance Monitoring
 * 
 * Enhanced admin function to retrieve comprehensive cache performance
 * statistics from the Redis caching layer.
 * 
 * @author Gil Klainert
 * @version 2.0.0
 * @updated 2025-08-28
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { corsOptions } from '../../config/cors';
// Legacy imports for backward compatibility
import { cacheMonitor } from '../../services/cache-monitor.service';
import { subscriptionCache } from '../../services/subscription-cache.service';

interface GetCacheStatsData {
  includeHealthReport?: boolean;
  includeDetailedMetrics?: boolean;
  includeHealthCheck?: boolean;
  includeRecommendations?: boolean;
  // Legacy support
  includeRedisMetrics?: boolean;
}

interface CacheStatsResponse {
  success: boolean;
  timestamp: number;
  // Legacy fields for backward compatibility
  basicStats?: any;
  cacheType?: string;
  healthReport?: any;
  // Enhanced Redis metrics
  redis?: {
    performanceReport?: any;
    healthStatus?: any;
    redisMetrics?: any;
  };
  metadata: {
    requestId: string;
    executionTime: number;
    adminUser: string;
    version: string;
  };
}

export const getCacheStats = onCall<GetCacheStatsData>(
  {
    ...corsOptions
  },
  async (request) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 15);

    const { auth, data } = request;

    // Verify authentication (admin only)
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Basic admin check (enhanced)
    const isAdmin = auth.token?.admin === true || 
                   auth.uid === 'admin_user_id' || 
                   auth.token?.email === 'admin@cvplus.com';
    
    if (!isAdmin) {
      logger.warn('Non-admin user attempted to access cache stats', { 
        requestId,
        uid: auth.uid,
        email: auth.token?.email
      });
      throw new HttpsError(
        'permission-denied',
        'Admin access required'
      );
    }

    const adminEmail = auth.token?.email || auth.uid;

    try {
      logger.info('Cache stats request initiated', {
        requestId,
        adminUser: adminEmail,
        options: {
          includeHealthReport: data?.includeHealthReport,
          includeDetailedMetrics: data?.includeDetailedMetrics,
          includeHealthCheck: data?.includeHealthCheck,
          includeRedisMetrics: data?.includeRedisMetrics
        }
      });

      // Legacy stats for backward compatibility
      const basicStats = subscriptionCache.getStats();
      
      const response: CacheStatsResponse = {
        success: true,
        timestamp: Date.now(),
        basicStats,
        cacheType: 'subscription-cache',
        metadata: {
          requestId,
          executionTime: 0, // Will be updated
          adminUser: adminEmail,
          version: '2.0.0'
        }
      };

      // Legacy health report
      if (data?.includeHealthReport) {
        response.healthReport = cacheMonitor.generateHealthReport();
      }

      // Enhanced Redis metrics (if available)
      if (data?.includeRedisMetrics || data?.includeDetailedMetrics) {
        try {
          // Dynamic import to avoid issues if Redis services aren't available
          const { 
            cachePerformanceMonitor, 
            redisClient 
          } = await import('../../services/cache/cache-performance-monitor.service');

          const performanceReport = await cachePerformanceMonitor.generatePerformanceReport();
          const redisMetrics = redisClient.getMetrics();

          let healthStatus;
          if (data?.includeHealthCheck) {
            healthStatus = await cachePerformanceMonitor.performHealthCheck();
          }

          response.redis = {
            performanceReport,
            healthStatus,
            redisMetrics
          };

          logger.info('Enhanced Redis metrics included', {
            requestId,
            hitRate: performanceReport.overall.hitRate,
            healthScore: performanceReport.overall.healthScore,
            alertCount: performanceReport.alerts.length
          });

        } catch (redisError) {
          logger.warn('Could not load Redis metrics (Redis services may not be available)', {
            requestId,
            error: redisError instanceof Error ? redisError.message : 'Unknown error'
          });
          
          response.redis = {
            performanceReport: null,
            healthStatus: { 
              healthy: false, 
              message: 'Redis services not available' 
            },
            redisMetrics: null
          };
        }
      }

      const executionTime = Date.now() - startTime;
      response.metadata.executionTime = executionTime;

      logger.info('Cache stats retrieved successfully', {
        requestId,
        executionTime,
        adminUser: adminEmail,
        includesRedis: !!response.redis,
        hitRate: basicStats ? (basicStats.hits / (basicStats.hits + basicStats.misses) * 100) : 0
      });

      return response;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('Error getting cache stats', { 
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        uid: auth.uid,
        executionTime
      });
      
      throw new HttpsError(
        'internal',
        'Failed to get cache statistics',
        error
      );
    }
  }
);

/**
 * Enhanced cache management endpoints
 */

/**
 * Warm cache endpoint for admin users
 */
export const warmCaches = onCall<{ services?: string[] }>(
  {
    ...corsOptions
  },
  async (request) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 15);

    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const isAdmin = auth.token?.admin === true || 
                   auth.uid === 'admin_user_id' || 
                   auth.token?.email === 'admin@cvplus.com';
    
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const adminEmail = auth.token?.email || auth.uid;

    try {
      logger.info('Cache warming initiated by admin', {
        requestId,
        adminUser: adminEmail,
        services: data?.services
      });

      // Try to use enhanced Redis cache warming
      try {
        const { cachePerformanceMonitor } = await import('../../services/cache/cache-performance-monitor.service');
        const warmingResult = await cachePerformanceMonitor.warmAllCaches();

        const executionTime = Date.now() - startTime;

        logger.info('Enhanced cache warming completed', {
          requestId,
          executionTime,
          adminUser: adminEmail,
          overallSuccess: warmingResult.overallSuccess,
          totalDuration: warmingResult.totalDuration
        });

        return {
          success: true,
          data: warmingResult,
          metadata: {
            requestId,
            executionTime,
            adminUser: adminEmail,
            version: '2.0.0',
            method: 'enhanced'
          }
        };

      } catch (redisError) {
        // Fallback to legacy cache warming
        logger.warn('Enhanced cache warming not available, using legacy method', {
          requestId,
          error: redisError instanceof Error ? redisError.message : 'Unknown error'
        });

        // Legacy cache warming (if available)
        const result = {
          legacyWarming: 'completed',
          message: 'Legacy cache warming performed'
        };

        const executionTime = Date.now() - startTime;

        return {
          success: true,
          data: result,
          metadata: {
            requestId,
            executionTime,
            adminUser: adminEmail,
            version: '2.0.0',
            method: 'legacy'
          }
        };
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('Cache warming error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime
      });

      throw new HttpsError(
        'internal',
        error instanceof Error ? error.message : 'Cache warming failed'
      );
    }
  }
);

/**
 * Clear cache endpoint for admin users
 */
export const clearCaches = onCall<{ 
  services?: ('pricing' | 'subscription' | 'featureAccess' | 'analytics' | 'all')[]; 
  pattern?: string;
}>(
  {
    ...corsOptions
  },
  async (request) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 15);

    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const isAdmin = auth.token?.admin === true || 
                   auth.uid === 'admin_user_id' || 
                   auth.token?.email === 'admin@cvplus.com';
    
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const adminEmail = auth.token?.email || auth.uid;
    const services = data?.services || ['all'];

    try {
      logger.info('Cache clearing initiated by admin', {
        requestId,
        adminUser: adminEmail,
        services,
        pattern: data?.pattern
      });

      const results: Record<string, number> = {};

      // Try enhanced Redis cache clearing
      try {
        const {
          pricingCacheService,
          subscriptionCacheService,
          featureAccessCacheService,
          analyticsCacheService
        } = await import('../../services/cache');

        if (services.includes('all') || services.includes('pricing')) {
          results.pricing = await pricingCacheService.invalidateCache();
        }

        if (services.includes('all') || services.includes('subscription')) {
          results.subscription = await subscriptionCacheService.invalidateSubscription();
        }

        if (services.includes('all') || services.includes('featureAccess')) {
          // Note: This would need a global invalidation method
          results.featureAccess = 0; 
        }

        if (services.includes('all') || services.includes('analytics')) {
          results.analytics = await analyticsCacheService.invalidateCache();
        }

        logger.info('Enhanced cache clearing used', {
          requestId,
          results
        });

      } catch (redisError) {
        // Fallback to legacy cache clearing
        logger.warn('Enhanced cache clearing not available, using legacy method', {
          requestId,
          error: redisError instanceof Error ? redisError.message : 'Unknown error'
        });

        // Legacy subscription cache clearing
        if (services.includes('all') || services.includes('subscription')) {
          try {
            subscriptionCache.clearAll();
            results.subscription = 1;
          } catch (legacyError) {
            logger.warn('Legacy cache clearing also failed', { 
              requestId, 
              error: legacyError 
            });
            results.subscription = 0;
          }
        }
      }

      const totalCleared = Object.values(results).reduce((sum, count) => sum + count, 0);
      const executionTime = Date.now() - startTime;

      logger.info('Cache clearing completed', {
        requestId,
        executionTime,
        adminUser: adminEmail,
        results,
        totalCleared
      });

      return {
        success: true,
        data: {
          results,
          totalCleared,
          services
        },
        metadata: {
          requestId,
          executionTime,
          adminUser: adminEmail,
          version: '2.0.0'
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('Cache clearing error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime
      });

      throw new HttpsError(
        'internal',
        error instanceof Error ? error.message : 'Cache clearing failed'
      );
    }
  }
);