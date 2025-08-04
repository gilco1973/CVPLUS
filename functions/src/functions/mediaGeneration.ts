/**
 * Cloud Functions for Media Generation (Video Intro & Podcast)
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { mediaGenerationService } from '../services/media-generation.service';
import { EnhancedJob } from '../types/enhanced-models';

/**
 * Generate video intro script
 */
export const generateVideoIntro = functions
  .runWith({ timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId, duration = 60, style = 'professional' } = data;
    if (!jobId) {
      throw new functions.https.HttpsError('invalid-argument', 'Job ID is required');
    }

    // Validate inputs
    if (duration < 30 || duration > 180) {
      throw new functions.https.HttpsError('invalid-argument', 'Duration must be between 30-180 seconds');
    }

    if (!['professional', 'casual', 'creative'].includes(style)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid style');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized');
      }

      if (!job.parsedData) {
        throw new functions.https.HttpsError('failed-precondition', 'CV must be parsed first');
      }

      // Update status
      await admin.firestore().collection('jobs').doc(jobId).update({
        'enhancedFeatures.videoIntro': {
          enabled: true,
          status: 'processing',
          processedAt: new Date()
        }
      });

      // Generate video intro script
      console.log('Generating video intro script...');
      const videoData = await mediaGenerationService.generateVideoIntroScript(
        job.parsedData,
        duration,
        style
      );

      // Store script and metadata
      const videoIntroData = {
        script: videoData.script,
        scenes: videoData.scenes,
        duration: videoData.duration,
        voiceoverText: videoData.voiceoverText,
        style,
        generatedAt: new Date()
      };

      await admin.firestore().collection('jobs').doc(jobId).update({
        'mediaAssets.videoIntro': videoIntroData,
        'enhancedFeatures.videoIntro': {
          enabled: true,
          status: 'completed',
          data: {
            duration,
            style,
            sceneCount: videoData.scenes.length
          },
          processedAt: new Date()
        }
      });

      return {
        success: true,
        videoIntro: videoIntroData
      };
    } catch (error: any) {
      console.error('Error generating video intro:', error);
      
      // Update error status
      await admin.firestore().collection('jobs').doc(jobId).update({
        'enhancedFeatures.videoIntro': {
          enabled: false,
          status: 'failed',
          error: error.message,
          processedAt: new Date()
        }
      });
      
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * Generate podcast from CV
 */
export const generatePodcast = functions
  .runWith({ timeoutSeconds: 180, memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId, format = 'interview', duration = 300 } = data;
    if (!jobId) {
      throw new functions.https.HttpsError('invalid-argument', 'Job ID is required');
    }

    // Validate inputs
    if (!['interview', 'narrative', 'highlights'].includes(format)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid format');
    }

    if (duration < 120 || duration > 600) {
      throw new functions.https.HttpsError('invalid-argument', 'Duration must be between 2-10 minutes');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized');
      }

      if (!job.parsedData) {
        throw new functions.https.HttpsError('failed-precondition', 'CV must be parsed first');
      }

      // Update status
      await admin.firestore().collection('jobs').doc(jobId).update({
        'enhancedFeatures.podcast': {
          enabled: true,
          status: 'processing',
          processedAt: new Date()
        }
      });

      // Generate podcast script
      console.log('Generating podcast script...');
      const podcastData = await mediaGenerationService.generatePodcastScript(
        job.parsedData,
        format,
        duration
      );

      // Store podcast data
      const podcastInfo = {
        script: podcastData.script,
        segments: podcastData.segments,
        format,
        duration: podcastData.totalDuration,
        metadata: podcastData.metadata,
        generatedAt: new Date()
      };

      await admin.firestore().collection('jobs').doc(jobId).update({
        'mediaAssets.podcast': podcastInfo,
        'enhancedFeatures.podcast': {
          enabled: true,
          status: 'completed',
          data: {
            format,
            duration,
            segmentCount: podcastData.segments.length
          },
          processedAt: new Date()
        }
      });

      return {
        success: true,
        podcast: podcastInfo
      };
    } catch (error: any) {
      console.error('Error generating podcast:', error);
      
      // Update error status
      await admin.firestore().collection('jobs').doc(jobId).update({
        'enhancedFeatures.podcast': {
          enabled: false,
          status: 'failed',
          error: error.message,
          processedAt: new Date()
        }
      });
      
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * Generate audio from text (TTS)
 */
export const generateAudioFromText = functions
  .runWith({ timeoutSeconds: 300, memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId, text, voice = 'male', speed = 1.0, type } = data;
    
    if (!jobId || !text || !type) {
      throw new functions.https.HttpsError('invalid-argument', 'Job ID, text, and type are required');
    }

    if (!['video-intro', 'podcast'].includes(type)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid audio type');
    }

    try {
      // Verify job ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized');
      }

      // Generate audio (placeholder - actual TTS integration needed)
      console.log('Generating audio from text...');
      const audioData = await mediaGenerationService.generateAudio(text, voice, speed);

      // Store audio URL
      const updatePath = type === 'video-intro' 
        ? 'mediaAssets.videoIntroAudioUrl'
        : 'mediaAssets.podcastAudioUrl';

      await admin.firestore().collection('jobs').doc(jobId).update({
        [updatePath]: audioData.audioUrl,
        [`${updatePath}Duration`]: audioData.duration,
        [`${updatePath}GeneratedAt`]: new Date()
      });

      return {
        success: true,
        audioUrl: audioData.audioUrl,
        duration: audioData.duration
      };
    } catch (error: any) {
      console.error('Error generating audio:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * Regenerate media with different settings
 */
export const regenerateMedia = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { jobId, mediaType, settings } = data;
  
  if (!jobId || !mediaType || !settings) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  if (!['video-intro', 'podcast'].includes(mediaType)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid media type');
  }

  try {
    // Verify ownership
    const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Job not found');
    }

    const job = jobDoc.data() as EnhancedJob;
    if (job.userId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized');
    }

    // Call appropriate generation function based on type
    if (mediaType === 'video-intro') {
      return await generateVideoIntro({ ...settings, jobId }, context);
    } else {
      return await generatePodcast({ ...settings, jobId }, context);
    }
  } catch (error: any) {
    console.error('Error regenerating media:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get media generation status
 */
export const getMediaStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { jobId } = data;
  if (!jobId) {
    throw new functions.https.HttpsError('invalid-argument', 'Job ID is required');
  }

  try {
    // Get job
    const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Job not found');
    }

    const job = jobDoc.data() as EnhancedJob;
    if (job.userId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized');
    }

    // Extract media status
    const status = {
      videoIntro: {
        enabled: job.enhancedFeatures?.videoIntro?.enabled || false,
        status: job.enhancedFeatures?.videoIntro?.status || 'not-started',
        hasScript: !!job.mediaAssets?.videoIntro?.script,
        hasAudio: !!job.mediaAssets?.videoIntroAudioUrl,
        duration: job.mediaAssets?.videoIntro?.duration,
        style: job.mediaAssets?.videoIntro?.style,
        generatedAt: job.mediaAssets?.videoIntro?.generatedAt
      },
      podcast: {
        enabled: job.enhancedFeatures?.podcast?.enabled || false,
        status: job.enhancedFeatures?.podcast?.status || 'not-started',
        hasScript: !!job.mediaAssets?.podcast?.script,
        hasAudio: !!job.mediaAssets?.podcastAudioUrl,
        format: job.mediaAssets?.podcast?.format,
        duration: job.mediaAssets?.podcast?.duration,
        generatedAt: job.mediaAssets?.podcast?.generatedAt
      }
    };

    return {
      success: true,
      status
    };
  } catch (error: any) {
    console.error('Error getting media status:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Download media content
 */
export const downloadMediaContent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { jobId, mediaType, contentType } = data;
  
  if (!jobId || !mediaType || !contentType) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  try {
    // Get job and verify ownership
    const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Job not found');
    }

    const job = jobDoc.data() as EnhancedJob;
    if (job.userId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized');
    }

    let content: any;
    let filename: string;
    
    // Get requested content
    if (mediaType === 'video-intro') {
      if (contentType === 'script') {
        content = job.mediaAssets?.videoIntro?.script;
        filename = `video-intro-script-${jobId}.txt`;
      } else if (contentType === 'scenes') {
        content = JSON.stringify(job.mediaAssets?.videoIntro?.scenes, null, 2);
        filename = `video-intro-scenes-${jobId}.json`;
      }
    } else if (mediaType === 'podcast') {
      if (contentType === 'script') {
        content = job.mediaAssets?.podcast?.script;
        filename = `podcast-script-${jobId}.txt`;
      } else if (contentType === 'segments') {
        content = JSON.stringify(job.mediaAssets?.podcast?.segments, null, 2);
        filename = `podcast-segments-${jobId}.json`;
      }
    }

    if (!content) {
      throw new functions.https.HttpsError('not-found', 'Content not found');
    }

    // Generate temporary download URL
    const bucket = admin.storage().bucket();
    const file = bucket.file(`temp-downloads/${context.auth.uid}/${filename}`);
    
    await file.save(content, {
      metadata: {
        contentType: contentType === 'script' ? 'text/plain' : 'application/json'
      }
    });

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000 // 15 minutes
    });

    return {
      success: true,
      downloadUrl: url,
      filename
    };
  } catch (error: any) {
    console.error('Error downloading media content:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});