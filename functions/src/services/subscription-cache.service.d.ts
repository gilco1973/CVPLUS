interface CacheStats {
    hits: number;
    misses: number;
    invalidations: number;
    size: number;
}
export declare class SubscriptionCacheService {
    private cache;
    private readonly DEFAULT_TTL;
    private readonly MAX_CACHE_SIZE;
    private stats;
    /**
     * Get cached subscription data for a user
     */
    get(userId: string): any | null;
    /**
     * Store subscription data in cache
     */
    set(userId: string, data: any, customTtl?: number): void;
    /**
     * Invalidate cached subscription for a user
     */
    invalidate(userId: string): boolean;
    /**
     * Clear all cached subscriptions
     */
    clearAll(): void;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Clean up expired entries manually
     */
    cleanupExpired(): number;
    private generateKey;
    private isExpired;
    private evictOldestEntries;
}
export declare const subscriptionCache: SubscriptionCacheService;
export {};
//# sourceMappingURL=subscription-cache.service.d.ts.map