import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { corsOptions } from '../config/cors';

export const skipFeature = onCall(
  {
    timeoutSeconds: 60,
    ...corsOptions
  },
  async (request) => {
    console.log('🚫 skipFeature function called with data:', request.data);
    
    if (!request.auth) {
      console.error('❌ Authentication failed - no auth token');
      throw new Error('User must be authenticated');
    }

    console.log('✅ User authenticated:', request.auth.uid);

    const { jobId, featureId } = request.data;

    console.log('📋 Skip feature params:', { jobId, featureId });

    if (!jobId || !featureId) {
      console.error('❌ Missing required parameters');
      throw new Error('Job ID and Feature ID are required');
    }

    try {
      console.log('📖 Fetching job document...');
      // Get the job data
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        console.error('❌ Job document not found:', jobId);
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      console.log('📄 Job data fetched successfully');
      
      // Verify user owns this job
      if (jobData?.userId !== request.auth.uid) {
        console.error('❌ User does not own this job');
        throw new Error('Unauthorized access to job');
      }
      
      console.log('✅ User authorized, proceeding with skip...');

      // Update the specific feature status to skipped
      const updateData: any = {
        [`enhancedFeatures.${featureId}.status`]: 'skipped',
        [`enhancedFeatures.${featureId}.progress`]: 100,
        [`enhancedFeatures.${featureId}.processedAt`]: FieldValue.serverTimestamp(),
        [`enhancedFeatures.${featureId}.skippedAt`]: FieldValue.serverTimestamp(),
        [`enhancedFeatures.${featureId}.currentStep`]: 'Skipped by user',
        updatedAt: FieldValue.serverTimestamp()
      };

      // Also update any legacy status fields for specific features
      switch (featureId) {
        case 'generatePodcast':
          updateData.podcastStatus = 'skipped';
          break;
        case 'generateVideo':
          updateData.videoStatus = 'skipped';
          break;
        // Add other feature-specific status fields as needed
      }

      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update(updateData);

      console.log('✅ Feature skipped successfully:', featureId);

      return {
        success: true,
        message: `Feature ${featureId} has been skipped`,
        featureId,
        jobId
      };
    } catch (error: any) {
      console.error('Error skipping feature:', error);
      
      throw new Error(`Failed to skip feature: ${error.message}`);
    }
  });