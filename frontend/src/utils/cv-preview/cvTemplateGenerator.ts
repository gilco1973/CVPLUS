import type { QRCodeSettings } from '../../types/cv-preview';
import type { CVParsedData } from '../../types/cvData';
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
    const personalInfo = previewData?.personalInfo;
    const experience = previewData?.experience || [];
    const education = previewData?.education || [];
    const skills = previewData?.skills;

    return `
      <div class="cv-preview-container ${selectedTemplate}">
        ${CVTemplateStyles.getAllStyles()}
        
        <!-- Header Section -->
        ${SectionGenerators.generateHeaderSection(personalInfo)}
        
        <!-- QR Code Feature Preview -->
        ${SectionGenerators.generateQRCodeSection(qrCodeSettings, collapsedSections)}

        <!-- Summary Section -->
        ${SectionGenerators.generateSummarySection(previewData?.summary, collapsedSections, previewData?.customSections)}

        <!-- Experience Section -->
        ${SectionGenerators.generateExperienceSection(experience, collapsedSections, previewData?.customSections)}

        <!-- Education Section -->
        ${SectionGenerators.generateEducationSection(education, collapsedSections)}

        <!-- Skills Section -->
        ${SectionGenerators.generateSkillsSection(skills, collapsedSections)}

        <!-- Feature Previews -->
        ${SectionGenerators.generateFeaturePreviews(selectedFeatures, collapsedSections, generateFeaturePreview)}
      </div>
    `;
  }
}