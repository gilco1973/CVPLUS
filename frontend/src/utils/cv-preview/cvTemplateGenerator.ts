import type { QRCodeSettings } from '../../types/cv-preview';
import type { CVParsedData, CVPersonalInfo, CVSkillsData } from '../../types/cvData';
import { CVTemplateStyles } from './templateStyles';
import { SectionGenerators } from './sectionGenerators';

export class CVTemplateGenerator {
  static generateHTML(
    previewData: CVParsedData,
    selectedTemplate: string,
    selectedFeatures: Record<string, boolean>,
    qrCodeSettings: QRCodeSettings,
    collapsedSections: Record<string, boolean>,
    generateFeaturePreview: (featureId: string, isEnabled: boolean, isCollapsed: boolean) => string
  ): string {
    const personalInfo: CVPersonalInfo = previewData?.personalInfo || {
      name: 'Your Name',
      email: 'your.email@example.com',
      phone: '+1 (555) 123-4567',
      location: 'Your Location'
    };
    const experience = previewData?.experience || [];
    const education = previewData?.education || [];
    const skills: CVSkillsData = previewData?.skills || {
      technical: [],
      soft: [],
      languages: []
    };

    return `
      <div class="cv-preview-container ${selectedTemplate}">
        ${CVTemplateStyles.getAllStyles()}
        
        <!-- Header Section -->
        ${SectionGenerators.generateHeaderSection(personalInfo)}
        
        <!-- QR Code Feature Preview -->
        ${SectionGenerators.generateQRCodeSection(qrCodeSettings, collapsedSections)}

        <!-- Summary Section -->
        ${SectionGenerators.generateSummarySection(previewData?.summary || '', collapsedSections, CVTemplateGenerator.convertToStringRecord(previewData?.customSections))}

        <!-- Experience Section -->
        ${SectionGenerators.generateExperienceSection(experience, collapsedSections, CVTemplateGenerator.convertToStringRecord(previewData?.customSections) || {})}

        <!-- Education Section -->
        ${SectionGenerators.generateEducationSection(education, collapsedSections)}

        <!-- Skills Section -->
        ${SectionGenerators.generateSkillsSection(skills, collapsedSections)}

        <!-- Feature Previews -->
        ${SectionGenerators.generateFeaturePreviews(selectedFeatures, collapsedSections, generateFeaturePreview)}
      </div>
    `;
  }

  public static convertToStringRecord(obj: Record<string, unknown> | undefined): Record<string, string> | undefined {
    if (!obj) return undefined;
    
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = typeof value === 'string' ? value : String(value);
    }
    return result;
  }
}