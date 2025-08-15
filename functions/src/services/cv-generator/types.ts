import { ParsedCV } from '../cvParser';

/**
 * Base interface for CV template generators
 */
export interface CVTemplate {
  generateHTML(cv: ParsedCV, jobId: string, features?: string[]): Promise<string>;
}

/**
 * CV feature generator interface
 */
export interface CVFeature {
  generate(cv: ParsedCV, jobId: string, options?: any): Promise<string>;
  getStyles(): string;
  getScripts(): string;
}

/**
 * Template generation options
 */
export interface TemplateOptions {
  jobId: string;
  features?: string[];
  theme?: 'light' | 'dark';
  customStyles?: string;
}

/**
 * Interactive feature result
 */
export interface InteractiveFeatureResult {
  qrCode?: string;
  podcastPlayer?: string;
  timeline?: string;
  skillsChart?: string;
  socialLinks?: string;
  contactForm?: string;
  calendar?: string;
  languageProficiency?: string;
  certificationBadges?: string;
  achievementsShowcase?: string;
  videoIntroduction?: string;
  portfolioGallery?: string;
  testimonialsCarousel?: string;
  additionalStyles?: string;
  additionalScripts?: string;
}

/**
 * PDF generation options
 */
export interface PDFGenerationOptions {
  features?: string[];
  interactive?: boolean;
  includeMultimedia?: boolean;
}

/**
 * File generation result
 */
export interface FileGenerationResult {
  pdfUrl: string;
  docxUrl: string;
  htmlUrl: string;
}

/**
 * Template types supported by the system
 */
export type TemplateType = 'modern' | 'classic' | 'creative';

/**
 * Feature types supported by the system
 */
export type FeatureType = 
  | 'embed-qr-code'
  | 'generate-podcast'
  | 'privacy-mode'
  | 'interactive-timeline'
  | 'skills-visualization'
  | 'social-links'
  | 'contact-form'
  | 'calendar-integration'
  | 'language-proficiency'
  | 'certification-badges'
  | 'achievements-showcase'
  | 'video-introduction'
  | 'portfolio-gallery'
  | 'testimonials-carousel';