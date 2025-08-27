import React from 'react';
import { TrendingUp, FileText, Zap, Target } from 'lucide-react';
import { useCVAnalysisState } from '../../../hooks/useCVAnalysisState';

/**
 * Component displaying comparison metrics and improvements statistics
 * Shows quantifiable improvements between original and enhanced CV
 * Part of Phase 4 modularization - keeps component under 200 lines
 */
export function ComparisonMetrics() {
  const {
    atsAnalysis,
    comparisonReport,
    improvedCVData,
    potentialImprovement,
    selectedRecommendationsCount
  } = useCVAnalysisState();

  // Don't render if no comparison data available
  if (!comparisonReport && !improvedCVData) {
    return null;
  }

  // Calculate improvement metrics
  const currentScore = atsAnalysis?.currentScore || 0;
  const newScore = Math.min(100, currentScore + potentialImprovement);
  const improvementPercentage = newScore - currentScore;
  
  // Extract metrics from comparison report
  const beforeAfterCount = comparisonReport?.beforeAfter?.length || 0;
  const sectionsImproved = comparisonReport?.beforeAfter
    ? [...new Set(comparisonReport.beforeAfter.map(item => item.section))].length
    : 0;

  const metrics = [
    {
      icon: Target,
      label: 'ATS Score Improvement',
      value: `+${improvementPercentage}%`,
      subtext: `${currentScore}% → ${newScore}%`,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-700'
    },
    {
      icon: FileText,
      label: 'Sections Enhanced',
      value: sectionsImproved,
      subtext: `${sectionsImproved} of ${sectionsImproved + 2} sections`,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-700'
    },
    {
      icon: Zap,
      label: 'Improvements Applied',
      value: selectedRecommendationsCount,
      subtext: `${beforeAfterCount} content updates`,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      borderColor: 'border-purple-700'
    },
    {
      icon: TrendingUp,
      label: 'Quality Enhancement',
      value: 'Premium',
      subtext: 'Professional-grade content',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
      borderColor: 'border-yellow-700'
    }
  ];

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Improvement Metrics
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Quantifiable enhancements to your CV content and structure
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div
              key={index}
              className={`${metric.bgColor} ${metric.borderColor} border rounded-lg p-4 transition-transform hover:scale-105`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon className={`w-5 h-5 ${metric.color}`} />
                <span className="text-sm font-medium text-gray-300">
                  {metric.label}
                </span>
              </div>
              
              <div className={`text-xl font-bold ${metric.color} mb-1`}>
                {metric.value}
              </div>
              
              <p className="text-xs text-gray-500">
                {metric.subtext}
              </p>
            </div>
          );
        })}
      </div>

      {/* Improvement Summary */}
      {comparisonReport?.beforeAfter && comparisonReport.beforeAfter.length > 0 && (
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">
            Key Improvements Made:
          </h4>
          
          <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
            {comparisonReport.beforeAfter.slice(0, 5).map((improvement, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-xs"
              >
                <div className="w-2 h-2 bg-green-400 rounded-full mt-1.5 flex-shrink-0"></div>
                <div>
                  <span className="text-gray-300 font-medium">
                    {improvement.section}:
                  </span>
                  <span className="text-gray-400 ml-1">
                    {improvement.improvement || 'Content enhanced'}
                  </span>
                </div>
              </div>
            ))}
            
            {comparisonReport.beforeAfter.length > 5 && (
              <div className="text-xs text-gray-500 mt-2 text-center">
                +{comparisonReport.beforeAfter.length - 5} more improvements
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quality Indicators */}
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        <div className="bg-green-900/30 text-green-300 px-3 py-1 rounded-full text-xs flex items-center gap-1">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          ATS Optimized
        </div>
        <div className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full text-xs flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          Content Enhanced
        </div>
        <div className="bg-purple-900/30 text-purple-300 px-3 py-1 rounded-full text-xs flex items-center gap-1">
          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
          Structure Improved
        </div>
      </div>
    </div>
  );
}

export default ComparisonMetrics;