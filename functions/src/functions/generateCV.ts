import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { corsOptions } from '../config/cors';
import { CVGenerator } from '../services/cvGenerator';

export const generateCV = onCall(
  {
    timeoutSeconds: 300,
    memory: '2GiB',
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, templateId, features } = request.data;

    try {
      // Update status to generating
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          status: 'generating',
          selectedTemplate: templateId,
          selectedFeatures: features,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
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
      const parsedCV = jobData?.parsedData;
      
      if (!parsedCV) {
        throw new Error('No parsed CV data found');
      }

      // Use privacy version if privacy mode is enabled
      const cvData = features?.includes('privacy-mode') && jobData?.privacyVersion 
        ? jobData.privacyVersion 
        : parsedCV;

      // Generate CV HTML
      const generator = new CVGenerator();
      const htmlContent = await generator.generateHTML(cvData, templateId || 'modern');
      
      // Save generated files and get URLs
      const { pdfUrl, docxUrl, htmlUrl } = await generator.saveGeneratedFiles(
        jobId,
        request.auth.uid,
        htmlContent
      );

      const generatedCV = {
        html: htmlContent,
        htmlUrl,
        pdfUrl,
        docxUrl,
        template: templateId,
        features: features
      };

      // Update job status to completed
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          status: 'completed',
          generatedCV,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      // If podcast generation is requested, trigger it
      if (features?.includes('generate-podcast')) {
        await admin.firestore()
          .collection('tasks')
          .add({
            type: 'generate-podcast',
            jobId,
            userId: request.auth.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
      }

      return {
        success: true,
        generatedCV
      };
    } catch (error: any) {
      console.error('Error generating CV:', error);
      
      // Update job status to failed
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          status: 'failed',
          error: error.message,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      
      throw new Error(`Failed to generate CV: ${error.message}`);
    }
  });