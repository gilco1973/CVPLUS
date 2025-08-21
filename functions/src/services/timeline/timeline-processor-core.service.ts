/**
 * Timeline Processor Core Service
 * Core CV data processing orchestrator
 */

import { ParsedCV } from '../../types/enhanced-models';
import { TimelineEvent } from '../types/timeline.types';
import { timelineProcessorEventsService } from './timeline-processor-events.service';

export class TimelineProcessorCoreService {
  
  /**
   * Process CV data into timeline events with comprehensive error handling
   */
  async processCV(parsedCV: ParsedCV): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];
    let processingErrors = 0;
    
    console.log('[Timeline Processor Core] Starting CV data processing...');
    
    // Process work experience
    if (parsedCV.experience) {
      console.log(`[Timeline Processor Core] Processing ${parsedCV.experience.length} work experiences`);
      for (const exp of parsedCV.experience) {
        try {
          const workEvent = timelineProcessorEventsService.processWorkExperience(exp, events.length);
          if (workEvent) {
            events.push(workEvent);
          }
        } catch (error) {
          console.error(`[Timeline Processor Core] Error processing work experience:`, error);
          processingErrors++;
        }
      }
    }
    
    // Process education
    if (parsedCV.education) {
      console.log(`[Timeline Processor Core] Processing ${parsedCV.education.length} education entries`);
      for (const edu of parsedCV.education) {
        try {
          const eduEvent = timelineProcessorEventsService.processEducation(edu, events.length);
          if (eduEvent) {
            events.push(eduEvent);
          }
        } catch (error) {
          console.error(`[Timeline Processor Core] Error processing education:`, error);
          processingErrors++;
        }
      }
    }
    
    // Process certifications
    if (parsedCV.certifications) {
      console.log(`[Timeline Processor Core] Processing ${parsedCV.certifications.length} certifications`);
      for (const cert of parsedCV.certifications) {
        try {
          const certEvent = timelineProcessorEventsService.processCertification(cert, events.length);
          if (certEvent) {
            events.push(certEvent);
          }
        } catch (error) {
          console.error(`[Timeline Processor Core] Error processing certification:`, error);
          processingErrors++;
        }
      }
    }
    
    // Process achievements
    if (parsedCV.achievements && Array.isArray(parsedCV.achievements)) {
      console.log(`[Timeline Processor Core] Processing ${parsedCV.achievements.length} achievements`);
      for (const achievement of parsedCV.achievements) {
        try {
          const achievementEvent = timelineProcessorEventsService.processAchievement(achievement, events.length, parsedCV);
          if (achievementEvent) {
            events.push(achievementEvent);
          }
        } catch (error) {
          console.error(`[Timeline Processor Core] Error processing achievement:`, error);
          processingErrors++;
        }
      }
    }
    
    // Sort events by start date
    try {
      events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      console.log('[Timeline Processor Core] Successfully sorted events by start date');
    } catch (error) {
      console.error('[Timeline Processor Core] Error sorting events by date:', error);
    }
    
    console.log(`[Timeline Processor Core] Processing completed: ${events.length} events generated with ${processingErrors} errors`);
    return events;
  }
}

export const timelineProcessorCoreService = new TimelineProcessorCoreService();