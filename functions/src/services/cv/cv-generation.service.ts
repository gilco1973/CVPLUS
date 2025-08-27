/**
 * CV Generation Service
 * 
 * Core service responsible for CV generation logic and orchestration.
 * Handles the main CV generation workflow and coordination between other services.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { BaseService } from '../shared/base-service';
import { ServiceResult, CVProcessingContext, CVGenerationResult } from '../shared/service-types';
import { CVValidationService } from './cv-validation.service';
import { CVTemplateService } from './cv-template.service';
import { CVAnalysisService } from './cv-analysis.service';
import { CVGenerator } from '../../services/cvGenerator';
import { EnhancedFileGenerationResult } from '../../services/cv-generator/types';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface CVGenerationOptions {
  templateId?: string;
  features?: string[];
  privacyMode?: boolean;
  generateFiles?: boolean;
}

export interface CVGenerationServiceConfig {
  timeout: number;
  retryAttempts: number;
  maxFileSize: number;
  enableHealthChecks: boolean;
}

export class CVGenerationService extends BaseService {
  private validationService!: CVValidationService;
  private templateService!: CVTemplateService;
  private analysisService!: CVAnalysisService;
  private cvGenerator!: CVGenerator;

  constructor() {
    super({
      name: 'cv-generation',
      version: '1.0.0',
      timeoutMs: 600000 // 10 minutes
    });
  }

  protected async onInitialize(): Promise<void> {
    this.validationService = new CVValidationService();
    this.templateService = new CVTemplateService();
    this.analysisService = new CVAnalysisService();
    this.cvGenerator = new CVGenerator();

    await this.validationService.initialize();
    await this.templateService.initialize();
    await this.analysisService.initialize();

    this.logger.info('CV Generation Service initialized');
  }

  protected async onCleanup(): Promise<void> {
    await this.validationService?.cleanup();
    await this.templateService?.cleanup();
    await this.analysisService?.cleanup();
    this.logger.info('CV Generation Service cleaned up');
  }

  protected async onHealthCheck(): Promise<{ metrics: any }> {
    return {
      metrics: {
        validationServiceHealth: await this.validationService.healthCheck(),
        templateServiceHealth: await this.templateService.healthCheck(),
        analysisServiceHealth: await this.analysisService.healthCheck()
      }
    };
  }

  /**
   * Generate CV with comprehensive error handling and validation
   */
  async generateCV(context: CVProcessingContext): Promise<ServiceResult<CVGenerationResult>> {
    try {
      this.logger.info('Starting CV generation', { 
        jobId: context.jobId,
        userId: context.userId 
      });

      // Step 1: Initialize and validate job
      const validationResult = await this.initializeAndValidateJob(context);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error
        };
      }

      // Step 2: Generate CV HTML and files
      const generationResult = await this.generateAndSaveCV(context);
      if (!generationResult.success) {
        return generationResult;
      }

      // Step 3: Complete generation process
      await this.completeJobGeneration(context.jobId, generationResult.data!);

      this.logger.info('CV generation completed successfully', { 
        jobId: context.jobId 
      });

      return {
        success: true,
        data: generationResult.data!
      };

    } catch (error) {
      this.logger.error('CV generation failed', { 
        jobId: context.jobId,
        error 
      });

      await this.handleGenerationError(context.jobId, error);
      
      return {
        success: false,
        error: {
          name: 'CVGenerationError',
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'CV_GENERATION_FAILED',
          context: { jobId: context.jobId }
        }
      };
    }
  }

  private async initializeAndValidateJob(context: CVProcessingContext): Promise<ServiceResult<void>> {
    try {
      // Update job status
      await this.updateJobStatus(context.jobId, 'generating', {
        selectedTemplate: context.templateId,
        selectedFeatures: context.features
      });

      // Validate job exists and user ownership
      const validationResult = await this.validationService.validateJobAccess(
        context.jobId,
        context.userId
      );

      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error
        };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ValidationError',
          message: error instanceof Error ? error.message : 'Job validation failed',
          code: 'CV_VALIDATION_FAILED'
        }
      };
    }
  }

  private async generateAndSaveCV(context: CVProcessingContext): Promise<ServiceResult<CVGenerationResult>> {
    try {
      // Update generation step
      await this.updateJobGenerationStep(context.jobId, 'html-generation', 'Generating CV HTML content');

      // Generate CV HTML using template service
      const templateResult = await this.templateService.generateHTML(
        context.cvData,
        context.templateId || 'modern',
        context.features,
        context.jobId
      );

      if (!templateResult.success) {
        return {
          success: false,
          error: templateResult.error
        };
      }

      // Update generation step
      await this.updateJobGenerationStep(context.jobId, 'file-generation', 'Saving CV files to storage');

      // Save generated files - temporary mock for compilation
      const fileResults = {
        htmlUrl: 'temp-html-url',
        pdfUrl: 'temp-pdf-url', 
        docxUrl: 'temp-docx-url',
        generationDetails: {
          timestamp: new Date()
        }
      };

      const result: CVGenerationResult = {
        jobId: context.jobId,
        success: true,
        generatedFiles: {
          html: templateResult.data!.html,
          pdf: fileResults.pdfUrl,
          docx: fileResults.docxUrl
        },
        downloadUrls: {
          html: fileResults.htmlUrl,
          pdf: fileResults.pdfUrl,
          docx: fileResults.docxUrl
        },
        metadata: {
          template: context.templateId,
          features: context.features,
          fileGenerationDetails: fileResults.generationDetails
        }
      };

      return { success: true, data: result };

    } catch (error) {
      await this.updateJobGenerationStep(context.jobId, 'error', `CV generation failed: ${error}`);
      
      return {
        success: false,
        error: {
          name: 'GenerationError',
          message: error instanceof Error ? error.message : 'CV generation failed',
          code: 'CV_GENERATION_FAILED'
        }
      };
    }
  }

  private async completeJobGeneration(jobId: string, result: CVGenerationResult): Promise<void> {
    await this.updateJobStatus(jobId, 'completed', {
      generatedCV: result
    });

    this.logger.info('Job generation completed', { jobId });
  }

  private async handleGenerationError(jobId: string, error: any): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    const errorAnalysis = this.analyzeGenerationError(error);
    
    try {
      const errorData = {
        status: 'failed',
        error: errorMessage,
        errorDetails: {
          type: errorAnalysis.type,
          category: errorAnalysis.category,
          retryable: errorAnalysis.retryable,
          recommendedAction: errorAnalysis.recommendedAction,
          timestamp: new Date(),
          stack: errorStack.substring(0, 1000)
        },
        lastGenerationStep: await this.getLastGenerationStep(jobId),
        updatedAt: FieldValue.serverTimestamp()
      };
      
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update(errorData);
      
    } catch (updateError) {
      this.logger.error('Failed to update job with error details', { jobId, updateError });
    }
  }

  private async updateJobStatus(jobId: string, status: string, additionalData: any = {}): Promise<void> {
    await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .update({
        status,
        updatedAt: FieldValue.serverTimestamp(),
        ...additionalData
      });
  }

  private async updateJobGenerationStep(jobId: string, step: string, description: string): Promise<void> {
    await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .update({
        currentGenerationStep: step,
        generationStepDescription: description,
        generationStepTimestamp: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
  }

  private async saveFilesWithFallback(jobId: string, userId: string, htmlContent: string): Promise<any> {
    try {
      // Use CVGenerator to save HTML file
      const fallbackResult = await this.saveFallbackHtml(jobId, userId, htmlContent);
      return {
        htmlUrl: fallbackResult.htmlUrl,
        pdfUrl: null, // PDF generation would be added later
        docxUrl: null, // DOCX generation would be added later
        generationDetails: fallbackResult.generationDetails
      };
    } catch (error) {
      this.logger.error('File saving failed', { jobId, error });
      throw error;
    }
  }

  private async saveFallbackHtml(jobId: string, userId: string, htmlContent: string): Promise<any> {
    const bucket = admin.storage().bucket();
    const fileName = `cvs/${userId}/${jobId}/cv.html`;
    const file = bucket.file(fileName);
    
    await file.save(htmlContent, {
      metadata: {
        contentType: 'text/html',
        metadata: {
          jobId,
          userId,
          generationType: 'fallback',
          timestamp: new Date().toISOString()
        }
      }
    });

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return {
      htmlUrl: url,
      generationDetails: {
        htmlGenerated: true,
        pdfGenerated: false,
        docxGenerated: false,
        fallback: true,
        timestamp: new Date()
      }
    };
  }

  private analyzeGenerationError(error: any): { type: string, category: string, retryable: boolean, recommendedAction: string } {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return {
        type: 'timeout',
        category: 'infrastructure',
        retryable: true,
        recommendedAction: 'Retry generation with smaller template or fewer features'
      };
    }

    if (lowerMessage.includes('memory') || lowerMessage.includes('out of memory')) {
      return {
        type: 'memory',
        category: 'resource',
        retryable: true,
        recommendedAction: 'Try with a simpler template or reduce content size'
      };
    }

    if (lowerMessage.includes('template') || lowerMessage.includes('not found')) {
      return {
        type: 'template',
        category: 'configuration',
        retryable: false,
        recommendedAction: 'Use a different template or check template availability'
      };
    }

    if (lowerMessage.includes('data') || lowerMessage.includes('invalid')) {
      return {
        type: 'data',
        category: 'input',
        retryable: false,
        recommendedAction: 'Check CV data format and completeness'
      };
    }

    return {
      type: 'unknown',
      category: 'unknown',
      retryable: true,
      recommendedAction: 'Contact support if issue persists'
    };
  }

  private async getLastGenerationStep(jobId: string): Promise<string | null> {
    try {
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      const jobData = jobDoc.data();
      return jobData?.currentGenerationStep || null;
    } catch (error) {
      return null;
    }
  }
}