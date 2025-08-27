import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { logError } from '../utils/errorHandling';

// Types for payment service
export interface CreatePaymentIntentRequest {
  userId: string;
  email: string;
  googleId: string;
  amount?: number;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  customerId: string;
  amount: number;
}

export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  userId: string;
  googleId: string;
}

export interface ConfirmPaymentResponse {
  success: boolean;
  subscriptionStatus: string;
  lifetimeAccess: boolean;
  features: {
    webPortal: boolean;
    aiChat: boolean;
    podcast: boolean;
    advancedAnalytics: boolean;
  };
  purchasedAt: any;
  message: string;
}

export interface CheckFeatureAccessRequest {
  userId: string;
  googleId: string;
  feature: 'webPortal' | 'aiChat' | 'podcast' | 'advancedAnalytics';
}

export interface CheckFeatureAccessResponse {
  hasAccess: boolean;
  subscriptionStatus: string;
  lifetimeAccess: boolean;
  features?: Record<string, boolean>;
  purchasedAt?: any;
  googleAccountVerified?: any;
  message: string;
}

export interface GetUserSubscriptionRequest {
  userId: string;
}

export interface GetUserSubscriptionResponse {
  subscriptionStatus: string;
  lifetimeAccess: boolean;
  features: {
    webPortal: boolean;
    aiChat: boolean;
    podcast: boolean;
    advancedAnalytics: boolean;
  };
  purchasedAt?: any;
  paymentAmount?: number;
  currency?: string;
  googleAccountVerified?: any;
  stripeCustomerId?: string;
  message: string;
}

// Firebase Functions references
const createPaymentIntentFn = httpsCallable<CreatePaymentIntentRequest, CreatePaymentIntentResponse>(
  functions, 
  'createPaymentIntent'
);

const confirmPaymentFn = httpsCallable<ConfirmPaymentRequest, ConfirmPaymentResponse>(
  functions, 
  'confirmPayment'
);

const checkFeatureAccessFn = httpsCallable<CheckFeatureAccessRequest, CheckFeatureAccessResponse>(
  functions, 
  'checkFeatureAccess'
);

const getUserSubscriptionFn = httpsCallable<GetUserSubscriptionRequest, GetUserSubscriptionResponse>(
  functions, 
  'getUserSubscription'
);

/**
 * Create a payment intent for lifetime premium access
 */
export const createPaymentIntent = async (
  request: CreatePaymentIntentRequest
): Promise<CreatePaymentIntentResponse> => {
  try {
    const result = await createPaymentIntentFn(request);
    return result.data;
  } catch (error) {
    logError('createPaymentIntent', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to create payment intent'
    );
  }
};

/**
 * Confirm payment and grant lifetime premium access
 */
export const confirmPayment = async (
  request: ConfirmPaymentRequest
): Promise<ConfirmPaymentResponse> => {
  try {
    const result = await confirmPaymentFn(request);
    
    // Clear subscription cache after successful payment
    clearSubscriptionCache();
    
    return result.data;
  } catch (error) {
    logError('confirmPayment', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to confirm payment'
    );
  }
};

/**
 * Check if user has access to a specific premium feature
 */
export const checkFeatureAccess = async (
  request: CheckFeatureAccessRequest
): Promise<CheckFeatureAccessResponse> => {
  try {
    const result = await checkFeatureAccessFn(request);
    return result.data;
  } catch (error) {
    logError('checkFeatureAccess', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to check feature access'
    );
  }
};

// Cache key for sessionStorage
const SUBSCRIPTION_CACHE_KEY = 'cvplus_user_subscription';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

interface CachedSubscription {
  data: GetUserSubscriptionResponse;
  timestamp: number;
  userId: string;
}

/**
 * Get cached subscription data from sessionStorage
 */
const getCachedSubscription = (userId: string): GetUserSubscriptionResponse | null => {
  try {
    const cached = sessionStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (!cached) return null;

    const parsedCache: CachedSubscription = JSON.parse(cached);
    const isExpired = Date.now() - parsedCache.timestamp > CACHE_EXPIRY_MS;
    const isDifferentUser = parsedCache.userId !== userId;

    if (isExpired || isDifferentUser) {
      sessionStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
      return null;
    }

    return parsedCache.data;
  } catch (error) {
    console.warn('Error reading subscription cache:', error);
    sessionStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
    return null;
  }
};

/**
 * Cache subscription data in sessionStorage
 */
const setCachedSubscription = (userId: string, data: GetUserSubscriptionResponse): void => {
  try {
    const cacheData: CachedSubscription = {
      data,
      timestamp: Date.now(),
      userId
    };
    sessionStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Error caching subscription data:', error);
  }
};

/**
 * Clear cached subscription data
 */
export const clearSubscriptionCache = (): void => {
  try {
    sessionStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
  } catch (error) {
    console.warn('Error clearing subscription cache:', error);
  }
};

/**
 * Get user's subscription status and features with caching
 */
export const getUserSubscription = async (
  request: GetUserSubscriptionRequest
): Promise<GetUserSubscriptionResponse> => {
  // Check cache first
  const cached = getCachedSubscription(request.userId);
  if (cached) {
    return cached;
  }

  try {
    const result = await getUserSubscriptionFn(request);
    const data = result.data;
    
    // Cache the result
    setCachedSubscription(request.userId, data);
    
    return data;
  } catch (error) {
    logError('getUserSubscription', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get user subscription'
    );
  }
};

/**
 * Helper function to check if user has any premium features
 */
export const hasAnyPremiumFeature = (features: Record<string, boolean>): boolean => {
  return Object.values(features).some(hasFeature => hasFeature === true);
};

/**
 * Helper function to get premium features list
 */
export const getPremiumFeaturesList = (features: Record<string, boolean>): string[] => {
  return Object.entries(features)
    .filter(([_, hasFeature]) => hasFeature === true)
    .map(([feature]) => feature);
};

/**
 * Helper function to format feature names for display
 */
export const formatFeatureName = (feature: string): string => {
  const featureMap: Record<string, string> = {
    webPortal: 'Personal Web Portal',
    aiChat: 'AI Chat Assistant',
    podcast: 'AI Career Podcast',
    advancedAnalytics: 'Advanced Analytics'
  };
  
  return featureMap[feature] || feature;
};