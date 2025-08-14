/**
 * Core CV and Job Type Definitions
 * Extracted from cvService.ts for better modularity
 */

export interface Job {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'analyzed' | 'generating' | 'completed' | 'failed';
  fileUrl?: string;
  mimeType?: string;
  isUrl?: boolean;
  userInstructions?: string;
  parsedData?: any;
  generatedCV?: {
    html: string;
    htmlUrl?: string;
    pdfUrl: string;
    docxUrl: string;
    template?: string;
    features?: string[];
  };
  piiDetection?: {
    hasPII: boolean;
    detectedTypes: string[];
    recommendations: string[];
  };
  privacyVersion?: any;
  quickCreate?: boolean;
  settings?: {
    applyAllEnhancements: boolean;
    generateAllFormats: boolean;
    enablePIIProtection: boolean;
    createPodcast: boolean;
    useRecommendedTemplate: boolean;
  };
  error?: string;
  createdAt: any;
  updatedAt: any;
}

export interface JobCreateParams {
  url?: string;
  quickCreate?: boolean;
  userInstructions?: string;
}

export interface FileUploadParams {
  file: File;
  jobId: string;
}

export interface CVProcessParams {
  jobId: string;
  fileUrl: string;
  mimeType: string;
  isUrl?: boolean;
}

export interface CVAnalysisParams {
  parsedCV: any;
  targetRole?: string;
  jobDescription?: string;
  industryKeywords?: string[];
  jobId?: string;
}

export interface TemplateGenerationParams {
  jobId: string;
  templateId: string;
  features: string[];
}