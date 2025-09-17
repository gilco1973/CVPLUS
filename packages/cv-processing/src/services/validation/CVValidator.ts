/**
 * CVValidator - Validates CV data structure and content quality
 * Broken out from ValidationEngine to comply with 200-line limit
  */
import { ParsedCV } from '../root-enhanced/compatibility';

export class CVValidator {
  /**
   * Validates CV structure and data quality
    */
  validateCVStructure(cv: ParsedCV): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    qualityScore: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let qualityScore = 100;

    // Validate personal info
    if (!cv.personalInfo) {
      errors.push('Personal information is required');
      qualityScore -= 30;
    } else {
      if (!cv.personalInfo.name || cv.personalInfo.name.length < 2) {
        errors.push('Valid name is required');
        qualityScore -= 20;
      }

      if (!cv.personalInfo.email || !this.isValidEmail(cv.personalInfo.email)) {
        errors.push('Valid email address is required');
        qualityScore -= 15;
      }

      if (!cv.personalInfo.phone) {
        warnings.push('Phone number is recommended');
        qualityScore -= 5;
      }
    }

    // Validate professional summary
    if (!cv.summary || cv.summary.length < 50) {
      warnings.push('Professional summary should be at least 50 characters');
      qualityScore -= 10;
    } else if (cv.summary.length > 500) {
      warnings.push('Professional summary is quite long, consider shortening');
      qualityScore -= 5;
    }

    // Validate work experience
    if (!cv.workExperience || cv.workExperience.length === 0) {
      warnings.push('Work experience is highly recommended');
      qualityScore -= 20;
    } else {
      cv.workExperience.forEach((exp, index) => {
        if (!exp.title || exp.title.length < 2) {
          warnings.push(`Work experience ${index + 1}: Job title is required`);
          qualityScore -= 5;
        }
        if (!exp.company || exp.company.length < 2) {
          warnings.push(`Work experience ${index + 1}: Company name is required`);
          qualityScore -= 5;
        }
        if (!exp.description || exp.description.length < 50) {
          warnings.push(`Work experience ${index + 1}: Description should be more detailed`);
          qualityScore -= 3;
        }
      });
    }

    // Validate skills
    if (!cv.skills || (Array.isArray(cv.skills) && cv.skills.length === 0)) {
      warnings.push('Skills section is recommended');
      qualityScore -= 15;
    }

    // Validate education
    if (!cv.education || cv.education.length === 0) {
      warnings.push('Education information is recommended');
      qualityScore -= 10;
    }

    // Quality thresholds
    if (qualityScore < 60) {
      errors.push('CV quality is too low - major improvements needed');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      qualityScore: Math.max(0, qualityScore)
    };
  }

  /**
   * Validates email format
    */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validates phone number format (basic)
    */
  private isValidPhone(phone: string): boolean {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    // Should have 10-15 digits
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  }

  /**
   * Validates date format and logic
    */
  private isValidDateRange(startDate: string, endDate?: string): boolean {
    try {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) return false;

      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) return false;
        return end >= start;
      }

      return true;
    } catch {
      return false;
    }
  }
}