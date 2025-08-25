import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { corsOptions } from '../../config/cors';
import { cacheMonitor } from '../../services/cache-monitor.service';
import { subscriptionCache } from '../../services/subscription-cache.service';

interface GetCacheStatsData {
  includeHealthReport?: boolean;
}

export const getCacheStats = onCall<GetCacheStatsData>(
  {
    ...corsOptions
  },
  async (request) => {
    const { auth, data } = request;

    // Verify authentication (admin only)
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Basic admin check (you may want to implement proper admin role checking)
    const isAdmin = auth.token?.admin === true || auth.uid === 'admin_user_id';
    
    if (!isAdmin) {
      logger.warn('Non-admin user attempted to access cache stats', { 
        uid: auth.uid 
      });
      throw new HttpsError(
        'permission-denied',
        'Admin access required'
      );
    }

    try {
      const basicStats = subscriptionCache.getStats();
      const response: any = {
        timestamp: Date.now(),
        basicStats,
        cacheType: 'subscription-cache'
      };

      if (data?.includeHealthReport) {
        response.healthReport = cacheMonitor.generateHealthReport();
      }

      logger.info('Cache stats retrieved by admin', {
        uid: auth.uid,
        includeHealthReport: data?.includeHealthReport,
        hitRate: basicStats.hits / (basicStats.hits + basicStats.misses) * 100
      });

      return response;
    } catch (error) {
      logger.error('Error getting cache stats', { error, uid: auth.uid });
      
      throw new HttpsError(
        'internal',
        'Failed to get cache statistics',
        error
      );
    }
  }
);