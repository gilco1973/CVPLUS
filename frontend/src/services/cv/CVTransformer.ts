/**
 * CV Transformer Service
 * Handles CV transformations, improvements, and optimization applications
 */

import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../../lib/firebase';

export class CVTransformer {
  /**
   * Apply ATS optimizations to CV
   */
  static async applyATSOptimizations(jobId: string, optimizations: any) {
    const applyATSFunction = httpsCallable(functions, 'applyATSOptimizations');
    const result = await applyATSFunction({
      jobId,
      optimizations
    });
    return result.data;
  }

  /**
   * Apply selected improvements to CV
   */
  static async applyImprovements(
    jobId: string, 
    selectedRecommendationIds: string[], 
    targetRole?: string, 
    industryKeywords?: string[]
  ) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    const token = await user.getIdToken();
    
    try {
      // First try the callable function
      const applyImprovementsFunction = httpsCallable(functions, 'applyImprovements');
      const result = await applyImprovementsFunction({
        jobId,
        selectedRecommendationIds,
        targetRole,
        industryKeywords
      });
      return result.data;
    } catch (error: any) {
      console.warn('Callable function failed, trying direct HTTP call:', error);
      
      // Fallback to direct HTTP call to V2 function
      const response = await fetch(`https://us-central1-getmycv-ai.cloudfunctions.net/applyImprovementsV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: {
            jobId,
            selectedRecommendationIds,
            targetRole,
            industryKeywords
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
   * Update skills data
   */
  static async updateSkillsData(jobId: string, skillsUpdate: any) {
    const updateSkillsFunction = httpsCallable(functions, 'updateSkillsData');
    const result = await updateSkillsFunction({
      jobId,
      skillsUpdate
    });
    return result.data;
  }

  /**
   * Endorse a skill
   */
  static async endorseSkill(jobId: string, skillName: string, endorserInfo?: any) {
    const endorseFunction = httpsCallable(functions, 'endorseSkill');
    const result = await endorseFunction({
      jobId,
      skillName,
      endorserInfo
    });
    return result.data;
  }

  /**
   * Update timeline event
   */
  static async updateTimelineEvent(jobId: string, eventId: string, updates: any) {
    const updateFunction = httpsCallable(functions, 'updateTimelineEvent');
    const result = await updateFunction({
      jobId,
      eventId,
      updates
    });
    return result.data;
  }

  /**
   * Export timeline in various formats
   */
  static async exportTimeline(jobId: string, format: 'json' | 'csv' | 'html' = 'json') {
    const exportFunction = httpsCallable(functions, 'exportTimeline');
    const result = await exportFunction({
      jobId,
      format
    });
    return result.data;
  }

  /**
   * Update language proficiency
   */
  static async updateLanguageProficiency(jobId: string, languageId: string, updates: any) {
    const updateFunction = httpsCallable(functions, 'updateLanguageProficiency');
    const result = await updateFunction({ jobId, languageId, updates });
    return result.data;
  }

  /**
   * Add language proficiency
   */
  static async addLanguageProficiency(jobId: string, language: any) {
    const addFunction = httpsCallable(functions, 'addLanguageProficiency');
    const result = await addFunction({ jobId, language });
    return result.data;
  }

  /**
   * Remove language proficiency
   */
  static async removeLanguageProficiency(jobId: string, languageId: string) {
    const removeFunction = httpsCallable(functions, 'removeLanguageProficiency');
    const result = await removeFunction({ jobId, languageId });
    return result.data;
  }
}