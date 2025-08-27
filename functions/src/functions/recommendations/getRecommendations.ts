import { onCall } from 'firebase-functions/v2/https';
import { corsOptions } from '../../config/cors';
import { ImprovementOrchestrator } from '../../services/recommendations/ImprovementOrchestrator';
import { ValidationEngine } from '../../services/recommendations/ValidationEngine';

/**
 * Firebase Function: getRecommendations
 * Generates AI-powered CV improvement recommendations with caching and error handling
 * Maximum 180 lines to comply with code standards
 */
export const getRecommendations = onCall(
  {
    timeoutSeconds: 300,
    memory: '1GiB',
    concurrency: 10,
    ...corsOptions,
  },
  async (request) => {
    const validator = new ValidationEngine();
    const orchestrator = new ImprovementOrchestrator();
    const startTime = Date.now();

    try {
      // Validate authentication
      const authValidation = validator.validateAuth(request);
      if (!authValidation.isValid) {
        throw new Error(authValidation.error);
      }

      // Validate request data
      const { jobId, targetRole, industryKeywords, forceRegenerate } = request.data;
      const requestValidation = validator.validateRecommendationRequest({ jobId });
      if (!requestValidation.isValid) {
        throw new Error(requestValidation.errors.join('; '));
      }

      console.log(`[getRecommendations] Starting for job ${jobId}`, {
        userId: authValidation.userId,
        targetRole,
        industryKeywords,
        forceRegenerate,
        timestamp: new Date().toISOString()
      });

      // Generate recommendations using orchestrator
      const result = await orchestrator.generateRecommendations(
        jobId,
        authValidation.userId,
        targetRole,
        industryKeywords,
        forceRegenerate
      );

      const processingTime = Date.now() - startTime;
      console.log(`[getRecommendations] Completed for job ${jobId}`, {
        success: result.success,
        recommendationCount: result.data?.recommendations?.length || 0,
        processingTime,
        cached: result.data?.cached || false
      });

      return result;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`[getRecommendations] Error for job ${request.data?.jobId}:`, {
        error: error.message,
        stack: error.stack,
        userId: request.auth?.uid,
        processingTime
      });
      
      // Return formatted error
      throw error;
    }
  }
);