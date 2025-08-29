"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cachedSubscriptionService = exports.CachedSubscriptionService = void 0;
const firebase_functions_1 = require("firebase-functions");
const firebase_1 = require("../config/firebase");
const subscription_cache_service_1 = require("./subscription-cache.service");
class CachedSubscriptionService {
    /**
     * Get user subscription with caching
     */
    async getUserSubscription(userId) {
        try {
            // Try to get from cache first
            const cachedData = subscription_cache_service_1.subscriptionCache.get(userId);
            if (cachedData) {
                firebase_functions_1.logger.debug('Retrieved subscription from cache', { userId });
                return cachedData;
            }
            // Cache miss - fetch from database
            firebase_functions_1.logger.debug('Cache miss - fetching subscription from database', { userId });
            const subscriptionData = await this.fetchFromDatabase(userId);
            // Cache the result for future requests
            subscription_cache_service_1.subscriptionCache.set(userId, subscriptionData);
            return subscriptionData;
        }
        catch (error) {
            firebase_functions_1.logger.error('Error getting cached user subscription', { error, userId });
            // Fallback to direct database access on any error
            firebase_functions_1.logger.warn('Falling back to direct database access', { userId });
            return await this.fetchFromDatabase(userId);
        }
    }
    /**
     * Invalidate cached subscription data (call when subscription changes)
     */
    invalidateUserSubscription(userId) {
        try {
            const invalidated = subscription_cache_service_1.subscriptionCache.invalidate(userId);
            firebase_functions_1.logger.info('Subscription cache invalidated', { userId, invalidated });
        }
        catch (error) {
            firebase_functions_1.logger.error('Error invalidating subscription cache', { error, userId });
        }
    }
    /**
     * Update subscription and invalidate cache
     */
    async updateUserSubscription(userId, subscriptionData) {
        try {
            // Update in database
            await firebase_1.db
                .collection('userSubscriptions')
                .doc(userId)
                .set(subscriptionData, { merge: true });
            // Invalidate cache to ensure fresh data on next read
            this.invalidateUserSubscription(userId);
            firebase_functions_1.logger.info('User subscription updated and cache invalidated', {
                userId,
                updatedFields: Object.keys(subscriptionData)
            });
        }
        catch (error) {
            firebase_functions_1.logger.error('Error updating user subscription', { error, userId });
            throw error;
        }
    }
    /**
     * Get cache statistics for monitoring
     */
    getCacheStats() {
        return subscription_cache_service_1.subscriptionCache.getStats();
    }
    /**
     * Clear all cached subscriptions (for maintenance)
     */
    clearAllCache() {
        subscription_cache_service_1.subscriptionCache.clearAll();
        firebase_functions_1.logger.info('All subscription cache cleared');
    }
    async fetchFromDatabase(userId) {
        try {
            const subscriptionDoc = await firebase_1.db
                .collection('userSubscriptions')
                .doc(userId)
                .get();
            if (!subscriptionDoc.exists) {
                // Return default free subscription
                const defaultSubscription = {
                    subscriptionStatus: 'free',
                    lifetimeAccess: false,
                    features: {
                        webPortal: false,
                        aiChat: false,
                        podcast: false,
                        advancedAnalytics: false,
                        videoIntroduction: false,
                        roleDetection: false,
                        externalData: false
                    }
                };
                firebase_functions_1.logger.debug('No subscription found, returning default', { userId });
                return defaultSubscription;
            }
            const data = subscriptionDoc.data();
            firebase_functions_1.logger.debug('Fetched subscription from database', {
                userId,
                subscriptionStatus: data.subscriptionStatus,
                lifetimeAccess: data.lifetimeAccess
            });
            return data;
        }
        catch (error) {
            firebase_functions_1.logger.error('Error fetching subscription from database', { error, userId });
            throw error;
        }
    }
}
exports.CachedSubscriptionService = CachedSubscriptionService;
// Singleton instance
exports.cachedSubscriptionService = new CachedSubscriptionService();
//# sourceMappingURL=cached-subscription.service.js.map