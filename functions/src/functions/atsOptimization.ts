/**
 * Cloud Functions for ATS Optimization
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { atsOptimizationService } from '../services/ats-optimization.service';
import { EnhancedJob } from '../types/enhanced-models';
import { corsOptions } from '../config/cors';

/**
 * Analyze CV for ATS compatibility
 */
export const analyzeATSCompatibility = onCall(
  { 
    timeoutSeconds: 120,
    ...corsOptions
  },
  async (request: CallableRequest) => {
    const { data, auth } = request;
    
    // Check authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId, targetRole, targetKeywords } = data;
    if (!jobId) {
      throw new HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== auth.uid) {
        throw new HttpsError('permission-denied', 'Unauthorized access to job');
      }

      // Analyze ATS compatibility
      const atsScore = await atsOptimizationService.analyzeATSCompatibility(
        job.parsedData!,
        targetRole,
        targetKeywords
      );

      // Update job with ATS analysis
      await jobDoc.ref.update({
        'enhancedFeatures.atsOptimization': {
          enabled: true,
          data: {
            score: atsScore,
            targetRole,
            targetKeywords,
            analyzedAt: new Date()
          },
          status: 'completed',
          processedAt: new Date()
        }
      });

      return {
        success: true,
        atsScore,
        recommendations: atsScore.recommendations
      };
    } catch (error: any) {
      console.error('Error analyzing ATS compatibility:', error);
      
      // Update job with error status
      await admin.firestore().collection('jobs').doc(jobId).update({
        'enhancedFeatures.atsOptimization.status': 'failed',
        'enhancedFeatures.atsOptimization.error': error.message
      });
      
      throw new HttpsError('internal', 'Failed to analyze ATS compatibility');
    }
  }
);

/**
 * Apply ATS optimizations to CV
 */
export const applyATSOptimizations = onCall(
  { 
    timeoutSeconds: 180,
    ...corsOptions
  },
  async (request: CallableRequest) => {
    const { data, auth } = request;
    
    // Check authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId, optimizations } = data;
    if (!jobId || !optimizations) {
      throw new HttpsError('invalid-argument', 'Job ID and optimizations are required');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== auth.uid) {
        throw new HttpsError('permission-denied', 'Unauthorized access to job');
      }

      // Apply optimizations
      const optimizedCV = await atsOptimizationService.applyOptimizations(
        job.parsedData!,
        optimizations
      );

      // Update job with optimized CV
      await jobDoc.ref.update({
        parsedData: optimizedCV,
        'enhancedFeatures.atsOptimization.data.appliedOptimizations': optimizations,
        'enhancedFeatures.atsOptimization.data.optimizedAt': new Date()
      });

      return {
        success: true,
        optimizedCV,
        appliedOptimizations: optimizations
      };
    } catch (error) {
      console.error('Error applying ATS optimizations:', error);
      throw new HttpsError('internal', 'Failed to apply ATS optimizations');
    }
  }
);

/**
 * Get ATS-optimized templates
 */
export const getATSTemplates = onCall(
  { 
    timeoutSeconds: 60,
    ...corsOptions
  },
  async (request: CallableRequest) => {
    const { data } = request;
    const { industry, role } = data;

    try {
      const templates = await atsOptimizationService.getATSTemplates(industry, role);
      
      return {
        success: true,
        templates
      };
    } catch (error) {
      console.error('Error getting ATS templates:', error);
      throw new HttpsError('internal', 'Failed to get ATS templates');
    }
  }
);

/**
 * Generate ATS-optimized keywords
 */
export const generateATSKeywords = onCall(
  { 
    timeoutSeconds: 90,
    ...corsOptions
  },
  async (request: CallableRequest) => {
    const { data, auth } = request;
    
    // Check authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId, jobDescription, targetRole } = data;
    if (!jobId) {
      throw new HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== auth.uid) {
        throw new HttpsError('permission-denied', 'Unauthorized access to job');
      }

      // Generate keywords
      const keywords = await atsOptimizationService.generateKeywords(
        job.parsedData!,
        jobDescription,
        targetRole
      );

      // Extract current skills from parsed CV
      const currentSkills = job.parsedData!.skills?.technical?.map((s: any) => s.name || s) || [];
      
      // Find missing keywords
      const missingKeywords = keywords.filter((keyword: string) => 
        !currentSkills.some((skill: string) => 
          skill.toLowerCase().includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(skill.toLowerCase())
        )
      );

      // Extract industry-specific terms
      const industryTerms = keywords.filter((kw: string) => 
        ['cloud', 'aws', 'azure', 'devops', 'agile', 'saas', 'fintech', 'healthcare', 'blockchain']
          .some((tech: string) => kw.toLowerCase().includes(tech))
      );

      return {
        success: true,
        keywords: {
          all: keywords,
          missing: missingKeywords,
          industry: industryTerms,
          technical: keywords.filter((kw: string) => 
            /^[A-Z]/.test(kw) || kw.includes('.') || kw.includes('#')
          )
        }
      };
    } catch (error) {
      console.error('Error generating ATS keywords:', error);
      throw new HttpsError('internal', 'Failed to generate ATS keywords');
    }
  }
);

/**
 * Batch analyze multiple CVs for ATS optimization
 */
export const batchATSAnalysis = onCall(
  { 
    timeoutSeconds: 300,
    memory: '1GiB',
    ...corsOptions
  },
  async (request: CallableRequest) => {
    const { data, auth } = request;
    
    // Check authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobIds, targetRole } = data;
    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      throw new HttpsError('invalid-argument', 'Job IDs array is required');
    }

    if (jobIds.length > 10) {
      throw new HttpsError('invalid-argument', 'Maximum 10 jobs can be analyzed at once');
    }

    try {
      const results = await Promise.all(
        jobIds.map(async (jobId: string) => {
          try {
            // Get job and verify ownership
            const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
            if (!jobDoc.exists) {
              return { jobId, success: false, error: 'Job not found' };
            }

            const job = jobDoc.data() as EnhancedJob;
            if (job.userId !== auth.uid) {
              return { jobId, success: false, error: 'Unauthorized' };
            }

            // Analyze ATS compatibility
            const atsScore = await atsOptimizationService.analyzeATSCompatibility(
              job.parsedData!,
              targetRole
            );

            // Update job
            await jobDoc.ref.update({
              'enhancedFeatures.atsOptimization': {
                enabled: true,
                data: {
                  score: atsScore,
                  targetRole,
                  analyzedAt: new Date()
                },
                status: 'completed',
                processedAt: new Date()
              }
            });

            return {
              jobId,
              success: true,
              atsScore: atsScore.overall,
              recommendations: atsScore.recommendations.slice(0, 3)
            };
          } catch (error) {
            console.error(`Error analyzing job ${jobId}:`, error);
            return { jobId, success: false, error: 'Analysis failed' };
          }
        })
      );

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      return {
        success: true,
        analyzed: successful.length,
        failed: failed.length,
        results: successful,
        errors: failed,
        averageScore: successful.length > 0
          ? successful.reduce((sum, r) => sum + (r.atsScore || 0), 0) / successful.length
          : 0
      };
    } catch (error) {
      console.error('Error in batch ATS analysis:', error);
      throw new HttpsError('internal', 'Failed to perform batch ATS analysis');
    }
  }
);