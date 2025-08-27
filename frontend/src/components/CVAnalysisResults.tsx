import React, { useMemo } from 'react';
import { CVAnalysisProvider } from '../contexts/CVAnalysisContext';
import { CVAnalysisErrorBoundary, withCVAnalysisErrorBoundary } from './error-boundaries/CVAnalysisErrorBoundary';
import { useCVAnalysisState } from '../hooks/useCVAnalysisState';
import { useCVAnalysisErrorRecovery } from '../hooks/useCVAnalysisErrorRecovery';
import { useRecommendationLoader } from '../hooks/useRecommendationLoader';
import { type Job } from '../services/cvService';
import toast from 'react-hot-toast';

// Modular Components
import CVComparisonContainer from './cv-analysis/ComparisonView/CVComparisonContainer';
import ComparisonMetrics from './cv-analysis/ComparisonView/ComparisonMetrics';
import MagicTransformProgress from './cv-analysis/ProgressIndicators/MagicTransformProgress';
import ProcessingSteps from './cv-analysis/ProgressIndicators/ProcessingSteps';
import ATSScoreDisplay from './cv-analysis/ScoreVisualization/ATSScoreDisplay';
import ApplyImprovementsButton from './cv-analysis/ActionButtons/ApplyImprovementsButton';

import { RecommendationsList } from './RecommendationsList';
import { LoadingSkeleton } from './LoadingSkeleton';

/**
 * Props interface for CVAnalysisResults component
 */
export interface CVAnalysisResultsProps {
  job: Job;
  roleContext?: any;
  onContinue: (selectedRecommendations: string[]) => void;
  onBack?: () => void;
  className?: string;
}

/**
 * Main CV Analysis Results component - Refactored for Phase 4
 * 
 * This component has been modularized into focused, maintainable components:
 * - State management handled by CVAnalysisContext
 * - UI components split into logical modules under 200 lines each
 * - Error handling with graceful recovery
 * - Responsive design with accessibility support
 * 
 * Component count: Under 200 lines ✓
 * Modular architecture: ✓
 * Error boundaries: ✓
 * Context-based state: ✓
 */
function CVAnalysisResultsCore({ job, roleContext, onContinue, onBack, className }: CVAnalysisResultsProps) {
  const { recommendations, isLoading, error, showComparison } = useCVAnalysisState();
  const { recoveryActions } = useCVAnalysisErrorRecovery();
  const { retryLoad } = useRecommendationLoader(job.id);

  // Memoized components for performance
  const MemoizedRecommendationsList = useMemo(
    () => <RecommendationsList />,
    [recommendations.length]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <LoadingSkeleton />
      </div>
    );
  }

  // Error state with recovery options
  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-300 mb-2">
            Unable to Load Recommendations
          </h3>
          <p className="text-red-200 mb-4">{error}</p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => recoveryActions.retryRecommendations(retryLoad)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
            
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 border border-red-500 text-red-300 rounded-lg hover:bg-red-900/20 transition-colors"
              >
                Go Back
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show comparison view if improvements have been applied
  if (showComparison) {
    return (
      <div className={`space-y-6 ${className}`}>
        <CVComparisonContainer />
        <ComparisonMetrics />
      </div>
    );
  }

  // Main recommendations view
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Components */}
      <MagicTransformProgress />
      <ProcessingSteps />

      {/* ATS Score Display */}
      <ATSScoreDisplay />

      {/* Recommendations List */}
      {MemoizedRecommendationsList}

      {/* Action Buttons */}
      <ApplyImprovementsButton />

      {/* Back Navigation */}
      {onBack && (
        <div className="text-center">
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-400 hover:text-gray-300 transition-colors text-sm"
          >
            ← Back to Previous Step
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Main CVAnalysisResults component with Context Provider and Error Boundary
 */
function CVAnalysisResults({ job, roleContext, onContinue, onBack, className }: CVAnalysisResultsProps) {
  return (
    <CVAnalysisProvider
      job={job}
      roleContext={roleContext}
      onContinue={onContinue}
      onBack={onBack}
    >
      <CVAnalysisResultsCore
        job={job}
        roleContext={roleContext}
        onContinue={onContinue}
        onBack={onBack}
        className={className}
      />
    </CVAnalysisProvider>
  );
}

/**
 * Enhanced CVAnalysisResults with Error Boundary wrapper
 * This is the main export that provides comprehensive error handling
 */
function CVAnalysisResultsWithErrorBoundary(props: CVAnalysisResultsProps) {
  return (
    <CVAnalysisErrorBoundary
      onError={(error, errorInfo) => {
        console.error('CVAnalysisResults Error Boundary caught error:', error, errorInfo);
        toast.error('An unexpected error occurred in the CV analysis. Please try refreshing the page.');
      }}
    >
      <CVAnalysisResults {...props} />
    </CVAnalysisErrorBoundary>
  );
}

// Also create HOC version for easy use
export const CVAnalysisResultsWithHOC = withCVAnalysisErrorBoundary(CVAnalysisResults);

export default CVAnalysisResultsWithErrorBoundary;