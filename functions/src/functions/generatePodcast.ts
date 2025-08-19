import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { corsOptions } from '../config/cors';
import { podcastGenerationService } from '../services/podcast-generation.service';
import { htmlFragmentGenerator } from '../services/html-fragment-generator.service';
import { sanitizeForFirestore, sanitizeErrorContext } from '../utils/firestore-sanitizer';

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

      // Update status to processing
      console.log('🔄 Updating podcast status to processing...');
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.generatePodcast.status': 'processing',
          'enhancedFeatures.generatePodcast.progress': 25,
          'enhancedFeatures.generatePodcast.currentStep': 'Creating podcast script...',
          'enhancedFeatures.generatePodcast.startedAt': FieldValue.serverTimestamp(),
          podcastStatus: 'generating',
          updatedAt: FieldValue.serverTimestamp()
        });
      console.log('✅ Status updated to processing');

      // Generate conversational podcast
      const podcastResult = await podcastGenerationService.generatePodcast(
        jobData.parsedData,
        jobId,
        request.auth.uid,
        {
          style,
          duration,
          focus
        }
      );

      // Update progress
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.generatePodcast.progress': 75,
          'enhancedFeatures.generatePodcast.currentStep': 'Finalizing podcast audio...'
        });

      // Generate HTML fragment for progressive enhancement
      const htmlFragment = htmlFragmentGenerator.generatePodcastHTML(podcastResult);

      // Sanitize podcast result data before Firestore write
      const sanitizedPodcastData = sanitizeForFirestore(podcastResult);
      const sanitizedHtmlFragment = sanitizeForFirestore(htmlFragment);
      
      // Create safe update object
      const updateData = sanitizeForFirestore({
        'enhancedFeatures.generatePodcast.status': 'completed',
        'enhancedFeatures.generatePodcast.progress': 100,
        'enhancedFeatures.generatePodcast.data': sanitizedPodcastData,
        'enhancedFeatures.generatePodcast.htmlFragment': sanitizedHtmlFragment,
        'enhancedFeatures.generatePodcast.processedAt': FieldValue.serverTimestamp(),
        podcastStatus: 'completed',
        podcast: sanitizeForFirestore({
          url: podcastResult.audioUrl,
          transcript: podcastResult.transcript,
          duration: podcastResult.duration,
          chapters: podcastResult.chapters,
          generatedAt: FieldValue.serverTimestamp()
        }),
        'enhancedFeatures.podcast': sanitizeForFirestore({
          enabled: true,
          status: 'completed',
          data: {
            url: podcastResult.audioUrl,
            duration: podcastResult.duration
          }
        }),
        updatedAt: FieldValue.serverTimestamp()
      });

      // Update job with podcast completion
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update(updateData);

      return {
        success: true,
        podcastUrl: podcastResult.audioUrl,
        transcript: podcastResult.transcript,
        duration: podcastResult.duration,
        chapters: podcastResult.chapters,
        htmlFragment
      };
    } catch (error: any) {
      console.error('Error generating podcast:', error);
      
      // Sanitize error data for safe Firestore write
      const sanitizedErrorContext = sanitizeErrorContext({
        errorMessage: error.message,
        errorStack: error.stack,
        errorCode: error.code,
        timestamp: new Date().toISOString()
      });
      
      // Create safe error update object
      const errorUpdateData = sanitizeForFirestore({
        'enhancedFeatures.generatePodcast.status': 'failed',
        'enhancedFeatures.generatePodcast.error': error.message || 'Unknown error',
        'enhancedFeatures.generatePodcast.errorContext': sanitizedErrorContext,
        'enhancedFeatures.generatePodcast.processedAt': FieldValue.serverTimestamp(),
        podcastStatus: 'failed',
        podcastError: error.message || 'Unknown error',
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // Update status to failed
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update(errorUpdateData);
      
      throw new Error(`Failed to generate podcast: ${error.message}`);
    }
  });