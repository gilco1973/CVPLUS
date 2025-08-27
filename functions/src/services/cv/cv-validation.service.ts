/**
 * CV Validation Service
 * 
 * Handles data validation, job access control, and CV data integrity checks.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { BaseService } from '../shared/base-service';
import { ServiceResult } from '../shared/service-types';
import * as admin from 'firebase-admin';

export interface JobValidationResult {
  jobData: any;
  cvData: any;
  isValid: boolean;
  errors: string[];
}

export interface CVDataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completeness: number; // 0-100%
}

export class CVValidationService extends BaseService {
  constructor() {
    super({
      name: 'cv-validation',
      version: '1.0.0'
    });
  }

  protected async onInitialize(): Promise<void> {
    this.logger.info('CV Validation Service initialized');
  }

  protected async onCleanup(): Promise<void> {
    this.logger.info('CV Validation Service cleaned up');
  }

  protected async onHealthCheck(): Promise<{ metrics: any }> {
    return {
      metrics: {
        validationsPerformed: 0,
        errorRate: 0
      }
    };
  }

  /**
   * Validate job access and ownership
   */
  async validateJobAccess(jobId: string, userId: string): Promise<ServiceResult<JobValidationResult>> {
    try {
      // Get job document
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        return {
          success: false,
          error: {
            name: 'JobNotFoundError',
            message: 'Job not found',
            code: 'JOB_NOT_FOUND'
          }
        };
      }

      const jobData = jobDoc.data()!;
      
      // Verify user ownership
      if (jobData.userId !== userId) {
        return {
          success: false,
          error: {
            name: 'UnauthorizedError',
            message: 'Unauthorized access to job',
            code: 'UNAUTHORIZED_ACCESS'
          }
        };
      }

      // Validate CV data exists
      const parsedCV = jobData.parsedData;
      if (!parsedCV) {
        return {
          success: false,
          error: {
            name: 'CVDataMissingError',
            message: 'No parsed CV data found',
            code: 'CV_DATA_MISSING'
          }
        };
      }

      // Determine which CV data to use (privacy version or original)
      const cvData = this.selectCVData(jobData, jobData.selectedFeatures);

      const result: JobValidationResult = {
        jobData,
        cvData,
        isValid: true,
        errors: []
      };

      return { success: true, data: result };

    } catch (error) {
      this.logger.error('Job validation failed', { jobId, userId, error });
      
      return {
        success: false,
        error: {
          name: 'ValidationError',
          message: error instanceof Error ? error.message : 'Job validation failed',
          code: 'VALIDATION_FAILED'
        }
      };
    }
  }

  /**
   * Validate CV data structure and completeness
   */
  async validateCVData(cvData: any): Promise<ServiceResult<CVDataValidationResult>> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Required fields validation
      const requiredFields = [
        'personalInfo',
        'experience',
        'education',
        'skills'
      ];

      for (const field of requiredFields) {
        if (!cvData[field]) {
          errors.push(`Missing required field: ${field}`);
        }
      }

      // Personal info validation
      if (cvData.personalInfo) {
        if (!cvData.personalInfo.name) {
          errors.push('Missing personal name');
        }
        if (!cvData.personalInfo.email) {
          warnings.push('Missing email address');
        }
        if (!cvData.personalInfo.phone) {
          warnings.push('Missing phone number');
        }
      }

      // Experience validation
      if (cvData.experience && Array.isArray(cvData.experience)) {
        cvData.experience.forEach((exp: any, index: number) => {
          if (!exp.company) {
            errors.push(`Experience ${index + 1}: Missing company name`);
          }
          if (!exp.position) {
            errors.push(`Experience ${index + 1}: Missing position title`);
          }
          if (!exp.startDate) {
            warnings.push(`Experience ${index + 1}: Missing start date`);
          }
        });
      }

      // Education validation
      if (cvData.education && Array.isArray(cvData.education)) {
        cvData.education.forEach((edu: any, index: number) => {
          if (!edu.institution) {
            errors.push(`Education ${index + 1}: Missing institution name`);
          }
          if (!edu.degree) {
            warnings.push(`Education ${index + 1}: Missing degree information`);
          }
        });
      }

      // Skills validation
      if (cvData.skills && Array.isArray(cvData.skills)) {
        if (cvData.skills.length === 0) {
          warnings.push('No skills listed');
        }
      }

      // Calculate completeness score
      const completeness = this.calculateCompleteness(cvData);

      const result: CVDataValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        completeness
      };

      return { success: true, data: result };

    } catch (error) {
      this.logger.error('CV data validation failed', { error });
      
      return {
        success: false,
        error: {
          name: 'CVValidationError',
          message: error instanceof Error ? error.message : 'CV data validation failed',
          code: 'CV_VALIDATION_FAILED'
        }
      };
    }
  }

  /**
   * Validate template compatibility with CV data
   */
  async validateTemplateCompatibility(cvData: any, templateId: string): Promise<ServiceResult<boolean>> {
    try {
      // Template-specific validation rules
      const templateRequirements = this.getTemplateRequirements(templateId);
      
      for (const requirement of templateRequirements) {
        if (!this.checkRequirement(cvData, requirement)) {
          return {
            success: false,
            error: {
              name: 'TemplateCompatibilityError',
              message: `CV data is not compatible with template ${templateId}: Missing ${requirement.field}`,
              code: 'TEMPLATE_INCOMPATIBLE'
            }
          };
        }
      }

      return { success: true, data: true };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'ValidationError',
          message: error instanceof Error ? error.message : 'Template compatibility check failed',
          code: 'VALIDATION_FAILED'
        }
      };
    }
  }

  /**
   * Validate feature requirements
   */
  async validateFeatureRequirements(cvData: any, features: string[]): Promise<ServiceResult<string[]>> {
    try {
      const incompatibleFeatures: string[] = [];
      
      for (const feature of features) {
        const isCompatible = await this.checkFeatureCompatibility(cvData, feature);
        if (!isCompatible) {
          incompatibleFeatures.push(feature);
        }
      }

      return { success: true, data: incompatibleFeatures };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'FeatureValidationError',
          message: error instanceof Error ? error.message : 'Feature validation failed',
          code: 'FEATURE_VALIDATION_FAILED'
        }
      };
    }
  }

  private selectCVData(jobData: any, features?: string[]): any {
    // Use privacy version if privacy mode is enabled
    if (features?.includes('privacy-mode') && jobData.privacyVersion) {
      return jobData.privacyVersion;
    }
    return jobData.parsedData;
  }

  private calculateCompleteness(cvData: any): number {
    let score = 0;
    const maxScore = 100;

    // Personal info (30 points)
    if (cvData.personalInfo) {
      if (cvData.personalInfo.name) score += 10;
      if (cvData.personalInfo.email) score += 5;
      if (cvData.personalInfo.phone) score += 5;
      if (cvData.personalInfo.location) score += 5;
      if (cvData.personalInfo.summary || cvData.personalInfo.objective) score += 5;
    }

    // Experience (40 points)
    if (cvData.experience && Array.isArray(cvData.experience)) {
      if (cvData.experience.length > 0) {
        score += 20; // Base score for having experience
        
        // Additional points for complete experience entries
        const completeEntries = cvData.experience.filter((exp: any) => 
          exp.company && exp.position && exp.startDate
        ).length;
        
        score += Math.min(20, completeEntries * 5);
      }
    }

    // Education (15 points)
    if (cvData.education && Array.isArray(cvData.education) && cvData.education.length > 0) {
      score += 15;
    }

    // Skills (15 points)
    if (cvData.skills && Array.isArray(cvData.skills) && cvData.skills.length > 0) {
      score += 15;
    }

    return Math.min(maxScore, score);
  }

  private getTemplateRequirements(templateId: string): { field: string, required: boolean }[] {
    const requirements: Record<string, { field: string, required: boolean }[]> = {
      'modern': [
        { field: 'personalInfo.name', required: true },
        { field: 'experience', required: true }
      ],
      'classic': [
        { field: 'personalInfo.name', required: true },
        { field: 'personalInfo.email', required: true },
        { field: 'experience', required: true },
        { field: 'education', required: true }
      ],
      'creative': [
        { field: 'personalInfo.name', required: true },
        { field: 'skills', required: true },
        { field: 'portfolio', required: false }
      ]
    };

    return requirements[templateId] || requirements['modern'];
  }

  private checkRequirement(cvData: any, requirement: { field: string, required: boolean }): boolean {
    if (!requirement.required) return true;

    const fields = requirement.field.split('.');
    let current = cvData;

    for (const field of fields) {
      if (!current || !current[field]) {
        return false;
      }
      current = current[field];
    }

    return true;
  }

  private async checkFeatureCompatibility(cvData: any, feature: string): Promise<boolean> {
    const featureRequirements: Record<string, (data: any) => boolean> = {
      'skills-visualization': (data) => data.skills && Array.isArray(data.skills) && data.skills.length > 0,
      'generate-podcast': (data) => data.experience && Array.isArray(data.experience) && data.experience.length > 0,
      'achievements-analysis': (data) => data.experience && Array.isArray(data.experience),
      'ats-optimization': () => true, // ATS optimization works with any CV data
      'portfolio-gallery': (data) => data.portfolio || (data.experience && data.experience.some((exp: any) => exp.projects)),
      'language-proficiency': (data) => data.languages && Array.isArray(data.languages) && data.languages.length > 0
    };

    const checkFunction = featureRequirements[feature];
    if (!checkFunction) {
      return true; // Unknown features are assumed compatible
    }

    return checkFunction(cvData);
  }
}