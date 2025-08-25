import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import { withPremiumAccess } from '../middleware/premiumGuard';
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

// Define Firebase Secrets
const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');

// Cache for recent role detection results (10 minute cache)
const roleDetectionCache = new Map<string, { data: any; timestamp: number }>();
const ROLE_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Analyzes uploaded CV and detects multiple suitable role profiles using Opus 4.1
 * Enhanced version that guarantees at least 2 role suggestions with detailed reasoning
 * PREMIUM FEATURE: Requires 'roleDetection' premium access
 */
export const detectRoleProfile = onCall(
  {
    timeoutSeconds: 120, // Balanced timeout for Opus 4.1 (2 minutes)
    memory: '512MiB', // Reduced memory allocation
    concurrency: 10,
    ...corsOptions,
    secrets: ['ANTHROPIC_API_KEY']
  },
  withPremiumAccess('roleDetection', async (request) => {
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
      
      // Set the API key from Firebase Secret for the current execution
      process.env.ANTHROPIC_API_KEY = anthropicApiKey.value();
      
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
  })
);

/**
 * Retrieves all available role profiles for frontend display
 * PREMIUM FEATURE: Requires 'roleDetection' premium access
 */
export const getRoleProfiles = onCall(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    concurrency: 20,
    ...corsOptions,
  },
  withPremiumAccess('roleDetection', async (request) => {
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
  })
);

/**
 * Applies selected role profile to a job/CV
 * PREMIUM FEATURE: Requires 'roleDetection' premium access
 */
export const applyRoleProfile = onCall(
  {
    timeoutSeconds: 240,
    memory: '1GiB',
    concurrency: 5,
    ...corsOptions,
    secrets: ['ANTHROPIC_API_KEY']
  },
  withPremiumAccess('roleDetection', async (request) => {
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

      // Check if role analysis already exists from detectRoleProfile to avoid duplicate expensive calls
      let roleAnalysis = jobData?.roleAnalysis;
      
      if (!roleAnalysis) {
        console.log('[APPLY-ROLE-PROFILE] No existing role analysis found, generating new analysis...');
        // Set the API key from Firebase Secret for the current execution
        process.env.ANTHROPIC_API_KEY = anthropicApiKey.value();
        
        const roleDetectionService = new EnhancedRoleDetectionService();
        roleAnalysis = await roleDetectionService.detectRoles(originalCV);
        
        // Store the analysis for future use
        await db.collection('jobs').doc(jobId).update({
          roleAnalysis: roleAnalysis,
          lastRoleDetection: new Date().toISOString()
        });
      } else {
        console.log('[APPLY-ROLE-PROFILE] Reusing existing role analysis, avoiding duplicate API call');
      }

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
  })
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

/**
 * Gets role-based recommendations for a specific job/CV and role combination
 * PREMIUM FEATURE: Requires 'roleDetection' premium access
 */
export const getRoleBasedRecommendations = onCall(
  {
    timeoutSeconds: 120, // Balanced timeout for recommendations
    memory: '512MiB', // Reduced memory allocation
    concurrency: 10,
    ...corsOptions,
    secrets: ['ANTHROPIC_API_KEY']
  },
  withPremiumAccess('roleDetection', async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { roleProfileId, targetRole, jobId, forceRegenerate } = request.data;
    
    // Validate required parameters
    if (!jobId) {
      throw new Error('Job ID is required');
    }
    if (!roleProfileId && !targetRole) {
      throw new Error('Either role profile ID or target role is required');
    }

    const db = getFirestore();
    const authenticatedUserId = request.auth.uid;

    // Use roleProfileId as primary, fallback to targetRole as roleId
    const roleId = roleProfileId || targetRole;
    let roleName = targetRole || 'Unknown Role';

    try {
      console.log(`[GET-ROLE-RECOMMENDATIONS] Getting recommendations for job: ${jobId}, role: ${roleId} (${roleName})`);

      // Check cache first if not forcing regeneration
      const cacheKey = `recommendations_${roleId || targetRole}`;
      if (!forceRegenerate) {
        console.log('[GET-ROLE-RECOMMENDATIONS] Checking cache for existing recommendations');
        const jobDocForCache = await db.collection('jobs').doc(jobId).get();
        const existingCache = jobDocForCache.data()?.roleRecommendationsCache?.[cacheKey];
        
        if (existingCache && existingCache.generatedAt) {
          const cacheAge = Date.now() - new Date(existingCache.generatedAt).getTime();
          const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
          
          if (cacheAge < maxCacheAge) {
            console.log('[GET-ROLE-RECOMMENDATIONS] Returning cached recommendations');
            return {
              success: true,
              data: {
                recommendations: existingCache.recommendations,
                cached: true,
                generatedAt: existingCache.generatedAt,
                roleProfile: {
                  roleId: existingCache.roleId,
                  roleName: existingCache.roleName,
                  category: 'general'
                },
                targetRole: existingCache.roleName
              }
            };
          } else {
            console.log('[GET-ROLE-RECOMMENDATIONS] Cache expired, regenerating');
          }
        }
      }

      // Get the job document
      const jobDoc = await db.collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }

      const jobData = jobDoc.data();
      if (jobData?.userId !== authenticatedUserId) {
        throw new Error('Unauthorized access to job');
      }

      const parsedCV: ParsedCV = jobData?.parsedData;
      if (!parsedCV) {
        throw new Error('No parsed CV found for this job');
      }

      // Get the role profile
      const roleProfileService = new RoleProfileService();
      // Try to get role profile if roleId is provided
      let roleProfile = null;
      if (roleId) {
        roleProfile = await roleProfileService.getProfileById(roleId);
      }
      
      // If no specific role profile, create a generic one based on target role
      if (!roleProfile && targetRole) {
        console.log(`[GET-ROLE-RECOMMENDATIONS] Creating generic profile for target role: ${targetRole}`);
        roleProfile = {
          id: `generic_${targetRole.toLowerCase().replace(/\s+/g, '_')}`,
          name: targetRole,
          category: 'general',
          description: `Generic role profile for ${targetRole}`,
          keywords: [targetRole],
          requiredSkills: [],
          preferredSkills: [],
          experienceLevel: 'mid' as const,
          industryFocus: [],
          matchingCriteria: {
            titleKeywords: [targetRole],
            skillKeywords: [],
            industryKeywords: [],
            experienceKeywords: []
          },
          enhancementTemplates: {
            professionalSummary: `Professional summary optimized for ${targetRole} positions`,
            skillsStructure: {
              categories: [
                {
                  name: 'Core Skills',
                  skills: [],
                  priority: 1
                }
              ],
              displayFormat: 'categorized' as const,
              maxSkillsPerCategory: 10
            },
            experienceEnhancements: [
              {
                roleLevel: 'mid' as const,
                bulletPointTemplate: 'Enhanced experience description for ${targetRole}',
                achievementTemplate: 'Quantified achievement for ${targetRole}',
                quantificationGuide: 'Include metrics and numbers',
                actionVerbs: ['Led', 'Developed', 'Managed', 'Implemented', 'Improved']
              }
            ],
            achievementTemplates: [`Achievement template for ${targetRole}`],
            keywordOptimization: [targetRole]
          },
          validationRules: {
            requiredSections: ['summary', 'experience', 'skills'],
            optionalSections: ['education', 'certifications'],
            criticalSkills: []
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0',
          isActive: true
        };
        roleName = targetRole;
      }
      
      if (!roleProfile) {
        throw new Error('Role profile not found and no target role specified');
      }

      console.log(`[GET-ROLE-RECOMMENDATIONS] Using role profile: ${roleProfile.name}`);
      roleName = roleProfile.name;

      // Set the API key from Firebase Secret for the current execution
      process.env.ANTHROPIC_API_KEY = anthropicApiKey.value();
      
      // Generate role-specific recommendations
      const roleRecommendations = await generateRoleBasedRecommendations(
        roleProfile,
        parsedCV,
        {
          roleId: roleProfile.id,
          roleName: roleProfile.name,
          confidence: 0.8, // High confidence since user selected this role
          matchingFactors: [],
          enhancementPotential: 70,
          recommendations: [],
          scoringReasoning: `User-selected role: ${roleProfile.name}`,
          fitAnalysis: {
            strengths: ['User-selected role profile'],
            gaps: ['Role-specific optimization needed'],
            overallAssessment: `Generating recommendations for selected ${roleProfile.name} role.`
          }
        }
      );

      console.log(`[GET-ROLE-RECOMMENDATIONS] Generated ${roleRecommendations.length} recommendations`);

      // Store recommendations in job document for caching
      const now = new Date().toISOString();
      const finalCacheKey = `recommendations_${roleId || targetRole}`;
      
      await db.collection('jobs').doc(jobId).update({
        [`roleRecommendationsCache.${finalCacheKey}`]: {
          recommendations: roleRecommendations,
          roleId: roleProfile.id,
          roleName: roleProfile.name,
          generatedAt: now,
          userId: authenticatedUserId
        },
        lastRecommendationsUpdate: now
      });

      return {
        success: true,
        data: {
          recommendations: roleRecommendations,
          cached: false,
          generatedAt: now,
          roleProfile: {
            roleId: roleProfile.id,
            roleName: roleProfile.name,
            category: roleProfile.category || 'general'
          },
          targetRole: targetRole || roleProfile.name
        }
      };

    } catch (error: any) {
      console.error('[GET-ROLE-RECOMMENDATIONS] Error:', error);
      throw new Error(`Failed to get role recommendations: ${error.message}`);
    }
  })
);