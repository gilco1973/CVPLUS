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
    console.log('ProcessCV function called');
    console.log('Request auth:', request.auth ? 'Present' : 'Missing');
    console.log('Request data keys:', Object.keys(request.data || {}));
    
    // Require Google authentication
    const user = await requireGoogleAuth(request);
    console.log(`[PROCESS-CV] Authenticated Google user: ${user.uid}`);
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
      console.error('Missing required parameters:', { jobId, fileUrl: !!fileUrl, isUrl });
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
        console.log('Downloading file from path:', filePath);
        
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
      
      // If quick create, set flag for frontend to auto-trigger full workflow with all features
      if (jobData?.quickCreate || jobData?.settings?.applyAllEnhancements) {
        console.log('🚀 Quick Create: Setting flag for frontend to trigger full workflow with all features');
        
        await admin.firestore()
          .collection('jobs')
          .doc(jobId)
          .set({
            status: 'completed',
            quickCreateReady: true, // Flag to indicate frontend should auto-trigger full generation
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
          
        console.log('✅ Quick Create: Flag set, frontend will auto-trigger full workflow');
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
      console.error('Error processing CV:', error);
      
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