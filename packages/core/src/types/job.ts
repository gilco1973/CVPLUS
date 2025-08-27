/**
 * Job and Processing Types
 * 
 * Core types for CV processing jobs and related data structures.
 * These types are shared between frontend and backend services.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// ============================================================================
// JOB STATUS AND STATE TYPES
// ============================================================================

export type JobStatus = 
  | 'pending' 
  | 'processing' 
  | 'analyzed' 
  | 'generating' 
  | 'completed' 
  | 'failed';

export interface JobSettings {
  applyAllEnhancements: boolean;
  generateAllFormats: boolean;
  enablePIIProtection: boolean;
  createPodcast: boolean;
  useRecommendedTemplate: boolean;
}

export interface PiiDetection {
  hasPII: boolean;
  detectedTypes: string[];
  recommendations: string[];
}

export interface GeneratedCV {
  html: string;
  htmlUrl?: string;
  pdfUrl: string;
  docxUrl: string;
  template?: string;
  features?: string[];
}

// ============================================================================
// CORE JOB INTERFACE
// ============================================================================

export interface Job {
  id: string;
  userId: string;
  status: JobStatus;
  fileUrl?: string;
  mimeType?: string;
  isUrl?: boolean;
  userInstructions?: string;
  parsedData?: any; // This will be typed more specifically in domain-specific extensions
  generatedCV?: GeneratedCV;
  piiDetection?: PiiDetection;
  privacyVersion?: number;
  quickCreate?: boolean;
  quickCreateReady?: boolean;
  settings?: JobSettings;
  selectedTemplate?: string;
  selectedFeatures?: string[];
  error?: string;
  createdAt: any; // Firebase Timestamp - keeping as any for compatibility
  updatedAt: any; // Firebase Timestamp - keeping as any for compatibility
}

// ============================================================================
// JOB OPERATION RESULT TYPES
// ============================================================================

export interface JobOperationResult<T = Job> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface JobCreateRequest {
  fileUrl?: string;
  mimeType?: string;
  isUrl?: boolean;
  userInstructions?: string;
  settings?: Partial<JobSettings>;
  selectedTemplate?: string;
  selectedFeatures?: string[];
}

export interface JobUpdateRequest {
  status?: JobStatus;
  parsedData?: any;
  generatedCV?: GeneratedCV;
  piiDetection?: PiiDetection;
  error?: string;
  settings?: Partial<JobSettings>;
  selectedTemplate?: string;
  selectedFeatures?: string[];
}

// ============================================================================
// JOB QUERY TYPES
// ============================================================================

export interface JobQuery {
  userId?: string;
  status?: JobStatus | JobStatus[];
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}