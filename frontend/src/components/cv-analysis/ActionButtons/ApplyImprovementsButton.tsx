import React from 'react';
import { Wand2, Sparkles, Zap, Loader2 } from 'lucide-react';
import { useCVAnalysisState } from '../../../hooks/useCVAnalysisState';
import { useCVAnalysisProgress } from '../../../hooks/useCVAnalysisProgress';

/**
 * Apply Improvements Button component with Magic Transform option
 * Handles both regular improvements and AI-powered Magic Transform
 * Part of Phase 4 modularization - keeps component under 200 lines
 */
export function ApplyImprovementsButton() {
  const {
    selectedRecommendationsCount,
    potentialImprovement,
    isApplying,
    isMagicTransforming,
    canApplyImprovements,
    canMagicTransform,
    hasHighPriorityRecommendations,
    recommendations
  } = useCVAnalysisState();

  const {
    handleApplyImprovements,
    handleMagicTransform
  } = useCVAnalysisProgress();

  // Don't render if no recommendations
  if (recommendations.length === 0) {
    return null;
  }

  const isAnyOperationInProgress = isApplying || isMagicTransforming;

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
      <div className="space-y-4">
        {/* Section Header */}
        <div>
          <h3 className="text-lg font-semibold text-gray-100">
            Apply Improvements
          </h3>
          <p className="text-sm text-gray-400">
            Transform your CV with selected improvements or use AI Magic Transform
          </p>
        </div>

        {/* Selection Summary */}
        <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
          <div>
            <p className="text-sm text-gray-300">
              {selectedRecommendationsCount} improvements selected
              {potentialImprovement > 0 && (
                <span className="ml-2 text-green-400 font-medium">
                  (Potential +{potentialImprovement} ATS points)
                </span>
              )}
            </p>
            {selectedRecommendationsCount === 0 && (
              <p className="text-xs text-amber-400 mt-1">
                Select recommendations above to enable improvements
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Magic Transform Button */}
          <div className="relative">
            <button
              onClick={handleMagicTransform}
              disabled={!canMagicTransform || isAnyOperationInProgress}
              className={`w-full relative overflow-hidden px-6 py-4 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                canMagicTransform && !isAnyOperationInProgress
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 focus:ring-purple-400 transform hover:scale-105 shadow-lg'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {isMagicTransforming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Magic Transform in Progress...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    <span>🪄 Magic Transform</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </div>
              
              {/* Sparkle animations when enabled */}
              {canMagicTransform && !isAnyOperationInProgress && !isMagicTransforming && (
                <>
                  <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
                  <div className="absolute bottom-1 left-1 w-1 h-1 bg-yellow-300 rounded-full animate-ping animate-delay-1000"></div>
                  <div className="absolute top-1/2 left-0 w-1 h-1 bg-yellow-300 rounded-full animate-ping animate-delay-500"></div>
                </>
              )}
            </button>

            {/* Magic Transform Info */}
            <div className="mt-2 text-center">
              {hasHighPriorityRecommendations ? (
                <p className="text-xs text-purple-300">
                  ✨ AI-powered enhancement with all high-priority improvements
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  Magic Transform available when high-priority recommendations exist
                </p>
              )}
            </div>
          </div>

          {/* Regular Apply Improvements Button */}
          <div className="relative">
            <button
              onClick={handleApplyImprovements}
              disabled={!canApplyImprovements || isAnyOperationInProgress}
              className={`w-full px-6 py-3 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                canApplyImprovements && !isAnyOperationInProgress
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400 transform hover:scale-105'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {isApplying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Applying Improvements...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>Apply Selected Improvements</span>
                  </>
                )}
              </div>
            </button>

            {/* Apply Info */}
            <div className="mt-2 text-center">
              {selectedRecommendationsCount > 0 ? (
                <p className="text-xs text-blue-300">
                  Apply {selectedRecommendationsCount} selected improvements to your CV
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  Select improvements above to enable this option
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Help Text */}
        {!isAnyOperationInProgress && (
          <div className="bg-gray-700/30 rounded-lg p-3">
            <div className="text-xs text-gray-400 space-y-1">
              <p className="flex items-center gap-1">
                <Wand2 className="w-3 h-3 text-purple-400" />
                <strong>Magic Transform:</strong> AI applies all high-priority improvements automatically
              </p>
              <p className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-blue-400" />
                <strong>Apply Selected:</strong> Apply only your chosen improvements
              </p>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        {isAnyOperationInProgress && (
          <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <p className="text-sm text-blue-300">
                {isMagicTransforming 
                  ? 'AI is enhancing your CV with magic transform...'
                  : 'Processing your selected improvements...'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApplyImprovementsButton;