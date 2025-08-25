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
import { withPremiumAccess } from '../middleware/premiumGuard';
import { 
  externalDataOrchestrator, 
  OrchestrationRequest,
  OrchestrationResult 
} from '../services/external-data';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { ExternalDataUsageEvent } from '../types/external-data-analytics.types';
import { getUserSubscriptionInternal } from './payments/getUserSubscription';

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
 * Enrich CV with external data - Premium Feature
 * 
 * This function is protected by premium access controls and includes
 * usage tracking, rate limiting, and security audit logging.
 */
export const enrichCVWithExternalData = onCall<EnrichCVRequest>(
  {
    ...corsOptions,
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '512MiB'
  },
  withPremiumAccess('externalData', async (request) => {
    const startTime = Date.now();
    
    try {
      // User is already authenticated and premium validated by withPremiumAccess
      const userId = request.auth.uid;
      
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
      
      // Get user subscription for tracking
      const subscription = await getUserSubscriptionInternal(userId);
      const premiumStatus = subscription?.lifetimeAccess ? 'premium' : 'free';
      
      // Track usage event
      const usageEvent: ExternalDataUsageEvent = {
        userId,
        cvId: request.data.cvId,
        sources,
        timestamp: new Date(),
        success: result.status !== 'failed',
        fetchDuration: result.fetchDuration,
        sourcesQueried: result.sourcesQueried,
        sourcesSuccessful: result.sourcesSuccessful,
        cacheHits: result.cacheHits,
        errors: result.errors.map(e => e.message),
        premiumStatus,
        requestId: result.requestId
      };
      
      // Track usage asynchronously (don't wait for completion)
      trackUsageEventInternal(usageEvent).catch((error: any) => {
        logger.error('[ENRICH-CV] Failed to track usage event', { error, userId });
      });
      
      // Log success metrics
      logger.info('[ENRICH-CV] External data enrichment completed', {
        userId,
        cvId: request.data.cvId,
        status: result.status,
        duration: result.fetchDuration,
        sourcesSuccessful: result.sourcesSuccessful,
        premiumStatus,
        requestId: result.requestId
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
      const executionTime = Date.now() - startTime;
      
      // Track failed usage event if we have user context
      if (request.auth?.uid) {
        const subscription = await getUserSubscriptionInternal(request.auth.uid).catch(() => null);
        const premiumStatus = subscription?.lifetimeAccess ? 'premium' : 'free';
        
        const failedUsageEvent: ExternalDataUsageEvent = {
          userId: request.auth.uid,
          cvId: request.data.cvId,
          sources: request.data.sources || [],
          timestamp: new Date(),
          success: false,
          fetchDuration: executionTime,
          sourcesQueried: 0,
          sourcesSuccessful: 0,
          cacheHits: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          premiumStatus
        };
        
        trackUsageEventInternal(failedUsageEvent).catch((trackingError: any) => {
          logger.error('[ENRICH-CV] Failed to track failed usage event', { 
            trackingError, 
            userId: request.auth.uid 
          });
        });
      }
      
      logger.error('[ENRICH-CV] External data enrichment failed', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        userId: request.auth?.uid,
        cvId: request.data.cvId,
        executionTime
      });
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError(
        'internal',
        'Failed to enrich CV with external data',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  })
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

/**
 * Internal function to track usage events
 * This bypasses the Cloud Function call and directly writes to Firestore
 */
async function trackUsageEventInternal(event: ExternalDataUsageEvent): Promise<void> {
  try {
    const db = getFirestore();
    const timestamp = new Date();
    const dateKey = timestamp.toISOString().split('T')[0];
    
    // Create batch for atomic operations
    const batch = db.batch();

    // 1. Store individual usage event
    const eventRef = db
      .collection('external_data_usage')
      .doc(event.userId)
      .collection('events')
      .doc();
    
    batch.set(eventRef, {
      ...event,
      timestamp: FieldValue.serverTimestamp(),
      id: eventRef.id
    });

    // 2. Update daily analytics
    const dailyAnalyticsRef = db
      .collection('external_data_analytics')
      .doc('daily')
      .collection('data')
      .doc(dateKey);

    const analyticsUpdate: any = {
      date: dateKey,
      totalRequests: FieldValue.increment(1),
      lastUpdated: FieldValue.serverTimestamp()
    };

    // Add premium-specific metrics
    if (event.premiumStatus === 'premium') {
      analyticsUpdate.premiumRequests = FieldValue.increment(1);
    } else {
      analyticsUpdate.freeRequests = FieldValue.increment(1);
    }

    // Add success/failure metrics
    if (event.success) {
      analyticsUpdate.successfulRequests = FieldValue.increment(1);
      analyticsUpdate.totalFetchDuration = FieldValue.increment(event.fetchDuration);
    } else {
      analyticsUpdate.failedRequests = FieldValue.increment(1);
    }

    batch.set(dailyAnalyticsRef, analyticsUpdate, { merge: true });

    // Execute batch
    await batch.commit();
    
    logger.info('[TRACK-USAGE-INTERNAL] Usage event tracked successfully', {
      userId: event.userId,
      eventId: eventRef.id,
      success: event.success
    });
    
  } catch (error) {
    logger.error('[TRACK-USAGE-INTERNAL] Failed to track usage event', {
      error: error instanceof Error ? error.message : error,
      userId: event.userId
    });
    // Don't throw - tracking should not block main operation
  }
}