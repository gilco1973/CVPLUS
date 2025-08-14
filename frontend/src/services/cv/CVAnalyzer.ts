/**
 * CV Analyzer Service
 * Handles CV analysis, insights, recommendations, and ATS optimization
 */

import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../../lib/firebase';
import type { CVAnalysisParams } from '../../types/cv';

export class CVAnalyzer {
  /**
   * Analyze CV content
   */
  static async analyzeCV(params: CVAnalysisParams) {
    const { parsedCV, targetRole } = params;
    const analyzeCVFunction = httpsCallable(functions, 'analyzeCV');
    const result = await analyzeCVFunction({
      parsedCV,
      targetRole
    });
    return result.data;
  }

  /**
   * Enhanced CV analysis with more parameters
   */
  static async enhancedAnalyzeCV(params: CVAnalysisParams) {
    const { parsedCV, targetRole, jobDescription, industryKeywords, jobId } = params;
    const enhancedAnalyzeCVFunction = httpsCallable(functions, 'enhancedAnalyzeCV');
    const result = await enhancedAnalyzeCVFunction({
      parsedCV,
      targetRole,
      jobDescription,
      industryKeywords,
      jobId
    });
    return result.data;
  }

  /**
   * Analyze ATS compatibility
   */
  static async analyzeATSCompatibility(jobId: string, targetRole?: string, targetKeywords?: string[]) {
    const analyzeATSFunction = httpsCallable(functions, 'analyzeATSCompatibility');
    const result = await analyzeATSFunction({
      jobId,
      targetRole,
      targetKeywords
    });
    return result.data;
  }

  /**
   * Generate ATS keywords from job description
   */
  static async generateATSKeywords(jobDescription: string, industry?: string, role?: string) {
    const generateKeywordsFunction = httpsCallable(functions, 'generateATSKeywords');
    const result = await generateKeywordsFunction({
      jobDescription,
      industry,
      role
    });
    return result.data;
  }

  /**
   * Get CV improvement recommendations
   */
  static async getRecommendations(
    jobId: string, 
    targetRole?: string, 
    industryKeywords?: string[], 
    forceRegenerate?: boolean
  ) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    const token = await user.getIdToken();
    
    try {
      // First try the callable function
      const getRecommendationsFunction = httpsCallable(functions, 'getRecommendations');
      const result = await getRecommendationsFunction({
        jobId,
        targetRole,
        industryKeywords,
        forceRegenerate
      });
      return result.data;
    } catch (error: any) {
      console.warn('Callable function failed, trying direct HTTP call:', error);
      
      // Fallback to direct HTTP call to V2 function
      const response = await fetch(`https://us-central1-getmycv-ai.cloudfunctions.net/getRecommendationsV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: {
            jobId,
            targetRole,
            industryKeywords,
            forceRegenerate
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.result;
    }
  }

  /**
   * Preview a specific improvement recommendation
   */
  static async previewImprovement(jobId: string, recommendationId: string) {
    const previewImprovementFunction = httpsCallable(functions, 'previewImprovement');
    const result = await previewImprovementFunction({
      jobId,
      recommendationId
    });
    return result.data;
  }

  /**
   * Analyze achievements
   */
  static async analyzeAchievements(jobId: string) {
    const analyzeFunction = httpsCallable(functions, 'analyzeAchievements');
    const result = await analyzeFunction({ jobId });
    return result.data;
  }

  /**
   * Generate achievement showcase
   */
  static async generateAchievementShowcase(jobId: string, maxAchievements: number = 6) {
    const showcaseFunction = httpsCallable(functions, 'generateAchievementShowcase');
    const result = await showcaseFunction({ jobId, maxAchievements });
    return result.data;
  }
}