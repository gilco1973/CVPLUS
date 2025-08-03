import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const generatePodcast = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB'
  })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { jobId, config } = data;

    try {
      // TODO: Implement NotebookLLM integration
      // For now, return a placeholder
      
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          podcastStatus: 'generating',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      // Placeholder for actual podcast generation
      const podcastUrl = `https://storage.googleapis.com/getmycv/podcasts/${jobId}/podcast.mp3`;
      const transcript = 'This is a placeholder transcript for the AI-generated podcast.';

      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          podcastStatus: 'completed',
          podcast: {
            url: podcastUrl,
            transcript,
            duration: '3:45'
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      return {
        success: true,
        podcastUrl,
        transcript
      };
    } catch (error: any) {
      console.error('Error generating podcast:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to generate podcast: ${error.message}`
      );
    }
  });