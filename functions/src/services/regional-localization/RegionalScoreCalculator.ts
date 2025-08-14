/**
 * Regional Score Calculator
 */

import { ParsedCV } from '../../types/job';
import { RegionalConfiguration } from '../../types/phase2-models';

export class RegionalScoreCalculator {
  /**
   * Calculate regional compatibility score for CV
   */
  async calculateRegionalScore(cvData: ParsedCV, regionConfig: RegionalConfiguration): Promise<number> {
    let score = 0;
    let factors = 0;

    // Format alignment (25%)
    const formatScore = this.calculateFormatScore(cvData, regionConfig);
    score += formatScore * 0.25;
    factors += 0.25;

    // Content cultural fit (35%)
    const contentScore = this.calculateContentScore(cvData, regionConfig);
    score += contentScore * 0.35;
    factors += 0.35;

    // Language appropriateness (25%)
    const languageScore = this.calculateLanguageScore(cvData, regionConfig);
    score += languageScore * 0.25;
    factors += 0.25;

    // Legal compliance (15%)
    const complianceScore = this.calculateComplianceScore(cvData, regionConfig);
    score += complianceScore * 0.15;
    factors += 0.15;

    return Math.round((score / factors) * 100) / 100;
  }

  private calculateFormatScore(cvData: ParsedCV, regionConfig: RegionalConfiguration): number {
    let score = 0.5; // Base score

    // Photo preferences
    if (regionConfig.formatPreferences.photoRequired && !this.hasPhoto(cvData)) {
      score -= 0.2;
    } else if (!regionConfig.formatPreferences.photoRequired && this.hasPhoto(cvData)) {
      score -= 0.1;
    }

    // Length preferences
    const cvLength = this.estimateCVLength(cvData);
    const preferredLength = regionConfig.formatPreferences.preferredLength;
    
    if (Math.abs(cvLength - preferredLength) <= 0.5) {
      score += 0.2;
    } else if (Math.abs(cvLength - preferredLength) <= 1) {
      score += 0.1;
    }

    // Date format alignment
    if (this.checkDateFormat(cvData, regionConfig.formatPreferences.dateFormat)) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  private calculateContentScore(cvData: ParsedCV, regionConfig: RegionalConfiguration): number {
    let score = 0.5; // Base score

    // Required sections
    for (const section of regionConfig.contentGuidelines.requiredSections) {
      if (this.hasSectionContent(cvData, section)) {
        score += 0.1;
      } else {
        score -= 0.15;
      }
    }

    // Discouraged sections
    for (const section of regionConfig.contentGuidelines.discouragedSections) {
      if (this.hasSectionContent(cvData, section)) {
        score -= 0.1;
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  private calculateLanguageScore(cvData: ParsedCV, regionConfig: RegionalConfiguration): number {
    let score = 0.5; // Base score

    // Formality level check
    const currentFormality = this.assessFormality(cvData);
    const preferredFormality = regionConfig.languageGuidelines.formalityLevel;
    
    if (currentFormality === preferredFormality) {
      score += 0.3;
    } else if (Math.abs(this.formalityToNumber(currentFormality) - this.formalityToNumber(preferredFormality)) === 1) {
      score += 0.1;
    } else {
      score -= 0.2;
    }

    // Terminology appropriateness
    if (this.checkTerminology(cvData, regionConfig.languageGuidelines.preferredTerminology)) {
      score += 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  private calculateComplianceScore(cvData: ParsedCV, regionConfig: RegionalConfiguration): number {
    let score = 1.0; // Start with perfect compliance

    // Check for compliance violations
    for (const restriction of regionConfig.legalRestrictions.prohibitedInfo) {
      if (this.hasProhibitedInfo(cvData, restriction)) {
        score -= 0.3;
      }
    }

    return Math.max(0, score);
  }

  // Helper methods
  private hasPhoto(cvData: ParsedCV): boolean {
    return !!(cvData.personalInfo?.photo || cvData.personal?.photo);
  }

  private estimateCVLength(cvData: ParsedCV): number {
    // Estimate CV length in pages based on content
    let contentLength = 0;
    
    if (cvData.personalInfo) contentLength += 0.2;
    if (cvData.experience) contentLength += cvData.experience.length * 0.3;
    if (cvData.education) contentLength += cvData.education.length * 0.15;
    if (cvData.skills) contentLength += 0.2;
    
    return Math.max(1, Math.ceil(contentLength));
  }

  private checkDateFormat(cvData: ParsedCV, preferredFormat: string): boolean {
    // Simplified date format check
    return true; // Implementation would check actual date formats
  }

  private hasSectionContent(cvData: ParsedCV, section: string): boolean {
    const sectionMap: Record<string, boolean> = {
      'personal_info': !!(cvData.personalInfo || cvData.personal),
      'experience': !!(cvData.experience && cvData.experience.length > 0),
      'education': !!(cvData.education && cvData.education.length > 0),
      'skills': !!(cvData.skills),
      'certifications': !!(cvData.certifications && cvData.certifications.length > 0),
      'languages': !!(cvData.languages && cvData.languages.length > 0),
      'references': !!(cvData.references && cvData.references.length > 0),
      'photo': this.hasPhoto(cvData)
    };

    return sectionMap[section] || false;
  }

  private assessFormality(cvData: ParsedCV): 'very_formal' | 'formal' | 'casual' {
    // Simplified formality assessment
    return 'formal';
  }

  private formalityToNumber(formality: string): number {
    const map: Record<string, number> = {
      'very_formal': 3,
      'formal': 2,
      'casual': 1
    };
    return map[formality] || 2;
  }

  private checkTerminology(cvData: ParsedCV, preferredTerms: string[]): boolean {
    // Simplified terminology check
    return true;
  }

  private hasProhibitedInfo(cvData: ParsedCV, restriction: string): boolean {
    const restrictionChecks: Record<string, boolean> = {
      'age': !!(cvData.personalInfo?.age || cvData.personal?.age),
      'marital_status': !!(cvData.personalInfo?.maritalStatus || cvData.personal?.maritalStatus),
      'photo': this.hasPhoto(cvData),
      'gender': !!(cvData.personalInfo?.gender || cvData.personal?.gender),
      'nationality': !!(cvData.personalInfo?.nationality || cvData.personal?.nationality)
    };

    return restrictionChecks[restriction] || false;
  }
}