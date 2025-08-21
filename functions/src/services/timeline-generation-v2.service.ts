/**
 * Timeline Generation Service V2 - Modular Architecture
 * Creates interactive timeline visualization from CV data with bulletproof validation
 */

import { ParsedCV } from '../types/enhanced-models';
import { TimelineEvent, TimelineData } from './types/timeline.types';
import { timelineSanitizerService } from './timeline/timeline-sanitizer.service';
import { timelineProcessorService } from './timeline/timeline-processor.service';
import { TimelineStorageService } from './timeline/timeline-storage.service';

export class TimelineGenerationServiceV2 {
  
  private storage = new TimelineStorageService();
  
  /**
   * Generate timeline data from parsed CV with enhanced validation
   */
  async generateTimeline(parsedCV: ParsedCV, jobId: string): Promise<TimelineData> {
    console.log(`[Timeline Service V2] Starting timeline generation for job: ${jobId}`);
    
    // Input validation
    if (!parsedCV) {
      throw new Error('ParsedCV is required for timeline generation');
    }
    
    if (!jobId || typeof jobId !== 'string' || jobId.trim().length === 0) {
      throw new Error('Valid jobId is required for timeline generation');
    }
    
    try {
      // Process CV data into timeline events with comprehensive error handling
      const events = await timelineProcessorService.processCV(parsedCV);
      
      // Generate summary and insights
      const summary = timelineProcessorService.generateSummary(events, parsedCV);
      const insights = await timelineProcessorService.generateInsights(events, parsedCV);
      
      const timelineData: TimelineData = { events, summary, insights };
      
      // Clean and validate data with bulletproof sanitization
      const cleanedData = timelineSanitizerService.cleanTimelineData(timelineData);
      
      // Store timeline data with enhanced error handling and retry logic
      await this.storage.storeTimelineData(jobId, cleanedData);
      
      console.log(`[Timeline Service V2] Successfully generated timeline for job: ${jobId}`);
      return timelineData;
      
    } catch (error) {
      console.error(`[Timeline Service V2] Failed to generate timeline for job ${jobId}:`, error);
      throw error;
    }
  }
  
  /**
   * Validate timeline data without storing it (for testing)
   */
  async validateTimelineData(parsedCV: ParsedCV): Promise<{ isValid: boolean; errors: string[]; data?: TimelineData }> {
    try {
      const events = await timelineProcessorService.processCV(parsedCV);
      const summary = timelineProcessorService.generateSummary(events, parsedCV);
      const insights = await timelineProcessorService.generateInsights(events, parsedCV);
      
      const timelineData: TimelineData = { events, summary, insights };
      const cleanedData = timelineSanitizerService.cleanTimelineData(timelineData);
      
      // Validate that cleaned data has no undefined values
      const serializedData = JSON.stringify(cleanedData);
      const hasUndefined = serializedData.includes('undefined');
      
      if (hasUndefined) {
        return {
          isValid: false,
          errors: ['Timeline data contains undefined values after cleaning'],
          data: timelineData
        };
      }
      
      return {
        isValid: true,
        errors: [],
        data: timelineData
      };
      
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        data: undefined
      };
    }
  }
}

export const timelineGenerationServiceV2 = new TimelineGenerationServiceV2();