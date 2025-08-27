/**
 * Response Type Definitions for Enhanced API Processing
 * Provides comprehensive type safety for all API responses with proper validation
 */

import type { PrioritizedRecommendation } from './ats';
import type { CVParsedData } from './cvData';

/**
 * Base Response Structure
 * All API responses follow this consistent format
 */
export interface BaseApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    retryAfter?: number;
    canRetry?: boolean;
    recoveryActions?: string[];
  };
  metadata?: {
    processingTime?: number;
    attempt?: number;
    timestamp?: number;
    cached?: boolean;
    cacheAge?: number;
    version?: string;
  };
}

/**
 * Enhanced Apply Improvements Response
 * Structured response from the enhanced backend function
 */
export interface ApplyImprovementsResponse {
  jobId: string;
  improvedCV: CVParsedData;
  appliedRecommendations: PrioritizedRecommendation[];
  transformationSummary: {
    totalChanges: number;
    sectionsModified: string[];
    newSections: string[];
    keywordsAdded: string[];
    estimatedScoreIncrease: number;
  };
  comparisonReport: {
    originalScore: number;
    improvedScore: number;
    improvement: number;
    keyChanges: string[];
    sectionsChanged: string[];
    newFeatures: string[];
  };
  improvementsApplied: boolean;
  processingTime: number;
  attempt: number;
}

/**
 * Progress Status for Long-Running Operations
 */
export interface OperationProgress {
  status: 'pending' | 'processing' | 'completing' | 'completed' | 'failed';
  percentage: number;
  currentStep: string;
  estimatedTimeRemaining?: number;
  stepDetails?: string;
}

/**
 * Response Schema Validators
 * Type guards for runtime validation
 */

export function isBaseApiResponse(value: unknown): value is BaseApiResponse {
  if (typeof value !== 'object' || value === null) return false;
  
  const obj = value as Record<string, unknown>;
  
  // Must have success field
  if (typeof obj.success !== 'boolean') return false;
  
  // If success is false, must have error
  if (!obj.success && (!obj.error || typeof obj.error !== 'object')) return false;
  
  // If success is true, should have data
  if (obj.success && obj.data === undefined) return false;
  
  return true;
}

export function isApplyImprovementsResponse(value: unknown): value is ApplyImprovementsResponse {
  if (typeof value !== 'object' || value === null) return false;
  
  const obj = value as Record<string, unknown>;
  
  // Required fields
  const requiredFields = [
    'jobId', 'improvedCV', 'appliedRecommendations', 
    'transformationSummary', 'improvementsApplied'
  ];
  
  for (const field of requiredFields) {
    if (!(field in obj)) return false;
  }
  
  // Type checks for specific fields
  if (typeof obj.jobId !== 'string') return false;
  if (typeof obj.improvementsApplied !== 'boolean') return false;
  if (!Array.isArray(obj.appliedRecommendations)) return false;
  
  return true;
}

/**
 * Response Processing Utilities
 */
export class ResponseProcessor {
  /**
   * Safely extract data from API response with validation
   */
  static extractData<T>(
    response: unknown,
    validator: (value: unknown) => boolean
  ): { success: true; data: T } | { success: false; error: string } {
    try {
      // First validate base response structure
      if (!isBaseApiResponse(response)) {
        return {
          success: false,
          error: 'Invalid response format: missing required fields'
        };
      }
      
      // Check if response indicates success
      if (!response.success) {
        const errorMessage = response.error?.message || 'Operation failed';
        return {
          success: false,
          error: errorMessage
        };
      }
      
      // Validate the data field
      if (!validator(response.data)) {
        return {
          success: false,
          error: 'Response data validation failed: unexpected data structure'
        };
      }
      
      return {
        success: true,
        data: response.data as T
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Response processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Extract error information from failed response
   */
  static extractError(response: unknown): {
    message: string;
    code?: string;
    canRetry?: boolean;
    retryAfter?: number;
    recoveryActions?: string[];
  } {
    if (isBaseApiResponse(response) && response.error) {
      return {
        message: response.error.message,
        code: response.error.code,
        canRetry: response.error.canRetry,
        retryAfter: response.error.retryAfter,
        recoveryActions: response.error.recoveryActions
      };
    }
    
    return {
      message: 'An unknown error occurred',
      canRetry: true
    };
  }
  
  /**
   * Extract metadata from response
   */
  static extractMetadata(response: unknown): {
    processingTime?: number;
    attempt?: number;
    cached?: boolean;
    cacheAge?: number;
  } {
    if (isBaseApiResponse(response) && response.metadata) {
      return {
        processingTime: response.metadata.processingTime,
        attempt: response.metadata.attempt,
        cached: response.metadata.cached,
        cacheAge: response.metadata.cacheAge
      };
    }
    
    return {};
  }
}

/**
 * Error Recovery Strategies
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrorCodes?: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  retryableErrorCodes: [
    'FUNCTION_TIMEOUT',
    'INTERNAL_ERROR',
    'TEMPORARY_FAILURE',
    'RATE_LIMITED'
  ]
};

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

/**
 * Determine if error is retryable
 */
export function isRetryableError(
  error: { code?: string; canRetry?: boolean },
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  // Explicit canRetry flag takes precedence
  if (typeof error.canRetry === 'boolean') {
    return error.canRetry;
  }
  
  // Check against retryable error codes
  if (error.code && config.retryableErrorCodes) {
    return config.retryableErrorCodes.includes(error.code);
  }
  
  // Default to not retryable for unknown errors
  return false;
}
