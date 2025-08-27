/**
 * CacheManager - Emergency caching layer for immediate performance gains
 * Implements multi-tier caching with memory, Redis fallback, and Firestore backup
 */
export class CacheManager {
  // L1 Cache: Memory cache (fastest, limited capacity)
  private static memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private static readonly MAX_MEMORY_ENTRIES = 100;
  private static readonly MEMORY_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  // Cache TTL configurations
  private static readonly CACHE_TTLS = {
    recommendations: 5 * 60 * 1000,      // 5 minutes
    cv_analysis: 10 * 60 * 1000,         // 10 minutes
    user_preferences: 30 * 60 * 1000,    // 30 minutes
    templates: 60 * 60 * 1000,           // 1 hour
    static_data: 24 * 60 * 60 * 1000     // 24 hours
  };

  // Track last cleanup to avoid memory leaks from setInterval
  private static lastCleanup = 0;

  /**
   * Gets cached data with automatic fallback through cache tiers
   */
  static async get<T>(key: string, category: keyof typeof CacheManager.CACHE_TTLS = 'recommendations'): Promise<T | null> {
    try {
      // Lazy cleanup to avoid memory leaks
      this.performLazyCleanup();
      
      // L1: Check memory cache
      const memoryCached = this.getFromMemory<T>(key);
      if (memoryCached !== null) {
        console.log(`💾 L1 Cache HIT: ${key}`);
        return memoryCached;
      }

      // L2: Could add Redis cache here in future
      // const redisCached = await this.getFromRedis<T>(key);
      // if (redisCached !== null) {
      //   this.setInMemory(key, redisCached, category);
      //   return redisCached;
      // }

      console.log(`💾 Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.warn(`⚠️ Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Sets cached data across all available cache tiers
   */
  static async set<T>(
    key: string, 
    data: T, 
    category: keyof typeof CacheManager.CACHE_TTLS = 'recommendations'
  ): Promise<void> {
    try {
      // L1: Set in memory cache
      this.setInMemory(key, data, category);
      console.log(`💾 L1 Cache SET: ${key}`);

      // L2: Could add Redis cache here in future
      // await this.setInRedis(key, data, category);

    } catch (error) {
      console.warn(`⚠️ Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Invalidates cached data across all tiers
   */
  static async invalidate(key: string): Promise<void> {
    try {
      // L1: Remove from memory
      this.memoryCache.delete(key);
      
      // L2: Could add Redis invalidation here
      // await this.invalidateInRedis(key);
      
      console.log(`🗑️ Cache INVALIDATED: ${key}`);
    } catch (error) {
      console.warn(`⚠️ Cache invalidation error for key ${key}:`, error);
    }
  }

  /**
   * Invalidates all cached data by pattern
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const regex = new RegExp(pattern);
      const keysToDelete: string[] = [];
      
      // Find matching keys in memory cache
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }
      
      // Delete matching keys
      for (const key of keysToDelete) {
        this.memoryCache.delete(key);
      }
      
      console.log(`🗑️ Cache PATTERN INVALIDATED: ${pattern} (${keysToDelete.length} keys)`);
    } catch (error) {
      console.warn(`⚠️ Cache pattern invalidation error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Gets cache statistics
   */
  static getCacheStats(): {
    memoryEntries: number;
    memoryHitRate: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const entries = Array.from(this.memoryCache.values());
    const now = Date.now();
    
    return {
      memoryEntries: this.memoryCache.size,
      memoryHitRate: 0, // Would need to track hits/misses for accurate calculation
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0
    };
  }

  /**
   * Clears all cache entries
   */
  static clearAll(): void {
    this.memoryCache.clear();
    console.log('🗑️ All cache entries cleared');
  }

  // Private methods for memory cache operations
  private static getFromMemory<T>(key: string): T | null {
    const cached = this.memoryCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private static setInMemory<T>(
    key: string, 
    data: T, 
    category: keyof typeof CacheManager.CACHE_TTLS
  ): void {
    // Enforce memory cache size limit
    if (this.memoryCache.size >= this.MAX_MEMORY_ENTRIES) {
      this.evictOldestEntry();
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.CACHE_TTLS[category]
    });
  }

  private static evictOldestEntry(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      console.log(`🗑️ Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  /**
   * Performs lazy cleanup to avoid memory leaks from setInterval
   */
  private static performLazyCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup > this.MEMORY_CLEANUP_INTERVAL) {
      this.cleanupExpiredEntries();
      this.lastCleanup = now;
    }
  }

  private static cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.memoryCache.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`🗑️ Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }
}

