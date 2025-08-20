import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getUserSubscriptionInternal } from '../functions/payments/getUserSubscription';

type PremiumFeature = 'webPortal' | 'aiChat' | 'podcast' | 'advancedAnalytics';

export const premiumGuard = (feature: PremiumFeature) => {
  return async (data: any, context: any) => {
    // Verify authentication
    if (!context.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;

    try {
      // Get user subscription
      const subscription = await getUserSubscriptionInternal(userId);

      // Check for lifetime premium access
      if (!subscription?.lifetimeAccess || !subscription?.features?.[feature]) {
        logger.warn('Premium feature access denied', {
          userId,
          feature,
          lifetimeAccess: subscription?.lifetimeAccess,
          hasFeature: subscription?.features?.[feature]
        });

        throw new HttpsError(
          'permission-denied',
          `This feature requires lifetime premium access. Please upgrade to access '${feature}'.`,
          {
            feature,
            upgradeUrl: '/pricing',
            accessType: 'lifetime',
            currentStatus: subscription?.subscriptionStatus || 'free'
          }
        );
      }

      logger.info('Premium feature access granted', {
        userId,
        feature,
        subscriptionStatus: subscription.subscriptionStatus
      });

      // Access granted - function can proceed
      return true;

    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error('Error in premium guard', { error, userId, feature });
      throw new HttpsError(
        'internal',
        'Failed to verify premium access',
        error
      );
    }
  };
};

// Wrapper for Cloud Functions that need premium access
export const withPremiumAccess = (feature: PremiumFeature, handler: Function) => {
  return async (data: any, context: any) => {
    // First check premium access
    await premiumGuard(feature)(data, context);
    
    // If access is granted, execute the original handler
    return await handler(data, context);
  };
};

// Helper to check multiple features
export const requireAnyPremiumFeature = (features: PremiumFeature[]) => {
  return async (data: any, context: any) => {
    if (!context.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;

    try {
      const subscription = await getUserSubscriptionInternal(userId);

      if (!subscription?.lifetimeAccess) {
        throw new HttpsError(
          'permission-denied',
          'Lifetime premium access required',
          { upgradeUrl: '/pricing' }
        );
      }

      // Check if user has access to any of the required features
      const hasAnyFeature = features.some(feature => 
        subscription.features?.[feature] === true
      );

      if (!hasAnyFeature) {
        throw new HttpsError(
          'permission-denied',
          `Access denied. Requires one of: ${features.join(', ')}`,
          { requiredFeatures: features }
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error('Error checking multiple premium features', { error, userId, features });
      throw new HttpsError('internal', 'Failed to verify premium access');
    }
  };
};