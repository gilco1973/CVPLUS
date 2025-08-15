import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { corsOptions } from '../config/cors';
import { podcastGenerationService } from '../services/podcast-generation.service';

export const generatePodcast = onCall(
  {
    timeoutSeconds: 540,
    memory: '2GiB',
    secrets: ['ELEVENLABS_API_KEY', 'ELEVENLABS_HOST1_VOICE_ID', 'ELEVENLABS_HOST2_VOICE_ID', 'OPENAI_API_KEY'],
    ...corsOptions
  },
  async (request) => {
    console.log('🎙️ generatePodcast function called with data:', request.data);
    
    if (!request.auth) {
      console.error('❌ Authentication failed - no auth token');
      throw new Error('User must be authenticated');
    }

    console.log('✅ User authenticated:', request.auth.uid);

    const { 
      jobId, 
      style = 'casual',
      duration = 'medium',
      focus = 'balanced' 
    } = request.data;

    console.log('📋 Podcast generation params:', { jobId, style, duration, focus });

    if (!jobId) {
      console.error('❌ No jobId provided');
      throw new Error('Job ID is required');
    }

    try {
      console.log('🔄 Updating podcast status to generating...');
      // Update status to generating
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          podcastStatus: 'generating',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      console.log('✅ Status updated to generating');

      console.log('📖 Fetching job document...');
      // Get the job data with parsed CV
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        console.error('❌ Job document not found:', jobId);
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      console.log('📄 Job data keys:', Object.keys(jobData || {}));
      console.log('🔍 Has parsedData:', !!jobData?.parsedData);
      
      if (!jobData?.parsedData) {
        console.error('❌ No parsedData found in job document');
        console.log('Available job data fields:', Object.keys(jobData || {}));
        throw new Error('CV data not found. Please ensure CV is parsed first.');
      }
      
      console.log('✅ Parsed CV data found, proceeding with podcast generation...');

      // Generate conversational podcast
      const podcastResult = await podcastGenerationService.generatePodcast(
        jobData.parsedData,
        jobId,
        {
          style,
          duration,
          focus
        }
      );

      // Update job with podcast completion
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          podcastStatus: 'completed',
          podcast: {
            url: podcastResult.audioUrl,
            transcript: podcastResult.transcript,
            duration: podcastResult.duration,
            chapters: podcastResult.chapters,
            generatedAt: admin.firestore.FieldValue.serverTimestamp()
          },
          'enhancedFeatures.podcast': {
            enabled: true,
            status: 'completed',
            data: {
              url: podcastResult.audioUrl,
              duration: podcastResult.duration
            }
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      return {
        success: true,
        podcastUrl: podcastResult.audioUrl,
        transcript: podcastResult.transcript,
        duration: podcastResult.duration,
        chapters: podcastResult.chapters
      };
    } catch (error: any) {
      console.error('Error generating podcast:', error);
      
      // Update status to failed
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          podcastStatus: 'failed',
          podcastError: error.message,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      
      throw new Error(`Failed to generate podcast: ${error.message}`);
    }
  });