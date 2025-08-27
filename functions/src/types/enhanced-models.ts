/**
 * Enhanced Data Models - Main Interface
 * 
 * Core enhanced models with imports from modular files.
 * Refactored to maintain <200 line compliance.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// Core types
import type { ParsedCV } from './job';
export type { ParsedCV } from './job';

// Import and re-export modular types
export type {
  EnhancedJob,
  PortfolioImage,
  CalendarSettings,
  Testimonial,
  PersonalityProfile,
  PrivacySettings,
  SkillsVisualization,
  SkillCategory,
  LanguageSkill,
  Certification
} from './enhanced-job';

export type {
  FlexibleSkillsFormat
} from './enhanced-skills';

export type {
  PublicCVProfile,
  PublicProfileAnalytics,
  FeatureAnalytics,
  FeatureInteraction,
  ContactFormSubmission,
  QRCodeScan
} from './enhanced-analytics';

export type {
  UserRAGProfile,
  CVChunk,
  ChatSession,
  ChatMessage
} from './enhanced-rag';

export type {
  AdvancedATSScore,
  PrioritizedRecommendation,
  CompetitorAnalysis,
  SemanticKeywordAnalysis,
  KeywordMatch,
  ATSSystemSimulation,
  ATSOptimizationResult,
  ATSIssue,
  ATSSuggestion
} from './enhanced-ats';

// Additional types for session checkpoint system
export type CVStep = 'upload' | 'processing' | 'analysis' | 'features' | 'templates' | 'generation' | 'finalization' | 'preview';

export interface EnhancedSessionState {
  sessionId: string;
  userId: string;
  createdAt: Date;
  lastUpdatedAt: Date;
  processingCheckpoints: ProcessingCheckpoint[];
  stepProgress: Record<CVStep, {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    substeps: Record<string, boolean>;
  }>;
  featureStates: Record<string, {
    enabled: boolean;
    configuration: Record<string, unknown>;
  }>;
  actionQueue?: QueuedAction[];
  sessionHistory?: {
    events: Array<{
      timestamp: Date;
      event: string;
      details?: Record<string, unknown>;
    }>;
    totalProcessingTime: number;
    completedSteps: CVStep[];
  };
}

export interface ProcessingCheckpoint {
  id: string;
  sessionId: string;
  stepId: CVStep;
  functionName: string;
  parameters: Record<string, unknown>;
  state: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying' | 'in_progress';
  result?: unknown;
  error?: string;
  createdAt: Date;
  lastAttemptAt?: Date;
  completedAt?: Date;
  executionTime?: number;
  estimatedDuration?: number;
  priority: 'low' | 'normal' | 'high';
  dependencies: string[];
  featureId?: string;
  retryCount: number;
  maxRetries: number;
}

export interface QueuedAction {
  id: string;
  sessionId: string;
  type: 'session_update' | 'form_save' | 'feature_toggle' | 'api_call' | 'file_operation';
  payload: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high';
  requiresNetwork: boolean;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledAt?: Date;
}

// All enhanced model interfaces are now imported from modular files
// This provides a clean main interface while maintaining type safety