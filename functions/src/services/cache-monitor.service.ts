import { logger } from 'firebase-functions';
import { subscriptionCache } from './subscription-cache.service';

export interface CacheHealthReport {
  timestamp: number;
  stats: {
    hits: number;
    misses: number;
    invalidations: number;
    size: number;
  };
  performance: {
    hitRate: number;
    missRate: number;
    efficiency: string;
  };
  recommendations: string[];
}

export class CacheMonitorService {
  /**
   * Generate comprehensive cache health report
   */
  generateHealthReport(): CacheHealthReport {
    const stats = subscriptionCache.getStats();
    const totalRequests = stats.hits + stats.misses;
    
    const hitRate = totalRequests > 0 ? (stats.hits / totalRequests) * 100 : 0;
    const missRate = totalRequests > 0 ? (stats.misses / totalRequests) * 100 : 0;
    
    let efficiency = 'Unknown';
    if (hitRate >= 80) efficiency = 'Excellent';
    else if (hitRate >= 60) efficiency = 'Good';
    else if (hitRate >= 40) efficiency = 'Fair';
    else if (hitRate >= 20) efficiency = 'Poor';
    else efficiency = 'Critical';

    const recommendations = this.generateRecommendations(stats, hitRate);

    const report: CacheHealthReport = {
      timestamp: Date.now(),
      stats,
      performance: {
        hitRate: Math.round(hitRate * 100) / 100,
        missRate: Math.round(missRate * 100) / 100,
        efficiency
      },
      recommendations
    };

    logger.info('Cache health report generated', {
      hitRate: report.performance.hitRate,
      efficiency: report.performance.efficiency,
      cacheSize: stats.size,
      totalRequests
    });

    return report;
  }

  /**
   * Log cache performance metrics
   */
  logPerformanceMetrics(): void {
    const report = this.generateHealthReport();
    
    logger.info('Subscription Cache Performance Report', {
      hitRate: `${report.performance.hitRate}%`,
      missRate: `${report.performance.missRate}%`,
      efficiency: report.performance.efficiency,
      cacheSize: report.stats.size,
      totalHits: report.stats.hits,
      totalMisses: report.stats.misses,
      invalidations: report.stats.invalidations,
      recommendations: report.recommendations
    });
  }

  /**
   * Check if cache performance is healthy
   */
  isCacheHealthy(): boolean {
    const stats = subscriptionCache.getStats();
    const totalRequests = stats.hits + stats.misses;
    
    if (totalRequests < 10) return true; // Not enough data
    
    const hitRate = (stats.hits / totalRequests) * 100;
    return hitRate >= 60; // Consider 60%+ hit rate as healthy
  }

  /**
   * Perform cache maintenance operations
   */
  performMaintenance(): void {
    try {
      logger.info('Starting cache maintenance');
      
      const beforeStats = subscriptionCache.getStats();
      const cleanedCount = subscriptionCache.cleanupExpired();
      const afterStats = subscriptionCache.getStats();

      logger.info('Cache maintenance completed', {
        beforeSize: beforeStats.size,
        afterSize: afterStats.size,
        cleanedEntries: cleanedCount,
        memoryFreed: cleanedCount > 0
      });
    } catch (error) {
      logger.error('Error during cache maintenance', { error });
    }
  }

  private generateRecommendations(stats: any, hitRate: number): string[] {
    const recommendations: string[] = [];

    if (hitRate < 40) {
      recommendations.push('Low hit rate detected - consider increasing cache TTL');
    }

    if (stats.size > 800) {
      recommendations.push('Cache size is large - consider implementing size-based eviction');
    }

    if (stats.invalidations > stats.hits * 0.5) {
      recommendations.push('High invalidation rate - review cache invalidation strategy');
    }

    if (stats.misses > 1000 && hitRate < 60) {
      recommendations.push('Consider warming the cache for frequently accessed users');
    }

    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal');
    }

    return recommendations;
  }
}

// Singleton instance
export const cacheMonitor = new CacheMonitorService();

// Schedule periodic performance logging (every 30 minutes)
setInterval(() => {
  cacheMonitor.logPerformanceMetrics();
}, 30 * 60 * 1000);

// Schedule periodic maintenance (every hour)
setInterval(() => {
  cacheMonitor.performMaintenance();
}, 60 * 60 * 1000);