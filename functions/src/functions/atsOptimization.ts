/**
 * Cloud Functions for ATS Optimization
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { atsOptimizationService } from '../services/ats-optimization.service';
import { EnhancedJob } from '../types/enhanced-models';

/**
 * Analyze CV for ATS compatibility
 */
export const analyzeATSCompatibility = functions
  .runWith({ timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId, targetRole, targetKeywords } = data;
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
        throw new functions.https.HttpsError('failed-precondition', 'CV must be parsed before ATS analysis');
      }

      // Update status
      await admin.firestore().collection('jobs').doc(jobId).update({
        'enhancedFeatures.atsOptimization': {
          enabled: true,
          status: 'processing',
          processedAt: new Date()
        }
      });

      // Analyze CV
      console.log('Analyzing CV for ATS compatibility...');
      const analysis = await atsOptimizationService.analyzeCV(
        job.parsedData,
        targetRole,
        targetKeywords
      );

      // Store results
      await admin.firestore().collection('jobs').doc(jobId).update({
        'enhancedFeatures.atsOptimization': {
          enabled: true,
          status: 'completed',
          data: analysis,
          processedAt: new Date()
        }
      });

      // Track analytics
      await admin.firestore().collection('jobs').doc(jobId).update({
        'analytics.atsScans': admin.firestore.FieldValue.increment(1),
        'analytics.lastATSScan': new Date()
      });

      return {
        success: true,
        analysis: {
          score: analysis.score,
          passes: analysis.passes,
          issueCount: analysis.issues.length,
          issues: analysis.issues,
          suggestions: analysis.suggestions,
          keywords: analysis.keywords
        }
      };
    } catch (error: any) {
      console.error('Error analyzing ATS compatibility:', error);
      
      // Update job with error status
      await admin.firestore().collection('jobs').doc(jobId).update({
        'enhancedFeatures.atsOptimization': {
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
 * Apply ATS optimizations to CV
 */
export const applyATSOptimizations = functions
  .runWith({ timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId, optimizations } = data;
    if (!jobId || !optimizations) {
      throw new functions.https.HttpsError('invalid-argument', 'Job ID and optimizations are required');
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

      // Apply optimizations to parsed data
      const optimizedData = {
        ...job.parsedData,
        ...optimizations
      };

      // Update job with optimized data
      await admin.firestore().collection('jobs').doc(jobId).update({
        parsedData: optimizedData,
        'enhancedFeatures.atsOptimization.optimizationsApplied': true,
        'enhancedFeatures.atsOptimization.appliedAt': new Date()
      });

      // Trigger CV regeneration if it was already generated
      if (job.status === 'completed' && job.generatedCV) {
        await admin.firestore().collection('jobs').doc(jobId).update({
          status: 'generating',
          'enhancedFeatures.atsOptimization.regenerating': true
        });
      }

      return {
        success: true,
        message: 'ATS optimizations applied successfully',
        optimizedData
      };
    } catch (error: any) {
      console.error('Error applying ATS optimizations:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * Get ATS-friendly CV templates
 */
export const getATSTemplates = functions.https.onCall(async (data, context) => {
  try {
    // Get ATS-friendly templates
    const templatesSnapshot = await admin.firestore()
      .collection('templates')
      .where('atsOptimized', '==', true)
      .get();

    const templates = templatesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // If no ATS templates exist, return default recommendations
    if (templates.length === 0) {
      return {
        success: true,
        templates: [
          {
            id: 'ats-simple',
            name: 'ATS Simple',
            description: 'Clean, simple format optimized for ATS parsing',
            features: ['Single column', 'Standard fonts', 'Clear sections', 'No graphics'],
            score: 95
          },
          {
            id: 'ats-professional',
            name: 'ATS Professional',
            description: 'Professional format with ATS-friendly structure',
            features: ['Chronological order', 'Bullet points', 'Keywords optimized', 'Clean headers'],
            score: 90
          },
          {
            id: 'ats-modern',
            name: 'ATS Modern',
            description: 'Modern look while maintaining ATS compatibility',
            features: ['Subtle design', 'ATS-safe formatting', 'Skills section', 'Clear hierarchy'],
            score: 85
          }
        ]
      };
    }

    return {
      success: true,
      templates
    };
  } catch (error: any) {
    console.error('Error getting ATS templates:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Generate ATS keyword suggestions
 */
export const generateATSKeywords = functions
  .runWith({ timeoutSeconds: 60 })
  .https.onCall(async (data) => {
    const { jobDescription, industry, role } = data;
    
    if (!jobDescription && !role) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Either job description or role is required'
      );
    }

    try {
      // Extract keywords from job description
      const keywords = new Set<string>();
      
      // Common technical keywords by industry
      const industryKeywords: Record<string, string[]> = {
        'technology': ['agile', 'scrum', 'git', 'ci/cd', 'cloud', 'aws', 'docker', 'kubernetes'],
        'marketing': ['seo', 'sem', 'analytics', 'campaign', 'roi', 'conversion', 'engagement'],
        'finance': ['analysis', 'reporting', 'compliance', 'risk', 'portfolio', 'investment'],
        'healthcare': ['patient care', 'hipaa', 'ehr', 'clinical', 'diagnosis', 'treatment'],
        'sales': ['crm', 'pipeline', 'quota', 'negotiation', 'client relations', 'revenue']
      };
      
      // Add industry-specific keywords
      if (industry && industryKeywords[industry.toLowerCase()]) {
        industryKeywords[industry.toLowerCase()].forEach(k => keywords.add(k));
      }
      
      // Extract keywords from job description
      if (jobDescription) {
        // Look for skills and requirements
        const skillPatterns = [
          /required:?\s*([^.]+)/gi,
          /skills:?\s*([^.]+)/gi,
          /experience with\s+([^.]+)/gi,
          /knowledge of\s+([^.]+)/gi,
          /proficient in\s+([^.]+)/gi
        ];
        
        skillPatterns.forEach(pattern => {
          const matches = jobDescription.matchAll(pattern);
          for (const match of matches) {
            const skills = match[1].split(/[,;]/).map(s => s.trim().toLowerCase());
            skills.forEach(skill => {
              if (skill.length > 2 && skill.length < 30) {
                keywords.add(skill);
              }
            });
          }
        });
        
        // Extract technology/tool names
        const techPattern = /\b[A-Z][a-zA-Z0-9+#.-]+\b/g;
        const techMatches = jobDescription.match(techPattern);
        if (techMatches) {
          techMatches.forEach(tech => {
            if (tech.length > 1 && tech.length < 20) {
              keywords.add(tech.toLowerCase());
            }
          });
        }
      }
      
      // Role-based keywords
      const roleKeywords: Record<string, string[]> = {
        'developer': ['programming', 'debugging', 'testing', 'deployment', 'architecture'],
        'manager': ['leadership', 'planning', 'budgeting', 'team building', 'strategy'],
        'analyst': ['data analysis', 'reporting', 'visualization', 'insights', 'metrics'],
        'designer': ['ui/ux', 'wireframing', 'prototyping', 'user research', 'figma']
      };
      
      if (role) {
        const roleKey = Object.keys(roleKeywords).find(k => 
          role.toLowerCase().includes(k)
        );
        if (roleKey) {
          roleKeywords[roleKey].forEach(k => keywords.add(k));
        }
      }
      
      return {
        success: true,
        keywords: Array.from(keywords).slice(0, 30), // Return top 30 keywords
        categories: {
          technical: Array.from(keywords).filter(k => 
            k.match(/^[a-z0-9+#.-]+$/i)
          ),
          skills: Array.from(keywords).filter(k => 
            k.includes(' ') || k.length > 10
          ),
          action: ['managed', 'developed', 'implemented', 'designed', 'led', 'created']
        }
      };
    } catch (error: any) {
      console.error('Error generating keywords:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * Batch ATS analysis for multiple CVs
 */
export const batchATSAnalysis = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobIds, targetRole, targetKeywords } = data;
    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Job IDs array is required');
    }

    if (jobIds.length > 10) {
      throw new functions.https.HttpsError('invalid-argument', 'Maximum 10 CVs per batch');
    }

    try {
      const results = [];
      
      for (const jobId of jobIds) {
        try {
          // Get job and verify ownership
          const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
          if (!jobDoc.exists) {
            results.push({
              jobId,
              success: false,
              error: 'Job not found'
            });
            continue;
          }

          const job = jobDoc.data() as EnhancedJob;
          if (job.userId !== context.auth.uid) {
            results.push({
              jobId,
              success: false,
              error: 'Not authorized'
            });
            continue;
          }

          if (!job.parsedData) {
            results.push({
              jobId,
              success: false,
              error: 'CV not parsed'
            });
            continue;
          }

          // Analyze CV
          const analysis = await atsOptimizationService.analyzeCV(
            job.parsedData,
            targetRole,
            targetKeywords
          );

          // Store results
          await admin.firestore().collection('jobs').doc(jobId).update({
            'enhancedFeatures.atsOptimization': {
              enabled: true,
              status: 'completed',
              data: {
                score: analysis.score,
                passes: analysis.passes,
                issueCount: analysis.issues.length
              },
              processedAt: new Date()
            }
          });

          results.push({
            jobId,
            success: true,
            score: analysis.score,
            passes: analysis.passes,
            issueCount: analysis.issues.length
          });
        } catch (error: any) {
          results.push({
            jobId,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          averageScore: results
            .filter(r => r.success && r.score)
            .reduce((sum, r) => sum + r.score, 0) / 
            results.filter(r => r.success).length || 0
        }
      };
    } catch (error: any) {
      console.error('Error in batch ATS analysis:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });