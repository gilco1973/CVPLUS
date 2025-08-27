/**
 * Firebase Function: getRecommendations (Package-based Implementation)
 * 
 * Uses the @cvplus/recommendations package for a clean, modular implementation.
 * Provides 100% API compatibility with the existing Firebase function while using 
 * the optimized recommendations package underneath.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { onCall } from 'firebase-functions/v2/https';
import { corsOptions } from '../../../../functions/src/config/cors'; // Import existing CORS config
import { firebaseFunctionsAdapter } from '../../src/integration/firebase/functions-adapter';

/**
 * Firebase Function: getRecommendations
 * Package-based implementation with full API compatibility
 */
export const getRecommendations = onCall(
  {
    timeoutSeconds: 300,
    memory: '1GiB',
    concurrency: 10,
    ...corsOptions,
  },
  async (request) => {
    const startTime = Date.now();
    
    try {
      console.log('[getRecommendations:package] Starting request', {
        userId: request.auth?.uid,
        jobId: request.data?.jobId,
        timestamp: new Date().toISOString()
      });

      // Use the Firebase adapter from the package
      const result = await firebaseFunctionsAdapter.getRecommendations(request);

      const processingTime = Date.now() - startTime;
      console.log('[getRecommendations:package] Completed request', {
        success: result.success,
        processingTime,
        cached: result.data?.cached || false,
        recommendationCount: result.data?.recommendations?.length || 0
      });

      return result;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error('[getRecommendations:package] Request failed:', {
        error: error.message,
        stack: error.stack,
        userId: request.auth?.uid,
        jobId: request.data?.jobId,
        processingTime
      });
      
      // Return standardized error response
      return {
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }
);