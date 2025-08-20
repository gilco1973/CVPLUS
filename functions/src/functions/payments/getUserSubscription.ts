import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { db } from '../../config/firebase';

interface GetUserSubscriptionData {
  userId: string;
}

export const getUserSubscription = onCall<GetUserSubscriptionData>(
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
        }
      };
    }

    return subscriptionDoc.data();
  } catch (error) {
    logger.error('Error getting user subscription internally', { error, userId });
    throw error;
  }
}