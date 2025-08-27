/**
 * Firebase Function: previewImprovement (Package-based Implementation)
 * 
 * Uses the @cvplus/recommendations package for a clean, modular implementation.
 * Provides 100% API compatibility with the existing Firebase function.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { onCall } from 'firebase-functions/v2/https';
import { corsOptions } from '../../../../functions/src/config/cors';
import { firebaseFunctionsAdapter } from '../../src/integration/firebase/functions-adapter';

/**
 * Firebase Function: previewImprovement
 * Package-based implementation with full API compatibility
 */
export const previewImprovement = onCall(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    concurrency: 20,
    ...corsOptions,
  },
  async (request) => {
    const startTime = Date.now();
    
    try {
      console.log('[previewImprovement:package] Starting request', {
        userId: request.auth?.uid,
        jobId: request.data?.jobId,
        recommendationId: request.data?.recommendationId,
        timestamp: new Date().toISOString()
      });

      // Use the Firebase adapter from the package
      const result = await firebaseFunctionsAdapter.previewImprovement(request);

      const processingTime = Date.now() - startTime;
      console.log('[previewImprovement:package] Completed request', {
        success: result.success,
        processingTime,
        hasPreview: !!result.data?.previewCV
      });

      return result;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error('[previewImprovement:package] Request failed:', {
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