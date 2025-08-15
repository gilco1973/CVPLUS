import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { corsOptions } from '../config/cors';
import { CVGenerator } from '../services/cvGenerator';

export const generateCV = onCall(
  {
    timeoutSeconds: 300,
    memory: '2GiB',
    ...corsOptions
  },
  async (request) => {
    console.log('generateCV function called');
    
    if (!request.auth) {
      console.error('Authentication failed: No auth token');
      throw new Error('User must be authenticated');
    }

    console.log('User authenticated:', request.auth.uid);
    const { jobId, templateId, features } = request.data;
    console.log('Processing CV generation for job:', jobId);

    try {
      // Update status to generating
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          status: 'generating',
          selectedTemplate: templateId,
          selectedFeatures: features,
          updatedAt: FieldValue.serverTimestamp()
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
      console.log('Generating CV HTML with template:', templateId || 'modern');
      const generator = new CVGenerator();
      const htmlContent = await generator.generateHTML(cvData, templateId || 'modern', features, jobId);
      
      // Save generated files and get URLs
      console.log('Saving generated files to Firebase Storage...');
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
          updatedAt: FieldValue.serverTimestamp()
        });

      // If podcast generation is requested, initialize it
      if (features?.includes('generate-podcast')) {
        // Set initial podcast status
        await admin.firestore()
          .collection('jobs')
          .doc(jobId)
          .update({
            podcastStatus: 'generating',
            updatedAt: FieldValue.serverTimestamp()
          });
      }

      return {
        success: true,
        generatedCV
      };
    } catch (error: any) {
      console.error('Error generating CV:', error.message);
      console.error('Error stack:', error.stack);
      
      // Update job status to failed
      try {
        await admin.firestore()
          .collection('jobs')
          .doc(jobId)
          .update({
            status: 'failed',
            error: error.message,
            updatedAt: FieldValue.serverTimestamp()
          });
      } catch (updateError: any) {
        console.error('Failed to update job status:', updateError);
      }
      
      throw new Error(`Failed to generate CV: ${error.message}`);
    }
  });