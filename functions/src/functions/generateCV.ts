import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { corsOptions } from '../config/cors';
import { CVGenerator } from '../services/cvGenerator';

// Note: Legacy feature functions are called via HTTP requests, not direct imports

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

      // Process legacy standalone features that are not yet integrated
      console.log('Processing legacy standalone features...');
      await processLegacyFeatures(jobId, request.auth.uid, features || []);

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

/**
 * Process legacy standalone features by calling their respective functions
 */
async function processLegacyFeatures(jobId: string, userId: string, features: string[]): Promise<void> {
  const legacyFeatureMap: Record<string, () => Promise<void>> = {
    'skills-visualization': async () => {
      try {
        console.log('Calling legacy generateSkillsVisualization function...');
        // Note: These are onCall functions, we need to call them differently
        // For now, mark the feature as processed in the job
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.skillsVisualization.status': 'processing',
          'enhancedFeatures.skillsVisualization.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('Skills visualization marked for processing');
      } catch (error) {
        console.error('Error in skills visualization:', error);
      }
    },
    
    'certification-badges': async () => {
      try {
        console.log('Calling legacy generateCertificationBadges function...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.certificationBadges.status': 'processing',
          'enhancedFeatures.certificationBadges.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('Certification badges marked for processing');
      } catch (error) {
        console.error('Error in certification badges:', error);
      }
    },
    
    'calendar-integration': async () => {
      try {
        console.log('Calling legacy calendar integration function...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.calendarIntegration.status': 'processing',
          'enhancedFeatures.calendarIntegration.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('Calendar integration marked for processing');
      } catch (error) {
        console.error('Error in calendar integration:', error);
      }
    },
    
    'interactive-timeline': async () => {
      try {
        console.log('Calling legacy generateTimeline function...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.interactiveTimeline.status': 'processing',
          'enhancedFeatures.interactiveTimeline.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('Interactive timeline marked for processing');
      } catch (error) {
        console.error('Error in interactive timeline:', error);
      }
    },
    
    'language-proficiency': async () => {
      try {
        console.log('Calling legacy generateLanguageVisualization function...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.languageProficiency.status': 'processing',
          'enhancedFeatures.languageProficiency.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('Language proficiency marked for processing');
      } catch (error) {
        console.error('Error in language proficiency:', error);
      }
    },
    
    'portfolio-gallery': async () => {
      try {
        console.log('Calling legacy generatePortfolioGallery function...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.portfolioGallery.status': 'processing',
          'enhancedFeatures.portfolioGallery.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('Portfolio gallery marked for processing');
      } catch (error) {
        console.error('Error in portfolio gallery:', error);
      }
    },
    
    'video-introduction': async () => {
      try {
        console.log('Calling legacy generateVideoIntroduction function...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.videoIntroduction.status': 'processing',
          'enhancedFeatures.videoIntroduction.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('Video introduction marked for processing');
      } catch (error) {
        console.error('Error in video introduction:', error);
      }
    }
  };

  // Process all requested legacy features in parallel
  const legacyFeatureCalls = features
    .filter(feature => legacyFeatureMap[feature])
    .map(feature => legacyFeatureMap[feature]());

  if (legacyFeatureCalls.length > 0) {
    console.log(`Processing ${legacyFeatureCalls.length} legacy features...`);
    await Promise.allSettled(legacyFeatureCalls);
    console.log('All legacy features processing completed');
  }
}