import { useCallback } from 'react';
import { useCVAnalysisContext, type RecommendationItem, type ATSAnalysis } from '../contexts/CVAnalysisContext';
import type { MagicTransformProgress, MagicTransformResult } from '../services/features/MagicTransformService';

/**
 * Custom hook for managing CV analysis state and actions
 * Provides a clean interface for components to interact with the CV analysis context
 */
export function useCVAnalysisState() {
  const { state, dispatch } = useCVAnalysisContext();

  // Recommendation management
  const setRecommendations = useCallback((recommendations: RecommendationItem[]) => {
    dispatch({ type: 'SET_RECOMMENDATIONS', payload: recommendations });
  }, [dispatch]);

  const toggleRecommendation = useCallback((recommendationId: string) => {
    dispatch({ type: 'TOGGLE_RECOMMENDATION', payload: recommendationId });
  }, [dispatch]);

  const selectAllHighPriority = useCallback(() => {
    dispatch({ type: 'SELECT_ALL_HIGH_PRIORITY' });
  }, [dispatch]);

  const clearSelections = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTIONS' });
  }, [dispatch]);

  // ATS Analysis
  const setATSAnalysis = useCallback((atsAnalysis: ATSAnalysis) => {
    dispatch({ type: 'SET_ATS_ANALYSIS', payload: atsAnalysis });
  }, [dispatch]);

  // UI state management
  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, [dispatch]);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, [dispatch]);

  const toggleComparison = useCallback((show?: boolean) => {
    dispatch({ type: 'TOGGLE_COMPARISON', payload: show });
  }, [dispatch]);

  const toggleCategory = useCallback((category: string) => {
    dispatch({ type: 'TOGGLE_CATEGORY', payload: category });
  }, [dispatch]);

  // Progress management
  const startApplying = useCallback(() => {
    dispatch({ type: 'START_APPLYING' });
  }, [dispatch]);

  const stopApplying = useCallback(() => {
    dispatch({ type: 'STOP_APPLYING' });
  }, [dispatch]);

  const startMagicTransform = useCallback(() => {
    dispatch({ type: 'START_MAGIC_TRANSFORM' });
  }, [dispatch]);

  const stopMagicTransform = useCallback(() => {
    dispatch({ type: 'STOP_MAGIC_TRANSFORM' });
  }, [dispatch]);

  const updateMagicProgress = useCallback((progress: MagicTransformProgress) => {
    dispatch({ type: 'UPDATE_MAGIC_PROGRESS', payload: progress });
  }, [dispatch]);

  const updateProgressSteps = useCallback((steps: Array<{ step: string; status: 'pending' | 'active' | 'complete' | 'error' }>) => {
    dispatch({ type: 'UPDATE_PROGRESS_STEPS', payload: steps });
  }, [dispatch]);

  // Data management
  const setOriginalCVData = useCallback((data: any) => {
    dispatch({ type: 'SET_ORIGINAL_CV_DATA', payload: data });
  }, [dispatch]);

  const setImprovedCVData = useCallback((data: any) => {
    dispatch({ type: 'SET_IMPROVED_CV_DATA', payload: data });
  }, [dispatch]);

  const setComparisonReport = useCallback((report: any) => {
    dispatch({ type: 'SET_COMPARISON_REPORT', payload: report });
  }, [dispatch]);

  const setMagicTransformResult = useCallback((result: MagicTransformResult) => {
    dispatch({ type: 'SET_MAGIC_TRANSFORM_RESULT', payload: result });
  }, [dispatch]);

  // Computed values
  const selectedRecommendationsCount = state.selectedRecommendations.length;
  const potentialImprovement = state.recommendations
    .filter(rec => state.selectedRecommendations.includes(rec.id))
    .reduce((total, rec) => total + rec.estimatedImprovement, 0);

  const newPredictedScore = state.atsAnalysis 
    ? Math.min(100, state.atsAnalysis.currentScore + potentialImprovement)
    : 0;

  // Group recommendations by category
  const recommendationsByCategory = state.recommendations.reduce((acc, rec) => {
    if (!acc[rec.category]) {
      acc[rec.category] = [];
    }
    acc[rec.category].push(rec);
    return acc;
  }, {} as Record<string, RecommendationItem[]>);

  const categories = Object.keys(recommendationsByCategory);

  // High priority recommendations for magic transform
  const magicSelectedRecs = state.recommendations.filter(rec => rec.priority === 'high');

  return {
    // State
    ...state,
    
    // Actions
    setRecommendations,
    toggleRecommendation,
    selectAllHighPriority,
    clearSelections,
    setATSAnalysis,
    setLoading,
    setError,
    toggleComparison,
    toggleCategory,
    startApplying,
    stopApplying,
    startMagicTransform,
    stopMagicTransform,
    updateMagicProgress,
    updateProgressSteps,
    setOriginalCVData,
    setImprovedCVData,
    setComparisonReport,
    setMagicTransformResult,
    
    // Computed values
    selectedRecommendationsCount,
    potentialImprovement,
    newPredictedScore,
    recommendationsByCategory,
    categories,
    magicSelectedRecs,
    
    // Utility functions
    isCategoryExpanded: (category: string) => state.expandedCategories.has(category),
    isRecommendationSelected: (recommendationId: string) => state.selectedRecommendations.includes(recommendationId),
    hasHighPriorityRecommendations: magicSelectedRecs.length > 0,
    canApplyImprovements: state.selectedRecommendations.length > 0 && !state.isApplying && !state.isMagicTransforming,
    canMagicTransform: magicSelectedRecs.length > 0 && !state.isApplying && !state.isMagicTransforming
  };
}