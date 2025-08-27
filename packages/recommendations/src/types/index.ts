/**
 * @cvplus/recommendations - Core Types
 * 
 * Comprehensive type definitions for the recommendations system module.
 * Includes performance monitoring, caching, and AI integration types.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import type { CVData, User, ApiResponse } from '@cvplus/core';

// ============================================================================
// CORE RECOMMENDATION TYPES
// ============================================================================

export interface Recommendation {
  id: string;
  type: RecommendationType;
  category: RecommendationCategory;
  section: CVSection;
  actionRequired: ActionType;
  title: string;
  description: string;
  suggestedContent?: string;
  currentContent?: string;
  customizedContent?: string;
  impact: ImpactLevel;
  priority: number;
  estimatedScoreImprovement: number;
  isSelected?: boolean;
  isCustomized?: boolean;
  placeholders?: Placeholder[];
  metadata?: RecommendationMetadata;
}

export enum RecommendationType {
  CONTENT = 'content',
  STRUCTURE = 'structure',
  KEYWORD_OPTIMIZATION = 'keyword_optimization',
  SECTION_ADDITION = 'section_addition',
  FORMATTING = 'formatting',
  ATS_OPTIMIZATION = 'ats_optimization'
}

export enum RecommendationCategory {
  PROFESSIONAL_SUMMARY = 'professional_summary',
  EXPERIENCE = 'experience',
  SKILLS = 'skills',
  ACHIEVEMENTS = 'achievements',
  EDUCATION = 'education',
  ATS_OPTIMIZATION = 'ats_optimization',
  GENERAL = 'general'
}

export enum CVSection {
  PERSONAL_INFO = 'personal_info',
  PROFESSIONAL_SUMMARY = 'professional_summary',
  EXPERIENCE = 'experience',
  SKILLS = 'skills',
  EDUCATION = 'education',
  ACHIEVEMENTS = 'achievements',
  CERTIFICATIONS = 'certifications',
  PROJECTS = 'projects',
  LANGUAGES = 'languages',
  REFERENCES = 'references'
}

export enum ActionType {
  ADD = 'add',
  MODIFY = 'modify',
  REMOVE = 'remove',
  REFORMAT = 'reformat',
  REORGANIZE = 'reorganize'
}

export enum ImpactLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface Placeholder {
  id: string;
  name: string;
  type: PlaceholderType;
  description: string;
  required: boolean;
  defaultValue?: string;
  options?: string[];
  validation?: string;
}

export enum PlaceholderType {
  TEXT = 'text',
  NUMBER = 'number',
  DROPDOWN = 'dropdown',
  MULTILINE = 'multiline',
  DATE = 'date'
}

export interface RecommendationMetadata {
  generatedAt: Date;
  aiModel: string;
  confidence: number;
  processingTime: number;
  cacheHit: boolean;
  version: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface GetRecommendationsParams {
  jobId: string;
  targetRole?: string;
  industryKeywords?: string[];
  forceRegenerate?: boolean;
  userId?: string;
}

export interface GetRecommendationsResponse extends ApiResponse<{
  recommendations: Recommendation[];
  cached: boolean;
  generatedAt: string;
  processingTime: number;
  cacheAge?: number;
}> {}

export interface ApplyImprovementsParams {
  jobId: string;
  selectedRecommendationIds: string[];
  targetRole?: string;
  industryKeywords?: string[];
  userId?: string;
}

export interface ApplyImprovementsResponse extends ApiResponse<{
  jobId: string;
  improvedCV: CVData;
  appliedRecommendations: Recommendation[];
  transformationSummary: TransformationSummary;
  comparisonReport: ComparisonReport;
  improvementsApplied: boolean;
  message: string;
}> {}

export interface PreviewImprovementParams {
  jobId: string;
  recommendationId: string;
  userId?: string;
}

export interface PreviewImprovementResponse extends ApiResponse<{
  recommendation: Recommendation;
  beforeContent: string;
  afterContent: string;
  previewCV: CVData;
  estimatedImpact: number;
}> {}

export interface TransformationSummary {
  totalRecommendations: number;
  appliedRecommendations: number;
  estimatedScoreImprovement: number;
  sectionsModified: string[];
  processingTime: number;
  aiPrompts: number;
}

export interface ComparisonReport {
  beforeScore: number;
  afterScore: number;
  improvement: number;
  changedSections: ChangedSection[];
  keywordMatches: {
    before: number;
    after: number;
    improvement: number;
  };
}

export interface ChangedSection {
  section: CVSection;
  changeType: ActionType;
  beforeLength: number;
  afterLength: number;
  keywordCount: number;
}

// ============================================================================
// PERFORMANCE & MONITORING TYPES
// ============================================================================

export interface PerformanceMetrics {
  requestDuration: number;
  cacheHitRate: number;
  errorRate: number;
  timeoutRate: number;
  throughput: number;
  aiApiLatency: number;
  queueDepth: number;
  memoryUsage: number;
  timestamp: Date;
}

export interface PerformanceThresholds {
  maxRequestDuration: number;
  minCacheHitRate: number;
  maxErrorRate: number;
  maxTimeoutRate: number;
  minThroughput: number;
  maxAiApiLatency: number;
}

export interface CacheStats {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  cacheSize: number;
  evictions: number;
  memoryUsage: number;
  averageAge: number;
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
  size: number;
}

export interface CacheConfiguration {
  memory: {
    maxSize: number;
    ttl: number;
    evictionPolicy: 'LRU' | 'LFU' | 'FIFO';
  };
  redis?: {
    ttl: number;
    keyPrefix: string;
    maxMemory: string;
  };
  firestore?: {
    collection: string;
    ttl: number;
    indexFields: string[];
  };
}

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

export enum RecommendationErrorType {
  TIMEOUT = 'timeout',
  AI_API_ERROR = 'ai_api_error',
  VALIDATION_ERROR = 'validation_error',
  NETWORK_ERROR = 'network_error',
  CACHE_ERROR = 'cache_error',
  RATE_LIMIT = 'rate_limit',
  UNKNOWN = 'unknown'
}

export interface RecommendationError extends Error {
  type: RecommendationErrorType;
  retryable: boolean;
  context: Record<string, unknown>;
  timestamp: Date;
  requestId?: string;
}

export interface RetryConfiguration {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: RecommendationErrorType[];
  circuitBreaker?: {
    threshold: number;
    timeout: number;
    resetTimeout: number;
  };
}

export interface ErrorRecoveryStrategy {
  fallbackToCache: boolean;
  fallbackToGeneric: boolean;
  userNotification: boolean;
  logError: boolean;
  retryCount: number;
  exponentialBackoff: boolean;
}

// ============================================================================
// AI INTEGRATION TYPES
// ============================================================================

export interface AIRequestParams {
  cvData: CVData;
  targetRole?: string;
  industryKeywords?: string[];
  promptTemplate: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  tokensUsed: number;
  processingTime: number;
  confidence: number;
  finishReason: string;
}

export interface AIPromptTemplate {
  id: string;
  name: string;
  template: string;
  version: string;
  variables: string[];
  maxTokens: number;
  temperature: number;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  tokenLimitPerMinute: number;
  tokenLimitPerHour: number;
}

// ============================================================================
// HOOK & CONTEXT TYPES
// ============================================================================

export interface UseRecommendationsState {
  recommendations: Recommendation[];
  isLoading: boolean;
  error: RecommendationError | null;
  performance: PerformanceMetrics;
  cacheStats: CacheStats;
  loadingProgress: number;
}

export interface UseRecommendationsActions {
  loadRecommendations: (params: GetRecommendationsParams) => Promise<void>;
  applyRecommendations: (params: ApplyImprovementsParams) => Promise<ApplyImprovementsResponse>;
  previewRecommendation: (params: PreviewImprovementParams) => Promise<PreviewImprovementResponse>;
  retryFailedRequest: () => Promise<void>;
  refreshCache: () => Promise<void>;
  clearCache: () => Promise<void>;
  resetError: () => void;
}

export interface RecommendationsContextValue {
  state: UseRecommendationsState;
  actions: UseRecommendationsActions;
}

// ============================================================================
// ENGINE & SERVICE TYPES
// ============================================================================

export interface CVAnalysisResult {
  overallScore: number;
  sectionScores: Record<CVSection, number>;
  strengths: string[];
  weaknesses: string[];
  missingElements: string[];
  atsCompatibility: number;
  recommendations: Recommendation[];
  processingTime: number;
}

export interface RoleMatchingResult {
  score: number;
  matchingFactors: MatchingFactor[];
  gapAnalysis: GapAnalysis;
  roleSpecificRecommendations: Recommendation[];
}

export interface MatchingFactor {
  type: 'skills' | 'experience' | 'title' | 'keywords';
  score: number;
  details: string[];
  importance: number;
}

export interface GapAnalysis {
  missingSkills: string[];
  weakAreas: string[];
  strengthAreas: string[];
  prioritizedImprovements: string[];
}

export interface ScoringWeights {
  professionalSummary: number;
  experience: number;
  skills: number;
  achievements: number;
  education: number;
  atsCompatibility: number;
  roleAlignment: number;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface RecommendationsConfig {
  performance: PerformanceThresholds;
  cache: CacheConfiguration;
  retry: RetryConfiguration;
  ai: {
    provider: 'anthropic' | 'openai';
    model: string;
    apiKey: string;
    rateLimit: RateLimitConfig;
    prompts: AIPromptTemplate[];
  };
  scoring: ScoringWeights;
  features: {
    enableCaching: boolean;
    enableRetry: boolean;
    enablePerformanceMonitoring: boolean;
    enableRoleMatching: boolean;
    enablePreview: boolean;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type RequestStatus = 'idle' | 'loading' | 'success' | 'error' | 'timeout';

export interface LoadOptions {
  useCache?: boolean;
  timeout?: number;
  retryCount?: number;
  priority?: 'low' | 'normal' | 'high';
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProcessingProgress {
  stage: string;
  progress: number;
  message: string;
  eta?: number;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface RecommendationEvent {
  type: 'loading' | 'success' | 'error' | 'cache_hit' | 'cache_miss';
  jobId: string;
  timestamp: Date;
  data?: unknown;
  error?: RecommendationError;
  performance?: Partial<PerformanceMetrics>;
}

export type RecommendationEventHandler = (event: RecommendationEvent) => void;