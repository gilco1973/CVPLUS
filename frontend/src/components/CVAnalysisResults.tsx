import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, Circle, AlertTriangle, Target, Sparkles, TrendingUp, Wand2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { applyImprovements } from '../services/cvService';
import { CVServiceCore } from '../services/cv/CVServiceCore';
import type { Job } from '../services/cvService';
import toast from 'react-hot-toast';
import { recommendationsDebugger } from '../utils/debugRecommendations';
import { navigationTest } from '../utils/navigationTest';

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
  const isMountedRef = useRef(true);
  const [loadedJobId, setLoadedJobId] = useState<string | null>(null);

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Simple load function - RequestManager handles all duplicate prevention
  const loadAnalysisAndRecommendations = async () => {
    // Skip if already loaded for this job
    if (loadedJobId === job.id) {
      console.log(`[CVAnalysisResults] Already loaded for job ${job.id}`);
      return;
    }

    console.log(`[CVAnalysisResults] Loading recommendations for job ${job.id}`);
    
    try {
      // Check if component is still mounted
      if (!isMountedRef.current) return;
      
      setIsLoading(true);
      setLoadedJobId(job.id);
      
      // Generate mock ATS analysis (this can be replaced with real analysis later)
      const mockAnalysis: ATSAnalysis = {
        currentScore: 72,
        predictedScore: 85,
        issues: [
          { message: 'Missing professional summary section', severity: 'error' as const, category: 'Structure' },
          { message: 'Date format inconsistency detected', severity: 'warning' as const, category: 'Formatting' },
          { message: 'Skills section needs better keyword density', severity: 'warning' as const, category: 'Keywords' }
        ],
        suggestions: [
          { reason: 'Add action verbs to experience descriptions', impact: 'High', category: 'Content' },
          { reason: 'Include industry-specific keywords', impact: 'Medium', category: 'Keywords' },
          { reason: 'Quantify achievements with metrics', impact: 'High', category: 'Impact' },
          { reason: 'Optimize section headings for ATS scanning', impact: 'Medium', category: 'Structure' }
        ],
        overall: 72,
        passes: true
      };
      
      // Check if component is still mounted before setting state
      if (!isMountedRef.current) return;
      setAtsAnalysis(mockAnalysis);
      
      // Get real recommendations from backend using RequestManager (zero-tolerance duplicate prevention)
      console.log(`[CVAnalysisResults] Calling CVServiceCore.getRecommendations for job: ${job.id}`);
      recommendationsDebugger.trackCall(job.id, 'CVAnalysisResults.loadAnalysisAndRecommendations');
      
      const recommendationsData = await CVServiceCore.getRecommendations(job.id);
      
      console.log(`[CVAnalysisResults] getRecommendations completed for job: ${job.id}`);
      console.log('Raw recommendations data:', recommendationsData);
      console.log('Response structure keys:', Object.keys(recommendationsData || {}));
      
      if (recommendationsData?.data) {
        console.log('Data structure keys:', Object.keys(recommendationsData.data));
        console.log('Recommendations array length:', recommendationsData.data.recommendations?.length || 0);
      }
      
      // Transform backend recommendations to frontend format
      if (recommendationsData && recommendationsData.data && recommendationsData.data.recommendations) {
        const backendRecs = recommendationsData.data.recommendations;
        const transformedRecommendations: RecommendationItem[] = backendRecs.map((rec: any) => {
          // Map backend impact to frontend priority
          let frontendPriority: 'high' | 'medium' | 'low';
          if (rec.impact === 'high' || rec.priority >= 8) {
            frontendPriority = 'high';
          } else if (rec.impact === 'medium' || rec.priority >= 5) {
            frontendPriority = 'medium';
          } else {
            frontendPriority = 'low';
          }
          
          return {
            id: rec.id,
            title: rec.title || 'CV Improvement',
            description: rec.description || 'Enhance your CV content',
            priority: frontendPriority,
            category: rec.category || rec.section || 'General',
            impact: rec.description || `${rec.impact || 'medium'} impact improvement`,
            estimatedImprovement: rec.estimatedScoreImprovement || 5,
            selected: frontendPriority === 'high' // Auto-select high priority items
          };
        });
        
        console.log('Transformed recommendations:', transformedRecommendations);
        
        // Check if component is still mounted before setting state
        if (!isMountedRef.current) return;
        setRecommendations(transformedRecommendations);
        
      } else if (recommendationsData && recommendationsData.recommendations) {
        // Handle direct recommendations array (fallback format)
        const transformedRecommendations: RecommendationItem[] = recommendationsData.recommendations.map((rec: any) => {
          let frontendPriority: 'high' | 'medium' | 'low';
          if (rec.impact === 'high' || rec.priority >= 8) {
            frontendPriority = 'high';
          } else if (rec.impact === 'medium' || rec.priority >= 5) {
            frontendPriority = 'medium';
          } else {
            frontendPriority = 'low';
          }
          
          return {
            id: rec.id,
            title: rec.title || 'CV Improvement',
            description: rec.description || 'Enhance your CV content',
            priority: frontendPriority,
            category: rec.category || rec.section || 'General',
            impact: rec.description || `${rec.impact || 'medium'} impact improvement`,
            estimatedImprovement: rec.estimatedScoreImprovement || 5,
            selected: frontendPriority === 'high'
          };
        });
        
        console.log('Transformed recommendations (fallback):', transformedRecommendations);
        
        // Check if component is still mounted before setting state
        if (!isMountedRef.current) return;
        setRecommendations(transformedRecommendations);
        
      } else {
        console.warn('No recommendations found in response, using empty array');
        
        // Check if component is still mounted before setting state
        if (!isMountedRef.current) return;
        setRecommendations([]);
      }
      
    } catch (error) {
      console.error(`[CVAnalysisResults] Error loading recommendations for job ${job.id}:`, error);
      toast.error('Failed to load recommendations. Please try again.');
      
      // Check if component is still mounted before setting state
      if (!isMountedRef.current) return;
      
      setRecommendations([]);
      
      // Set basic analysis for fallback
      const fallbackAnalysis: ATSAnalysis = {
        currentScore: 70,
        predictedScore: 75,
        issues: [],
        suggestions: [],
        overall: 70,
        passes: true
      };
      
      setAtsAnalysis(fallbackAnalysis);
    } finally {
      // Check if component is still mounted before setting state
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Load recommendations when job changes - RequestManager handles all deduplication
  useEffect(() => {
    console.log(`[CVAnalysisResults] useEffect triggered for job ${job.id}, loadedJobId: ${loadedJobId}`);
    
    // Reset state if job changed
    if (loadedJobId && loadedJobId !== job.id) {
      console.log(`[CVAnalysisResults] Job changed from ${loadedJobId} to ${job.id}, resetting state`);
      setRecommendations([]);
      setAtsAnalysis(null);
      setIsLoading(true);
      setLoadedJobId(null);
    }
    
    // Load if not already loaded for this job
    if (loadedJobId !== job.id) {
      loadAnalysisAndRecommendations();
    }
  }, [job.id]); // Simple dependency - RequestManager handles all complexity

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
    if (recommendations.length === 0) {
      toast.error('No recommendations available for magic transformation.');
      return;
    }
    
    setIsMagicTransforming(true);
    
    try {
      // Auto-select high and medium priority recommendations
      const magicSelectedRecs = recommendations
        .filter(rec => rec.priority === 'high' || rec.priority === 'medium')
        .map(rec => rec.id);
      
      console.log('🪄 [DEBUG] Magic transform applying improvements with IDs:', magicSelectedRecs);
      
      if (magicSelectedRecs.length === 0) {
        toast.error('No high or medium priority recommendations available.');
        setIsMagicTransforming(false);
        return;
      }
      
      // Apply improvements and get the enhanced content
      const result = await applyImprovements(job.id, magicSelectedRecs);
      console.log('✨ [DEBUG] Magic transform result:', result);
      
      // Store the improved content for the preview page
      if (result && (result as any).improvedContent) {
        sessionStorage.setItem(`improvements-${job.id}`, JSON.stringify((result as any).improvedContent));
        console.log('💾 [DEBUG] Magic transform stored improvements in sessionStorage');
      }
      
      // Store selected recommendations
      sessionStorage.setItem(`recommendations-${job.id}`, JSON.stringify(magicSelectedRecs));
      console.log('💾 [DEBUG] Magic transform stored recommendations in sessionStorage');
      
      // Show success message
      toast.success('✨ Magic transformation complete! Review your enhanced CV.');
      
      // Navigate to preview page for feature selection and customization
      const targetPath = `/preview/${job.id}`;
      console.log('🚀 [DEBUG] Magic transform navigating to:', targetPath);
      navigate(targetPath);
      console.log('✅ [DEBUG] Magic transform navigation completed');
      
    } catch (error: any) {
      console.error('💥 [DEBUG] Magic transform error:', error);
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
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-600 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-600 rounded w-3/4 mb-6"></div>
            
            <div className="flex items-center gap-3 mt-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <span className="text-gray-300">Loading personalized recommendations...</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-4">
                <div className="h-6 bg-gray-600 rounded w-1/3"></div>
                <div className="h-32 bg-gray-600 rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-6 bg-gray-600 rounded w-1/2"></div>
                <div className="h-20 bg-gray-600 rounded"></div>
                <div className="h-20 bg-gray-600 rounded"></div>
                <div className="h-20 bg-gray-600 rounded"></div>
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
              disabled={isMagicTransforming || magicSelectedRecs.length === 0 || recommendations.length === 0}
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
            
            {(magicSelectedRecs.length === 0 || recommendations.length === 0) && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                {recommendations.length === 0 ? 'No recommendations loaded' : 'No improvements available'}
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
            {recommendations.length > 0 ? (
              <>
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
              </>
            ) : (
              <span className="text-sm text-gray-400">No recommendations available</span>
            )}
          </div>
        </div>

        {/* No Recommendations Message */}
        {recommendations.length === 0 && (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No recommendations available</h3>
            <p className="text-gray-500">
              We couldn't generate recommendations for this CV at the moment. 
              Please try again later or contact support if the issue persists.
            </p>
          </div>
        )}
        
        {/* Priority Sections */}
        {recommendations.length > 0 && (['high', 'medium', 'low'] as const).map((priority) => {
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
                console.log('🔍 [DEBUG] Apply & Preview button clicked');
                const selectedRecommendationIds = selectedRecs.map(r => r.id);
                console.log('🔍 [DEBUG] Selected recommendation IDs:', selectedRecommendationIds);
                
                // Run navigation tests first
                console.log('🧪 [DEBUG] Running navigation diagnostic tests...');
                navigationTest.runAllTests(navigate, job.id);
                
                // Set a timeout to ensure navigation happens within 10 seconds
                const navigationTimeout = setTimeout(() => {
                  console.log('⏰ [DEBUG] Navigation timeout triggered - forcing navigation');
                  toast.warning('Taking longer than expected. Navigating to preview...');
                  try {
                    onContinue(selectedRecommendationIds);
                  } catch (error: any) {
                    console.error('💥 [DEBUG] Timeout navigation failed:', error);
                    // Direct navigation as last resort
                    navigate(`/preview/${job.id}`);
                  }
                }, 10000);

                try {
                  // If recommendations are selected, apply them first
                  if (selectedRecommendationIds.length > 0) {
                    console.log('🔄 [DEBUG] Applying improvements...');
                    try {
                      const result = await applyImprovements(job.id, selectedRecommendationIds);
                      console.log('✅ [DEBUG] Apply improvements completed successfully:', result);
                      
                      // Store the improved content for the preview page
                      if (result && (result as any).improvedContent) {
                        sessionStorage.setItem(`improvements-${job.id}`, JSON.stringify((result as any).improvedContent));
                        console.log('💾 [DEBUG] Stored improvements in sessionStorage');
                      }
                      
                      toast.success(`Applied ${selectedRecommendationIds.length} improvements to your CV!`);
                    } catch (error: any) {
                      console.error('❌ [DEBUG] Apply improvements error:', error);
                      toast.error(error.message || 'Failed to apply some improvements. Continuing to preview...');
                      // Continue anyway - don't let this stop navigation
                    }
                  } else {
                    console.log('⏭️ [DEBUG] No recommendations selected, proceeding to preview');
                  }
                  
                  // Clear the timeout since we're proceeding normally
                  clearTimeout(navigationTimeout);
                  
                  // Always continue to preview regardless of apply improvements outcome
                  console.log('🚀 [DEBUG] Calling onContinue with selectedRecommendationIds:', selectedRecommendationIds);
                  console.log('🚀 [DEBUG] Job ID:', job.id);
                  onContinue(selectedRecommendationIds);
                  console.log('✅ [DEBUG] onContinue called successfully');
                  
                } catch (error: any) {
                  console.error('💥 [DEBUG] Unexpected error in Apply & Preview handler:', error);
                  toast.error('Unexpected error occurred. Navigating to preview anyway...');
                  
                  // Clear timeout on error
                  clearTimeout(navigationTimeout);
                  
                  // Try to navigate anyway
                  try {
                    console.log('🔄 [DEBUG] Attempting navigation as fallback...');
                    onContinue(selectedRecommendationIds);
                  } catch (navError: any) {
                    console.error('💥 [DEBUG] Navigation fallback also failed:', navError);
                    // Direct navigation as absolute last resort
                    console.log('🚑 [DEBUG] Using direct navigation as last resort');
                    navigate(`/preview/${job.id}`);
                  }
                }
              }}
              disabled={recommendations.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors flex items-center space-x-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{selectedRecs.length > 0 ? 'Apply & Preview' : 'Continue to Preview'}</span>
              {selectedRecs.length > 0 && (
                <span className="text-xs bg-blue-500 px-2 py-1 rounded-full">
                  {selectedRecs.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};