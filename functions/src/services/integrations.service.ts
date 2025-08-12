/**
 * Service for managing third-party integrations
 */

import * as admin from 'firebase-admin';
import * as QRCode from 'qrcode';
import * as nodemailer from 'nodemailer';
import { config } from '../config/environment';

export class IntegrationsService {
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    // Initialize email transporter (using Gmail as example)
    // In production, use SendGrid or similar service
    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.email?.user || process.env.EMAIL_USER,
        pass: config.email?.password || process.env.EMAIL_PASSWORD
      }
    });
  }

  /**
   * Generate QR code for a URL
   */
  async generateQRCode(url: string, options?: QRCode.QRCodeToBufferOptions): Promise<Buffer> {
    const defaultOptions: QRCode.QRCodeToBufferOptions = {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      ...options
    };

    return await QRCode.toBuffer(url, defaultOptions);
  }

  /**
   * Upload QR code to storage
   */
  async uploadQRCode(buffer: Buffer, jobId: string): Promise<string> {
    const bucket = admin.storage().bucket();
    const fileName = `qr-codes/${jobId}/qr-${Date.now()}.png`;
    const file = bucket.file(fileName);

    await file.save(buffer, {
      metadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000' // 1 year cache
      }
    });

    await file.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
  }

  /**
   * Send email notification
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }): Promise<void> {
    const mailOptions = {
      from: options.from || config.email?.from || 'CVPlus <noreply@cvplus.com>',
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  /**
   * Generate email template for contact form
   */
  generateContactFormEmailTemplate(data: {
    senderName: string;
    senderEmail: string;
    senderPhone?: string;
    company?: string;
    message: string;
    cvUrl: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #06b6d4; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-top: 20px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #666; }
          .value { margin-top: 5px; }
          .message { background-color: white; padding: 15px; border-left: 4px solid #06b6d4; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background-color: #06b6d4; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Contact Form Submission</h2>
            <p>Someone is interested in your CV!</p>
          </div>
          
          <div class="content">
            <div class="field">
              <div class="label">From:</div>
              <div class="value">${data.senderName}</div>
            </div>
            
            <div class="field">
              <div class="label">Email:</div>
              <div class="value"><a href="mailto:${data.senderEmail}">${data.senderEmail}</a></div>
            </div>
            
            ${data.senderPhone ? `
            <div class="field">
              <div class="label">Phone:</div>
              <div class="value">${data.senderPhone}</div>
            </div>
            ` : ''}
            
            ${data.company ? `
            <div class="field">
              <div class="label">Company:</div>
              <div class="value">${data.company}</div>
            </div>
            ` : ''}
            
            <div class="message">
              <div class="label">Message:</div>
              <p>${data.message.replace(/\n/g, '<br>')}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${data.cvUrl}" class="button">View Your CV</a>
            </div>
          </div>
          
          <div class="footer">
            <p>This message was sent via your CVPlus public profile.</p>
            <p>To manage your CV settings, visit <a href="https://cvplus.com">cvplus.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Initialize calendar integration using the dedicated calendar service
   */
  async initializeCalendarIntegration(userId: string, provider: 'google' | 'calendly'): Promise<any> {
    // Import the calendar integration service
    const { CalendarIntegrationService } = await import('./calendar-integration.service');
    const calendarService = new CalendarIntegrationService();
    
    switch (provider) {
      case 'google':
        // Use the actual Google Calendar OAuth flow
        return await calendarService.initializeGoogleAuth(userId);
      
      case 'calendly':
        // Note: Calendly integration would require webhooks setup
        // For now, return configuration needed for Calendly
        return { 
          webhookUrl: `https://cvplus.com/api/calendly/${userId}`,
          integrationGuide: 'Please configure your Calendly webhook to point to this URL'
        };
      
      default:
        throw new Error('Unsupported calendar provider');
    }
  }

  /**
   * Generate video thumbnail using video generation service
   */
  async generateVideoThumbnail(videoUrl: string): Promise<string> {
    try {
      // Import the video generation service
      const { VideoGenerationService } = await import('./video-generation.service');
      const videoService = new VideoGenerationService();
      
      // Use the video service to generate thumbnail
      return await videoService.generateThumbnail(videoUrl);
    } catch (error) {
      console.warn('Video thumbnail generation failed, using fallback:', error);
      
      // Fallback: generate a better placeholder with video metadata
      const videoName = videoUrl.split('/').pop()?.split('.')[0] || 'video';
      return `https://via.placeholder.com/640x360/6366f1/ffffff?text=${encodeURIComponent(videoName)}`;
    }
  }

  /**
   * Generate podcast audio using the dedicated podcast service
   */
  async generatePodcastAudio(script: string, voice?: string): Promise<Buffer> {
    try {
      // Import the podcast generation service
      const { PodcastGenerationService } = await import('./podcast-generation.service');
      const podcastService = new PodcastGenerationService();
      
      // Use the podcast service for text-to-speech
      const audioBuffer = await podcastService.generateAudio(script, voice || 'host1');
      return audioBuffer;
    } catch (error) {
      console.error('Podcast audio generation failed:', error);
      throw new Error(`Failed to generate podcast audio: ${error.message}`);
    }
  }
}

export const integrationsService = new IntegrationsService();