import { CVRecommendation } from '../cv-transformation.service';
import { ParsedCV } from '../../types/job';

/**
 * ValidationEngine - Handles validation logic for recommendations and CV data
 * Ensures data quality, recommendation validity, and business rule compliance
 */
export class ValidationEngine {
  /**
   * Validates request parameters for recommendation operations
   */
  validateRecommendationRequest(data: any): {
    isValid: boolean;
    errors: string[];
    sanitizedData: any;
  } {
    const errors: string[] = [];
    const sanitizedData = { ...data };

    // Validate jobId
    if (!data.jobId || typeof data.jobId !== 'string') {
      errors.push('Job ID is required and must be a string');
    }

    // Validate selectedRecommendationIds for apply operations
    if (data.selectedRecommendationIds !== undefined) {
      if (!Array.isArray(data.selectedRecommendationIds)) {
        errors.push('Selected recommendation IDs must be an array');
      } else if (data.selectedRecommendationIds.length === 0) {
        errors.push('At least one recommendation ID must be selected');
      }
    }

    // Validate targetRole if provided
    if (data.targetRole && typeof data.targetRole !== 'string') {
      errors.push('Target role must be a string');
    }

    // Validate industryKeywords if provided
    if (data.industryKeywords && !Array.isArray(data.industryKeywords)) {
      errors.push('Industry keywords must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    };
  }

  /**
   * Validates authentication and authorization
   */
  validateAuth(request: any): { isValid: boolean; userId: string; error?: string } {
    if (!request.auth) {
      return { isValid: false, userId: '', error: 'User must be authenticated' };
    }

    return { isValid: true, userId: request.auth.uid };
  }

  /**
   * Validates recommendation quality and ensures minimum standards
   */
  validateRecommendationQuality(
    recommendations: CVRecommendation[],
    minCount: number = 3
  ): {
    isValid: boolean;
    issues: string[];
    validatedRecommendations: CVRecommendation[];
    needsAugmentation: boolean;
  } {
    const issues: string[] = [];
    const validatedRecommendations: CVRecommendation[] = [];

    // Check minimum count
    if (recommendations.length < minCount) {
      issues.push(`Insufficient recommendations: ${recommendations.length} < ${minCount}`);
    }

    // Validate each recommendation
    for (const rec of recommendations) {
      const validation = this.validateSingleRecommendation(rec);
      if (validation.isValid) {
        validatedRecommendations.push(validation.recommendation);
      } else {
        issues.push(`Recommendation ${rec.id}: ${validation.errors.join(', ')}`);
      }
    }

    return {
      isValid: validatedRecommendations.length >= minCount && issues.length === 0,
      issues,
      validatedRecommendations,
      needsAugmentation: validatedRecommendations.length < minCount
    };
  }

  /**
   * Validates a single recommendation for completeness and quality
   */
  private validateSingleRecommendation(rec: CVRecommendation): {
    isValid: boolean;
    errors: string[];
    recommendation: CVRecommendation;
  } {
    const errors: string[] = [];
    const recommendation = { ...rec };

    // Validate required fields
    if (!rec.id) {
      errors.push('Missing recommendation ID');
      recommendation.id = `rec_fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    if (!rec.title) {
      errors.push('Missing recommendation title');
      recommendation.title = 'CV Improvement Recommendation';
    }

    if (!rec.description) {
      errors.push('Missing recommendation description');
      recommendation.description = 'Improve your CV content to better showcase your professional experience and skills.';
    }

    if (!rec.section) {
      errors.push('Missing recommendation section');
      recommendation.section = 'general';
    }

    // Validate enums
    const validImpacts = ['low', 'medium', 'high'];
    if (rec.impact && !validImpacts.includes(rec.impact)) {
      errors.push(`Invalid impact level: ${rec.impact}`);
      recommendation.impact = 'medium';
    }

    const validTypes = ['content', 'structure', 'section_addition', 'keyword_optimization'];
    if (rec.type && !validTypes.includes(rec.type)) {
      errors.push(`Invalid recommendation type: ${rec.type}`);
    }

    const validActions = ['add', 'modify', 'remove', 'reformat'];
    if (rec.actionRequired && !validActions.includes(rec.actionRequired)) {
      errors.push(`Invalid action required: ${rec.actionRequired}`);
    }

    // Validate numeric fields
    if (rec.priority && (typeof rec.priority !== 'number' || rec.priority < 1 || rec.priority > 10)) {
      errors.push('Priority must be a number between 1 and 10');
    }

    if (rec.estimatedScoreImprovement && (typeof rec.estimatedScoreImprovement !== 'number' || rec.estimatedScoreImprovement < 0)) {
      errors.push('Estimated score improvement must be a positive number');
    }

    return {
      isValid: errors.length === 0,
      errors,
      recommendation
    };
  }

  /**
   * Validates CV data structure and completeness
   */
  validateCVStructure(cv: ParsedCV): {
    isValid: boolean;
    issues: string[];
    completenessScore: number;
  } {
    const issues: string[] = [];
    let completenessScore = 0;
    const maxScore = 100;

    // Check personal information (30 points)
    if (cv.personalInfo) {
      if (cv.personalInfo.email) completenessScore += 10;
      if (cv.personalInfo.phone) completenessScore += 10;
      if (cv.personalInfo.title) completenessScore += 10;
    } else {
      issues.push('Missing personal information section');
    }

    // Check professional summary (20 points)
    if (cv.summary && cv.summary.length >= 50) {
      completenessScore += 20;
    } else {
      issues.push('Missing or insufficient professional summary');
    }

    // Check experience section (25 points)
    if (cv.experience && cv.experience.length > 0) {
      completenessScore += 25;
    } else {
      issues.push('Missing work experience section');
    }

    // Check skills section (15 points)
    if (cv.skills && (Array.isArray(cv.skills) ? cv.skills.length > 0 : Object.keys(cv.skills).length > 0)) {
      completenessScore += 15;
    } else {
      issues.push('Missing skills section');
    }

    // Check education section (10 points)
    if (cv.education && cv.education.length > 0) {
      completenessScore += 10;
    } else {
      issues.push('Missing education section');
    }

    return {
      isValid: completenessScore >= 70, // Minimum 70% completeness
      issues,
      completenessScore
    };
  }

  /**
   * Validates transformation results before saving
   */
  validateTransformationResult(result: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!result) {
      errors.push('Transformation result is null or undefined');
      return { isValid: false, errors };
    }

    if (!result.improvedCV) {
      errors.push('Missing improved CV in transformation result');
    }

    if (!result.appliedRecommendations || !Array.isArray(result.appliedRecommendations)) {
      errors.push('Missing or invalid applied recommendations');
    }

    if (!result.transformationSummary) {
      errors.push('Missing transformation summary');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}