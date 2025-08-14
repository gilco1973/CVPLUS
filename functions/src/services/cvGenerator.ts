import { ParsedCV } from './cvParser';
import { 
  TemplateType, 
  FeatureType, 
  FileGenerationResult,
  InteractiveFeatureResult
} from './cv-generator/types';
import { TemplateRegistry } from './cv-generator/templates/TemplateRegistry';
import { FeatureRegistry } from './cv-generator/features/FeatureRegistry';
import { FileManager } from './cv-generator/files/FileManager';

/**
 * Refactored CV Generator using modular architecture
 * Orchestrates template generation, feature integration, and file management
 */
export class CVGenerator {
  private fileManager: FileManager;

  constructor() {
    this.fileManager = new FileManager();
  }

  /**
   * Generate complete HTML CV with template and features
   */
  async generateHTML(
    parsedCV: ParsedCV, 
    template: string, 
    features?: string[], 
    jobId?: string
  ): Promise<string> {
    try {
      // Validate and get template type
      const templateType = this.validateTemplateType(template);
      
      // Validate features
      const validFeatures = this.validateFeatures(features || []);
      
      // Get template instance
      const templateInstance = TemplateRegistry.getTemplate(templateType);
      
      // Generate base HTML from template
      let html = await templateInstance.generateHTML(parsedCV, jobId || '', validFeatures);
      
      // Generate and inject interactive features if requested
      if (validFeatures.length > 0 && jobId) {
        const interactiveFeatures = await FeatureRegistry.generateFeatures(
          parsedCV, 
          jobId, 
          validFeatures
        );
        
        // Inject features into template
        html = this.injectFeatures(html, interactiveFeatures);
      }
      
      // Replace jobId placeholder if podcast feature is enabled
      if (validFeatures.includes('generate-podcast') && jobId) {
        html = html.replace('{{JOB_ID}}', jobId);
      }
      
      return html;
      
    } catch (error: any) {
      console.error('Error generating CV HTML:', error);
      throw new Error(`Failed to generate CV: ${error.message}`);
    }
  }

  /**
   * Save generated CV files (HTML, PDF, DOCX)
   */
  async saveGeneratedFiles(
    jobId: string,
    userId: string,
    htmlContent: string
  ): Promise<FileGenerationResult> {
    return await this.fileManager.saveGeneratedFiles(jobId, userId, htmlContent);
  }

  /**
   * Delete generated files for a job
   */
  async deleteGeneratedFiles(userId: string, jobId: string): Promise<void> {
    return await this.fileManager.deleteGeneratedFiles(userId, jobId);
  }

  /**
   * Check if files exist for a job
   */
  async checkFilesExist(userId: string, jobId: string): Promise<{
    htmlExists: boolean;
    pdfExists: boolean;
    docxExists: boolean;
  }> {
    return await this.fileManager.checkFilesExist(userId, jobId);
  }

  /**
   * Validate template type
   */
  private validateTemplateType(template: string): TemplateType {
    if (!TemplateRegistry.isSupported(template)) {
      console.warn(`Unsupported template type: ${template}, falling back to 'modern'`);
      return 'modern';
    }
    return template as TemplateType;
  }

  /**
   * Validate and filter features
   */
  private validateFeatures(features: string[]): FeatureType[] {
    const validFeatures: FeatureType[] = [];
    
    for (const feature of features) {
      if (FeatureRegistry.isSupported(feature)) {
        validFeatures.push(feature as FeatureType);
      } else {
        console.warn(`Unsupported feature type: ${feature}`);
      }
    }
    
    return validFeatures;
  }

  /**
   * Inject interactive features into the HTML template
   */
  private injectFeatures(html: string, features: InteractiveFeatureResult): string {
    let injectedHtml = html;
    
    // Inject additional styles
    if (features.additionalStyles) {
      injectedHtml = injectedHtml.replace(
        '</style>',
        features.additionalStyles + '\n</style>'
      );
    }
    
    // Inject additional scripts
    if (features.additionalScripts) {
      injectedHtml = injectedHtml.replace(
        '</body>',
        `<script>${features.additionalScripts}</script>\n</body>`
      );
    }
    
    // Replace feature placeholders with actual content
    const featureMap = {
      '${interactiveFeatures.qrCode || \'\'}': features.qrCode || '',
      '${interactiveFeatures.podcastPlayer || \'\'}': features.podcastPlayer || '',
      '${interactiveFeatures.timeline || \'\'}': features.timeline || '',
      '${interactiveFeatures.skillsChart || \'\'}': features.skillsChart || '',
      '${interactiveFeatures.socialLinks || \'\'}': features.socialLinks || '',
      '${interactiveFeatures.contactForm || \'\'}': features.contactForm || '',
      '${interactiveFeatures.calendar || \'\'}': features.calendar || '',
      '${interactiveFeatures.languageProficiency || \'\'}': features.languageProficiency || '',
      '${interactiveFeatures.certificationBadges || \'\'}': features.certificationBadges || '',
      '${interactiveFeatures.achievementsShowcase || \'\'}': features.achievementsShowcase || '',
      '${interactiveFeatures.videoIntroduction || \'\'}': features.videoIntroduction || '',
      '${interactiveFeatures.portfolioGallery || \'\'}': features.portfolioGallery || '',
      '${interactiveFeatures.testimonialsCarousel || \'\'}': features.testimonialsCarousel || ''
    };
    
    for (const [placeholder, content] of Object.entries(featureMap)) {
      injectedHtml = injectedHtml.replace(new RegExp(escapeRegExp(placeholder), 'g'), content);
    }
    
    return injectedHtml;
  }

  /**
   * Get supported template types
   */
  getSupportedTemplates(): TemplateType[] {
    return TemplateRegistry.getSupportedTypes();
  }

  /**
   * Get supported feature types
   */
  getSupportedFeatures(): FeatureType[] {
    return FeatureRegistry.getSupportedTypes();
  }
}

/**
 * Utility function to escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}