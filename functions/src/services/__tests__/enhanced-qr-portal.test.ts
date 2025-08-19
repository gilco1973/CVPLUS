/**
 * Test file for Enhanced QR Service Portal Integration
 * Tests the new portal-specific methods added to EnhancedQRService
 * 
 * @author Gil Klainert
 * @created 2025-08-19
 */

import { EnhancedQRService } from '../enhanced-qr.service';
import { PortalUrls } from '../../types/portal';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(),
    runTransaction: jest.fn()
  })),
  storage: jest.fn(() => ({
    bucket: jest.fn()
  }))
}));

// Mock Firebase Functions Logger
jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('EnhancedQRService Portal Integration', () => {
  let qrService: EnhancedQRService;
  let mockPortalUrls: PortalUrls;

  beforeEach(() => {
    qrService = new EnhancedQRService();
    mockPortalUrls = {
      portal: 'https://example.com/portal/user123',
      chat: 'https://example.com/chat/user123',
      contact: 'https://example.com/contact/user123',
      download: 'https://example.com/download/user123',
      qrMenu: 'https://example.com/menu/user123',
      api: {
        chat: 'https://api.example.com/chat/user123',
        contact: 'https://api.example.com/contact/user123',
        analytics: 'https://api.example.com/analytics/user123'
      }
    };
  });

  describe('getPortalTemplates', () => {
    it('should return portal-specific templates', () => {
      const portalTemplates = qrService.getPortalTemplates();
      
      expect(portalTemplates).toBeDefined();
      expect(portalTemplates.length).toBeGreaterThan(0);
      
      // Should include portal-specific templates
      const portalTemplateIds = portalTemplates.map(t => t.id);
      expect(portalTemplateIds).toContain('portal-primary');
      expect(portalTemplateIds).toContain('portal-chat');
      expect(portalTemplateIds).toContain('portal-menu');
      expect(portalTemplateIds).toContain('portal-contact');
      expect(portalTemplateIds).toContain('portal-download');
      
      // Should also include compatible existing templates
      expect(portalTemplateIds).toContain('professional');
      expect(portalTemplateIds).toContain('modern');
      expect(portalTemplateIds).toContain('branded');
    });

    it('should have properly configured portal templates', () => {
      const portalTemplates = qrService.getPortalTemplates();
      
      const primaryTemplate = portalTemplates.find(t => t.id === 'portal-primary');
      expect(primaryTemplate).toBeDefined();
      expect(primaryTemplate?.name).toBe('Portal Primary');
      expect(primaryTemplate?.style.errorCorrectionLevel).toBe('H');
      expect(primaryTemplate?.callToAction?.text).toBe('View My Portfolio');
      
      const chatTemplate = portalTemplates.find(t => t.id === 'portal-chat');
      expect(chatTemplate).toBeDefined();
      expect(chatTemplate?.name).toBe('Chat Direct');
      expect(chatTemplate?.callToAction?.text).toBe('Chat with AI');
    });
  });

  describe('createPortalQRCodeSet', () => {
    it('should create complete QR code configuration set for portal', async () => {
      const qrCodeSet = await qrService.createPortalQRCodeSet(mockPortalUrls);
      
      expect(qrCodeSet).toHaveLength(5);
      
      // Check each QR code type
      const types = qrCodeSet.map(qr => qr.type);
      expect(types).toContain('portal-primary');
      expect(types).toContain('portal-chat');
      expect(types).toContain('portal-contact');
      expect(types).toContain('portal-download');
      expect(types).toContain('portal-menu');
      
      // Check URLs are correctly assigned
      const primaryQR = qrCodeSet.find(qr => qr.type === 'portal-primary');
      expect(primaryQR?.data).toBe(mockPortalUrls.portal);
      
      const chatQR = qrCodeSet.find(qr => qr.type === 'portal-chat');
      expect(chatQR?.data).toBe(mockPortalUrls.chat);
      
      // Check metadata is properly configured
      expect(primaryQR?.metadata?.title).toBe('Main Portfolio Portal');
      expect(primaryQR?.metadata?.tags).toContain('portal');
      expect(primaryQR?.metadata?.isActive).toBe(true);
      expect(primaryQR?.metadata?.trackingEnabled).toBe(true);
    });

    it('should assign correct templates to each QR code type', async () => {
      const qrCodeSet = await qrService.createPortalQRCodeSet(mockPortalUrls);
      
      qrCodeSet.forEach(qrConfig => {
        expect(qrConfig.template).toBeDefined();
        
        // Template ID should match the QR code type
        if (qrConfig.type === 'portal-primary') {
          expect(qrConfig.template?.id).toBe('portal-primary');
        } else if (qrConfig.type === 'portal-chat') {
          expect(qrConfig.template?.id).toBe('portal-chat');
        }
        // Add more checks for other types as needed
      });
    });

    it('should handle missing portal URLs gracefully', async () => {
      const incompleteUrls = {
        ...mockPortalUrls,
        chat: '', // Empty chat URL
        contact: undefined as any // Missing contact URL
      };
      
      // Should not throw error, but may have empty data
      const qrCodeSet = await qrService.createPortalQRCodeSet(incompleteUrls);
      expect(qrCodeSet).toHaveLength(5);
      
      const chatQR = qrCodeSet.find(qr => qr.type === 'portal-chat');
      expect(chatQR?.data).toBe('');
    });
  });

  describe('Portal Template Configuration', () => {
    it('should have all required portal templates with correct properties', () => {
      const allTemplates = qrService.getDefaultTemplates();
      
      const portalTemplates = [
        'portal-primary',
        'portal-chat',
        'portal-menu',
        'portal-contact',
        'portal-download'
      ];
      
      portalTemplates.forEach(templateId => {
        const template = allTemplates.find(t => t.id === templateId);
        expect(template).toBeDefined();
        expect(template?.name).toBeDefined();
        expect(template?.description).toBeDefined();
        expect(template?.style).toBeDefined();
        expect(template?.style.foregroundColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(template?.style.backgroundColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(template?.style.width).toBeGreaterThan(0);
        expect(['L', 'M', 'Q', 'H']).toContain(template?.style.errorCorrectionLevel);
      });
    });

    it('should have unique and descriptive call-to-action texts', () => {
      const portalTemplates = qrService.getPortalTemplates()
        .filter(t => t.id.startsWith('portal-'));
      
      const callToActions = portalTemplates
        .map(t => t.callToAction?.text)
        .filter(Boolean);
      
      // Should have call-to-action for each template
      expect(callToActions.length).toBe(5);
      
      // Should be unique
      const uniqueActions = new Set(callToActions);
      expect(uniqueActions.size).toBe(callToActions.length);
      
      // Should be descriptive
      expect(callToActions).toContain('View My Portfolio');
      expect(callToActions).toContain('Chat with AI');
      expect(callToActions).toContain('Explore Options');
      expect(callToActions).toContain('Contact Me');
      expect(callToActions).toContain('Download CV');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain all existing templates', () => {
      const allTemplates = qrService.getDefaultTemplates();
      
      // Original templates should still exist
      const originalTemplateIds = ['professional', 'modern', 'minimal', 'branded'];
      originalTemplateIds.forEach(id => {
        const template = allTemplates.find(t => t.id === id);
        expect(template).toBeDefined();
      });
      
      // Should now have more templates (original + portal)
      expect(allTemplates.length).toBeGreaterThanOrEqual(9); // 4 original + 5 portal
    });

    it('should not break existing QR code type handling', async () => {
      // Test that existing types still work in createPortalQRCodeSet
      const qrCodeSet = await qrService.createPortalQRCodeSet(mockPortalUrls);
      
      // Should only create portal types, not interfere with existing types
      qrCodeSet.forEach(qr => {
        expect(qr.type).toMatch(/^portal-/);
      });
    });
  });
});