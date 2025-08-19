// CVPlus Feature Component Types
// Standardized interface for all CV enhancement features
// Based on the React Component Conversion Plan

import { ReactNode } from 'react';

// Standardized CV Feature Props Interface
export interface CVFeatureProps {
  jobId: string;
  profileId: string;
  isEnabled?: boolean;
  data?: any;
  customization?: FeatureCustomization;
  onUpdate?: (data: any) => void;
  onError?: (error: Error) => void;
  className?: string;
  mode?: 'public' | 'private' | 'preview';
}

export interface FeatureCustomization {
  theme?: 'light' | 'dark' | 'auto';
  colors?: ThemeColors;
  layout?: LayoutOptions;
  animations?: boolean;
  [key: string]: any;
}

export interface ThemeColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
}

export interface LayoutOptions {
  size?: 'small' | 'medium' | 'large';
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'compact' | 'normal' | 'relaxed';
}

// Component Registry Types
export interface ComponentRegistry {
  [componentName: string]: React.ComponentType<CVFeatureProps>;
}

// Feature Result Types
export interface FeatureResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    processingTime?: number;
    version?: string;
    [key: string]: any;
  };
}

// Specific Feature Data Interfaces
export interface QRCodeData {
  url: string;
  profileUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
}

export interface TimelineData {
  experiences: Experience[];
  education: Education[];
  milestones: Milestone[];
}

export interface Experience {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  description: string;
  achievements: string[];
  location?: string;
  logo?: string;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  graduationDate: string;
  gpa?: string;
  description?: string;
  logo?: string;
}

export interface Milestone {
  date: string;
  title: string;
  description: string;
  type: 'achievement' | 'education' | 'career' | 'certification';
  icon?: string;
}

export interface SocialLinksData {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  twitter?: string;
  medium?: string;
  youtube?: string;
}

export interface PodcastData {
  audioUrl?: string;
  transcript?: string;
  duration?: number;
  title?: string;
  description?: string;
  generationStatus?: 'pending' | 'generating' | 'completed' | 'failed';
}

export interface ATSData {
  score: number;
  keywords: string[];
  suggestions: string[];
  compatibilityReport: ATSReport;
}

export interface ATSReport {
  overallScore: number;
  keywordDensity: number;
  formatScore: number;
  sectionScore: number;
  recommendations: string[];
}

export interface SkillsData {
  skills: Skill[];
  categories: SkillCategory[];
  proficiencyLevels: ProficiencyLevel[];
  industryComparison?: ComparisonData;
}

export interface Skill {
  name: string;
  level: number;
  category: string;
  yearsOfExperience?: number;
  endorsements?: number;
}

export interface SkillCategory {
  name: string;
  skills: string[];
  color?: string;
}

export interface ProficiencyLevel {
  skill: string;
  level: number;
  confidence: number;
  justification?: string;
}

export interface ComparisonData {
  industry: string;
  averageLevel: number;
  percentile: number;
}

// Hook Options
export interface FeatureOptions {
  jobId: string;
  featureName: string;
  initialData?: any;
  params?: Record<string, any>;
}

// Component Loading States
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface FeatureState<T = any> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastUpdated?: Date;
}