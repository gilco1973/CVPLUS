/**
 * Regional Localization Types
 */

import { ParsedCV } from '../../types/job';

export interface RegionalOptimizationRequest {
  userId: string;
  cvData: ParsedCV;
  targetRegion: string;
  targetCountry?: string;
  industry?: string;
  jobRole?: string;
}

export interface RegionalOptimizationResult {
  regionScore: number;
  culturalFit: 'excellent' | 'good' | 'fair' | 'needs_improvement';
  legalCompliance: {
    compliant: boolean;
    issues: ComplianceIssue[];
    recommendations: string[];
  };
  culturalOptimization: {
    formatAdjustments: FormatAdjustment[];
    contentAdjustments: ContentAdjustment[];
    languageOptimization: LanguageOptimization[];
  };
  marketInsights: {
    popularIndustries: string[];
    averageJobSearchDuration: number;
    networkingImportance: 'low' | 'medium' | 'high';
    remoteWorkAdoption: number;
    salaryExpectations: SalaryExpectations;
  };
  localizedRecommendations: LocalizedRecommendation[];
}

export interface ComplianceIssue {
  type: 'photo' | 'age' | 'gender' | 'marital_status' | 'personal_info';
  severity: 'error' | 'warning' | 'info';
  description: string;
  solution: string;
  countries: string[];
}

export interface FormatAdjustment {
  aspect: 'photo' | 'length' | 'color' | 'font' | 'date_format' | 'address_format';
  current: string;
  recommended: string;
  reason: string;
  importance: 'high' | 'medium' | 'low';
}

export interface ContentAdjustment {
  section: string;
  type: 'add' | 'remove' | 'modify' | 'reorder';
  description: string;
  culturalReason: string;
  impact: number; // 0-1
}

export interface LanguageOptimization {
  aspect: 'formality' | 'tone' | 'terminology' | 'structure';
  suggestion: string;
  examples: {
    before: string;
    after: string;
  }[];
}

export interface SalaryExpectations {
  expectationLevel: 'conservative' | 'market_rate' | 'aggressive';
  currencyPreference: string;
  negotiationCulture: 'avoid' | 'subtle' | 'direct';
  benefitsImportance: number; // 0-1
}

export interface LocalizedRecommendation {
  category: 'cultural' | 'legal' | 'market' | 'networking' | 'format';
  priority: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  actionItems: string[];
  culturalContext: string;
  impact: number; // 0-1
}