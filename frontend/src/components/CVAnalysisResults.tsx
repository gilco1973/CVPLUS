import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, Circle, AlertTriangle, Target, Sparkles, TrendingUp, Wand2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { applyImprovements } from '../services/cvService';
import type { Job } from '../services/cvService';
import toast from 'react-hot-toast';

interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  impact: string;
  estimatedImprovement: number; // ATS score points
  selected: boolean;
}

interface ATSAnalysis {
  currentScore: number;
  predictedScore: number;
  issues: Array<{
    message: string;
    severity: 'error' | 'warning';
    category: string;
  }>;
  suggestions: Array<{
    reason: string;
    impact: string;
    category: string;
  }>;
  overall: number;
  passes: boolean;
}

interface CVAnalysisResultsProps {
  job: Job;
  onContinue: (selectedRecommendations: string[]) => void;
  onBack?: () => void;
  className?: string;
}

export const CVAnalysisResults: React.FC<CVAnalysisResultsProps> = ({
  job,
  onContinue,
  onBack,
  className = ''
}) => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [atsAnalysis, setAtsAnalysis] = useState<ATSAnalysis | null>(null);
  const [expandedPriorities, setExpandedPriorities] = useState<Record<string, boolean>>({
    high: true,
    medium: true,
    low: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isMagicTransforming, setIsMagicTransforming] = useState(false);

  // Mock ATS analysis - replace with actual API call
  useEffect(() => {
    const mockAnalysis = (_jobData: Job): ATSAnalysis => {
      // Simulate realistic analysis based on common CV issues
      // TODO: Use actual job data to generate realistic analysis
      const issues = [
        { message: 'Missing professional summary section', severity: 'error' as const, category: 'Structure' },
        { message: 'Date format inconsistency detected', severity: 'warning' as const, category: 'Formatting' },
        { message: 'Skills section needs better keyword density', severity: 'warning' as const, category: 'Keywords' }
      ];

      const suggestions = [
        { reason: 'Add action verbs to experience descriptions', impact: 'High', category: 'Content' },
        { reason: 'Include industry-specific keywords', impact: 'Medium', category: 'Keywords' },
        { reason: 'Quantify achievements with metrics', impact: 'High', category: 'Impact' },
        { reason: 'Optimize section headings for ATS scanning', impact: 'Medium', category: 'Structure' }
      ];

      const currentScore = 72;
      const maxImprovement = issues.length * 8 + suggestions.length * 5;
      const predictedScore = Math.min(95, currentScore + maxImprovement);

      return {
        currentScore,
        predictedScore,
        issues,
        suggestions,
        overall: currentScore,
        passes: currentScore >= 70
      };
    };

    const generateRecommendations = (analysis: ATSAnalysis): RecommendationItem[] => {
      const recs: RecommendationItem[] = [];

      // Convert issues to high-priority recommendations
      analysis.issues.forEach((issue, index) => {
        recs.push({
          id: `issue-${index}`,
          title: issue.message,
          description: `Critical ATS compatibility issue that needs immediate attention`,
          priority: issue.severity === 'error' ? 'high' : 'medium',
          category: issue.category,
          impact: 'Significantly improves ATS parsing',
          estimatedImprovement: issue.severity === 'error' ? 12 : 8,
          selected: true
        });
      });

      // Convert suggestions to medium/low priority recommendations
      analysis.suggestions.forEach((suggestion, index) => {
        recs.push({
          id: `suggestion-${index}`,
          title: suggestion.reason,
          description: `Enhancement to boost your CV's impact and readability`,
          priority: suggestion.impact === 'High' ? 'medium' : 'low',
          category: suggestion.category,
          impact: `${suggestion.impact} impact on recruiter engagement`,
          estimatedImprovement: suggestion.impact === 'High' ? 6 : 4,
          selected: suggestion.impact === 'High'
        });
      });

      // Add some additional smart recommendations
      const additionalRecs: RecommendationItem[] = [
        {
          id: 'keyword-optimization',
          title: 'Optimize keywords for target industry',
          description: 'Enhance keyword density for better ATS matching and search visibility',
          priority: 'high',
          category: 'Keywords',
          impact: 'Increases visibility by 40%',
          estimatedImprovement: 10,
          selected: true
        },
        {
          id: 'achievement-quantification',
          title: 'Add quantifiable achievements',
          description: 'Transform bullet points into measurable accomplishments with specific metrics',
          priority: 'medium',
          category: 'Impact',
          impact: 'Demonstrates concrete value',
          estimatedImprovement: 8,
          selected: true
        },
        {
          id: 'skills-enhancement',
          title: 'Enhance technical skills presentation',
          description: 'Reorganize and categorize skills for better scanning and relevance',
          priority: 'medium',
          category: 'Skills',
          impact: 'Improves skill matching',
          estimatedImprovement: 6,
          selected: false
        },
        {
          id: 'formatting-consistency',
          title: 'Standardize formatting and structure',
          description: 'Ensure consistent fonts, spacing, and section organization throughout',
          priority: 'low',
          category: 'Formatting',
          impact: 'Professional appearance',
          estimatedImprovement: 4,
          selected: false
        },
        {
          id: 'contact-optimization',
          title: 'Optimize contact information layout',
          description: 'Ensure contact details are ATS-friendly and easily accessible',
          priority: 'low',
          category: 'Structure',
          impact: 'Better contact parsing',
          estimatedImprovement: 3,
          selected: false
        }
      ];

      return [...recs, ...additionalRecs].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    };

    // Simulate loading
    setTimeout(() => {
      const analysis = mockAnalysis(job);
      const recs = generateRecommendations(analysis);
      
      setAtsAnalysis(analysis);
      setRecommendations(recs);
      setIsLoading(false);
    }, 1500);
  }, [job]);

  const toggleRecommendation = (id: string) => {
    setRecommendations(prev =>
      prev.map(rec =>
        rec.id === id ? { ...rec, selected: !rec.selected } : rec
      )
    );
  };

  const togglePrioritySection = (priority: string) => {
    setExpandedPriorities(prev => ({
      ...prev,
      [priority]: !prev[priority]
    }));
  };

  const applyAllPriority = (priority: 'high' | 'medium' | 'low', selected: boolean) => {
    setRecommendations(prev =>
      prev.map(rec =>
        rec.priority === priority ? { ...rec, selected } : rec
      )
    );
  };

  const applyAll = (selected: boolean) => {
    setRecommendations(prev =>
      prev.map(rec => ({ ...rec, selected }))
    );
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Target className="w-4 h-4" />;
      case 'low': return <Sparkles className="w-4 h-4" />;
    }
  };

  const selectedRecs = recommendations.filter(r => r.selected);
  const potentialImprovement = selectedRecs.reduce((sum, rec) => sum + rec.estimatedImprovement, 0);
  const newPredictedScore = atsAnalysis ? Math.min(95, atsAnalysis.currentScore + potentialImprovement) : 0;

  const getRecommendationsByPriority = (priority: 'high' | 'medium' | 'low') => {
    return recommendations.filter(r => r.priority === priority);
  };

  // Magic Transform Handler
  const handleMagicTransform = async () => {
    setIsMagicTransforming(true);
    
    try {
      // Auto-select high and medium priority recommendations
      const magicSelectedRecs = recommendations
        .filter(rec => rec.priority === 'high' || rec.priority === 'medium')
        .map(rec => rec.id);
      
      // Apply improvements and get the enhanced content
      const result = await applyImprovements(job.id, magicSelectedRecs);
      
      // Store the improved content for the preview page
      if (result && (result as any).improvedContent) {
        sessionStorage.setItem(`improvements-${job.id}`, JSON.stringify((result as any).improvedContent));
      }
      
      // Store selected recommendations
      sessionStorage.setItem(`recommendations-${job.id}`, JSON.stringify(magicSelectedRecs));
      
      // Show success message
      toast.success('✨ Magic transformation complete! Review your enhanced CV.');
      
      // Navigate to preview page to show the improvements
      navigate(`/preview/${job.id}`);
      
    } catch (error: any) {
      console.error('Magic transform error:', error);
      toast.error(error.message || 'Failed to apply magic transformation. Please try manual selection.');
      setIsMagicTransforming(false);
    }
  };

  // Get magic transform preview stats
  const magicSelectedRecs = recommendations.filter(rec => rec.priority === 'high' || rec.priority === 'medium');
  const magicPotentialImprovement = magicSelectedRecs.reduce((sum, rec) => sum + rec.estimatedImprovement, 0);
  const magicPredictedScore = atsAnalysis ? Math.min(95, atsAnalysis.currentScore + magicPotentialImprovement) : 0;

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100 mb-2">CV Analysis Complete</h1>
            <p className="text-gray-400">
              We've analyzed your CV and identified opportunities to enhance its impact and ATS compatibility.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Analysis Complete</span>
          </div>
        </div>
      </div>

      {/* Magic Transform Button */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg shadow-xl p-6 border border-purple-500/30">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                <Wand2 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-100">1-Click Magic Transform</h2>
            </div>
            <p className="text-gray-300 mb-3">
              Let our AI instantly apply the most impactful improvements to your CV. 
              <span className="font-semibold text-purple-300">
                Skip the preview and get your enhanced CV in seconds!
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span>{magicSelectedRecs.length} premium improvements included</span>
              </div>
              <div className="flex items-center gap-2 text-blue-700">
                <TrendingUp className="w-4 h-4" />
                <span>+{magicPotentialImprovement} ATS score points</span>
              </div>
              <div className="flex items-center gap-2 text-purple-700">
                <Target className="w-4 h-4" />
                <span>Predicted score: {magicPredictedScore}%</span>
              </div>
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <button
              onClick={handleMagicTransform}
              disabled={isMagicTransforming || magicSelectedRecs.length === 0}
              className="relative px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group overflow-hidden"
            >
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Button content */}
              <div className="relative flex items-center gap-3">
                {isMagicTransforming ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Transforming...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    <span>Magic Transform</span>
                    <Wand2 className="w-6 h-6" />
                  </>
                )}
              </div>
              
              {/* Sparkle animations */}
              {!isMagicTransforming && (
                <>
                  <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
                  <div className="absolute bottom-1 left-1 w-1 h-1 bg-yellow-300 rounded-full animate-ping animation-delay-1000"></div>
                  <div className="absolute top-1/2 left-0 w-1 h-1 bg-yellow-300 rounded-full animate-ping animation-delay-500"></div>
                </>
              )}
            </button>
            
            {magicSelectedRecs.length === 0 && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                No improvements available
              </p>
            )}
          </div>
        </div>
        
        {/* Magic Transform Loading State */}
        {isMagicTransforming && (
          <div className="mt-6 p-4 bg-white/50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-3 text-purple-700">
              <Loader2 className="w-5 h-5 animate-spin" />
              <div>
                <p className="font-medium">Applying magical improvements...</p>
                <p className="text-sm text-purple-600">This will take just a moment. Please don't close this page.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-600"></div>
        <span className="text-sm text-gray-400 font-medium px-4">OR CUSTOMIZE MANUALLY</span>
        <div className="flex-1 h-px bg-gray-600"></div>
      </div>

      {/* ATS Score Overview */}
      {atsAnalysis && (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Current Score */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-100">Current ATS Score</h3>
              <div className="flex items-center space-x-4">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white ${
                  atsAnalysis.currentScore >= 80 ? 'bg-green-500' : 
                  atsAnalysis.currentScore >= 60 ? 'bg-orange-500' : 'bg-red-500'
                }`}>
                  {atsAnalysis.currentScore}%
                </div>
                <div>
                  <p className="text-sm text-gray-400">
                    {atsAnalysis.passes ? '✅ Passes ATS screening' : '❌ Needs improvement'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Based on {atsAnalysis.issues.length + atsAnalysis.suggestions.length} factors analyzed
                  </p>
                </div>
              </div>
            </div>

            {/* Potential Score */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-100">Potential After Improvements</h3>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white bg-green-500">
                  {newPredictedScore}%
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-green-400 font-semibold">
                      +{newPredictedScore - atsAnalysis.currentScore}% improvement
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    With {selectedRecs.length} selected improvements
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Section */}
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-100">Improvement Recommendations</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => applyAll(true)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Apply All
            </button>
            <button
              onClick={() => applyAll(false)}
              className="px-4 py-2 text-sm bg-gray-600 text-gray-300 rounded-md hover:bg-gray-500 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Priority Sections */}
        {(['high', 'medium', 'low'] as const).map((priority) => {
          const priorityRecs = getRecommendationsByPriority(priority);
          const selectedCount = priorityRecs.filter(r => r.selected).length;
          const isExpanded = expandedPriorities[priority];

          if (priorityRecs.length === 0) return null;

          return (
            <div key={priority} className="mb-6 last:mb-0">
              {/* Priority Header */}
              <div 
                className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${getPriorityColor(priority)}`}
                onClick={() => togglePrioritySection(priority)}
              >
                <div className="flex items-center space-x-3">
                  {getPriorityIcon(priority)}
                  <div>
                    <h3 className="font-semibold capitalize">
                      {priority} Priority ({priorityRecs.length})
                    </h3>
                    <p className="text-sm opacity-75">
                      {selectedCount} of {priorityRecs.length} selected
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      applyAllPriority(priority, true);
                    }}
                    className="px-3 py-1 text-xs bg-gray-600 bg-opacity-50 text-gray-300 rounded hover:bg-opacity-75 transition-colors"
                  >
                    Select All
                  </button>
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>

              {/* Priority Recommendations */}
              {isExpanded && (
                <div className="mt-3 space-y-3">
                  {priorityRecs.map((rec, index) => (
                    <div
                      key={rec.id}
                      className={`p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] animate-fade-in-up ${
                        rec.selected 
                          ? 'border-blue-400 bg-blue-900/30 shadow-lg shadow-blue-500/20' 
                          : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700/70'
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                      onClick={() => toggleRecommendation(rec.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {rec.selected ? 
                            <CheckCircle className="w-5 h-5 text-blue-400" /> :
                            <Circle className="w-5 h-5 text-gray-500" />
                          }
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-100">{rec.title}</h4>
                              <p className="text-sm text-gray-400 mt-1">{rec.description}</p>
                            </div>
                            <div className="flex-shrink-0 ml-4">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/30">
                                +{rec.estimatedImprovement} pts
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-xs text-gray-500">
                              Category: {rec.category}
                            </span>
                            <span className="text-xs text-gray-500">
                              {rec.impact}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">
              {selectedRecs.length} improvements selected
              {potentialImprovement > 0 && (
                <span className="ml-2 text-green-400 font-medium">
                  (Potential +{potentialImprovement} ATS points)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {onBack && (
              <button
                onClick={onBack}
                className="px-6 py-2 text-gray-300 border border-gray-600 rounded-md hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={async () => {
                const selectedRecommendationIds = selectedRecs.map(r => r.id);
                
                // If recommendations are selected, apply them first
                if (selectedRecommendationIds.length > 0) {
                  try {
                    const result = await applyImprovements(job.id, selectedRecommendationIds);
                    
                    // Store the improved content for the preview page
                    if (result && (result as any).improvedContent) {
                      sessionStorage.setItem(`improvements-${job.id}`, JSON.stringify((result as any).improvedContent));
                    }
                    
                    toast.success(`Applied ${selectedRecommendationIds.length} improvements to your CV!`);
                  } catch (error: any) {
                    console.error('Apply improvements error:', error);
                    toast.error('Failed to apply some improvements. Continuing to preview...');
                  }
                }
                
                // Continue to preview
                onContinue(selectedRecommendationIds);
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors flex items-center space-x-2 shadow-lg"
            >
              <span>Apply & Preview</span>
              <span className="text-xs bg-blue-500 px-2 py-1 rounded-full">
                {selectedRecs.length}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};