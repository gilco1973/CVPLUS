/**
 * HTML Fragment Generator Service
 * Generates HTML fragments for progressive CV enhancement features
 */

import { SkillsVisualization, SkillCategory, LanguageSkill, Certification } from '../types/enhanced-models';

class HTMLFragmentGeneratorServiceClass {
  
  /**
   * Generate Skills Visualization HTML Fragment
   */
  generateSkillsVisualizationHTML(visualization: SkillsVisualization): string {
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
  private generateSkillCategoriesHTML(categories: SkillCategory[], type: 'technical' | 'soft'): string {
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
  private generateLanguageSkillsHTML(languages: LanguageSkill[]): string {
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
  private generateCertificationsHTML(certifications: Certification[]): string {
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
  generateCertificationBadgesHTML(certifications: Certification[]): string {
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
   * Generate Calendar Integration HTML Fragment
   */
  generateCalendarIntegrationHTML(calendarData: any): string {
    if (!calendarData || !calendarData.events || calendarData.events.length === 0) {
      return '<div class="no-calendar">No calendar events available</div>';
    }

    const { events, summary } = calendarData;

    return `
<style>
.calendar-integration {
  margin: 2rem 0;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.calendar-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.summary-card {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  backdrop-filter: blur(10px);
}

.summary-number {
  font-size: 2rem;
  font-weight: bold;
  color: #4ade80;
  display: block;
}

.summary-label {
  font-size: 0.9rem;
  opacity: 0.9;
  margin-top: 0.25rem;
}

.calendar-events {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.event-card {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 1.5rem;
  border-left: 4px solid;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.event-card:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.event-card.work {
  border-left-color: #3b82f6;
}

.event-card.education {
  border-left-color: #8b5cf6;
}

.event-card.certification {
  border-left-color: #f59e0b;
}

.event-card.reminder {
  border-left-color: #10b981;
}

.event-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #f8fafc;
}

.event-date {
  font-size: 0.9rem;
  color: #cbd5e1;
  margin-bottom: 0.5rem;
}

.event-description {
  font-size: 0.85rem;
  line-height: 1.5;
  opacity: 0.9;
}

.event-type {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-top: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
}

.calendar-actions {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.calendar-button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.calendar-button:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .calendar-integration {
    padding: 1rem;
  }
  
  .calendar-summary {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .calendar-events {
    grid-template-columns: 1fr;
  }
  
  .calendar-actions {
    flex-direction: column;
  }
}
</style>

<div class="calendar-integration" id="calendar-integration-enhanced">
  <h2 style="font-size: 2rem; font-weight: bold; margin-bottom: 2rem; text-align: center; color: white;">
    📅 Career Calendar
  </h2>
  
  <div class="calendar-summary">
    <div class="summary-card">
      <span class="summary-number">${summary?.totalEvents || events.length}</span>
      <div class="summary-label">Total Events</div>
    </div>
    <div class="summary-card">
      <span class="summary-number">${summary?.workAnniversaries || 0}</span>
      <div class="summary-label">Work Milestones</div>
    </div>
    <div class="summary-card">
      <span class="summary-number">${summary?.educationMilestones || 0}</span>
      <div class="summary-label">Education</div>
    </div>
    <div class="summary-card">
      <span class="summary-number">${summary?.certifications || 0}</span>
      <div class="summary-label">Certifications</div>
    </div>
  </div>
  
  <div class="calendar-events">
    ${events.map((event: any) => `
      <div class="event-card ${event.type}">
        <div class="event-title">${event.title}</div>
        <div class="event-date">${this.formatEventDate(event.date)}</div>
        ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
        <div class="event-type">${this.formatEventType(event.type)}</div>
      </div>
    `).join('')}
  </div>
  
  <div class="calendar-actions">
    <button class="calendar-button" onclick="downloadICalFile()">
      📥 Download iCal
    </button>
    <button class="calendar-button" onclick="syncToGoogleCalendar()">
      🔗 Sync to Google
    </button>
    <button class="calendar-button" onclick="syncToOutlook()">
      📧 Sync to Outlook
    </button>
  </div>
</div>

<script>
function downloadICalFile() {
  // This would be handled by the frontend component
  console.log('Download iCal file');
}

function syncToGoogleCalendar() {
  // This would be handled by the frontend component
  console.log('Sync to Google Calendar');
}

function syncToOutlook() {
  // This would be handled by the frontend component
  console.log('Sync to Outlook');
}
</script>
`;
  }

  /**
   * Generate Language Proficiency HTML Fragment
   */
  generateLanguageProficiencyHTML(languageData: any): string {
    if (!languageData || !languageData.proficiencies || languageData.proficiencies.length === 0) {
      return '<div class="no-languages">No language proficiency data available</div>';
    }

    const { proficiencies, insights } = languageData;

    return `
<style>
.language-proficiency {
  margin: 2rem 0;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.language-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.language-card {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.language-card:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.language-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.language-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.3rem;
  font-weight: bold;
}

.language-flag {
  font-size: 1.5rem;
}

.language-level {
  background: rgba(255, 255, 255, 0.3);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
}

.proficiency-bar {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  height: 8px;
  overflow: hidden;
  margin: 1rem 0;
}

.proficiency-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ade80, #22c55e);
  border-radius: 10px;
  transition: width 0.8s ease;
}

.proficiency-score {
  text-align: center;
  font-size: 2rem;
  font-weight: bold;
  color: #4ade80;
  margin-bottom: 0.5rem;
}

.proficiency-contexts {
  margin-top: 1rem;
}

.context-tag {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  margin: 0.25rem 0.25rem 0.25rem 0;
}

.language-insights {
  margin-top: 2rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1.5rem;
}

.insight-item {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  border-left: 3px solid #4ade80;
}

.insight-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.insight-text {
  font-size: 0.9rem;
  line-height: 1.5;
  opacity: 0.9;
}

@media (max-width: 768px) {
  .language-proficiency {
    padding: 1rem;
  }
  
  .language-grid {
    grid-template-columns: 1fr;
  }
  
  .language-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
}
</style>

<div class="language-proficiency" id="language-proficiency-enhanced">
  <h2 style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem; text-align: center; color: white;">
    🌍 Language Proficiency
  </h2>
  <p style="text-align: center; opacity: 0.9; margin-bottom: 0;">
    Professional language skills and communication abilities
  </p>
  
  <div class="language-grid">
    ${proficiencies.map((lang: any) => `
      <div class="language-card">
        <div class="language-header">
          <div class="language-name">
            <span class="language-flag">${lang.flag || '🌐'}</span>
            ${lang.language}
          </div>
          <div class="language-level">${lang.level}</div>
        </div>
        
        <div class="proficiency-score">${lang.score}/100</div>
        
        <div class="proficiency-bar">
          <div class="proficiency-fill" data-score="${lang.score}" style="width: 0%"></div>
        </div>
        
        ${lang.certifications && lang.certifications.length > 0 ? `
          <div class="proficiency-contexts">
            <strong>Certifications:</strong>
            ${lang.certifications.map((cert: string) => `<span class="context-tag">${cert}</span>`).join('')}
          </div>
        ` : ''}
        
        ${lang.contexts && lang.contexts.length > 0 ? `
          <div class="proficiency-contexts">
            <strong>Contexts:</strong>
            ${lang.contexts.map((context: string) => `<span class="context-tag">${context}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>
  
  ${insights && insights.length > 0 ? `
    <div class="language-insights">
      <h3 style="font-size: 1.3rem; font-weight: bold; margin-bottom: 1rem;">Language Insights</h3>
      ${insights.map((insight: any) => `
        <div class="insight-item">
          <div class="insight-title">${insight.title}</div>
          <div class="insight-text">${insight.description}</div>
        </div>
      `).join('')}
    </div>
  ` : ''}
</div>

<script>
// Animate proficiency bars on load
document.addEventListener('DOMContentLoaded', function() {
  const proficiencyBars = document.querySelectorAll('.proficiency-fill');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const fill = entry.target;
        const score = fill.getAttribute('data-score');
        setTimeout(() => {
          fill.style.width = score + '%';
        }, Math.random() * 500);
      }
    });
  });
  
  proficiencyBars.forEach(bar => observer.observe(bar));
});
</script>
`;
  }

  /**
   * Generate Portfolio Gallery HTML Fragment
   */
  generatePortfolioGalleryHTML(portfolioData: any): string {
    if (!portfolioData || !portfolioData.items || portfolioData.items.length === 0) {
      return '<div class="no-portfolio">No portfolio items available</div>';
    }

    const { items, categories, statistics } = portfolioData;

    return `
<style>
.portfolio-gallery {
  margin: 2rem 0;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.portfolio-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  backdrop-filter: blur(10px);
}

.stat-number {
  font-size: 1.8rem;
  font-weight: bold;
  color: #4ade80;
  display: block;
}

.stat-label {
  font-size: 0.8rem;
  opacity: 0.9;
  margin-top: 0.25rem;
}

.portfolio-filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  justify-content: center;
}

.filter-button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.filter-button:hover,
.filter-button.active {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

.portfolio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.portfolio-item {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  cursor: pointer;
}

.portfolio-item:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.portfolio-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  background: linear-gradient(45deg, #4ade80, #22c55e);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: white;
}

.portfolio-content {
  padding: 1.5rem;
}

.portfolio-title {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #f8fafc;
}

.portfolio-description {
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 1rem;
  opacity: 0.9;
}

.portfolio-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.portfolio-tag {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.portfolio-links {
  display: flex;
  gap: 0.5rem;
}

.portfolio-link {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  text-decoration: none;
  font-size: 0.8rem;
  transition: all 0.3s ease;
}

.portfolio-link:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.portfolio-type {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.7);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
}

@media (max-width: 768px) {
  .portfolio-gallery {
    padding: 1rem;
  }
  
  .portfolio-grid {
    grid-template-columns: 1fr;
  }
  
  .portfolio-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .portfolio-filters {
    justify-content: flex-start;
  }
}
</style>

<div class="portfolio-gallery" id="portfolio-gallery-enhanced">
  <h2 style="font-size: 2rem; font-weight: bold; margin-bottom: 2rem; text-align: center; color: white;">
    🖼️ Portfolio Gallery
  </h2>
  
  <div class="portfolio-stats">
    <div class="stat-card">
      <span class="stat-number">${statistics?.totalProjects || items.length}</span>
      <div class="stat-label">Projects</div>
    </div>
    <div class="stat-card">
      <span class="stat-number">${categories?.length || 0}</span>
      <div class="stat-label">Categories</div>
    </div>
    <div class="stat-card">
      <span class="stat-number">${statistics?.technologiesUsed || 0}</span>
      <div class="stat-label">Technologies</div>
    </div>
    <div class="stat-card">
      <span class="stat-number">${statistics?.yearsSpan || 'N/A'}</span>
      <div class="stat-label">Experience</div>
    </div>
  </div>
  
  ${categories && categories.length > 0 ? `
    <div class="portfolio-filters">
      <button class="filter-button active" onclick="filterPortfolio('all')">
        All
      </button>
      ${categories.map((category: string) => `
        <button class="filter-button" onclick="filterPortfolio('${category}')">
          ${category}
        </button>
      `).join('')}
    </div>
  ` : ''}
  
  <div class="portfolio-grid">
    ${items.map((item: any) => `
      <div class="portfolio-item" data-category="${item.category}" onclick="openPortfolioItem('${item.id}')">
        ${item.type ? `<div class="portfolio-type">${this.formatPortfolioType(item.type)}</div>` : ''}
        
        <div class="portfolio-image">
          ${item.image ? `<img src="${item.image}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover;">` : 
            `<span>${this.getPortfolioIcon(item.type || 'project')}</span>`}
        </div>
        
        <div class="portfolio-content">
          <div class="portfolio-title">${item.title}</div>
          
          ${item.description ? `<div class="portfolio-description">${item.description}</div>` : ''}
          
          ${item.technologies && item.technologies.length > 0 ? `
            <div class="portfolio-tags">
              ${item.technologies.map((tech: string) => `<span class="portfolio-tag">${tech}</span>`).join('')}
            </div>
          ` : ''}
          
          <div class="portfolio-links">
            ${item.liveUrl ? `<a href="${item.liveUrl}" class="portfolio-link" target="_blank">Live Demo</a>` : ''}
            ${item.githubUrl ? `<a href="${item.githubUrl}" class="portfolio-link" target="_blank">GitHub</a>` : ''}
            ${item.caseStudyUrl ? `<a href="${item.caseStudyUrl}" class="portfolio-link" target="_blank">Case Study</a>` : ''}
          </div>
        </div>
      </div>
    `).join('')}
  </div>
</div>

<script>
function filterPortfolio(category) {
  const items = document.querySelectorAll('.portfolio-item');
  const buttons = document.querySelectorAll('.filter-button');
  
  // Update active button
  buttons.forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  // Filter items
  items.forEach(item => {
    if (category === 'all' || item.getAttribute('data-category') === category) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}

function openPortfolioItem(itemId) {
  // This would be handled by the frontend component
  console.log('Open portfolio item:', itemId);
}
</script>
`;
  }

  /**
   * Generate Timeline HTML Fragment
   */
  generateTimelineHTML(experience: any[]): string {
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
  private formatProficiency(proficiency: string): string {
    const proficiencyMap: Record<string, string> = {
      'native': 'Native',
      'fluent': 'Fluent',
      'professional': 'Professional',
      'conversational': 'Conversational',
      'basic': 'Basic'
    };
    return proficiencyMap[proficiency] || proficiency;
  }

  private getCertificationIcon(certName: string): string {
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

  private getCertificationStatus(cert: Certification): string {
    if (!cert.expiryDate) return 'valid';
    return new Date(cert.expiryDate) > new Date() ? 'valid' : 'expired';
  }

  private getCertificationStatusText(cert: Certification): string {
    if (!cert.expiryDate) return 'Valid';
    return new Date(cert.expiryDate) > new Date() ? 'Valid' : 'Expired';
  }

  private formatDateRange(startDate: string, endDate?: string): string {
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

  private formatEventDate(date: string | Date): string {
    const eventDate = new Date(date);
    return eventDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  private formatEventType(type: string): string {
    const typeMap: Record<string, string> = {
      'work': 'Work Anniversary',
      'education': 'Education Milestone',
      'certification': 'Certification',
      'reminder': 'Career Reminder'
    };
    return typeMap[type] || type;
  }

  private formatPortfolioType(type: string): string {
    const typeMap: Record<string, string> = {
      'project': 'Project',
      'website': 'Website',
      'app': 'Application',
      'design': 'Design',
      'writing': 'Writing',
      'research': 'Research'
    };
    return typeMap[type] || type;
  }

  private getPortfolioIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'project': '💼',
      'website': '🌐',
      'app': '📱',
      'design': '🎨',
      'writing': '✍️',
      'research': '🔬'
    };
    return iconMap[type] || '💼';
  }

  /**
   * Generate Video Introduction HTML Fragment
   */
  generateVideoIntroductionHTML(videoData: any): string {
    if (!videoData || !videoData.videoUrl) {
      return '<div class="no-video">No video introduction available</div>';
    }

    const { videoUrl, thumbnailUrl, duration, script, metadata } = videoData;

    return `
<style>
.video-introduction {
  margin: 2rem 0;
  padding: 2rem;
  background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
  border-radius: 12px;
  color: white;
  text-align: center;
}

.video-container {
  position: relative;
  max-width: 600px;
  margin: 0 auto 2rem;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
}

.video-player {
  width: 100%;
  height: auto;
  display: block;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  cursor: pointer;
}

.video-container:hover .video-overlay {
  opacity: 1;
}

.play-button {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #1e3a8a;
  transition: transform 0.3s ease;
}

.play-button:hover {
  transform: scale(1.1);
}

.video-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.video-stat {
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.video-stat-number {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
  color: #60a5fa;
  margin-bottom: 0.25rem;
}

.video-stat-label {
  font-size: 0.9rem;
  opacity: 0.8;
}

.video-controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

.video-control-btn {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.video-control-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.video-script {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 2rem;
  text-align: left;
  backdrop-filter: blur(10px);
}

.video-script-toggle {
  background: none;
  border: none;
  color: #60a5fa;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.video-script-content {
  line-height: 1.6;
  font-size: 0.95rem;
  opacity: 0.9;
  display: none;
}

.video-script-content.active {
  display: block;
}

@media (max-width: 768px) {
  .video-introduction {
    padding: 1rem;
  }
  
  .video-info {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .video-controls {
    flex-direction: column;
    align-items: center;
  }
  
  .video-control-btn {
    width: 100%;
    max-width: 200px;
    justify-content: center;
  }
}
</style>

<div class="video-introduction" id="video-introduction-enhanced">
  <h2 style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem;">
    🎥 Video Introduction
  </h2>
  <p style="opacity: 0.9; margin-bottom: 2rem;">
    Get to know me through this personalized video introduction
  </p>
  
  <div class="video-container">
    <video 
      class="video-player" 
      poster="${thumbnailUrl || ''}"
      controls
      preload="metadata"
    >
      <source src="${videoUrl}" type="video/mp4">
      Your browser does not support the video tag.
    </video>
    
    <div class="video-overlay" onclick="playVideo()">
      <div class="play-button">▶</div>
    </div>
  </div>
  
  <div class="video-info">
    <div class="video-stat">
      <span class="video-stat-number">${this.formatDuration(duration)}</span>
      <div class="video-stat-label">Duration</div>
    </div>
    <div class="video-stat">
      <span class="video-stat-number">${metadata?.style || 'Professional'}</span>
      <div class="video-stat-label">Style</div>
    </div>
    <div class="video-stat">
      <span class="video-stat-number">${metadata?.quality || 'HD'}</span>
      <div class="video-stat-label">Quality</div>
    </div>
  </div>
  
  <div class="video-controls">
    <a href="${videoUrl}" download class="video-control-btn">
      📥 Download Video
    </a>
    <button class="video-control-btn" onclick="shareVideo()">
      📤 Share Video
    </button>
    <button class="video-control-btn" onclick="fullscreenVideo()">
      ⛶ Fullscreen
    </button>
  </div>
  
  ${script ? `
    <div class="video-script">
      <button class="video-script-toggle" onclick="toggleScript()">
        📝 View Script
        <span id="script-arrow">▼</span>
      </button>
      <div class="video-script-content" id="video-script-content">
        <p>${script}</p>
      </div>
    </div>
  ` : ''}
</div>

<script>
function playVideo() {
  const video = document.querySelector('.video-player');
  if (video) {
    video.play();
    document.querySelector('.video-overlay').style.display = 'none';
  }
}

function shareVideo() {
  if (navigator.share) {
    navigator.share({
      title: 'My Video Introduction',
      text: 'Check out my professional video introduction',
      url: '${videoUrl}'
    });
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText('${videoUrl}').then(() => {
      alert('Video URL copied to clipboard!');
    });
  }
}

function fullscreenVideo() {
  const video = document.querySelector('.video-player');
  if (video.requestFullscreen) {
    video.requestFullscreen();
  } else if (video.webkitRequestFullscreen) {
    video.webkitRequestFullscreen();
  } else if (video.msRequestFullscreen) {
    video.msRequestFullscreen();
  }
}

function toggleScript() {
  const content = document.getElementById('video-script-content');
  const arrow = document.getElementById('script-arrow');
  
  if (content.classList.contains('active')) {
    content.classList.remove('active');
    arrow.textContent = '▼';
  } else {
    content.classList.add('active');
    arrow.textContent = '▲';
  }
}

// Auto-hide overlay when video starts playing
document.querySelector('.video-player').addEventListener('play', function() {
  document.querySelector('.video-overlay').style.display = 'none';
});

document.querySelector('.video-player').addEventListener('pause', function() {
  document.querySelector('.video-overlay').style.display = 'flex';
});
</script>
`;
  }

  private formatDuration(duration: number | string): string {
    if (typeof duration === 'string') {
      return duration;
    }
    
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Generate Podcast HTML Fragment
   */
  generatePodcastHTML(podcastData: any): string {
    if (!podcastData || !podcastData.audioUrl) {
      return '<div class="no-podcast">No podcast available</div>';
    }

    const { audioUrl, transcript, duration, chapters } = podcastData;

    return `
<style>
.podcast-player {
  margin: 2rem 0;
  padding: 2rem;
  background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
  border-radius: 12px;
  color: white;
}

.podcast-header {
  text-align: center;
  margin-bottom: 2rem;
}

.podcast-title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.podcast-subtitle {
  opacity: 0.9;
  font-size: 1.1rem;
}

.podcast-audio-container {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  backdrop-filter: blur(10px);
}

.custom-audio-player {
  width: 100%;
  margin-bottom: 1rem;
}

.audio-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.play-pause-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-pause-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.progress-container {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  cursor: pointer;
  position: relative;
}

.progress-bar {
  height: 100%;
  background: white;
  border-radius: 3px;
  width: 0%;
  transition: width 0.1s ease;
}

.time-display {
  font-size: 0.9rem;
  font-weight: 500;
  min-width: 100px;
  text-align: center;
}

.podcast-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.podcast-stat {
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.podcast-stat-number {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
  color: #fbbf24;
  margin-bottom: 0.25rem;
}

.podcast-stat-label {
  font-size: 0.9rem;
  opacity: 0.8;
}

.podcast-chapters {
  margin-bottom: 2rem;
}

.chapters-toggle {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.chapters-list {
  display: none;
  gap: 0.5rem;
  flex-direction: column;
}

.chapters-list.active {
  display: flex;
}

.chapter-item {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chapter-item:hover {
  background: rgba(255, 255, 255, 0.2);
}

.chapter-title {
  font-weight: 500;
}

.chapter-time {
  font-size: 0.8rem;
  opacity: 0.8;
}

.podcast-transcript {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
}

.transcript-toggle {
  background: none;
  border: none;
  color: #fbbf24;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.transcript-content {
  line-height: 1.6;
  font-size: 0.95rem;
  opacity: 0.9;
  display: none;
  max-height: 300px;
  overflow-y: auto;
}

.transcript-content.active {
  display: block;
}

.podcast-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 2rem;
}

.podcast-action-btn {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.podcast-action-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .podcast-player {
    padding: 1rem;
  }
  
  .podcast-info {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .audio-controls {
    flex-direction: column;
    gap: 1rem;
  }
  
  .progress-container {
    width: 100%;
  }
  
  .podcast-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .podcast-action-btn {
    width: 100%;
    max-width: 200px;
    justify-content: center;
  }
}
</style>

<div class="podcast-player" id="podcast-player-enhanced">
  <div class="podcast-header">
    <h2 class="podcast-title">🎙️ Career Podcast</h2>
    <p class="podcast-subtitle">A conversational journey through my professional story</p>
  </div>
  
  <div class="podcast-audio-container">
    <audio class="custom-audio-player" preload="metadata">
      <source src="${audioUrl}" type="audio/mpeg">
      Your browser does not support the audio element.
    </audio>
    
    <div class="audio-controls">
      <button class="play-pause-btn" onclick="togglePlayPause()">
        <span id="play-pause-icon">▶</span>
      </button>
      
      <div class="progress-container" onclick="seekAudio(event)">
        <div class="progress-bar" id="progress-bar"></div>
      </div>
      
      <div class="time-display">
        <span id="current-time">0:00</span> / <span id="total-time">${this.formatDuration(duration)}</span>
      </div>
    </div>
  </div>
  
  <div class="podcast-info">
    <div class="podcast-stat">
      <span class="podcast-stat-number">${this.formatDuration(duration)}</span>
      <div class="podcast-stat-label">Duration</div>
    </div>
    <div class="podcast-stat">
      <span class="podcast-stat-number">${chapters?.length || 0}</span>
      <div class="podcast-stat-label">Chapters</div>
    </div>
    <div class="podcast-stat">
      <span class="podcast-stat-number">HD</span>
      <div class="podcast-stat-label">Quality</div>
    </div>
  </div>
  
  ${chapters && chapters.length > 0 ? `
    <div class="podcast-chapters">
      <button class="chapters-toggle" onclick="toggleChapters()">
        📚 Chapters
        <span id="chapters-arrow">▼</span>
      </button>
      <div class="chapters-list" id="chapters-list">
        ${chapters.map((chapter: any, index: number) => `
          <div class="chapter-item" onclick="seekToChapter(${chapter.startTime || index * 60})">
            <span class="chapter-title">${chapter.title}</span>
            <span class="chapter-time">${this.formatDuration(chapter.startTime || index * 60)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : ''}
  
  ${transcript ? `
    <div class="podcast-transcript">
      <button class="transcript-toggle" onclick="toggleTranscript()">
        📝 Full Transcript
        <span id="transcript-arrow">▼</span>
      </button>
      <div class="transcript-content" id="transcript-content">
        <p>${transcript}</p>
      </div>
    </div>
  ` : ''}
  
  <div class="podcast-actions">
    <a href="${audioUrl}" download class="podcast-action-btn">
      📥 Download Audio
    </a>
    <button class="podcast-action-btn" onclick="sharePodcast()">
      📤 Share Podcast
    </button>
    <button class="podcast-action-btn" onclick="addToPlaylist()">
      ➕ Add to Playlist
    </button>
  </div>
</div>

<script>
let audio = null;
let isPlaying = false;

document.addEventListener('DOMContentLoaded', function() {
  audio = document.querySelector('.custom-audio-player');
  
  if (audio) {
    audio.addEventListener('loadedmetadata', updateTotalTime);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleAudioEnd);
  }
});

function togglePlayPause() {
  if (!audio) return;
  
  if (isPlaying) {
    audio.pause();
    document.getElementById('play-pause-icon').textContent = '▶';
    isPlaying = false;
  } else {
    audio.play();
    document.getElementById('play-pause-icon').textContent = '⏸';
    isPlaying = true;
  }
}

function updateProgress() {
  if (!audio) return;
  
  const progress = (audio.currentTime / audio.duration) * 100;
  document.getElementById('progress-bar').style.width = progress + '%';
  document.getElementById('current-time').textContent = formatTime(audio.currentTime);
}

function updateTotalTime() {
  if (!audio) return;
  document.getElementById('total-time').textContent = formatTime(audio.duration);
}

function seekAudio(event) {
  if (!audio) return;
  
  const progressContainer = event.currentTarget;
  const clickX = event.offsetX;
  const width = progressContainer.offsetWidth;
  const duration = audio.duration;
  
  audio.currentTime = (clickX / width) * duration;
}

function seekToChapter(time) {
  if (!audio) return;
  audio.currentTime = time;
  if (!isPlaying) togglePlayPause();
}

function handleAudioEnd() {
  document.getElementById('play-pause-icon').textContent = '▶';
  isPlaying = false;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

function toggleChapters() {
  const list = document.getElementById('chapters-list');
  const arrow = document.getElementById('chapters-arrow');
  
  if (list.classList.contains('active')) {
    list.classList.remove('active');
    arrow.textContent = '▼';
  } else {
    list.classList.add('active');
    arrow.textContent = '▲';
  }
}

function toggleTranscript() {
  const content = document.getElementById('transcript-content');
  const arrow = document.getElementById('transcript-arrow');
  
  if (content.classList.contains('active')) {
    content.classList.remove('active');
    arrow.textContent = '▼';
  } else {
    content.classList.add('active');
    arrow.textContent = '▲';
  }
}

function sharePodcast() {
  if (navigator.share) {
    navigator.share({
      title: 'My Career Podcast',
      text: 'Listen to my professional journey in podcast format',
      url: '${audioUrl}'
    });
  } else {
    navigator.clipboard.writeText('${audioUrl}').then(() => {
      alert('Podcast URL copied to clipboard!');
    });
  }
}

function addToPlaylist() {
  // This would integrate with music apps or save to favorites
  alert('Podcast saved to your favorites!');
}
</script>
`;
  }
}

// Export singleton instance
export const HTMLFragmentGeneratorService = new HTMLFragmentGeneratorServiceClass();