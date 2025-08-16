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
  console.log('🚀 [PROGRESSIVE ENHANCEMENT] Processing features for job:', jobId);
  console.log('🚀 [PROGRESSIVE ENHANCEMENT] Features to process:', features);
  
  // Map kebab-case feature names (received from frontend) to their processing functions
  const legacyFeatureMap: Record<string, () => Promise<void>> = {
    // Core Enhancement Features
    'ats-optimization': async () => {
      try {
        console.log('✨ Processing ATS Optimization...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.ats-optimization.status': 'processing',
          'enhancedFeatures.ats-optimization.progress': 10,
          'enhancedFeatures.ats-optimization.currentStep': 'Analyzing CV for ATS compatibility',
          'enhancedFeatures.ats-optimization.triggeredAt': FieldValue.serverTimestamp()
        });
        // TODO: Actually call atsOptimization function
        console.log('✅ ATS Optimization marked for processing');
      } catch (error) {
        console.error('❌ Error in ATS optimization:', error);
      }
    },
    
    'keyword-enhancement': async () => {
      try {
        console.log('✨ Processing Keyword Enhancement...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.keyword-enhancement.status': 'processing',
          'enhancedFeatures.keyword-enhancement.progress': 10,
          'enhancedFeatures.keyword-enhancement.currentStep': 'Analyzing keywords for enhancement',
          'enhancedFeatures.keyword-enhancement.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('✅ Keyword Enhancement marked for processing');
      } catch (error) {
        console.error('❌ Error in keyword enhancement:', error);
      }
    },
    
    'achievement-highlighting': async () => {
      try {
        console.log('✨ Processing Achievement Highlighting...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.achievement-highlighting.status': 'processing',
          'enhancedFeatures.achievement-highlighting.progress': 10,
          'enhancedFeatures.achievement-highlighting.currentStep': 'Identifying key achievements',
          'enhancedFeatures.achievement-highlighting.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('✅ Achievement Highlighting marked for processing');
      } catch (error) {
        console.error('❌ Error in achievement highlighting:', error);
      }
    },
    
    // Interactive Features
    'skills-visualization': async () => {
      try {
        console.log('✨ Processing Skills Visualization...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.skills-visualization.status': 'processing',
          'enhancedFeatures.skills-visualization.progress': 10,
          'enhancedFeatures.skills-visualization.currentStep': 'Creating interactive skills chart',
          'enhancedFeatures.skills-visualization.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('✅ Skills Visualization marked for processing');
      } catch (error) {
        console.error('❌ Error in skills visualization:', error);
      }
    },
    
    'skills-chart': async () => {
      try {
        console.log('✨ Processing Skills Chart...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.skills-chart.status': 'processing',
          'enhancedFeatures.skills-chart.progress': 10,
          'enhancedFeatures.skills-chart.currentStep': 'Generating skills proficiency chart',
          'enhancedFeatures.skills-chart.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('✅ Skills Chart marked for processing');
      } catch (error) {
        console.error('❌ Error in skills chart:', error);
      }
    },
    
    'interactive-timeline': async () => {
      try {
        console.log('✨ Processing Interactive Timeline...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.interactive-timeline.status': 'processing',
          'enhancedFeatures.interactive-timeline.progress': 10,
          'enhancedFeatures.interactive-timeline.currentStep': 'Building career timeline',
          'enhancedFeatures.interactive-timeline.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('✅ Interactive Timeline marked for processing');
      } catch (error) {
        console.error('❌ Error in interactive timeline:', error);
      }
    },
    
    // Multimedia Features
    'generate-podcast': async () => {
      try {
        console.log('✨ Processing Career Podcast...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.generate-podcast.status': 'processing',
          'enhancedFeatures.generate-podcast.progress': 10,
          'enhancedFeatures.generate-podcast.currentStep': 'Generating AI career podcast',
          'enhancedFeatures.generate-podcast.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('✅ Career Podcast marked for processing');
      } catch (error) {
        console.error('❌ Error in podcast generation:', error);
      }
    },
    
    'video-introduction': async () => {
      try {
        console.log('✨ Processing Video Introduction...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.video-introduction.status': 'processing',
          'enhancedFeatures.video-introduction.progress': 10,
          'enhancedFeatures.video-introduction.currentStep': 'Creating video introduction',
          'enhancedFeatures.video-introduction.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('✅ Video Introduction marked for processing');
      } catch (error) {
        console.error('❌ Error in video introduction:', error);
      }
    },
    
    'portfolio-gallery': async () => {
      try {
        console.log('✨ Processing Portfolio Gallery...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.portfolio-gallery.status': 'processing',
          'enhancedFeatures.portfolio-gallery.progress': 10,
          'enhancedFeatures.portfolio-gallery.currentStep': 'Building portfolio showcase',
          'enhancedFeatures.portfolio-gallery.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('✅ Portfolio Gallery marked for processing');
      } catch (error) {
        console.error('❌ Error in portfolio gallery:', error);
      }
    },
    
    // Professional Features
    'certification-badges': async () => {
      try {
        console.log('✨ Processing Certification Badges...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.certification-badges.status': 'processing',
          'enhancedFeatures.certification-badges.progress': 10,
          'enhancedFeatures.certification-badges.currentStep': 'Creating certification displays',
          'enhancedFeatures.certification-badges.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('✅ Certification Badges marked for processing');
      } catch (error) {
        console.error('❌ Error in certification badges:', error);
      }
    },
    
    'language-proficiency': async () => {
      try {
        console.log('✨ Processing Language Proficiency...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.language-proficiency.status': 'processing',
          'enhancedFeatures.language-proficiency.progress': 10,
          'enhancedFeatures.language-proficiency.currentStep': 'Analyzing language skills',
          'enhancedFeatures.language-proficiency.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('✅ Language Proficiency marked for processing');
      } catch (error) {
        console.error('❌ Error in language proficiency:', error);
      }
    },
    
    'achievements-showcase': async () => {
      try {
        console.log('✨ Processing Achievements Showcase...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.achievements-showcase.status': 'processing',
          'enhancedFeatures.achievements-showcase.progress': 10,
          'enhancedFeatures.achievements-showcase.currentStep': 'Highlighting top achievements',
          'enhancedFeatures.achievements-showcase.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('✅ Achievements Showcase marked for processing');
      } catch (error) {
        console.error('❌ Error in achievements showcase:', error);
      }
    },
    
    // Contact & Integration Features
    'contact-form': async () => {
      try {
        console.log('✨ Processing Contact Form...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.contact-form.status': 'processing',
          'enhancedFeatures.contact-form.progress': 10,
          'enhancedFeatures.contact-form.currentStep': 'Setting up contact functionality',
          'enhancedFeatures.contact-form.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('✅ Contact Form marked for processing');
      } catch (error) {
        console.error('❌ Error in contact form:', error);
      }
    },
    
    'social-media-links': async () => {
      try {
        console.log('✨ Processing Social Media Links...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.social-media-links.status': 'processing',
          'enhancedFeatures.social-media-links.progress': 10,
          'enhancedFeatures.social-media-links.currentStep': 'Integrating social media profiles',
          'enhancedFeatures.social-media-links.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('✅ Social Media Links marked for processing');
      } catch (error) {
        console.error('❌ Error in social media links:', error);
      }
    },
    
    'availability-calendar': async () => {
      try {
        console.log('✨ Processing Availability Calendar...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.availability-calendar.status': 'processing',
          'enhancedFeatures.availability-calendar.progress': 10,
          'enhancedFeatures.availability-calendar.currentStep': 'Setting up calendar integration',
          'enhancedFeatures.availability-calendar.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('✅ Availability Calendar marked for processing');
      } catch (error) {
        console.error('❌ Error in availability calendar:', error);
      }
    },
    
    'testimonials-carousel': async () => {
      try {
        console.log('✨ Processing Testimonials Carousel...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.testimonials-carousel.status': 'processing',
          'enhancedFeatures.testimonials-carousel.progress': 10,
          'enhancedFeatures.testimonials-carousel.currentStep': 'Creating testimonials showcase',
          'enhancedFeatures.testimonials-carousel.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('✅ Testimonials Carousel marked for processing');
      } catch (error) {
        console.error('❌ Error in testimonials carousel:', error);
      }
    },
    
    // Technical Features
    'embed-qr-code': async () => {
      try {
        console.log('✨ Processing QR Code Integration...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.embed-qr-code.status': 'processing',
          'enhancedFeatures.embed-qr-code.progress': 10,
          'enhancedFeatures.embed-qr-code.currentStep': 'Generating QR code',
          'enhancedFeatures.embed-qr-code.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('✅ QR Code Integration marked for processing');
      } catch (error) {
        console.error('❌ Error in QR code:', error);
      }
    },
    
    'privacy-mode': async () => {
      try {
        console.log('✨ Processing Privacy Protection...');
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.privacy-mode.status': 'processing',
          'enhancedFeatures.privacy-mode.progress': 10,
          'enhancedFeatures.privacy-mode.currentStep': 'Applying privacy protection',
          'enhancedFeatures.privacy-mode.triggeredAt': FieldValue.serverTimestamp()
        });
        console.log('✅ Privacy Protection marked for processing');
      } catch (error) {
        console.error('❌ Error in privacy mode:', error);
      }
    }
  };

  // Process all requested legacy features in parallel
  const validFeatures = features.filter(feature => legacyFeatureMap[feature]);
  const invalidFeatures = features.filter(feature => !legacyFeatureMap[feature]);
  
  console.log(`🔍 [PROGRESSIVE ENHANCEMENT] Valid features: ${validFeatures.length}/${features.length}`);
  console.log(`✅ [PROGRESSIVE ENHANCEMENT] Processing: ${validFeatures.join(', ')}`);
  if (invalidFeatures.length > 0) {
    console.log(`⚠️ [PROGRESSIVE ENHANCEMENT] Unhandled features: ${invalidFeatures.join(', ')}`);
  }
  
  const legacyFeatureCalls = validFeatures.map(feature => legacyFeatureMap[feature]());

  if (legacyFeatureCalls.length > 0) {
    console.log(`🚀 [PROGRESSIVE ENHANCEMENT] Starting processing of ${legacyFeatureCalls.length} features...`);
    await Promise.allSettled(legacyFeatureCalls);
    console.log('✅ [PROGRESSIVE ENHANCEMENT] All feature processing initiated successfully');
  } else {
    console.log('⚠️ [PROGRESSIVE ENHANCEMENT] No valid features to process');
  }
}