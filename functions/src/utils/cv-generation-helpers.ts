/**
 * CV Generation Helper Functions
 * 
 * Utility functions supporting CV generation process.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Handle special features that require additional processing
 */
export async function handleSpecialFeatures(jobId: string, features?: string[]): Promise<void> {
  if (!features) return;

  try {
    // Handle podcast generation initialization
    if (features.includes('generate-podcast')) {
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          podcastStatus: 'generating',
          updatedAt: FieldValue.serverTimestamp()
        });
      
      console.log(`🎙️ Podcast generation initialized for job ${jobId}`);
    }

    // Handle other special features as needed
    // This maintains compatibility with existing feature handling
    
  } catch (error) {
    console.error('⚠️ Error handling special features:', error);
    // Don't throw - special features are non-critical
  }
}

/**
 * Handle generation errors with proper logging and status updates
 */
export async function handleGenerationError(jobId: string, error: any): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : '';
  
  try {
    const errorData = {
      status: 'failed',
      error: errorMessage,
      errorDetails: {
        type: 'generation_error',
        category: 'service_failure',
        retryable: isRetryableError(errorMessage),
        timestamp: new Date(),
        stack: errorStack.substring(0, 1000),
        version: '2.0.0'
      },
      updatedAt: FieldValue.serverTimestamp()
    };
    
    await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .update(errorData);
      
    console.log(`📝 Error details updated for job ${jobId}`);
    
  } catch (updateError) {
    console.error('❌ Failed to update job with error details:', updateError);
  }
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(errorMessage: string): boolean {
  const retryablePatterns = [
    'timeout',
    'network',
    'temporarily unavailable',
    'service unavailable',
    'internal error',
    'api limit',
    'quota exceeded'
  ];
  
  const lowerError = errorMessage.toLowerCase();
  return retryablePatterns.some(pattern => lowerError.includes(pattern));
}