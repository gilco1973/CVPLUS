/**
 * CV Service Core
 * Main orchestrator for all CV-related operations
 * Provides a unified API while maintaining separation of concerns
 */

import { CVParser } from './CVParser';
import { CVValidator } from './CVValidator';
import { CVAnalyzer } from './CVAnalyzer';
import { CVTransformer } from './CVTransformer';
import { MediaService } from '../features/MediaService';
import { VisualizationService } from '../features/VisualizationService';
import { IntegrationService } from '../features/IntegrationService';
import { ProfileService } from '../features/ProfileService';
import type { 
  Job, 
  JobCreateParams, 
  FileUploadParams, 
  CVProcessParams,
  CVAnalysisParams 
} from '../../types/cv';

/**
 * Main CV Service orchestrating all CV-related operations
 */
export class CVServiceCore {
  // Core job operations
  static async createJob(params: JobCreateParams): Promise<string> {
    return CVParser.createJob(params);
  }

  static async uploadCV(params: FileUploadParams): Promise<string> {
    return CVParser.uploadCV(params);
  }

  static async processCV(params: CVProcessParams) {
    return CVParser.processCV(params);
  }

  static async generateCV(jobId: string, templateId: string, features: string[]) {
    return CVParser.generateCV(jobId, templateId, features);
  }

  // Job management
  static subscribeToJob(jobId: string, callback: (job: Job | null) => void) {
    return CVValidator.subscribeToJob(jobId, callback);
  }

  static async getJob(jobId: string): Promise<Job | null> {
    return CVValidator.getJob(jobId);
  }

  static async getTemplates(category?: string) {
    return CVValidator.getTemplates(category);
  }

  // Analysis operations
  static async analyzeCV(params: CVAnalysisParams) {
    return CVAnalyzer.analyzeCV(params);
  }

  static async enhancedAnalyzeCV(params: CVAnalysisParams) {
    return CVAnalyzer.enhancedAnalyzeCV(params);
  }

  static async getRecommendations(
    jobId: string, 
    targetRole?: string, 
    industryKeywords?: string[], 
    forceRegenerate?: boolean
  ) {
    return CVAnalyzer.getRecommendations(jobId, targetRole, industryKeywords, forceRegenerate);
  }

  static async previewImprovement(jobId: string, recommendationId: string) {
    return CVAnalyzer.previewImprovement(jobId, recommendationId);
  }

  // Transformation operations
  static async applyImprovements(
    jobId: string, 
    selectedRecommendationIds: string[], 
    targetRole?: string, 
    industryKeywords?: string[]
  ) {
    return CVTransformer.applyImprovements(
      jobId, 
      selectedRecommendationIds, 
      targetRole, 
      industryKeywords
    );
  }

  // ATS operations
  static async analyzeATSCompatibility(jobId: string, targetRole?: string, targetKeywords?: string[]) {
    return CVAnalyzer.analyzeATSCompatibility(jobId, targetRole, targetKeywords);
  }

  static async applyATSOptimizations(jobId: string, optimizations: any) {
    return CVTransformer.applyATSOptimizations(jobId, optimizations);
  }

  static async generateATSKeywords(jobDescription: string, industry?: string, role?: string) {
    return CVAnalyzer.generateATSKeywords(jobDescription, industry, role);
  }

  // Validation utilities
  static validateJobStatus(job: Job): boolean {
    return CVValidator.validateJobStatus(job);
  }

  static validateJobSettings(settings: any): boolean {
    return CVValidator.validateJobSettings(settings);
  }

  static validateFileUpload(file: File) {
    return CVValidator.validateFileUpload(file);
  }

  static validateURL(url: string) {
    return CVValidator.validateURL(url);
  }
}

/**
 * Legacy compatibility exports
 * These maintain backward compatibility with existing code
 */

// Core operations
export const createJob = (url?: string, quickCreate?: boolean, userInstructions?: string) =>
  CVServiceCore.createJob({ url, quickCreate, userInstructions });

export const uploadCV = (file: File, jobId: string) =>
  CVServiceCore.uploadCV({ file, jobId });

export const processCV = (jobId: string, fileUrl: string, mimeType: string, isUrl?: boolean) =>
  CVServiceCore.processCV({ jobId, fileUrl, mimeType, isUrl });

export const subscribeToJob = CVServiceCore.subscribeToJob;
export const getJob = CVServiceCore.getJob;
export const generateCV = CVServiceCore.generateCV;
export const getTemplates = CVServiceCore.getTemplates;

// Analysis operations
export const analyzeCV = (parsedCV: any, targetRole?: string) =>
  CVServiceCore.analyzeCV({ parsedCV, targetRole });

export const enhancedAnalyzeCV = (
  parsedCV: any, 
  targetRole?: string, 
  jobDescription?: string, 
  industryKeywords?: string[], 
  jobId?: string
) =>
  CVServiceCore.enhancedAnalyzeCV({ 
    parsedCV, 
    targetRole, 
    jobDescription, 
    industryKeywords, 
    jobId 
  });

export const getRecommendations = CVServiceCore.getRecommendations;
export const previewImprovement = CVServiceCore.previewImprovement;
export const applyImprovements = CVServiceCore.applyImprovements;

// ATS operations
export const analyzeATSCompatibility = CVServiceCore.analyzeATSCompatibility;
export const applyATSOptimizations = CVServiceCore.applyATSOptimizations;
export const generateATSKeywords = CVServiceCore.generateATSKeywords;

// Feature services - direct exports for complex operations
export { MediaService, VisualizationService, IntegrationService, ProfileService };

// Type exports
export type { Job, JobCreateParams, FileUploadParams, CVProcessParams, CVAnalysisParams };