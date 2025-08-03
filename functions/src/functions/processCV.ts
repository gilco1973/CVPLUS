import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { CVParser } from '../services/cvParser';
import { PIIDetector } from '../services/piiDetector';
import { corsOptions } from '../config/cors';

export const processCV = onCall(
  {
    timeoutSeconds: 300,
    memory: '2GiB',
    ...corsOptions,
    secrets: ['ANTHROPIC_API_KEY']
  },
  async (request) => {
    // Check authentication
    if (!request.auth) {
      throw new Error('User must be authenticated to process CV');
    }

    const { jobId, fileUrl, mimeType, isUrl } = request.data;

    if (!jobId || (!fileUrl && !isUrl)) {
      throw new Error('Missing required parameters');
    }

    try {
      // Update job status
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          status: 'processing',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      // Initialize CV parser
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('Anthropic API key not configured');
      }
      
      const parser = new CVParser(apiKey);
      let parsedCV;

      if (isUrl) {
        // Parse from URL
        parsedCV = await parser.parseFromURL(fileUrl);
      } else {
        // Download file from storage
        const bucket = admin.storage().bucket();
        const file = bucket.file(fileUrl);
        const [buffer] = await file.download();
        
        // Parse the CV
        parsedCV = await parser.parseCV(buffer, mimeType);
      }

      // Detect PII
      const piiDetector = new PIIDetector(apiKey);
      const piiResult = await piiDetector.detectAndMaskPII(parsedCV);

      // Save parsed data with PII information
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          status: 'analyzed',
          parsedData: parsedCV,
          piiDetection: {
            hasPII: piiResult.hasPII,
            detectedTypes: piiResult.detectedTypes,
            recommendations: piiResult.recommendations
          },
          privacyVersion: piiResult.maskedData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      // Trigger CV generation
      await admin.firestore()
        .collection('tasks')
        .add({
          type: 'generate-cv',
          jobId,
          userId: request.auth.uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

      return {
        success: true,
        jobId,
        parsedData: parsedCV
      };

    } catch (error: any) {
      console.error('Error processing CV:', error);
      
      // Update job status to failed
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          status: 'failed',
          error: error.message,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      throw new Error(`Failed to process CV: ${error.message}`);
    }
  });