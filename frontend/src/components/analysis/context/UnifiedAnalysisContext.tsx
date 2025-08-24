/**
 * Unified Analysis Context
 * React context for managing unified analysis state across components
 */

import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import type {
  UnifiedAnalysisContextInterface,
  UnifiedAnalysisContextState,
  UnifiedAnalysisAction,
  AnalysisStep,
  AnalysisResults
} from './types';
import {
  unifiedAnalysisReducer,
  initialUnifiedAnalysisState,
  unifiedAnalysisActions
} from './actions';
import type { Job } from '../../../services/cvService';
import type { DetectedRole } from '../../../types/role-profiles';

// Create Context
const UnifiedAnalysisContext = createContext<UnifiedAnalysisContextInterface | undefined>(undefined);

// Context Provider Props
interface UnifiedAnalysisProviderProps {
  children: React.ReactNode;
  initialJobData?: Job | null;
  onNavigateToFeatures?: (data: any) => void;
}

// Context Provider Component
export const UnifiedAnalysisProvider: React.FC<UnifiedAnalysisProviderProps> = ({
  children,
  initialJobData = null,
  onNavigateToFeatures
}) => {
  const [state, dispatch] = useReducer(unifiedAnalysisReducer, {
    ...initialUnifiedAnalysisState,
    jobData: initialJobData
  });

  // Computed Properties
  const canProceedToRoleDetection = useMemo(() => {
    return state.analysisResults?.analysisComplete === true;
  }, [state.analysisResults]);

  const canProceedToImprovements = useMemo(() => {
    return state.selectedRole !== null;
  }, [state.selectedRole]);

  const canProceedToActions = useMemo(() => {
    return state.selectedRecommendations.length > 0;
  }, [state.selectedRecommendations]);

  const hasSelectedRecommendations = useMemo(() => {
    return state.selectedRecommendations.length > 0;
  }, [state.selectedRecommendations]);

  // Helper Methods
  const startRoleDetection = useCallback((jobData: Job) => {
    dispatch(unifiedAnalysisActions.startRoleDetection(jobData));
  }, []);

  const selectRole = useCallback((role: DetectedRole) => {
    dispatch(unifiedAnalysisActions.selectRole(role));
  }, []);

  const toggleRecommendation = useCallback((id: string) => {
    dispatch(unifiedAnalysisActions.toggleRecommendation(id));
  }, []);

  const proceedToNext = useCallback(() => {
    const steps: AnalysisStep[] = ['analysis', 'role-detection', 'improvements', 'actions'];
    const currentIndex = steps.indexOf(state.currentStep);
    
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      dispatch(unifiedAnalysisActions.setCurrentStep(nextStep));
      
      // Auto-trigger role detection if moving from analysis
      if (state.currentStep === 'analysis' && nextStep === 'role-detection' && state.jobData) {
        startRoleDetection(state.jobData);
      }
    } else if (currentIndex === steps.length - 1 && onNavigateToFeatures) {
      // Final step - navigate to features
      onNavigateToFeatures({
        jobData: state.jobData,
        selectedRole: state.selectedRole,
        selectedRecommendations: state.selectedRecommendations,
        roleAnalysis: state.roleAnalysis
      });
    }
  }, [state.currentStep, state.jobData, state.selectedRole, 
      state.selectedRecommendations, state.roleAnalysis, 
      onNavigateToFeatures, startRoleDetection]);

  const goBack = useCallback(() => {
    const steps: AnalysisStep[] = ['analysis', 'role-detection', 'improvements', 'actions'];
    const currentIndex = steps.indexOf(state.currentStep);
    
    if (currentIndex > 0) {
      const previousStep = steps[currentIndex - 1];
      dispatch(unifiedAnalysisActions.setCurrentStep(previousStep));
    }
  }, [state.currentStep]);

  const clearErrors = useCallback(() => {
    dispatch(unifiedAnalysisActions.clearErrors());
  }, []);

  // Additional computed properties for extended interface
  const progressPercentage = useMemo(() => {
    const steps: AnalysisStep[] = ['analysis', 'role-detection', 'improvements', 'actions'];
    const currentIndex = steps.indexOf(state.currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  }, [state.currentStep]);

  const currentStepIndex = useMemo(() => {
    const steps: AnalysisStep[] = ['analysis', 'role-detection', 'improvements', 'actions'];
    return steps.indexOf(state.currentStep);
  }, [state.currentStep]);

  const totalSteps = 4;

  // Additional helper methods
  const initializeAnalysis = useCallback((jobData: Job) => {
    dispatch(unifiedAnalysisActions.setJobData(jobData));
    dispatch(unifiedAnalysisActions.setCurrentStep('analysis'));
  }, []);

  const completeAnalysis = useCallback((results: AnalysisResults) => {
    dispatch(unifiedAnalysisActions.setAnalysisResults(results));
    
    // Auto-trigger role detection if enabled
    if (state.autoTriggerEnabled && state.jobData) {
      setTimeout(() => {
        startRoleDetection(state.jobData!);
      }, 500); // Small delay for UI transition
    }
  }, [state.autoTriggerEnabled, state.jobData, startRoleDetection]);

  const resetFlow = useCallback(() => {
    dispatch(unifiedAnalysisActions.resetState());
  }, []);

  // Context Value
  const contextValue: UnifiedAnalysisContextInterface & {
    progressPercentage: number;
    currentStepIndex: number;
    totalSteps: number;
    initializeAnalysis: (jobData: Job) => void;
    completeAnalysis: (results: AnalysisResults) => void;
    resetFlow: () => void;
  } = useMemo(() => ({
    state,
    dispatch,
    
    // Computed Properties
    canProceedToRoleDetection,
    canProceedToImprovements,
    canProceedToActions,
    hasSelectedRecommendations,
    
    // Helper Methods
    startRoleDetection,
    selectRole,
    toggleRecommendation,
    proceedToNext,
    goBack,
    clearErrors,
    
    // Extended Properties
    progressPercentage,
    currentStepIndex,
    totalSteps,
    
    // Extended Methods
    initializeAnalysis,
    completeAnalysis,
    resetFlow
  }), [
    state,
    canProceedToRoleDetection,
    canProceedToImprovements,
    canProceedToActions,
    hasSelectedRecommendations,
    startRoleDetection,
    selectRole,
    toggleRecommendation,
    proceedToNext,
    goBack,
    clearErrors,
    progressPercentage,
    currentStepIndex,
    initializeAnalysis,
    completeAnalysis,
    resetFlow
  ]);

  return (
    <UnifiedAnalysisContext.Provider value={contextValue}>
      {children}
    </UnifiedAnalysisContext.Provider>
  );
};

// Custom Hook
export const useUnifiedAnalysis = () => {
  const context = useContext(UnifiedAnalysisContext);
  
  if (context === undefined) {
    throw new Error('useUnifiedAnalysis must be used within a UnifiedAnalysisProvider');
  }
  
  return context;
};

// Export Context for Testing
export { UnifiedAnalysisContext };