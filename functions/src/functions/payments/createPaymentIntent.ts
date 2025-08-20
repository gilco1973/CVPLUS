import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { db } from '../../config/firebase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

interface CreatePaymentIntentData {
  userId: string;
  email: string;
  googleId: string;
  amount?: number; // Optional, defaults to $5.00
}

export const createPaymentIntent = onCall<CreatePaymentIntentData>(
  {
    secrets: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY']
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

    const { userId, email, googleId, amount = 500 } = data; // $5.00 in cents

    try {
      // Check if user already has lifetime premium
      const existingSubscription = await db
        .collection('userSubscriptions')
        .doc(userId)
        .get();

      if (existingSubscription.exists && existingSubscription.data()?.lifetimeAccess) {
        throw new HttpsError(
          'failed-precondition',
          'User already has lifetime premium access'
        );
      }

      // Create or retrieve Stripe customer
      let customerId: string;
      const existingPaymentData = await db
        .collection('paymentHistory')
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!existingPaymentData.empty && existingPaymentData.docs[0].data().stripeCustomerId) {
        customerId = existingPaymentData.docs[0].data().stripeCustomerId;
      } else {
        const customer = await stripe.customers.create({
          email,
          metadata: {
            userId,
            googleId,
            platform: 'cvplus'
          }
        });
        customerId = customer.id;
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        customer: customerId,
        description: 'CVPlus Lifetime Premium Access',
        metadata: {
          userId,
          googleId,
          email,
          productType: 'lifetime_premium'
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Log payment intent creation
      logger.info('Payment intent created', {
        userId,
        email,
        paymentIntentId: paymentIntent.id,
        amount,
        customerId
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        customerId,
        amount
      };

    } catch (error) {
      logger.error('Error creating payment intent', { error, userId, email });
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError(
        'internal',
        'Failed to create payment intent',
        error
      );
    }
  }
);