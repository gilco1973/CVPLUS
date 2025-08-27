import React from 'react';
import { Loader2, Wand2, Sparkles, Zap, CheckCircle } from 'lucide-react';
import { useCVAnalysisState } from '../../../hooks/useCVAnalysisState';

/**
 * Magic Transform Progress component showing AI-powered CV enhancement progress
 * Displays animated progress with visual feedback during magic transform operation
 * Part of Phase 4 modularization - keeps component under 200 lines
 */
export function MagicTransformProgress() {
  const {
    isMagicTransforming,
    magicTransformProgress,
    magicTransformResult
  } = useCVAnalysisState();

  // Don't render if not magic transforming and no result
  if (!isMagicTransforming && !magicTransformResult) {
    return null;
  }

  const progress = magicTransformProgress?.progress || 0;
  const currentStep = magicTransformProgress?.step || 'Preparing Magic Transform...';
  const isComplete = magicTransformProgress?.isComplete || false;

  // Magic transform steps for visual feedback
  const transformSteps = [
    { id: 1, name: 'Analyzing Content', icon: '🔍', threshold: 20 },
    { id: 2, name: 'AI Enhancement', icon: '🧠', threshold: 40 },
    { id: 3, name: 'Content Generation', icon: '✍️', threshold: 60 },
    { id: 4, name: 'Quality Check', icon: '🎯', threshold: 80 },
    { id: 5, name: 'Finalizing', icon: '✨', threshold: 100 }
  ];

  return (
    <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-500/30 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          {isComplete ? (
            <CheckCircle className="w-8 h-8 text-green-400" />
          ) : (
            <>
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              <div className="absolute inset-0 w-8 h-8 border-2 border-purple-400/30 rounded-full"></div>
            </>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Wand2 className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-purple-300">
              {isComplete ? 'Magic Transform Complete!' : 'Magic Transform in Progress'}
            </h3>
          </div>
          <p className="text-sm text-purple-200">
            {isComplete 
              ? 'Your CV has been enhanced with AI-powered improvements'
              : 'Generating your enhanced CV with AI-powered improvements and features'
            }
          </p>
        </div>

        {/* Sparkle animations */}
        {!isComplete && (
          <div className="relative">
            <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-purple-300 font-medium">
            {currentStep}
          </span>
          <span className="text-sm text-purple-400">
            {Math.round(progress)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            {/* Animated shine effect */}
            {!isComplete && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-slide-right"></div>
            )}
          </div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {transformSteps.map((step) => {
          const isStepComplete = progress >= step.threshold;
          const isStepActive = progress >= (step.threshold - 20) && progress < step.threshold;
          
          return (
            <div
              key={step.id}
              className={`text-center transition-all duration-300 ${
                isStepComplete 
                  ? 'text-green-400' 
                  : isStepActive 
                    ? 'text-purple-400 scale-110' 
                    : 'text-gray-600'
              }`}
            >
              <div className={`text-2xl mb-1 transition-transform duration-300 ${
                isStepActive ? 'animate-bounce' : ''
              }`}>
                {step.icon}
              </div>
              <p className="text-xs font-medium">
                {step.name}
              </p>
              {isStepComplete && (
                <div className="w-2 h-2 bg-green-400 rounded-full mx-auto mt-1"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current Activity */}
      {!isComplete && (
        <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-yellow-400 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm text-purple-200 font-medium">
                AI is working on your CV...
              </p>
              <p className="text-xs text-purple-300 mt-1">
                {currentStep}
              </p>
            </div>
            
            {/* Activity indicator dots */}
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-ping"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Message */}
      {isComplete && magicTransformResult && (
        <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm text-green-200 font-medium">
                Magic Transform completed successfully!
              </p>
              <p className="text-xs text-green-300 mt-1">
                Your enhanced CV is ready for template selection
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tips during processing */}
      {!isComplete && progress > 0 && (
        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-400 text-center">
            💡 Tip: The AI is analyzing your CV content and generating enhanced versions
            tailored to improve ATS compatibility and readability.
          </p>
        </div>
      )}
    </div>
  );
}

export default MagicTransformProgress;