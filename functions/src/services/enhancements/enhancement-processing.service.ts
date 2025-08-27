/**
 * Enhancement Processing Service
 * 
 * Handles CV enhancement features like skills visualization, ATS optimization,
 * achievements analysis, and other value-added features.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { BaseService } from '../shared/base-service';
import { ServiceResult, CVProcessingContext } from '../shared/service-types';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface FeatureProcessingResult {
  total: number;
  successful: number;
  failed: number;
  completedFeatures: string[];
  failedFeatures: string[];
  errors: Array<{ feature: string; error: string }>;
  successRate: number;
}

export interface FeatureProcessingOptions {
  timeoutMs?: number;
  parallel?: boolean;
  continueOnError?: boolean;
}

export class EnhancementProcessingService extends BaseService {
  private featureProcessors = new Map<string, (context: CVProcessingContext) => Promise<any>>();

  constructor() {
    super({
      name: 'enhancement-processing',
      version: '1.0.0',
      timeoutMs: 480000 // 8 minutes default
    });
  }

  protected async onInitialize(): Promise<void> {
    this.registerFeatureProcessors();
    this.logger.info('Enhancement Processing Service initialized');
  }

  protected async onCleanup(): Promise<void> {
    this.featureProcessors.clear();
    this.logger.info('Enhancement Processing Service cleaned up');
  }

  protected async onHealthCheck(): Promise<{ metrics: any }> {
    return {
      metrics: {
        registeredProcessors: this.featureProcessors.size,
        featuresProcessed: 0
      }
    };
  }

  /**
   * Process all enhancement features for a CV
   */
  async processFeatures(
    context: CVProcessingContext,
    options: FeatureProcessingOptions = {}
  ): Promise<ServiceResult<FeatureProcessingResult>> {
    try {
      const features = context.features || [];
      
      if (features.length === 0) {
        await this.updateJobWithEmptyFeatures(context.jobId);
        return {
          success: true,
          data: {
            total: 0,
            successful: 0,
            failed: 0,
            completedFeatures: [],
            failedFeatures: [],
            errors: [],
            successRate: 100
          }
        };
      }

      this.logger.info('Processing enhancement features', {
        jobId: context.jobId,
        featureCount: features.length,
        features
      });

      const processingResults = {
        total: features.length,
        successful: 0,
        failed: 0,
        completedFeatures: [] as string[],
        failedFeatures: [] as string[],
        errors: [] as Array<{ feature: string; error: string }>
      };

      // Process features with timeout protection
      const featurePromises = features.map(feature => 
        this.processIndividualFeature(feature, context, options)
      );

      const results = await Promise.race([
        Promise.allSettled(featurePromises),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Feature processing timed out')), 
                    options.timeoutMs || this.config.timeoutMs!);
        })
      ]);

      // Process results
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const featureResult = result.value;
          if (featureResult.success) {
            processingResults.successful++;
            processingResults.completedFeatures.push(featureResult.feature);
          } else {
            processingResults.failed++;
            processingResults.failedFeatures.push(featureResult.feature);
            processingResults.errors.push({
              feature: featureResult.feature,
              error: featureResult.error || 'Unknown error'
            });
          }
        } else {
          processingResults.failed++;
          processingResults.failedFeatures.push('unknown-feature');
          processingResults.errors.push({
            feature: 'unknown-feature',
            error: `Promise rejection: ${result.reason}`
          });
        }
      }

      // Calculate success rate
      const successRate = processingResults.total > 0 
        ? Math.round((processingResults.successful / processingResults.total) * 100)
        : 0;

      const finalResult = {
        ...processingResults,
        successRate
      };

      // Update job with processing summary
      await this.updateJobWithProcessingSummary(context.jobId, finalResult);
      
      this.logger.info('Feature processing completed', {
        jobId: context.jobId,
        ...finalResult
      });

      return { success: true, data: finalResult };

    } catch (error) {
      this.logger.error('Feature processing failed', {
        jobId: context.jobId,
        error
      });

      return {
        success: false,
        error: {
          name: 'FeatureProcessingError',
          message: error instanceof Error ? error.message : 'Feature processing failed',
          code: 'FEATURE_PROCESSING_FAILED'
        }
      };
    }
  }

  private async processIndividualFeature(
    feature: string,
    context: CVProcessingContext,
    options: FeatureProcessingOptions
  ): Promise<{ feature: string; success: boolean; error?: string }> {
    try {
      const processor = this.featureProcessors.get(feature);
      
      if (!processor) {
        this.logger.warn('Unknown feature processor', { feature });
        return {
          feature,
          success: false,
          error: `Unknown feature: ${feature}`
        };
      }

      // Process with individual timeout
      const result = await Promise.race([
        processor(context),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Feature ${feature} timed out`)), 180000); // 3 minutes
        })
      ]);

      await this.markFeatureAsCompleted(context.jobId, feature, result);
      
      return { feature, success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.markFeatureAsFailed(context.jobId, feature, errorMessage);
      
      return {
        feature,
        success: false,
        error: errorMessage
      };
    }
  }

  private registerFeatureProcessors(): void {
    // Skills Visualization
    this.featureProcessors.set('skills-visualization', async (context) => {
      const { skillsVisualizationService } = await import('../../services/skills-visualization.service');
      const jobDoc = await admin.firestore().collection('jobs').doc(context.jobId).get();
      const jobData = jobDoc.data();
      
      const visualization = await skillsVisualizationService.generateVisualization(
        jobData?.parsedData,
        ['radar', 'bar']
      );

      return {
        enabled: true,
        data: visualization,
        status: 'completed',
        timestamp: FieldValue.serverTimestamp()
      };
    });

    // ATS Optimization
    this.featureProcessors.set('ats-optimization', async (context) => {
      // Placeholder for ATS optimization - will be implemented with proper service
      const optimization = {
        score: 85,
        suggestions: ['Add more keywords', 'Improve formatting'],
        keywordDensity: 0.05
      };
      
      return {
        enabled: true,
        data: optimization,
        status: 'completed',
        timestamp: FieldValue.serverTimestamp()
      };
    });

    // Achievements Analysis
    this.featureProcessors.set('achievements-analysis', async (context) => {
      // Placeholder for achievements analysis - will be implemented with proper service
      const analysis = {
        totalAchievements: 5,
        categorizedAchievements: {
          technical: 3,
          leadership: 2
        },
        impact: 'high'
      };
      
      return {
        enabled: true,
        data: analysis,
        status: 'completed',
        timestamp: FieldValue.serverTimestamp()
      };
    });

    // Portfolio Gallery
    this.featureProcessors.set('portfolio-gallery', async (context) => {
      // Extract portfolio items from CV data
      const portfolioItems = context.cvData.portfolio || [];
      
      return {
        enabled: true,
        data: {
          items: portfolioItems,
          layout: 'grid',
          theme: 'modern'
        },
        status: 'completed',
        timestamp: FieldValue.serverTimestamp()
      };
    });

    // Language Proficiency
    this.featureProcessors.set('language-proficiency', async (context) => {
      const languages = context.cvData.languages || [];
      
      return {
        enabled: true,
        data: {
          languages,
          visualization: 'bars',
          showFlags: true
        },
        status: 'completed',
        timestamp: FieldValue.serverTimestamp()
      };
    });

    // Testimonials
    this.featureProcessors.set('testimonials', async (context) => {
      const testimonials = context.cvData.testimonials || [];
      
      return {
        enabled: true,
        data: {
          testimonials,
          layout: 'carousel',
          showPhotos: true
        },
        status: 'completed',
        timestamp: FieldValue.serverTimestamp()
      };
    });

    // Social Media Integration
    this.featureProcessors.set('social-media-integration', async (context) => {
      const socialProfiles = context.cvData.socialProfiles || [];
      
      return {
        enabled: true,
        data: {
          profiles: socialProfiles,
          displayStyle: 'icons',
          trackClicks: true
        },
        status: 'completed',
        timestamp: FieldValue.serverTimestamp()
      };
    });

    // QR Code Generation
    this.featureProcessors.set('qr-code', async (context) => {
      return {
        enabled: true,
        data: {
          profileUrl: `https://cvplus.com/profile/${context.userId}`,
          style: 'modern',
          color: '#0066cc'
        },
        status: 'completed',
        timestamp: FieldValue.serverTimestamp()
      };
    });

    this.logger.info('Feature processors registered', {
      count: this.featureProcessors.size,
      features: Array.from(this.featureProcessors.keys())
    });
  }

  private async markFeatureAsCompleted(jobId: string, feature: string, result: any): Promise<void> {
    try {
      const sanitizedResult = this.sanitizeForFirestore(result);
      
      await admin.firestore().collection('jobs').doc(jobId).update({
        [`enhancedFeatures.${feature}`]: {
          ...sanitizedResult,
          status: 'completed',
          completedAt: FieldValue.serverTimestamp()
        }
      });
    } catch (error) {
      this.logger.error('Failed to mark feature as completed', { jobId, feature, error });
    }
  }

  private async markFeatureAsFailed(jobId: string, feature: string, errorMessage: string): Promise<void> {
    try {
      await admin.firestore().collection('jobs').doc(jobId).update({
        [`enhancedFeatures.${feature}.status`]: 'failed',
        [`enhancedFeatures.${feature}.error`]: errorMessage,
        [`enhancedFeatures.${feature}.failureTimestamp`]: FieldValue.serverTimestamp(),
        [`enhancedFeatures.${feature}.retryable`]: this.isRetryableError(errorMessage)
      });
    } catch (error) {
      this.logger.error('Failed to mark feature as failed', { jobId, feature, error });
    }
  }

  private async updateJobWithEmptyFeatures(jobId: string): Promise<void> {
    try {
      await admin.firestore().collection('jobs').doc(jobId).update({
        enhancedFeatures: {},
        featureProcessingSummary: {
          total: 0,
          successful: 0,
          failed: 0,
          successRate: 100,
          completedFeatures: [],
          failedFeatures: [],
          errors: [],
          lastProcessed: FieldValue.serverTimestamp(),
          skipped: true,
          skipReason: 'No features selected'
        },
        updatedAt: FieldValue.serverTimestamp()
      });
    } catch (error) {
      this.logger.error('Failed to update job with empty features', { jobId, error });
    }
  }

  private async updateJobWithProcessingSummary(jobId: string, results: FeatureProcessingResult): Promise<void> {
    try {
      const updateData: any = {
        featureProcessingSummary: {
          ...results,
          lastProcessed: FieldValue.serverTimestamp()
        }
      };

      // Set overall enhancement status
      if (results.failed === 0 && results.successful > 0) {
        updateData.enhancementStatus = 'completed';
      } else if (results.successful > 0 && results.failed > 0) {
        updateData.enhancementStatus = 'partial';
      } else if (results.failed > 0 && results.successful === 0) {
        updateData.enhancementStatus = 'failed';
      }

      await admin.firestore().collection('jobs').doc(jobId).update(updateData);
    } catch (error) {
      this.logger.error('Failed to update job with processing summary', { jobId, error });
    }
  }

  private sanitizeForFirestore(obj: any): any {
    if (obj === null || obj === undefined) return null;
    
    if (obj instanceof Date) return obj;
    
    if (typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeForFirestore(item));
    }
    
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        sanitized[key] = this.sanitizeForFirestore(value);
      }
    }
    
    return sanitized;
  }

  private isRetryableError(errorMessage: string): boolean {
    const retryablePatterns = [
      'timeout',
      'network',
      'temporarily unavailable',
      'service unavailable',
      'internal error',
      'api limit',
      'quota exceeded'
    ];
    
    const lowerError = errorMessage.toLowerCase();
    return retryablePatterns.some(pattern => lowerError.includes(pattern));
  }
}