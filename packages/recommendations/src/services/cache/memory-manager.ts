/**
 * @cvplus/recommendations - Memory Cache Manager
 * 
 * Handles in-memory cache operations with intelligent eviction strategies.
 * Supports LRU, LFU, and FIFO eviction policies.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import type { CacheEntry, CacheConfiguration } from '../../types';

export class MemoryManager {
  private memoryCache = new Map<string, CacheEntry>();
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;
  private config: CacheConfiguration['memory'];

  constructor(config: CacheConfiguration['memory']) {
    this.config = config;
  }

  /**
   * Get value from memory cache
   */
  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (this.isExpired(entry)) {
      this.delete(key);
      return null;
    }

    // Update access tracking for LRU
    entry.accessCount++;
    entry.lastAccessed = new Date();
    this.accessOrder.set(key, ++this.accessCounter);

    return entry.value as T;
  }

  /**
   * Set value in memory cache with eviction
   */
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    // Check if we need to evict entries
    if (this.memoryCache.size >= this.config.maxSize) {
      await this.evictEntries(1);
    }

    const now = new Date();
    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttl),
      accessCount: 1,
      lastAccessed: now,
      size: this.calculateSize(value)
    };

    this.memoryCache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  /**
   * Delete from memory cache
   */
  delete(key: string): void {
    this.memoryCache.delete(key);
    this.accessOrder.delete(key);
  }

  /**
   * Clear all memory cache
   */
  clear(): void {
    this.memoryCache.clear();
    this.accessOrder.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.memoryCache.size;
  }

  /**
   * Get memory usage in bytes
   */
  getMemoryUsage(): number {
    return Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + entry.size, 0);
  }

  /**
   * Get average age of cached entries
   */
  getAverageAge(): number {
    if (this.memoryCache.size === 0) return 0;

    const totalAge = Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + (Date.now() - entry.createdAt.getTime()), 0);
    
    return totalAge / this.memoryCache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanupExpired(): string[] {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt.getTime() < now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));
    return expiredKeys;
  }

  /**
   * Get all cache entries (for inspection)
   */
  getAllEntries(): Array<[string, CacheEntry]> {
    return Array.from(this.memoryCache.entries());
  }

  /**
   * Evict entries based on configured strategy
   */
  private async evictEntries(count: number): Promise<number> {
    let toEvict: string[] = [];

    switch (this.config.evictionPolicy) {
      case 'LRU':
        toEvict = this.getLRUEntries(count);
        break;
      case 'LFU':
        toEvict = this.getLFUEntries(count);
        break;
      case 'FIFO':
        toEvict = this.getFIFOEntries(count);
        break;
    }

    toEvict.forEach(key => this.delete(key));
    return toEvict.length;
  }

  /**
   * Get least recently used entries
   */
  private getLRUEntries(count: number): string[] {
    return Array.from(this.accessOrder.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, count)
      .map(([key]) => key);
  }

  /**
   * Get least frequently used entries
   */
  private getLFUEntries(count: number): string[] {
    return Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].accessCount - b[1].accessCount)
      .slice(0, count)
      .map(([key]) => key);
  }

  /**
   * Get first in, first out entries
   */
  private getFIFOEntries(count: number): string[] {
    return Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime())
      .slice(0, count)
      .map(([key]) => key);
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return entry.expiresAt.getTime() < Date.now();
  }

  /**
   * Calculate size of value for memory tracking
   */
  private calculateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 0;
    }
  }
}