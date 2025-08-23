/**
 * Enrich CV with External Data Function
 * 
 * Firebase Function to enrich CVs with data from external sources
 * like GitHub, LinkedIn, web search, and personal websites
 * 
 * @author Gil Klainert
 * @created 2025-08-23
 * @version 1.0
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { corsOptions } from '../config/cors';
import { requireAuth } from '../middleware/authGuard';
import { 
  externalDataOrchestrator, 
  OrchestrationRequest,
  OrchestrationResult 
} from '../services/external-data';

interface EnrichCVRequest {
  cvId: string;
  sources?: string[];
  options?: {
    forceRefresh?: boolean;
    timeout?: number;
    priority?: 'high' | 'normal' | 'low';
  };
  // Optional user-provided hints
  github?: string;
  linkedin?: string;
  website?: string;
  name?: string;
}

/**
 * Enrich CV with external data
 */
export const enrichCVWithExternalData = onCall<EnrichCVRequest>(
  {
    ...corsOptions,
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '512MiB'
  },
  async (request) => {
    try {
      // Authenticate user
      const authRequest = await requireAuth(request);
      const userId = authRequest.auth.uid;
      
      logger.info('[ENRICH-CV] Processing external data enrichment request', {
        userId,
        cvId: request.data.cvId,
        sources: request.data.sources
      });
      
      // Validate request
      if (!request.data.cvId) {
        throw new HttpsError(
          'invalid-argument',
          'CV ID is required'
        );
      }
      
      // Default sources if not specified
      const sources = request.data.sources || ['github', 'linkedin', 'web', 'website'];
      
      // Validate sources
      const validSources = ['github', 'linkedin', 'web', 'website'];
      const invalidSources = sources.filter(s => !validSources.includes(s));
      
      if (invalidSources.length > 0) {
        throw new HttpsError(
          'invalid-argument',
          `Invalid sources: ${invalidSources.join(', ')}`
        );
      }
      
      // Create orchestration request
      const orchestrationRequest: OrchestrationRequest = {
        userId,
        cvId: request.data.cvId,
        sources,
        options: {
          forceRefresh: request.data.options?.forceRefresh || false,
          timeout: request.data.options?.timeout || 30000,
          priority: request.data.options?.priority || 'normal'
        }
      };
      
      // Store user hints in metadata if provided
      if (request.data.github || request.data.linkedin || request.data.website) {
        await storeUserHints(userId, {
          github: request.data.github,
          linkedin: request.data.linkedin,
          website: request.data.website,
          name: request.data.name
        });
      }
      
      // Orchestrate external data fetching
      const result: OrchestrationResult = await externalDataOrchestrator.orchestrate(
        orchestrationRequest
      );
      
      // Log success metrics
      logger.info('[ENRICH-CV] External data enrichment completed', {
        userId,
        cvId: request.data.cvId,
        status: result.status,
        duration: result.fetchDuration,
        sourcesSuccessful: result.sourcesSuccessful
      });
      
      // Return enriched data
      return {
        success: result.status !== 'failed',
        requestId: result.requestId,
        status: result.status,
        enrichedData: result.enrichedData,
        metrics: {
          fetchDuration: result.fetchDuration,
          sourcesQueried: result.sourcesQueried,
          sourcesSuccessful: result.sourcesSuccessful,
          cacheHits: result.cacheHits
        },
        errors: result.errors.map(e => e.message)
      };
      
    } catch (error) {
      logger.error('[ENRICH-CV] External data enrichment failed', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError(
        'internal',
        'Failed to enrich CV with external data',
        error.message
      );
    }
  }
);

/**
 * Store user-provided hints for external data sources
 */
async function storeUserHints(
  userId: string,
  hints: {
    github?: string;
    linkedin?: string;
    website?: string;
    name?: string;
  }
): Promise<void> {
  try {
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();
    
    await db
      .collection('user_external_profiles')
      .doc(userId)
      .set(
        {
          ...hints,
          updatedAt: new Date()
        },
        { merge: true }
      );
    
    logger.info('[ENRICH-CV] User hints stored', { userId, hints });
  } catch (error) {
    logger.error('[ENRICH-CV] Failed to store user hints', error);
    // Don't throw - this is not critical
  }
}