import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

export const cleanupTempFiles = onSchedule(
  {
    schedule: 'every 24 hours',
    timeoutSeconds: 540,
    memory: '512MiB'
  },
  async (event) => {
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
          const timeCreated = metadata.timeCreated ? new Date(metadata.timeCreated).getTime() : 0;
          return timeCreated < cutoffTime;
        })
        .map(file => file.delete());

      await Promise.all(deletePromises);


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

    } catch (error) {
      throw error;
    }
  });