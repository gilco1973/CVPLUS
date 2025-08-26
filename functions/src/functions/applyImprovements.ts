import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { CVTransformationService, CVRecommendation } from '../services/cv-transformation.service';
import { PlaceholderManager, PlaceholderReplacementMap } from '../services/placeholder-manager.service';
import { ParsedCV } from '../types/job';
import { corsOptions } from '../config/cors';
import { getUserSubscriptionInternal } from './payments/getUserSubscription';

// Request deduplication cache to prevent duplicate calls from React StrictMode
const activeRequests = new Map<string, Promise<any>>();

// Cache for recent recommendation results (5 minute cache)
const recommendationCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const applyImprovements = onCall(
  {
    timeoutSeconds: 180,
    memory: '1GiB',
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
      
      const selectedRecommendations = storedRecommendations.filter(rec => 
        selectedRecommendationIds.includes(rec.id)
      );

      if (selectedRecommendations.length === 0) {
        throw new Error('No valid recommendations found for the selected IDs');
      }


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
      
      // Update job status to reflect error
      try {
        await db.collection('jobs').doc(jobId).update({
          status: 'failed',
          error: error.message,
          lastError: new Date().toISOString()
        });
      } catch (dbError) {
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
        return await activeRequests.get(requestKey);
      }

      // Check recommendation cache (5 minute cache)
      const cachedResult = recommendationCache.get(requestKey);
      if (cachedResult && !forceRegenerate) {
        const isExpired = (Date.now() - cachedResult.timestamp) > CACHE_DURATION;
        if (!isExpired) {
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
  
  // Check if user is premium for enhanced recommendations
  let isPremiumUser = false;
  try {
    const subscriptionData = await getUserSubscriptionInternal(userId);
    isPremiumUser = subscriptionData.subscriptionStatus === 'premium' || subscriptionData.lifetimeAccess === true;
    console.log(`[getRecommendations] Premium status for user ${userId}: ${isPremiumUser}`);
  } catch (error) {
    console.warn(`[getRecommendations] Failed to check premium status for user ${userId}:`, error);
    // Continue with free tier recommendations
  }
  
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
      isPremiumUser,
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

/**
 * Generate emergency fallback recommendations when AI services fail
 */
function generateEmergencyFallbackRecommendations(originalCV: ParsedCV): CVRecommendation[] {
  console.log('🚨 Generating emergency fallback recommendations (enhanced with 8+ recommendations)');
  
  const fallbackRecommendations: CVRecommendation[] = [];
  const baseId = `fallback_${Date.now()}`;
  
  // Always add professional summary enhancement
  fallbackRecommendations.push({
    id: `${baseId}_summary`,
    type: 'content',
    category: 'professional_summary',
    section: 'Professional Summary',
    actionRequired: 'modify',
    title: 'Enhance Professional Summary',
    description: 'Strengthen your professional summary to better showcase your experience and value proposition to employers.',
    suggestedContent: 'Consider expanding your professional summary with specific achievements and quantifiable results.',
    impact: 'medium',
    priority: 1,
    estimatedScoreImprovement: 15
  });
  
  // Add skills organization if skills exist
  if (originalCV.skills && Array.isArray(originalCV.skills) && originalCV.skills.length > 0) {
    fallbackRecommendations.push({
      id: `${baseId}_skills`,
      type: 'structure',
      category: 'skills',
      section: 'Skills',
      actionRequired: 'reformat',
      title: 'Organize Skills by Category',
      description: 'Group your skills into categories (Technical, Management, etc.) for better readability.',
      suggestedContent: 'Organize skills into logical categories such as Technical Skills, Leadership Skills, and Industry Knowledge.',
      impact: 'medium',
      priority: 2,
      estimatedScoreImprovement: 10
    });
  } else if (originalCV.skills && typeof originalCV.skills === 'object') {
    // Skills are already organized, suggest enhancement
    fallbackRecommendations.push({
      id: `${baseId}_skills_enhance`,
      type: 'content',
      category: 'skills',
      section: 'Skills',
      actionRequired: 'modify',
      title: 'Enhance Skills Section',
      description: 'Add more relevant skills or provide proficiency levels for existing skills.',
      suggestedContent: 'Consider adding skill proficiency levels or expanding with industry-relevant skills.',
      impact: 'medium',
      priority: 2,
      estimatedScoreImprovement: 8
    });
  }
  
  // Add experience enhancement if experience exists
  if (originalCV.experience && originalCV.experience.length > 0) {
    fallbackRecommendations.push({
      id: `${baseId}_experience`,
      type: 'content',
      category: 'experience',
      section: 'Experience',
      actionRequired: 'modify',
      title: 'Add Quantifiable Achievements',
      description: 'Transform job descriptions into achievement-focused bullet points with measurable results.',
      suggestedContent: 'Use bullet points with quantifiable achievements, such as "Increased sales by 25%" or "Led team of 10 developers".',
      impact: 'high',
      priority: 1,
      estimatedScoreImprovement: 20
    });
  }
  
  // Add education enhancement if education exists
  if (originalCV.education && originalCV.education.length > 0) {
    fallbackRecommendations.push({
      id: `${baseId}_education`,
      type: 'content',
      category: 'education',
      section: 'Education',
      actionRequired: 'modify',
      title: 'Enhance Educational Background',
      description: 'Add relevant coursework, GPA (if strong), or honors to strengthen your educational background.',
      suggestedContent: 'Consider adding relevant coursework, academic achievements, or certifications related to your field.',
      impact: 'low',
      priority: 3,
      estimatedScoreImprovement: 8
    });
  }
  
  // Always add a general formatting recommendation
  fallbackRecommendations.push({
    id: `${baseId}_formatting`,
    type: 'formatting',
    category: 'formatting',
    section: 'General',
    actionRequired: 'reformat',
    title: 'Improve CV Formatting',
    description: 'Enhance the visual appeal and readability of your CV with better formatting and structure.',
    suggestedContent: 'Ensure consistent formatting, appropriate white space, and professional typography throughout your CV.',
    impact: 'medium',
    priority: 2,
    estimatedScoreImprovement: 12
  });
  
  // Add contact information enhancement
  fallbackRecommendations.push({
    id: `${baseId}_contact`,
    type: 'content',
    category: 'formatting',
    section: 'Contact Information',
    actionRequired: 'modify',
    title: 'Optimize Contact Information',
    description: 'Ensure all contact information is up-to-date, professional, and includes relevant links.',
    suggestedContent: 'Include professional email, LinkedIn profile, and relevant portfolio links. Ensure phone number and location are current.',
    impact: 'medium',
    priority: 3,
    estimatedScoreImprovement: 8
  });
  
  // Add keyword optimization
  fallbackRecommendations.push({
    id: `${baseId}_keywords`,
    type: 'keyword_optimization',
    category: 'ats_optimization',
    section: 'Throughout CV',
    actionRequired: 'modify',
    title: 'Enhance ATS Keywords',
    description: 'Add industry-specific keywords and technical terms to improve ATS scanning and searchability.',
    suggestedContent: 'Research and include relevant keywords from your industry and target job descriptions throughout your CV.',
    impact: 'high',
    priority: 1,
    estimatedScoreImprovement: 18
  });
  
  // Add achievements section if missing
  if (!originalCV.achievements || (Array.isArray(originalCV.achievements) && originalCV.achievements.length === 0)) {
    fallbackRecommendations.push({
      id: `${baseId}_achievements`,
      type: 'section_addition',
      category: 'achievements',
      section: 'Achievements',
      actionRequired: 'add',
      title: 'Add Key Achievements Section',
      description: 'Create a dedicated achievements section to highlight your most significant professional accomplishments.',
      suggestedContent: 'List 3-5 key achievements with quantifiable results, such as awards, recognition, or major project outcomes.',
      impact: 'high',
      priority: 1,
      estimatedScoreImprovement: 16
    });
  }
  
  console.log(`✅ Generated ${fallbackRecommendations.length} emergency fallback recommendations`);
  return fallbackRecommendations;
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
  isPremiumUser?: boolean,
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
      } catch (error) {
      }
    }
  };
  
  try {
    await updateProgress('Preparing CV analysis...', 1);
    
    // Generate recommendations with timeout per step
    await updateProgress('Generating improvement recommendations...', 2);
    
    let recommendations: CVRecommendation[] = [];
    
    // Primary attempt: Generate recommendations based on user tier
    try {
      if (isPremiumUser) {
        console.log('🎖️ Generating premium role-enhanced recommendations');
        // Premium users get role-enhanced recommendations with full detection
        recommendations = await transformationService.generateRoleEnhancedRecommendations(
          originalCV,
          true, // enable role detection for premium users
          targetRole,
          industryKeywords
        );
      } else {
        console.log('📝 Generating standard detailed recommendations');
        // Free users get standard detailed recommendations
        recommendations = await transformationService.generateDetailedRecommendations(
          originalCV,
          targetRole,
          industryKeywords
        );
      }
    } catch (primaryError: any) {
      console.warn('Primary recommendation generation failed, attempting fallback:', primaryError.message);
      
      // Fallback 1: Try the opposite approach
      try {
        if (isPremiumUser) {
          // If premium role-enhanced failed, try standard detailed
          console.log('🔄 Premium fallback: trying standard recommendations');
          recommendations = await transformationService.generateDetailedRecommendations(
            originalCV,
            targetRole,
            industryKeywords
          );
        } else {
          // If standard failed, try basic role-enhanced without detection
          console.log('🔄 Standard fallback: trying basic role-enhanced');
          recommendations = await transformationService.generateRoleEnhancedRecommendations(
            originalCV,
            false, // disable role detection for faster processing
            targetRole,
            industryKeywords
          );
        }
      } catch (secondaryError: any) {
        console.warn('Secondary recommendation generation failed, using emergency fallback:', secondaryError.message);
        
        // Fallback 2: Generate basic recommendations
        recommendations = generateEmergencyFallbackRecommendations(originalCV);
      }
    }
    
    await updateProgress('Validating recommendations...', 3);
    
    // Enhanced validation with fallback values
    const validRecommendations = recommendations.map(rec => {
      // Ensure all required fields are present with fallback values
      return {
        ...rec,
        id: rec.id || `rec_fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: rec.title || 'CV Improvement Recommendation',
        description: rec.description || 'Improve your CV content to better showcase your professional experience and skills.',
        section: rec.section || 'general'
      };
    });
    
    // Final safety check - if still empty, generate emergency recommendations
    if (validRecommendations.length === 0) {
      console.warn('All recommendation generation methods failed, creating emergency fallback');
      const emergencyRecommendations = generateEmergencyFallbackRecommendations(originalCV);
      return emergencyRecommendations;
    }
    
    console.log('✅ [DEBUG] Validation successful - recommendations structure:', validRecommendations.map(rec => ({
      id: rec.id ? '✓' : '✗',
      title: rec.title ? '✓' : '✗',
      description: rec.description ? '✓' : '✗',
      section: rec.section ? '✓' : '✗'
    })));
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
      throw new Error(`Failed to customize placeholders: ${error.message}`);
    }
  }
);