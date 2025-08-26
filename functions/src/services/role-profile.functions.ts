import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { EnhancedRoleDetectionService } from '../services/enhanced-role-detection.service';
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
 * Analyzes uploaded CV and detects multiple suitable role profiles using Opus 4.1
 * Enhanced version that guarantees at least 2 role suggestions with detailed reasoning
 */
export const detectRoleProfile = onCall(
  {
    timeoutSeconds: 300, // Increased timeout for Opus 4.1
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
      console.log(`[DETECT-ROLE-PROFILE] Starting enhanced role detection with Opus 4.1 for user: ${userId}`);

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
        const cacheKey = `${jobId}-${userId}-enhanced`;
        const cachedResult = roleDetectionCache.get(cacheKey);
        if (cachedResult && !forceRegenerate) {
          const isExpired = (Date.now() - cachedResult.timestamp) > ROLE_CACHE_DURATION;
          if (!isExpired) {
            console.log('[DETECT-ROLE-PROFILE] Returning cached results');
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

      // Perform enhanced role detection analysis with Opus 4.1
      console.log('[DETECT-ROLE-PROFILE] Starting enhanced role detection analysis');
      const roleDetectionService = new EnhancedRoleDetectionService();
      const analysis = await roleDetectionService.detectRoles(parsedCV);

      console.log(`[DETECT-ROLE-PROFILE] Analysis complete. Primary role: ${analysis.primaryRole.roleName} (${Math.round(analysis.primaryRole.confidence * 100)}% confidence)`);
      console.log(`[DETECT-ROLE-PROFILE] Alternative roles: ${analysis.alternativeRoles.length} found`);

      // Validate that we have multiple roles as required
      if (analysis.alternativeRoles.length === 0) {
        console.warn('[DETECT-ROLE-PROFILE] Warning: Only 1 role detected, expected at least 2');
      }

      // Store role detection results in job document if jobId provided
      if (jobId) {
        await db.collection('jobs').doc(jobId).update({
          roleAnalysis: analysis,
          detectedRole: analysis.primaryRole,
          alternativeRoles: analysis.alternativeRoles,
          roleDetectionVersion: '2.0-opus',
          lastRoleDetection: new Date().toISOString(),
          roleDetectionMetadata: {
            model: 'claude-opus-4-1-20250805',
            totalRoles: 1 + analysis.alternativeRoles.length,
            overallConfidence: Math.round(analysis.overallConfidence * 100),
            primaryRoleConfidence: Math.round(analysis.primaryRole.confidence * 100),
            enhancedReasoning: true
          }
        });

        // Cache the result
        const cacheKey = `${jobId}-${userId}-enhanced`;
        roleDetectionCache.set(cacheKey, {
          data: {
            analysis,
            detectedRole: analysis.primaryRole,
            alternativeRoles: analysis.alternativeRoles,
            metadata: {
              model: 'claude-opus-4-1-20250805',
              totalRoles: 1 + analysis.alternativeRoles.length,
              enhancedReasoning: true
            },
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
          alternativeRoles: analysis.alternativeRoles,
          metadata: {
            model: 'claude-opus-4-1-20250805',
            totalRoles: 1 + analysis.alternativeRoles.length,
            overallConfidence: Math.round(analysis.overallConfidence * 100),
            primaryRoleConfidence: Math.round(analysis.primaryRole.confidence * 100),
            enhancedReasoning: true,
            scoringBreakdown: {
              primaryRole: analysis.primaryRole.scoringReasoning,
              fitAnalysis: analysis.primaryRole.fitAnalysis
            }
          },
          cached: false,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error: any) {
      console.error('[DETECT-ROLE-PROFILE] Error:', error);
      
      // Update job status if jobId provided
      if (jobId) {
        try {
          await db.collection('jobs').doc(jobId).update({
            roleDetectionError: error.message,
            lastRoleDetectionError: new Date().toISOString(),
            roleDetectionVersion: '2.0-opus'
          });
        } catch (dbError) {
          console.error('[DETECT-ROLE-PROFILE] DB update error:', dbError);
        }
      }

      throw new Error(`Enhanced role detection failed: ${error.message}`);
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
      console.log('[GET-ROLE-PROFILES] Fetching role profiles');

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

      console.log(`[GET-ROLE-PROFILES] Found ${profiles.length} profiles`);

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
      console.error('[GET-ROLE-PROFILES] Error:', error);
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
      console.log(`[APPLY-ROLE-PROFILE] Applying profile ${roleProfileId} to job ${jobId}`);

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

      // Generate role-specific recommendations using enhanced detection
      await db.collection('jobs').doc(jobId).update({
        processingProgress: 'Generating enhanced role-based recommendations...',
        processingStage: 2
      });

      const roleDetectionService = new EnhancedRoleDetectionService();
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
          recommendations: [],
          scoringReasoning: `Applied role profile: ${roleProfile.name}`,
          fitAnalysis: {
            strengths: ['Selected role profile'],
            gaps: ['Role-specific optimization needed'],
            overallAssessment: `Applying ${roleProfile.name} profile to optimize CV presentation.`
          }
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
          customizationOptions: customizationOptions || {},
          enhancedReasoning: targetRoleMatch.scoringReasoning,
          fitAnalysis: targetRoleMatch.fitAnalysis
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

      console.log('[APPLY-ROLE-PROFILE] Role application complete');

      return {
        success: true,
        data: {
          jobId,
          appliedRole: {
            roleId: roleProfile.id,
            roleName: roleProfile.name,
            appliedAt: now,
            reasoning: targetRoleMatch.scoringReasoning,
            fitAnalysis: targetRoleMatch.fitAnalysis
          },
          transformedCV: transformationResult.improvedCV,
          recommendations: roleRecommendations,
          transformationSummary: transformationResult.transformationSummary,
          comparisonReport: transformationResult.comparisonReport,
          enhancementPotential: targetRoleMatch.enhancementPotential
        }
      };

    } catch (error: any) {
      console.error('[APPLY-ROLE-PROFILE] Error:', error);
      
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
        console.error('[APPLY-ROLE-PROFILE] DB update error:', dbError);
      }

      throw new Error(`Role profile application failed: ${error.message}`);
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
  console.log('[ROLE-RECOMMENDATIONS] Generating recommendations');

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
      roleProfileId: roleProfile.id,
      reasoning: `Enhanced professional summary will better align with ${roleProfile.name} role expectations`
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
      roleProfileId: roleProfile.id,
      reasoning: `Categorized skills structure will highlight relevant competencies for ${roleProfile.name} positions`
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
        experienceIndex: index,
        reasoning: `Role-specific language will better demonstrate relevant experience for ${roleProfile.name} positions`
      });
    });
  }

  console.log(`[ROLE-RECOMMENDATIONS] Generated ${recommendations.length} recommendations`);
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