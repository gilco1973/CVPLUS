import { useEffect } from 'react';
import { useCVAnalysisState } from './useCVAnalysisState';
import { useCVAnalysisErrorRecovery } from './useCVAnalysisErrorRecovery';
import { getRecommendations } from '../services/cvService';
import type { RecommendationItem } from '../contexts/CVAnalysisContext';

/**
 * Custom hook for loading and processing CV recommendations
 * Handles API calls, data transformation, and error recovery
 * Part of Phase 4 modularization - extracted from main component
 */
export function useRecommendationLoader(jobId: string) {
  const {
    setRecommendations,
    setATSAnalysis,
    setLoading,
    setOriginalCVData
  } = useCVAnalysisState();

  const { handleRecommendationLoadError } = useCVAnalysisErrorRecovery();

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        setLoading(true);
        console.log(`[useRecommendationLoader] Loading recommendations for job: ${jobId}`);
        const response = await getRecommendations(jobId);
        
        console.log(`[useRecommendationLoader] Received response:`, response);
        console.log(`[useRecommendationLoader] Has recommendations:`, !!(response.data?.recommendations || response.recommendations));
        console.log(`[useRecommendationLoader] Recommendations count:`, (response.data?.recommendations || response.recommendations)?.length || 0);
        
        // Handle nested response structure: response.data.recommendations or response.recommendations
        const recommendations = response.data?.recommendations || response.recommendations;
        if (recommendations) {
          const processedRecommendations: RecommendationItem[] = recommendations.map((rec: any, index: number) => ({
            id: typeof rec.id === 'string' ? rec.id : `rec-${index}-${Math.random()}`,
            title: typeof rec.title === 'string' ? rec.title : 'CV Improvement',
            description: typeof rec.description === 'string' ? rec.description : 'Enhance your CV content',
            priority: rec.impact === 'high' || (typeof rec.priority === 'number' && rec.priority >= 8) ? 'high' :
                     rec.impact === 'medium' || (typeof rec.priority === 'number' && rec.priority >= 5) ? 'medium' : 'low',
            category: typeof rec.category === 'string' ? rec.category : 
                     typeof rec.section === 'string' ? rec.section : 'General',
            impact: typeof rec.description === 'string' ? rec.description : 
                   typeof rec.impact === 'string' ? rec.impact : 'Improve content quality',
            estimatedImprovement: typeof rec.estimatedScoreImprovement === 'number' ? 
                                 rec.estimatedScoreImprovement : Math.floor(Math.random() * 10) + 3,
            selected: false
          }));

          console.log(`[useRecommendationLoader] Setting ${processedRecommendations.length} recommendations in context`);
          setRecommendations(processedRecommendations);
        } else {
          console.warn(`[useRecommendationLoader] No recommendations found in response`);
        }

        // Handle nested response structure for other data too
        const atsAnalysis = response.data?.atsAnalysis || response.atsAnalysis;
        if (atsAnalysis) {
          setATSAnalysis(atsAnalysis);
        }

        const originalCVData = response.data?.originalCVData || response.originalCVData;
        if (originalCVData) {
          setOriginalCVData(originalCVData);
        }

        setLoading(false);
      } catch (error) {
        console.error(`[useRecommendationLoader] Error loading recommendations:`, error);
        handleRecommendationLoadError(error);
      }
    };

    loadRecommendations();
  }, [jobId, setRecommendations, setATSAnalysis, setOriginalCVData, setLoading, handleRecommendationLoadError]);

  // Return retry function for error recovery
  return {
    retryLoad: () => getRecommendations(jobId)
  };
}