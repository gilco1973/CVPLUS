/**
 * CV Transformation Types - Extracted from monolithic service
 */

export interface CVRecommendation {
  id: string;
  type: 'content' | 'structural' | 'keyword' | 'formatting' | 'section';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  before?: string;
  after?: string;
  impact: 'minor' | 'moderate' | 'major';
  category: string;
  metadata?: Record<string, any>;
}

export interface CVTransformationResult {
  recommendations: CVRecommendation[];
  improvedCV: any;
  summary: {
    totalRecommendations: number;
    appliedCount: number;
    improvementScore: number;
    categories: string[];
  };
  metadata: {
    processingTime: number;
    tokensUsed?: number;
    model?: string;
    timestamp: string;
  };
}

export interface TransformationContext {
  userId: string;
  jobDescription?: string;
  preferences?: {
    style: string;
    emphasis: string[];
    targetRole: string;
  };
  constraints?: {
    maxLength?: number;
    requiredSections?: string[];
    forbidden?: string[];
  };
}