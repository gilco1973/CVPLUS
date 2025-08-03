import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { CVParser } from '../services/cvParser';
import { PIIDetector } from '../services/piiDetector';

export const processCV = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '1GB'
  })
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to process CV'
      );
    }

    const { jobId, fileUrl, mimeType, isUrl } = data;

    if (!jobId || (!fileUrl && !isUrl)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required parameters'
      );
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
      const apiKey = functions.config().anthropic?.api_key;
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
          userId: context.auth.uid,
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

      throw new functions.https.HttpsError(
        'internal',
        `Failed to process CV: ${error.message}`
      );
    }
  });