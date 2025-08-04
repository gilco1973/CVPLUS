/**
 * Cloud Functions for AI Personality Insights
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { personalityInsightsService } from '../services/personality-insights.service';
import { EnhancedJob } from '../types/enhanced-models';

/**
 * Generate personality insights from CV
 */
export const generatePersonalityInsights = functions
  .runWith({ timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId } = data;
    if (!jobId) {
      throw new functions.https.HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized to access this job');
      }

      if (!job.parsedData) {
        throw new functions.https.HttpsError('failed-precondition', 'CV must be parsed before generating insights');
      }

      // Update status
      await admin.firestore().collection('jobs').doc(jobId).update({
        'enhancedFeatures.personalityInsights': {
          enabled: true,
          status: 'processing',
          processedAt: new Date()
        }
      });

      // Generate insights
      console.log('Generating personality insights...');
      const insights = await personalityInsightsService.analyzePersonality(job.parsedData);

      // Store insights
      await admin.firestore().collection('jobs').doc(jobId).update({
        'interactiveData.personalityInsights': insights,
        'enhancedFeatures.personalityInsights': {
          enabled: true,
          status: 'completed',
          data: insights,
          processedAt: new Date()
        }
      });

      // Track analytics
      await admin.firestore().collection('jobs').doc(jobId).update({
        'analytics.personalityAnalyses': admin.firestore.FieldValue.increment(1),
        'analytics.lastPersonalityAnalysis': new Date()
      });

      return {
        success: true,
        insights
      };
    } catch (error: any) {
      console.error('Error generating personality insights:', error);
      
      // Update job with error status
      await admin.firestore().collection('jobs').doc(jobId).update({
        'enhancedFeatures.personalityInsights': {
          enabled: false,
          status: 'failed',
          error: error.message,
          processedAt: new Date()
        }
      });
      
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * Compare personality profiles
 */
export const comparePersonalities = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { jobIds } = data;
  if (!jobIds || !Array.isArray(jobIds) || jobIds.length < 2) {
    throw new functions.https.HttpsError('invalid-argument', 'At least 2 job IDs required for comparison');
  }

  if (jobIds.length > 5) {
    throw new functions.https.HttpsError('invalid-argument', 'Maximum 5 profiles can be compared');
  }

  try {
    const profiles = [];
    
    // Fetch all personality profiles
    for (const jobId of jobIds) {
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) continue;
      
      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== context.auth.uid) continue;
      
      if (job.interactiveData?.personalityInsights) {
        profiles.push({
          jobId,
          name: job.parsedData?.personalInfo?.name || 'Unknown',
          insights: job.interactiveData.personalityInsights
        });
      }
    }
    
    if (profiles.length < 2) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Not enough profiles with personality insights for comparison'
      );
    }
    
    // Calculate compatibility scores
    const comparisons = [];
    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        const compatibility = calculateCompatibility(
          profiles[i].insights,
          profiles[j].insights
        );
        
        comparisons.push({
          profile1: {
            jobId: profiles[i].jobId,
            name: profiles[i].name
          },
          profile2: {
            jobId: profiles[j].jobId,
            name: profiles[j].name
          },
          compatibility
        });
      }
    }
    
    // Generate team dynamics analysis
    const teamDynamics = analyzeTeamDynamics(profiles);
    
    return {
      success: true,
      comparisons,
      teamDynamics,
      profiles: profiles.map(p => ({
        jobId: p.jobId,
        name: p.name,
        topTraits: getTopTraits(p.insights.traits, 3),
        workStyle: p.insights.workStyle,
        teamRole: p.insights.teamCompatibility
      }))
    };
  } catch (error: any) {
    console.error('Error comparing personalities:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get personality insights summary
 */
export const getPersonalityInsightsSummary = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { jobId } = data;
  if (!jobId) {
    throw new functions.https.HttpsError('invalid-argument', 'Job ID is required');
  }

  try {
    // Get job and verify ownership
    const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Job not found');
    }

    const job = jobDoc.data() as EnhancedJob;
    if (job.userId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized');
    }

    const insights = job.interactiveData?.personalityInsights;
    if (!insights) {
      throw new functions.https.HttpsError('not-found', 'Personality insights not generated');
    }

    // Create visual-friendly summary
    const summary = {
      topTraits: getTopTraits(insights.traits, 5),
      workStyle: insights.workStyle,
      teamCompatibility: insights.teamCompatibility,
      leadershipPotential: {
        score: insights.leadershipPotential,
        level: getLeadershipLevel(insights.leadershipPotential)
      },
      cultureFit: Object.entries(insights.cultureFit)
        .sort((a, b) => b[1] - a[1])
        .map(([culture, score]) => ({
          culture: culture.charAt(0).toUpperCase() + culture.slice(1),
          score,
          percentage: Math.round(score * 10)
        })),
      summary: insights.summary,
      strengths: identifyStrengths(insights.traits),
      growthAreas: identifyGrowthAreas(insights.traits)
    };

    return {
      success: true,
      summary
    };
  } catch (error: any) {
    console.error('Error getting personality summary:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Update personality insights settings
 */
export const updatePersonalitySettings = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { jobId, settings } = data;
  if (!jobId || !settings) {
    throw new functions.https.HttpsError('invalid-argument', 'Job ID and settings are required');
  }

  try {
    // Verify ownership
    const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Job not found');
    }

    const job = jobDoc.data() as EnhancedJob;
    if (job.userId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized');
    }

    // Update settings
    const updates: any = {};
    
    if ('displayOnProfile' in settings) {
      updates['enhancedFeatures.personalityInsights.displayOnProfile'] = settings.displayOnProfile;
    }
    
    if ('shareableLink' in settings) {
      updates['enhancedFeatures.personalityInsights.shareableLink'] = settings.shareableLink;
    }
    
    if ('includeInCV' in settings) {
      updates['enhancedFeatures.personalityInsights.includeInCV'] = settings.includeInCV;
    }

    await admin.firestore().collection('jobs').doc(jobId).update(updates);

    return {
      success: true,
      message: 'Settings updated successfully'
    };
  } catch (error: any) {
    console.error('Error updating personality settings:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Helper functions

function calculateCompatibility(profile1: any, profile2: any): any {
  const traits1 = profile1.traits;
  const traits2 = profile2.traits;
  
  // Calculate trait compatibility
  let traitCompatibility = 0;
  let complementaryScore = 0;
  let conflictScore = 0;
  
  for (const trait in traits1) {
    const diff = Math.abs(traits1[trait] - traits2[trait]);
    
    // Similar traits (difference < 2) indicate compatibility
    if (diff < 2) {
      traitCompatibility += 10 - diff;
    }
    
    // Complementary traits (one high, one medium)
    if ((traits1[trait] > 7 && traits2[trait] > 4 && traits2[trait] < 7) ||
        (traits2[trait] > 7 && traits1[trait] > 4 && traits1[trait] < 7)) {
      complementaryScore += 5;
    }
    
    // Potential conflicts (both very high in leadership/dominance traits)
    if (trait === 'leadership' && traits1[trait] > 8 && traits2[trait] > 8) {
      conflictScore += 5;
    }
  }
  
  const overallScore = Math.min(100, 
    (traitCompatibility + complementaryScore - conflictScore) / 
    Object.keys(traits1).length * 10
  );
  
  return {
    score: Math.round(overallScore),
    strengths: identifyCompatibilityStrengths(traits1, traits2),
    challenges: identifyCompatibilityChallenges(traits1, traits2),
    recommendation: getCompatibilityRecommendation(overallScore)
  };
}

function analyzeTeamDynamics(profiles: any[]): any {
  const traitAverages: any = {};
  const roleDistribution: any = {};
  
  // Calculate average traits
  for (const trait of Object.keys(profiles[0].insights.traits)) {
    const sum = profiles.reduce((acc, p) => acc + p.insights.traits[trait], 0);
    traitAverages[trait] = (sum / profiles.length).toFixed(1);
  }
  
  // Analyze role distribution
  profiles.forEach(p => {
    const role = determineTeamRole(p.insights.traits);
    roleDistribution[role] = (roleDistribution[role] || 0) + 1;
  });
  
  // Identify team strengths and gaps
  const teamStrengths = [];
  const teamGaps = [];
  
  for (const [trait, avg] of Object.entries(traitAverages)) {
    if (Number(avg) > 7) {
      teamStrengths.push(trait.replace(/_/g, ' '));
    } else if (Number(avg) < 5) {
      teamGaps.push(trait.replace(/_/g, ' '));
    }
  }
  
  return {
    averageTraits: traitAverages,
    roleDistribution,
    teamStrengths,
    teamGaps,
    balance: calculateTeamBalance(roleDistribution),
    recommendation: generateTeamRecommendation(teamStrengths, teamGaps, roleDistribution)
  };
}

function getTopTraits(traits: any, count: number): any[] {
  return Object.entries(traits)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, count)
    .map(([trait, score]) => ({
      name: trait.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      score: Number(score),
      percentage: Math.round(Number(score) * 10)
    }));
}

function getLeadershipLevel(score: number): string {
  if (score >= 8) return 'Executive';
  if (score >= 6) return 'Senior';
  if (score >= 4) return 'Emerging';
  return 'Contributor';
}

function identifyStrengths(traits: any): string[] {
  return Object.entries(traits)
    .filter(([_, score]) => Number(score) >= 7)
    .map(([trait]) => trait.replace(/_/g, ' '))
    .slice(0, 3);
}

function identifyGrowthAreas(traits: any): string[] {
  return Object.entries(traits)
    .filter(([_, score]) => Number(score) < 5)
    .map(([trait]) => trait.replace(/_/g, ' '))
    .slice(0, 2);
}

function identifyCompatibilityStrengths(traits1: any, traits2: any): string[] {
  const strengths = [];
  
  if (Math.abs(traits1.communication - traits2.communication) < 2) {
    strengths.push('Aligned communication styles');
  }
  
  if (traits1.teamwork > 6 && traits2.teamwork > 6) {
    strengths.push('Strong collaborative potential');
  }
  
  if ((traits1.innovation > 7 && traits2.attention_to_detail > 7) ||
      (traits2.innovation > 7 && traits1.attention_to_detail > 7)) {
    strengths.push('Complementary creative and analytical skills');
  }
  
  return strengths;
}

function identifyCompatibilityChallenges(traits1: any, traits2: any): string[] {
  const challenges = [];
  
  if (traits1.leadership > 8 && traits2.leadership > 8) {
    challenges.push('Potential leadership conflicts');
  }
  
  if (Math.abs(traits1.attention_to_detail - traits2.attention_to_detail) > 5) {
    challenges.push('Different attention to detail levels');
  }
  
  if (Math.abs(traits1.adaptability - traits2.adaptability) > 5) {
    challenges.push('Varying adaptability preferences');
  }
  
  return challenges;
}

function getCompatibilityRecommendation(score: number): string {
  if (score >= 80) {
    return 'Excellent compatibility - likely to work very well together';
  } else if (score >= 60) {
    return 'Good compatibility - should collaborate effectively with clear communication';
  } else if (score >= 40) {
    return 'Moderate compatibility - may need to establish clear roles and expectations';
  } else {
    return 'Challenging compatibility - consider complementary team members';
  }
}

function determineTeamRole(traits: any): string {
  const scores = {
    Leader: traits.leadership * 1.5 + traits.strategic_thinking,
    Innovator: traits.innovation * 1.5 + traits.problemSolving,
    Executor: traits.attention_to_detail * 1.5 + traits.problemSolving,
    Facilitator: traits.communication * 1.5 + traits.teamwork,
    Strategist: traits.strategic_thinking * 1.5 + traits.attention_to_detail
  };
  
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])[0][0];
}

function calculateTeamBalance(roleDistribution: any): string {
  const roles = Object.keys(roleDistribution).length;
  const total = Object.values(roleDistribution).reduce((a: number, b: any) => a + b, 0);
  
  if (roles >= 4 && total >= 4) return 'Well-balanced';
  if (roles >= 3) return 'Moderately balanced';
  if (roles >= 2) return 'Limited diversity';
  return 'Needs more diversity';
}

function generateTeamRecommendation(
  strengths: string[],
  gaps: string[],
  roleDistribution: any
): string {
  const hasLeader = 'Leader' in roleDistribution;
  const hasExecutor = 'Executor' in roleDistribution;
  
  if (!hasLeader) {
    return 'Consider adding someone with strong leadership traits to guide the team';
  } else if (!hasExecutor) {
    return 'Team would benefit from someone detail-oriented to ensure execution';
  } else if (gaps.length > 2) {
    return `Team shows gaps in ${gaps.join(' and ')} - consider training or new members`;
  } else if (strengths.length > 3) {
    return `Leverage team strengths in ${strengths.slice(0, 2).join(' and ')} for optimal performance`;
  } else {
    return 'Team composition is balanced - focus on clear communication and role definition';
  }
}