import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { corsOptions } from '../config/cors';

// Import the existing generateCV function for background processing
import { generateCV } from './generateCV';

export const initiateCVGeneration = onCall(
  {
    timeoutSeconds: 60, // Quick initialization only
    memory: '1GiB',
    ...corsOptions
  },
  async (request) => {
    console.log('initiateCVGeneration function called');
    
    // Step 1: Quick validation and authentication
    if (!request.auth) {
      console.error('Authentication failed: No auth token');
      throw new Error('User must be authenticated');
    }

    const { jobId, templateId, features } = request.data;
    const userId = request.auth.uid;
    
    console.log('User authenticated:', userId);
    console.log('Initiating CV generation for job:', jobId);
    console.log('Selected features:', features);

    try {
      // Step 2: Validate job existence and ownership
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }

      const jobData = jobDoc.data();
      
      // Verify user ownership
      if (jobData?.userId !== userId) {
        throw new Error('Unauthorized access to job');
      }

      // Ensure parsed data exists
      if (!jobData?.parsedData) {
        throw new Error('No parsed CV data found');
      }

      // Step 3: Initialize job with 'processing' status and feature tracking
      const selectedFeatures = features || [];
      const enhancedFeatures = initializeFeatureTracking(selectedFeatures);
      const estimatedTime = calculateEstimatedTime(selectedFeatures);
      
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          status: 'generating',
          selectedTemplate: templateId,
          selectedFeatures: selectedFeatures,
          enhancedFeatures: enhancedFeatures,
          generationStartedAt: FieldValue.serverTimestamp(),
          estimatedCompletionTime: new Date(Date.now() + estimatedTime * 1000),
          updatedAt: FieldValue.serverTimestamp()
        });

      // Step 4: Trigger background generateCV processing (fire-and-forget)
      console.log('Triggering background CV generation process...');
      setImmediate(async () => {
        try {
          console.log('Background generateCV started for job:', jobId);
          await generateCV.run({
            auth: request.auth,
            data: { jobId, templateId, features }
          } as any);
          console.log('Background generateCV completed for job:', jobId);
        } catch (error) {
          console.error('Background generateCV failed for job:', jobId, error);
          // Update job status to failed
          await admin.firestore()
            .collection('jobs')
            .doc(jobId)
            .update({
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error during background processing',
              updatedAt: FieldValue.serverTimestamp()
            });
        }
      });

      // Step 5: Return immediately with job status
      console.log('CV generation initiated successfully for job:', jobId);
      return {
        success: true,
        jobId: jobId,
        status: 'initiated',
        selectedFeatures: selectedFeatures,
        estimatedTime: estimatedTime,
        message: `CV generation started with ${selectedFeatures.length} features. Estimated completion in ${Math.ceil(estimatedTime / 60)} minutes.`
      };

    } catch (error: any) {
      console.error('Error initiating CV generation:', error.message);
      console.error('Error stack:', error.stack);
      
      // Update job status to failed if possible
      try {
        await admin.firestore()
          .collection('jobs')
          .doc(jobId)
          .update({
            status: 'failed',
            error: error.message,
            updatedAt: FieldValue.serverTimestamp()
          });
      } catch (updateError: any) {
        console.error('Failed to update job status:', updateError);
      }
      
      throw new Error(`Failed to initiate CV generation: ${error.message}`);
    }
  });

/**
 * Initialize feature tracking structure with all selected features set to 'pending' status
 */
function initializeFeatureTracking(selectedFeatures: string[]): Record<string, any> {
  const enhancedFeatures: Record<string, any> = {};
  
  for (const feature of selectedFeatures) {
    enhancedFeatures[feature] = {
      status: 'pending',
      progress: 0,
      currentStep: 'Queued for processing',
      enabled: true,
      queuedAt: new Date(),
      estimatedTimeRemaining: getFeatureEstimatedTime(feature)
    };
  }
  
  return enhancedFeatures;
}

/**
 * Calculate total estimated time based on number and type of features
 */
function calculateEstimatedTime(features: string[]): number {
  if (!features || features.length === 0) {
    return 60; // Base CV generation: 1 minute
  }

  let totalTime = 60; // Base CV generation time
  
  for (const feature of features) {
    totalTime += getFeatureEstimatedTime(feature);
  }
  
  // Add buffer time for coordination between features (10% overhead)
  totalTime = Math.ceil(totalTime * 1.1);
  
  return totalTime;
}

/**
 * Get estimated processing time for individual features (in seconds)
 */
function getFeatureEstimatedTime(feature: string): number {
  const featureTimings: Record<string, number> = {
    // Fast features (30-60 seconds)
    'skills-visualization': 45,
    'language-proficiency': 30,
    'social-media-links': 20,
    'embed-qr-code': 25,
    'privacy-mode': 15,
    
    // Medium features (1-2 minutes)
    'ats-optimization': 90,
    'achievement-highlighting': 75,
    'certification-badges': 60,
    'interactive-timeline': 90,
    
    // Complex features (2-4 minutes)
    'generate-podcast': 180,
    'video-introduction': 150,
    'portfolio-gallery': 120,
    'availability-calendar': 90,
    'testimonials-carousel': 105,
    
    // Advanced features (3-5 minutes)
    'personality-insights': 200,
    'industry-optimization': 180,
    'regional-optimization': 150
  };
  
  return featureTimings[feature] || 60; // Default to 1 minute for unknown features
}