import React from 'react';
import { Target, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCVAnalysisState } from '../../../hooks/useCVAnalysisState';

/**
 * ATS Score Display component showing current and predicted ATS scores
 * Visual representation of CV performance for Applicant Tracking Systems
 * Part of Phase 4 modularization - keeps component under 200 lines
 */
export function ATSScoreDisplay() {
  const {
    atsAnalysis,
    selectedRecommendationsCount,
    potentialImprovement,
    newPredictedScore
  } = useCVAnalysisState();

  // Don't render if no ATS analysis available
  if (!atsAnalysis) {
    return null;
  }

  const currentScore = atsAnalysis.currentScore;
  const predictedScore = atsAnalysis.predictedScore;

  // Determine score category and styling
  const getScoreInfo = (score: number) => {
    if (score >= 80) {
      return {
        category: 'Excellent',
        color: 'text-green-400',
        bgColor: 'bg-green-500',
        borderColor: 'border-green-400',
        description: 'High chance of passing ATS screening'
      };
    } else if (score >= 60) {
      return {
        category: 'Good',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500',
        borderColor: 'border-yellow-400',
        description: 'Moderate chance of passing ATS screening'
      };
    } else if (score >= 40) {
      return {
        category: 'Fair',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500',
        borderColor: 'border-orange-400',
        description: 'May need improvements for ATS compatibility'
      };
    } else {
      return {
        category: 'Needs Improvement',
        color: 'text-red-400',
        bgColor: 'bg-red-500',
        borderColor: 'border-red-400',
        description: 'Requires significant improvements for ATS'
      };
    }
  };

  const currentScoreInfo = getScoreInfo(currentScore);
  const newScoreInfo = getScoreInfo(newPredictedScore);

  // Calculate improvement percentage
  const improvementPoints = newPredictedScore - currentScore;
  const hasImprovements = selectedRecommendationsCount > 0;

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-900/30 rounded-lg">
          <Target className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-100">
            ATS Compatibility Score
          </h3>
          <p className="text-sm text-gray-400">
            How well your CV performs with Applicant Tracking Systems
          </p>
        </div>
      </div>

      {/* Score Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Current Score */}
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-gray-300">Current Score</h4>
          
          <div className="flex items-center space-x-4">
            {/* Circular Progress */}
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                {/* Background circle */}
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="rgba(75, 85, 99, 0.3)"
                  strokeWidth="6"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="rgb(239, 68, 68)"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${(currentScore / 100) * 201.06} 201.06`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {currentScore}%
                </span>
              </div>
            </div>

            {/* Score Details */}
            <div>
              <div className={`text-sm font-semibold ${currentScoreInfo.color}`}>
                {currentScoreInfo.category}
              </div>
              <p className="text-xs text-gray-500 mt-1 max-w-32">
                {currentScoreInfo.description}
              </p>
            </div>
          </div>
        </div>

        {/* Potential Score with Improvements */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="text-md font-semibold text-gray-300">
              Potential After Improvements
            </h4>
            {hasImprovements && (
              <span className="px-2 py-1 bg-blue-900/30 text-blue-300 text-xs rounded-full">
                {selectedRecommendationsCount} selected
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Circular Progress for New Score */}
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                {/* Background circle */}
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="rgba(75, 85, 99, 0.3)"
                  strokeWidth="6"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke={hasImprovements ? "rgb(34, 197, 94)" : "rgba(75, 85, 99, 0.6)"}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${(newPredictedScore / 100) * 201.06} 201.06`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xl font-bold ${hasImprovements ? 'text-green-400' : 'text-gray-500'}`}>
                  {newPredictedScore}%
                </span>
              </div>
            </div>

            {/* Improvement Details */}
            <div>
              {hasImprovements ? (
                <>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-green-400 font-semibold">
                      +{improvementPoints} points
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {newScoreInfo.description}
                  </p>
                </>
              ) : (
                <div className="text-gray-500">
                  <div className="text-sm">Select improvements</div>
                  <p className="text-xs mt-1">
                    Choose recommendations to see potential score increase
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Improvement Indicator */}
      {hasImprovements && improvementPoints > 0 && (
        <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm text-green-300 font-medium">
                Excellent improvement potential!
              </p>
              <p className="text-xs text-green-200 mt-1">
                Your ATS score could increase by {improvementPoints} points with the selected improvements
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ATS Issues & Suggestions */}
      {atsAnalysis.issues && atsAnalysis.issues.length > 0 && (
        <div className="border-t border-gray-700 pt-4">
          <h5 className="text-sm font-semibold text-gray-300 mb-3">
            Key ATS Considerations:
          </h5>
          
          <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
            {atsAnalysis.issues.slice(0, 3).map((issue, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-xs"
              >
                <AlertTriangle className={`w-3 h-3 mt-0.5 flex-shrink-0 ${
                  issue.severity === 'error' ? 'text-red-400' : 'text-yellow-400'
                }`} />
                <span className="text-gray-400">
                  {issue.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ATSScoreDisplay;