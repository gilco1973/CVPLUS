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

// All enhanced model interfaces are now imported from modular files
// This provides a clean main interface while maintaining type safety