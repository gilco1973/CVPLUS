import type { Job } from '../services/cvService';

export interface CVPreviewProps {
  job: Job;
  selectedTemplate: string;
  selectedFeatures: Record<string, boolean>;
  appliedImprovements?: any; // LLM-improved content from analysis step
  onUpdate?: (updates: Partial<Job['parsedData']>) => void;
  onFeatureToggle?: (feature: string, enabled: boolean) => void;
  className?: string;
}

export interface CVPreviewState {
  isEditing: boolean;
  showFeaturePreviews: boolean;
  editingSection: string | null;
  isEditingQRCode: boolean;
  showPreviewBanner: boolean;
  showPlaceholderBanner: boolean;
  previewData: any;
  hasUnsavedChanges: boolean;
  autoSaveEnabled: boolean;
  lastSaved: Date | null;
  collapsedSections: Record<string, boolean>;
}

export interface QRCodeSettings {
  url: string;
  type: 'profile' | 'linkedin' | 'portfolio' | 'contact' | 'custom';
  customText: string;
}

export interface AchievementAnalysis {
  keyAchievements: Array<{
    title: string;
    category: string;
    impact: string;
  }>;
  loading: boolean;
  error: string | null;
}

export interface FeaturePreviewData {
  [key: string]: any;
  languages?: Array<{ name: string; level: string }>;
  certifications?: Array<{ name: string; issuer: string; year: string; verified: boolean }>;
  socialLinks?: Record<string, string>;
  keyAchievements?: Array<{ title: string; category: string; impact: string }>;
}

export interface SectionData {
  personalInfo?: any;
  summary?: string;
  experience?: any[];
  education?: any[];
  skills?: any;
}

export interface EditableSectionProps {
  section: string;
  data: any;
  onEdit: (section: string, newValue: any) => void;
  isEditing: boolean;
  className?: string;
}

export interface FeaturePreviewProps {
  featureId: string;
  isEnabled: boolean;
  isCollapsed: boolean;
  onToggleCollapse: (sectionId: string) => void;
  mockData: FeaturePreviewData;
  showPreviews: boolean;
}

export interface CVPreviewToolbarProps {
  isEditing: boolean;
  showFeaturePreviews: boolean;
  autoSaveEnabled: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  selectedTemplate: string;
  showPreviewBanner: boolean;
  appliedImprovements: any;
  onToggleEditing: () => void;
  onToggleFeaturePreviews: () => void;
  onToggleAutoSave: () => void;
  onExpandAllSections: () => void;
  onCollapseAllSections: () => void;
  onCloseBanner: () => void;
}

export interface CVPreviewContentProps {
  previewData: any;
  selectedTemplate: string;
  selectedFeatures: Record<string, boolean>;
  showFeaturePreviews: boolean;
  collapsedSections: Record<string, boolean>;
  qrCodeSettings: QRCodeSettings;
  isEditing: boolean;
  editingSection: string | null;
  achievementAnalysis: AchievementAnalysis | null;
  showPlaceholderBanner: boolean;
  onSectionEdit: (section: string, newValue: any) => void;
  onToggleSection: (sectionId: string) => void;
  onEditQRCode: () => void;
  onAnalyzeAchievements: () => void;
  onStartEditing?: () => void;
  onDismissPlaceholderBanner?: () => void;
}

export interface MockDataGenerator {
  generateMockData(featureId: string, realData?: any): FeaturePreviewData;
}

export interface TemplateGenerator {
  generateHTML(
    data: any, 
    template: string, 
    features: Record<string, boolean>, 
    settings: { 
      qrCode: QRCodeSettings; 
      showPreviews: boolean; 
      collapsedSections: Record<string, boolean> 
    }
  ): string;
}

// CV Comparison Types
export type ComparisonViewMode = 'single' | 'comparison';

export interface CVComparisonData {
  originalData: any;
  improvedData: any;
  hasComparison: boolean;
  comparisonResult?: any;
}

export interface ComparisonStats {
  totalSections: number;
  modifiedSections: number;
  newSections: number;
  enhancedSections: number;
  improvementPercentage: number;
}