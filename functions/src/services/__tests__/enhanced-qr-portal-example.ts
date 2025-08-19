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
    console.log('🎯 Generating complete portal QR code set...');
    const portalQRCodes = await qrService.generatePortalQRCodes(jobId, portalURLs);
    console.log(`✅ Generated ${portalQRCodes.length} portal QR codes`);
    
    // Display generated QR codes
    portalQRCodes.forEach(qr => {
      console.log(`📱 ${qr.type}: ${qr.metadata.title}`);
      console.log(`   URL: ${qr.data}`);
      console.log(`   Image: ${qr.qrImageUrl}`);
      console.log(`   Template: ${qr.template.name}`);
    });

    return portalQRCodes;
    
  } catch (error) {
    console.error('❌ Error generating portal QR codes:', error);
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
    console.log('🔄 Updating existing QR codes to portal URLs...');
    await qrService.updateExistingQRCodesToPortal(jobId, portalURLs);
    console.log('✅ Successfully updated existing QR codes');
    
    // Verify updates
    const updatedQRCodes = await qrService.getQRCodes(jobId);
    console.log(`📊 Total QR codes: ${updatedQRCodes.length}`);
    
    updatedQRCodes.forEach(qr => {
      console.log(`🔄 Updated ${qr.type}: ${qr.data}`);
    });
    
  } catch (error) {
    console.error('❌ Error updating existing QR codes:', error);
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
    console.log('⚙️ Creating portal QR code configurations...');
    const qrCodeConfigs = await qrService.createPortalQRCodeSet(portalURLs);
    
    console.log(`📋 Created ${qrCodeConfigs.length} QR code configurations`);
    
    qrCodeConfigs.forEach(config => {
      console.log(`📱 ${config.type}: ${config.metadata?.title}`);
      console.log(`   Template: ${config.template?.name}`);
      console.log(`   Tags: ${config.metadata?.tags?.join(', ')}`);
      console.log(`   Tracking: ${config.metadata?.trackingEnabled}`);
    });
    
    return qrCodeConfigs;
    
  } catch (error) {
    console.error('❌ Error creating portal QR code set:', error);
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
    console.log('📊 Generating portal QR codes with enhanced analytics...');
    const analyticsQRCodes = await qrService.generatePortalQRWithAnalytics(
      jobId, 
      portalURLs, 
      trackingOptions
    );
    
    console.log(`✅ Generated ${analyticsQRCodes.length} QR codes with analytics`);
    
    analyticsQRCodes.forEach(qr => {
      console.log(`📊 ${qr.type}: ${qr.metadata.title}`);
      console.log(`   Tags: ${qr.metadata.tags.join(', ')}`);
      console.log(`   Geofencing: ${qr.advanced.geofencing?.enabled}`);
      console.log(`   Dynamic Content: ${qr.advanced.dynamicContent}`);
    });
    
    return analyticsQRCodes;
    
  } catch (error) {
    console.error('❌ Error generating QR codes with analytics:', error);
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
    console.log('🔄 Batch updating QR codes for portal migration...');
    await qrService.batchUpdateQRCodesForPortal(jobId, portalURLs, qrCodeIds);
    console.log('✅ Successfully batch updated QR codes');
    
    // Verify the updates
    const updatedQRCodes = await qrService.getQRCodes(jobId);
    const updatedCodes = updatedQRCodes.filter(qr => qrCodeIds.includes(qr.id));
    
    console.log(`📋 Updated ${updatedCodes.length} QR codes:`);
    updatedCodes.forEach(qr => {
      console.log(`   ${qr.id}: ${qr.data} (${qr.type})`);
    });
    
  } catch (error) {
    console.error('❌ Error in batch update:', error);
    throw error;
  }
}

/**
 * Example: Get Portal Templates
 */
export function exampleGetPortalTemplates() {
  const qrService = new EnhancedQRService();
  
  console.log('🎨 Available Portal Templates:');
  
  // Get all portal templates
  const portalTemplates = qrService.getPortalTemplates();
  
  portalTemplates.forEach(template => {
    console.log(`📱 ${template.id}: ${template.name}`);
    console.log(`   Description: ${template.description}`);
    console.log(`   Colors: ${template.style.foregroundColor} / ${template.style.backgroundColor}`);
    console.log(`   Size: ${template.style.width}px`);
    console.log(`   CTA: ${template.callToAction?.text}`);
    console.log('');
  });
  
  // Get all templates (including legacy)
  const allTemplates = qrService.getDefaultTemplates();
  console.log(`📊 Total Templates Available: ${allTemplates.length}`);
  console.log(`🆕 Portal-Specific Templates: ${portalTemplates.filter(t => t.id.startsWith('portal-')).length}`);
  console.log(`🔄 Legacy Compatible Templates: ${portalTemplates.filter(t => !t.id.startsWith('portal-')).length}`);
  
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

  console.log('🚀 Starting Complete Portal QR Workflow...');

  try {
    // Step 1: Check if user already has QR codes
    const existingQRCodes = await qrService.getQRCodes(jobId);
    
    if (existingQRCodes.length > 0) {
      console.log(`📋 Found ${existingQRCodes.length} existing QR codes`);
      console.log('🔄 Updating existing QR codes to portal URLs...');
      
      // Update existing QR codes to point to portal
      await qrService.updateExistingQRCodesToPortal(jobId, portalURLs);
    } else {
      console.log('🆕 No existing QR codes found');
    }
    
    // Step 2: Generate new portal-specific QR codes
    console.log('🎯 Generating portal-specific QR codes...');
    const portalQRCodes = await qrService.generatePortalQRCodes(jobId, portalURLs);
    
    // Step 3: Get analytics for all QR codes
    console.log('📊 Retrieving QR code analytics...');
    const analytics = await qrService.getQRAnalytics(jobId);
    
    console.log('✅ Complete Workflow Summary:');
    console.log(`   📱 Portal QR Codes: ${portalQRCodes.length}`);
    console.log(`   📊 Total QR Codes: ${analytics.totalQRCodes}`);
    console.log(`   🔄 Active QR Codes: ${analytics.activeQRCodes}`);
    console.log(`   📈 Total Scans: ${analytics.totalScans}`);
    
    // Step 4: Return organized results
    return {
      portalQRCodes,
      analytics,
      totalQRCodes: analytics.totalQRCodes,
      workflowCompleted: true
    };
    
  } catch (error) {
    console.error('❌ Complete workflow failed:', error);
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