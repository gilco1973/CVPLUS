/**
 * Firebase Function: customizePlaceholders (Package-based Implementation)
 * 
 * Uses the @cvplus/recommendations package for a clean, modular implementation.
 * This is the MISSING FUNCTIONALITY now implemented in the package.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { onCall } from 'firebase-functions/v2/https';
import { corsOptions } from '../../../../functions/src/config/cors';
import { firebaseFunctionsAdapter } from '../../src/integration/firebase/functions-adapter';

/**
 * Firebase Function: customizePlaceholders
 * MISSING FUNCTIONALITY - Now implemented via package
 */
export const customizePlaceholders = onCall(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    concurrency: 30, // Fast operation, high concurrency
    ...corsOptions,
  },
  async (request) => {
    const startTime = Date.now();
    
    try {
      console.log('[customizePlaceholders:package] Starting request', {
        userId: request.auth?.uid,
        jobId: request.data?.jobId,
        recommendationId: request.data?.recommendationId,
        placeholderCount: Object.keys(request.data?.placeholderValues || {}).length,
        timestamp: new Date().toISOString()
      });

      // Use the Firebase adapter from the package - NEW FUNCTIONALITY
      const result = await firebaseFunctionsAdapter.customizePlaceholders(request);

      const processingTime = Date.now() - startTime;
      console.log('[customizePlaceholders:package] Completed request', {
        success: result.success,
        processingTime,
        customized: !!result.data?.customizedContent
      });

      return result;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error('[customizePlaceholders:package] Request failed:', {
        error: error.message,
        stack: error.stack,
        userId: request.auth?.uid,
        jobId: request.data?.jobId,
        recommendationId: request.data?.recommendationId,
        processingTime
      });
      
      return {
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }
);