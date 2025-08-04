import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { httpsCallable } from 'firebase-functions/v2/https';
import { notebookLMService } from '../services/notebooklm.service';

/**
 * Process podcast generation tasks automatically
 */
export const processPodcastTasks = onDocumentCreated(
  {
    document: 'tasks/{taskId}',
    timeoutSeconds: 540,
    memory: '2GiB'
  },
  async (event) => {
    const taskData = event.data?.data();
    
    if (!taskData || taskData.type !== 'generate-podcast') {
      return;
    }
    
    const { jobId, userId } = taskData;
    
    try {
      // Update task status
      await event.data?.ref.update({
        status: 'processing',
        startedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Get job data
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (!jobData?.parsedData) {
        throw new Error('CV data not found');
      }
      
      // Generate podcast with NotebookLM
      const podcastResult = await notebookLMService.generatePodcastFromCV(
        jobData.parsedData,
        jobId,
        {
          tone: 'conversational',
          duration: 'medium',
          includeQA: true
        }
      );
      
      // Update task as completed
      await event.data?.ref.update({
        status: 'completed',
        result: podcastResult,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
    } catch (error: any) {
      console.error('Error processing podcast task:', error);
      
      // Update task as failed
      await event.data?.ref.update({
        status: 'failed',
        error: error.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Update job with error
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          podcastStatus: 'failed',
          podcastError: error.message,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
  }
);