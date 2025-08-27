import { useCallback, useEffect, useRef } from 'react';
import { useCVAnalysisState } from './useCVAnalysisState';
import { EnhancedApplyImprovementsService, ProgressTracker } from '../services/responseProcessor';
import type { MagicTransformProgress } from '../services/features/MagicTransformService';

/**
 * Custom hook for managing progress tracking during CV improvements
 * Handles both regular apply improvements and magic transform progress
 */
export function useCVAnalysisProgress() {
  const {
    job,
    selectedRecommendations,
    isApplying,
    isMagicTransforming,
    magicTransformProgress,
    progressSteps,
    updateMagicProgress,
    updateProgressSteps,
    setError,
    startApplying,
    stopApplying,
    startMagicTransform,
    stopMagicTransform,
    setImprovedCVData,
    setComparisonReport,
    setMagicTransformResult
  } = useCVAnalysisState();

  const progressTrackerRef = useRef<ProgressTracker | null>(null);
  const magicTransformServiceRef = useRef<any>(null);

  // Initialize progress tracker
  useEffect(() => {
    if (!progressTrackerRef.current) {
      progressTrackerRef.current = new ProgressTracker();
    }
  }, []);

  // Create progress steps for apply improvements
  const createApplyImprovementsSteps = useCallback(() => {
    const steps = [
      { step: 'Validating recommendations', status: 'pending' as const },
      { step: 'Processing improvements', status: 'pending' as const },
      { step: 'Generating enhanced content', status: 'pending' as const },
      { step: 'Creating comparison report', status: 'pending' as const },
      { step: 'Finalizing results', status: 'pending' as const }
    ];
    updateProgressSteps(steps);
    return steps;
  }, [updateProgressSteps]);

  // Update progress step status
  const updateStepStatus = useCallback((stepIndex: number, status: 'pending' | 'active' | 'complete' | 'error') => {
    const updatedSteps = progressSteps.map((step, index) => 
      index === stepIndex ? { ...step, status } : step
    );
    updateProgressSteps(updatedSteps);
  }, [progressSteps, updateProgressSteps]);

  // Handle apply improvements progress
  const handleApplyImprovements = useCallback(async () => {
    if (!selectedRecommendations.length || isApplying) return;

    try {
      startApplying();
      const steps = createApplyImprovementsSteps();

      // Step 1: Validate recommendations
      updateStepStatus(0, 'active');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (selectedRecommendations.length === 0) {
        throw new Error('No recommendations selected');
      }
      updateStepStatus(0, 'complete');

      // Step 2: Process improvements
      updateStepStatus(1, 'active');
      const enhancedService = new EnhancedApplyImprovementsService();
      
      const result = await enhancedService.applyImprovements({
        jobId: job.id,
        recommendationIds: selectedRecommendations,
        onProgress: (progress) => {
          console.log('Apply improvements progress:', progress);
        }
      });
      updateStepStatus(1, 'complete');

      // Step 3: Generate enhanced content
      updateStepStatus(2, 'active');
      await new Promise(resolve => setTimeout(resolve, 800));
      updateStepStatus(2, 'complete');

      // Step 4: Create comparison report  
      updateStepStatus(3, 'active');
      if (result.improvedCV) {
        setImprovedCVData(result.improvedCV);
      }
      if (result.comparisonReport) {
        setComparisonReport(result.comparisonReport);
      }
      updateStepStatus(3, 'complete');

      // Step 5: Finalize
      updateStepStatus(4, 'active');
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStepStatus(4, 'complete');

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply improvements';
      setError(errorMessage);
      
      // Mark current active step as error
      const currentActiveStep = progressSteps.findIndex(step => step.status === 'active');
      if (currentActiveStep >= 0) {
        updateStepStatus(currentActiveStep, 'error');
      }
      throw error;
    } finally {
      stopApplying();
    }
  }, [
    selectedRecommendations, 
    isApplying, 
    job.id,
    startApplying,
    stopApplying,
    createApplyImprovementsSteps,
    updateStepStatus,
    setImprovedCVData,
    setComparisonReport,
    setError,
    progressSteps
  ]);

  // Handle magic transform progress
  const handleMagicTransform = useCallback(async () => {
    if (isMagicTransforming) return;

    try {
      startMagicTransform();
      
      // Initialize magic transform service if not already done
      if (!magicTransformServiceRef.current) {
        const { MagicTransformService } = await import('../services/features/MagicTransformService');
        magicTransformServiceRef.current = new MagicTransformService();
      }

      const service = magicTransformServiceRef.current;

      const result = await service.transformCV({
        jobId: job.id,
        onProgress: (progress: MagicTransformProgress) => {
          updateMagicProgress(progress);
        }
      });

      if (result) {
        setMagicTransformResult(result);
        if (result.improvedCV) {
          setImprovedCVData(result.improvedCV);
        }
        if (result.comparisonReport) {
          setComparisonReport(result.comparisonReport);
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Magic transform failed';
      setError(errorMessage);
      throw error;
    } finally {
      stopMagicTransform();
    }
  }, [
    isMagicTransforming,
    job.id,
    startMagicTransform,
    stopMagicTransform,
    updateMagicProgress,
    setMagicTransformResult,
    setImprovedCVData,
    setComparisonReport,
    setError
  ]);

  // Calculate overall progress for apply improvements
  const overallProgress = progressSteps.length > 0 
    ? Math.round((progressSteps.filter(step => step.status === 'complete').length / progressSteps.length) * 100)
    : 0;

  // Get current step for display
  const currentStep = progressSteps.find(step => step.status === 'active')?.step || 
                    (overallProgress === 100 ? 'Complete!' : 'Preparing...');

  // Check if any step has error
  const hasError = progressSteps.some(step => step.status === 'error');

  return {
    // State
    isApplying,
    isMagicTransforming,
    magicTransformProgress,
    progressSteps,
    overallProgress,
    currentStep,
    hasError,
    
    // Actions
    handleApplyImprovements,
    handleMagicTransform,
    updateStepStatus,
    
    // Utility functions
    canStartProgress: !isApplying && !isMagicTransforming,
    isProgressComplete: overallProgress === 100,
    getMagicTransformProgress: () => magicTransformProgress?.progress || 0,
    getMagicTransformStep: () => magicTransformProgress?.step || 'Preparing Magic Transform...',
    isMagicTransformComplete: () => magicTransformProgress?.isComplete || false
  };
}