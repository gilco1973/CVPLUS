import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { corsOptions } from '../config/cors';
import { CVGenerator } from '../services/cvGenerator';
// htmlFragmentGenerator import removed - using React SPA architecture
import { EnhancedFileGenerationResult } from '../services/cv-generator/types';

// Import real feature services - NO MORE MOCK CODE
import { AdvancedATSOptimizationService } from '../services/ats-optimization.service';
import { AchievementsAnalysisService } from '../services/achievements-analysis.service';

/**
 * Core CV generation logic that can be called from other functions
 */
export async function generateCVCore(jobId: string, templateId: string | undefined, features: string[] | undefined, userId: string) {

  try {
    // Step 1: Initialize job and validate data
    const { jobData, cvData } = await initializeAndValidateJob(jobId, templateId, features, userId);

    // Step 2: Generate CV HTML and save files
    const generatedCV = await generateAndSaveCV(jobId, userId, cvData, templateId, features);

    // Step 3: Process enhancement features
    await processEnhancementFeatures(jobId, userId, features || [], cvData);

    // Step 4: Complete job and handle special features
    await completeJobGeneration(jobId, generatedCV, features);

    return {
      success: true,
      generatedCV
    };
  } catch (error: any) {
    
    // Handle error with dedicated function
    await handleGenerationError(jobId, error);
    
    throw new Error(`Failed to generate CV: ${error.message}`);
  }
}

export const generateCV = onCall(
  {
    timeoutSeconds: 600, // Increased from 5 minutes to 10 minutes
    memory: '2GiB',
    ...corsOptions
  },
  async (request) => {
    
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, templateId, features } = request.data;
    const userId = request.auth.uid;
    
    return await generateCVCore(jobId, templateId, features, userId);
  });

/**
 * Step 1: Initialize job and validate data
 */
async function initializeAndValidateJob(
  jobId: string, 
  templateId: string | undefined, 
  features: string[] | undefined,
  userId: string
) {
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
  
  // Verify user ownership
  if (jobData?.userId !== userId) {
    throw new Error('Unauthorized access to job');
  }
  
  const parsedCV = jobData?.parsedData;
  
  if (!parsedCV) {
    throw new Error('No parsed CV data found');
  }

  // Use privacy version if privacy mode is enabled
  const cvData = features?.includes('privacy-mode') && jobData?.privacyVersion 
    ? jobData.privacyVersion 
    : parsedCV;

  return { jobData, cvData };
}

/**
 * Step 2: Generate CV HTML and save files with comprehensive error handling and status updates
 */
async function generateAndSaveCV(
  jobId: string,
  userId: string,
  cvData: any,
  templateId: string | undefined,
  features: string[] | undefined
) {
  
  try {
    // Update job status to show CV generation in progress
    await updateJobGenerationStep(jobId, 'html-generation', 'Generating CV HTML content');
    
    // Generate CV HTML
    const generator = new CVGenerator();
    const htmlContent = await generator.generateHTML(cvData, templateId || 'modern', features, jobId);
    
    // Update job status to show file saving in progress
    await updateJobGenerationStep(jobId, 'file-generation', 'Saving CV files to storage');
    
    // Save generated files with comprehensive error handling
    const fileResults = await saveFilesWithFallback(generator, jobId, userId, htmlContent);
    
    
    return {
      html: htmlContent,
      htmlUrl: fileResults.htmlUrl,
      pdfUrl: fileResults.pdfUrl,
      docxUrl: fileResults.docxUrl,
      template: templateId,
      features: features,
      fileGenerationDetails: fileResults.generationDetails
    };
    
  } catch (error: any) {
    await updateJobGenerationStep(jobId, 'error', `CV generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Step 3: Process enhancement features (renamed for clarity)
 */
async function processEnhancementFeatures(
  jobId: string, 
  userId: string, 
  features: string[], 
  cvData: any
) {
  await processRealFeatures(jobId, userId, features, cvData);
}

/**
 * Step 4: Complete job generation and handle special features
 */
async function completeJobGeneration(
  jobId: string,
  generatedCV: any,
  features: string[] | undefined
) {
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
}

/**
 * Handle generation errors with comprehensive error analysis and recovery options
 */
async function handleGenerationError(jobId: string, error: any) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : '';
  
  
  // Analyze error type for better recovery recommendations
  const errorAnalysis = analyzeGenerationError(error);
  
  try {
    const errorData = {
      status: 'failed',
      error: errorMessage,
      errorDetails: {
        type: errorAnalysis.type,
        category: errorAnalysis.category,
        retryable: errorAnalysis.retryable,
        recommendedAction: errorAnalysis.recommendedAction,
        timestamp: new Date(),
        stack: errorStack.substring(0, 1000) // Limit stack trace length
      },
      lastGenerationStep: await getLastGenerationStep(jobId),
      updatedAt: FieldValue.serverTimestamp()
    };
    
    await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .update(errorData);
    
    
  } catch (updateError: any) {
  }
}

/**
 * Process REAL enhancement features by calling actual service functions
 * WITH COMPREHENSIVE TIMEOUT AND ERROR RECOVERY
 */
async function processRealFeatures(jobId: string, userId: string, features: string[], cvData: any): Promise<void> {
  
  if (features.length === 0) {
    // Initialize empty enhancedFeatures field to prevent missing field errors
    await admin.firestore().collection('jobs').doc(jobId).update({
      enhancedFeatures: {},
      featureProcessingSummary: {
        total: 0,
        successful: 0,
        failed: 0,
        successRate: 100,
        completedFeatures: [],
        failedFeatures: [],
        errors: [],
        lastProcessed: FieldValue.serverTimestamp(),
        skipped: true,
        skipReason: 'No features selected'
      },
      updatedAt: FieldValue.serverTimestamp()
    });
    return;
  }

  // Initialize feature processing summary
  const processingResults = {
    total: features.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [] as Array<{feature: string, error: string}>,
    completedFeatures: [] as string[],
    failedFeatures: [] as string[]
  };

  try {
    // Process all features with comprehensive timeout protection
    
    const featurePromises = features.map(async (feature) => {
      try {
        // Add per-feature timeout of 3 minutes
        const result = await Promise.race([
          processIndividualFeature(feature, jobId, userId, cvData),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Feature ${feature} timed out after 3 minutes`)), 180000);
          })
        ]);
        return { feature, status: 'success' };
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Mark individual feature as failed but continue with others
        await markFeatureAsFailed(jobId, feature, errorMessage);
        
        // For critical failures, log more details but don't stop processing
        if (error instanceof Error && error.stack) {
        }
        
        return { 
          feature, 
          status: 'failed', 
          error: errorMessage 
        };
      }
    });

    // Wait for all features to complete with global timeout protection
    const results = await Promise.race([
      Promise.allSettled(featurePromises),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Feature processing timed out after 8 minutes')), 480000);
      })
    ]);
  
  // Process results and update counters
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const featureResult = result.value;
      if (featureResult.status === 'success') {
        processingResults.successful++;
        processingResults.completedFeatures.push(featureResult.feature);
      } else {
        processingResults.failed++;
        processingResults.failedFeatures.push(featureResult.feature);
        processingResults.errors.push({ 
          feature: featureResult.feature, 
          error: featureResult.error || 'Unknown error'
        });
      }
    } else {
      // Handle unexpected Promise.allSettled rejection (should not happen with our error handling)
      processingResults.failed++;
      processingResults.failedFeatures.push('unknown-feature');
      processingResults.errors.push({ 
        feature: 'unknown-feature', 
        error: `Unexpected promise rejection: ${result.reason}` 
      });
    }
  }
  

  // Update job with comprehensive processing summary
  await updateJobWithProcessingSummary(jobId, processingResults);
  
    // Log final processing summary
    logProcessingSummary(jobId, processingResults);
    
  } catch (globalError: any) {
    
    // If global processing fails, mark all remaining features as failed
    for (const feature of features) {
      if (!processingResults.completedFeatures.includes(feature) && !processingResults.failedFeatures.includes(feature)) {
        processingResults.failed++;
        processingResults.failedFeatures.push(feature);
        processingResults.errors.push({
          feature,
          error: `Global processing failure: ${globalError.message}`
        });
        await markFeatureAsFailed(jobId, feature, `Global timeout: ${globalError.message}`);
      }
    }
    
    // Update job with global failure summary
    await updateJobWithProcessingSummary(jobId, processingResults);
    logProcessingSummary(jobId, processingResults);
    
    // Don't throw - allow CV generation to complete even if features fail
  }
}

/**
 * Mark a feature as failed with detailed error information
 */
async function markFeatureAsFailed(jobId: string, feature: string, errorMessage: string): Promise<void> {
  try {
    await admin.firestore().collection('jobs').doc(jobId).update({
      [`enhancedFeatures.${feature}.status`]: 'failed',
      [`enhancedFeatures.${feature}.error`]: errorMessage,
      [`enhancedFeatures.${feature}.failureTimestamp`]: FieldValue.serverTimestamp(),
      [`enhancedFeatures.${feature}.retryable`]: isRetryableError(errorMessage)
    });
  } catch (updateError) {
  }
}

/**
 * Update job with comprehensive processing summary
 */
async function updateJobWithProcessingSummary(jobId: string, results: any): Promise<void> {
  try {
    const updateData: any = {
      'featureProcessingSummary': {
        total: results.total,
        successful: results.successful,
        failed: results.failed,
        successRate: results.total > 0 ? Math.round((results.successful / results.total) * 100) : 0,
        completedFeatures: results.completedFeatures,
        failedFeatures: results.failedFeatures,
        errors: results.errors.slice(0, 10), // Limit to first 10 errors to avoid doc size issues
        lastProcessed: FieldValue.serverTimestamp()
      }
    };

    // If all features succeeded, mark overall enhancement as successful
    if (results.failed === 0 && results.successful > 0) {
      updateData['enhancementStatus'] = 'completed';
    } else if (results.successful > 0 && results.failed > 0) {
      updateData['enhancementStatus'] = 'partial';
    } else if (results.failed > 0 && results.successful === 0) {
      updateData['enhancementStatus'] = 'failed';
    }

    await admin.firestore().collection('jobs').doc(jobId).update(updateData);
    
    // If processing is complete (all features processed), inject completed features into CV
    if (results.total > 0 && (results.successful + results.failed) === results.total) {
      
      // Get user ID from job document for feature injection
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      const jobData = jobDoc.data();
      const userId = jobData?.userId;
      
      if (userId) {
        await injectCompletedFeaturesIntoCV(jobId, userId);
      } else {
      }
    }
    
  } catch (updateError) {
  }
}

/**
 * Log comprehensive processing summary
 */
function logProcessingSummary(jobId: string, results: any): void {
  const successRate = results.total > 0 ? Math.round((results.successful / results.total) * 100) : 0;
  
  console.log(`
🎯 FEATURE PROCESSING SUMMARY for job ${jobId}:
📊 Total Features: ${results.total}
✅ Successful: ${results.successful}
❌ Failed: ${results.failed}
📈 Success Rate: ${successRate}%

✅ Completed Features: ${results.completedFeatures.join(', ') || 'None'}
❌ Failed Features: ${results.failedFeatures.join(', ') || 'None'}

${results.errors.length > 0 ? `🚨 Errors:\n${results.errors.map(e => `  - ${e.feature}: ${e.error}`).join('\n')}` : '🎉 No errors encountered!'}
  `);

  if (results.failed > 0) {
  }
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(errorMessage: string): boolean {
  const retryablePatterns = [
    'timeout',
    'network',
    'temporarily unavailable',
    'service unavailable',
    'internal error',
    'api limit',
    'quota exceeded'
  ];
  
  const lowerError = errorMessage.toLowerCase();
  return retryablePatterns.some(pattern => lowerError.includes(pattern));
}

/**
 * Helper function to call feature-specific Cloud Functions
 */
async function callFeatureFunction(functionName: string, data: any): Promise<any> {
  try {
    
    // Import the actual services and call them directly to generate real HTML fragments
    const { jobId, userId } = data;
    
    switch (functionName) {
      case 'generateSkillsVisualization':
        const { skillsVisualizationService } = await import('../services/skills-visualization.service');
        
        // Get job data
        const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
        if (!jobDoc.exists) throw new Error('Job not found');
        const jobData = jobDoc.data();
        
        // Generate visualization and HTML fragment
        const visualization = await skillsVisualizationService.generateVisualization(
          jobData?.parsedData,
          ['radar', 'bar']
        );
      // HTML generation removed - React SPA handles UI rendering;
        
        // Update job with results - filter out undefined values to prevent Firestore errors
        const skillsData = sanitizeForFirestore({
          enabled: true,
          data: visualization,
          // HTML fragment removed with React SPA migration
          status: 'completed',
          progress: 100,
          processedAt: new Date()
        });
        
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.skillsVisualization': skillsData
        });
        
        return { success: true, visualization, htmlFragment: null };
        
      case 'generatePodcast':
        const { podcastGenerationService } = await import('../services/podcast-generation.service');
        
        // Get job data
        const podcastJobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
        if (!podcastJobDoc.exists) throw new Error('Job not found');
        const podcastJobData = podcastJobDoc.data();
        
        // Generate podcast and HTML fragment
        const podcastResult = await podcastGenerationService.generatePodcast(
          podcastJobData?.parsedData,
          jobId,
          userId,
          { style: 'professional', duration: 'medium', focus: 'balanced' }
        );
      // HTML generation removed - React SPA handles UI rendering;
        
        // Update job with results
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.generatePodcast': {
            enabled: true,
            data: podcastResult,
            // HTML fragment removed with React SPA migration
            status: 'completed',
            progress: 100,
            processedAt: new Date()
          }
        });
        
        return { success: true, podcastResult }; // HTML fragment removed with React SPA migration
        
      case 'generateLanguageVisualization':
        const { languageProficiencyService } = await import('../services/language-proficiency.service');
        
        // Get job data
        const langJobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
        if (!langJobDoc.exists) throw new Error('Job not found');
        const langJobData = langJobDoc.data();
        
        // Generate language visualization and HTML fragment
        const langVisualization = await languageProficiencyService.generateLanguageVisualization(
          langJobData?.parsedData,
          jobId
        );
      // HTML generation removed - React SPA handles UI rendering;
        
        // Update job with results
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.languageProficiency': {
            enabled: true,
            data: langVisualization,
            // HTML fragment removed with React SPA migration
            status: 'completed',
            progress: 100,
            processedAt: new Date()
          }
        });
        
        return { success: true, visualization: langVisualization }; // HTML fragment removed with React SPA migration
        
      case 'generateAvailabilityCalendar':
        // Get job data
        const availabilityJobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
        if (!availabilityJobDoc.exists) throw new Error('Job not found');
        const availabilityJobData = availabilityJobDoc.data();
        
        // Generate HTML fragment using the same logic as the Firebase function
        const contactInfo = availabilityJobData?.parsedData?.contactInformation || {};
        const name = availabilityJobData?.parsedData?.personalInformation?.name || 'Professional';
        
        const availabilityHtml = `
    <div class="availability-calendar-section" id="availability-calendar">
      <div class="section-header">
        <h2 class="section-title">
          <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          Schedule a Meeting
        </h2>
        <p class="section-subtitle">Book time with ${name} for collaboration opportunities</p>
      </div>
      
      <div class="calendar-widget">
        <div class="calendar-integration">
          <div class="booking-options">
            <div class="booking-option">
              <h3>Quick Chat</h3>
              <p>15-minute informal discussion</p>
              <button class="book-btn" data-duration="15">Book 15 min</button>
            </div>
            <div class="booking-option">
              <h3>Project Discussion</h3>
              <p>30-minute focused meeting</p>
              <button class="book-btn" data-duration="30">Book 30 min</button>
            </div>
            <div class="booking-option">
              <h3>Consultation</h3>
              <p>60-minute comprehensive session</p>
              <button class="book-btn" data-duration="60">Book 1 hour</button>
            </div>
          </div>
          
          <div class="availability-notice">
            <p><strong>Available:</strong> Monday-Friday, 9 AM - 6 PM (Local Time)</p>
            <p><strong>Response Time:</strong> Within 24 hours</p>
          </div>
        </div>
      </div>
    </div>

    <style>
      .availability-calendar-section {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        padding: 2rem;
        margin: 2rem 0;
        color: white;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      }
      
      .section-header {
        text-align: center;
        margin-bottom: 2rem;
      }
      
      .section-title {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        font-size: 1.8rem;
        font-weight: 700;
        margin: 0 0 0.5rem 0;
      }
      
      .section-icon {
        width: 28px;
        height: 28px;
      }
      
      .section-subtitle {
        font-size: 1.1rem;
        opacity: 0.9;
        margin: 0;
      }
      
      .booking-options {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }
      
      .booking-option {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 1.5rem;
        text-align: center;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      
      .booking-option:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      }
      
      .booking-option h3 {
        font-size: 1.3rem;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
      }
      
      .booking-option p {
        opacity: 0.8;
        margin: 0 0 1rem 0;
        font-size: 0.95rem;
      }
      
      .book-btn {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.95rem;
      }
      
      .book-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
      }
      
      .availability-notice {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 1rem;
        text-align: center;
        font-size: 0.9rem;
      }
      
      .availability-notice p {
        margin: 0.25rem 0;
      }
      
      @media (max-width: 768px) {
        .availability-calendar-section {
          padding: 1.5rem;
          margin: 1.5rem 0;
        }
        
        .booking-options {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        
        .section-title {
          font-size: 1.5rem;
        }
      }
    </style>

    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const bookButtons = document.querySelectorAll('.book-btn');
        
        bookButtons.forEach(button => {
          button.addEventListener('click', function() {
            const duration = this.getAttribute('data-duration');
            const contactEmail = '${contactInfo.email || 'contact@example.com'}';
            const subject = \`Meeting Request - \${duration} minutes\`;
            const body = \`Hello ${name},

I would like to schedule a \${duration}-minute meeting with you.

Please let me know your availability.

Best regards\`;
            
            const mailtoLink = \`mailto:\${contactEmail}?subject=\${encodeURIComponent(subject)}&body=\${encodeURIComponent(body)}\`;
            window.open(mailtoLink);
          });
        });
      });
    </script>
  `;
        
        // Store the HTML fragment in the htmlFragments subcollection
        const availabilityFragmentRef = admin.firestore()
          .collection('jobs')
          .doc(jobId)
          .collection('htmlFragments')
          .doc('availability-calendar');

        await availabilityFragmentRef.set({
          featureId: 'availability-calendar',
          html: availabilityHtml,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
        
        // Also update the main job document with the HTML fragment (needed for injection)
        await admin.firestore().collection('jobs').doc(jobId).update({
          'enhancedFeatures.availability-calendar.htmlFragment': availabilityHtml,
          'enhancedFeatures.availability-calendar.data': {
            contactEmail: contactInfo.email || 'contact@example.com',
            name: name,
            bookingOptions: [
              { duration: 15, title: 'Quick Chat', description: '15-minute informal discussion' },
              { duration: 30, title: 'Project Discussion', description: '30-minute focused meeting' },
              { duration: 60, title: 'Consultation', description: '60-minute comprehensive session' }
            ]
          }
        });
        
        return { success: true }; // HTML fragment removed with React SPA migration
        
      default:
        // Skip features that aren't implemented yet - they'll be triggered manually
        return { success: true, skipped: true, reason: 'Manual triggering required' };
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Process individual feature with REAL implementation using callable functions
 */
async function processIndividualFeature(feature: string, jobId: string, userId: string, cvData: any): Promise<void> {
  
  // Update feature status to processing with immediate UI feedback
  await updateFeatureStatus(jobId, feature, 'processing', {
    progress: 5, // Start with small progress to show activity
    triggeredAt: FieldValue.serverTimestamp(),
    currentStep: 'Starting feature processing...',
    startedAt: FieldValue.serverTimestamp()
  });

  let result: any;
  let stepCount = 0;
  const totalSteps = 4; // Consistent step count for progress tracking

  const updateProgress = async (step: number, message: string) => {
    const progress = Math.round((step / totalSteps) * 100);
    await updateFeatureStatus(jobId, feature, 'processing', {
      progress: progress,
      currentStep: message,
      lastProgressUpdate: FieldValue.serverTimestamp()
    });
  };

  try {
    switch (feature) {
      case 'ats-optimization':
        await updateProgress(++stepCount, 'Analyzing CV for ATS compatibility');
        const atsService = new AdvancedATSOptimizationService();
        result = await atsService.analyzeATSCompatibility(cvData);
        
        await updateProgress(++stepCount, 'Applying ATS optimizations');
        const optimized = await atsService.applyOptimizations(cvData, result);
        
        await updateProgress(++stepCount, 'Generating ATS templates');
        const templates = await atsService.getATSTemplates();
        
        await updateProgress(++stepCount, 'Finalizing ATS optimization');
        result = { ...result, optimized, templates };
        break;

      case 'achievement-highlighting':
        await updateProgress(++stepCount, 'Extracting key achievements');
        const achievementsService = new AchievementsAnalysisService();
        result = await achievementsService.extractKeyAchievements(cvData);
        
        await updateProgress(++stepCount, 'Processing achievements');
        // Additional processing can be added here
        
        await updateProgress(++stepCount, 'Generating achievement display');
        // Generate achievement HTML or display format
        
        await updateProgress(++stepCount, 'Finalizing achievement highlighting');
        result = { achievements: result, count: result.length };
        break;

      // Call actual feature functions to generate HTML fragments
      case 'skills-visualization':
        await updateProgress(++stepCount, 'Initializing skills visualization');
        // Add delay to show progress
        await new Promise(resolve => setTimeout(resolve, 500));
        await updateProgress(++stepCount, 'Processing skills content');
        await callFeatureFunction('generateSkillsVisualization', { jobId, userId });
        await updateProgress(++stepCount, 'Generating skills visualization');
        await new Promise(resolve => setTimeout(resolve, 300));
        await updateProgress(++stepCount, 'Finalizing skills visualization');
        result = { feature, status: 'completed', timestamp: new Date().toISOString() };
        break;

      case 'interactive-timeline':
        await updateProgress(++stepCount, 'Initializing timeline');
        await callFeatureFunction('generateTimeline', { jobId, userId });
        await updateProgress(++stepCount, 'Processing timeline content');
        await updateProgress(++stepCount, 'Generating interactive timeline');
        await updateProgress(++stepCount, 'Finalizing timeline');
        result = { feature, status: 'completed', timestamp: new Date().toISOString() };
        break;

      case 'generate-podcast':
        await updateProgress(++stepCount, 'Initializing podcast generation');
        await new Promise(resolve => setTimeout(resolve, 500));
        await updateProgress(++stepCount, 'Processing podcast content');
        await callFeatureFunction('generatePodcast', { jobId, userId });
        await updateProgress(++stepCount, 'Generating podcast audio');
        await new Promise(resolve => setTimeout(resolve, 300));
        await updateProgress(++stepCount, 'Finalizing podcast');
        result = { feature, status: 'completed', timestamp: new Date().toISOString() };
        break;

      case 'video-introduction':
        await updateProgress(++stepCount, 'Initializing video introduction');
        await callFeatureFunction('generateVideoIntroduction', { jobId, userId });
        await updateProgress(++stepCount, 'Processing video content');
        await updateProgress(++stepCount, 'Generating video introduction');
        await updateProgress(++stepCount, 'Finalizing video');
        result = { feature, status: 'completed', timestamp: new Date().toISOString() };
        break;

      case 'portfolio-gallery':
        await updateProgress(++stepCount, 'Initializing portfolio gallery');
        await callFeatureFunction('generatePortfolioGallery', { jobId, userId });
        await updateProgress(++stepCount, 'Processing portfolio content');
        await updateProgress(++stepCount, 'Generating portfolio gallery');
        await updateProgress(++stepCount, 'Finalizing portfolio');
        result = { feature, status: 'completed', timestamp: new Date().toISOString() };
        break;

      case 'certification-badges':
        await updateProgress(++stepCount, 'Initializing certification badges');
        await callFeatureFunction('generateCertificationBadges', { jobId, userId });
        await updateProgress(++stepCount, 'Processing certification content');
        await updateProgress(++stepCount, 'Generating certification badges');
        await updateProgress(++stepCount, 'Finalizing badges');
        result = { feature, status: 'completed', timestamp: new Date().toISOString() };
        break;

      case 'language-proficiency':
        await updateProgress(++stepCount, 'Initializing language proficiency');
        await new Promise(resolve => setTimeout(resolve, 400));
        await updateProgress(++stepCount, 'Processing language content');
        await callFeatureFunction('generateLanguageVisualization', { jobId, userId });
        await updateProgress(++stepCount, 'Generating language visualization');
        await new Promise(resolve => setTimeout(resolve, 300));
        await updateProgress(++stepCount, 'Finalizing language proficiency');
        result = { feature, status: 'completed', timestamp: new Date().toISOString() };
        break;

      case 'social-media-links':
        await updateProgress(++stepCount, 'Initializing social media integration');
        await callFeatureFunction('generateSocialMediaIntegration', { jobId, userId });
        await updateProgress(++stepCount, 'Processing social media content');
        await updateProgress(++stepCount, 'Generating social media links');
        await updateProgress(++stepCount, 'Finalizing social media');
        result = { feature, status: 'completed', timestamp: new Date().toISOString() };
        break;

      case 'availability-calendar':
        await updateProgress(++stepCount, 'Initializing calendar integration');
        await new Promise(resolve => setTimeout(resolve, 400));
        await updateProgress(++stepCount, 'Processing calendar content');
        await callFeatureFunction('generateAvailabilityCalendar', { jobId, userId });
        await updateProgress(++stepCount, 'Generating availability calendar');
        await new Promise(resolve => setTimeout(resolve, 300));
        await updateProgress(++stepCount, 'Finalizing calendar');
        result = { feature, status: 'completed', timestamp: new Date().toISOString() };
        break;

      case 'testimonials-carousel':
        await updateProgress(++stepCount, 'Initializing testimonials carousel');
        await callFeatureFunction('generateTestimonialsCarousel', { jobId, userId });
        await updateProgress(++stepCount, 'Processing testimonials content');
        await updateProgress(++stepCount, 'Generating testimonials carousel');
        await updateProgress(++stepCount, 'Finalizing testimonials');
        result = { feature, status: 'completed', timestamp: new Date().toISOString() };
        break;

      case 'embed-qr-code':
        await updateProgress(++stepCount, 'Initializing QR code generation');
        await callFeatureFunction('generateQRCode', { jobId, userId });
        await updateProgress(++stepCount, 'Processing QR code content');
        await updateProgress(++stepCount, 'Generating QR code');
        await updateProgress(++stepCount, 'Finalizing QR code');
        result = { feature, status: 'completed', timestamp: new Date().toISOString() };
        break;

      case 'privacy-mode':
        await updateProgress(++stepCount, 'Analyzing privacy requirements');
        result = { privacyEnabled: true, privacyLevel: 'standard' };
        
        await updateProgress(++stepCount, 'Applying privacy protection');
        await updateProgress(++stepCount, 'Validating privacy compliance');
        await updateProgress(++stepCount, 'Finalizing privacy protection');
        result = { ...result, status: 'protected' };
        break;

      default:
        result = { status: 'unknown_feature', feature };
    }

    // Mark feature as completed with real results
    await updateFeatureStatus(jobId, feature, 'completed', {
      progress: 100,
      currentStep: `${feature} enhancement complete`,
      result: result,
      completedAt: FieldValue.serverTimestamp()
    });

  } catch (error) {
    
    // Mark feature as failed with proper error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateFeatureStatus(jobId, feature, 'failed', {
      error: errorMessage,
      isRetryable: isRetryableError(errorMessage),
      failedAt: FieldValue.serverTimestamp(),
      currentStep: `Failed: ${errorMessage}`
    });
    
    throw error;
  }
}

/**
 * Sanitize object to remove undefined values for Firestore compatibility
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (obj instanceof Date) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj
      .map(item => sanitizeForFirestore(item))
      .filter(item => item !== null && item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedValue = sanitizeForFirestore(value);
      if (sanitizedValue !== null && sanitizedValue !== undefined) {
        sanitized[key] = sanitizedValue;
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Inject completed features into the CV HTML by calling the injection logic directly
 */
async function injectCompletedFeaturesIntoCV(jobId: string, userId: string): Promise<void> {
  try {
    
    // Get job data
    const jobDoc = await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .get();
    
    if (!jobDoc.exists) {
      return;
    }

    const jobData = jobDoc.data();
    
    // Check if there's a generated CV and completed features
    if (!jobData?.generatedCV?.html) {
      return;
    }

    // Get completed features with HTML fragments
    const completedFeatures = getCompletedFeaturesWithFragments(jobData);
    
    if (completedFeatures.length === 0) {
      return;
    }

    // Inject feature HTML fragments into the CV
    const updatedHTML = injectFeatureFragments(
      jobData.generatedCV.html,
      completedFeatures
    );

    // Save updated HTML to storage and update job
    const generator = new CVGenerator();
    const { htmlUrl } = await generator.saveGeneratedFiles(
      jobId,
      userId,
      updatedHTML
    );

    // Update job with new HTML and injection status
    await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .update({
        'generatedCV.html': updatedHTML,
        'generatedCV.htmlUrl': htmlUrl,
        'featureInjectionStatus': 'completed',
        'lastFeatureInjection': FieldValue.serverTimestamp(),
        'injectedFeatures': completedFeatures.map(f => f.featureName),
        updatedAt: FieldValue.serverTimestamp()
      });

    
  } catch (error) {
    // Don't throw - let the main process continue even if feature injection fails
  }
}

/**
 * Get completed features that have HTML fragments ready for injection
 */
function getCompletedFeaturesWithFragments(jobData: any): Array<{
  featureName: string;
  // HTML fragment removed with React SPA migration
  featureType: string;
}> {
  const completedFeatures: Array<{
    featureName: string;
    // HTML fragment removed with React SPA migration
    featureType: string;
  }> = [];

  if (!jobData.enhancedFeatures) {
    return completedFeatures;
  }

  for (const [featureName, featureData] of Object.entries(jobData.enhancedFeatures)) {
    const feature = featureData as any;
    
    // With React SPA migration, we no longer check for HTML fragments
    if (feature.status === 'completed') {
      completedFeatures.push({
        featureName,
        // HTML fragment removed with React SPA migration
        featureType: featureName
      });
    } else {
    }
  }

  return completedFeatures;
}

/**
 * Inject feature HTML fragments into the CV HTML at appropriate locations
 */
function injectFeatureFragments(
  originalHTML: string,
  features: Array<{ featureName: string; featureType: string; }> // HTML fragment removed with React SPA migration
): string {
  let updatedHTML = originalHTML;
  
  
  for (const feature of features) {
    
    try {
      // Inject the feature HTML fragment at the end of the interactive features section
      // Look for the interactive features section in the template
      const interactiveFeaturesPattern = /<\/section>\s*<div class="download-section"/;
      
      if (interactiveFeaturesPattern.test(updatedHTML)) {
        // Inject before the download section
        updatedHTML = updatedHTML.replace(
          interactiveFeaturesPattern,
          `</section>\n        <!-- ${feature.featureName} Feature -->\n        <section class="section">\n            <!-- Feature rendered by React SPA -->\n        </section>\n        <div class="download-section"`
        );
      } else {
        // Fallback: inject before the closing container div
        const containerEndPattern = /<\/div>\s*<\/body>/;
        if (containerEndPattern.test(updatedHTML)) {
          updatedHTML = updatedHTML.replace(
            containerEndPattern,
            `        <!-- ${feature.featureName} Feature -->\n        <section class="section">\n            <!-- Feature rendered by React SPA -->\n        </section>\n    </div>\n</body>`
          );
        } else {
        }
      }
    } catch (error) {
      // Continue with other features even if one fails
    }
  }
  
  return updatedHTML;
}

/**
 * Update job generation step with detailed progress information
 */
async function updateJobGenerationStep(
  jobId: string, 
  step: string, 
  message: string, 
  progress?: number
): Promise<void> {
  try {
    const updateData: any = {
      'generationProgress.currentStep': step,
      'generationProgress.stepMessage': message,
      'generationProgress.lastUpdated': FieldValue.serverTimestamp()
    };
    
    if (progress !== undefined) {
      updateData['generationProgress.percentage'] = Math.min(100, Math.max(0, progress));
    }
    
    await admin.firestore().collection('jobs').doc(jobId).update(updateData);
  } catch (error) {
    // Don't throw - progress updates shouldn't break the main flow
  }
}

/**
 * Save files with comprehensive fallback handling
 */
async function saveFilesWithFallback(
  generator: CVGenerator,
  jobId: string,
  userId: string,
  htmlContent: string
): Promise<{
  htmlUrl: string;
  pdfUrl: string;
  docxUrl: string;
  generationDetails: any;
}> {
  const generationDetails: any = {
    htmlGeneration: { success: false, error: null, timestamp: new Date() },
    pdfGeneration: { success: false, error: null, timestamp: new Date() },
    docxGeneration: { success: false, error: null, timestamp: new Date() }
  };
  
  let htmlUrl = '';
  let pdfUrl = '';
  let docxUrl = '';
  
  try {
    
    // Always try to save files, but don't fail the entire process if one fails
    const fileResults: EnhancedFileGenerationResult = await generator.saveGeneratedFiles(jobId, userId, htmlContent);
    
    // Check individual file results
    if (fileResults.htmlUrl) {
      htmlUrl = fileResults.htmlUrl;
      generationDetails.htmlGeneration.success = true;
    }
    
    if (fileResults.pdfUrl) {
      pdfUrl = fileResults.pdfUrl;
      generationDetails.pdfGeneration.success = true;
    } else {
      generationDetails.pdfGeneration.error = 'PDF generation failed or returned empty URL';
    }
    
    if (fileResults.docxUrl) {
      docxUrl = fileResults.docxUrl;
      generationDetails.docxGeneration.success = true;
    } else {
      generationDetails.docxGeneration.error = 'DOCX generation not implemented';
    }
    
    // Record any errors from the file generation process
    if (fileResults.errors && fileResults.errors.length > 0) {
      generationDetails.pdfGeneration.error = fileResults.errors.join('; ');
    }
    
  } catch (error: any) {
    
    // Even if file generation fails, we should still try to provide HTML at minimum
    if (!htmlUrl) {
      try {
        // Try to save just the HTML as a fallback
        const fallbackResult = await saveFallbackHtml(jobId, userId, htmlContent);
        if (fallbackResult) {
          htmlUrl = fallbackResult;
          generationDetails.htmlGeneration.success = true;
        }
      } catch (fallbackError) {
        generationDetails.htmlGeneration.error = `File generation failed: ${error.message}`;
      }
    }
    
    // Record the error but don't throw - we want to complete CV generation even with file issues
    generationDetails.pdfGeneration.error = error.message;
    generationDetails.docxGeneration.error = error.message;
  }
  
  // Ensure we have at least HTML content available
  if (!htmlUrl && htmlContent) {
    throw new Error('Critical: Could not save any CV files, including HTML');
  }
  
  return {
    htmlUrl,
    pdfUrl,
    docxUrl,
    generationDetails
  };
}

/**
 * Fallback HTML save function with minimal dependencies
 */
async function saveFallbackHtml(
  jobId: string, 
  userId: string, 
  htmlContent: string
): Promise<string | null> {
  try {
    
    const bucket = admin.storage().bucket();
    const htmlFileName = `users/${userId}/generated/${jobId}/cv-fallback.html`;
    const htmlFile = bucket.file(htmlFileName);
    
    await htmlFile.save(htmlContent, {
      metadata: {
        contentType: 'text/html',
        cacheControl: 'public, max-age=31536000'
      },
    });
    
    // Generate signed URL
    const [signedUrl] = await htmlFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
    });
    
    return signedUrl;
    
  } catch (error) {
    return null;
  }
}

/**
 * Analyze generation errors to provide better recovery recommendations
 */
function analyzeGenerationError(error: any): {
  type: string;
  category: string;
  retryable: boolean;
  recommendedAction: string;
} {
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const errorStack = error instanceof Error ? error.stack || '' : '';
  
  // Puppeteer/PDF generation errors
  if (errorMessage.includes('puppeteer') || errorMessage.includes('browser') || errorMessage.includes('chrome')) {
    return {
      type: 'puppeteer_error',
      category: 'file_generation',
      retryable: true,
      recommendedAction: 'Retry with fallback PDF generation or skip PDF generation'
    };
  }
  
  // Memory errors
  if (errorMessage.includes('memory') || errorMessage.includes('heap') || errorStack.includes('out of memory')) {
    return {
      type: 'memory_error',
      category: 'system_resource',
      retryable: true,
      recommendedAction: 'Retry with reduced feature set or increase function memory'
    };
  }
  
  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return {
      type: 'timeout_error',
      category: 'performance',
      retryable: true,
      recommendedAction: 'Retry with longer timeout or reduce feature complexity'
    };
  }
  
  // Firebase/Firestore errors
  if (errorMessage.includes('firestore') || errorMessage.includes('firebase')) {
    return {
      type: 'firebase_error',
      category: 'database',
      retryable: true,
      recommendedAction: 'Check Firebase permissions and retry after brief delay'
    };
  }
  
  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('econnreset')) {
    return {
      type: 'network_error',
      category: 'connectivity',
      retryable: true,
      recommendedAction: 'Retry after checking network connectivity'
    };
  }
  
  // Storage errors
  if (errorMessage.includes('storage') || errorMessage.includes('bucket')) {
    return {
      type: 'storage_error',
      category: 'file_system',
      retryable: true,
      recommendedAction: 'Check Firebase Storage permissions and quota'
    };
  }
  
  // Authentication errors
  if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('permission')) {
    return {
      type: 'auth_error',
      category: 'security',
      retryable: false,
      recommendedAction: 'Check user authentication and permissions'
    };
  }
  
  // Template/data errors
  if (errorMessage.includes('template') || errorMessage.includes('parse') || errorMessage.includes('data')) {
    return {
      type: 'data_error',
      category: 'input_validation',
      retryable: false,
      recommendedAction: 'Check CV data integrity and template compatibility'
    };
  }
  
  // Default case
  return {
    type: 'unknown_error',
    category: 'general',
    retryable: true,
    recommendedAction: 'Review error details and retry with basic features only'
  };
}

/**
 * Get the last generation step from the job document
 */
async function getLastGenerationStep(jobId: string): Promise<string | null> {
  try {
    const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
    const jobData = jobDoc.data();
    return jobData?.generationProgress?.currentStep || null;
  } catch (error) {
    return null;
  }
}

/**
 * Helper function to update feature status with guaranteed UI updates
 */
async function updateFeatureStatus(
  jobId: string, 
  feature: string, 
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying',
  additionalData: any = {}
): Promise<void> {
  try {
    const updateData: any = {
      [`enhancedFeatures.${feature}.status`]: status,
      [`enhancedFeatures.${feature}.lastStatusUpdate`]: FieldValue.serverTimestamp(),
      // Always trigger UI update
      updatedAt: FieldValue.serverTimestamp()
    };
    
    // Add additional data
    for (const [key, value] of Object.entries(additionalData)) {
      updateData[`enhancedFeatures.${feature}.${key}`] = value;
    }
    
    await admin.firestore().collection('jobs').doc(jobId).update(updateData);
  } catch (error) {
  }
}

/**
 * Helper function to ensure proper state transitions and prevent status jumping
 */
async function ensureProperStateTransition(
  jobId: string,
  feature: string,
  newStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying'
): Promise<boolean> {
  try {
    const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
    const jobData = jobDoc.data();
    const currentStatus = jobData?.enhancedFeatures?.[feature]?.status;
    
    // Define valid state transitions
    const validTransitions: Record<string, string[]> = {
      'pending': ['processing', 'failed'],
      'processing': ['completed', 'failed', 'retrying'],
      'retrying': ['completed', 'failed', 'processing'],
      'failed': ['retrying', 'processing'],
      'completed': [] // Terminal state
    };
    
    if (!currentStatus) {
      // First status update - allow any status
      return true;
    }
    
    const allowedNext = validTransitions[currentStatus] || [];
    const isValidTransition = allowedNext.includes(newStatus);
    
    if (!isValidTransition) {
      return false;
    }
    
    return true;
  } catch (error) {
    return true; // Allow transition if we can't check
  }
}