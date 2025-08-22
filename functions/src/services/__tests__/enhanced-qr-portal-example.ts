/**
 * Example Usage of Enhanced QR Service Portal Integration
 * 
 * This file demonstrates how to use the new portal integration features
 * added to the EnhancedQRService class.
 * 
 * @author Gil Klainert
 * @created 2025-08-19
 */

import { EnhancedQRService } from '../enhanced-qr.service';
import { PortalUrls } from '../../types/portal';

/**
 * Example: Complete Portal QR Code Generation Workflow
 */
export async function exampleCompletePortalQRGeneration() {
  const qrService = new EnhancedQRService();
  const jobId = 'job-12345-example';
  
  // Example portal URLs (these would come from the portal generation service)
  const portalURLs: PortalUrls = {
    portal: 'https://myportfolio.huggingface.co/spaces/user123',
    chat: 'https://myportfolio.huggingface.co/spaces/user123/chat',
    contact: 'https://myportfolio.huggingface.co/spaces/user123/contact',
    download: 'https://myportfolio.huggingface.co/spaces/user123/download',
    qrMenu: 'https://myportfolio.huggingface.co/spaces/user123/menu',
    api: {
      chat: 'https://api.myportfolio.com/chat/user123',
      contact: 'https://api.myportfolio.com/contact/user123',
      analytics: 'https://api.myportfolio.com/analytics/user123'
    }
  };

  try {
    // Method 1: Generate complete portal QR code set
    const portalQRCodes = await qrService.generatePortalQRCodes(jobId, portalURLs);
    
    // Display generated QR codes
    portalQRCodes.forEach(qr => {
    });

    return portalQRCodes;
    
  } catch (error) {
    throw error;
  }
}

/**
 * Example: Update Existing QR Codes to Point to Portal
 */
export async function exampleUpdateExistingQRCodes() {
  const qrService = new EnhancedQRService();
  const jobId = 'job-12345-example';
  
  const portalURLs: PortalUrls = {
    portal: 'https://newportfolio.huggingface.co/spaces/user123',
    chat: 'https://newportfolio.huggingface.co/spaces/user123/chat',
    contact: 'https://newportfolio.huggingface.co/spaces/user123/contact',
    download: 'https://newportfolio.huggingface.co/spaces/user123/download',
    qrMenu: 'https://newportfolio.huggingface.co/spaces/user123/menu',
    api: {
      chat: 'https://api.newportfolio.com/chat/user123',
      contact: 'https://api.newportfolio.com/contact/user123',
      analytics: 'https://api.newportfolio.com/analytics/user123'
    }
  };

  try {
    // Method 2: Update existing QR codes to portal URLs
    await qrService.updateExistingQRCodesToPortal(jobId, portalURLs);
    
    // Verify updates
    const updatedQRCodes = await qrService.getQRCodes(jobId);
    
    updatedQRCodes.forEach(qr => {
    });
    
  } catch (error) {
    throw error;
  }
}

/**
 * Example: Create Portal QR Code Set (Configuration Only)
 */
export async function exampleCreatePortalQRCodeSet() {
  const qrService = new EnhancedQRService();
  
  const portalURLs: PortalUrls = {
    portal: 'https://portfolio.example.com/user123',
    chat: 'https://portfolio.example.com/user123/chat',
    contact: 'https://portfolio.example.com/user123/contact',
    download: 'https://portfolio.example.com/user123/download',
    qrMenu: 'https://portfolio.example.com/user123/menu',
    api: {
      chat: 'https://api.portfolio.example.com/chat/user123',
      contact: 'https://api.portfolio.example.com/contact/user123',
      analytics: 'https://api.portfolio.example.com/analytics/user123'
    }
  };

  try {
    // Method 3: Create QR code configurations (without saving to database)
    const qrCodeConfigs = await qrService.createPortalQRCodeSet(portalURLs);
    
    
    qrCodeConfigs.forEach(config => {
    });
    
    return qrCodeConfigs;
    
  } catch (error) {
    throw error;
  }
}

/**
 * Example: Portal QR Codes with Enhanced Analytics
 */
export async function examplePortalQRWithAnalytics() {
  const qrService = new EnhancedQRService();
  const jobId = 'job-analytics-example';
  
  const portalURLs: PortalUrls = {
    portal: 'https://analytics-portfolio.com/user123',
    chat: 'https://analytics-portfolio.com/user123/chat',
    contact: 'https://analytics-portfolio.com/user123/contact',
    download: 'https://analytics-portfolio.com/user123/download',
    qrMenu: 'https://analytics-portfolio.com/user123/menu',
    api: {
      chat: 'https://api.analytics-portfolio.com/chat/user123',
      contact: 'https://api.analytics-portfolio.com/contact/user123',
      analytics: 'https://api.analytics-portfolio.com/analytics/user123'
    }
  };

  const trackingOptions = {
    enableGeofencing: true,
    enableTimeRestrictions: false,
    customTags: ['campaign-2024', 'networking-event', 'business-cards']
  };

  try {
    // Method 4: Generate portal QR codes with enhanced analytics
    const analyticsQRCodes = await qrService.generatePortalQRWithAnalytics(
      jobId, 
      portalURLs, 
      trackingOptions
    );
    
    
    analyticsQRCodes.forEach(qr => {
    });
    
    return analyticsQRCodes;
    
  } catch (error) {
    throw error;
  }
}

/**
 * Example: Batch Update QR Codes for Portal Migration
 */
export async function exampleBatchUpdateForPortal() {
  const qrService = new EnhancedQRService();
  const jobId = 'job-batch-example';
  
  const portalURLs: PortalUrls = {
    portal: 'https://batch-portfolio.com/user123',
    chat: 'https://batch-portfolio.com/user123/chat',
    contact: 'https://batch-portfolio.com/user123/contact',
    download: 'https://batch-portfolio.com/user123/download',
    qrMenu: 'https://batch-portfolio.com/user123/menu',
    api: {
      chat: 'https://api.batch-portfolio.com/chat/user123',
      contact: 'https://api.batch-portfolio.com/contact/user123',
      analytics: 'https://api.batch-portfolio.com/analytics/user123'
    }
  };

  // Example QR code IDs to update (these would come from existing QR codes)
  const qrCodeIds = [
    'qr-profile-123',
    'qr-contact-456',
    'qr-portfolio-789'
  ];

  try {
    // Method 5: Batch update existing QR codes
    await qrService.batchUpdateQRCodesForPortal(jobId, portalURLs, qrCodeIds);
    
    // Verify the updates
    const updatedQRCodes = await qrService.getQRCodes(jobId);
    const updatedCodes = updatedQRCodes.filter(qr => qrCodeIds.includes(qr.id));
    
    updatedCodes.forEach(qr => {
    });
    
  } catch (error) {
    throw error;
  }
}

/**
 * Example: Get Portal Templates
 */
export function exampleGetPortalTemplates() {
  const qrService = new EnhancedQRService();
  
  
  // Get all portal templates
  const portalTemplates = qrService.getPortalTemplates();
  
  portalTemplates.forEach(template => {
  });
  
  // Get all templates (including legacy)
  const allTemplates = qrService.getDefaultTemplates();
  
  return portalTemplates;
}

/**
 * Integration Example: Complete Workflow
 * This example shows how you might integrate portal QR generation
 * into a complete CV processing workflow
 */
export async function exampleCompleteWorkflow() {
  const qrService = new EnhancedQRService();
  const jobId = 'job-complete-workflow';
  
  // Step 1: Portal URLs would come from portal generation service
  const portalURLs: PortalUrls = {
    portal: 'https://workflow-portfolio.com/user123',
    chat: 'https://workflow-portfolio.com/user123/chat',
    contact: 'https://workflow-portfolio.com/user123/contact',
    download: 'https://workflow-portfolio.com/user123/download',
    qrMenu: 'https://workflow-portfolio.com/user123/menu',
    api: {
      chat: 'https://api.workflow-portfolio.com/chat/user123',
      contact: 'https://api.workflow-portfolio.com/contact/user123',
      analytics: 'https://api.workflow-portfolio.com/analytics/user123'
    }
  };


  try {
    // Step 1: Check if user already has QR codes
    const existingQRCodes = await qrService.getQRCodes(jobId);
    
    if (existingQRCodes.length > 0) {
      
      // Update existing QR codes to point to portal
      await qrService.updateExistingQRCodesToPortal(jobId, portalURLs);
    } else {
    }
    
    // Step 2: Generate new portal-specific QR codes
    const portalQRCodes = await qrService.generatePortalQRCodes(jobId, portalURLs);
    
    // Step 3: Get analytics for all QR codes
    const analytics = await qrService.getQRAnalytics(jobId);
    
    
    // Step 4: Return organized results
    return {
      portalQRCodes,
      analytics,
      totalQRCodes: analytics.totalQRCodes,
      workflowCompleted: true
    };
    
  } catch (error) {
    throw error;
  }
}

// Export all examples for easy testing
export const PortalQRExamples = {
  completeGeneration: exampleCompletePortalQRGeneration,
  updateExisting: exampleUpdateExistingQRCodes,
  createConfigSet: exampleCreatePortalQRCodeSet,
  withAnalytics: examplePortalQRWithAnalytics,
  batchUpdate: exampleBatchUpdateForPortal,
  getTemplates: exampleGetPortalTemplates,
  completeWorkflow: exampleCompleteWorkflow
};