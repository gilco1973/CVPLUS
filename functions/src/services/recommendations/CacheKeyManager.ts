/**
 * Cache key utilities for consistent key generation
 * Extracted from CacheManager.ts to comply with 200-line rule
 */
export class CacheKeyManager {
  /**
   * Generates a cache key for recommendations
   */
  static recommendationKey(
    jobId: string,
    userId: string,
    targetRole?: string,
    industryKeywords?: string[],
    forceRegenerate?: boolean
  ): string {
    const roleKey = targetRole || 'no-role';
    const keywordsKey = (industryKeywords || []).sort().join(',') || 'no-keywords';
    const forceKey = forceRegenerate ? 'force' : 'normal';
    return `rec:${jobId}:${userId}:${roleKey}:${keywordsKey}:${forceKey}`;
  }

  /**
   * Generates a cache key for CV analysis
   */
  static cvAnalysisKey(jobId: string, userId: string): string {
    return `cv:${jobId}:${userId}`;
  }

  /**
   * Generates a cache key for user preferences
   */
  static userPreferencesKey(userId: string): string {
    return `prefs:${userId}`;
  }

  /**
   * Generates a cache key for transformation results
   */
  static transformationKey(jobId: string, recommendationIds: string[]): string {
    const idsKey = recommendationIds.sort().join(',');
    return `transform:${jobId}:${idsKey}`;
  }

  /**
   * Generates a cache key for preview results
   */
  static previewKey(jobId: string, recommendationId: string): string {
    return `preview:${jobId}:${recommendationId}`;
  }

  /**
   * Gets all cache keys for a specific job (for invalidation)
   */
  static getJobKeys(jobId: string): string {
    return `*:${jobId}:*`;
  }

  /**
   * Gets all cache keys for a specific user (for invalidation)
   */
  static getUserKeys(userId: string): string {
    return `*:${userId}:*`;
  }

  /**
   * Generates a cache key with custom parameters
   */
  static customKey(prefix: string, ...parts: string[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * Parses a cache key to extract components
   */
  static parseKey(key: string): {
    prefix: string;
    parts: string[];
  } {
    const segments = key.split(':');
    return {
      prefix: segments[0] || '',
      parts: segments.slice(1)
    };
  }

  /**
   * Validates if a key matches a pattern
   */
  static matchesPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }

  /**
   * Generates a cache key with expiration timestamp
   */
  static keyWithExpiration(baseKey: string, ttlMs: number): string {
    const expirationTime = Date.now() + ttlMs;
    return `${baseKey}:exp:${expirationTime}`;
  }

  /**
   * Checks if a key with expiration is expired
   */
  static isExpiredKey(key: string): boolean {
    if (!key.includes(':exp:')) {
      return false; // No expiration info
    }
    
    const parts = key.split(':exp:');
    const expirationTime = parseInt(parts[1], 10);
    return Date.now() > expirationTime;
  }

  /**
   * Extracts base key from key with expiration
   */
  static getBaseKey(key: string): string {
    const expIndex = key.indexOf(':exp:');
    return expIndex !== -1 ? key.substring(0, expIndex) : key;
  }
}