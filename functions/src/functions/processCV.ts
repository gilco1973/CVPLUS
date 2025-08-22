import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { CVParser } from '../services/cvParser';
import { PIIDetector } from '../services/piiDetector';
import { corsOptions } from '../config/cors';
import { requireGoogleAuth, updateUserLastLogin } from '../utils/auth';

export const processCV = onCall(
  {
    timeoutSeconds: 300,
    memory: '2GiB',
    ...corsOptions,
    secrets: ['ANTHROPIC_API_KEY']
  },
  async (request) => {
    
    // Require Google authentication
    const user = await requireGoogleAuth(request);
    // PII REMOVED: Email logging removed for security compliance
    
    // Update user login tracking
    await updateUserLastLogin(user.uid, user.email, user.name, user.picture);

    const { jobId, fileUrl, mimeType, isUrl } = request.data;
    
    console.log('ProcessCV parameters:', { 
      jobId: jobId || 'MISSING', 
      fileUrl: fileUrl ? (fileUrl.substring(0, 100) + '...') : 'MISSING',
      mimeType: mimeType || 'MISSING',
      isUrl: isUrl
    });

    if (!jobId || (!fileUrl && !isUrl)) {
      throw new Error('Missing required parameters');
    }

    try {
      // Update job status (use set with merge to handle case where document might not exist yet)
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .set({
          status: 'processing',
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

      // Get job data to retrieve user instructions
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      const jobData = jobDoc.data();
      const userInstructions = jobData?.userInstructions;

      // Initialize CV parser
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('Anthropic API key not configured');
      }
      
      const parser = new CVParser(apiKey);
      let parsedCV;

      if (isUrl) {
        // Parse from URL
        parsedCV = await parser.parseFromURL(fileUrl, userInstructions);
      } else {
        // Download file from storage
        const bucket = admin.storage().bucket();
        
        // Extract the file path from the download URL
        // The URL format is: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded-path}?alt=media&token=...
        const urlObj = new URL(fileUrl);
        const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
        if (!pathMatch) {
          throw new Error('Invalid storage URL format');
        }
        
        // Decode the file path
        const filePath = decodeURIComponent(pathMatch[1]);
        
        const file = bucket.file(filePath);
        const [buffer] = await file.download();
        
        // Parse the CV
        parsedCV = await parser.parseCV(buffer, mimeType, userInstructions);
      }

      // Detect PII
      const piiDetector = new PIIDetector(apiKey);
      const piiResult = await piiDetector.detectAndMaskPII(parsedCV);

      // Save parsed data with PII information and user association
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .set({
          status: 'analyzed',
          parsedData: parsedCV,
          piiDetection: {
            hasPII: piiResult.hasPII,
            detectedTypes: piiResult.detectedTypes,
            recommendations: piiResult.recommendations
          },
          privacyVersion: piiResult.maskedData,
          userId: user.uid, // Associate job with authenticated user
          userEmail: user.email,
          hasCalendarPermissions: user.hasCalendarPermissions || false,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

      // ALL users should get access to interactive features through the normal workflow
      // QuickCreate just means "auto-select all features and generate immediately"
      console.log('🔍 [DEBUG] ProcessCV completed for job:', jobId, {
        quickCreate: jobData?.quickCreate,
        hasSettings: !!jobData?.settings,
        allJobDataKeys: Object.keys(jobData || {})
      });
      
      // If quick create, automatically initiate feature generation with default features
      if (jobData?.quickCreate || jobData?.settings?.applyAllEnhancements) {
        
        // Import the generateCVCore function for background processing
        const { generateCVCore } = await import('./generateCV');
        
        // Default features for Quick Create users
        const defaultFeatures = [
          'ats-optimization',
          'achievement-highlighting', 
          'skills-visualization',
          'interactive-timeline',
          'certification-badges'
        ];
        
        // Initialize feature tracking
        const enhancedFeatures: Record<string, any> = {};
        for (const feature of defaultFeatures) {
          enhancedFeatures[feature] = {
            status: 'pending',
            progress: 0,
            currentStep: 'Queued for processing',
            enabled: true,
            queuedAt: new Date()
          };
        }
        
        await admin.firestore()
          .collection('jobs')
          .doc(jobId)
          .set({
            status: 'generating',
            selectedFeatures: defaultFeatures,
            enhancedFeatures: enhancedFeatures,
            quickCreateInProgress: true,
            generationStartedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
          
        // Trigger background feature generation
        setImmediate(async () => {
          try {
            
            await generateCVCore(jobId, 'modern-professional', defaultFeatures, user.uid);
            
          } catch (error: any) {
            
            // Update job with failure status
            await admin.firestore()
              .collection('jobs')
              .doc(jobId)
              .set({
                status: 'failed',
                error: `Quick Create generation failed: ${error.message}`,
                quickCreateInProgress: false,
                updatedAt: FieldValue.serverTimestamp()
              }, { merge: true });
          }
        });
        
      }
      
      // For regular users, initialize basic enhanced features to show in preview
      if (!jobData?.quickCreate && !jobData?.settings?.applyAllEnhancements) {
        
        // Basic features that are fast and don't require generation
        const basicFeatures = ['skills-visualization', 'ats-optimization'];
        const enhancedFeatures: Record<string, any> = {};
        
        for (const feature of basicFeatures) {
          enhancedFeatures[feature] = {
            status: 'pending',
            progress: 0,
            currentStep: 'Ready for generation',
            enabled: false, // Not auto-enabled, user can choose to generate
            queuedAt: new Date()
          };
        }
        
        await admin.firestore()
          .collection('jobs')
          .doc(jobId)
          .set({
            enhancedFeatures: enhancedFeatures,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
          
      }
      
      // Note: Regular users will go through normal flow:
      // 1. ProcessCV completes → status: 'analyzed' 
      // 2. User goes to analysis page → selects features
      // 3. User generates CV with selected features → ALL features available

      return {
        success: true,
        jobId,
        parsedData: parsedCV
      };

    } catch (error: any) {
      
      // Determine error type and provide appropriate user message
      let userMessage = error.message;
      let errorType = 'unknown';
      
      if (error.message.includes('credit balance is too low') || error.message.includes('billing issues')) {
        errorType = 'billing';
        userMessage = 'The AI service is temporarily unavailable due to billing issues. Please try again later or contact support.';
      } else if (error.message.includes('Authentication failed')) {
        errorType = 'auth';
        userMessage = 'Authentication failed with the AI service. Please try again later or contact support.';
      } else if (error.message.includes('overloaded') || error.message.includes('429')) {
        errorType = 'rate_limit';
        userMessage = 'The AI service is currently overloaded. Please try again in a few moments.';
      } else if (error.message.includes('service is temporarily')) {
        errorType = 'service_unavailable';
        userMessage = 'The AI service is temporarily experiencing issues. Please try again later.';
      }
      
      // Update job status to failed with detailed error info
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .set({
          status: 'failed',
          error: userMessage,
          errorType: errorType,
          technicalError: error.message, // Keep original error for debugging
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

      throw new Error(userMessage);
    }
  });