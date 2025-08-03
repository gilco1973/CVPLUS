import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const generateCV = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '1GB'
  })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { jobId, templateId, features } = data;

    try {
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          status: 'generating',
          selectedTemplate: templateId,
          selectedFeatures: features,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      // TODO: Implement actual CV generation with templates
      // For now, return placeholder data

      const generatedCV = {
        html: '<html><body><h1>Generated CV</h1></body></html>',
        pdfUrl: `https://storage.googleapis.com/getmycv/generated/${jobId}/cv.pdf`,
        docxUrl: `https://storage.googleapis.com/getmycv/generated/${jobId}/cv.docx`
      };

      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          status: 'completed',
          generatedCV,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      return {
        success: true,
        generatedCV
      };
    } catch (error: any) {
      console.error('Error generating CV:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to generate CV: ${error.message}`
      );
    }
  });