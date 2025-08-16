import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import QRCode from 'qrcode';

interface QRCodeTemplate {
  id: string;
  name: string;
  description: string;
  style: {
    foregroundColor: string;
    backgroundColor: string;
    logoUrl?: string;
    margin: number;
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
    width: number;
    borderRadius?: number;
    gradientType?: 'linear' | 'radial' | 'none';
    gradientColors?: string[];
  };
  frame?: {
    type: 'none' | 'square' | 'circle' | 'rounded';
    color: string;
    width: number;
  };
  callToAction?: {
    text: string;
    position: 'top' | 'bottom' | 'overlay';
    font: string;
    color: string;
  };
}

interface QRCodeConfig {
  id: string;
  jobId: string;
  type: 'profile' | 'contact' | 'portfolio' | 'resume-download' | 'linkedin' | 'custom';
  data: string;
  template: QRCodeTemplate;
  qrImageUrl?: string;
  analytics: {
    totalScans: number;
    uniqueScans: number;
    scansByDate: Record<string, number>;
    scansByLocation: Record<string, number>;
    scansByDevice: Record<string, number>;
    scansBySource: Record<string, number>;
  };
  metadata: {
    title: string;
    description: string;
    tags: string[];
    expiresAt?: Date;
    isActive: boolean;
    trackingEnabled: boolean;
  };
  advanced: {
    dynamicContent: boolean;
    redirectUrl?: string;
    shortUrl?: string;
    passwordProtected: boolean;
    geofencing?: {
      enabled: boolean;
      locations: Array<{
        name: string;
        lat: number;
        lng: number;
        radius: number; // in meters
      }>;
    };
    timeRestrictions?: {
      enabled: boolean;
      activeHours: {
        start: string; // HH:MM format
        end: string;   // HH:MM format
      };
      activeDays: number[]; // 0-6, 0 = Sunday
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

interface QRScanEvent {
  id: string;
  qrCodeId: string;
  jobId: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  location?: {
    country: string;
    city: string;
    lat?: number;
    lng?: number;
  };
  device: {
    type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
    os: string;
    browser: string;
  };
  referrer?: string;
  sessionId: string;
  isUnique: boolean;
  metadata?: any;
}

export class EnhancedQRService {
  private db = admin.firestore();

  // Predefined QR code templates
  private defaultTemplates: QRCodeTemplate[] = [
    {
      id: 'professional',
      name: 'Professional',
      description: 'Clean, professional design suitable for business use',
      style: {
        foregroundColor: '#1f2937',
        backgroundColor: '#ffffff',
        margin: 2,
        errorCorrectionLevel: 'M',
        width: 256,
        borderRadius: 8,
        gradientType: 'none'
      },
      frame: {
        type: 'square',
        color: '#374151',
        width: 2
      },
      callToAction: {
        text: 'Scan to view CV',
        position: 'bottom',
        font: 'Arial, sans-serif',
        color: '#374151'
      }
    },
    {
      id: 'modern',
      name: 'Modern Gradient',
      description: 'Eye-catching gradient design for creative professionals',
      style: {
        foregroundColor: '#0f172a',
        backgroundColor: '#ffffff',
        margin: 3,
        errorCorrectionLevel: 'M',
        width: 300,
        borderRadius: 12,
        gradientType: 'linear',
        gradientColors: ['#06b6d4', '#3b82f6', '#8b5cf6']
      },
      frame: {
        type: 'rounded',
        color: '#06b6d4',
        width: 3
      },
      callToAction: {
        text: 'View Professional Profile',
        position: 'bottom',
        font: 'system-ui, sans-serif',
        color: '#0f172a'
      }
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Simple, clean design with minimal distractions',
      style: {
        foregroundColor: '#000000',
        backgroundColor: '#ffffff',
        margin: 1,
        errorCorrectionLevel: 'L',
        width: 200,
        gradientType: 'none'
      },
      callToAction: {
        text: 'Scan QR Code',
        position: 'top',
        font: 'monospace',
        color: '#666666'
      }
    },
    {
      id: 'branded',
      name: 'Branded',
      description: 'Customizable with logo and brand colors',
      style: {
        foregroundColor: '#1e40af',
        backgroundColor: '#f8fafc',
        margin: 4,
        errorCorrectionLevel: 'H', // High for logo compatibility
        width: 320,
        borderRadius: 16
      },
      frame: {
        type: 'circle',
        color: '#1e40af',
        width: 4
      },
      callToAction: {
        text: 'Connect with me',
        position: 'overlay',
        font: 'Inter, sans-serif',
        color: '#1e40af'
      }
    }
  ];

  async generateQRCode(jobId: string, config: Partial<QRCodeConfig>): Promise<QRCodeConfig> {
    try {
      // Get user profile data for default QR content
      const profileData = await this.getProfileData(jobId);
      
      // Create QR code configuration
      const qrConfig: QRCodeConfig = {
        id: `qr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        jobId,
        type: config.type || 'profile',
        data: config.data || this.generateDefaultData(config.type || 'profile', profileData),
        template: config.template || this.defaultTemplates[0],
        analytics: {
          totalScans: 0,
          uniqueScans: 0,
          scansByDate: {},
          scansByLocation: {},
          scansByDevice: {},
          scansBySource: {}
        },
        metadata: {
          title: config.metadata?.title || `${config.type || 'Profile'} QR Code`,
          description: config.metadata?.description || `QR code for ${profileData.name || 'professional profile'}`,
          tags: config.metadata?.tags || ['cv', 'profile', 'professional'],
          isActive: true,
          trackingEnabled: true,
          ...config.metadata
        },
        advanced: {
          dynamicContent: false,
          passwordProtected: false,
          ...config.advanced
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Generate the actual QR code image
      const qrImageUrl = await this.createQRImage(qrConfig);
      
      // Store configuration in Firestore
      await this.db.collection('jobs').doc(jobId).collection('qrcodes').doc(qrConfig.id).set({
        ...qrConfig,
        qrImageUrl,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      return { ...qrConfig, qrImageUrl };
    } catch (error) {
      logger.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  private async getProfileData(jobId: string): Promise<any> {
    const jobDoc = await this.db.collection('jobs').doc(jobId).get();
    const jobData = jobDoc.data();
    
    return {
      name: jobData?.parsedData?.personalInfo?.name || 'Professional',
      email: jobData?.parsedData?.personalInfo?.email,
      phone: jobData?.parsedData?.personalInfo?.phone,
      website: jobData?.parsedData?.personalInfo?.website,
      linkedin: jobData?.parsedData?.personalInfo?.linkedin,
      profileUrl: `https://cvplus.web.app/profile/${jobId}`
    };
  }

  private generateDefaultData(type: string, profileData: any): string {
    switch (type) {
      case 'profile':
        return profileData.profileUrl || `https://cvplus.web.app/profile/${profileData.jobId}`;
      
      case 'contact':
        const vCard = [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${profileData.name || 'Professional'}`,
          profileData.email ? `EMAIL:${profileData.email}` : '',
          profileData.phone ? `TEL:${profileData.phone}` : '',
          profileData.website ? `URL:${profileData.website}` : '',
          'END:VCARD'
        ].filter(line => line).join('\n');
        return vCard;
      
      case 'portfolio':
        return `${profileData.profileUrl}/portfolio`;
      
      case 'resume-download':
        return `${profileData.profileUrl}/download`;
      
      case 'linkedin':
        return profileData.linkedin || `https://linkedin.com/in/${profileData.name?.toLowerCase().replace(' ', '-') || 'professional'}`;
      
      default:
        return profileData.profileUrl || 'https://cvplus.web.app';
    }
  }

  private async createQRImage(config: QRCodeConfig): Promise<string> {
    try {
      const options = {
        type: 'png' as const,
        quality: 0.92,
        margin: config.template.style.margin,
        color: {
          dark: config.template.style.foregroundColor,
          light: config.template.style.backgroundColor,
        },
        width: config.template.style.width,
        errorCorrectionLevel: config.template.style.errorCorrectionLevel
      };

      // Generate basic QR code
      const qrBuffer = await QRCode.toBuffer(config.data, options);
      
      // Upload to Firebase Storage
      const bucket = admin.storage().bucket();
      const fileName = `qrcodes/${config.jobId}/${config.id}.png`;
      const file = bucket.file(fileName);
      
      await file.save(qrBuffer, {
        metadata: {
          contentType: 'image/png',
          cacheControl: 'public, max-age=31536000' // 1 year
        }
      });

      // Make file publicly accessible
      await file.makePublic();
      
      // Return public URL
      return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    } catch (error) {
      logger.error('Error creating QR image:', error);
      throw new Error('Failed to create QR code image');
    }
  }

  async trackQRScan(qrCodeId: string, scanData: Partial<QRScanEvent>): Promise<void> {
    try {
      // Find the QR code configuration
      const qrQuery = await this.db.collectionGroup('qrcodes').where('id', '==', qrCodeId).get();
      
      if (qrQuery.empty) {
        throw new Error('QR code not found');
      }

      const qrDoc = qrQuery.docs[0];
      const qrConfig = qrDoc.data() as QRCodeConfig;
      
      // Check if tracking is enabled
      if (!qrConfig.metadata.trackingEnabled || !qrConfig.metadata.isActive) {
        return;
      }

      // Create scan event
      const scanEvent: QRScanEvent = {
        id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        qrCodeId,
        jobId: qrConfig.jobId,
        timestamp: new Date(),
        sessionId: scanData.sessionId || `session-${Date.now()}`,
        isUnique: false, // Will be determined below
        device: scanData.device || {
          type: 'unknown',
          os: 'unknown',
          browser: 'unknown'
        },
        ...scanData
      };

      // Determine if this is a unique scan
      const existingScans = await this.db
        .collection('jobs')
        .doc(qrConfig.jobId)
        .collection('qrcodes')
        .doc(qrCodeId)
        .collection('scans')
        .where('sessionId', '==', scanEvent.sessionId)
        .get();

      scanEvent.isUnique = existingScans.empty;

      // Store scan event
      await this.db
        .collection('jobs')
        .doc(qrConfig.jobId)
        .collection('qrcodes')
        .doc(qrCodeId)
        .collection('scans')
        .doc(scanEvent.id)
        .set({
          ...scanEvent,
          timestamp: FieldValue.serverTimestamp()
        });

      // Update analytics
      await this.updateQRAnalytics(qrCodeId, scanEvent);

    } catch (error) {
      logger.error('Error tracking QR scan:', error);
      // Don't throw error - tracking should fail silently
    }
  }

  private async updateQRAnalytics(qrCodeId: string, scanEvent: QRScanEvent): Promise<void> {
    const qrQuery = await this.db.collectionGroup('qrcodes').where('id', '==', qrCodeId).get();
    
    if (qrQuery.empty) return;

    const qrDoc = qrQuery.docs[0];
    const qrRef = qrDoc.ref;
    
    const dateKey = scanEvent.timestamp.toISOString().split('T')[0];
    const locationKey = scanEvent.location?.country || 'unknown';
    const deviceKey = scanEvent.device.type;
    const sourceKey = scanEvent.referrer || 'direct';

    // Update analytics atomically
    await this.db.runTransaction(async (transaction) => {
      const qrDoc = await transaction.get(qrRef);
      const qrData = qrDoc.data() as QRCodeConfig;
      
      const analytics = qrData.analytics;
      
      // Update counters
      analytics.totalScans += 1;
      if (scanEvent.isUnique) {
        analytics.uniqueScans += 1;
      }
      
      // Update breakdowns
      analytics.scansByDate[dateKey] = (analytics.scansByDate[dateKey] || 0) + 1;
      analytics.scansByLocation[locationKey] = (analytics.scansByLocation[locationKey] || 0) + 1;
      analytics.scansByDevice[deviceKey] = (analytics.scansByDevice[deviceKey] || 0) + 1;
      analytics.scansBySource[sourceKey] = (analytics.scansBySource[sourceKey] || 0) + 1;
      
      transaction.update(qrRef, {
        analytics,
        updatedAt: FieldValue.serverTimestamp()
      });
    });
  }

  async getQRCodes(jobId: string): Promise<QRCodeConfig[]> {
    const qrCodesSnapshot = await this.db
      .collection('jobs')
      .doc(jobId)
      .collection('qrcodes')
      .orderBy('createdAt', 'desc')
      .get();

    return qrCodesSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as QRCodeConfig[];
  }

  async updateQRCode(jobId: string, qrCodeId: string, updates: Partial<QRCodeConfig>): Promise<void> {
    const qrRef = this.db.collection('jobs').doc(jobId).collection('qrcodes').doc(qrCodeId);
    
    // If template or data changed, regenerate image
    if (updates.template || updates.data) {
      const currentDoc = await qrRef.get();
      const currentData = currentDoc.data() as QRCodeConfig;
      
      const updatedConfig = { ...currentData, ...updates };
      const newImageUrl = await this.createQRImage(updatedConfig);
      updates.qrImageUrl = newImageUrl;
    }

    await qrRef.update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  async deleteQRCode(jobId: string, qrCodeId: string): Promise<void> {
    // Delete the QR code document and all scan events
    const qrRef = this.db.collection('jobs').doc(jobId).collection('qrcodes').doc(qrCodeId);
    
    // Delete all scan events
    const scansSnapshot = await qrRef.collection('scans').get();
    const batch = this.db.batch();
    
    scansSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete the QR code itself
    batch.delete(qrRef);
    
    await batch.commit();
  }

  async getQRAnalytics(jobId: string, qrCodeId?: string): Promise<any> {
    if (qrCodeId) {
      // Get analytics for specific QR code
      const qrDoc = await this.db
        .collection('jobs')
        .doc(jobId)
        .collection('qrcodes')
        .doc(qrCodeId)
        .get();
      
      if (!qrDoc.exists) {
        throw new Error('QR code not found');
      }
      
      const qrData = qrDoc.data() as QRCodeConfig;
      return qrData.analytics;
    } else {
      // Get aggregate analytics for all QR codes
      const qrCodesSnapshot = await this.db
        .collection('jobs')
        .doc(jobId)
        .collection('qrcodes')
        .get();
      
      const aggregatedAnalytics = {
        totalScans: 0,
        uniqueScans: 0,
        scansByDate: {} as Record<string, number>,
        scansByLocation: {} as Record<string, number>,
        scansByDevice: {} as Record<string, number>,
        scansBySource: {} as Record<string, number>,
        totalQRCodes: qrCodesSnapshot.size,
        activeQRCodes: 0
      };
      
      qrCodesSnapshot.docs.forEach(doc => {
        const qrData = doc.data() as QRCodeConfig;
        
        if (qrData.metadata.isActive) {
          aggregatedAnalytics.activeQRCodes += 1;
        }
        
        const analytics = qrData.analytics;
        aggregatedAnalytics.totalScans += analytics.totalScans;
        aggregatedAnalytics.uniqueScans += analytics.uniqueScans;
        
        // Merge breakdowns
        Object.entries(analytics.scansByDate).forEach(([date, count]) => {
          aggregatedAnalytics.scansByDate[date] = (aggregatedAnalytics.scansByDate[date] || 0) + count;
        });
        
        Object.entries(analytics.scansByLocation).forEach(([location, count]) => {
          aggregatedAnalytics.scansByLocation[location] = (aggregatedAnalytics.scansByLocation[location] || 0) + count;
        });
        
        Object.entries(analytics.scansByDevice).forEach(([device, count]) => {
          aggregatedAnalytics.scansByDevice[device] = (aggregatedAnalytics.scansByDevice[device] || 0) + count;
        });
        
        Object.entries(analytics.scansBySource).forEach(([source, count]) => {
          aggregatedAnalytics.scansBySource[source] = (aggregatedAnalytics.scansBySource[source] || 0) + count;
        });
      });
      
      return aggregatedAnalytics;
    }
  }

  getDefaultTemplates(): QRCodeTemplate[] {
    return this.defaultTemplates;
  }
}