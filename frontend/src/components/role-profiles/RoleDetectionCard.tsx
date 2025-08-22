import React from 'react';
import { CheckCircle, Target, TrendingUp, Sparkles, ArrowRight, Zap, Users, ExternalLink } from 'lucide-react';
import { designSystem } from '../../config/designSystem';
import type { DetectedRole, RoleProfile, RoleProfileAnalysis } from '../../types/role-profiles';

export interface RoleDetectionCardProps {
  detectedRole: DetectedRole;
  roleProfile?: RoleProfile | null;
  analysis?: RoleProfileAnalysis | null;
  onApply: () => void;
  onShowAlternatives: () => void;
  isApplying?: boolean;
  className?: string;
}

export const RoleDetectionCard: React.FC<RoleDetectionCardProps> = ({
  detectedRole,
  roleProfile,
  analysis,
  onApply,
  onShowAlternatives,
  isApplying = false,
  className = ''
}) => {
  const confidencePercentage = Math.round(detectedRole.confidence * 100);
  const isHighConfidence = detectedRole.confidence >= 0.8;
  const isMediumConfidence = detectedRole.confidence >= 0.6;
  
  // Determine confidence color scheme
  const getConfidenceStyle = () => {
    if (isHighConfidence) {
      return {
        bgClass: 'bg-green-900/30 border-green-500/30',
        textClass: 'text-green-300',
        indicatorClass: 'bg-green-500',
        ringClass: 'ring-green-500/20'
      };
    } else if (isMediumConfidence) {
      return {
        bgClass: 'bg-orange-900/30 border-orange-500/30',
        textClass: 'text-orange-300',
        indicatorClass: 'bg-orange-500',
        ringClass: 'ring-orange-500/20'
      };
    } else {
      return {
        bgClass: 'bg-red-900/30 border-red-500/30',
        textClass: 'text-red-300',
        indicatorClass: 'bg-red-500',
        ringClass: 'ring-red-500/20'
      };
    }
  };

  const confidenceStyle = getConfidenceStyle();
  const hasMatchingFactors = detectedRole.matchingFactors && detectedRole.matchingFactors.length > 0;
  const hasRecommendations = detectedRole.recommendations && detectedRole.recommendations.length > 0;

  return (
    <div className={`bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-6 border-b border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Confidence Ring */}
            <div className="relative">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 ${confidenceStyle.bgClass} ${confidenceStyle.ringClass} ring-4`}>
                <div className={`w-3 h-3 rounded-full ${confidenceStyle.indicatorClass} animate-pulse`}></div>
              </div>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${confidenceStyle.bgClass} ${confidenceStyle.textClass} border`}>
                  {confidencePercentage}%
                </span>
              </div>
            </div>
            
            {/* Role Information */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-sm text-green-400 font-medium">Role Detected</span>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-100 mb-2">
                {detectedRole.roleName}
              </h3>
              
              {roleProfile && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>{roleProfile.category}</span>
                    {roleProfile.experienceLevel && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{roleProfile.experienceLevel}</span>
                      </>
                    )}
                  </div>
                  
                  {roleProfile.description && (
                    <p className="text-sm text-gray-300 leading-relaxed max-w-2xl">
                      {roleProfile.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Confidence Badge */}
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${confidenceStyle.bgClass} ${confidenceStyle.textClass} border`}>
            {isHighConfidence ? 'Excellent Match' :
             isMediumConfidence ? 'Good Match' :
             'Partial Match'}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-6 space-y-6">
        {/* Matching Factors */}
        {hasMatchingFactors && (
          <div>
            <h4 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-400" />
              Key Matching Factors
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {detectedRole.matchingFactors.slice(0, 6).map((factor, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">{factor}</span>
                </div>
              ))}
            </div>
            
            {detectedRole.matchingFactors.length > 6 && (
              <p className="text-sm text-gray-400 mt-2">
                +{detectedRole.matchingFactors.length - 6} more factors matched
              </p>
            )}
          </div>
        )}

        {/* Enhancement Preview */}
        <div>
          <h4 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Enhancement Potential
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-300 mb-1">
                +{detectedRole.enhancementPotential}%
              </div>
              <div className="text-sm text-gray-400">ATS Score Boost</div>
            </div>
            
            <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-300 mb-1">
                {hasRecommendations ? detectedRole.recommendations.length : '8-12'}
              </div>
              <div className="text-sm text-gray-400">AI Recommendations</div>
            </div>
            
            <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-300 mb-1">
                {roleProfile ? '15+' : '10+'}
              </div>
              <div className="text-sm text-gray-400">Template Enhancements</div>
            </div>
          </div>
        </div>

        {/* Sample Recommendations Preview */}
        {hasRecommendations && (
          <div>
            <h4 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Sample Recommendations
            </h4>
            
            <div className="space-y-2">
              {detectedRole.recommendations.slice(0, 3).map((rec, index) => (
                <div
                  key={index}
                  className="p-3 bg-neutral-700/50 border border-neutral-600 rounded-lg"
                >
                  <p className="text-sm text-gray-300">{rec}</p>
                </div>
              ))}
              
              {detectedRole.recommendations.length > 3 && (
                <p className="text-sm text-gray-400 text-center pt-2">
                  +{detectedRole.recommendations.length - 3} more recommendations available
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-6 bg-gray-700/30 border-t border-gray-700">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Primary Action: Apply Role */}
          <button
            onClick={onApply}
            disabled={isApplying}
            className={`${designSystem.components.button.base} ${designSystem.components.button.variants.primary.default} ${designSystem.components.button.sizes.lg} flex-1 flex items-center justify-center gap-3 relative overflow-hidden group`}
          >
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Button content */}
            <div className="relative flex items-center gap-3">
              {isApplying ? (
                <>
                  <div className="animate-spin">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span>Applying Magic...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span className="font-semibold">Apply This Role Profile</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </div>
            
            {/* Sparkle animations */}
            {!isApplying && (
              <>
                <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-300 rounded-full animate-ping opacity-75"></div>
                <div className="absolute bottom-1 left-1 w-1 h-1 bg-yellow-300 rounded-full animate-ping animation-delay-1000 opacity-75"></div>
              </>
            )}
          </button>
          
          {/* Secondary Action: Show Alternatives */}
          <button
            onClick={onShowAlternatives}
            disabled={isApplying}
            className={`${designSystem.components.button.base} ${designSystem.components.button.variants.secondary.default} ${designSystem.components.button.sizes.lg} flex items-center gap-2 sm:w-auto w-full justify-center`}
          >
            <ExternalLink className="w-4 h-4" />
            <span>View Alternatives</span>
          </button>
        </div>
        
        {/* Confidence-based messaging */}
        <div className="mt-4 text-center">
          {isHighConfidence ? (
            <p className="text-sm text-green-400">
              🎯 <strong>Excellent match!</strong> This role profile perfectly aligns with your CV content.
            </p>
          ) : isMediumConfidence ? (
            <p className="text-sm text-orange-400">
              ⚡ <strong>Good match</strong> - Some customization may be needed for optimal results.
            </p>
          ) : (
            <p className="text-sm text-red-400">
              💡 <strong>Partial match</strong> - Consider reviewing alternatives or adding more relevant experience.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleDetectionCard;