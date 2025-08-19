// Session Management Types for CVPlus Platform
// This file defines interfaces for comprehensive save-and-resume functionality

export interface SessionFormData {
  // File upload data
  selectedFile?: File | null;
  fileUrl?: string;
  userInstructions?: string;
  
  // Template and feature selections
  selectedTemplateId?: string;
  selectedFeatures?: string[];
  
  // Analysis data
  targetRole?: string;
  industryKeywords?: string[];
  jobDescription?: string;
  
  // User preferences
  quickCreate?: boolean;
  settings?: {
    applyAllEnhancements?: boolean;
    generateAllFormats?: boolean;
    enablePIIProtection?: boolean;
    createPodcast?: boolean;
    useRecommendedTemplate?: boolean;
  };
  
  // Form field data from various pages
  personalInfo?: Record<string, unknown>;
  workExperience?: Record<string, unknown>;
  education?: Record<string, unknown>;
  skills?: Record<string, unknown>;
  
  // Additional context data
  customizations?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface SessionState {
  // Session identification
  sessionId: string;
  userId?: string;
  jobId?: string;
  
  // Navigation state
  currentStep: CVStep;
  completedSteps: CVStep[];
  totalSteps?: number;
  
  // Progress tracking
  progressPercentage: number;
  lastActiveAt: Date;
  createdAt: Date;
  
  // Form and selection data
  formData: SessionFormData;
  
  // Processing state
  status: SessionStatus;
  processingStage?: string;
  
  // Error handling
  lastError?: string;
  retryCount?: number;
  
  // Resume metadata
  canResume: boolean;
  resumeUrl?: string;
  
  // Storage flags
  isLocalOnly?: boolean;
  isSynced?: boolean;
  lastSyncAt?: Date;
}

export type CVStep = 
  | 'upload'
  | 'processing' 
  | 'analysis'
  | 'features'
  | 'templates'
  | 'preview'
  | 'results'
  | 'keywords'
  | 'completed';

export type SessionStatus = 
  | 'draft'
  | 'in_progress' 
  | 'processing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'expired';

export interface SessionStorageConfig {
  // Storage preferences
  enableLocalStorage: boolean;
  enableFirestoreSync: boolean;
  
  // Retention settings
  localStorageRetentionDays: number;
  firestoreRetentionDays: number;
  
  // Sync settings
  autoSyncInterval?: number; // milliseconds
  syncOnNetworkReconnect: boolean;
  
  // Compression settings
  compressData: boolean;
  compressionThreshold: number; // bytes
}

export interface ResumeSessionOptions {
  // Resume behavior
  navigateToStep: boolean;
  restoreFormData: boolean;
  showConfirmationDialog: boolean;
  
  // Data handling
  mergeWithCurrentState: boolean;
  clearOldSession: boolean;
  
  // UI preferences
  showProgressIndicator: boolean;
  animateTransitions: boolean;
}

export interface SessionMetrics {
  // Usage statistics
  totalSessions: number;
  completedSessions: number;
  resumedSessions: number;
  
  // Time metrics
  averageSessionDuration: number;
  averageStepsCompleted: number;
  
  // Performance metrics
  syncSuccessRate: number;
  errorRate: number;
  
  // User behavior
  mostCommonExitStep: CVStep;
  mostResumedStep: CVStep;
}

export interface SessionSearchCriteria {
  userId?: string;
  status?: SessionStatus[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  steps?: CVStep[];
  hasJobId?: boolean;
  canResume?: boolean;
  limit?: number;
  orderBy?: 'createdAt' | 'lastActiveAt' | 'progressPercentage';
  orderDirection?: 'asc' | 'desc';
}

// Event types for session management
export type SessionEvent = 
  | { type: 'SESSION_CREATED'; payload: { sessionId: string } }
  | { type: 'SESSION_UPDATED'; payload: { sessionId: string; changes: Partial<SessionState> } }
  | { type: 'SESSION_RESUMED'; payload: { sessionId: string; fromStep: CVStep } }
  | { type: 'SESSION_PAUSED'; payload: { sessionId: string; atStep: CVStep } }
  | { type: 'SESSION_COMPLETED'; payload: { sessionId: string; jobId: string } }
  | { type: 'SESSION_FAILED'; payload: { sessionId: string; error: string } }
  | { type: 'SESSION_SYNCED'; payload: { sessionId: string; syncedAt: Date } }
  | { type: 'SESSION_EXPIRED'; payload: { sessionId: string; expiredAt: Date } };

// Error types for session operations
export class SessionError extends Error {
  public code: SessionErrorCode;
  public sessionId?: string;
  public retryable: boolean;

  constructor(
    message: string,
    code: SessionErrorCode,
    sessionId?: string,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'SessionError';
    this.code = code;
    this.sessionId = sessionId;
    this.retryable = retryable;
  }
}

export type SessionErrorCode = 
  | 'SESSION_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'SESSION_CORRUPTED'
  | 'STORAGE_UNAVAILABLE'
  | 'SYNC_FAILED'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR';