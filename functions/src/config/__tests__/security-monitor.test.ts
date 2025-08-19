/**
 * Comprehensive Test Suite for Security Monitoring System
 * Tests event recording, alerting, metrics calculation, and reporting
 */

import { securityMonitor, reportSecurityEvent } from '../security-monitor';
import { SecurityEventType } from '../environment';
import * as functions from 'firebase-functions';

// Mock Firebase Functions logger
jest.mock('firebase-functions', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  }
}));

describe('Security Monitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any existing events
    securityMonitor['events'] = [];
    securityMonitor['alerts'] = [];
  });

  describe('Event Recording', () => {
    test('should record security events with all required fields', () => {
      const eventId = securityMonitor.recordEvent(
        SecurityEventType.INVALID_FORMAT,
        'environment-validator',
        'Invalid API key format detected',
        { keyName: 'OPENAI_API_KEY' }
      );

      expect(eventId).toMatch(/^sec_\d+_[a-z0-9]{9}$/);
      expect(functions.logger.warn).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({
          eventId,
          type: SecurityEventType.INVALID_FORMAT,
          severity: 'MEDIUM',
          source: 'environment-validator',
          description: 'Invalid API key format detected'
        })
      );
    });

    test('should sanitize sensitive metadata', () => {
      const eventId = securityMonitor.recordEvent(
        SecurityEventType.SUSPICIOUS_VALUE,
        'api-validator',
        'Suspicious API key detected',
        {
          apiKey: 'sk-malicious-content',
          password: 'secret-password',
          normalField: 'normal-value'
        }
      );

      const logCalls = (functions.logger.error as jest.Mock).mock.calls;
      const relevantCall = logCalls.find(call => 
        call[0] === 'Security Event' && call[1].eventId === eventId
      );

      expect(relevantCall[1].metadata).toEqual({
        apiKey: '[REDACTED]',
        password: '[REDACTED]',
        normalField: 'normal-value'
      });
    });

    test('should determine correct severity levels', () => {
      // Test different event types and their severities
      const criticalEvent = securityMonitor.recordEvent(
        SecurityEventType.MISSING_REQUIRED_VAR,
        'config-loader',
        'Required variable missing'
      );

      const highEvent = securityMonitor.recordEvent(
        SecurityEventType.SUSPICIOUS_VALUE,
        'validator',
        'Suspicious content detected'
      );

      const mediumEvent = securityMonitor.recordEvent(
        SecurityEventType.INVALID_FORMAT,
        'validator',
        'Invalid format detected'
      );

      expect(functions.logger.error).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({ severity: 'CRITICAL' })
      );

      expect(functions.logger.error).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({ severity: 'HIGH' })
      );

      expect(functions.logger.warn).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({ severity: 'MEDIUM' })
      );
    });

    test('should handle custom severity levels', () => {
      const eventId = securityMonitor.recordEvent(
        SecurityEventType.VALIDATION_ERROR,
        'custom-validator',
        'Custom validation error',
        {},
        'CRITICAL'
      );

      expect(functions.logger.error).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({
          eventId,
          severity: 'CRITICAL'
        })
      );
    });
  });

  describe('Event Resolution', () => {
    test('should resolve existing events', () => {
      const eventId = securityMonitor.recordEvent(
        SecurityEventType.INVALID_FORMAT,
        'test-source',
        'Test event'
      );

      const resolved = securityMonitor.resolveEvent(eventId, 'test-admin');

      expect(resolved).toBe(true);
      expect(functions.logger.info).toHaveBeenCalledWith(
        'Security event resolved',
        expect.objectContaining({
          eventId,
          eventType: SecurityEventType.INVALID_FORMAT,
          resolvedBy: 'test-admin'
        })
      );
    });

    test('should not resolve non-existent events', () => {
      const resolved = securityMonitor.resolveEvent('non-existent-id');
      expect(resolved).toBe(false);
    });

    test('should not resolve already resolved events', () => {
      const eventId = securityMonitor.recordEvent(
        SecurityEventType.INVALID_FORMAT,
        'test-source',
        'Test event'
      );

      // Resolve first time
      expect(securityMonitor.resolveEvent(eventId)).toBe(true);
      
      // Try to resolve again
      expect(securityMonitor.resolveEvent(eventId)).toBe(false);
    });
  });

  describe('Alert System', () => {
    test('should trigger alerts when thresholds are exceeded', () => {
      // Record multiple suspicious value events to trigger alert
      for (let i = 0; i < 3; i++) {
        securityMonitor.recordEvent(
          SecurityEventType.SUSPICIOUS_VALUE,
          'test-source',
          `Suspicious event ${i}`
        );
      }

      // Check if alert was triggered
      const activeAlerts = securityMonitor.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].eventType).toBe(SecurityEventType.SUSPICIOUS_VALUE);
      expect(activeAlerts[0].eventCount).toBe(3);

      // Check if alert was logged
      expect(functions.logger.error).toHaveBeenCalledWith(
        'Security Alert Triggered',
        expect.objectContaining({
          eventType: SecurityEventType.SUSPICIOUS_VALUE,
          eventCount: 3
        })
      );
    });

    test('should not trigger alerts below threshold', () => {
      // Record only 1 suspicious value event (threshold is 3)
      securityMonitor.recordEvent(
        SecurityEventType.SUSPICIOUS_VALUE,
        'test-source',
        'Single suspicious event'
      );

      const activeAlerts = securityMonitor.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);
    });

    test('should respect time windows for alerts', (done) => {
      // Record 2 events
      securityMonitor.recordEvent(
        SecurityEventType.SUSPICIOUS_VALUE,
        'test-source',
        'Event 1'
      );
      
      securityMonitor.recordEvent(
        SecurityEventType.SUSPICIOUS_VALUE,
        'test-source',
        'Event 2'
      );

      // Wait and record the third event (should trigger alert if within window)
      setTimeout(() => {
        securityMonitor.recordEvent(
          SecurityEventType.SUSPICIOUS_VALUE,
          'test-source',
          'Event 3'
        );

        const activeAlerts = securityMonitor.getActiveAlerts();
        expect(activeAlerts).toHaveLength(1);
        done();
      }, 100);
    });
  });

  describe('Metrics Calculation', () => {
    test('should calculate security metrics correctly', () => {
      // Record various events
      securityMonitor.recordEvent(
        SecurityEventType.MISSING_REQUIRED_VAR,
        'config',
        'Critical event'
      );
      
      securityMonitor.recordEvent(
        SecurityEventType.INVALID_FORMAT,
        'validator',
        'Medium event 1'
      );
      
      securityMonitor.recordEvent(
        SecurityEventType.INVALID_FORMAT,
        'validator',
        'Medium event 2'
      );

      const metrics = securityMonitor.getSecurityMetrics();

      expect(metrics.totalEvents).toBe(3);
      expect(metrics.eventsBySeverity).toEqual({
        'CRITICAL': 1,
        'MEDIUM': 2
      });
      expect(metrics.eventsByType).toEqual({
        [SecurityEventType.MISSING_REQUIRED_VAR]: 1,
        [SecurityEventType.INVALID_FORMAT]: 2
      });
      expect(metrics.mostFrequentEventType).toBe(SecurityEventType.INVALID_FORMAT);
      expect(metrics.securityScore).toBeLessThan(100);
    });

    test('should return perfect security score with no events', () => {
      const metrics = securityMonitor.getSecurityMetrics();
      expect(metrics.securityScore).toBe(100);
      expect(metrics.totalEvents).toBe(0);
    });

    test('should calculate lower security scores for severe events', () => {
      // Record several critical events
      for (let i = 0; i < 5; i++) {
        securityMonitor.recordEvent(
          SecurityEventType.MISSING_REQUIRED_VAR,
          'config',
          `Critical event ${i}`
        );
      }

      const metrics = securityMonitor.getSecurityMetrics();
      expect(metrics.securityScore).toBeLessThan(50);
    });
  });

  describe('Event Retrieval', () => {
    test('should retrieve recent events within time window', () => {
      const now = Date.now();
      
      // Mock timestamps to simulate events at different times
      const originalDate = Date;
      global.Date = jest.fn(() => new originalDate(now)) as any;
      global.Date.now = jest.fn(() => now);

      securityMonitor.recordEvent(
        SecurityEventType.INVALID_FORMAT,
        'test',
        'Recent event'
      );

      // Restore Date
      global.Date = originalDate;

      const recentEvents = securityMonitor.getRecentEvents(1); // Last 1 hour
      expect(recentEvents).toHaveLength(1);
      expect(recentEvents[0].description).toBe('Recent event');
    });

    test('should filter events by severity', () => {
      securityMonitor.recordEvent(
        SecurityEventType.MISSING_REQUIRED_VAR,
        'config',
        'Critical event'
      );
      
      securityMonitor.recordEvent(
        SecurityEventType.INVALID_FORMAT,
        'validator',
        'Medium event'
      );

      const criticalEvents = securityMonitor.getRecentEvents(24, 'CRITICAL');
      const mediumEvents = securityMonitor.getRecentEvents(24, 'MEDIUM');

      expect(criticalEvents).toHaveLength(1);
      expect(criticalEvents[0].severity).toBe('CRITICAL');
      
      expect(mediumEvents).toHaveLength(1);
      expect(mediumEvents[0].severity).toBe('MEDIUM');
    });
  });

  describe('Security Report Generation', () => {
    test('should generate comprehensive security reports', () => {
      // Create some test data
      securityMonitor.recordEvent(
        SecurityEventType.SUSPICIOUS_VALUE,
        'validator',
        'Suspicious content detected'
      );
      
      securityMonitor.recordEvent(
        SecurityEventType.INVALID_FORMAT,
        'formatter',
        'Invalid format detected'
      );

      const report = securityMonitor.generateSecurityReport();

      expect(report.summary).toHaveProperty('totalEvents');
      expect(report.summary).toHaveProperty('securityScore');
      expect(report.recentEvents).toBeDefined();
      expect(report.activeAlerts).toBeDefined();
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    test('should provide appropriate recommendations based on events', () => {
      // Create critical events to trigger specific recommendations
      for (let i = 0; i < 3; i++) {
        securityMonitor.recordEvent(
          SecurityEventType.MISSING_REQUIRED_VAR,
          'config',
          'Missing critical variable'
        );
      }

      const report = securityMonitor.generateSecurityReport();
      
      expect(report.recommendations).toContain(
        'Critical security events detected - verify all required environment variables are properly configured'
      );
      expect(report.recommendations).toContain(
        'Security score is below threshold - immediate attention required'
      );
    });

    test('should provide positive recommendations when security is good', () => {
      // Don't create any events - should result in good security posture
      const report = securityMonitor.generateSecurityReport();
      
      expect(report.recommendations).toContain(
        'Security posture is good - continue monitoring and maintain current security practices'
      );
    });
  });

  describe('Utility Functions', () => {
    test('should support manual security event reporting', () => {
      const eventId = reportSecurityEvent(
        SecurityEventType.CONFIG_ACCESS_ATTEMPT,
        'api-endpoint',
        'Unauthorized config access attempt',
        { ip: '192.168.1.1' }
      );

      expect(eventId).toBeDefined();
      expect(functions.logger.info).toHaveBeenCalledWith(
        'Security Event',
        expect.objectContaining({
          type: SecurityEventType.CONFIG_ACCESS_ATTEMPT,
          source: 'api-endpoint'
        })
      );
    });
  });

  describe('Event Cleanup', () => {
    test('should cleanup old events beyond retention period', (done) => {
      const originalRetention = (securityMonitor as any).eventRetention;
      
      // Set very short retention for testing
      (securityMonitor as any).eventRetention = 100; // 100ms
      
      securityMonitor.recordEvent(
        SecurityEventType.INVALID_FORMAT,
        'test',
        'Old event'
      );

      // Wait for retention period to pass
      setTimeout(() => {
        // Trigger cleanup manually
        securityMonitor['cleanupOldEvents']();
        
        const metrics = securityMonitor.getSecurityMetrics();
        expect(metrics.totalEvents).toBe(0);
        
        // Restore original retention
        (securityMonitor as any).eventRetention = originalRetention;
        done();
      }, 150);
    });

    test('should limit number of events in memory', () => {
      const originalMaxEvents = (securityMonitor as any).maxEvents;
      (securityMonitor as any).maxEvents = 3; // Set low limit for testing

      // Record more events than the limit
      for (let i = 0; i < 5; i++) {
        securityMonitor.recordEvent(
          SecurityEventType.VALIDATION_ERROR,
          'test',
          `Event ${i}`
        );
      }

      // Should trigger cleanup automatically
      const events = securityMonitor['events'];
      expect(events.length).toBeLessThanOrEqual(3);

      // Restore original limit
      (securityMonitor as any).maxEvents = originalMaxEvents;
    });
  });
});