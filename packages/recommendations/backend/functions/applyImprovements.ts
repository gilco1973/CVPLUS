/**
 * Firebase Function: applyImprovements (Package-based Implementation)
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
 * Firebase Function: applyImprovements
 * Package-based implementation with full API compatibility
 */
export const applyImprovements = onCall(
  {
    timeoutSeconds: 300,
    memory: '1GiB',
    concurrency: 5,
    ...corsOptions,
  },
  async (request) => {
    const startTime = Date.now();
    
    try {
      console.log('[applyImprovements:package] Starting request', {
        userId: request.auth?.uid,
        jobId: request.data?.jobId,
        recommendationCount: request.data?.selectedRecommendationIds?.length || 0,
        timestamp: new Date().toISOString()
      });

      // Use the Firebase adapter from the package
      const result = await firebaseFunctionsAdapter.applyImprovements(request);

      const processingTime = Date.now() - startTime;
      console.log('[applyImprovements:package] Completed request', {
        success: result.success,
        processingTime,
        improvedCV: !!result.data?.improvedCV
      });

      return result;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error('[applyImprovements:package] Request failed:', {
        error: error.message,
        stack: error.stack,
        userId: request.auth?.uid,
        jobId: request.data?.jobId,
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