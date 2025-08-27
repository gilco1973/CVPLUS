import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { Job } from '../services/cvService';
import type { MagicTransformProgress, MagicTransformResult } from '../services/features/MagicTransformService';
import type { ApplyImprovementsResponse } from '../types/responses';

// Types
export interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  impact: string;
  estimatedImprovement: number;
  selected: boolean;
}

export interface ATSAnalysis {
  currentScore: number;
  predictedScore: number;
  issues: Array<{
    message: string;
    severity: 'error' | 'warning';
    category: string;
  }>;
  suggestions: Array<{
    reason: string;
    impact: string;
    category: string;
  }>;
  overall: number;
  passes: boolean;
}

export interface CVAnalysisState {
  // Core data
  job: Job;
  roleContext?: any;
  recommendations: RecommendationItem[];
  selectedRecommendations: string[];
  atsAnalysis: ATSAnalysis | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  showComparison: boolean;
  expandedCategories: Set<string>;
  
  // Progress tracking
  isApplying: boolean;
  isMagicTransforming: boolean;
  magicTransformProgress: MagicTransformProgress | null;
  progressSteps: Array<{ step: string; status: 'pending' | 'active' | 'complete' | 'error' }>;
  
  // Results data
  originalCVData: any;
  improvedCVData: any;
  comparisonReport: any;
  magicTransformResult: MagicTransformResult | null;
  
  // Callbacks
  onContinue: (selectedRecommendations: string[]) => void;
  onBack?: () => void;
}

// Actions
export type CVAnalysisAction =
  | { type: 'SET_RECOMMENDATIONS'; payload: RecommendationItem[] }
  | { type: 'TOGGLE_RECOMMENDATION'; payload: string }
  | { type: 'SELECT_ALL_HIGH_PRIORITY' }
  | { type: 'CLEAR_SELECTIONS' }
  | { type: 'SET_ATS_ANALYSIS'; payload: ATSAnalysis }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'TOGGLE_COMPARISON'; payload?: boolean }
  | { type: 'TOGGLE_CATEGORY'; payload: string }
  | { type: 'START_APPLYING' }
  | { type: 'STOP_APPLYING' }
  | { type: 'START_MAGIC_TRANSFORM' }
  | { type: 'STOP_MAGIC_TRANSFORM' }
  | { type: 'UPDATE_MAGIC_PROGRESS'; payload: MagicTransformProgress }
  | { type: 'UPDATE_PROGRESS_STEPS'; payload: Array<{ step: string; status: 'pending' | 'active' | 'complete' | 'error' }> }
  | { type: 'SET_ORIGINAL_CV_DATA'; payload: any }
  | { type: 'SET_IMPROVED_CV_DATA'; payload: any }
  | { type: 'SET_COMPARISON_REPORT'; payload: any }
  | { type: 'SET_MAGIC_TRANSFORM_RESULT'; payload: MagicTransformResult };

// Reducer
export function cvAnalysisReducer(state: CVAnalysisState, action: CVAnalysisAction): CVAnalysisState {
  switch (action.type) {
    case 'SET_RECOMMENDATIONS':
      return { ...state, recommendations: action.payload, isLoading: false };
    
    case 'TOGGLE_RECOMMENDATION': {
      const recommendationId = action.payload;
      const isCurrentlySelected = state.selectedRecommendations.includes(recommendationId);
      const newSelectedRecommendations = isCurrentlySelected
        ? state.selectedRecommendations.filter(id => id !== recommendationId)
        : [...state.selectedRecommendations, recommendationId];
      
      // Update the recommendation's selected state
      const updatedRecommendations = state.recommendations.map(rec =>
        rec.id === recommendationId ? { ...rec, selected: !isCurrentlySelected } : rec
      );
      
      return {
        ...state,
        selectedRecommendations: newSelectedRecommendations,
        recommendations: updatedRecommendations
      };
    }
    
    case 'SELECT_ALL_HIGH_PRIORITY': {
      const highPriorityRecs = state.recommendations.filter(rec => rec.priority === 'high');
      const highPriorityIds = highPriorityRecs.map(rec => rec.id);
      const updatedRecommendations = state.recommendations.map(rec => ({
        ...rec,
        selected: rec.priority === 'high' || state.selectedRecommendations.includes(rec.id)
      }));
      
      return {
        ...state,
        selectedRecommendations: Array.from(new Set([...state.selectedRecommendations, ...highPriorityIds])),
        recommendations: updatedRecommendations
      };
    }
    
    case 'CLEAR_SELECTIONS': {
      const updatedRecommendations = state.recommendations.map(rec => ({
        ...rec,
        selected: false
      }));
      
      return {
        ...state,
        selectedRecommendations: [],
        recommendations: updatedRecommendations
      };
    }
    
    case 'SET_ATS_ANALYSIS':
      return { ...state, atsAnalysis: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'TOGGLE_COMPARISON':
      return { ...state, showComparison: action.payload ?? !state.showComparison };
    
    case 'TOGGLE_CATEGORY': {
      const category = action.payload;
      const newExpandedCategories = new Set(state.expandedCategories);
      
      if (newExpandedCategories.has(category)) {
        newExpandedCategories.delete(category);
      } else {
        newExpandedCategories.add(category);
      }
      
      return { ...state, expandedCategories: newExpandedCategories };
    }
    
    case 'START_APPLYING':
      return { ...state, isApplying: true, error: null };
    
    case 'STOP_APPLYING':
      return { ...state, isApplying: false };
    
    case 'START_MAGIC_TRANSFORM':
      return { 
        ...state, 
        isMagicTransforming: true, 
        error: null,
        magicTransformProgress: { progress: 0, step: 'Starting Magic Transform...', isComplete: false }
      };
    
    case 'STOP_MAGIC_TRANSFORM':
      return { 
        ...state, 
        isMagicTransforming: false,
        magicTransformProgress: null
      };
    
    case 'UPDATE_MAGIC_PROGRESS':
      return { ...state, magicTransformProgress: action.payload };
    
    case 'UPDATE_PROGRESS_STEPS':
      return { ...state, progressSteps: action.payload };
    
    case 'SET_ORIGINAL_CV_DATA':
      return { ...state, originalCVData: action.payload };
    
    case 'SET_IMPROVED_CV_DATA':
      return { ...state, improvedCVData: action.payload };
    
    case 'SET_COMPARISON_REPORT':
      return { ...state, comparisonReport: action.payload };
    
    case 'SET_MAGIC_TRANSFORM_RESULT':
      return { ...state, magicTransformResult: action.payload };
    
    default:
      return state;
  }
}

// Initial state factory
export function createInitialState(
  job: Job, 
  roleContext: any, 
  onContinue: (selectedRecommendations: string[]) => void,
  onBack?: () => void
): CVAnalysisState {
  return {
    job,
    roleContext,
    recommendations: [],
    selectedRecommendations: [],
    atsAnalysis: null,
    isLoading: true,
    error: null,
    showComparison: false,
    expandedCategories: new Set(),
    isApplying: false,
    isMagicTransforming: false,
    magicTransformProgress: null,
    progressSteps: [],
    originalCVData: job.parsedData || null,  // Initialize with job's parsed data if available
    improvedCVData: null,
    comparisonReport: null,
    magicTransformResult: null,
    onContinue,
    onBack
  };
}

// Context
export const CVAnalysisContext = createContext<{
  state: CVAnalysisState;
  dispatch: React.Dispatch<CVAnalysisAction>;
} | undefined>(undefined);

// Provider
export interface CVAnalysisProviderProps {
  children: ReactNode;
  job: Job;
  roleContext?: any;
  onContinue: (selectedRecommendations: string[]) => void;
  onBack?: () => void;
}

export function CVAnalysisProvider({ 
  children, 
  job, 
  roleContext, 
  onContinue, 
  onBack 
}: CVAnalysisProviderProps) {
  const [state, dispatch] = useReducer(
    cvAnalysisReducer, 
    createInitialState(job, roleContext, onContinue, onBack)
  );

  return (
    <CVAnalysisContext.Provider value={{ state, dispatch }}>
      {children}
    </CVAnalysisContext.Provider>
  );
}

// Hook for consuming context
export function useCVAnalysisContext() {
  const context = useContext(CVAnalysisContext);
  if (context === undefined) {
    throw new Error('useCVAnalysisContext must be used within a CVAnalysisProvider');
  }
  return context;
}