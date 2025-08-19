import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { corsOptions } from '../config/cors';

const allowedOrigins = [
  'https://getmycv-ai.firebaseapp.com',
  'https://getmycv-ai.web.app',
  'https://cvplus.firebaseapp.com',
  'https://cvplus.web.app',
  'https://cvplus.ai',
  'https://www.cvplus.ai',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
  'http://localhost:5000'
];

export const podcastStatusPublic = onRequest(
  {
    ...corsOptions
  },
  async (req, res) => {
    // Handle preflight with secure origin validation
    if (req.method === 'OPTIONS') {
      const origin = req.get('origin');
      const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : null;
      if (corsOrigin) {
        res.set('Access-Control-Allow-Origin', corsOrigin);
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.set('Access-Control-Allow-Credentials', 'true');
        res.status(200).send();
      } else {
        console.warn(`CORS blocked preflight request from origin: ${origin}`);
        res.status(403).send('Origin not allowed');
      }
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