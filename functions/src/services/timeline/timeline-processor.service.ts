/**
 * Timeline Processor Service - Main Orchestrator
 * Coordinates CV data processing and analysis with modular components
 */

import { ParsedCV } from '../../types/enhanced-models';
import { TimelineEvent, TimelineData } from '../types/timeline.types';
import { timelineProcessorCoreService } from './timeline-processor-core.service';
import { timelineProcessorInsightsService } from './timeline-processor-insights.service';
import { timelineUtilsService } from './timeline-utils.service';

export class TimelineProcessorService {
  
  /**
   * Helper function to safely extract technical skills from various skill formats
   */
  private getTechnicalSkills(skills: string[] | { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; } | undefined): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills; // Assume all are technical if it's an array
    return skills.technical || [];
  }
  
  /**
   * Process CV data into timeline events with comprehensive error handling
   */
  async processCV(parsedCV: ParsedCV): Promise<TimelineEvent[]> {
    console.log('[Timeline Processor] Starting CV processing...');
    
    try {
      const events = await timelineProcessorCoreService.processCV(parsedCV);
      console.log(`[Timeline Processor] Successfully processed ${events.length} timeline events`);
      return events;
    } catch (error) {
      console.error('[Timeline Processor] Error processing CV data:', error);
      throw error;
    }
  }
  
  /**
   * Generate summary data from events and CV
   */
  generateSummary(events: TimelineEvent[], cv: ParsedCV): TimelineData['summary'] {
    console.log('[Timeline Processor] Generating timeline summary...');
    
    try {
      const summary = timelineUtilsService.generateSummary(events, cv);
      console.log(`[Timeline Processor] Generated summary with ${summary.totalYearsExperience} years experience`);
      return summary;
    } catch (error) {
      console.error('[Timeline Processor] Error generating summary:', error);
      return {
        totalYearsExperience: 0,
        companiesWorked: 0,
        degreesEarned: 0,
        certificationsEarned: 0,
        careerHighlights: []
      };
    }
  }
  
  /**
   * Generate career insights from events and CV
   */
  async generateInsights(events: TimelineEvent[], cv: ParsedCV): Promise<TimelineData['insights']> {
    console.log('[Timeline Processor] Generating career insights...');
    
    try {
      const insights = await timelineProcessorInsightsService.generateInsights(events, cv);
      console.log(`[Timeline Processor] Generated insights with focus on ${insights.industryFocus.join(', ')}`);
      return insights;
    } catch (error) {
      console.error('[Timeline Processor] Error generating insights:', error);
      return {
        careerProgression: 'Career progression analysis not available',
        industryFocus: [],
        skillEvolution: 'Skill evolution analysis not available',
        nextSteps: []
      };
    }
  }
}

export const timelineProcessorService = new TimelineProcessorService();