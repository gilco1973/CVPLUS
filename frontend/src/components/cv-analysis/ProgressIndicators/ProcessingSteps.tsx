import React from 'react';
import { CheckCircle, Circle, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { useCVAnalysisState } from '../../../hooks/useCVAnalysisState';

/**
 * Processing Steps component showing step-by-step progress during CV improvements
 * Displays each step with appropriate status indicators and animations
 * Part of Phase 4 modularization - keeps component under 200 lines
 */
export function ProcessingSteps() {
  const {
    isApplying,
    progressSteps
  } = useCVAnalysisState();

  // Don't render if not applying improvements or no steps
  if (!isApplying && progressSteps.length === 0) {
    return null;
  }

  const getStepIcon = (status: 'pending' | 'active' | 'complete' | 'error') => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'active':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'pending':
      default:
        return <Circle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStepColor = (status: 'pending' | 'active' | 'complete' | 'error') => {
    switch (status) {
      case 'complete':
        return 'text-green-300';
      case 'active':
        return 'text-blue-300';
      case 'error':
        return 'text-red-300';
      case 'pending':
      default:
        return 'text-gray-500';
    }
  };

  const getProgressPercentage = () => {
    if (progressSteps.length === 0) return 0;
    const completedSteps = progressSteps.filter(step => step.status === 'complete').length;
    return Math.round((completedSteps / progressSteps.length) * 100);
  };

  const currentActiveStep = progressSteps.find(step => step.status === 'active');
  const hasErrors = progressSteps.some(step => step.status === 'error');

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-100">
            Processing Steps
          </h3>
          <p className="text-sm text-gray-400">
            {hasErrors 
              ? 'An error occurred during processing'
              : currentActiveStep
                ? `Currently: ${currentActiveStep.step}`
                : progressSteps.length > 0 && progressSteps.every(step => step.status === 'complete')
                  ? 'All steps completed successfully'
                  : 'Preparing to process your improvements'
            }
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-400">
            {getProgressPercentage()}%
          </div>
          <div className="text-xs text-gray-500">
            Complete
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ease-out ${
              hasErrors 
                ? 'bg-red-500'
                : getProgressPercentage() === 100
                  ? 'bg-green-500'
                  : 'bg-blue-500'
            }`}
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {progressSteps.map((step, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
              step.status === 'active' 
                ? 'bg-blue-900/20 border border-blue-600/30' 
                : step.status === 'complete'
                  ? 'bg-green-900/20 border border-green-600/30'
                  : step.status === 'error'
                    ? 'bg-red-900/20 border border-red-600/30'
                    : 'bg-gray-700/30'
            }`}
          >
            {/* Step Icon */}
            <div className="flex-shrink-0">
              {getStepIcon(step.status)}
            </div>

            {/* Step Content */}
            <div className="flex-1">
              <div className={`font-medium ${getStepColor(step.status)}`}>
                {step.step}
              </div>
              
              {/* Additional info based on status */}
              {step.status === 'active' && (
                <div className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Processing...
                </div>
              )}
              
              {step.status === 'complete' && (
                <div className="text-xs text-green-400 mt-1">
                  ✓ Completed
                </div>
              )}
              
              {step.status === 'error' && (
                <div className="text-xs text-red-400 mt-1">
                  ⚠ Error occurred
                </div>
              )}
              
              {step.status === 'pending' && (
                <div className="text-xs text-gray-500 mt-1">
                  Waiting...
                </div>
              )}
            </div>

            {/* Step Number */}
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              step.status === 'complete'
                ? 'bg-green-500 text-white'
                : step.status === 'active'
                  ? 'bg-blue-500 text-white'
                  : step.status === 'error'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-600 text-gray-400'
            }`}>
              {index + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Status Footer */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        {hasErrors ? (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>
              Processing encountered an error. You can retry or contact support.
            </span>
          </div>
        ) : getProgressPercentage() === 100 ? (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>
              All improvements have been successfully applied to your CV!
            </span>
          </div>
        ) : isApplying ? (
          <div className="flex items-center gap-2 text-blue-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              Processing your CV improvements, please wait...
            </span>
          </div>
        ) : (
          <div className="text-gray-500 text-sm text-center">
            Steps will appear here during processing
          </div>
        )}
      </div>
    </div>
  );
}

export default ProcessingSteps;