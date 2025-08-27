import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { CVTransformationService, CVRecommendation } from '../services/cv-transformation.service';
import { PlaceholderManager, PlaceholderReplacementMap } from '../services/placeholder-manager.service';
import { ParsedCV } from '../types/job';
import { corsOptions } from '../config/cors';

// Request deduplication cache to prevent duplicate calls from React StrictMode
const activeRequests = new Map<string, Promise<any>>();

// Cache for recent recommendation results (5 minute cache)
const recommendationCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const applyImprovements = onCall(
  {
    timeoutSeconds: 180,
    memory: '1GiB',
    secrets: ['ANTHROPIC_API_KEY'],
    ...corsOptions,
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, selectedRecommendationIds, targetRole, industryKeywords } = request.data;
    
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    if (!selectedRecommendationIds || !Array.isArray(selectedRecommendationIds)) {
      throw new Error('Selected recommendation IDs array is required');
    }

    const db = getFirestore();
    const userId = request.auth.uid;

    try {
      console.log(`[applyImprovements] Starting - ${selectedRecommendationIds.length} improvements for job ${jobId}`);
      console.log(`[applyImprovements] Request from user: ${userId}`);
      console.log(`[applyImprovements] Selected IDs: ${selectedRecommendationIds.join(', ')}`);

      // Get the job document
      const jobDoc = await db.collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }

      const jobData = jobDoc.data();
      if (jobData?.userId !== userId) {
        throw new Error('Unauthorized access to job');
      }

      // Get the original parsed CV
      const originalCV: ParsedCV = jobData?.parsedData;
      if (!originalCV) {
        throw new Error('No parsed CV found for this job');
      }

      // Get stored recommendations
      let storedRecommendations: CVRecommendation[] = jobData?.cvRecommendations || [];
      
      // If no stored recommendations, generate them
      if (storedRecommendations.length === 0) {
        console.log('No stored recommendations found, generating new ones...');
        const transformationService = new CVTransformationService();
        storedRecommendations = await transformationService.generateDetailedRecommendations(
          originalCV,
          targetRole,
          industryKeywords
        );
        
        // Store the generated recommendations
        await db.collection('jobs').doc(jobId).update({
          cvRecommendations: storedRecommendations,
          lastRecommendationGeneration: new Date().toISOString()
        });
      }

      // Filter selected recommendations
      console.log('Generated recommendation IDs:', storedRecommendations.map(r => r.id));
      console.log('Requested recommendation IDs:', selectedRecommendationIds);
      
      const selectedRecommendations = storedRecommendations.filter(rec => 
        selectedRecommendationIds.includes(rec.id)
      );

      if (selectedRecommendations.length === 0) {
        console.error('ID mismatch - none of the requested IDs match generated recommendations');
        throw new Error('No valid recommendations found for the selected IDs');
      }

      console.log(`Found ${selectedRecommendations.length} recommendations to apply`);

      // Apply transformations
      const transformationService = new CVTransformationService();
      const transformationResult = await transformationService.applyRecommendations(
        originalCV,
        selectedRecommendations
      );

      // Store the improved CV and transformation results
      const updateData = {
        improvedCV: transformationResult.improvedCV,
        appliedRecommendations: transformationResult.appliedRecommendations,
        transformationSummary: transformationResult.transformationSummary,
        comparisonReport: transformationResult.comparisonReport,
        lastTransformation: new Date().toISOString(),
        status: 'completed', // Use 'completed' instead of 'improved' for better compatibility
        improvementsApplied: true, // Flag to indicate improvements were applied
        updatedAt: new Date()
      };

      await db.collection('jobs').doc(jobId).update(updateData);

      console.log(`[applyImprovements] Successfully applied ${transformationResult.appliedRecommendations.length} improvements`);
      console.log(`[applyImprovements] Job status updated to: completed`);
      console.log(`[applyImprovements] Function completing successfully`);

      return {
        success: true,
        data: {
          jobId,
          improvedCV: transformationResult.improvedCV,
          appliedRecommendations: transformationResult.appliedRecommendations,
          transformationSummary: transformationResult.transformationSummary,
          comparisonReport: transformationResult.comparisonReport,
          improvementsApplied: true,
          message: `Successfully applied ${transformationResult.appliedRecommendations.length} improvements`
        }
      };

    } catch (error: any) {
      console.error('Error applying improvements:', error);
      
      // Update job status to reflect error
      try {
        await db.collection('jobs').doc(jobId).update({
          status: 'failed',
          error: error.message,
          lastError: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Failed to update job status:', dbError);
      }

      throw new Error(`Failed to apply improvements: ${error.message}`);
    }
  }
);

export const getRecommendations = onCall(
  {
    timeoutSeconds: 300,
    memory: '1GiB',
    concurrency: 10,
    secrets: ['ANTHROPIC_API_KEY'],
    ...corsOptions,
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, targetRole, industryKeywords, forceRegenerate } = request.data;
    
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    const db = getFirestore();
    const userId = request.auth.uid;
    const startTime = Date.now();

    // Create request key for deduplication
    const requestKey = `${jobId}-${userId}-${targetRole || 'no-role'}-${(industryKeywords || []).join(',')}-${forceRegenerate || false}`;

    try {
      console.log(`[getRecommendations] Starting for job ${jobId}`, {
        userId,
        targetRole,
        industryKeywords,
        forceRegenerate,
        requestKey,
        timestamp: new Date().toISOString()
      });

      // Check for in-flight request (prevent StrictMode duplicates)
      if (activeRequests.has(requestKey)) {
        console.log(`[getRecommendations] Returning cached in-flight request for ${requestKey}`);
        return await activeRequests.get(requestKey);
      }

      // Check recommendation cache (5 minute cache)
      const cachedResult = recommendationCache.get(requestKey);
      if (cachedResult && !forceRegenerate) {
        const isExpired = (Date.now() - cachedResult.timestamp) > CACHE_DURATION;
        if (!isExpired) {
          console.log(`[getRecommendations] Returning cached result for ${requestKey} (age: ${Date.now() - cachedResult.timestamp}ms)`);
          return {
            success: true,
            data: {
              ...cachedResult.data,
              cached: true,
              cacheAge: Date.now() - cachedResult.timestamp
            }
          };
        } else {
          // Remove expired cache entry
          recommendationCache.delete(requestKey);
        }
      }

      // Create the actual execution promise and cache it to prevent duplicates
      const executionPromise = executeRecommendationGeneration(
        db, jobId, userId, targetRole, industryKeywords, forceRegenerate, startTime
      );

      // Store the in-flight request to prevent duplicates
      activeRequests.set(requestKey, executionPromise);

      // Execute and get the result
      const result = await executionPromise;

      // Cache the successful result (excluding the execution promise)
      if (result.success) {
        recommendationCache.set(requestKey, {
          data: result.data,
          timestamp: Date.now()
        });
      }

      // Clean up the active request
      activeRequests.delete(requestKey);

      return result;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`[getRecommendations] Error for job ${jobId}:`, {
        error: error.message,
        stack: error.stack,
        userId,
        processingTime,
        requestKey
      });
      
      // Clean up the active request on error
      activeRequests.delete(requestKey);
      
      // Throw appropriate error based on type
      if (error.message.includes('timeout')) {
        throw new Error(`CV analysis timed out. This usually occurs with very large or complex CVs. Please try with a shorter CV or contact support if the issue persists.`);
      } else if (error.message.includes('API')) {
        throw new Error(`AI service temporarily unavailable. Please try again in a few minutes.`);
      } else {
        throw new Error(`Failed to analyze CV: ${error.message}`);
      }
    }
  }
);

/**
 * Execute recommendation generation with all the original logic
 */
async function executeRecommendationGeneration(
  db: FirebaseFirestore.Firestore,
  jobId: string,
  userId: string,
  targetRole?: string,
  industryKeywords?: string[],
  forceRegenerate?: boolean,
  startTime?: number
): Promise<any> {
  const executionStartTime = startTime || Date.now();
  
  try {
    // Get the job document
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      throw new Error('Job not found');
    }

    const jobData = jobDoc.data();
    if (jobData?.userId !== userId) {
      throw new Error('Unauthorized access to job');
    }

    const originalCV: ParsedCV = jobData?.parsedData;
    if (!originalCV) {
      throw new Error('No parsed CV found for this job');
    }

  // Update job status to processing
  await db.collection('jobs').doc(jobId).update({
    status: 'generating_recommendations',
    processingStartTime: new Date().toISOString()
  });

  // Check if we have existing recommendations and don't need to regenerate
  const existingRecommendations: CVRecommendation[] = jobData?.cvRecommendations || [];
  const lastGeneration = jobData?.lastRecommendationGeneration;
  const isRecentGeneration = lastGeneration && 
    (new Date().getTime() - new Date(lastGeneration).getTime()) < 24 * 60 * 60 * 1000; // 24 hours

  if (existingRecommendations.length > 0 && isRecentGeneration && !forceRegenerate) {
    console.log(`[getRecommendations] Using cached recommendations (${existingRecommendations.length} items)`);
    
    // Update status back to analyzed
    await db.collection('jobs').doc(jobId).update({
      status: 'analyzed'
    });
    
    return {
      success: true,
      data: {
        recommendations: existingRecommendations,
        cached: true,
        generatedAt: lastGeneration
      }
    };
  }

  // Generate new recommendations with progress tracking
  console.log(`[getRecommendations] Generating new recommendations for CV with ${JSON.stringify(originalCV).length} characters`);
  
  // Update progress status
  await db.collection('jobs').doc(jobId).update({
    processingProgress: 'Analyzing CV content...',
    processingStage: 1,
    totalStages: 3
  });
  
  const transformationService = new CVTransformationService();
  
  // Add timeout wrapper with progress updates
  const recommendations = await Promise.race([
    generateRecommendationsWithProgress(
      transformationService,
      originalCV,
      targetRole,
      industryKeywords,
      jobId,
      db
    ),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Recommendation generation timed out after 4 minutes'));
      }, 240000); // 4 minute timeout
    })
  ]);

  // Final progress update
  await db.collection('jobs').doc(jobId).update({
    processingProgress: 'Finalizing recommendations...',
    processingStage: 3,
    totalStages: 3
  });
  
  // Store the recommendations with metadata
  const now = new Date().toISOString();
  const processingTime = startTime ? Date.now() - startTime : 0;
  
  // Sanitize recommendations for Firestore (remove non-serializable objects like RegExp)
  const sanitizedRecommendations = recommendations.map((rec: any) => {
    const sanitizedRec = { ...rec };
    
    if (rec.placeholders) {
      sanitizedRec.placeholders = rec.placeholders.map((placeholder: any) => {
        const sanitizedPlaceholder = { ...placeholder };
        
        // Remove validation RegExp or convert to string, but don't set undefined
        if (placeholder.validation) {
          if (placeholder.validation instanceof RegExp) {
            sanitizedPlaceholder.validation = placeholder.validation.toString();
          }
        } else {
          // Remove undefined validation field entirely
          delete sanitizedPlaceholder.validation;
        }
        
        return sanitizedPlaceholder;
      });
    }
    
    return sanitizedRec;
  });
  
  await db.collection('jobs').doc(jobId).update({
    cvRecommendations: sanitizedRecommendations,
    lastRecommendationGeneration: now,
    status: 'analyzed',
    processingTime: processingTime,
    processingCompleted: now,
    recommendationCount: recommendations.length,
    // Clear progress fields
    processingProgress: null,
    processingStage: null,
    totalStages: null,
    processingStartTime: null
  });

  console.log(`[getRecommendations] Generated ${recommendations.length} recommendations in ${processingTime}ms`);

    return {
      success: true,
      data: {
        recommendations,
        cached: false,
        generatedAt: now,
        processingTime: processingTime
      }
    };
  } catch (error: any) {
    console.error(`[executeRecommendationGeneration] Error for job ${jobId}:`, {
      error: error.message,
      userId,
      processingTime: Date.now() - executionStartTime
    });
    
    // Update job status with error information
    await handleRecommendationError(db, jobId, error, executionStartTime);
    
    // Re-throw the error for the main handler
    throw error;
  }
}

// Handle errors within the extracted function with proper job status updates
async function handleRecommendationError(
  db: FirebaseFirestore.Firestore,
  jobId: string,
  error: any,
  startTime: number
): Promise<void> {
  const processingTime = Date.now() - startTime;
  
  try {
    await db.collection('jobs').doc(jobId).update({
      status: 'failed',
      error: error.message,
      lastError: new Date().toISOString(),
      processingProgress: null,
      processingStage: null,
      totalStages: null,
      processingStartTime: null,
      failureReason: error.message.includes('timeout') ? 'timeout' : 'processing_error'
    });
  } catch (dbError) {
    console.error('[executeRecommendationGeneration] Failed to update job status:', dbError);
  }
}

/**
 * Generate recommendations with progress tracking
 */
async function generateRecommendationsWithProgress(
  transformationService: CVTransformationService,
  originalCV: ParsedCV,
  targetRole?: string,
  industryKeywords?: string[],
  jobId?: string,
  db?: FirebaseFirestore.Firestore
): Promise<CVRecommendation[]> {
  // Progress update helper
  const updateProgress = async (message: string, stage: number) => {
    if (jobId && db) {
      try {
        await db.collection('jobs').doc(jobId).update({
          processingProgress: message,
          processingStage: stage,
          totalStages: 3
        });
        console.log(`[Progress] ${message} (Stage ${stage}/3)`);
      } catch (error) {
        console.warn('Failed to update progress:', error);
      }
    }
  };
  
  try {
    await updateProgress('Preparing CV analysis...', 1);
    
    // Generate recommendations with timeout per step
    await updateProgress('Generating improvement recommendations...', 2);
    
    const recommendations = await transformationService.generateDetailedRecommendations(
      originalCV,
      targetRole,
      industryKeywords
    );
    
    await updateProgress('Validating recommendations...', 3);
    
    // Basic validation
    const validRecommendations = recommendations.filter(rec => 
      rec.id && rec.title && rec.description && rec.section
    );
    
    if (validRecommendations.length === 0) {
      throw new Error('No valid recommendations generated');
    }
    
    console.log(`Generated ${validRecommendations.length} valid recommendations`);
    return validRecommendations;
    
  } catch (error) {
    await updateProgress('Error generating recommendations', 3);
    throw error;
  }
}

export const previewImprovement = onCall(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    ...corsOptions,
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, recommendationId } = request.data;
    
    if (!jobId || !recommendationId) {
      throw new Error('Job ID and recommendation ID are required');
    }

    const db = getFirestore();
    const userId = request.auth.uid;

    try {
      // Get the job document
      const jobDoc = await db.collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }

      const jobData = jobDoc.data();
      if (jobData?.userId !== userId) {
        throw new Error('Unauthorized access to job');
      }

      const originalCV: ParsedCV = jobData?.parsedData;
      const recommendations: CVRecommendation[] = jobData?.cvRecommendations || [];
      
      const recommendation = recommendations.find(rec => rec.id === recommendationId);
      if (!recommendation) {
        throw new Error('Recommendation not found');
      }

      // Apply just this single recommendation for preview
      const transformationService = new CVTransformationService();
      const previewResult = await transformationService.applyRecommendations(
        originalCV,
        [recommendation]
      );

      return {
        success: true,
        data: {
          recommendation,
          beforeContent: recommendation.currentContent || '',
          afterContent: recommendation.suggestedContent || '',
          previewCV: previewResult.improvedCV,
          estimatedImpact: recommendation.estimatedScoreImprovement
        }
      };

    } catch (error: any) {
      console.error('Error previewing improvement:', error);
      throw new Error(`Failed to preview improvement: ${error.message}`);
    }
  }
);

export const customizePlaceholders = onCall(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    ...corsOptions,
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, recommendationId, placeholderValues } = request.data;
    
    if (!jobId || !recommendationId || !placeholderValues) {
      throw new Error('Job ID, recommendation ID, and placeholder values are required');
    }

    const db = getFirestore();
    const userId = request.auth.uid;

    try {
      // Get the job document
      const jobDoc = await db.collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }

      const jobData = jobDoc.data();
      if (jobData?.userId !== userId) {
        throw new Error('Unauthorized access to job');
      }

      const recommendations: CVRecommendation[] = jobData?.cvRecommendations || [];
      const recIndex = recommendations.findIndex(rec => rec.id === recommendationId);
      
      if (recIndex === -1) {
        throw new Error('Recommendation not found');
      }

      const recommendation = recommendations[recIndex];
      
      if (!recommendation.suggestedContent) {
        throw new Error('No content to customize');
      }

      // Replace placeholders with user values
      const customizedContent = PlaceholderManager.replacePlaceholders(
        recommendation.suggestedContent,
        placeholderValues as PlaceholderReplacementMap
      );

      // Validate that all placeholders have been replaced
      const validation = PlaceholderManager.validateReplacements(customizedContent);
      if (!validation.isValid) {
        throw new Error(`Some placeholders still need values: ${validation.remainingPlaceholders.join(', ')}`);
      }

      // Update the recommendation
      recommendations[recIndex] = {
        ...recommendation,
        customizedContent,
        isCustomized: true
      };

      // Save updated recommendations
      await db.collection('jobs').doc(jobId).update({
        cvRecommendations: recommendations,
        lastUpdate: new Date().toISOString()
      });

      return {
        success: true,
        data: {
          recommendationId,
          customizedContent,
          originalContent: recommendation.suggestedContent,
          placeholdersReplaced: Object.keys(placeholderValues).length
        }
      };

    } catch (error: any) {
      console.error('Error customizing placeholders:', error);
      throw new Error(`Failed to customize placeholders: ${error.message}`);
    }
  }
);