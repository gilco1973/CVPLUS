/**
 * Language Proficiency Types
 * Extracted from LanguageProficiency.tsx for better modularity
 */

export interface LanguageProficiency {
  language: string;
  level: 'Native' | 'Fluent' | 'Professional' | 'Conversational' | 'Basic';
  score: number;
  certifications?: string[];
  yearsOfExperience?: number;
  contexts?: string[];
  verified?: boolean;
  flag?: string;
}

export interface LanguageVisualization {
  proficiencies: LanguageProficiency[];
  visualizations: {
    type: 'circular' | 'bar' | 'radar' | 'flags' | 'matrix';
    data: any;
    config: {
      primaryColor: string;
      accentColor: string;
      showCertifications: boolean;
      showFlags: boolean;
      animateOnLoad: boolean;
    };
  }[];
  insights: {
    totalLanguages: number;
    fluentLanguages: number;
    businessReady: string[];
    certifiedLanguages: string[];
    recommendations: string[];
  };
  metadata: {
    extractedFrom: string[];
    confidence: number;
    lastUpdated: Date;
  };
}

export interface LanguageProficiencyProps {
  visualization?: LanguageVisualization;
  onGenerateVisualization: () => Promise<LanguageVisualization>;
  onAddLanguage: (language: Partial<LanguageProficiency>) => Promise<void>;
}

export type LanguageLevel = LanguageProficiency['level'];
export type VisualizationType = LanguageVisualization['visualizations'][0]['type'];