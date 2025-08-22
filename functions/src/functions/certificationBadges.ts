import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { corsOptions } from '../config/cors';
import { certificationBadgesService } from '../services/certification-badges.service';
// htmlFragmentGenerator import removed - using React SPA architecture
import { sanitizeForFirestore, sanitizeErrorContext } from '../utils/firestore-sanitizer';

export const generateCertificationBadges = onCall(
  {
    timeoutSeconds: 60,
    secrets: ['OPENAI_API_KEY'],
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId } = request.data;

    try {
      // Get the job data with parsed CV
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (!jobData?.parsedData) {
        throw new Error('CV data not found. Please ensure CV is parsed first.');
      }

      // Update status to processing
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.certificationBadges.status': 'processing',
          'enhancedFeatures.certificationBadges.progress': 25,
          'enhancedFeatures.certificationBadges.currentStep': 'Analyzing certifications...',
          'enhancedFeatures.certificationBadges.startedAt': FieldValue.serverTimestamp()
        });

      // Generate certification badges
      const badgesCollection = await certificationBadgesService.generateCertificationBadges(
        jobData.parsedData,
        jobId
      );

      // Update progress
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.certificationBadges.progress': 75,
          'enhancedFeatures.certificationBadges.currentStep': 'Creating badge visualizations...'
        });

      // Generate HTML fragment for progressive enhancement
      const certifications = jobData.parsedData.certifications || [];
      // HTML generation removed - React SPA handles UI rendering;

      // Sanitize data before Firestore write
      const sanitizedBadgesCollection = sanitizeForFirestore(badgesCollection);
      const sanitizedHtmlFragment = null; // HTML fragment removed with React SPA migration
      
      // Create safe update object
      const updateData = sanitizeForFirestore({
        'enhancedFeatures.certificationBadges.status': 'completed',
        'enhancedFeatures.certificationBadges.progress': 100,
        'enhancedFeatures.certificationBadges.data': sanitizedBadgesCollection,
        'enhancedFeatures.certificationBadges.htmlFragment': sanitizedHtmlFragment,
        'enhancedFeatures.certificationBadges.processedAt': FieldValue.serverTimestamp()
      });

      // Update with final results
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update(updateData);

      return {
        success: true,
        badges: badgesCollection,
        htmlFragment: sanitizedHtmlFragment
      };
    } catch (error: any) {
      
      // Sanitize error data for safe Firestore write
      const sanitizedErrorContext = sanitizeErrorContext({
        errorMessage: error.message,
        errorStack: error.stack,
        errorCode: error.code,
        timestamp: new Date().toISOString()
      });
      
      // Create safe error update object
      const errorUpdateData = sanitizeForFirestore({
        'enhancedFeatures.certificationBadges.status': 'failed',
        'enhancedFeatures.certificationBadges.error': error.message || 'Unknown error',
        'enhancedFeatures.certificationBadges.errorContext': sanitizedErrorContext,
        'enhancedFeatures.certificationBadges.processedAt': FieldValue.serverTimestamp()
      });
      
      // Update status to failed
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update(errorUpdateData);
      
      throw new Error(`Failed to generate certification badges: ${error.message}`);
    }
  });

export const verifyCertification = onCall(
  {
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, badgeId, verificationData } = request.data;

    try {
      // Verify job ownership
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (jobData?.userId !== request.auth.uid) {
        throw new Error('Unauthorized access');
      }

      // Verify certification
      const verifiedBadge = await certificationBadgesService.verifyCertification(
        jobId,
        badgeId,
        verificationData
      );

      return {
        success: true,
        badge: verifiedBadge
      };
    } catch (error: any) {
      throw new Error(`Failed to verify certification: ${error.message}`);
    }
  });

export const updateBadgeDisplayOptions = onCall(
  {
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, displayOptions } = request.data;

    try {
      // Verify job ownership
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (jobData?.userId !== request.auth.uid) {
        throw new Error('Unauthorized access');
      }

      // Update display options
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.certificationBadges.data.displayOptions': displayOptions,
          'enhancedFeatures.certificationBadges.lastModified': FieldValue.serverTimestamp()
        });

      return {
        success: true,
        displayOptions
      };
    } catch (error: any) {
      throw new Error(`Failed to update display options: ${error.message}`);
    }
  });

export const addCustomCertification = onCall(
  {
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, certification } = request.data;

    try {
      // Verify job ownership
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (jobData?.userId !== request.auth.uid) {
        throw new Error('Unauthorized access');
      }

      // Get current badges
      const collection = jobData?.enhancedFeatures?.certificationBadges?.data;
      if (!collection) {
        throw new Error('Certification badges not found. Generate them first.');
      }

      // Create new badge using the service method
      const service = certificationBadgesService as any;
      const newBadge = await service.createBadgeFromCertification({
        name: certification.name,
        issuer: certification.issuer,
        date: certification.date,
        expiryDate: certification.expiryDate,
        credentialId: certification.credentialId,
        url: certification.verificationUrl
      });

      // Add to collection
      collection.badges.push(newBadge);

      // Update categories
      if (!collection.categories[newBadge.category]) {
        collection.categories[newBadge.category] = [];
      }
      collection.categories[newBadge.category].push(newBadge);

      // Update statistics
      collection.statistics.totalCertifications++;
      if (newBadge.verified) {
        collection.statistics.verifiedCertifications++;
      }
      if (!newBadge.expiryDate || newBadge.expiryDate > new Date()) {
        collection.statistics.activeCertifications++;
      }

      // Save
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.certificationBadges.data': collection,
          'enhancedFeatures.certificationBadges.lastModified': FieldValue.serverTimestamp()
        });

      return {
        success: true,
        badge: newBadge,
        collection
      };
    } catch (error: any) {
      throw new Error(`Failed to add certification: ${error.message}`);
    }
  });

export const removeCertificationBadge = onCall(
  {
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, badgeId } = request.data;

    try {
      // Verify job ownership
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (jobData?.userId !== request.auth.uid) {
        throw new Error('Unauthorized access');
      }

      // Get current badges
      const collection = jobData?.enhancedFeatures?.certificationBadges?.data;
      if (!collection) {
        throw new Error('Certification badges not found');
      }

      // Find and remove badge
      const badgeIndex = collection.badges.findIndex((b: any) => b.id === badgeId);
      if (badgeIndex === -1) {
        throw new Error('Badge not found');
      }

      const removedBadge = collection.badges[badgeIndex];
      collection.badges.splice(badgeIndex, 1);

      // Update categories
      const categoryBadges = collection.categories[removedBadge.category];
      const categoryIndex = categoryBadges.findIndex((b: any) => b.id === badgeId);
      if (categoryIndex !== -1) {
        categoryBadges.splice(categoryIndex, 1);
      }

      // Update statistics
      collection.statistics.totalCertifications--;
      if (removedBadge.verified) {
        collection.statistics.verifiedCertifications--;
      }
      if (!removedBadge.expiryDate || removedBadge.expiryDate > new Date()) {
        collection.statistics.activeCertifications--;
      } else {
        collection.statistics.expiredCertifications--;
      }

      // Save
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.certificationBadges.data': collection,
          'enhancedFeatures.certificationBadges.lastModified': FieldValue.serverTimestamp()
        });

      return {
        success: true,
        removedBadgeId: badgeId
      };
    } catch (error: any) {
      throw new Error(`Failed to remove badge: ${error.message}`);
    }
  });

export const generateBadgeShareLink = onCall(
  {
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, badgeId } = request.data;

    try {
      // Generate shareable link for a specific badge
      const shareableUrl = `https://cvplus.com/verify/${jobId}/${badgeId}`;
      
      // Create verification QR code data
      const qrData = {
        url: shareableUrl,
        jobId,
        badgeId,
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        shareableUrl,
        qrData,
        embedCode: `<iframe src="${shareableUrl}/embed" width="300" height="400" frameborder="0"></iframe>`
      };
    } catch (error: any) {
      throw new Error(`Failed to generate share link: ${error.message}`);
    }
  });