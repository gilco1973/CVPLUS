/**
 * Cloud Functions for public CV profiles
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { integrationsService } from '../services/integrations.service';
import * as admin from 'firebase-admin';
import { EnhancedJob, PublicCVProfile, PrivacySettings } from '../types/enhanced-models';
import { maskPII } from '../utils/privacy';
import { corsOptions } from '../config/cors';

interface CreatePublicProfileRequest {
  jobId: string;
}

interface GetPublicProfileRequest {
  slug: string;
}

interface UpdateProfileSettingsRequest {
  jobId: string;
  settings: {
    isPublic: boolean;
    allowContactForm: boolean;
    showAnalytics: boolean;
    customSlug?: string;
  };
}

interface SubmitContactFormRequest {
  jobId: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  company?: string;
  message: string;
}

interface TrackQRScanRequest {
  jobId: string;
  metadata?: {
    userAgent?: string;
    source?: string;
  };
}

/**
 * Create public profile for a CV
 */
export const createPublicProfile = onCall<CreatePublicProfileRequest>(
  {
    timeoutSeconds: 120,
    ...corsOptions
  },
  async (request: CallableRequest<CreatePublicProfileRequest>) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId } = request.data;
    if (!jobId) {
      throw new HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Unauthorized access to job');
      }

      // Check if parsed CV exists
      if (!job.parsedData) {
        throw new HttpsError('failed-precondition', 'CV must be parsed before creating public profile');
      }

      // Generate public profile with default privacy settings
      const defaultPrivacySettings: PrivacySettings = {
        enabled: true,
        level: 'moderate',
        maskingRules: {
          name: false,
          email: true,
          phone: true,
          address: true,
          companies: false,
          dates: false
        }
      };
      const maskedCV = maskPII(job.parsedData, defaultPrivacySettings);
      const publicSlug = `cv-${jobId.substring(0, 8)}-${Date.now()}`;
      
      // Generate QR code for the public profile
      const publicUrl = `${process.env.PUBLIC_URL || 'https://cvplus.ai'}/public/${publicSlug}`;
      const qrCodeBuffer = await integrationsService.generateQRCode(publicUrl);
      
      // Upload QR code to storage
      const bucket = admin.storage().bucket();
      const qrFile = bucket.file(`public-profiles/${jobId}/qr-code.png`);
      await qrFile.save(qrCodeBuffer, {
        metadata: {
          contentType: 'image/png'
        }
      });
      const [qrCodeUrl] = await qrFile.getSignedUrl({
        action: 'read',
        expires: '03-09-2491' // Far future date
      });

      // Create public profile
      const publicProfile: PublicCVProfile = {
        jobId,
        userId: job.userId,
        slug: publicSlug,
        parsedCV: maskedCV,
        features: job.enhancedFeatures || {},
        template: job.selectedTemplate || 'modern',
        isPublic: true,
        allowContactForm: true,
        qrCodeUrl,
        publicUrl,
        createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
        updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
        analytics: {
          views: 0,
          qrScans: 0,
          contactSubmissions: 0,
          lastViewedAt: null
        }
      };

      // Save to Firestore
      await admin.firestore()
        .collection('publicProfiles')
        .doc(jobId)
        .set(publicProfile);

      // Update job with public profile info
      await jobDoc.ref.update({
        publicProfile: {
          slug: publicSlug,
          url: publicUrl,
          qrCodeUrl,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }
      });

      return {
        success: true,
        slug: publicSlug,
        publicUrl,
        qrCodeUrl
      };
    } catch (error: any) {
      console.error('Error creating public profile:', error);
      throw new HttpsError('internal', error.message || 'Failed to create public profile');
    }
  }
);

/**
 * Get public profile by slug
 */
export const getPublicProfile = onCall<GetPublicProfileRequest>(
  {
    timeoutSeconds: 60,
    ...corsOptions
  },
  async (request: CallableRequest<GetPublicProfileRequest>) => {
    const { slug } = request.data;
    if (!slug) {
      throw new HttpsError('invalid-argument', 'Slug is required');
    }

    try {
      // Find profile by slug
      const profilesSnapshot = await admin.firestore()
        .collection('publicProfiles')
        .where('slug', '==', slug)
        .where('isPublic', '==', true)
        .limit(1)
        .get();

      if (profilesSnapshot.empty) {
        throw new HttpsError('not-found', 'Public profile not found');
      }

      const profile = profilesSnapshot.docs[0].data() as PublicCVProfile;

      // Update analytics
      await profilesSnapshot.docs[0].ref.update({
        'analytics.views': admin.firestore.FieldValue.increment(1),
        'analytics.lastViewedAt': admin.firestore.FieldValue.serverTimestamp()
      });

      // Remove sensitive data if not authenticated as owner
      if (!request.auth || request.auth.uid !== profile.userId) {
        delete (profile as any).userId;
        delete (profile as any).analytics.contactSubmissions;
      }

      return {
        success: true,
        profile
      };
    } catch (error: any) {
      console.error('Error getting public profile:', error);
      throw new HttpsError('internal', error.message || 'Failed to get public profile');
    }
  }
);

/**
 * Update public profile settings
 */
export const updatePublicProfileSettings = onCall<UpdateProfileSettingsRequest>(
  {
    timeoutSeconds: 60,
    ...corsOptions
  },
  async (request: CallableRequest<UpdateProfileSettingsRequest>) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId, settings } = request.data;
    if (!jobId || !settings) {
      throw new HttpsError('invalid-argument', 'Job ID and settings are required');
    }

    try {
      // Get profile and verify ownership
      const profileDoc = await admin.firestore()
        .collection('publicProfiles')
        .doc(jobId)
        .get();

      if (!profileDoc.exists) {
        throw new HttpsError('not-found', 'Public profile not found');
      }

      const profile = profileDoc.data() as PublicCVProfile;
      if (profile.userId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Unauthorized access to profile');
      }

      // Update settings
      const updates: any = {
        isPublic: settings.isPublic ?? profile.isPublic,
        allowContactForm: settings.allowContactForm ?? profile.allowContactForm,
        showAnalytics: settings.showAnalytics ?? profile.showAnalytics,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (settings.customSlug && settings.customSlug !== profile.slug) {
        // Check if custom slug is available
        const existingSlug = await admin.firestore()
          .collection('publicProfiles')
          .where('slug', '==', settings.customSlug)
          .limit(1)
          .get();

        if (!existingSlug.empty) {
          throw new HttpsError('already-exists', 'This custom URL is already taken');
        }

        updates.slug = settings.customSlug;
        updates.publicUrl = `${process.env.PUBLIC_URL || 'https://cvplus.ai'}/public/${settings.customSlug}`;
      }

      await profileDoc.ref.update(updates);

      return {
        success: true,
        settings: updates
      };
    } catch (error: any) {
      console.error('Error updating profile settings:', error);
      throw new HttpsError('internal', error.message || 'Failed to update profile settings');
    }
  }
);

/**
 * Submit contact form for public profile
 */
export const submitContactForm = onCall<SubmitContactFormRequest>(
  {
    timeoutSeconds: 60,
    ...corsOptions
  },
  async (request: CallableRequest<SubmitContactFormRequest>) => {
    const { jobId, senderName, senderEmail, senderPhone, company, message } = request.data;
    
    // Validate required fields
    if (!jobId || !senderName || !senderEmail || !message) {
      throw new HttpsError('invalid-argument', 'Required fields missing');
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail)) {
      throw new HttpsError('invalid-argument', 'Invalid email address');
    }

    try {
      // Get profile
      const profileDoc = await admin.firestore()
        .collection('publicProfiles')
        .doc(jobId)
        .get();

      if (!profileDoc.exists) {
        throw new HttpsError('not-found', 'Public profile not found');
      }

      const profile = profileDoc.data() as PublicCVProfile;

      // Check if contact form is enabled
      if (!profile.allowContactForm) {
        throw new HttpsError('failed-precondition', 'Contact form is not enabled for this profile');
      }

      // Get job to find contact email
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();

      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;

      // Create contact submission
      const submission = {
        jobId,
        profileId: profile.slug,
        senderName,
        senderEmail,
        senderPhone,
        company,
        message,
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending'
      };

      // Save submission
      const submissionRef = await admin.firestore()
        .collection('contactSubmissions')
        .add(submission);

      // Update analytics
      await profileDoc.ref.update({
        'analytics.contactSubmissions': admin.firestore.FieldValue.increment(1)
      });

      // Send email notification if configured
      const contactEmail = job.interactiveData?.contactEmail || job.parsedData?.personalInfo?.email;
      if (contactEmail) {
        await integrationsService.sendEmail({
          to: contactEmail,
          subject: `New contact from your CV profile - ${senderName}`,
          html: `
            <h2>New Contact Submission</h2>
            <p><strong>From:</strong> ${senderName}</p>
            <p><strong>Email:</strong> ${senderEmail}</p>
            ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
            ${senderPhone ? `<p><strong>Phone:</strong> ${senderPhone}</p>` : ''}
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p><small>This message was sent through your public CV profile on CVPlus.</small></p>
          `
        }).catch(error => {
          console.error('Failed to send email notification:', error);
          // Don't throw - submission was still saved
        });
      }

      return {
        success: true,
        submissionId: submissionRef.id,
        message: 'Your message has been sent successfully!'
      };
    } catch (error: any) {
      console.error('Error submitting contact form:', error);
      throw new HttpsError('internal', error.message || 'Failed to submit contact form');
    }
  }
);

/**
 * Track QR code scan
 */
export const trackQRScan = onCall<TrackQRScanRequest>(
  {
    timeoutSeconds: 30,
    ...corsOptions
  },
  async (request: CallableRequest<TrackQRScanRequest>) => {
    const { jobId, metadata } = request.data;
    if (!jobId) {
      throw new HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      // Update analytics
      const profileRef = admin.firestore()
        .collection('publicProfiles')
        .doc(jobId);

      await profileRef.update({
        'analytics.qrScans': admin.firestore.FieldValue.increment(1)
      });

      // Log scan event
      await admin.firestore()
        .collection('qrScans')
        .add({
          jobId,
          scannedAt: admin.firestore.FieldValue.serverTimestamp(),
          userAgent: metadata?.userAgent,
          source: metadata?.source || 'qr',
          ip: request.rawRequest?.ip || 'unknown'
        });

      return {
        success: true,
        message: 'QR scan tracked'
      };
    } catch (error: any) {
      console.error('Error tracking QR scan:', error);
      // Don't throw - we don't want to break the user experience
      return {
        success: false,
        message: 'Failed to track scan'
      };
    }
  }
);