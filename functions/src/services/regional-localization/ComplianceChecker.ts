/**
 * Legal Compliance Checker
 */

import { ParsedCV } from '../../types/job';
import { RegionalConfiguration } from '../../types/phase2-models';
import { ComplianceIssue } from './types';

export class ComplianceChecker {
  /**
   * Check legal compliance for CV in target region
   */
  async checkLegalCompliance(cvData: ParsedCV, regionConfig: RegionalConfiguration) {
    const issues: ComplianceIssue[] = [];
    const recommendations: string[] = [];

    // Check prohibited information
    for (const prohibitedInfo of regionConfig.legalRestrictions.prohibitedInfo) {
      const issue = this.checkProhibitedInfo(cvData, prohibitedInfo, regionConfig.region);
      if (issue) {
        issues.push(issue);
      }
    }

    // Generate recommendations based on issues
    for (const issue of issues) {
      recommendations.push(issue.solution);
    }

    // Add general recommendations
    if (regionConfig.legalRestrictions.photoRequired === false && this.hasPhoto(cvData)) {
      recommendations.push('Consider removing photo as it may lead to unconscious bias');
    }

    return {
      compliant: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      recommendations
    };
  }

  private checkProhibitedInfo(cvData: ParsedCV, prohibitedType: string, region: string): ComplianceIssue | null {
    const personalInfo = cvData.personalInfo || cvData.personal || {};

    switch (prohibitedType) {
      case 'age':
        if (personalInfo.age || personalInfo.dateOfBirth) {
          return {
            type: 'age',
            severity: 'error',
            description: 'Age or date of birth information found',
            solution: 'Remove age and date of birth information to comply with anti-discrimination laws',
            countries: [region]
          };
        }
        break;

      case 'marital_status':
        if (personalInfo.maritalStatus) {
          return {
            type: 'marital_status',
            severity: 'warning',
            description: 'Marital status information found',
            solution: 'Remove marital status information as it is not relevant for job applications',
            countries: [region]
          };
        }
        break;

      case 'photo':
        if (this.hasPhoto(cvData)) {
          return {
            type: 'photo',
            severity: 'warning',
            description: 'Photo found on CV',
            solution: 'Consider removing photo to prevent unconscious bias in hiring process',
            countries: [region]
          };
        }
        break;

      case 'gender':
        if (personalInfo.gender) {
          return {
            type: 'gender',
            severity: 'error',
            description: 'Gender information found',
            solution: 'Remove gender information to comply with equal opportunity laws',
            countries: [region]
          };
        }
        break;

      case 'personal_info':
        const sensitiveFields = ['religion', 'politicalAffiliation', 'sexualOrientation'];
        for (const field of sensitiveFields) {
          if ((personalInfo as any)[field]) {
            return {
              type: 'personal_info',
              severity: 'error',
              description: `Sensitive personal information found: ${field}`,
              solution: `Remove ${field} information as it is protected under employment law`,
              countries: [region]
            };
          }
        }
        break;
    }

    return null;
  }

  private hasPhoto(cvData: ParsedCV): boolean {
    return !!(cvData.personalInfo?.photo || cvData.personal?.photo);
  }
}