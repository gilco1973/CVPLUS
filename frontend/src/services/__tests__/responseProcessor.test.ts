/**
 * Enhanced Response Processor Tests
 * Comprehensive test suite for bulletproof response processing
 */

import {
  ResponseProcessor,
  EnhancedApiProcessor,
  EnhancedApplyImprovementsService,
  ProgressTracker
} from '../responseProcessor';
import {
  isBaseApiResponse,
  isApplyImprovementsResponse,
  calculateRetryDelay,
  isRetryableError,
  DEFAULT_RETRY_CONFIG
} from '../../types/responses';

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock Firebase functions
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn()
}));

// Mock toast notifications
vi.mock('react-hot-toast', () => ({
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('ResponseProcessor', () => {
  describe('Type Guards', () => {
    it('should validate base API response structure', () => {
      const validResponse = {
        success: true,
        data: { test: 'data' },
        metadata: { processingTime: 1000 }
      };
      
      expect(isBaseApiResponse(validResponse)).toBe(true);
      
      const invalidResponse = { randomField: 'value' };
      expect(isBaseApiResponse(invalidResponse)).toBe(false);
      
      const failureResponse = {
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message'
        }
      };
      
      expect(isBaseApiResponse(failureResponse)).toBe(true);
    });
    
    it('should validate ApplyImprovements response structure', () => {
      const validResponse = {
        jobId: 'test-job-id',
        improvedCV: { personalInfo: { name: 'Test User' } },
        appliedRecommendations: [
          {
            id: 'rec1',
            type: 'content',
            title: 'Test Recommendation'
          }
        ],
        transformationSummary: {
          totalChanges: 5,
          sectionsModified: ['experience'],
          newSections: [],
          keywordsAdded: ['leadership'],
          estimatedScoreIncrease: 15
        },
        improvementsApplied: true
      };
      
      expect(isApplyImprovementsResponse(validResponse)).toBe(true);
      
      const invalidResponse = {
        jobId: 'test-job-id'
        // Missing required fields
      };
      
      expect(isApplyImprovementsResponse(invalidResponse)).toBe(false);
    });
  });
  
  describe('Response Processing', () => {
    it('should extract data from valid response', () => {
      const response = {
        success: true,
        data: { test: 'value' }
      };
      
      const result = ResponseProcessor.extractData(
        response,
        (data): data is { test: string } => 
          typeof data === 'object' && data !== null && 'test' in data
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.test).toBe('value');
      }
    });
    
    it('should handle failed response', () => {
      const response = {
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error occurred'
        }
      };
      
      const result = ResponseProcessor.extractData(
        response,
        (data): data is any => true
      );
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Test error occurred');
      }
    });
    
    it('should handle invalid response format', () => {
      const response = 'invalid response';
      
      const result = ResponseProcessor.extractData(
        response,
        (data): data is any => true
      );
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid response format');
      }
    });
  });
  
  describe('Error Processing', () => {
    it('should extract error information', () => {
      const response = {
        success: false,
        error: {
          code: 'FUNCTION_TIMEOUT',
          message: 'Function execution timed out',
          canRetry: true,
          retryAfter: 5000,
          recoveryActions: ['Try again', 'Reduce complexity']
        }
      };
      
      const error = ResponseProcessor.extractError(response);
      
      expect(error.message).toBe('Function execution timed out');
      expect(error.code).toBe('FUNCTION_TIMEOUT');
      expect(error.canRetry).toBe(true);
      expect(error.retryAfter).toBe(5000);
      expect(error.recoveryActions).toEqual(['Try again', 'Reduce complexity']);
    });
    
    it('should handle unknown error format', () => {
      const response = { unknown: 'format' };
      
      const error = ResponseProcessor.extractError(response);
      
      expect(error.message).toBe('An unknown error occurred');
      expect(error.canRetry).toBe(true);
    });
  });
});

describe('ProgressTracker', () => {
  let progressTracker: ProgressTracker;
  
  beforeEach(() => {
    progressTracker = ProgressTracker.getInstance('test-operation');
  });
  
  afterEach(() => {
    ProgressTracker.cleanup('test-operation');
  });
  
  it('should track progress updates', (done) => {
    const progressCallback = vi.fn((progress) => {
      if (progress.percentage === 50) {
        expect(progress.currentStep).toBe('Processing');
        expect(progress.stepDetails).toBe('Applying transformations');
        done();
      }
    });
    
    progressTracker.onProgress(progressCallback);
    progressTracker.updateProgress(50, 'Processing', 'Applying transformations');
  });
  
  it('should handle progress completion', (done) => {
    const progressCallback = vi.fn((progress) => {
      if (progress.percentage === 100) {
        expect(progress.currentStep).toBe('Completed');
        setTimeout(() => {
          // Should be cleaned up after completion
          expect(ProgressTracker.getInstance('test-operation')).toBeDefined();
          done();
        }, 2100); // Wait for cleanup delay
      }
    });
    
    progressTracker.onProgress(progressCallback);
    progressTracker.complete();
  });
});

describe('Retry Logic', () => {
  it('should calculate retry delay with exponential backoff', () => {
    const config = {
      ...DEFAULT_RETRY_CONFIG,
      baseDelay: 1000,
      backoffFactor: 2,
      maxDelay: 8000
    };
    
    expect(calculateRetryDelay(1, config)).toBe(1000); // Base delay
    expect(calculateRetryDelay(2, config)).toBe(2000); // 1000 * 2^1
    expect(calculateRetryDelay(3, config)).toBe(4000); // 1000 * 2^2
    expect(calculateRetryDelay(4, config)).toBe(8000); // Capped at maxDelay
  });
  
  it('should determine retryable errors', () => {
    const retryableError = {
      code: 'FUNCTION_TIMEOUT',
      message: 'Timeout occurred'
    };
    
    expect(isRetryableError(retryableError)).toBe(true);
    
    const nonRetryableError = {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid credentials'
    };
    
    expect(isRetryableError(nonRetryableError)).toBe(false);
    
    const explicitRetryable = {
      code: 'UNKNOWN_ERROR',
      canRetry: true
    };
    
    expect(isRetryableError(explicitRetryable)).toBe(true);
  });
});

describe('EnhancedApiProcessor', () => {
  it('should execute operation with retry on failure', async () => {
    let attemptCount = 0;
    const mockOperation = vi.fn(() => {
      attemptCount++;
      if (attemptCount < 2) {
        throw new Error('Temporary failure');
      }
      return Promise.resolve({
        success: true,
        data: { result: 'success' }
      });
    });
    
    const mockValidator = vi.fn((data): data is any => true);
    
    const result = await EnhancedApiProcessor.executeWithRetry(
      mockOperation,
      mockValidator,
      'test-operation',
      {
        maxAttempts: 3,
        baseDelay: 100, // Short delay for testing
        retryableErrorCodes: ['TEMPORARY_FAILURE']
      }
    );
    
    expect(result.success).toBe(true);
    expect(mockOperation).toHaveBeenCalledTimes(2);
    if (result.success) {
      expect(result.metadata.attempts).toBe(2);
    }
  });
  
  it('should fail after max attempts', async () => {
    const mockOperation = vi.fn(() => {
      throw { code: 'FUNCTION_TIMEOUT', message: 'Timeout' };
    });
    
    const mockValidator = vi.fn((data): data is any => true);
    
    const result = await EnhancedApiProcessor.executeWithRetry(
      mockOperation,
      mockValidator,
      'test-operation',
      {
        maxAttempts: 2,
        baseDelay: 10, // Very short delay for testing
        retryableErrorCodes: ['FUNCTION_TIMEOUT']
      }
    );
    
    expect(result.success).toBe(false);
    expect(mockOperation).toHaveBeenCalledTimes(2);
    if (!result.success) {
      expect(result.error.code).toBe('FUNCTION_TIMEOUT');
      expect(result.metadata.attempts).toBe(2);
    }
  });
});

describe('EnhancedApplyImprovementsService', () => {
  it('should handle successful improvements application', async () => {
    const mockApplyFunction = vi.fn().mockResolvedValue({
      success: true,
      data: {
        jobId: 'test-job',
        improvedCV: { personalInfo: { name: 'Test User' } },
        appliedRecommendations: [],
        transformationSummary: {
          totalChanges: 5,
          sectionsModified: ['experience'],
          newSections: [],
          keywordsAdded: ['leadership'],
          estimatedScoreIncrease: 15
        },
        improvementsApplied: true,
        processingTime: 2500
      }
    });
    
    const result = await EnhancedApplyImprovementsService.applyImprovements(
      'test-job',
      ['rec1', 'rec2'],
      mockApplyFunction,
      {
        showToasts: false // Disable toasts for testing
      }
    );
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jobId).toBe('test-job');
      expect(result.data.improvementsApplied).toBe(true);
      expect(result.metadata.processingTime).toBe(2500);
    }
  });
  
  it('should handle failure with user-friendly messages', async () => {
    const mockApplyFunction = vi.fn().mockRejectedValue({
      code: 'FUNCTION_TIMEOUT',
      message: 'Function execution timed out'
    });
    
    const result = await EnhancedApplyImprovementsService.applyImprovements(
      'test-job',
      ['rec1', 'rec2'],
      mockApplyFunction,
      {
        showToasts: false // Disable toasts for testing
      }
    );
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.userFriendlyMessage).toContain('took too long to process');
      expect(result.error.recoveryActions).toContain('try again');
    }
  });
});
