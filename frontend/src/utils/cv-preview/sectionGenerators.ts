import type { QRCodeSettings } from '../../types/cv-preview';

export class SectionGenerators {
  static generateQRCodeSection(qrCodeSettings: QRCodeSettings, collapsedSections: Record<string, boolean>): string {
    return `
      <div class="feature-preview" data-feature="qr-code">
        <div class="feature-preview-banner">
          📱 QR Code for easy profile sharing
          <button onclick="editQRCode()" style="margin-left: 10px; padding: 4px 10px; background: #4299e1; color: #ffffff; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600;">✏️ Edit URL</button>
        </div>
        <h3 class="section-title" onclick="toggleSection('qr-code')">
          📱 Quick Access QR Code
          <div class="collapse-icon ${collapsedSections['qr-code'] ? 'collapsed' : ''}">▼</div>
        </h3>
        <div class="section-content ${collapsedSections['qr-code'] ? 'collapsed' : ''}" style="text-align: center; margin: 20px 0;">
          <div style="width: 120px; height: 120px; background: #f0f0f0; border: 2px dashed #ccc; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; margin: 0 auto;">
            QR Code Will Be Generated
          </div>
          <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 12px;">
            <div><strong>Destination:</strong> ${qrCodeSettings.type.charAt(0).toUpperCase() + qrCodeSettings.type.slice(1)}</div>
            <div style="margin-top: 5px; word-break: break-all;"><strong>URL:</strong> ${qrCodeSettings.url}</div>
            <div style="margin-top: 5px;"><strong>Text:</strong> ${qrCodeSettings.customText}</div>
          </div>
        </div>
      </div>
    `;
  }

  static generateSummarySection(summary: string, collapsedSections: Record<string, boolean>): string {
    return `
      <div class="section editable-section" data-section="summary">
        <div class="edit-overlay" onclick="editSection('summary')">✏️</div>
        <h2 class="section-title" onclick="toggleSection('summary')">
          Professional Summary
          <div class="collapse-icon ${collapsedSections.summary ? 'collapsed' : ''}">▼</div>
        </h2>
        <div class="section-content ${collapsedSections.summary ? 'collapsed' : ''}">
          <p>${summary || 'Professional summary will be displayed here...'}</p>
        </div>
      </div>
    `;
  }

  static generateExperienceSection(experience: any[], collapsedSections: Record<string, boolean>): string {
    return `
      <div class="section editable-section" data-section="experience">
        <div class="edit-overlay" onclick="editSection('experience')">✏️</div>
        <h2 class="section-title" onclick="toggleSection('experience')">
          Work Experience
          <div class="collapse-icon ${collapsedSections.experience ? 'collapsed' : ''}">▼</div>
        </h2>
        <div class="section-content ${collapsedSections.experience ? 'collapsed' : ''}">
          ${experience.map(exp => `
            <div class="experience-item">
              <div class="position">${exp.position || 'Position'}</div>
              <div class="company">${exp.company || 'Company'}</div>
              <div class="duration">${exp.startDate || 'Start'} - ${exp.endDate || 'End'}</div>
              ${exp.description ? `<div class="description">${exp.description}</div>` : ''}
              ${exp.achievements && exp.achievements.length > 0 ? `
                <ul class="achievements">
                  ${exp.achievements.map((achievement: string) => `<li>${achievement}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  static generateEducationSection(education: any[], collapsedSections: Record<string, boolean>): string {
    return `
      <div class="section editable-section" data-section="education">
        <div class="edit-overlay" onclick="editSection('education')">✏️</div>
        <h2 class="section-title" onclick="toggleSection('education')">
          Education
          <div class="collapse-icon ${collapsedSections.education ? 'collapsed' : ''}">▼</div>
        </h2>
        <div class="section-content ${collapsedSections.education ? 'collapsed' : ''}">
          ${education.map(edu => `
            <div class="education-item">
              <div class="degree">${edu.degree || 'Degree'}</div>
              <div class="institution">${edu.institution || 'Institution'}</div>
              <div class="duration">${edu.startDate || 'Start'} - ${edu.endDate || 'End'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  static generateSkillsSection(skills: any, collapsedSections: Record<string, boolean>): string {
    if (!skills) return '';
    
    return `
      <div class="section editable-section" data-section="skills">
        <div class="edit-overlay" onclick="editSection('skills')">✏️</div>
        <h2 class="section-title" onclick="toggleSection('skills')">
          Skills
          <div class="collapse-icon ${collapsedSections.skills ? 'collapsed' : ''}">▼</div>
        </h2>
        <div class="section-content ${collapsedSections.skills ? 'collapsed' : ''}">
          <div class="skills-section">
            ${Object.entries(skills).map(([category, skillList]) => `
              <div class="skill-category">
                <h4>${category}</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  ${Array.isArray(skillList) ? skillList.map((skill: string) => `
                    <span style="background: #e2e8f0; color: #2d3748; padding: 6px 12px; border-radius: 16px; font-size: 14px; font-weight: 500;">${skill}</span>
                  `).join('') : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  static generateHeaderSection(personalInfo: any): string {
    return `
      <div class="header-section editable-section" data-section="personalInfo">
        <div class="edit-overlay" onclick="editSection('personalInfo')">✏️</div>
        <h1 class="name">${personalInfo?.name || 'Your Name'}</h1>
        <div class="contact-info">
          <span>${personalInfo?.email || 'email@example.com'}</span>
          <span>${personalInfo?.phone || '+1-234-567-8900'}</span>
          <span>${personalInfo?.location || 'City, Country'}</span>
        </div>
      </div>
    `;
  }

  static generateFeaturePreviews(
    selectedFeatures: Record<string, boolean>,
    collapsedSections: Record<string, boolean>,
    generateFeaturePreview: (featureId: string, isEnabled: boolean, isCollapsed: boolean) => string
  ): string {
    const features = [
      'language-proficiency',
      'certification-badges', 
      'social-media-links',
      'achievements-showcase'
    ];

    return features
      .map(featureId => generateFeaturePreview(
        featureId, 
        selectedFeatures[featureId.replace(/-/g, '')], 
        collapsedSections[featureId]
      ))
      .join('');
  }
}