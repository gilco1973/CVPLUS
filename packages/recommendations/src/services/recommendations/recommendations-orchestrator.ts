/**
 * @cvplus/recommendations - Recommendations Orchestrator
 * 
 * Main orchestrator for recommendation operations. Coordinates caching, retry logic,
 * execution, and performance monitoring. Provides the main public API.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { generateId } from '@cvplus/core';
import { CacheService } from '../cache.service';
import { RecommendationsExecutor } from './recommendations-executor';
import { PerformanceMetricsManager } from './performance-metrics-manager';
import { CacheOperationsManager } from './cache-operations-manager';
import { retryUtil } from '../../utils/retry';
import type {
  GetRecommendationsParams,
  GetRecommendationsResponse,
  ApplyImprovementsParams,
  ApplyImprovementsResponse,
  PreviewImprovementParams,
  PreviewImprovementResponse,
  PerformanceMetrics,
  CacheStats,
  RecommendationError
} from '../../types';

// ============================================================================
// CONSTANTS
// ============================================================================

const PERFORMANCE_TARGETS = {
  maxResponseTime: 30000, // 30 seconds
  maxTimeoutRate: 2, // 2%
  minCacheHitRate: 60, // 60%
  maxErrorRate: 2 // 2%
};

// ============================================================================
// RECOMMENDATIONS ORCHESTRATOR
// ============================================================================

export class RecommendationsOrchestrator {
  private cacheService: CacheService;
  private cacheOps: CacheOperationsManager;
  private executor: RecommendationsExecutor;
  private metricsManager: PerformanceMetricsManager;

  constructor() {
    this.cacheService = new CacheService();
    this.cacheOps = new CacheOperationsManager(this.cacheService);
    this.executor = new RecommendationsExecutor();
    this.metricsManager = new PerformanceMetricsManager(this.cacheService);
  }

  // ============================================================================
  // CORE OPERATIONS
  // ============================================================================

  /**
   * Get recommendations with caching and retry logic
   */
  async getRecommendations(params: GetRecommendationsParams): Promise<GetRecommendationsResponse> {
    const requestId = generateId();
    const startTime = Date.now();
    
    try {
      console.log(`[RecommendationsOrchestrator] Starting request ${requestId}`, { params });

      // Generate cache key
      const cacheKey = this.cacheOps.generateRecommendationsKey({
        userId: params.userId || 'anonymous',
        jobId: params.jobId,
        targetRole: params.targetRole,
        industryKeywords: params.industryKeywords,
        version: '1.0'
      });

      // Try cache first unless force regenerate
      if (!params.forceRegenerate) {
        const cachedResult = await this.cacheOps.getCachedRecommendations<GetRecommendationsResponse['data']>(cacheKey);
        if (cachedResult) {
          const response: GetRecommendationsResponse = {
            success: true,
            data: {
              ...cachedResult,
              cached: true,
              cacheAge: cachedResult.generatedAt ? Date.now() - new Date(cachedResult.generatedAt).getTime() : 0
            }
          };
          
          this.metricsManager.recordSuccess(Date.now() - startTime, true);
          console.log(`[RecommendationsOrchestrator] Cache HIT for request ${requestId}`);
          return response;
        }
      }

      // Execute with retry logic
      const result = await retryUtil.executeWithRetry(
        () => this.executor.executeRecommendationGeneration(params, requestId),
        {
          requestId,
          operationName: 'getRecommendations',
          timeout: PERFORMANCE_TARGETS.maxResponseTime
        }
      );

      // Cache successful result
      await this.cacheOps.cacheRecommendations(cacheKey, result.data);

      this.metricsManager.recordSuccess(Date.now() - startTime, false);
      console.log(`[RecommendationsOrchestrator] Request ${requestId} completed successfully`);
      
      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.metricsManager.recordError(error as RecommendationError, processingTime);
      
      console.error(`[RecommendationsOrchestrator] Request ${requestId} failed:`, error);
      
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'RECOMMENDATION_ERROR',
          details: error instanceof Error ? { stack: error.stack } : {}
        }
      };
    }
  }

  /**
   * Apply improvements with validation and caching
   */
  async applyImprovements(params: ApplyImprovementsParams): Promise<ApplyImprovementsResponse> {
    const requestId = generateId();
    const startTime = Date.now();
    
    try {
      console.log(`[RecommendationsOrchestrator] Applying improvements ${requestId}`, { 
        jobId: params.jobId,
        recommendationCount: params.selectedRecommendationIds.length 
      });

      // Execute with retry logic
      const result = await retryUtil.executeWithRetry(
        () => this.executor.executeImprovementApplication(params, requestId),
        {
          requestId,
          operationName: 'applyImprovements',
          timeout: PERFORMANCE_TARGETS.maxResponseTime
        }
      );

      // Invalidate related cache entries
      await this.cacheOps.invalidateRelatedCache(params.jobId, params.userId);

      this.metricsManager.recordSuccess(Date.now() - startTime, false);
      console.log(`[RecommendationsOrchestrator] Improvements applied successfully ${requestId}`);
      
      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.metricsManager.recordError(error as RecommendationError, processingTime);
      
      console.error(`[RecommendationsOrchestrator] Apply improvements failed ${requestId}:`, error);
      
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to apply improvements',
          code: 'IMPROVEMENT_ERROR',
          details: error instanceof Error ? { stack: error.stack } : {}
        }
      };
    }
  }

  /**
   * Preview improvement with caching
   */
  async previewImprovement(params: PreviewImprovementParams): Promise<PreviewImprovementResponse> {
    const requestId = generateId();
    const startTime = Date.now();
    
    try {
      console.log(`[RecommendationsOrchestrator] Previewing improvement ${requestId}`, { params });

      // Check cache for preview
      const cacheKey = this.cacheOps.generatePreviewKey(params.jobId, params.recommendationId);
      const cachedPreview = await this.cacheOps.getCachedRecommendations<PreviewImprovementResponse['data']>(cacheKey);
      
      if (cachedPreview) {
        this.metricsManager.recordSuccess(Date.now() - startTime, true);
        return {
          success: true,
          data: cachedPreview
        };
      }

      // Execute preview generation
      const result = await retryUtil.executeWithRetry(
        () => this.executor.executePreviewGeneration(params, requestId),
        {
          requestId,
          operationName: 'previewImprovement',
          timeout: 30000 // Shorter timeout for previews
        }
      );

      // Cache preview result (shorter TTL)
      await this.cacheOps.cachePreview(cacheKey, result.data);

      this.metricsManager.recordSuccess(Date.now() - startTime, false);
      console.log(`[RecommendationsOrchestrator] Preview generated successfully ${requestId}`);
      
      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.metricsManager.recordError(error as RecommendationError, processingTime);
      
      console.error(`[RecommendationsOrchestrator] Preview failed ${requestId}:`, error);
      
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to generate preview',
          code: 'PREVIEW_ERROR',
          details: error instanceof Error ? { stack: error.stack } : {}
        }
      };
    }
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  /**
   * Invalidate cache for specific job
   */
  async invalidateCache(jobId: string): Promise<void> {
    return this.cacheOps.invalidateJobCache(jobId);
  }

  /**
   * Refresh all cache
   */
  async refreshCache(): Promise<void> {
    return this.cacheOps.clearCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return this.cacheOps.getCacheStats();
  }

  // ============================================================================
  // MONITORING & HEALTH
  // ============================================================================

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return this.metricsManager.getPerformanceMetrics();
  }

  /**
   * Check service health
   */
  isHealthy(): boolean {
    return this.metricsManager.isHealthy();
  }

  /**
   * Get detailed health status
   */
  getHealthStatus() {
    return this.metricsManager.getHealthStatus();
  }

  /**
   * Reset metrics (for testing)
   */
  resetMetrics(): void {
    this.metricsManager.resetMetrics();
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.metricsManager.dispose();
    this.cacheService.dispose();
  }
}