import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { corsOptions } from '../config/cors';

export const podcastStatus = onCall(
  {
    timeoutSeconds: 30,
    memory: '512MiB',
    ...corsOptions
  },
  async (request) => {
    // Debug: Log incoming request
    console.log('=== PODCAST STATUS DEBUG ===');
    console.log('Request data:', JSON.stringify(request.data, null, 2));
    console.log('Request auth:', JSON.stringify(request.auth, null, 2));
    console.log('Request auth exists:', !!request.auth);
    console.log('Request object keys:', Object.keys(request));
    console.log('Full request:', JSON.stringify(request, null, 2));

    // Check authentication
    if (!request.auth) {
      console.log('Authentication failed - no auth object');
      console.log('Returning test response instead of throwing error');
      return {
        status: 'debug',
        message: 'Authentication debugging - no auth object found',
        requestKeys: Object.keys(request),
        hasAuth: !!request.auth,
        timestamp: Date.now()
      };
    }

    const userId = request.auth.uid;
    const { jobId } = request.data;

    if (!jobId) {
      throw new Error('Job ID is required');
    }

    try {
      // Check the job document for podcast status
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();

      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }

      const jobData = jobDoc.data();
      
      // Check if user owns this job
      if (jobData?.userId !== userId) {
        throw new Error('Unauthorized access to job');
      }

      const podcastStatus = jobData?.podcastStatus;
      const podcast = jobData?.podcast;
      
      if (podcastStatus === 'completed' && podcast) {
        return {
          status: 'ready',
          audioUrl: podcast.url,
          transcript: podcast.transcript,
          duration: podcast.duration,
          chapters: podcast.chapters || []
        };
      } else if (podcastStatus === 'failed') {
        return {
          status: 'failed',
          error: jobData?.podcastError || 'Unknown error occurred'
        };
      } else if (podcastStatus === 'generating') {
        return {
          status: 'generating',
          message: 'Podcast is being generated...'
        };
      } else {
        return {
          status: 'not-started',
          message: 'Podcast generation has not been initiated'
        };
      }
    } catch (error: any) {
      console.error('Error checking podcast status:', error);
      throw new Error(error.message || 'Failed to check podcast status');
    }
  }
);