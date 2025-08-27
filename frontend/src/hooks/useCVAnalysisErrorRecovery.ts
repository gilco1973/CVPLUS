import { useCallback, useEffect, useRef } from 'react';
import { useCVAnalysisState } from './useCVAnalysisState';
import { getErrorMessage, logError } from '../utils/errorHandling';
import toast from 'react-hot-toast';

/**
 * Custom hook for CV Analysis error recovery and user-friendly error handling
 * Provides graceful error recovery mechanisms specific to CV analysis workflows
 */
export function useCVAnalysisErrorRecovery() {
  const {
    error,
    isApplying,
    isMagicTransforming,
    selectedRecommendations,
    setError,
    setLoading,
    stopApplying,
    stopMagicTransform
  } = useCVAnalysisState();

  const retryCountRef = useRef<Record<string, number>>({});
  const maxRetries = 3;

  // Clear retry count when operation is successful
  useEffect(() => {
    if (!error && !isApplying && !isMagicTransforming) {
      retryCountRef.current = {};
    }
  }, [error, isApplying, isMagicTransforming]);

  // Generic error handler with recovery options
  const handleError = useCallback((
    error: unknown,
    context: string,
    options: {
      showToast?: boolean;
      clearLoading?: boolean;
      stopOperations?: boolean;
      recoverable?: boolean;
    } = {}
  ) => {
    const {
      showToast = true,
      clearLoading = true,
      stopOperations = true,
      recoverable = true
    } = options;

    const errorMessage = getErrorMessage(error);
    logError(error, context);

    // Update error state
    setError(errorMessage);

    // Clear loading states
    if (clearLoading) {
      setLoading(false);
    }

    // Stop ongoing operations
    if (stopOperations) {
      stopApplying();
      stopMagicTransform();
    }

    // Show user-friendly toast
    if (showToast) {
      const toastMessage = recoverable 
        ? `${errorMessage}. You can try again.`
        : errorMessage;
      
      toast.error(toastMessage, {
        duration: recoverable ? 4000 : 6000,
        position: 'top-center'
      });
    }

    return errorMessage;
  }, [setError, setLoading, stopApplying, stopMagicTransform]);

  // Specific error handlers for different scenarios
  const handleRecommendationLoadError = useCallback((error: unknown) => {
    return handleError(error, 'Loading recommendations', {
      showToast: true,
      clearLoading: true,
      recoverable: true
    });
  }, [handleError]);

  const handleApplyImprovementsError = useCallback((error: unknown) => {
    const errorMessage = getErrorMessage(error);
    
    // Check for specific error types and provide targeted recovery
    if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      return handleError(error, 'Apply improvements timeout', {
        showToast: true,
        clearLoading: true,
        recoverable: true
      });
    }
    
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return handleError(error, 'Apply improvements rate limit', {
        showToast: true,
        clearLoading: true,
        recoverable: true
      });
    }

    return handleError(error, 'Apply improvements failed', {
      showToast: true,
      clearLoading: true,
      recoverable: true
    });
  }, [handleError]);

  const handleMagicTransformError = useCallback((error: unknown) => {
    const errorMessage = getErrorMessage(error);
    
    // Provide specific guidance for magic transform errors
    if (errorMessage.includes('insufficient data')) {
      toast.error('Not enough CV data for Magic Transform. Try applying regular improvements first.', {
        duration: 6000,
        position: 'top-center'
      });
      return handleError(error, 'Magic transform insufficient data', {
        showToast: false,
        recoverable: false
      });
    }

    return handleError(error, 'Magic transform failed', {
      showToast: true,
      clearLoading: true,
      recoverable: true
    });
  }, [handleError]);

  // Retry mechanism with exponential backoff
  const retry = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetryAttempts: number = maxRetries
  ): Promise<T> => {
    const currentRetries = retryCountRef.current[operationName] || 0;
    
    try {
      const result = await operation();
      // Reset retry count on success
      delete retryCountRef.current[operationName];
      return result;
    } catch (error) {
      if (currentRetries < maxRetryAttempts) {
        retryCountRef.current[operationName] = currentRetries + 1;
        
        // Exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, currentRetries), 10000);
        
        toast.loading(`Retrying ${operationName}... (${currentRetries + 1}/${maxRetryAttempts})`, {
          duration: delay,
          position: 'top-center'
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        return retry(operation, operationName, maxRetryAttempts);
      } else {
        // Max retries reached
        delete retryCountRef.current[operationName];
        throw error;
      }
    }
  }, [maxRetries]);

  // Clear error and reset state
  const clearError = useCallback(() => {
    setError(null);
    retryCountRef.current = {};
  }, [setError]);

  // Check if operation can be retried
  const canRetry = useCallback((operationName: string) => {
    const currentRetries = retryCountRef.current[operationName] || 0;
    return currentRetries < maxRetries && !isApplying && !isMagicTransforming;
  }, [isApplying, isMagicTransforming, maxRetries]);

  // Get user-friendly error message with recovery suggestions
  const getErrorWithRecoverySuggestions = useCallback((errorMessage: string) => {
    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return {
        message: errorMessage,
        suggestions: [
          'Check your internet connection',
          'Try again in a few moments',
          'Refresh the page if the problem persists'
        ]
      };
    }
    
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return {
        message: errorMessage,
        suggestions: [
          'Wait a few minutes before trying again',
          'Consider reducing the number of selected improvements',
          'Try processing recommendations in smaller batches'
        ]
      };
    }
    
    if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
      return {
        message: errorMessage,
        suggestions: [
          'Please log in again',
          'Check your subscription status',
          'Contact support if the problem continues'
        ]
      };
    }

    if (errorMessage.includes('recommendations') && selectedRecommendations.length === 0) {
      return {
        message: 'No recommendations selected',
        suggestions: [
          'Select at least one recommendation to apply',
          'Try using the "Select All High Priority" option',
          'Refresh recommendations if none are available'
        ]
      };
    }
    
    return {
      message: errorMessage,
      suggestions: [
        'Try the operation again',
        'Refresh the page if the problem persists',
        'Contact support for assistance'
      ]
    };
  }, [selectedRecommendations.length]);

  // Recovery actions for specific error scenarios
  const recoveryActions = {
    retryRecommendations: useCallback(async (loadFunction: () => Promise<any>) => {
      try {
        clearError();
        setLoading(true);
        return await retry(loadFunction, 'load-recommendations');
      } catch (error) {
        handleRecommendationLoadError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    }, [clearError, setLoading, retry, handleRecommendationLoadError]),

    retryApplyImprovements: useCallback(async (applyFunction: () => Promise<any>) => {
      try {
        clearError();
        return await retry(applyFunction, 'apply-improvements');
      } catch (error) {
        handleApplyImprovementsError(error);
        throw error;
      }
    }, [clearError, retry, handleApplyImprovementsError]),

    retryMagicTransform: useCallback(async (transformFunction: () => Promise<any>) => {
      try {
        clearError();
        return await retry(transformFunction, 'magic-transform');
      } catch (error) {
        handleMagicTransformError(error);
        throw error;
      }
    }, [clearError, retry, handleMagicTransformError])
  };

  return {
    // State
    error,
    hasError: !!error,
    
    // Error handlers
    handleError,
    handleRecommendationLoadError,
    handleApplyImprovementsError,
    handleMagicTransformError,
    
    // Recovery mechanisms
    retry,
    clearError,
    canRetry,
    getErrorWithRecoverySuggestions,
    
    // Specific recovery actions
    recoveryActions,
    
    // Utility functions
    isRecoverable: (errorMessage: string) => 
      !errorMessage.includes('insufficient data') && 
      !errorMessage.includes('invalid') &&
      !errorMessage.includes('unauthorized'),
    
    getRetryCount: (operationName: string) => retryCountRef.current[operationName] || 0,
    remainingRetries: (operationName: string) => maxRetries - (retryCountRef.current[operationName] || 0)
  };
}