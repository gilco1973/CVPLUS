/**
 * Redis Client Service for CVPlus Performance Optimization
 * 
 * Provides Redis connection management, pooling, and error handling
 * for high-performance caching operations.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @created 2025-08-28
 */

import Redis, { RedisOptions } from 'ioredis';
import { logger } from 'firebase-functions';
import { config } from '../../config/environment';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keepAlive: number;
  connectTimeout: number;
  commandTimeout: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  totalRequests: number;
  responseTime: number;
  lastUpdated: Date;
}

class RedisClientService {
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private metrics: CacheMetrics;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 5;

  constructor() {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalRequests: 0,
      responseTime: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Initialize Redis connection with configuration
   */
  async initialize(): Promise<void> {
    if (this.client && this.isConnected) {
      return;
    }

    try {
      const redisConfig = this.getRedisConfig();
      this.client = new Redis(redisConfig);

      // Setup event handlers
      this.setupEventHandlers();

      // Test connection
      await this.testConnection();
      
      logger.info('Redis client initialized successfully', {
        host: redisConfig.host,
        port: redisConfig.port,
        db: redisConfig.db
      });
      
    } catch (error) {
      logger.error('Failed to initialize Redis client', { error });
      throw error;
    }
  }

  /**
   * Get Redis configuration based on environment
   */
  private getRedisConfig(): RedisOptions {
    const environment = process.env.NODE_ENV || 'development';
    
    // Base configuration
    const baseConfig: RedisOptions = {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      enableReadyCheck: true
    };

    if (environment === 'production') {
      // Production Redis Cloud configuration
      return {
        ...baseConfig,
        host: config.redis?.host || 'redis-production.example.com',
        port: config.redis?.port || 6379,
        password: config.redis?.password,
        db: 0,
        tls: config.redis?.tls || undefined
      };
    } else if (environment === 'staging') {
      // Staging configuration
      return {
        ...baseConfig,
        host: config.redis?.host || 'redis-staging.example.com',
        port: config.redis?.port || 6379,
        password: config.redis?.password,
        db: 1
      };
    } else {
      // Development - local Redis or fallback
      return {
        ...baseConfig,
        host: config.redis?.host || '127.0.0.1',
        port: config.redis?.port || 6379,
        db: 2
      };
    }
  }

  /**
   * Setup Redis event handlers for monitoring and error handling
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
      this.connectionAttempts = 0;
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error', { error });
      this.metrics.errors++;
      this.isConnected = false;
    });

    this.client.on('close', () => {
      logger.warn('Redis client connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', (delay) => {
      this.connectionAttempts++;
      logger.info('Redis client reconnecting', { 
        delay, 
        attempt: this.connectionAttempts 
      });
      
      if (this.connectionAttempts > this.maxConnectionAttempts) {
        logger.error('Max Redis reconnection attempts exceeded');
        this.client?.disconnect();
      }
    });
  }

  /**
   * Test Redis connection health
   */
  private async testConnection(): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    try {
      const result = await this.client.ping();
      if (result !== 'PONG') {
        throw new Error('Redis ping test failed');
      }
      this.isConnected = true;
    } catch (error) {
      logger.error('Redis connection test failed', { error });
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Get value from Redis with metrics tracking
   */
  async get(key: string): Promise<string | null> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      await this.ensureConnection();
      
      const value = await this.client!.get(key);
      
      if (value) {
        this.metrics.hits++;
        logger.debug('Cache hit', { key });
      } else {
        this.metrics.misses++;
        logger.debug('Cache miss', { key });
      }

      this.updateResponseTime(Date.now() - startTime);
      return value;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis GET error', { key, error });
      return null; // Graceful degradation
    }
  }

  /**
   * Set value in Redis with TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      await this.ensureConnection();
      
      let result;
      if (ttlSeconds) {
        result = await this.client!.setex(key, ttlSeconds, value);
      } else {
        result = await this.client!.set(key, value);
      }

      this.updateResponseTime(Date.now() - startTime);
      logger.debug('Cache set', { key, ttl: ttlSeconds });
      
      return result === 'OK';
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis SET error', { key, error });
      return false; // Graceful degradation
    }
  }

  /**
   * Delete key from Redis
   */
  async del(key: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      
      const result = await this.client!.del(key);
      logger.debug('Cache delete', { key, deleted: result > 0 });
      
      return result > 0;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis DEL error', { key, error });
      return false;
    }
  }

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      await this.ensureConnection();
      
      const keys = await this.client!.keys(pattern);
      if (keys.length === 0) return 0;
      
      const result = await this.client!.del(...keys);
      logger.debug('Cache pattern delete', { pattern, deleted: result });
      
      return result;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis DEL pattern error', { pattern, error });
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      
      const result = await this.client!.exists(key);
      return result === 1;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis EXISTS error', { key, error });
      return false;
    }
  }

  /**
   * Set TTL for existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      await this.ensureConnection();
      
      const result = await this.client!.expire(key, ttlSeconds);
      return result === 1;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis EXPIRE error', { key, error });
      return false;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];

    try {
      await this.ensureConnection();
      
      const values = await this.client!.mget(...keys);
      
      // Update metrics
      const hitCount = values.filter(v => v !== null).length;
      this.metrics.hits += hitCount;
      this.metrics.misses += (keys.length - hitCount);
      this.metrics.totalRequests += keys.length;
      
      return values;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis MGET error', { keys, error });
      return keys.map(() => null); // Return nulls for all keys
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs: Record<string, string>): Promise<boolean> {
    const pairs = Object.entries(keyValuePairs);
    if (pairs.length === 0) return true;

    try {
      await this.ensureConnection();
      
      const flatArray = pairs.flat();
      const result = await this.client!.mset(...flatArray);
      
      return result === 'OK';
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis MSET error', { keys: Object.keys(keyValuePairs), error });
      return false;
    }
  }

  /**
   * Ensure Redis connection is available
   */
  private async ensureConnection(): Promise<void> {
    if (!this.client) {
      await this.initialize();
    }

    if (!this.isConnected) {
      await this.testConnection();
    }
  }

  /**
   * Update response time metrics
   */
  private updateResponseTime(responseTime: number): void {
    this.metrics.responseTime = 
      (this.metrics.responseTime * 0.9) + (responseTime * 0.1); // Exponential moving average
    this.metrics.lastUpdated = new Date();
  }

  /**
   * Get cache performance metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return this.metrics.hits / this.metrics.totalRequests;
  }

  /**
   * Get cache error rate
   */
  getErrorRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return this.metrics.errors / this.metrics.totalRequests;
  }

  /**
   * Check if Redis is healthy
   */
  isHealthy(): boolean {
    return this.isConnected && this.getErrorRate() < 0.1; // Less than 10% error rate
  }

  /**
   * Reset metrics (for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalRequests: 0,
      responseTime: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Gracefully disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
      this.isConnected = false;
      logger.info('Redis client disconnected');
    }
  }
}

// Singleton instance
export const redisClient = new RedisClientService();