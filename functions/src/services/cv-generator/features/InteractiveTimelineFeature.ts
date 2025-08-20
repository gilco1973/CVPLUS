import { CVFeature } from '../types';
import { ParsedCV } from '../../cvParser';

/**
 * Interactive Timeline Feature - Generates interactive career timeline for CV
 */
export class InteractiveTimelineFeature implements CVFeature {
  
  async generate(cv: ParsedCV, jobId: string, options?: any): Promise<string> {
    const contactName = cv.personalInfo?.name || 'the CV owner';
    
    // Always use React component instead of legacy HTML
    return this.generateReactComponentPlaceholder(jobId, contactName, cv, options);
  }
  
  /**
   * Generate React component placeholder for modern CV rendering
   */
  private generateReactComponentPlaceholder(jobId: string, contactName: string, cv: ParsedCV, options?: any): string {
    // Extract timeline events from CV data
    const events = this.extractTimelineEvents(cv);
    
    const componentProps = {
      profileId: jobId,
      jobId: jobId,
      events: events,
      data: {
        contactName: contactName,
        totalEvents: events.length,
        yearsOfExperience: this.calculateYearsOfExperience(cv)
      },
      isEnabled: true,
      customization: {
        title: options?.title || `${contactName}'s Career Timeline`,
        theme: options?.theme || 'auto',
        viewMode: options?.viewMode || 'timeline',
        showFilters: options?.showFilters !== false,
        showMetrics: options?.showMetrics !== false,
        animationType: options?.animationType || 'fade'
      },
      className: 'cv-interactive-timeline',
      mode: 'public',
      // Timeline-specific handlers
      onEventClick: 'handleTimelineEventClick'
    };
    
    return `
      <div class="cv-feature-container interactive-timeline-feature">
        <div class="react-component-placeholder" 
             data-component="InteractiveTimeline" 
             data-props='${JSON.stringify(componentProps).replace(/'/g, "&apos;")}'
             id="interactive-timeline-${jobId}">
          <!-- React InteractiveTimeline component will be rendered here -->
          <div class="component-loading">
            <div class="loading-spinner"></div>
            <p>Loading interactive timeline...</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Extract timeline events from CV data
   */
  private extractTimelineEvents(cv: ParsedCV): any[] {
    const events: any[] = [];

    // Work experience events
    if (cv.experience) {
      cv.experience.forEach((exp, index) => {
        const startDate = new Date(exp.startDate);
        const endDate = exp.endDate ? new Date(exp.endDate) : undefined;
        
        events.push({
          id: `work-${index}`,
          type: 'work',
          title: exp.position,
          organization: exp.company,
          startDate: startDate,
          endDate: endDate,
          current: !exp.endDate,
          description: exp.description,
          achievements: exp.achievements || [],
          skills: exp.technologies || [],
          location: exp.location
        });
      });
    }

    // Education events
    if (cv.education) {
      cv.education.forEach((edu, index) => {
        const graduationDate = new Date(edu.graduationDate);
        // Estimate start date (typically 4 years for bachelor's, 2 for master's)
        const estimatedDuration = edu.degree.toLowerCase().includes('master') ? 2 : 
                                 edu.degree.toLowerCase().includes('phd') ? 4 : 4;
        const startDate = new Date(graduationDate);
        startDate.setFullYear(startDate.getFullYear() - estimatedDuration);
        
        events.push({
          id: `education-${index}`,
          type: 'education',
          title: edu.degree,
          organization: edu.institution,
          startDate: startDate,
          endDate: graduationDate,
          current: false,
          description: `${edu.field} degree${edu.gpa ? ` (GPA: ${edu.gpa})` : ''}`,
          achievements: edu.honors || [],
          skills: [edu.field],
          location: undefined // Education location not stored in current schema
        });
      });
    }

    // Certification events (as point-in-time achievements)
    if (cv.certifications) {
      cv.certifications.forEach((cert, index) => {
        const certDate = new Date(cert.date);
        
        events.push({
          id: `certification-${index}`,
          type: 'certification',
          title: cert.name,
          organization: cert.issuer,
          startDate: certDate,
          endDate: undefined, // Certifications are point-in-time
          current: false,
          description: `Professional certification${cert.credentialId ? ` (ID: ${cert.credentialId})` : ''}`,
          achievements: [`Earned ${cert.name} certification`],
          skills: [cert.name],
          location: undefined
        });
      });
    }

    // Project achievements (if available)
    if (cv.projects) {
      cv.projects.forEach((project, index) => {
        // Projects don't have dates in the schema, so use current date as placeholder
        const projectDate = new Date();
        
        events.push({
          id: `achievement-${index}`,
          type: 'achievement',
          title: project.name,
          organization: 'Personal Project',
          startDate: projectDate,
          endDate: undefined,
          current: false,
          description: project.description,
          achievements: [`Completed project: ${project.name}`],
          skills: project.technologies || [],
          location: undefined
        });
      });
    }

    // Sort events by start date
    return events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }

  /**
   * Calculate years of experience from CV data
   */
  private calculateYearsOfExperience(cv: ParsedCV): number {
    if (!cv.experience || cv.experience.length === 0) return 0;

    let totalMonths = 0;
    cv.experience.forEach(exp => {
      const startDate = new Date(exp.startDate);
      const endDate = exp.endDate ? new Date(exp.endDate) : new Date();
      
      const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                        (endDate.getMonth() - startDate.getMonth());
      totalMonths += monthsDiff;
    });

    return Math.round(totalMonths / 12 * 10) / 10; // Round to 1 decimal place
  }

  getStyles(): string {
    return `
      /* CV Interactive Timeline Feature Container Styles */
      .cv-feature-container.interactive-timeline-feature {
        margin: 2rem 0;
      }
      
      /* React Component Placeholder Styles */
      .react-component-placeholder[data-component="InteractiveTimeline"] {
        min-height: 600px;
        position: relative;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border-radius: 16px;
        padding: 2rem;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      /* Loading state for timeline */
      .interactive-timeline-feature .component-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 500px;
        color: #64748b;
      }
      
      .interactive-timeline-feature .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #e2e8f0;
        border-top: 3px solid #06b6d4;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
      }
      
      /* Timeline fallback styles */
      .timeline-fallback {
        text-align: center;
        padding: 3rem;
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border-radius: 16px;
        border: 2px solid #0ea5e9;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      .timeline-fallback-header {
        margin-bottom: 2rem;
      }
      
      .timeline-fallback-header h3 {
        color: #0c4a6e;
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0 0 0.75rem 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }
      
      .timeline-fallback-header p {
        color: #075985;
        font-size: 1.1rem;
        margin: 0;
      }
      
      .timeline-fallback-content {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        margin: 2rem auto;
        max-width: 600px;
        text-align: left;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .timeline-fallback-content h4 {
        color: #1e293b;
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0 0 1.5rem 0;
      }
      
      .timeline-events-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .timeline-events-list li {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        padding: 1rem 0;
        border-bottom: 1px solid #f1f5f9;
      }
      
      .timeline-events-list li:last-child {
        border-bottom: none;
      }
      
      .timeline-event-icon {
        flex-shrink: 0;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        color: white;
        font-weight: bold;
      }
      
      .timeline-event-work {
        background: linear-gradient(135deg, #3b82f6, #06b6d4);
      }
      
      .timeline-event-education {
        background: linear-gradient(135deg, #8b5cf6, #ec4899);
      }
      
      .timeline-event-certification {
        background: linear-gradient(135deg, #eab308, #f97316);
      }
      
      .timeline-event-achievement {
        background: linear-gradient(135deg, #10b981, #059669);
      }
      
      .timeline-event-details h5 {
        color: #1e293b;
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 0.25rem 0;
      }
      
      .timeline-event-details p {
        color: #64748b;
        font-size: 0.875rem;
        margin: 0 0 0.5rem 0;
      }
      
      .timeline-event-date {
        color: #9ca3af;
        font-size: 0.75rem;
        font-weight: 500;
      }
      
      .timeline-summary {
        background: #f8fafc;
        border-radius: 8px;
        padding: 1.5rem;
        margin-top: 2rem;
        text-align: center;
        border: 1px solid #e2e8f0;
      }
      
      .timeline-summary h5 {
        color: #0ea5e9;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
        font-size: 0.875rem;
      }
      
      .timeline-summary p {
        color: #64748b;
        font-size: 0.8rem;
        margin: 0;
        line-height: 1.5;
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .react-component-placeholder[data-component="InteractiveTimeline"] {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-color: #475569;
        }
        
        .timeline-fallback {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-color: #0ea5e9;
        }
        
        .timeline-fallback-header h3 {
          color: #f1f5f9;
        }
        
        .timeline-fallback-header p {
          color: #cbd5e1;
        }
        
        .timeline-fallback-content {
          background: #374151;
        }
        
        .timeline-fallback-content h4 {
          color: #f1f5f9;
        }
        
        .timeline-events-list li {
          border-color: #4b5563;
        }
        
        .timeline-event-details h5 {
          color: #f1f5f9;
        }
        
        .timeline-event-details p {
          color: #9ca3af;
        }
        
        .timeline-event-date {
          color: #6b7280;
        }
        
        .timeline-summary {
          background: #4b5563;
          border-color: #6b7280;
        }
        
        .timeline-summary h5 {
          color: #38bdf8;
        }
        
        .timeline-summary p {
          color: #9ca3af;
        }
      }
      
      /* Mobile responsive */
      @media (max-width: 768px) {
        .cv-feature-container.interactive-timeline-feature {
          margin: 1rem 0;
        }
        
        .react-component-placeholder[data-component="InteractiveTimeline"] {
          padding: 1.5rem;
        }
        
        .timeline-fallback {
          padding: 2rem;
        }
        
        .timeline-fallback-content {
          margin: 1.5rem auto;
          padding: 1.5rem;
        }
        
        .timeline-events-list li {
          flex-direction: column;
          text-align: center;
          gap: 0.5rem;
        }
        
        .timeline-event-icon {
          align-self: center;
        }
      }
    `;
  }

  getScripts(): string {
    return `
      (function() {
        // Initialize React InteractiveTimeline components
        function initReactComponents() {
          const placeholders = document.querySelectorAll('.react-component-placeholder[data-component="InteractiveTimeline"]');
          
          if (placeholders.length === 0) {
            console.log('No InteractiveTimeline placeholders found');
            return false;
          }
          
          console.log('📊 Initializing React InteractiveTimeline components...', placeholders.length, 'found');
          
          placeholders.forEach((placeholder, index) => {
            try {
              const propsString = placeholder.dataset.props || '{}';
              const props = JSON.parse(propsString.replace(/&apos;/g, "'"));
              
              console.log('InteractiveTimeline props for component', index + 1, ':', props);
              
              // Check if React component renderer is available
              if (typeof window.renderReactComponent === 'function') {
                console.log('✅ React renderer available, rendering InteractiveTimeline');
                window.renderReactComponent('InteractiveTimeline', props, placeholder);
              } else {
                console.log('⚠️ React renderer not available, showing fallback message');
                showTimelineFallback(placeholder, props);
              }
            } catch (error) {
              console.error('Failed to parse InteractiveTimeline props:', error);
              showTimelineError(placeholder, error.message);
            }
          });
          
          return true;
        }
        
        // Show fallback when React renderer is not available
        function showTimelineFallback(placeholder, props) {
          const events = props.events || [];
          const contactName = props.data?.contactName || 'the CV owner';
          const yearsOfExperience = props.data?.yearsOfExperience || 0;
          
          // Group events by type for display
          const workEvents = events.filter(e => e.type === 'work');
          const educationEvents = events.filter(e => e.type === 'education');
          const certificationEvents = events.filter(e => e.type === 'certification');
          const achievementEvents = events.filter(e => e.type === 'achievement');
          
          placeholder.innerHTML = \`
            <div class="timeline-fallback">
              <div class="timeline-fallback-header">
                <h3>⏰ \${props.customization?.title || contactName + "'s Career Timeline"}</h3>
                <p>Interactive career journey with \${events.length} milestones</p>
              </div>
              <div class="timeline-fallback-content">
                <h4>📈 Career Overview</h4>
                <ul class="timeline-events-list">
                  \${workEvents.map(event => \`
                    <li>
                      <div class="timeline-event-icon timeline-event-work">💼</div>
                      <div class="timeline-event-details">
                        <h5>\${event.title}</h5>
                        <p>\${event.organization}</p>
                        <div class="timeline-event-date">
                          \${new Date(event.startDate).getFullYear()} - \${event.current ? 'Present' : event.endDate ? new Date(event.endDate).getFullYear() : 'Present'}
                        </div>
                      </div>
                    </li>
                  \`).join('')}
                  \${educationEvents.map(event => \`
                    <li>
                      <div class="timeline-event-icon timeline-event-education">🎓</div>
                      <div class="timeline-event-details">
                        <h5>\${event.title}</h5>
                        <p>\${event.organization}</p>
                        <div class="timeline-event-date">
                          \${new Date(event.startDate).getFullYear()} - \${new Date(event.endDate).getFullYear()}
                        </div>
                      </div>
                    </li>
                  \`).join('')}
                  \${certificationEvents.map(event => \`
                    <li>
                      <div class="timeline-event-icon timeline-event-certification">📜</div>
                      <div class="timeline-event-details">
                        <h5>\${event.title}</h5>
                        <p>\${event.organization}</p>
                        <div class="timeline-event-date">
                          \${new Date(event.startDate).getFullYear()}
                        </div>
                      </div>
                    </li>
                  \`).join('')}
                  \${achievementEvents.map(event => \`
                    <li>
                      <div class="timeline-event-icon timeline-event-achievement">🏆</div>
                      <div class="timeline-event-details">
                        <h5>\${event.title}</h5>
                        <p>\${event.organization}</p>
                        <div class="timeline-event-date">
                          \${new Date(event.startDate).getFullYear()}
                        </div>
                      </div>
                    </li>
                  \`).join('')}
                </ul>
                <div class="timeline-summary">
                  <h5>⚡ Interactive Features</h5>
                  <p>Full timeline with interactive views, filtering, and detailed event information requires JavaScript and React to be enabled in your browser.</p>
                </div>
              </div>
            </div>
          \`;
        }
        
        // Show error when React props parsing fails
        function showTimelineError(placeholder, errorMessage) {
          placeholder.innerHTML = \`
            <div class="timeline-fallback" style="border-color: #dc2626;">
              <div class="timeline-fallback-header">
                <h3 style="color: #dc2626;">❌ Timeline Error</h3>
                <p style="color: #b91c1c;">Unable to load interactive timeline: \${errorMessage}</p>
              </div>
              <div class="timeline-fallback-content">
                <p style="color: #6b7280; text-align: center;">
                  Please contact for detailed career history and timeline information.
                </p>
              </div>
            </div>
          \`;
        }
        
        // Initialize when DOM is ready
        function startInitialization() {
          console.log('🚀 Starting InteractiveTimeline initialization...');
          initReactComponents();
        }
        
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', startInitialization);
        } else {
          startInitialization();
        }
        
        // Export for external access
        window.InteractiveTimelineFeature = {
          initReactComponents
        };
        
        // Global function to re-initialize components (useful for dynamic content)
        window.initInteractiveTimeline = initReactComponents;
        
      })();
    `;
  }
}