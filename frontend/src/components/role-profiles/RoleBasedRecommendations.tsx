import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Sparkles, CheckCircle, Circle, ChevronDown, ChevronUp, Zap, AlertTriangle } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { designSystem } from '../../config/designSystem';
import type { RoleProfile, DetectedRole, RoleBasedRecommendation } from '../../types/role-profiles';
import { logError } from '../../utils/errorHandling';

export interface RoleBasedRecommendationsProps {
  jobId: string;
  roleProfile?: RoleProfile | null;
  detectedRole?: DetectedRole | null;
  onRecommendationsUpdate?: (recommendations: RoleBasedRecommendation[]) => void;
  onContinueToPreview?: (selectedRecommendations: string[]) => void;
  className?: string;
}

interface RecommendationItem extends RoleBasedRecommendation {
  selected: boolean;
}

export const RoleBasedRecommendations: React.FC<RoleBasedRecommendationsProps> = ({
  jobId,
  roleProfile,
  detectedRole,
  onRecommendationsUpdate,
  onContinueToPreview,
  className = ''
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isApplying, setIsApplying] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState<number | null>(null);

  const functions = getFunctions();
  const getRoleBasedRecommendations = httpsCallable(functions, 'getRoleBasedRecommendations');

  // Load role-based recommendations
  useEffect(() => {
    if (jobId && (roleProfile || detectedRole)) {
      loadRecommendations();
    }
  }, [jobId, roleProfile, detectedRole]);

  const loadRecommendations = async (forceRegenerate = false) => {
    if (!jobId || isLoading) return;

    // Prevent too frequent requests (minimum 10 seconds between calls)
    const now = Date.now();
    if (lastLoadTime && (now - lastLoadTime) < 10000 && !forceRegenerate) {
      console.log('[RoleBasedRecommendations] Skipping load - too frequent');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLastLoadTime(now);

    try {
      console.log('[RoleBasedRecommendations] Loading recommendations for job:', jobId);
      
      const requestData: any = {
        jobId,
        forceRegenerate
      };

      if (roleProfile) {
        requestData.roleProfileId = roleProfile.id;
      } else if (detectedRole) {
        requestData.targetRole = detectedRole.roleName;
      }

      const result = await getRoleBasedRecommendations(requestData);

      if (result.data?.success && result.data?.data?.recommendations) {
        const recs = result.data.data.recommendations as RoleBasedRecommendation[];
        
        // Transform to internal format with selection state
        const recItems: RecommendationItem[] = recs.map(rec => ({
          ...rec,
          selected: rec.priority === 'high' // Auto-select high priority recommendations
        }));

        setRecommendations(recItems);
        onRecommendationsUpdate?.(recs);
        
        // Auto-expand high and medium priority sections
        const sectionsToExpand: Record<string, boolean> = {};
        const sections = [...new Set(recs.map(r => r.section || 'general'))];
        sections.forEach(section => {
          const sectionRecs = recs.filter(r => (r.section || 'general') === section);
          const hasHighPriority = sectionRecs.some(r => r.priority === 'high');
          const hasMediumPriority = sectionRecs.some(r => r.priority === 'medium');
          sectionsToExpand[section] = hasHighPriority || hasMediumPriority;
        });
        setExpandedSections(sectionsToExpand);

        console.log(`[RoleBasedRecommendations] Loaded ${recs.length} recommendations`);
        
        if (recs.length > 0) {
          const roleDisplayName = roleProfile?.name || detectedRole?.roleName || 'your role';
          toast.success(
            `Generated ${recs.length} personalized recommendations for ${roleDisplayName}`,
            { icon: '🎯', duration: 4000 }
          );
        }
      } else {
        throw new Error(result.data?.error || 'Failed to load recommendations');
      }
    } catch (err: any) {
      console.error('[RoleBasedRecommendations] Error:', err);
      logError('loadRoleBasedRecommendations', err);
      setError(err.message);
      toast.error('Failed to load role-based recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecommendation = (id: string) => {
    setRecommendations(prev =>
      prev.map(rec =>
        rec.id === id ? { ...rec, selected: !rec.selected } : rec
      )
    );
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const selectAllInSection = (section: string, selected: boolean) => {
    setRecommendations(prev =>
      prev.map(rec =>
        (rec.section || 'general') === section ? { ...rec, selected } : rec
      )
    );
  };

  const selectAll = (selected: boolean) => {
    setRecommendations(prev =>
      prev.map(rec => ({ ...rec, selected }))
    );
  };

  const handleContinueToPreview = () => {
    const selectedRecs = recommendations
      .filter(rec => rec.selected)
      .map(rec => rec.id);
    
    onContinueToPreview?.(selectedRecs);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          bg: 'bg-red-900/30 border-red-500/30',
          text: 'text-red-300',
          badge: 'bg-red-500/20 text-red-300 border-red-500/30'
        };
      case 'medium':
        return {
          bg: 'bg-orange-900/30 border-orange-500/30',
          text: 'text-orange-300',
          badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
        };
      case 'low':
        return {
          bg: 'bg-blue-900/30 border-blue-500/30',
          text: 'text-blue-300',
          badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
        };
      default:
        return {
          bg: 'bg-gray-900/30 border-gray-500/30',
          text: 'text-gray-300',
          badge: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
        };
    }
  };

  // Group recommendations by section
  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    const section = rec.section || 'general';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(rec);
    return acc;
  }, {} as Record<string, RecommendationItem[]>);

  const selectedCount = recommendations.filter(r => r.selected).length;
  const totalPotentialImprovement = recommendations
    .filter(r => r.selected)
    .reduce((sum, rec) => sum + (rec.estimatedScoreImprovement || 0), 0);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-600 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-600 rounded w-3/4 mb-6"></div>
            
            <div className="flex items-center gap-3 mt-4">
              <div className="animate-spin">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-gray-300">Generating personalized recommendations...</span>
            </div>
            
            <div className="space-y-4 mt-6">
              <div className="h-32 bg-gray-600 rounded"></div>
              <div className="h-24 bg-gray-600 rounded"></div>
              <div className="h-28 bg-gray-600 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-300 mb-2">Failed to Load Recommendations</h3>
              <p className="text-red-200 mb-4">{error}</p>
              <button
                onClick={() => loadRecommendations(true)}
                className={`${designSystem.components.button.base} ${designSystem.components.button.variants.danger.default} ${designSystem.components.button.sizes.md}`}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Role Context */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-100">
                Role-Enhanced Recommendations
              </h2>
              <p className="text-purple-300">
                Personalized for: <span className="font-semibold">
                  {roleProfile?.name || detectedRole?.roleName || 'Your Role'}
                </span>
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-300">{recommendations.length}</div>
            <div className="text-sm text-gray-400">Recommendations</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
            <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-green-300">+{totalPotentialImprovement}</div>
            <div className="text-sm text-gray-400">ATS Score Points</div>
          </div>
          
          <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg text-center">
            <CheckCircle className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-blue-300">{selectedCount}</div>
            <div className="text-sm text-gray-400">Selected</div>
          </div>
          
          <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg text-center">
            <Sparkles className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-purple-300">
              {Object.keys(groupedRecommendations).length}
            </div>
            <div className="text-sm text-gray-400">CV Sections</div>
          </div>
        </div>
      </div>

      {/* Global Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => selectAll(true)}
            className={`${designSystem.components.button.base} ${designSystem.components.button.variants.secondary.default} ${designSystem.components.button.sizes.sm}`}
          >
            Select All
          </button>
          <button
            onClick={() => selectAll(false)}
            className={`${designSystem.components.button.base} ${designSystem.components.button.variants.ghost.default} ${designSystem.components.button.sizes.sm}`}
          >
            Clear All
          </button>
          <button
            onClick={() => loadRecommendations(true)}
            disabled={isLoading}
            className={`${designSystem.components.button.base} ${designSystem.components.button.variants.ghost.default} ${designSystem.components.button.sizes.sm}`}
          >
            Refresh
          </button>
        </div>
        
        <div className="text-sm text-gray-400">
          {selectedCount} of {recommendations.length} recommendations selected
        </div>
      </div>

      {/* Recommendations by Section */}
      <div className="space-y-4">
        {Object.entries(groupedRecommendations).map(([section, sectionRecs]) => {
          const isExpanded = expandedSections[section];
          const selectedInSection = sectionRecs.filter(r => r.selected).length;
          const highPriorityCount = sectionRecs.filter(r => r.priority === 'high').length;
          const mediumPriorityCount = sectionRecs.filter(r => r.priority === 'medium').length;
          const lowPriorityCount = sectionRecs.filter(r => r.priority === 'low').length;

          return (
            <div key={section} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              {/* Section Header */}
              <div 
                className="p-4 bg-gray-700/30 border-b border-gray-700 cursor-pointer hover:bg-gray-700/50 transition-colors"
                onClick={() => toggleSection(section)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 ${isExpanded ? 'rotate-90' : ''} transition-transform`}>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-gray-100 capitalize">
                        {section.replace('_', ' ')} Section
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{sectionRecs.length} recommendations</span>
                        <span>{selectedInSection} selected</span>
                        {highPriorityCount > 0 && (
                          <span className="text-red-400">{highPriorityCount} high priority</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectAllInSection(section, true);
                      }}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
                    >
                      Select All
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectAllInSection(section, false);
                      }}
                      className="px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded hover:bg-gray-500 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Section Recommendations */}
              {isExpanded && (
                <div className="divide-y divide-gray-700">
                  {sectionRecs.map((rec, index) => {
                    const priorityColors = getPriorityColor(rec.priority);
                    
                    return (
                      <div
                        key={rec.id}
                        className={`p-4 transition-all duration-200 cursor-pointer ${
                          rec.selected 
                            ? 'bg-blue-900/20 border-l-4 border-blue-400'
                            : 'hover:bg-gray-700/30'
                        }`}
                        onClick={() => toggleRecommendation(rec.id)}
                      >
                        <div className="flex items-start gap-4">
                          {/* Selection Checkbox */}
                          <div className="flex-shrink-0 mt-1">
                            {rec.selected ? (
                              <CheckCircle className="w-5 h-5 text-blue-400" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                          
                          {/* Recommendation Content */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-lg font-medium text-gray-100">
                                {rec.title}
                              </h4>
                              
                              <div className="flex items-center gap-2">
                                {/* Priority Badge */}
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${priorityColors.badge}`}>
                                  {rec.priority} priority
                                </span>
                                
                                {/* Score Improvement */}
                                {rec.estimatedScoreImprovement && (
                                  <span className="px-2 py-1 bg-green-900/30 border border-green-500/30 text-green-300 text-xs font-medium rounded-full">
                                    +{rec.estimatedScoreImprovement} pts
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-sm text-gray-300 mb-3">
                              {rec.description}
                            </p>
                            
                            {/* Role Specific Indicator */}
                            {rec.roleSpecific && (
                              <div className="flex items-center gap-2 text-xs text-purple-400">
                                <Zap className="w-3 h-3" />
                                <span>Role-specific enhancement</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Continue to Preview */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-medium text-gray-100">
              Ready to enhance your CV?
            </p>
            <p className="text-sm text-gray-400">
              {selectedCount} recommendations selected 
              {totalPotentialImprovement > 0 && `• +${totalPotentialImprovement} ATS points potential`}
            </p>
          </div>
          
          <button
            onClick={handleContinueToPreview}
            disabled={selectedCount === 0 || isApplying}
            className={`${designSystem.components.button.base} ${designSystem.components.button.variants.primary.default} ${designSystem.components.button.sizes.lg} flex items-center gap-3`}
          >
            <Sparkles className="w-5 h-5" />
            <span>Apply & Preview</span>
            {selectedCount > 0 && (
              <span className="bg-blue-400 text-blue-900 px-2 py-1 rounded-full text-xs font-bold">
                {selectedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleBasedRecommendations;