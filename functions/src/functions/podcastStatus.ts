import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

export const podcastStatus = onRequest(
  {
    timeoutSeconds: 30,
    memory: '512MiB',
    cors: [
      'https://getmycv-ai.firebaseapp.com',
      'https://getmycv-ai.web.app',
      'https://cvplus.firebaseapp.com',
      'https://cvplus.web.app',
      'https://cvplus.ai',
      'https://www.cvplus.ai',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5000'
    ]
  },
  async (req, res) => {
    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.set('Access-Control-Allow-Credentials', 'true');
      res.status(200).send();
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Get Firebase auth token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized - No token provided' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    
    try {
      // Verify the token
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const { jobId } = req.body;

      if (!jobId) {
        res.status(400).json({ error: 'Job ID is required' });
        return;
      }

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
      
      // Check if user owns this job
      if (jobData?.userId !== userId) {
        res.status(403).json({ error: 'Unauthorized access to job' });
        return;
      }

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
      if (error.code === 'auth/id-token-expired') {
        res.status(401).json({ error: 'Token expired' });
      } else if (error.code === 'auth/argument-error') {
        res.status(401).json({ error: 'Invalid token' });
      } else {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    }
  }
);