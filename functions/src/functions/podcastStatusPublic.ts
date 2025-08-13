import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { corsOptions } from '../config/cors';

export const podcastStatusPublic = onRequest(
  {
    ...corsOptions
  },
  async (req, res) => {
    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.status(200).send();
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { jobId } = req.body;

    if (!jobId) {
      res.status(400).json({ error: 'Job ID is required' });
      return;
    }

    try {
      // Check the job document for podcast status
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();

      if (!jobDoc.exists) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      const jobData = jobDoc.data();
      const podcastStatus = jobData?.podcastStatus;
      const podcast = jobData?.podcast;
      
      if (podcastStatus === 'completed' && podcast) {
        res.json({
          status: 'ready',
          audioUrl: podcast.url,
          transcript: podcast.transcript,
          duration: podcast.duration,
          chapters: podcast.chapters || []
        });
      } else if (podcastStatus === 'failed') {
        res.json({
          status: 'failed',
          error: jobData?.podcastError || 'Unknown error occurred'
        });
      } else if (podcastStatus === 'generating') {
        res.json({
          status: 'generating',
          message: 'Podcast is being generated...'
        });
      } else {
        res.json({
          status: 'not-started',
          message: 'Podcast generation has not been initiated'
        });
      }
    } catch (error: any) {
      console.error('Error checking podcast status:', error);
      res.status(500).json({
        status: 'error',
        error: error.message
      });
    }
  }
);