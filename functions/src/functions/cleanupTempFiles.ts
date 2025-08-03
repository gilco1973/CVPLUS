import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const cleanupTempFiles = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '512MB'
  })
  .pubsub.schedule('every 24 hours')
  .onRun(async (context) => {
    const bucket = admin.storage().bucket();
    const now = Date.now();
    const cutoffTime = now - (24 * 60 * 60 * 1000); // 24 hours ago

    try {
      // List files in temp directory
      const [files] = await bucket.getFiles({
        prefix: 'temp/'
      });

      const deletePromises = files
        .filter(file => {
          const metadata = file.metadata;
          const timeCreated = new Date(metadata.timeCreated).getTime();
          return timeCreated < cutoffTime;
        })
        .map(file => file.delete());

      await Promise.all(deletePromises);

      console.log(`Deleted ${deletePromises.length} temporary files`);

      // Also clean up old failed jobs
      const db = admin.firestore();
      const failedJobsQuery = db
        .collection('jobs')
        .where('status', '==', 'failed')
        .where('updatedAt', '<', new Date(cutoffTime));

      const failedJobs = await failedJobsQuery.get();
      const batch = db.batch();

      failedJobs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(`Deleted ${failedJobs.size} failed jobs`);

      return null;
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
      throw error;
    }
  });