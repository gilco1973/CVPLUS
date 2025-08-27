/**
 * CV Template Service
 * 
 * Handles template management, HTML generation, and template-specific logic.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { BaseService } from '../shared/base-service';
import { ServiceResult } from '../shared/service-types';
import { CVGenerator } from '../../services/cvGenerator';

export interface TemplateGenerationOptions {
  templateId: string;
  cvData: any;
  features?: string[];
  jobId?: string;
  customizations?: Record<string, any>;
}

export interface TemplateGenerationResult {
  html: string;
  templateUsed: string;
  generationTime: number;
  metadata?: Record<string, any>;
}

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  features: string[];
  requirements: string[];
  preview?: string;
}

export class CVTemplateService extends BaseService {
  private cvGenerator!: CVGenerator;
  private templateCache = new Map<string, TemplateInfo>();

  constructor() {
    super({
      name: 'cv-template',
      version: '1.0.0'
    });
  }

  protected async onInitialize(): Promise<void> {
    this.cvGenerator = new CVGenerator();
    await this.loadTemplateDefinitions();
    this.logger.info('CV Template Service initialized');
  }

  protected async onCleanup(): Promise<void> {
    this.templateCache.clear();
    this.logger.info('CV Template Service cleaned up');
  }

  protected async onHealthCheck(): Promise<{ metrics: any }> {
    return {
      metrics: {
        templatesLoaded: this.templateCache.size,
        generationsPerformed: 0
      }
    };
  }

  /**
   * Generate HTML content using specified template
   */
  async generateHTML(
    cvData: any,
    templateId: string,
    features?: string[],
    jobId?: string
  ): Promise<ServiceResult<TemplateGenerationResult>> {
    try {
      const startTime = Date.now();

      this.logger.info('Generating HTML with template', { 
        templateId, 
        jobId, 
        features: features?.length || 0 
      });

      // Validate template exists
      const templateInfo = await this.getTemplateInfo(templateId);
      if (!templateInfo.success) {
        return {
          success: false,
          error: templateInfo.error
        };
      }

      // Generate HTML using CVGenerator
      const html = await this.executeWithTimeout(
        () => this.cvGenerator.generateHTML(cvData, templateId, features, jobId),
        30000 // 30 second timeout
      );

      const generationTime = Date.now() - startTime;

      const result: TemplateGenerationResult = {
        html,
        templateUsed: templateId,
        generationTime,
        metadata: {
          features: features || [],
          jobId,
          generatedAt: new Date(),
          cvDataHash: this.generateDataHash(cvData)
        }
      };

      this.logger.info('HTML generation completed', { 
        templateId, 
        generationTime,
        htmlLength: html.length 
      });

      return { success: true, data: result };

    } catch (error) {
      this.logger.error('HTML generation failed', { 
        templateId, 
        jobId, 
        error 
      });

      return {
        success: false,
        error: {
          name: 'TemplateGenerationError',
          message: error instanceof Error ? error.message : 'HTML generation failed',
          code: 'TEMPLATE_GENERATION_FAILED',
          context: { templateId, jobId }
        }
      };
    }
  }

  /**
   * Get available templates
   */
  async getAvailableTemplates(): Promise<ServiceResult<TemplateInfo[]>> {
    try {
      const templates = Array.from(this.templateCache.values());
      
      return { 
        success: true, 
        data: templates.sort((a, b) => a.name.localeCompare(b.name))
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'TemplateRetrievalError',
          message: error instanceof Error ? error.message : 'Failed to retrieve templates',
          code: 'TEMPLATE_RETRIEVAL_FAILED'
        }
      };
    }
  }

  /**
   * Get template information
   */
  async getTemplateInfo(templateId: string): Promise<ServiceResult<TemplateInfo>> {
    try {
      const template = this.templateCache.get(templateId);
      
      if (!template) {
        // Try to use default template as fallback
        const defaultTemplate = this.templateCache.get('modern');
        if (defaultTemplate) {
          this.logger.warn('Template not found, using default', { 
            requestedTemplate: templateId, 
            defaultTemplate: 'modern' 
          });
          
          return { 
            success: true, 
            data: { ...defaultTemplate, id: templateId } 
          };
        }

        return {
          success: false,
          error: {
            name: 'TemplateNotFoundError',
            message: `Template '${templateId}' not found`,
            code: 'TEMPLATE_NOT_FOUND'
          }
        };
      }

      return { success: true, data: template };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'TemplateInfoError',
          message: error instanceof Error ? error.message : 'Failed to get template info',
          code: 'TEMPLATE_INFO_FAILED'
        }
      };
    }
  }

  /**
   * Validate template compatibility with features
   */
  async validateTemplateFeatureCompatibility(
    templateId: string, 
    features: string[]
  ): Promise<ServiceResult<{ compatible: boolean, incompatibleFeatures: string[] }>> {
    try {
      const templateResult = await this.getTemplateInfo(templateId);
      if (!templateResult.success) {
        return {
          success: false,
          error: templateResult.error
        };
      }

      const template = templateResult.data!;
      const incompatibleFeatures: string[] = [];

      for (const feature of features) {
        if (!this.isFeatureSupported(template, feature)) {
          incompatibleFeatures.push(feature);
        }
      }

      return {
        success: true,
        data: {
          compatible: incompatibleFeatures.length === 0,
          incompatibleFeatures
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'CompatibilityCheckError',
          message: error instanceof Error ? error.message : 'Compatibility check failed',
          code: 'COMPATIBILITY_CHECK_FAILED'
        }
      };
    }
  }

  /**
   * Get template preview
   */
  async getTemplatePreview(templateId: string): Promise<ServiceResult<string>> {
    try {
      const templateResult = await this.getTemplateInfo(templateId);
      if (!templateResult.success) {
        return {
          success: false,
          error: templateResult.error
        };
      }

      const template = templateResult.data!;
      const preview = template.preview || this.generateDefaultPreview(template);

      return { success: true, data: preview };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'PreviewGenerationError',
          message: error instanceof Error ? error.message : 'Preview generation failed',
          code: 'PREVIEW_GENERATION_FAILED'
        }
      };
    }
  }

  private async loadTemplateDefinitions(): Promise<void> {
    // Define available templates
    const templates: TemplateInfo[] = [
      {
        id: 'modern',
        name: 'Modern Professional',
        description: 'Clean, modern design with focus on readability',
        category: 'professional',
        features: ['skills-visualization', 'achievements-analysis', 'ats-optimization'],
        requirements: ['personalInfo.name', 'experience']
      },
      {
        id: 'classic',
        name: 'Classic Traditional',
        description: 'Traditional CV format suitable for conservative industries',
        category: 'traditional',
        features: ['ats-optimization', 'achievements-analysis'],
        requirements: ['personalInfo.name', 'personalInfo.email', 'experience', 'education']
      },
      {
        id: 'creative',
        name: 'Creative Portfolio',
        description: 'Visually appealing design for creative professionals',
        category: 'creative',
        features: ['skills-visualization', 'portfolio-gallery', 'achievements-analysis'],
        requirements: ['personalInfo.name', 'skills']
      },
      {
        id: 'executive',
        name: 'Executive Leadership',
        description: 'Sophisticated design for senior executives',
        category: 'executive',
        features: ['achievements-analysis', 'ats-optimization', 'leadership-metrics'],
        requirements: ['personalInfo.name', 'experience', 'leadership']
      },
      {
        id: 'tech',
        name: 'Technology Focused',
        description: 'Template optimized for technology professionals',
        category: 'technology',
        features: ['skills-visualization', 'portfolio-gallery', 'ats-optimization'],
        requirements: ['personalInfo.name', 'skills', 'experience']
      }
    ];

    // Load templates into cache
    for (const template of templates) {
      this.templateCache.set(template.id, template);
    }

    this.logger.info('Template definitions loaded', { 
      count: templates.length 
    });
  }

  private isFeatureSupported(template: TemplateInfo, feature: string): boolean {
    return template.features.includes(feature) || 
           this.getUniversalFeatures().includes(feature);
  }

  private getUniversalFeatures(): string[] {
    // Features that work with all templates
    return [
      'privacy-mode',
      'generate-podcast',
      'language-proficiency',
      'social-media-integration'
    ];
  }

  private generateDataHash(cvData: any): string {
    // Simple hash function for data integrity checking
    const dataString = JSON.stringify(cvData);
    let hash = 0;
    
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  private generateDefaultPreview(template: TemplateInfo): string {
    return `
      <div class="template-preview ${template.category}">
        <h3>${template.name}</h3>
        <p>${template.description}</p>
        <div class="features">
          ${template.features.map(f => `<span class="feature">${f}</span>`).join('')}
        </div>
        <div class="sample-content">
          <div class="header">John Doe</div>
          <div class="section">Professional Experience</div>
          <div class="section">Education</div>
          <div class="section">Skills</div>
        </div>
      </div>
    `;
  }
}