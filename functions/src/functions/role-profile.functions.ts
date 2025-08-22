import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { RoleDetectionService } from '../services/role-detection.service';
import { RoleProfileService } from '../services/role-profile.service';
import { CVTransformationService } from '../services/cv-transformation.service';
import { ParsedCV } from '../types/job';
import {
  RoleProfile,
  RoleProfileAnalysis,
  RoleBasedRecommendation,
  RoleCategory,
  ExperienceLevel
} from '../types/role-profile.types';
import { corsOptions } from '../config/cors';

// Cache for recent role detection results (10 minute cache)
const roleDetectionCache = new Map<string, { data: any; timestamp: number }>();
const ROLE_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Analyzes uploaded CV and detects the most suitable role profile
 */
export const detectRoleProfile = onCall(
  {
    timeoutSeconds: 180,
    memory: '1GiB',
    concurrency: 10,
    ...corsOptions,
    secrets: ['ANTHROPIC_API_KEY']
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, cvData, forceRegenerate } = request.data;
    
    if (!jobId && !cvData) {
      throw new Error('Either job ID or CV data is required');
    }

    const db = getFirestore();
    const userId = request.auth.uid;

    try {

      let parsedCV: ParsedCV;
      
      // Get parsed CV data - either from job or from direct input
      if (jobId) {
        const jobDoc = await db.collection('jobs').doc(jobId).get();
        if (!jobDoc.exists) {
          throw new Error('Job not found');
        }

        const jobData = jobDoc.data();
        if (jobData?.userId !== userId) {
          throw new Error('Unauthorized access to job');
        }

        parsedCV = jobData?.parsedData;
        if (!parsedCV) {
          throw new Error('No parsed CV found for this job');
        }

        // Check cache first
        const cacheKey = `${jobId}-${userId}`;
        const cachedResult = roleDetectionCache.get(cacheKey);
        if (cachedResult && !forceRegenerate) {
          const isExpired = (Date.now() - cachedResult.timestamp) > ROLE_CACHE_DURATION;
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
            roleDetectionCache.delete(cacheKey);
          }
        }
      } else {
        parsedCV = cvData;
      }

      // Perform role detection analysis
      const roleDetectionService = new RoleDetectionService();
      const analysis = await roleDetectionService.detectRoles(parsedCV);


      // Store role detection results in job document if jobId provided
      if (jobId) {
        await db.collection('jobs').doc(jobId).update({
          roleAnalysis: analysis,
          detectedRole: analysis.primaryRole,
          lastRoleDetection: new Date().toISOString(),
          roleDetectionVersion: '1.0'
        });

        // Cache the result
        const cacheKey = `${jobId}-${userId}`;
        roleDetectionCache.set(cacheKey, {
          data: {
            analysis,
            detectedRole: analysis.primaryRole,
            generatedAt: new Date().toISOString()
          },
          timestamp: Date.now()
        });
      }

      return {
        success: true,
        data: {
          analysis,
          detectedRole: analysis.primaryRole,
          cached: false,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error: any) {
      
      // Update job status if jobId provided
      if (jobId) {
        try {
          await db.collection('jobs').doc(jobId).update({
            roleDetectionError: error.message,
            lastRoleDetectionError: new Date().toISOString()
          });
        } catch (dbError) {
        }
      }

      throw new Error(`Role detection failed: ${error.message}`);
    }
  }
);

/**
 * Retrieves all available role profiles for frontend display
 */
export const getRoleProfiles = onCall(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    concurrency: 20,
    ...corsOptions,
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { category, searchQuery, limit } = request.data;

    try {

      const roleProfileService = new RoleProfileService();

      let profiles: RoleProfile[];

      if (category) {
        // Get profiles by specific category
        profiles = await roleProfileService.getProfilesByCategory(category as RoleCategory);
      } else if (searchQuery) {
        // Search profiles by query
        profiles = await roleProfileService.searchProfiles(searchQuery, limit || 20);
      } else {
        // Get all profiles
        profiles = await roleProfileService.getAllProfiles();
      }

      // Apply limit if specified
      if (limit && !searchQuery) {
        profiles = profiles.slice(0, limit);
      }


      // Get service metrics for additional context
      const metrics = await roleProfileService.getMetrics();

      return {
        success: true,
        data: {
          profiles,
          totalCount: profiles.length,
          availableCategories: Object.values(RoleCategory),
          availableExperienceLevels: Object.values(ExperienceLevel),
          metrics: {
            popularRoles: metrics.popularRoles,
            totalProfilesAvailable: profiles.length
          }
        }
      };

    } catch (error: any) {
      throw new Error(`Failed to retrieve role profiles: ${error.message}`);
    }
  }
);

/**
 * Applies selected role profile to a job/CV
 */
export const applyRoleProfile = onCall(
  {
    timeoutSeconds: 240,
    memory: '1GiB',
    concurrency: 5,
    ...corsOptions,
    secrets: ['ANTHROPIC_API_KEY']
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, roleProfileId, customizationOptions } = request.data;
    
    if (!jobId || !roleProfileId) {
      throw new Error('Job ID and role profile ID are required');
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
      if (!originalCV) {
        throw new Error('No parsed CV found for this job');
      }

      // Get the role profile
      const roleProfileService = new RoleProfileService();
      const roleProfile = await roleProfileService.getProfileById(roleProfileId);
      
      if (!roleProfile) {
        throw new Error('Role profile not found');
      }

      // Update job status
      await db.collection('jobs').doc(jobId).update({
        status: 'applying_role_profile',
        processingProgress: 'Analyzing role requirements...',
        processingStage: 1,
        totalStages: 4
      });

      // Generate role-specific recommendations
      await db.collection('jobs').doc(jobId).update({
        processingProgress: 'Generating role-based recommendations...',
        processingStage: 2
      });

      const roleDetectionService = new RoleDetectionService();
      const roleAnalysis = await roleDetectionService.detectRoles(originalCV);

      // Find the matching role or use the selected one
      let targetRoleMatch = roleAnalysis.alternativeRoles.find(r => r.roleId === roleProfileId) ||
                           (roleAnalysis.primaryRole.roleId === roleProfileId ? roleAnalysis.primaryRole : null);

      if (!targetRoleMatch) {
        // Create a basic match for the selected role
        targetRoleMatch = {
          roleId: roleProfile.id,
          roleName: roleProfile.name,
          confidence: 0.7,
          matchingFactors: [],
          enhancementPotential: 60,
          recommendations: []
        };
      }

      // Apply CV transformations based on role profile
      await db.collection('jobs').doc(jobId).update({
        processingProgress: 'Applying role-specific transformations...',
        processingStage: 3
      });

      const transformationService = new CVTransformationService();
      
      // Generate role-specific recommendations
      const roleRecommendations = await generateRoleBasedRecommendations(
        roleProfile,
        originalCV,
        targetRoleMatch,
        customizationOptions
      );

      // Apply the transformations
      const transformationResult = await transformationService.applyRecommendations(
        originalCV,
        roleRecommendations
      );

      // Store results
      await db.collection('jobs').doc(jobId).update({
        processingProgress: 'Finalizing role application...',
        processingStage: 4
      });

      const now = new Date().toISOString();
      const updateData = {
        appliedRoleProfile: {
          roleId: roleProfile.id,
          roleName: roleProfile.name,
          appliedAt: now,
          customizationOptions: customizationOptions || {}
        },
        roleBasedCV: transformationResult.improvedCV,
        roleBasedRecommendations: roleRecommendations,
        roleTransformationSummary: transformationResult.transformationSummary,
        roleComparisonReport: transformationResult.comparisonReport,
        status: 'role_applied',
        lastRoleApplication: now,
        updatedAt: new Date(),
        // Clear progress indicators
        processingProgress: null,
        processingStage: null,
        totalStages: null
      };

      await db.collection('jobs').doc(jobId).update(updateData);


      return {
        success: true,
        data: {
          jobId,
          appliedRole: {
            roleId: roleProfile.id,
            roleName: roleProfile.name,
            appliedAt: now
          },
          transformedCV: transformationResult.improvedCV,
          recommendations: roleRecommendations,
          transformationSummary: transformationResult.transformationSummary,
          comparisonReport: transformationResult.comparisonReport,
          enhancementPotential: targetRoleMatch.enhancementPotential
        }
      };

    } catch (error: any) {
      
      // Update job status on error
      try {
        await db.collection('jobs').doc(jobId).update({
          status: 'role_application_failed',
          error: error.message,
          lastError: new Date().toISOString(),
          processingProgress: null,
          processingStage: null,
          totalStages: null
        });
      } catch (dbError) {
      }

      throw new Error(`Role profile application failed: ${error.message}`);
    }
  }
);

/**
 * Generates recommendations using role-specific prompts
 */
export const getRoleBasedRecommendations = onCall(
  {
    timeoutSeconds: 300,
    memory: '1GiB',
    concurrency: 8,
    ...corsOptions,
    secrets: ['ANTHROPIC_API_KEY']
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, roleProfileId, targetRole, industryKeywords, forceRegenerate } = request.data;
    
    if (!jobId) {
      throw new Error('Job ID is required');
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
      if (!originalCV) {
        throw new Error('No parsed CV found for this job');
      }

      // Check for existing role-based recommendations
      const existingRoleRecommendations = jobData?.roleBasedRecommendations;
      const lastRoleRecommendationGeneration = jobData?.lastRoleRecommendationGeneration;
      const isRecentGeneration = lastRoleRecommendationGeneration && 
        (new Date().getTime() - new Date(lastRoleRecommendationGeneration).getTime()) < 12 * 60 * 60 * 1000; // 12 hours

      if (existingRoleRecommendations && existingRoleRecommendations.length > 0 && isRecentGeneration && !forceRegenerate) {
        return {
          success: true,
          data: {
            recommendations: existingRoleRecommendations,
            cached: true,
            generatedAt: lastRoleRecommendationGeneration,
            roleProfile: roleProfileId ? await getRoleProfileInfo(roleProfileId) : null
          }
        };
      }

      // Update status
      await db.collection('jobs').doc(jobId).update({
        status: 'generating_role_recommendations',
        processingProgress: 'Analyzing role requirements...',
        processingStage: 1,
        totalStages: 3
      });

      let roleProfile: RoleProfile | null = null;
      
      // Get role profile if specified
      if (roleProfileId) {
        const roleProfileService = new RoleProfileService();
        roleProfile = await roleProfileService.getProfileById(roleProfileId);
        
        if (!roleProfile) {
          throw new Error('Specified role profile not found');
        }
      } else if (!targetRole) {
        // Detect role automatically if none specified
        await db.collection('jobs').doc(jobId).update({
          processingProgress: 'Detecting suitable role...'
        });

        const roleDetectionService = new RoleDetectionService();
        const roleAnalysis = await roleDetectionService.detectRoles(originalCV);
        
        if (roleAnalysis.primaryRole.confidence > 0.6) {
          const roleProfileService = new RoleProfileService();
          roleProfile = await roleProfileService.getProfileById(roleAnalysis.primaryRole.roleId);
        }
      }

      // Generate role-based recommendations
      await db.collection('jobs').doc(jobId).update({
        processingProgress: 'Generating personalized recommendations...',
        processingStage: 2
      });

      const recommendations = await generateEnhancedRoleRecommendations(
        originalCV,
        roleProfile,
        targetRole,
        industryKeywords
      );

      // Store results
      await db.collection('jobs').doc(jobId).update({
        processingProgress: 'Finalizing recommendations...',
        processingStage: 3
      });

      const now = new Date().toISOString();
      await db.collection('jobs').doc(jobId).update({
        roleBasedRecommendations: recommendations,
        lastRoleRecommendationGeneration: now,
        usedRoleProfile: roleProfile ? {
          roleId: roleProfile.id,
          roleName: roleProfile.name
        } : null,
        status: 'analyzed',
        processingProgress: null,
        processingStage: null,
        totalStages: null
      });


      return {
        success: true,
        data: {
          recommendations,
          cached: false,
          generatedAt: now,
          roleProfile: roleProfile ? {
            roleId: roleProfile.id,
            roleName: roleProfile.name,
            category: roleProfile.category
          } : null,
          targetRole: targetRole
        }
      };

    } catch (error: any) {
      
      // Update job status on error
      try {
        await db.collection('jobs').doc(jobId).update({
          status: 'failed',
          error: error.message,
          lastError: new Date().toISOString(),
          processingProgress: null,
          processingStage: null,
          totalStages: null
        });
      } catch (dbError) {
      }

      throw new Error(`Role-based recommendations generation failed: ${error.message}`);
    }
  }
);

/**
 * Helper function to generate role-based recommendations
 */
async function generateRoleBasedRecommendations(
  roleProfile: RoleProfile,
  parsedCV: ParsedCV,
  roleMatch: any,
  customizationOptions?: any
): Promise<any[]> {

  const recommendations: any[] = [];

  // Professional Summary Enhancement
  if (roleProfile.enhancementTemplates.professionalSummary && (!parsedCV.summary || customizationOptions?.enhanceSummary)) {
    recommendations.push({
      id: `role_${roleProfile.id}_summary`,
      title: `${roleProfile.name} Professional Summary`,
      description: `Create a professional summary tailored for ${roleProfile.name} positions`,
      section: 'summary',
      type: 'content',
      priority: 'high',
      currentContent: parsedCV.summary || '',
      suggestedContent: roleProfile.enhancementTemplates.professionalSummary,
      estimatedScoreImprovement: 25,
      roleSpecific: true,
      roleProfileId: roleProfile.id
    });
  }

  // Skills Enhancement
  if (roleProfile.enhancementTemplates.skillsStructure) {
    const skillsTemplate = roleProfile.enhancementTemplates.skillsStructure;
    const currentSkills = Array.isArray(parsedCV.skills) ? parsedCV.skills : Object.values(parsedCV.skills || {}).flat();
    
    recommendations.push({
      id: `role_${roleProfile.id}_skills`,
      title: `Optimize Skills for ${roleProfile.name}`,
      description: `Restructure and enhance skills section for ${roleProfile.name} roles`,
      section: 'skills',
      type: 'structure',
      priority: 'high',
      currentContent: currentSkills,
      suggestedContent: skillsTemplate,
      estimatedScoreImprovement: 20,
      roleSpecific: true,
      roleProfileId: roleProfile.id
    });
  }

  // Experience Enhancements
  if (roleProfile.enhancementTemplates.experienceEnhancements && parsedCV.experience) {
    parsedCV.experience.forEach((exp, index) => {
      const enhancementTemplate = roleProfile.enhancementTemplates.experienceEnhancements.find(
        template => template.roleLevel === determineExperienceLevel(exp)
      ) || roleProfile.enhancementTemplates.experienceEnhancements[0];

      recommendations.push({
        id: `role_${roleProfile.id}_exp_${index}`,
        title: `Enhance ${exp.position} for ${roleProfile.name}`,
        description: `Optimize experience description using ${roleProfile.name} best practices`,
        section: 'experience',
        type: 'content',
        priority: 'medium',
        currentContent: exp.description || '',
        suggestedContent: enhancementTemplate.bulletPointTemplate,
        estimatedScoreImprovement: 15,
        roleSpecific: true,
        roleProfileId: roleProfile.id,
        experienceIndex: index
      });
    });
  }

  // Achievement Templates
  if (roleProfile.enhancementTemplates.achievementTemplates.length > 0) {
    recommendations.push({
      id: `role_${roleProfile.id}_achievements`,
      title: `Add ${roleProfile.name} Achievements`,
      description: `Include achievements relevant to ${roleProfile.name} positions`,
      section: 'achievements',
      type: 'section',
      priority: 'medium',
      currentContent: parsedCV.achievements || [],
      suggestedContent: roleProfile.enhancementTemplates.achievementTemplates,
      estimatedScoreImprovement: 18,
      roleSpecific: true,
      roleProfileId: roleProfile.id
    });
  }

  // Keyword Optimization
  if (roleProfile.enhancementTemplates.keywordOptimization.length > 0) {
    recommendations.push({
      id: `role_${roleProfile.id}_keywords`,
      title: `${roleProfile.name} Keyword Optimization`,
      description: `Add industry-specific keywords for ${roleProfile.name} roles`,
      section: 'overall',
      type: 'keyword',
      priority: 'medium',
      currentContent: '',
      suggestedContent: roleProfile.enhancementTemplates.keywordOptimization.join(', '),
      estimatedScoreImprovement: 12,
      roleSpecific: true,
      roleProfileId: roleProfile.id
    });
  }

  return recommendations;
}

/**
 * Helper function to generate enhanced role recommendations
 */
async function generateEnhancedRoleRecommendations(
  parsedCV: ParsedCV,
  roleProfile: RoleProfile | null,
  targetRole?: string,
  industryKeywords?: string[]
): Promise<any[]> {
  const recommendations: any[] = [];

  if (roleProfile) {
    // Use role profile for targeted recommendations
    const roleBasedRecs = await generateRoleBasedRecommendations(roleProfile, parsedCV, null);
    recommendations.push(...roleBasedRecs);
  } else {
    // Generate generic recommendations enhanced with target role/industry
    const transformationService = new CVTransformationService();
    const genericRecommendations = await transformationService.generateDetailedRecommendations(
      parsedCV,
      targetRole,
      industryKeywords
    );

    // Enhance with role-specific context if target role is provided
    if (targetRole) {
      genericRecommendations.forEach(rec => {
        // Add role context to recommendation object
        (rec as any).roleContext = targetRole;
        rec.title = `${rec.title} (${targetRole} Focus)`;
        rec.description = `${rec.description} Optimized for ${targetRole} positions.`;
      });
    }

    recommendations.push(...genericRecommendations);
  }

  return recommendations;
}

/**
 * Helper function to determine experience level
 */
function determineExperienceLevel(experience: any): 'junior' | 'mid' | 'senior' | 'executive' {
  const position = (experience.position || '').toLowerCase();
  
  if (position.includes('senior') || position.includes('lead') || position.includes('principal')) {
    return 'senior';
  } else if (position.includes('manager') || position.includes('director') || position.includes('vp') || position.includes('ceo')) {
    return 'executive';
  } else if (position.includes('junior') || position.includes('intern') || position.includes('associate')) {
    return 'junior';
  }
  
  return 'mid';
}

/**
 * Helper function to get role profile information
 */
async function getRoleProfileInfo(roleProfileId: string): Promise<any> {
  try {
    const roleProfileService = new RoleProfileService();
    const roleProfile = await roleProfileService.getProfileById(roleProfileId);
    
    if (!roleProfile) return null;
    
    return {
      roleId: roleProfile.id,
      roleName: roleProfile.name,
      category: roleProfile.category,
      description: roleProfile.description,
      experienceLevel: roleProfile.experienceLevel,
      industryFocus: roleProfile.industryFocus
    };
  } catch (error) {
    return null;
  }
}