import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { db } from '../../config/firebase';
import { corsOptions } from '../../config/cors';
import { getUserSubscriptionInternal } from '../payments/getUserSubscription';

interface GetUserUsageStatsData {
  userId: string;
}

export const getUserUsageStats = onCall<GetUserUsageStatsData>(
  {
    ...corsOptions
  },
  async (request) => {
    const { data, auth } = request;

    // Verify authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Verify user matches the authenticated user
    if (auth.uid !== data.userId) {
      throw new HttpsError('permission-denied', 'User ID mismatch');
    }

    const { userId } = data;

    // Skip all checks in development environment
    const isDev = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV === 'development';
    
    if (isDev) {
      logger.info('Dev environment detected - returning mock usage stats', { userId });
      return {
        currentMonthUploads: 1,
        uniqueCVsThisMonth: 1,
        remainingUploads: 999,
        subscriptionStatus: 'premium' as const,
        lifetimeAccess: true,
        monthlyLimit: 'unlimited' as const,
        uniqueCVLimit: 3,
        currentMonth: new Date().toISOString().substring(0, 7),
        lastUpdated: new Date().toISOString()
      };
    }

    try {
      // Get current month date range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get user's subscription status
      const subscriptionData = await getUserSubscriptionInternal(userId);
      const isLifetimeAccess = subscriptionData.lifetimeAccess === true;
      const isPremium = subscriptionData.subscriptionStatus === 'premium' || isLifetimeAccess;

      // Get user's uploads this month with detailed logging
      logger.info('Querying upload history', {
        userId,
        startOfMonth: startOfMonth.toISOString(),
        collection: 'userPolicyRecords',
        subcollection: 'uploadHistory'
      });
      
      const uploadsQuery = await db
        .collection('userPolicyRecords')
        .doc(userId)
        .collection('uploadHistory')
        .where('uploadDate', '>=', startOfMonth)
        .get();
        
      logger.info('Upload history query completed', {
        userId,
        querySize: uploadsQuery.size,
        isEmpty: uploadsQuery.empty
      });

      const currentMonthUploads = uploadsQuery.size;
      
      // Count unique CV hashes uploaded this month
      const uniqueCVHashes = new Set(
        uploadsQuery.docs
          .map(doc => {
            const data = doc.data();
            logger.debug('Upload document data', { userId, docId: doc.id, data });
            return data?.cvHash;
          })
          .filter(hash => hash && typeof hash === 'string') // Filter out any null/undefined/invalid hashes
      ).size;

      // Calculate remaining uploads based on plan
      const FREE_PLAN_LIMIT = 3;
      const PREMIUM_UNIQUE_CV_LIMIT = 3;

      let remainingUploads: number;
      
      if (isPremium) {
        // Premium users: unlimited refinements of up to 3 unique CVs per month
        remainingUploads = uniqueCVHashes >= PREMIUM_UNIQUE_CV_LIMIT ? 0 : Infinity;
      } else {
        // Free users: 3 uploads total per month
        remainingUploads = Math.max(0, FREE_PLAN_LIMIT - currentMonthUploads);
      }

      const usageStats = {
        currentMonthUploads,
        uniqueCVsThisMonth: uniqueCVHashes,
        remainingUploads: remainingUploads === Infinity ? 999 : remainingUploads, // Frontend can't handle Infinity
        subscriptionStatus: isPremium ? 'premium' : 'free',
        lifetimeAccess: isLifetimeAccess,
        monthlyLimit: isPremium ? 'unlimited' : FREE_PLAN_LIMIT,
        uniqueCVLimit: isPremium ? PREMIUM_UNIQUE_CV_LIMIT : 1,
        currentMonth: now.toISOString().substring(0, 7), // YYYY-MM format
        lastUpdated: new Date().toISOString()
      };

      logger.info('User usage stats retrieved', {
        userId,
        currentMonthUploads,
        uniqueCVsThisMonth: uniqueCVHashes,
        remainingUploads: remainingUploads === Infinity ? 'unlimited' : remainingUploads,
        subscriptionStatus: isPremium ? 'premium' : 'free'
      });

      return usageStats;

    } catch (error) {
      // Properly serialize error details for logging
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        code: (error as any)?.code,
        details: (error as any)?.details,
        name: error instanceof Error ? error.name : typeof error,
        toString: error?.toString?.()
      };
      
      logger.error('Error getting user usage stats', { 
        error: errorDetails, 
        userId,
        timestamp: new Date().toISOString(),
        functionName: 'getUserUsageStats'
      });
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError(
        'internal',
        'Failed to get user usage statistics',
        { originalError: errorDetails }
      );
    }
  }
);