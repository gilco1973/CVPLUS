/**
 * Cultural Optimization Engine
 */

import { ParsedCV } from '../../types/job';
import { RegionalConfiguration } from '../../types/phase2-models';
import { FormatAdjustment, ContentAdjustment, LanguageOptimization } from './types';

export class CulturalOptimizer {
  /**
   * Generate cultural optimizations for CV
   */
  async generateCulturalOptimizations(cvData: ParsedCV, regionConfig: RegionalConfiguration) {
    const formatAdjustments = this.generateFormatAdjustments(cvData, regionConfig);
    const contentAdjustments = this.generateContentAdjustments(cvData, regionConfig);
    const languageOptimization = this.generateLanguageOptimizations(cvData, regionConfig);

    return {
      formatAdjustments,
      contentAdjustments,
      languageOptimization
    };
  }

  private generateFormatAdjustments(cvData: ParsedCV, regionConfig: RegionalConfiguration): FormatAdjustment[] {
    const adjustments: FormatAdjustment[] = [];

    // Photo requirements
    if (regionConfig.formatPreferences.photoRequired && !this.hasPhoto(cvData)) {
      adjustments.push({
        aspect: 'photo',
        current: 'No photo',
        recommended: 'Professional headshot',
        reason: 'Photos are expected in CVs for this region',
        importance: 'high'
      });
    } else if (!regionConfig.formatPreferences.photoRequired && this.hasPhoto(cvData)) {
      adjustments.push({
        aspect: 'photo',
        current: 'Photo included',
        recommended: 'Remove photo',
        reason: 'Photos may lead to unconscious bias in this region',
        importance: 'medium'
      });
    }

    // Length preferences
    const currentLength = this.estimateCVLength(cvData);
    const preferredLength = regionConfig.formatPreferences.preferredLength;
    
    if (currentLength > preferredLength + 0.5) {
      adjustments.push({
        aspect: 'length',
        current: `${currentLength} pages`,
        recommended: `${preferredLength} pages`,
        reason: 'Shorter CVs are preferred in this region',
        importance: 'high'
      });
    }

    // Date format
    adjustments.push({
      aspect: 'date_format',
      current: 'MM/DD/YYYY',
      recommended: regionConfig.formatPreferences.dateFormat,
      reason: 'Use local date format for better readability',
      importance: 'low'
    });

    return adjustments;
  }

  private generateContentAdjustments(cvData: ParsedCV, regionConfig: RegionalConfiguration): ContentAdjustment[] {
    const adjustments: ContentAdjustment[] = [];

    // Required sections check
    for (const requiredSection of regionConfig.contentGuidelines.requiredSections) {
      if (!this.hasSectionContent(cvData, requiredSection)) {
        adjustments.push({
          section: requiredSection,
          type: 'add',
          description: `Add ${requiredSection} section`,
          culturalReason: `${requiredSection} is expected in CVs for this region`,
          impact: 0.8
        });
      }
    }

    // Discouraged sections check
    for (const discouragedSection of regionConfig.contentGuidelines.discouragedSections) {
      if (this.hasSectionContent(cvData, discouragedSection)) {
        adjustments.push({
          section: discouragedSection,
          type: 'remove',
          description: `Consider removing ${discouragedSection} section`,
          culturalReason: `${discouragedSection} is not commonly included in this region`,
          impact: 0.4
        });
      }
    }

    return adjustments;
  }

  private generateLanguageOptimizations(cvData: ParsedCV, regionConfig: RegionalConfiguration): LanguageOptimization[] {
    const optimizations: LanguageOptimization[] = [];

    // Formality suggestions
    const currentFormality = this.assessFormality(cvData);
    const preferredFormality = regionConfig.languageGuidelines.formalityLevel;

    if (currentFormality !== preferredFormality) {
      optimizations.push({
        aspect: 'formality',
        suggestion: `Adjust language to be more ${preferredFormality}`,
        examples: this.getFormalityExamples(currentFormality, preferredFormality)
      });
    }

    // Terminology suggestions
    optimizations.push({
      aspect: 'terminology',
      suggestion: 'Use region-appropriate terminology',
      examples: [
        {
          before: 'CV',
          after: regionConfig.languageGuidelines.cvTerminology || 'Resume'
        },
        {
          before: 'Mobile',
          after: 'Cell phone'
        }
      ]
    });

    return optimizations;
  }

  // Helper methods
  private hasPhoto(cvData: ParsedCV): boolean {
    return !!(cvData.personalInfo?.photo || cvData.personal?.photo);
  }

  private estimateCVLength(cvData: ParsedCV): number {
    let contentLength = 0;
    
    if (cvData.personalInfo) contentLength += 0.2;
    if (cvData.experience) contentLength += cvData.experience.length * 0.3;
    if (cvData.education) contentLength += cvData.education.length * 0.15;
    if (cvData.skills) contentLength += 0.2;
    
    return Math.max(1, Math.ceil(contentLength));
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

  private getFormalityExamples(current: string, preferred: string) {
    const examples = {
      'casual_to_formal': [
        { before: 'I worked on', after: 'Responsible for' },
        { before: 'Helped with', after: 'Contributed to' }
      ],
      'formal_to_casual': [
        { before: 'Responsible for', after: 'Worked on' },
        { before: 'Facilitated', after: 'Helped with' }
      ]
    };

    return examples[`${current}_to_${preferred}`] || [];
  }
}