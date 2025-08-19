/**
 * CV Validator Service
 * Handles job management, validation, and data retrieval operations
 */

import { 
  doc, 
  getDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../lib/firebase';
import { jobSubscriptionManager } from '../JobSubscriptionManager';
import type { Job } from '../../types/cv';

export class CVValidator {
  /**
   * Subscribe to job updates in real-time using centralized manager
   */
  static subscribeToJob(jobId: string, callback: (job: Job | null) => void) {
    return jobSubscriptionManager.subscribeToJob(jobId, callback, {
      enableLogging: process.env.NODE_ENV === 'development',
      debounceMs: 100,
      maxRetries: 3
    });
  }

  /**
   * Get a single job by ID
   */
  static async getJob(jobId: string): Promise<Job | null> {
    const docSnap = await getDoc(doc(db, 'jobs', jobId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Job;
    }
    return null;
  }

  /**
   * Get available templates
   */
  static async getTemplates(category?: string) {
    const getTemplatesFunction = httpsCallable(functions, 'getTemplates');
    const result = await getTemplatesFunction({ category, includePublic: true });
    return result.data;
  }

  /**
   * Validate job status and data integrity
   */
  static validateJobStatus(job: Job): boolean {
    const validStatuses = ['pending', 'processing', 'analyzed', 'generating', 'completed', 'failed'];
    return validStatuses.includes(job.status);
  }

  /**
   * Validate job settings
   */
  static validateJobSettings(settings: unknown): boolean {
    if (!settings) return true; // Settings are optional
    
    const requiredBooleanFields = [
      'applyAllEnhancements',
      'generateAllFormats',
      'enablePIIProtection',
      'createPodcast',
      'useRecommendedTemplate'
    ];

    return requiredBooleanFields.every(field => 
      typeof settings[field] === 'boolean'
    );
  }

  /**
   * Validate file upload parameters
   */
  static validateFileUpload(file: File): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];

    if (file.size > maxSize) {
      errors.push('File size must be less than 10MB');
    }

    if (!allowedTypes.includes(file.type)) {
      errors.push('File type must be PDF, DOCX, DOC, or TXT');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate URL input
   */
  static validateURL(url: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        errors.push('URL must use HTTP or HTTPS protocol');
      }
    } catch {
      errors.push('Invalid URL format');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}