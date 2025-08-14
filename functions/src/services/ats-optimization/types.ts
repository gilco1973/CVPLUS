/**
 * Types for ATS Optimization Services
 */

import { 
  ParsedCV, 
  ATSOptimizationResult, 
  AdvancedATSScore, 
  SemanticKeywordAnalysis, 
  ATSSystemSimulation,
  PrioritizedRecommendation,
  CompetitorAnalysis 
} from '../types/enhanced-models';

export interface ATSSystemConfig {
  parsingWeight: number;
  keywordWeight: number;
  formatWeight: number;
  contentWeight: number;
  preferredFormats: string[];
  keywordDensityRange: [number, number];
  commonIssues: string[];
}

export interface ATSSystemConfigs {
  [key: string]: ATSSystemConfig;
}

export interface KeywordAnalysisParams {
  parsedCV: ParsedCV;
  jobDescription?: string;
  targetKeywords?: string[];
  industry?: string;
}

export interface ScoringParams {
  parsedCV: ParsedCV;
  semanticAnalysis: SemanticKeywordAnalysis;
  systemSimulations: ATSSystemSimulation[];
  competitorBenchmark: CompetitorAnalysis;
}

export interface RecommendationParams {
  parsedCV: ParsedCV;
  advancedScore: AdvancedATSScore;
  semanticAnalysis: SemanticKeywordAnalysis;
  systemSimulations: ATSSystemSimulation[];
  competitorBenchmark: CompetitorAnalysis;
}

export interface VerificationParams {
  advancedScore: AdvancedATSScore;
  recommendations: PrioritizedRecommendation[];
  parsedCV: ParsedCV;
}

export interface OptimizationContext {
  targetRole?: string;
  targetKeywords?: string[];
  jobDescription?: string;
  industry?: string;
}