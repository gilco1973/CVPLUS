import { useCallback } from 'react';
import type { FeaturePreviewData } from '../../types/cv-preview';

export const useFeaturePreviews = (previewData: any) => {
  const getMockFeatureData = useCallback((featureId: string): FeaturePreviewData => {
    switch (featureId) {
      case 'language-proficiency':
        return {
          languages: [
            { name: 'English', level: 'Native' },
            { name: 'Hebrew', level: 'Fluent' },
            { name: 'Spanish', level: 'Professional' }
          ]
        };
        
      case 'certification-badges':
        return {
          certifications: [
            { name: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', year: '2023', verified: true },
            { name: 'Microsoft Azure Fundamentals', issuer: 'Microsoft', year: '2022', verified: true },
            { name: 'Google Cloud Platform Professional', issuer: 'Google', year: '2023', verified: false }
          ]
        };
        
      case 'social-media-links':
        return {
          socialLinks: {
            linkedin: 'https://linkedin.com/in/professional-profile',
            github: 'https://github.com/developer-profile',
            twitter: 'https://twitter.com/professional'
          }
        };
        
      case 'achievements-showcase':
        // Use real achievements from experience data
        const realAchievements = previewData?.experience?.flatMap((exp: any) => 
          exp.achievements?.map((achievement: string) => ({
            title: achievement,
            category: 'Professional',
            impact: 'Real'
          })) || []
        ) || [];
        
        return {
          keyAchievements: realAchievements.length > 0 ? realAchievements.slice(0, 3) : [
            { title: 'Real achievements will be extracted from your experience', category: 'Info', impact: 'Preview' }
          ]
        };
        
      default:
        return {};
    }
  }, [previewData]);

  const generateFeaturePreview = useCallback((featureId: string, isEnabled: boolean, isCollapsed: boolean): string => {
    if (!isEnabled) return '';
    
    const mockData = getMockFeatureData(featureId);
    
    switch (featureId) {
      case 'language-proficiency':
        return `
          <div class="language-section feature-preview" data-feature="${featureId}">
            <div class="feature-preview-banner">
              <span>📋 Preview: This feature will show when you have language skills in your CV</span>
            </div>
            <h3 class="section-title" onclick="toggleSection('${featureId}')">
              🌐 Languages
              <div class="collapse-icon ${isCollapsed ? 'collapsed' : ''}">▼</div>
            </h3>
            <div class="section-content ${isCollapsed ? 'collapsed' : ''}">
              <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                ${mockData.languages?.map((lang: any) => `
                  <span style="background: #2563eb; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);">${lang.name}</span>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      
      case 'certification-badges':
        return `
          <div class="certification-section feature-preview" data-feature="${featureId}">
            <div class="feature-preview-banner">
              <span>📋 Preview: This feature will show when you have certifications in your CV</span>
            </div>
            <h3 class="section-title" onclick="toggleSection('${featureId}')">
              🏆 Certifications
              <div class="collapse-icon ${isCollapsed ? 'collapsed' : ''}">▼</div>
            </h3>
            <div class="section-content ${isCollapsed ? 'collapsed' : ''}">
              <div class="certification-grid">
                ${mockData.certifications?.map((cert: any) => `
                  <div class="certification-badge">
                    <div class="badge-icon">${cert.verified ? '✅' : '📋'}</div>
                    <div class="badge-content">
                      <h4 class="cert-name">${cert.name}</h4>
                      <p class="cert-issuer">${cert.issuer}</p>
                      <span class="cert-year">${cert.year}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      
      case 'social-media-links':
        return `
          <div class="social-section feature-preview" data-feature="${featureId}">
            <div class="feature-preview-banner">
              <span>📋 Preview: Links will be populated from your CV data</span>
            </div>
            <h3 class="section-title" onclick="toggleSection('${featureId}')">
              🔗 Professional Links
              <div class="collapse-icon ${isCollapsed ? 'collapsed' : ''}">▼</div>
            </h3>
            <div class="section-content ${isCollapsed ? 'collapsed' : ''}">
              <div class="social-links">
                <a href="#" class="social-link linkedin">LinkedIn</a>
                <a href="#" class="social-link github">GitHub</a>
                <a href="#" class="social-link email">Email</a>
              </div>
            </div>
          </div>
        `;
      
      case 'achievements-showcase':
        return `
          <div class="achievements-section feature-preview" data-feature="${featureId}">
            <div class="feature-preview-banner">
              <span>📋 Preview: AI will extract and highlight your top achievements</span>
            </div>
            <h3 class="section-title" onclick="toggleSection('${featureId}')">
              ⭐ Key Achievements
              <div class="collapse-icon ${isCollapsed ? 'collapsed' : ''}">▼</div>
            </h3>
            <div class="section-content ${isCollapsed ? 'collapsed' : ''}">
              <div class="achievements-grid">
                ${mockData.keyAchievements?.map((achievement: any) => `
                  <div class="achievement-card">
                    <div class="achievement-icon">🎯</div>
                    <div class="achievement-content">
                      <h4 class="achievement-title">${achievement.title}</h4>
                      <span class="achievement-category">${achievement.category}</span>
                      <span class="achievement-impact impact-${achievement.impact.toLowerCase()}">${achievement.impact} Impact</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      
      default:
        return '';
    }
  }, [getMockFeatureData]);

  return {
    getMockFeatureData,
    generateFeaturePreview
  };
};