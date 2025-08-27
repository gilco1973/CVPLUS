/**
 * @cvplus/recommendations - Cache Core Service
 * 
 * Main orchestrator for the three-tier cache system. Coordinates memory, Redis,
 * and Firestore caching with intelligent fallback and performance monitoring.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { createHash } from 'crypto';
import { MemoryManager } from './memory-manager';
import { DistributedCacheManager } from './distributed-cache-manager';
import { CacheStatsManager } from './cache-stats-manager';
import type { 
  CacheConfiguration,
  CacheStats, 
  PerformanceMetrics 
} from '../../types';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: CacheConfiguration = {
  memory: {
    maxSize: 100,
    ttl: 5 * 60 * 1000, // 5 minutes
    evictionPolicy: 'LRU'
  },
  redis: {
    ttl: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'cvplus:recommendations:',
    maxMemory: '100mb'
  },
  firestore: {
    collection: 'recommendation_cache',
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    indexFields: ['userId', 'jobId', 'createdAt']
  }
};

// ============================================================================
// CACHE CORE SERVICE
// ============================================================================

export class CacheCoreService {
  private config: CacheConfiguration;
  private memoryManager: MemoryManager;
  private distributedManager: DistributedCacheManager;
  private statsManager: CacheStatsManager;

  constructor(config: Partial<CacheConfiguration> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize managers
    this.memoryManager = new MemoryManager(this.config.memory);
    this.distributedManager = new DistributedCacheManager(this.config);
    this.statsManager = new CacheStatsManager(this.memoryManager);
  }

  // ============================================================================
  // PUBLIC CACHE OPERATIONS
  // ============================================================================

  /**
   * Get value from cache with three-tier lookup
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();

    try {
      // Tier 1: Memory cache (fastest)
      const memoryResult = this.memoryManager.get<T>(key);
      if (memoryResult !== null) {
        this.statsManager.recordCacheHit('memory', Date.now() - startTime);
        return memoryResult;
      }

      // Tier 2: Redis cache (if configured)
      if (this.distributedManager.isRedisAvailable()) {
        const redisResult = await this.distributedManager.getFromRedis<T>(key);
        if (redisResult !== null) {
          // Store in memory for faster access
          await this.memoryManager.set(key, redisResult, this.config.memory.ttl);
          this.statsManager.recordCacheHit('redis', Date.now() - startTime);
          return redisResult;
        }
      }

      // Tier 3: Firestore cache (if configured)
      if (this.distributedManager.isFirestoreAvailable()) {
        const firestoreResult = await this.distributedManager.getFromFirestore<T>(key);
        if (firestoreResult !== null) {
          // Store in higher tiers for faster access
          await this.memoryManager.set(key, firestoreResult, this.config.memory.ttl);
          if (this.distributedManager.isRedisAvailable()) {
            await this.distributedManager.setInRedis(key, firestoreResult, this.config.redis?.ttl);
          }
          this.statsManager.recordCacheHit('firestore', Date.now() - startTime);
          return firestoreResult;
        }
      }

      // Cache miss
      this.statsManager.recordCacheMiss(Date.now() - startTime);
      return null;

    } catch (error) {
      console.error('[CacheCoreService] Error during cache lookup:', error);
      this.statsManager.recordCacheMiss(Date.now() - startTime);
      return null;
    }
  }

  /**
   * Set value in all configured cache tiers
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const memoryTTL = ttl || this.config.memory.ttl;
      const redisTTL = ttl || this.config.redis?.ttl;
      const firestoreTTL = ttl || this.config.firestore?.ttl;

      // Set in all configured tiers
      const promises = [
        this.memoryManager.set(key, value, memoryTTL)
      ];

      if (this.distributedManager.isRedisAvailable()) {
        promises.push(this.distributedManager.setInRedis(key, value, redisTTL));
      }

      if (this.distributedManager.isFirestoreAvailable()) {
        promises.push(this.distributedManager.setInFirestore(key, value, firestoreTTL));
      }

      await Promise.all(promises);

    } catch (error) {
      console.error('[CacheCoreService] Error during cache set:', error);
      throw error;
    }
  }

  /**
   * Delete from all cache tiers
   */
  async delete(key: string): Promise<void> {
    try {
      const promises = [
        Promise.resolve(this.memoryManager.delete(key))
      ];

      if (this.distributedManager.isRedisAvailable()) {
        promises.push(this.distributedManager.deleteFromRedis(key));
      }

      if (this.distributedManager.isFirestoreAvailable()) {
        promises.push(this.distributedManager.deleteFromFirestore(key));
      }

      await Promise.all(promises);
    } catch (error) {
      console.error('[CacheCoreService] Error during cache delete:', error);
      throw error;
    }
  }

  /**
   * Clear all cache tiers
   */
  async clear(): Promise<void> {
    try {
      const promises = [
        Promise.resolve(this.memoryManager.clear())
      ];

      if (this.distributedManager.isRedisAvailable()) {
        promises.push(this.distributedManager.clearRedis());
      }

      if (this.distributedManager.isFirestoreAvailable()) {
        promises.push(this.distributedManager.clearFirestore());
      }

      await Promise.all(promises);
      this.statsManager.resetStats();
    } catch (error) {
      console.error('[CacheCoreService] Error during cache clear:', error);
      throw error;
    }
  }

  // ============================================================================
  // CACHE KEY UTILITIES
  // ============================================================================

  /**
   * Generate cache key for recommendations
   */
  generateRecommendationsKey(params: {
    userId: string;
    jobId: string;
    targetRole?: string;
    industryKeywords?: string[];
    version?: string;
  }): string {
    const keywordHash = params.industryKeywords?.length 
      ? createHash('md5').update(params.industryKeywords.sort().join(',')).digest('hex')
      : 'none';
    
    const version = params.version || '1.0';
    return `rec:${params.userId}:${params.jobId}:${params.targetRole || 'general'}:${keywordHash}:${version}`;
  }

  // ============================================================================
  // MONITORING & HEALTH
  // ============================================================================

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.statsManager.getStats();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Partial<PerformanceMetrics> {
    return this.statsManager.getPerformanceMetrics();
  }

  /**
   * Check if cache system is healthy
   */
  isHealthy(): boolean {
    return this.statsManager.isHealthy();
  }

  /**
   * Get detailed health status
   */
  getHealthStatus() {
    return this.statsManager.getHealthStatus();
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.statsManager.dispose();
  }
}