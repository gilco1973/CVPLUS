/**
 * HTML Fragment Generator Service
 * Generates HTML fragments for progressive CV enhancement features
 */

import { SkillsVisualization, SkillCategory, LanguageSkill, Certification } from '../types/enhanced-models';

export class HTMLFragmentGeneratorService {
  
  /**
   * Generate Skills Visualization HTML Fragment
   */
  static generateSkillsVisualizationHTML(visualization: SkillsVisualization): string {
    const technicalSkillsHTML = this.generateSkillCategoriesHTML(visualization.technical, 'technical');
    const softSkillsHTML = this.generateSkillCategoriesHTML(visualization.soft, 'soft');
    const languagesHTML = this.generateLanguageSkillsHTML(visualization.languages);
    const certificationsHTML = this.generateCertificationsHTML(visualization.certifications);

    return `
<style>
.skills-visualization {
  margin: 2rem 0;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.skills-section {
  margin-bottom: 2rem;
}

.skills-section:last-child {
  margin-bottom: 0;
}

.skills-section h3 {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: #ffffff;
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
  padding-bottom: 0.5rem;
}

.skill-category {
  margin-bottom: 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  backdrop-filter: blur(10px);
}

.skill-category h4 {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #f8f9fa;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.skill-item {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 0.75rem;
  transition: all 0.3s ease;
}

.skill-item:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.skill-name {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.skill-level-bar {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  height: 6px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.skill-level-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ade80, #22c55e);
  border-radius: 10px;
  transition: width 0.8s ease;
}

.skill-meta {
  font-size: 0.75rem;
  opacity: 0.8;
  display: flex;
  justify-content: space-between;
}

.language-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.language-name {
  font-weight: 600;
}

.language-proficiency {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
}

.certification-item {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  border-left: 4px solid #fbbf24;
}

.certification-name {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.certification-issuer {
  color: #fbbf24;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.certification-date {
  font-size: 0.8rem;
  opacity: 0.8;
}

@media (max-width: 768px) {
  .skills-visualization {
    padding: 1rem;
  }
  
  .skills-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<div class="skills-visualization" id="skills-visualization-enhanced">
  <h2 style="font-size: 2rem; font-weight: bold; margin-bottom: 2rem; text-align: center; color: white;">
    🎯 Skills & Expertise
  </h2>
  
  ${technicalSkillsHTML}
  ${softSkillsHTML}
  ${languagesHTML}
  ${certificationsHTML}
</div>

<script>
// Animate skill bars on load
document.addEventListener('DOMContentLoaded', function() {
  const skillBars = document.querySelectorAll('.skill-level-fill');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const fill = entry.target;
        const level = fill.getAttribute('data-level');
        setTimeout(() => {
          fill.style.width = level + '%';
        }, Math.random() * 500);
      }
    });
  });
  
  skillBars.forEach(bar => observer.observe(bar));
});
</script>
`;
  }

  /**
   * Generate HTML for skill categories
   */
  private static generateSkillCategoriesHTML(categories: SkillCategory[], type: 'technical' | 'soft'): string {
    if (!categories || categories.length === 0) return '';

    const icon = type === 'technical' ? '⚡' : '🧠';
    const title = type === 'technical' ? 'Technical Skills' : 'Soft Skills';

    return `
<div class="skills-section">
  <h3>${icon} ${title}</h3>
  ${categories.map(category => `
    <div class="skill-category">
      <h4>${category.name}</h4>
      <div class="skills-grid">
        ${category.skills.map(skill => `
          <div class="skill-item">
            <div class="skill-name">${skill.name}</div>
            <div class="skill-level-bar">
              <div class="skill-level-fill" data-level="${skill.level * 10}" style="width: 0%"></div>
            </div>
            <div class="skill-meta">
              <span>Level ${skill.level}/10</span>
              ${skill.yearsOfExperience ? `<span>${skill.yearsOfExperience}y exp</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')}
</div>
`;
  }

  /**
   * Generate HTML for language skills
   */
  private static generateLanguageSkillsHTML(languages: LanguageSkill[]): string {
    if (!languages || languages.length === 0) return '';

    return `
<div class="skills-section">
  <h3>🌍 Languages</h3>
  <div class="skill-category">
    ${languages.map(lang => `
      <div class="language-item">
        <span class="language-name">${lang.language}</span>
        <span class="language-proficiency">${this.formatProficiency(lang.proficiency)}</span>
      </div>
    `).join('')}
  </div>
</div>
`;
  }

  /**
   * Generate HTML for certifications
   */
  private static generateCertificationsHTML(certifications: Certification[]): string {
    if (!certifications || certifications.length === 0) return '';

    return `
<div class="skills-section">
  <h3>🏆 Certifications</h3>
  <div class="skill-category">
    ${certifications.map(cert => `
      <div class="certification-item">
        <div class="certification-name">${cert.name}</div>
        <div class="certification-issuer">${cert.issuer}</div>
        <div class="certification-date">
          Earned: ${new Date(cert.date).toLocaleDateString()}
          ${cert.expiryDate ? ` • Expires: ${new Date(cert.expiryDate).toLocaleDateString()}` : ''}
        </div>
      </div>
    `).join('')}
  </div>
</div>
`;
  }

  /**
   * Generate Certification Badges HTML Fragment
   */
  static generateCertificationBadgesHTML(certifications: Certification[]): string {
    if (!certifications || certifications.length === 0) {
      return '<div class="no-certifications">No certifications available</div>';
    }

    return `
<style>
.certification-badges {
  margin: 2rem 0;
  padding: 2rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 12px;
  color: white;
}

.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.badge-card {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.badge-card:hover {
  transform: translateY(-5px);
  background: rgba(255, 255, 255, 0.25);
}

.badge-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  display: block;
}

.badge-name {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.badge-issuer {
  font-size: 1rem;
  opacity: 0.9;
  margin-bottom: 0.5rem;
}

.badge-date {
  font-size: 0.9rem;
  opacity: 0.8;
}

.badge-status {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  margin-top: 0.5rem;
}

.badge-status.valid {
  background: rgba(34, 197, 94, 0.3);
  color: #dcfce7;
}

.badge-status.expired {
  background: rgba(239, 68, 68, 0.3);
  color: #fecaca;
}
</style>

<div class="certification-badges" id="certification-badges-enhanced">
  <h2 style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem; text-align: center;">
    🏆 Professional Certifications
  </h2>
  <p style="text-align: center; opacity: 0.9; margin-bottom: 0;">
    Verified credentials and professional achievements
  </p>
  
  <div class="badges-grid">
    ${certifications.map(cert => `
      <div class="badge-card">
        <span class="badge-icon">${this.getCertificationIcon(cert.name)}</span>
        <div class="badge-name">${cert.name}</div>
        <div class="badge-issuer">${cert.issuer}</div>
        <div class="badge-date">${new Date(cert.date).toLocaleDateString()}</div>
        <div class="badge-status ${this.getCertificationStatus(cert)}">
          ${this.getCertificationStatusText(cert)}
        </div>
      </div>
    `).join('')}
  </div>
</div>
`;
  }

  /**
   * Generate Timeline HTML Fragment
   */
  static generateTimelineHTML(experience: any[]): string {
    if (!experience || experience.length === 0) {
      return '<div class="no-timeline">No experience data available</div>';
    }

    return `
<style>
.interactive-timeline {
  margin: 2rem 0;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.timeline-container {
  position: relative;
  margin-top: 2rem;
}

.timeline-line {
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, #4ade80, #22c55e);
}

.timeline-item {
  position: relative;
  margin-bottom: 2rem;
  padding-left: 60px;
}

.timeline-dot {
  position: absolute;
  left: 12px;
  top: 0;
  width: 16px;
  height: 16px;
  background: #4ade80;
  border-radius: 50%;
  border: 3px solid white;
  z-index: 2;
}

.timeline-content {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
}

.timeline-period {
  font-size: 0.9rem;
  color: #4ade80;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.timeline-position {
  font-size: 1.3rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.timeline-company {
  font-size: 1.1rem;
  opacity: 0.9;
  margin-bottom: 1rem;
}

.timeline-description {
  line-height: 1.6;
  margin-bottom: 1rem;
}

.timeline-achievements {
  list-style: none;
  padding: 0;
}

.timeline-achievements li {
  padding: 0.25rem 0;
  padding-left: 1rem;
  position: relative;
}

.timeline-achievements li:before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #4ade80;
  font-weight: bold;
}

@media (max-width: 768px) {
  .interactive-timeline {
    padding: 1rem;
  }
  
  .timeline-item {
    padding-left: 40px;
  }
  
  .timeline-line {
    left: 12px;
  }
  
  .timeline-dot {
    left: 4px;
  }
}
</style>

<div class="interactive-timeline" id="interactive-timeline-enhanced">
  <h2 style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem; text-align: center;">
    ⏰ Professional Journey
  </h2>
  <p style="text-align: center; opacity: 0.9; margin-bottom: 0;">
    Career progression and key achievements
  </p>
  
  <div class="timeline-container">
    <div class="timeline-line"></div>
    ${experience.map((exp, index) => `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-period">
            ${this.formatDateRange(exp.startDate, exp.endDate)}
          </div>
          <div class="timeline-position">${exp.position}</div>
          <div class="timeline-company">${exp.company}</div>
          ${exp.description ? `<div class="timeline-description">${exp.description}</div>` : ''}
          ${exp.achievements && exp.achievements.length > 0 ? `
            <ul class="timeline-achievements">
              ${exp.achievements.map(achievement => `<li>${achievement}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      </div>
    `).join('')}
  </div>
</div>
`;
  }

  // Helper methods
  private static formatProficiency(proficiency: string): string {
    const proficiencyMap: Record<string, string> = {
      'native': 'Native',
      'fluent': 'Fluent',
      'professional': 'Professional',
      'conversational': 'Conversational',
      'basic': 'Basic'
    };
    return proficiencyMap[proficiency] || proficiency;
  }

  private static getCertificationIcon(certName: string): string {
    const name = certName.toLowerCase();
    if (name.includes('aws')) return '☁️';
    if (name.includes('microsoft') || name.includes('azure')) return '💼';
    if (name.includes('google') || name.includes('gcp')) return '🔍';
    if (name.includes('cisco')) return '🌐';
    if (name.includes('oracle')) return '🗄️';
    if (name.includes('scrum') || name.includes('agile')) return '🏃';
    if (name.includes('pmp')) return '📊';
    return '🏆';
  }

  private static getCertificationStatus(cert: Certification): string {
    if (!cert.expiryDate) return 'valid';
    return new Date(cert.expiryDate) > new Date() ? 'valid' : 'expired';
  }

  private static getCertificationStatusText(cert: Certification): string {
    if (!cert.expiryDate) return 'Valid';
    return new Date(cert.expiryDate) > new Date() ? 'Valid' : 'Expired';
  }

  private static formatDateRange(startDate: string, endDate?: string): string {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    const formatOptions: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short' 
    };
    
    const startFormatted = start.toLocaleDateString('en-US', formatOptions);
    const endFormatted = end ? end.toLocaleDateString('en-US', formatOptions) : 'Present';
    
    return `${startFormatted} - ${endFormatted}`;
  }
}

export const htmlFragmentGeneratorService = new HTMLFragmentGeneratorService();