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
  
  console.log(`🏁 Final recommendation summary for job ${jobId}:`, {
    totalRecommendations: recommendations.length,
    processingTimeMs: processingTime,
    recommendationTypes: recommendations.reduce((acc: Record<string, number>, rec) => {
      acc[rec.type] = (acc[rec.type] || 0) + 1;
      return acc;
    }, {}),
    recommendationImpacts: recommendations.reduce((acc: Record<string, number>, rec) => {
      acc[rec.impact] = (acc[rec.impact] || 0) + 1;
      return acc;
    }, {})
  });
  
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
 * Generate comprehensive fallback recommendations for augmentation
 */
function generateComprehensiveFallbackRecommendations(originalCV: ParsedCV): CVRecommendation[] {
  console.log('🛠️  Generating comprehensive fallback recommendations for augmentation');
  
  const comprehensiveRecommendations: CVRecommendation[] = [];
  const baseId = `comprehensive_${Date.now()}`;
  
  // Professional Title recommendation (if missing)
  if (!originalCV.personalInfo?.title || originalCV.personalInfo.title.length < 5) {
    comprehensiveRecommendations.push({
      id: `${baseId}_title`,
      type: 'content',
      category: 'professional_summary',
      section: 'Professional Title',
      actionRequired: 'add',
      title: 'Add Professional Title',
      description: 'A clear professional title helps recruiters immediately understand your role and expertise level.',
      suggestedContent: 'Add a professional title that reflects your expertise and career level, such as "Senior Software Engineer" or "Marketing Manager".',
      impact: 'high',
      priority: 1,
      estimatedScoreImprovement: 18
    });
  }
  
  // Contact Information enhancement
  if (!originalCV.personalInfo?.email || !originalCV.personalInfo?.phone) {
    comprehensiveRecommendations.push({
      id: `${baseId}_contact`,
      type: 'content',
      category: 'ats_optimization',
      section: 'Contact Information',
      actionRequired: 'modify',
      title: 'Complete Contact Information',
      description: 'Ensure all essential contact information is present and easily accessible to recruiters.',
      suggestedContent: 'Include professional email, phone number, LinkedIn profile, and location (city, state).',
      impact: 'high',
      priority: 1,
      estimatedScoreImprovement: 15
    });
  }
  
  // Achievements section (if missing)
  if (!originalCV.achievements || originalCV.achievements.length === 0) {
    comprehensiveRecommendations.push({
      id: `${baseId}_achievements`,
      type: 'section_addition',
      category: 'achievements',
      section: 'Key Achievements',
      actionRequired: 'add',
      title: 'Add Key Achievements Section',
      description: 'A dedicated achievements section highlights your most impressive accomplishments and differentiates you from other candidates.',
      suggestedContent: 'Create a "Key Achievements" section with 3-5 quantifiable accomplishments, such as:\n• Increased team productivity by 25% through process optimization\n• Led successful project delivery 15% ahead of schedule\n• Reduced operational costs by $50K annually\n• Achieved 95% customer satisfaction rating',
      impact: 'high',
      priority: 2,
      estimatedScoreImprovement: 22
    });
  }
  
  // Certifications section (if missing)
  if (!originalCV.certifications || originalCV.certifications.length === 0) {
    comprehensiveRecommendations.push({
      id: `${baseId}_certifications`,
      type: 'section_addition',
      category: 'achievements',
      section: 'Certifications',
      actionRequired: 'add',
      title: 'Add Relevant Certifications',
      description: 'Professional certifications demonstrate expertise and commitment to continuous learning.',
      suggestedContent: 'Add any professional certifications, industry credentials, or licenses relevant to your field.',
      impact: 'medium',
      priority: 3,
      estimatedScoreImprovement: 12
    });
  }
  
  // Languages section (if missing)
  if (!originalCV.languages || originalCV.languages.length === 0) {
    comprehensiveRecommendations.push({
      id: `${baseId}_languages`,
      type: 'section_addition',
      category: 'skills',
      section: 'Languages',
      actionRequired: 'add',
      title: 'Add Language Skills',
      description: 'Language skills are valuable in today\'s global workplace and can differentiate your profile.',
      suggestedContent: 'List languages with proficiency levels: Native, Fluent, Professional, Conversational, Basic.',
      impact: 'medium',
      priority: 4,
      estimatedScoreImprovement: 8
    });
  }
  
  // Projects/Portfolio section (if missing)
  if (!originalCV.projects || originalCV.projects.length === 0) {
    comprehensiveRecommendations.push({
      id: `${baseId}_projects`,
      type: 'section_addition',
      category: 'achievements',
      section: 'Notable Projects',
      actionRequired: 'add',
      title: 'Add Notable Projects',
      description: 'Highlighting key projects demonstrates practical application of your skills and problem-solving abilities.',
      suggestedContent: 'Add 2-3 significant projects with brief descriptions, technologies used, and outcomes achieved.',
      impact: 'high',
      priority: 2,
      estimatedScoreImprovement: 16
    });
  }
  
  // Volunteer Experience (if missing) - check if the field exists in CV structure
  const hasVolunteerExperience = (originalCV as any).volunteerExperience && (originalCV as any).volunteerExperience.length > 0;
  if (!hasVolunteerExperience) {
    comprehensiveRecommendations.push({
      id: `${baseId}_volunteer`,
      type: 'section_addition' as const,
      category: 'experience' as const,
      section: 'Volunteer Experience',
      actionRequired: 'add' as const,
      title: 'Include Volunteer Experience',
      description: 'Volunteer work demonstrates character, community engagement, and additional skills.',
      suggestedContent: 'Add relevant volunteer experiences that showcase leadership, teamwork, or industry-related skills.',
      impact: 'medium' as const,
      priority: 5,
      estimatedScoreImprovement: 10
    });
  }
  
  console.log(`🛠️  Generated ${comprehensiveRecommendations.length} comprehensive fallback recommendations`);
  return comprehensiveRecommendations;
}

/**
 * Generate emergency fallback recommendations when AI services fail
 */
function generateEmergencyFallbackRecommendations(originalCV: ParsedCV): CVRecommendation[] {
  console.log('🚨 Generating comprehensive emergency fallback recommendations');
  
  const fallbackRecommendations: CVRecommendation[] = [];
  const baseId = `fallback_${Date.now()}`;
  
  // 1. Professional summary enhancement or creation
  if (!originalCV.summary || originalCV.summary.length < 50) {
    fallbackRecommendations.push({
      id: `${baseId}_summary_create`,
      type: 'section_addition',
      category: 'professional_summary',
      section: 'Professional Summary',
      actionRequired: 'add',
      title: 'Create Compelling Professional Summary',
      description: 'A professional summary is essential for making a strong first impression and improving ATS compatibility.',
      suggestedContent: 'Experienced professional with [X years] of expertise in [your field]. Proven track record of [key achievement] and skilled in [top 3 skills]. Passionate about [industry focus] and committed to delivering exceptional results that drive business success.',
      impact: 'high',
      priority: 1,
      estimatedScoreImprovement: 25
    });
  } else {
    fallbackRecommendations.push({
      id: `${baseId}_summary_enhance`,
      type: 'content',
      category: 'professional_summary',
      section: 'Professional Summary',
      actionRequired: 'modify',
      title: 'Enhance Professional Summary with Metrics',
      description: 'Strengthen your professional summary with specific achievements and quantifiable results to grab recruiter attention.',
      suggestedContent: 'Enhance your summary by adding quantifiable achievements such as "Increased efficiency by 30%", "Led team of 10+", or "Managed $2M+ budget".',
      impact: 'high',
      priority: 1,
      estimatedScoreImprovement: 20
    });
  }
  
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
  
  // 6. Professional title (if missing or generic)
  if (!originalCV.personalInfo?.title || originalCV.personalInfo.title.length < 5) {
    fallbackRecommendations.push({
      id: `${baseId}_title`,
      type: 'content',
      category: 'professional_summary',
      section: 'Professional Title',
      actionRequired: 'add',
      title: 'Add Professional Title',
      description: 'A clear professional title is the first thing recruiters see and helps with ATS keyword matching.',
      suggestedContent: 'Add a professional title that reflects your current expertise level and field, such as "Senior Software Developer", "Marketing Manager", or "Data Analyst".',
      impact: 'high',
      priority: 1,
      estimatedScoreImprovement: 18
    });
  }
  
  // 7. Contact information optimization
  fallbackRecommendations.push({
    id: `${baseId}_contact`,
    type: 'content',
    category: 'ats_optimization',
    section: 'Contact Information',
    actionRequired: 'modify',
    title: 'Optimize Contact Information',
    description: 'Ensure your contact information is complete, professional, and ATS-friendly.',
    suggestedContent: 'Include: Professional email, phone number, LinkedIn URL, city/state, and optionally GitHub profile or personal website.',
    impact: 'medium',
    priority: 3,
    estimatedScoreImprovement: 12
  });
  
  // 8. General ATS optimization
  fallbackRecommendations.push({
    id: `${baseId}_ats_optimization`,
    type: 'keyword_optimization',
    category: 'ats_optimization',
    section: 'Overall ATS Optimization',
    actionRequired: 'modify',
    title: 'Improve ATS Compatibility',
    description: 'Optimize your CV for Applicant Tracking Systems to ensure it gets past the initial screening.',
    suggestedContent: 'Use standard section headings, include relevant keywords from job postings, use simple formatting, and save as both .pdf and .docx formats.',
    impact: 'high',
    priority: 2,
    estimatedScoreImprovement: 15
  });
  
  // Ensure we have at least 5 recommendations for comprehensive coverage
  const minRecommendations = 5;
  if (fallbackRecommendations.length < minRecommendations) {
    // Add additional generic improvements
    const additionalRecs: CVRecommendation[] = [
      {
        id: `${baseId}_networking`,
        type: 'section_addition' as const,
        category: 'achievements' as const,
        section: 'Professional Affiliations',
        actionRequired: 'add' as const,
        title: 'Add Professional Memberships',
        description: 'Professional memberships demonstrate industry engagement and commitment to professional development.',
        suggestedContent: 'List relevant professional associations, industry groups, or networking organizations you belong to.',
        impact: 'medium' as const,
        priority: 4,
        estimatedScoreImprovement: 8
      },
      {
        id: `${baseId}_references`,
        type: 'content' as const,
        category: 'ats_optimization' as const,
        section: 'References',
        actionRequired: 'modify' as const,
        title: 'Optimize References Section',
        description: 'Professional references can strengthen your application when properly presented.',
        suggestedContent: 'Include "References available upon request" or provide 2-3 professional references with their contact information and relationship to you.',
        impact: 'low' as const,
        priority: 5,
        estimatedScoreImprovement: 5
      }
    ];
    
    const neededCount = minRecommendations - fallbackRecommendations.length;
    fallbackRecommendations.push(...additionalRecs.slice(0, neededCount));
  }
  
  console.log(`✅ Generated ${fallbackRecommendations.length} comprehensive emergency fallback recommendations:`, 
    fallbackRecommendations.map(rec => `${rec.section}: ${rec.title} (${rec.impact} impact)`));
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
    
    // Enhanced recommendation generation with better error handling and retries
    let recommendations: CVRecommendation[] = [];
    let generationMethod = 'unknown';
    
    // Primary attempt: Generate detailed recommendations with retries
    try {
      console.log('🔍 Attempting primary recommendation generation with generateDetailedRecommendations');
      recommendations = await transformationService.generateDetailedRecommendations(
        originalCV,
        targetRole,
        industryKeywords
      );
      generationMethod = 'detailed';
      
      if (recommendations.length === 0) {
        throw new Error('Primary method returned 0 recommendations, falling back');
      }
      
      console.log(`✅ Primary generation successful: ${recommendations.length} recommendations`);
      
    } catch (primaryError: any) {
      console.warn('🔄 Primary recommendation generation failed, attempting enhanced role-based fallback:', primaryError.message);
      
      // Fallback 1: Try with enhanced role-based approach
      try {
        console.log('🔍 Attempting enhanced role-based recommendation generation');
        recommendations = await transformationService.generateRoleEnhancedRecommendations(
          originalCV,
          true, // Enable role detection for comprehensive recommendations
          targetRole,
          industryKeywords
        );
        generationMethod = 'role-enhanced';
        
        if (recommendations.length === 0) {
          throw new Error('Role-enhanced method returned 0 recommendations, falling back');
        }
        
        console.log(`✅ Role-enhanced generation successful: ${recommendations.length} recommendations`);
        
      } catch (secondaryError: any) {
        console.warn('🔄 Enhanced role-based generation failed, using emergency fallback:', secondaryError.message);
        
        // Fallback 2: Generate comprehensive emergency recommendations
        console.log('🚨 Generating comprehensive emergency fallback recommendations');
        recommendations = generateEmergencyFallbackRecommendations(originalCV);
        generationMethod = 'emergency-fallback';
        
        console.log(`⚠️  Emergency generation: ${recommendations.length} recommendations`);
      }
    }
    
    await updateProgress('Validating recommendations...', 3);
    
    // Enhanced validation with fallback values and quality assurance
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
    
    // Quality assurance: Ensure minimum recommendation count
    if (validRecommendations.length < 3) {
      console.warn(`⚠️  Low recommendation count (${validRecommendations.length}), augmenting with additional fallback recommendations`);
      const additionalRecs = generateComprehensiveFallbackRecommendations(originalCV);
      
      // Add additional recommendations that don't duplicate existing ones
      const existingSections = new Set(validRecommendations.map(rec => rec.section.toLowerCase()));
      const newRecs = additionalRecs.filter(rec => 
        !existingSections.has(rec.section.toLowerCase())
      );
      
      validRecommendations.push(...newRecs.slice(0, 5 - validRecommendations.length));
      console.log(`✅ Augmented to ${validRecommendations.length} total recommendations`);
    }
    
    // Final safety check - if still empty, generate emergency recommendations
    if (validRecommendations.length === 0) {
      console.warn('All recommendation generation methods failed, creating emergency fallback');
      const emergencyRecommendations = generateEmergencyFallbackRecommendations(originalCV);
      return emergencyRecommendations;
    }
    
    console.log('✅ [DEBUG] Final validation successful:', {
      method: generationMethod,
      totalRecommendations: validRecommendations.length,
      recommendationSummary: validRecommendations.map(rec => ({
        id: rec.id ? '✓' : '✗',
        title: rec.title ? '✓' : '✗',
        description: rec.description ? '✓' : '✗',
        section: rec.section ? '✓' : '✗',
        impact: rec.impact,
        section_name: rec.section
      }))
    });
    
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