import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { db } from '../../config/firebase';
import { corsOptions } from '../../config/cors';

interface GetUserSubscriptionData {
  userId: string;
}

export const getUserSubscription = onCall<GetUserSubscriptionData>(
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

    // Skip database checks in development environment
    const isDev = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV === 'development';
    
    if (isDev) {
      logger.info('Dev environment detected - returning mock subscription data', { userId });
      return {
        subscriptionStatus: 'premium',
        lifetimeAccess: true,
        features: {
          webPortal: true,
          aiChat: true,
          podcast: true,
          advancedAnalytics: true
        },
        purchasedAt: new Date(),
        paymentAmount: 99,
        currency: 'USD',
        googleAccountVerified: new Date(),
        stripeCustomerId: 'dev-mock-customer',
        message: 'Dev environment - mock premium subscription'
      };
    }

    try {
      // Get user subscription from Firestore
      const subscriptionDoc = await db
        .collection('userSubscriptions')
        .doc(userId)
        .get();

      if (!subscriptionDoc.exists) {
        return {
          subscriptionStatus: 'free',
          lifetimeAccess: false,
          features: {
            webPortal: false,
            aiChat: false,
            podcast: false,
            advancedAnalytics: false
          },
          message: 'No premium subscription found'
        };
      }

      const subscriptionData = subscriptionDoc.data()!;

      logger.info('User subscription retrieved', {
        userId,
        subscriptionStatus: subscriptionData.subscriptionStatus,
        lifetimeAccess: subscriptionData.lifetimeAccess
      });

      return {
        subscriptionStatus: subscriptionData.subscriptionStatus,
        lifetimeAccess: subscriptionData.lifetimeAccess,
        features: subscriptionData.features,
        purchasedAt: subscriptionData.purchasedAt,
        paymentAmount: subscriptionData.metadata?.paymentAmount,
        currency: subscriptionData.metadata?.currency,
        googleAccountVerified: subscriptionData.metadata?.accountVerification?.verifiedAt,
        stripeCustomerId: subscriptionData.stripeCustomerId,
        message: subscriptionData.lifetimeAccess 
          ? 'Lifetime premium access active'
          : 'Free tier active'
      };

    } catch (error) {
      logger.error('Error getting user subscription', { error, userId });
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError(
        'internal',
        'Failed to get user subscription',
        error
      );
    }
  }
);

// Helper function for internal use (not exposed as Cloud Function)
export async function getUserSubscriptionInternal(userId: string) {
  try {
    logger.info('Getting user subscription internally', { userId });
    
    const subscriptionDoc = await db
      .collection('userSubscriptions')
      .doc(userId)
      .get();

    logger.info('Subscription document query completed', { 
      userId, 
      exists: subscriptionDoc.exists,
      hasData: subscriptionDoc.exists ? !!subscriptionDoc.data() : false
    });

    if (!subscriptionDoc.exists) {
      const defaultSubscription = {
        subscriptionStatus: 'free',
        lifetimeAccess: false,
        features: {
          webPortal: false,
          aiChat: false,
          podcast: false,
          advancedAnalytics: false
        }
      };
      
      logger.info('Returning default subscription for user', { userId, subscription: defaultSubscription });
      return defaultSubscription;
    }

    const subscriptionData = subscriptionDoc.data();
    logger.info('Returning existing subscription for user', { 
      userId, 
      subscriptionStatus: subscriptionData?.subscriptionStatus,
      lifetimeAccess: subscriptionData?.lifetimeAccess
    });
    
    return subscriptionData;
  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any)?.code,
      name: error instanceof Error ? error.name : typeof error
    };
    
    logger.error('Error getting user subscription internally', { 
      error: errorDetails, 
      userId,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}