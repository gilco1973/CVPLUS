/**
 * Enhanced Response Processing Service
 * Provides bulletproof response handling with automatic retry and error recovery
 */

import {
  BaseApiResponse,
  ApplyImprovementsResponse,
  ResponseProcessor,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  calculateRetryDelay,
  isRetryableError,
  isApplyImprovementsResponse
} from '../types/responses';
import { logError, getErrorMessage } from '../utils/errorHandling';
import { toast } from 'react-hot-toast';

/**
 * Progress Tracking for Long-Running Operations
 */
export class ProgressTracker {
  private static instances = new Map<string, ProgressTracker>();
  
  private progressCallbacks = new Set<(progress: {
    percentage: number;
    currentStep: string;
    estimatedTimeRemaining?: number;
    stepDetails?: string;
  }) => void>();
  
  private currentProgress = {
    percentage: 0,
    currentStep: 'Initializing',
    estimatedTimeRemaining: undefined,
    stepDetails: undefined
  };
  
  private constructor(private operationId: string) {}
  
  static getInstance(operationId: string): ProgressTracker {
    if (!this.instances.has(operationId)) {
      this.instances.set(operationId, new ProgressTracker(operationId));
    }
    return this.instances.get(operationId)!;
  }
  
  static cleanup(operationId: string): void {
    this.instances.delete(operationId);
  }
  
  onProgress(callback: typeof this.progressCallbacks extends Set<infer T> ? T : never): () => void {
    this.progressCallbacks.add(callback);
    
    // Immediately call with current progress
    callback(this.currentProgress);
    
    // Return cleanup function
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }
  
  updateProgress(
    percentage: number,
    currentStep: string,
    stepDetails?: string,
    estimatedTimeRemaining?: number
  ): void {
    this.currentProgress = {
      percentage: Math.max(0, Math.min(100, percentage)),
      currentStep,
      stepDetails,
      estimatedTimeRemaining
    };
    
    // Notify all callbacks
    this.progressCallbacks.forEach(callback => {
      try {
        callback(this.currentProgress);
      } catch (error) {
        console.error('Progress callback error:', error);
      }
    });
  }
  
  complete(): void {
    this.updateProgress(100, 'Completed');
    
    // Clean up after a delay
    setTimeout(() => {
      ProgressTracker.cleanup(this.operationId);
    }, 2000);
  }
  
  error(errorMessage: string): void {
    this.updateProgress(this.currentProgress.percentage, 'Error', errorMessage);
  }
}

/**
 * Enhanced API Operation Executor
 */
export class EnhancedApiProcessor {
  /**
   * Execute operation with automatic retry and progress tracking
   */
  static async executeWithRetry<T>(
    operation: () => Promise<unknown>,
    validator: (value: unknown) => boolean,
    context: string,
    config: Partial<RetryConfig & {
      progressTracker?: ProgressTracker;
      onProgress?: (attempt: number, error?: string) => void;
    }> = {}
  ): Promise<{
    success: true;
    data: T;
    metadata: {
      attempts: number;
      totalTime: number;
      fromCache: boolean;
    };
  } | {
    success: false;
    error: {
      message: string;
      code?: string;
      canRetry: boolean;
      recoveryActions?: string[];
    };
    metadata: {
      attempts: number;
      totalTime: number;
    };
  }> {
    const startTime = Date.now();
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        // Update progress
        config.progressTracker?.updateProgress(
          Math.round((attempt - 1) / retryConfig.maxAttempts * 80), // Reserve 20% for processing
          attempt === 1 ? 'Processing request' : `Retrying (attempt ${attempt}/${retryConfig.maxAttempts})`,
          attempt > 1 ? `Previous attempt failed, retrying with exponential backoff` : undefined
        );
        
        config.onProgress?.(attempt);
        
        // Execute the operation
        const response = await operation();
        
        // Process response
        config.progressTracker?.updateProgress(90, 'Processing response');
        
        const result = ResponseProcessor.extractData<T>(response, validator);
        
        if (result.success) {
          config.progressTracker?.complete();
          
          return {
            success: true,
            data: result.data,
            metadata: {
              attempts: attempt,
              totalTime: Date.now() - startTime,
              fromCache: false
            }
          };
        } else {
          throw new Error(result.error);
        }
        
      } catch (error: unknown) {
        lastError = error;
        
        const errorInfo = ResponseProcessor.extractError(error);
        
        logError(`${context} (attempt ${attempt})`, error, {
          attempt,
          maxAttempts: retryConfig.maxAttempts,
          errorCode: errorInfo.code
        });
        
        config.onProgress?.(attempt, getErrorMessage(error));
        config.progressTracker?.error(`Attempt ${attempt} failed: ${getErrorMessage(error)}`);
        
        // Check if we should retry
        const shouldRetry = attempt < retryConfig.maxAttempts && 
                           isRetryableError(errorInfo, retryConfig);
        
        if (!shouldRetry) {
          // Final failure
          config.progressTracker?.error('Operation failed');
          
          return {
            success: false,
            error: {
              message: errorInfo.message,
              code: errorInfo.code,
              canRetry: false,
              recoveryActions: errorInfo.recoveryActions
            },
            metadata: {
              attempts: attempt,
              totalTime: Date.now() - startTime
            }
          };
        }
        
        // Wait before retry
        if (attempt < retryConfig.maxAttempts) {
          const delay = calculateRetryDelay(attempt, retryConfig);
          
          config.progressTracker?.updateProgress(
            Math.round(attempt / retryConfig.maxAttempts * 80),
            `Waiting to retry`,
            `Retrying in ${Math.round(delay / 1000)} seconds...`
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // This should never be reached, but adding for type safety
    const finalError = ResponseProcessor.extractError(lastError);
    config.progressTracker?.error('All attempts failed');
    
    return {
      success: false,
      error: {
        message: finalError.message,
        code: finalError.code,
        canRetry: false
      },
      metadata: {
        attempts: retryConfig.maxAttempts,
        totalTime: Date.now() - startTime
      }
    };
  }
}

/**
 * Apply Improvements Service with Enhanced Response Processing
 */
export class EnhancedApplyImprovementsService {
  /**
   * Apply improvements with enhanced response processing and user feedback
   */
  static async applyImprovements(
    jobId: string,
    selectedRecommendationIds: string[],
    applyImprovementsFunction: (params: {
      jobId: string;
      selectedRecommendationIds: string[];
      targetRole?: string;
      industryKeywords?: string[];
    }) => Promise<unknown>,
    options: {
      targetRole?: string;
      industryKeywords?: string[];
      onProgress?: (progress: {
        percentage: number;
        currentStep: string;
        stepDetails?: string;
        estimatedTimeRemaining?: number;
      }) => void;
      showToasts?: boolean;
    } = {}
  ): Promise<{
    success: true;
    data: ApplyImprovementsResponse;
    metadata: {
      attempts: number;
      totalTime: number;
      processingTime?: number;
    };
  } | {
    success: false;
    error: {
      message: string;
      code?: string;
      userFriendlyMessage: string;
      canRetry: boolean;
      recoveryActions: string[];
    };
    metadata: {
      attempts: number;
      totalTime: number;
    };
  }> {
    const operationId = `apply-improvements-${jobId}-${Date.now()}`;
    const progressTracker = ProgressTracker.getInstance(operationId);
    
    // Set up progress tracking
    let progressCleanup: (() => void) | undefined;
    if (options.onProgress) {
      progressCleanup = progressTracker.onProgress(options.onProgress);
    }
    
    const showToasts = options.showToasts !== false; // Default to true
    
    try {
      if (showToasts) {
        toast.loading(
          `Applying ${selectedRecommendationIds.length} improvement${selectedRecommendationIds.length > 1 ? 's' : ''} to your CV...`,
          { id: operationId, duration: Infinity }
        );
      }
      
      const result = await EnhancedApiProcessor.executeWithRetry<ApplyImprovementsResponse>(
        () => applyImprovementsFunction({
          jobId,
          selectedRecommendationIds,
          targetRole: options.targetRole,
          industryKeywords: options.industryKeywords
        }),
        isApplyImprovementsResponse,
        'applyImprovements',
        {
          progressTracker,
          maxAttempts: 3,
          baseDelay: 2000,
          retryableErrorCodes: [
            'FUNCTION_TIMEOUT',
            'INTERNAL_ERROR',
            'TEMPORARY_FAILURE',
            'RATE_LIMITED',
            'DEADLINE_EXCEEDED'
          ]
        }
      );
      
      if (result.success) {
        if (showToasts) {
          toast.success(
            `Successfully applied ${selectedRecommendationIds.length} improvement${selectedRecommendationIds.length > 1 ? 's' : ''} to your CV!`,
            { 
              id: operationId,
              duration: 4000,
              icon: '✅'
            }
          );
        }
        
        return {
          success: true,
          data: result.data,
          metadata: {
            attempts: result.metadata.attempts,
            totalTime: result.metadata.totalTime,
            processingTime: result.data.processingTime
          }
        };
      } else {
        // Enhanced error handling with user-friendly messages
        const userFriendlyMessage = this.getUserFriendlyErrorMessage(
          result.error.code,
          result.error.message,
          selectedRecommendationIds.length
        );
        
        const recoveryActions = result.error.recoveryActions || 
          this.getRecoveryActions(result.error.code);
        
        if (showToasts) {
          toast.error(userFriendlyMessage, {
            id: operationId,
            duration: 6000
          });
        }
        
        return {
          success: false,
          error: {
            ...result.error,
            userFriendlyMessage,
            recoveryActions
          },
          metadata: result.metadata
        };
      }
    } finally {
      progressCleanup?.();
      ProgressTracker.cleanup(operationId);
    }
  }
  
  /**
   * Generate user-friendly error messages based on error codes
   */
  private static getUserFriendlyErrorMessage(
    code?: string,
    originalMessage?: string,
    improvementCount?: number
  ): string {
    const count = improvementCount || 0;
    const plural = count > 1 ? 's' : '';
    
    switch (code) {
      case 'FUNCTION_TIMEOUT':
        return `The improvement${plural} took too long to process. This can happen with complex changes. Please try again or select fewer improvements.`;
        
      case 'RATE_LIMITED':
        return `Too many requests at once. Please wait a moment and try again.`;
        
      case 'INSUFFICIENT_CREDITS':
        return `You don't have enough credits to apply these improvements. Please check your account or upgrade your plan.`;
        
      case 'INVALID_JOB':
        return `Your CV data appears to be corrupted or outdated. Please try re-uploading your CV.`;
        
      case 'INVALID_RECOMMENDATIONS':
        return `Some of the selected improvements are no longer valid. Please refresh the page and try selecting different improvements.`;
        
      case 'INTERNAL_ERROR':
        return `A temporary system error occurred while processing your improvements. Please try again in a moment.`;
        
      case 'UNAUTHORIZED':
        return `Your session has expired. Please sign in again and try applying the improvements.`;
        
      default:
        if (originalMessage?.includes('timeout')) {
          return `The operation timed out. Please try again with fewer improvements or check your internet connection.`;
        }
        
        return originalMessage || `Failed to apply your CV improvements. Please try again or contact support if the issue persists.`;
    }
  }
  
  /**
   * Generate recovery actions based on error codes
   */
  private static getRecoveryActions(code?: string): string[] {
    switch (code) {
      case 'FUNCTION_TIMEOUT':
        return [
          'Try selecting fewer improvements to reduce processing time',
          'Check your internet connection',
          'Wait a few minutes and try again',
          'Break improvements into smaller batches'
        ];
        
      case 'RATE_LIMITED':
        return [
          'Wait 1-2 minutes before trying again',
          'Reduce the number of simultaneous requests',
          'Try during off-peak hours'
        ];
        
      case 'INSUFFICIENT_CREDITS':
        return [
          'Check your account balance',
          'Upgrade your plan for more credits',
          'Apply fewer improvements to stay within your limit'
        ];
        
      case 'INVALID_JOB':
        return [
          'Re-upload your CV file',
          'Refresh the page and start over',
          'Check if your CV file is corrupted',
          'Try a different file format (PDF recommended)'
        ];
        
      case 'UNAUTHORIZED':
        return [
          'Sign in to your account again',
          'Clear your browser cookies and cache',
          'Check if your session has expired'
        ];
        
      default:
        return [
          'Try again in a few moments',
          'Refresh the page if the problem persists',
          'Contact support if you continue experiencing issues',
          'Check your internet connection'
        ];
    }
  }
}
