import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from './useSubscription';

interface PremiumStatus {
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;
  features: Record<string, boolean>;
  subscriptionStatus: string;
  purchasedAt?: any;
  refreshStatus: () => Promise<void>;
}

/**
 * Simplified hook for checking premium status throughout the application
 * Provides real-time premium status monitoring with caching
 */
export const usePremiumStatus = (): PremiumStatus => {
  const { user } = useAuth();
  const { subscription, isLifetimePremium, isLoading, error, refreshSubscription } = useSubscription();
  const [cachedStatus, setCachedStatus] = useState<{
    isPremium: boolean;
    features: Record<string, boolean>;
    timestamp: number;
  } | null>(null);

  // Cache premium status for 5 minutes to improve performance
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Check if cached data is still valid
  const isCacheValid = useCallback(() => {
    if (!cachedStatus) return false;
    return Date.now() - cachedStatus.timestamp < CACHE_DURATION;
  }, [cachedStatus]);

  // Update cache when subscription data changes
  useEffect(() => {
    if (subscription && user) {
      setCachedStatus({
        isPremium: isLifetimePremium,
        features: subscription.features || {},
        timestamp: Date.now()
      });
    } else if (!user) {
      // Clear cache when user logs out
      setCachedStatus(null);
    }
  }, [subscription, isLifetimePremium, user]);

  // Refresh premium status with cache invalidation
  const refreshStatus = useCallback(async () => {
    setCachedStatus(null); // Invalidate cache
    await refreshSubscription();
  }, [refreshSubscription]);

  // Real-time status monitoring for premium feature changes
  useEffect(() => {
    if (!user) return;

    // Set up periodic status refresh for premium users
    const interval = setInterval(() => {
      if (!isCacheValid() && user) {
        refreshSubscription();
      }
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [user, isCacheValid, refreshSubscription]);

  // Return cached data if available and valid, otherwise return live data
  const shouldUseCached = isCacheValid() && cachedStatus && !isLoading;
  
  return {
    isPremium: shouldUseCached ? cachedStatus.isPremium : isLifetimePremium,
    isLoading: isLoading && !shouldUseCached,
    error,
    features: shouldUseCached ? cachedStatus.features : (subscription?.features || {}),
    subscriptionStatus: subscription?.subscriptionStatus || 'free',
    purchasedAt: subscription?.purchasedAt,
    refreshStatus
  };
};

/**
 * Hook for checking access to a specific premium feature with caching
 */
export const useFeatureAccess = (featureName: string) => {
  const { features, isPremium, isLoading } = usePremiumStatus();
  
  return {
    hasAccess: isPremium && features[featureName] === true,
    isPremium,
    isLoading,
    allFeatures: features
  };
};

/**
 * Hook for premium upgrade prompts throughout the application
 */
export const usePremiumPrompt = () => {
  const { isPremium, isLoading } = usePremiumStatus();
  const [promptDismissed, setPromptDismissed] = useState(false);

  // Show premium prompts for non-premium users
  const shouldShowPrompt = !isPremium && !isLoading && !promptDismissed;
  
  const dismissPrompt = useCallback(() => {
    setPromptDismissed(true);
    // Reset after 24 hours
    setTimeout(() => setPromptDismissed(false), 24 * 60 * 60 * 1000);
  }, []);

  return {
    shouldShowPrompt,
    dismissPrompt,
    isPremium,
    isLoading
  };
};

/**
 * Hook for premium status indicators in components
 */
export const usePremiumIndicator = () => {
  const { isPremium, isLoading, features } = usePremiumStatus();
  
  const getStatusText = useCallback(() => {
    if (isLoading) return 'Checking...';
    if (isPremium) return 'Premium';
    return 'Free';
  }, [isPremium, isLoading]);
  
  const getStatusColor = useCallback(() => {
    if (isLoading) return 'text-gray-500';
    if (isPremium) return 'text-yellow-600';
    return 'text-gray-600';
  }, [isPremium, isLoading]);
  
  const getFeatureCount = useCallback(() => {
    return Object.values(features).filter(hasAccess => hasAccess).length;
  }, [features]);

  return {
    isPremium,
    isLoading,
    statusText: getStatusText(),
    statusColor: getStatusColor(),
    featureCount: getFeatureCount(),
    features
  };
};