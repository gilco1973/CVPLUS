/**
 * Enhanced Models
 * Extended type definitions for advanced CV processing
  */

import { CVParsedData } from './index';

export interface ParsedCV extends CVParsedData {
  // Enhanced fields for AI processing
  aiMetadata?: {
    analysisVersion: string;
    processingTimestamp: Date;
    confidenceScore: number;
    suggestedImprovements: string[];
  };
  
  // Vector embeddings for similarity search
  embeddings?: {
    fullDocument: number[];
    sections: Record<string, number[]>;
  };
  
  // Enhanced analysis results
  analysis?: CVAnalysis;
}

export interface CVAnalysis {
  strengthsAndWeaknesses: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  
  skillsAnalysis: {
    technical: SkillAssessment[];
    soft: SkillAssessment[];
    missing: string[];
    overused: string[];
  };
  
  industryAlignment: {
    targetIndustry?: string;
    alignmentScore: number;
    recommendations: string[];
  };
  
  atsCompatibility: {
    score: number;
    issues: string[];
    recommendations: string[];
  };
}

export interface SkillAssessment {
  skill: string;
  level: 'mentioned' | 'basic' | 'intermediate' | 'advanced' | 'expert';
  evidence: string[];
  recommendations?: string[];
}

// Additional interfaces for compatibility
export interface EnhancedJob {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  company: string;
  location: string;
  userId?: string;
  parsedData?: ParsedCV;
  ragChat?: {
    enabled: boolean;
    sessionCount: number;
  };
}

export interface UserRAGProfile {
  id: string;
  preferences: Record<string, any>;
  history: string[];
  userId?: string;
  settings?: {
    maxMessageLength: number;
    enabledFeatures: string[];
  };
}

// Re-export common types for backward compatibility
export type { CVParsedData } from './index';