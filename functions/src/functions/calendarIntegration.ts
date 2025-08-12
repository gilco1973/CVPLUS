import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { corsOptions } from '../config/cors';
import { calendarIntegrationService, CalendarIntegrationService } from '../services/calendar-integration.service';

export const generateCalendarEvents = onCall(
  {
    timeoutSeconds: 60,
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

      // Generate calendar events
      const events = await calendarIntegrationService.generateCalendarEvents(
        jobData.parsedData,
        jobId
      );

      // Store events
      await calendarIntegrationService.storeCalendarData(jobId, { events });

      return {
        success: true,
        events,
        summary: {
          totalEvents: events.length,
          workAnniversaries: events.filter(e => e.type === 'work').length,
          educationMilestones: events.filter(e => e.type === 'education').length,
          certifications: events.filter(e => e.type === 'certification').length,
          reminders: events.filter(e => e.type === 'reminder').length
        }
      };
    } catch (error: any) {
      console.error('Error generating calendar events:', error);
      throw new Error(`Failed to generate calendar events: ${error.message}`);
    }
  });

export const syncToGoogleCalendar = onCall(
  {
    timeoutSeconds: 120,
    // secrets: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'], // Temporarily disabled
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, accessToken } = request.data;

    try {
      // Get stored events
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      const events = jobData?.enhancedFeatures?.calendar?.data?.events;
      
      if (!events) {
        throw new Error('Calendar events not found. Generate events first.');
      }

      // Create Google Calendar integration
      const integration = await calendarIntegrationService.createGoogleCalendarIntegration(
        events,
        jobId,
        accessToken
      );

      // Update job with integration status
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.calendar.integrations.google': {
            status: accessToken ? 'synced' : 'pending_auth',
            syncUrl: integration.syncUrl,
            syncedAt: accessToken ? admin.firestore.FieldValue.serverTimestamp() : null
          }
        });

      return {
        success: true,
        integration
      };
    } catch (error: any) {
      console.error('Error syncing to Google Calendar:', error);
      throw new Error(`Failed to sync to Google Calendar: ${error.message}`);
    }
  });

export const syncToOutlook = onCall(
  {
    timeoutSeconds: 120,
    // secrets: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'], // Temporarily disabled
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, accessToken } = request.data;

    try {
      // Get stored events
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      const events = jobData?.enhancedFeatures?.calendar?.data?.events;
      
      if (!events) {
        throw new Error('Calendar events not found. Generate events first.');
      }

      // Create Outlook integration
      const integration = await calendarIntegrationService.createOutlookIntegration(
        events,
        jobId,
        accessToken
      );

      // Update job with integration status
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.calendar.integrations.outlook': {
            status: accessToken ? 'synced' : 'pending_auth',
            syncUrl: integration.syncUrl,
            syncedAt: accessToken ? admin.firestore.FieldValue.serverTimestamp() : null
          }
        });

      return {
        success: true,
        integration
      };
    } catch (error: any) {
      console.error('Error syncing to Outlook:', error);
      throw new Error(`Failed to sync to Outlook: ${error.message}`);
    }
  });

export const downloadICalFile = onCall(
  {
    timeoutSeconds: 60,
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId } = request.data;

    try {
      // Get job data
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      const events = jobData?.enhancedFeatures?.calendar?.data?.events;
      
      if (!events) {
        throw new Error('Calendar events not found. Generate events first.');
      }

      // Create iCal file
      const integration = await calendarIntegrationService.createICalFile(
        events,
        jobData.parsedData,
        jobId
      );

      // Update job with download info
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.calendar.integrations.ical': {
            downloadUrl: integration.downloadUrl,
            generatedAt: admin.firestore.FieldValue.serverTimestamp()
          }
        });

      return {
        success: true,
        integration
      };
    } catch (error: any) {
      console.error('Error creating iCal file:', error);
      throw new Error(`Failed to create iCal file: ${error.message}`);
    }
  });

export const handleCalendarCallback = onCall(
  {
    // secrets: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'], // Temporarily disabled
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { provider, code, state } = request.data;
    const jobId = state; // jobId is passed as state parameter

    try {
      let accessToken: string;
      
      if (provider === 'google') {
        // Exchange code for access token using Google OAuth
        const { google } = require('googleapis');
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URL
        );
        
        const { tokens } = await oauth2Client.getToken(code);
        accessToken = tokens.access_token!;
        
        // Store refresh token for future use
        await admin.firestore()
          .collection('users')
          .doc(request.auth.uid)
          .update({
            'calendarTokens.google': {
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              expiryDate: tokens.expiry_date
            }
          });
      } else if (provider === 'outlook') {
        // Exchange code for access token using Microsoft OAuth
        const axios = require('axios');
        const response = await axios.post(
          'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID!,
            client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
            code,
            redirect_uri: process.env.MICROSOFT_REDIRECT_URL!,
            grant_type: 'authorization_code'
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
        
        accessToken = response.data.access_token;
        
        // Store tokens
        await admin.firestore()
          .collection('users')
          .doc(request.auth.uid)
          .update({
            'calendarTokens.outlook': {
              accessToken: response.data.access_token,
              refreshToken: response.data.refresh_token,
              expiresIn: response.data.expires_in
            }
          });
      } else {
        throw new Error('Unsupported provider');
      }
      
      // Now sync the calendar with the access token
      if (provider === 'google') {
        // For Google Calendar sync, we'll call the internal function directly
        // since we can't call Firebase functions from within other Firebase functions
        const calendarService = new CalendarIntegrationService();
        return await calendarService.createGoogleCalendarIntegration(jobId, accessToken);
      } else {
        // For Outlook sync, we'll call the internal function directly
        const calendarService = new CalendarIntegrationService();
        return await calendarService.createOutlookIntegration(jobId, accessToken);
      }
    } catch (error: any) {
      console.error('Error handling calendar callback:', error);
      throw new Error(`Failed to complete calendar authorization: ${error.message}`);
    }
  });