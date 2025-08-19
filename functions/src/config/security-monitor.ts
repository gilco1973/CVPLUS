/**
 * Security Monitoring and Alerting System
 * Provides comprehensive security event tracking and alerting for environment configuration
 */

import * as functions from 'firebase-functions';
import { SecurityEventType } from './environment';

// Security event interface
interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: string;
  description: string;
  metadata: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// Security alert interface
interface SecurityAlert {
  id: string;
  timestamp: Date;
  eventType: SecurityEventType;
  eventCount: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeWindow: number; // minutes
  threshold: number;
  description: string;
  events: SecurityEvent[];
}

// Security metrics interface
interface SecurityMetrics {
  totalEvents: number;
  eventsBySeverity: Record<string, number>;
  eventsByType: Record<SecurityEventType, number>;
  alertsTriggered: number;
  lastEventTime?: Date;
  mostFrequentEventType?: SecurityEventType;
  securityScore: number; // 0-100
}

class SecurityMonitor {
  private static instance: SecurityMonitor | null = null;
  private events: SecurityEvent[] = [];
  private alerts: SecurityAlert[] = [];
  private readonly maxEvents = 1000; // Maximum events to keep in memory
  private readonly eventRetention = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Alert thresholds (events per time window)
  private readonly alertThresholds = {
    [SecurityEventType.MISSING_REQUIRED_VAR]: { threshold: 1, window: 5 }, // 1 in 5 minutes
    [SecurityEventType.INVALID_FORMAT]: { threshold: 5, window: 10 }, // 5 in 10 minutes
    [SecurityEventType.SUSPICIOUS_VALUE]: { threshold: 3, window: 5 }, // 3 in 5 minutes
    [SecurityEventType.VALIDATION_ERROR]: { threshold: 10, window: 15 }, // 10 in 15 minutes
    [SecurityEventType.CONFIG_ACCESS_ATTEMPT]: { threshold: 100, window: 60 } // 100 in 60 minutes
  };

  private constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanupOldEvents(), 60000); // Every minute
  }

  // Get singleton instance
  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  // Record security event
  recordEvent(
    type: SecurityEventType,
    source: string,
    description: string,
    metadata: Record<string, any> = {},
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): string {
    const eventId = this.generateEventId();
    const eventSeverity = severity || this.determineSeverity(type);
    
    const event: SecurityEvent = {
      id: eventId,
      timestamp: new Date(),
      type,
      severity: eventSeverity,
      source,
      description,
      metadata: this.sanitizeMetadata(metadata),
      resolved: false
    };

    this.events.push(event);
    
    // Log to Firebase Functions
    this.logToFirebase(event);
    
    // Check for alert conditions
    this.checkAlertConditions(event);
    
    // Cleanup old events if necessary
    if (this.events.length > this.maxEvents) {
      this.cleanupOldEvents();
    }

    return eventId;
  }

  // Resolve security event
  resolveEvent(eventId: string, resolvedBy?: string): boolean {
    const event = this.events.find(e => e.id === eventId);
    if (event && !event.resolved) {
      event.resolved = true;
      event.resolvedAt = new Date();
      event.resolvedBy = resolvedBy || 'system';
      
      functions.logger.info('Security event resolved', {
        eventId,
        eventType: event.type,
        resolvedBy: event.resolvedBy
      });
      
      return true;
    }
    return false;
  }

  // Get security metrics
  getSecurityMetrics(): SecurityMetrics {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - this.eventRetention);
    const recentEvents = this.events.filter(e => e.timestamp >= last24Hours);

    const eventsBySeverity = recentEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsByType = recentEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<SecurityEventType, number>);

    const mostFrequentType = Object.entries(eventsByType)
      .sort(([, a], [, b]) => b - a)[0]?.[0] as SecurityEventType;

    const securityScore = this.calculateSecurityScore(recentEvents);

    return {
      totalEvents: recentEvents.length,
      eventsBySeverity,
      eventsByType,
      alertsTriggered: this.alerts.filter(a => a.timestamp >= last24Hours).length,
      lastEventTime: recentEvents[recentEvents.length - 1]?.timestamp,
      mostFrequentEventType: mostFrequentType,
      securityScore
    };
  }

  // Get recent events
  getRecentEvents(hours: number = 24, severity?: string): SecurityEvent[] {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.events
      .filter(event => {
        const withinTimeWindow = event.timestamp >= cutoff;
        const matchesSeverity = !severity || event.severity === severity;
        return withinTimeWindow && matchesSeverity;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Get active alerts
  getActiveAlerts(): SecurityAlert[] {
    const now = new Date();
    const activeThreshold = 60 * 60 * 1000; // 1 hour
    
    return this.alerts.filter(alert => 
      now.getTime() - alert.timestamp.getTime() < activeThreshold
    );
  }

  // Generate security report
  generateSecurityReport(): {
    summary: SecurityMetrics;
    recentEvents: SecurityEvent[];
    activeAlerts: SecurityAlert[];
    recommendations: string[];
  } {
    const summary = this.getSecurityMetrics();
    const recentEvents = this.getRecentEvents(24);
    const activeAlerts = this.getActiveAlerts();
    const recommendations = this.generateRecommendations(summary, recentEvents);

    return {
      summary,
      recentEvents,
      activeAlerts,
      recommendations
    };
  }

  // Private helper methods
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineSeverity(type: SecurityEventType): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch (type) {
      case SecurityEventType.MISSING_REQUIRED_VAR:
        return 'CRITICAL';
      case SecurityEventType.SUSPICIOUS_VALUE:
        return 'HIGH';
      case SecurityEventType.INVALID_FORMAT:
        return 'MEDIUM';
      case SecurityEventType.VALIDATION_ERROR:
        return 'MEDIUM';
      case SecurityEventType.CONFIG_ACCESS_ATTEMPT:
        return 'LOW';
      default:
        return 'MEDIUM';
    }
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      // Don't log sensitive values
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        // Sanitize string values
        sanitized[key] = value.substring(0, 200); // Limit length
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password', 'secret', 'key', 'token', 'credential',
      'private', 'confidential', 'auth', 'api'
    ];
    
    const lowerKey = key.toLowerCase();
    return sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
  }

  private logToFirebase(event: SecurityEvent): void {
    const logData = {
      eventId: event.id,
      timestamp: event.timestamp.toISOString(),
      type: event.type,
      severity: event.severity,
      source: event.source,
      description: event.description,
      metadata: event.metadata
    };

    if (event.severity === 'CRITICAL' || event.severity === 'HIGH') {
      functions.logger.error('Security Event', logData);
    } else if (event.severity === 'MEDIUM') {
      functions.logger.warn('Security Event', logData);
    } else {
      functions.logger.info('Security Event', logData);
    }
  }

  private checkAlertConditions(event: SecurityEvent): void {
    const threshold = this.alertThresholds[event.type];
    if (!threshold) return;

    const windowStart = new Date(Date.now() - (threshold.window * 60 * 1000));
    const recentEventsOfType = this.events.filter(e => 
      e.type === event.type && 
      e.timestamp >= windowStart
    );

    if (recentEventsOfType.length >= threshold.threshold) {
      this.triggerAlert(event.type, recentEventsOfType, threshold);
    }
  }

  private triggerAlert(
    eventType: SecurityEventType,
    events: SecurityEvent[],
    threshold: { threshold: number; window: number }
  ): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: SecurityAlert = {
      id: alertId,
      timestamp: new Date(),
      eventType,
      eventCount: events.length,
      severity: events[0]?.severity || 'MEDIUM',
      timeWindow: threshold.window,
      threshold: threshold.threshold,
      description: `${events.length} ${eventType} events in ${threshold.window} minutes`,
      events
    };

    this.alerts.push(alert);

    // Log alert
    functions.logger.error('Security Alert Triggered', {
      alertId: alert.id,
      eventType: alert.eventType,
      eventCount: alert.eventCount,
      timeWindow: alert.timeWindow,
      severity: alert.severity
    });

    // In production, integrate with external alerting systems
    // this.sendToSlack(alert);
    // this.sendToEmail(alert);
    // this.sendToSecurityTeam(alert);
  }

  private cleanupOldEvents(): void {
    const cutoff = new Date(Date.now() - this.eventRetention);
    const beforeCount = this.events.length;
    
    this.events = this.events.filter(event => event.timestamp >= cutoff);
    this.alerts = this.alerts.filter(alert => alert.timestamp >= cutoff);
    
    const removedCount = beforeCount - this.events.length;
    if (removedCount > 0) {
      functions.logger.info(`Cleaned up ${removedCount} old security events`);
    }
  }

  private calculateSecurityScore(events: SecurityEvent[]): number {
    if (events.length === 0) return 100;

    const severityWeights = {
      'LOW': 1,
      'MEDIUM': 3,
      'HIGH': 7,
      'CRITICAL': 15
    };

    const totalWeight = events.reduce((sum, event) => {
      return sum + severityWeights[event.severity];
    }, 0);

    // Calculate score (higher weight = lower score)
    const maxPossibleWeight = events.length * severityWeights['CRITICAL'];
    const score = Math.max(0, 100 - (totalWeight / maxPossibleWeight) * 100);

    return Math.round(score);
  }

  private generateRecommendations(
    metrics: SecurityMetrics,
    events: SecurityEvent[]
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.securityScore < 70) {
      recommendations.push('Security score is below threshold - immediate attention required');
    }

    if (metrics.eventsBySeverity['CRITICAL'] > 0) {
      recommendations.push('Critical security events detected - verify all required environment variables are properly configured');
    }

    if (metrics.eventsBySeverity['HIGH'] > 5) {
      recommendations.push('High number of high-severity events - review environment variable validation and sanitization');
    }

    if (metrics.mostFrequentEventType === SecurityEventType.SUSPICIOUS_VALUE) {
      recommendations.push('Frequent suspicious value detection - audit environment variable sources and input methods');
    }

    if (metrics.mostFrequentEventType === SecurityEventType.INVALID_FORMAT) {
      recommendations.push('Frequent format validation failures - review environment variable format requirements');
    }

    const unresolvedEvents = events.filter(e => !e.resolved);
    if (unresolvedEvents.length > 10) {
      recommendations.push('Large number of unresolved security events - implement systematic event resolution process');
    }

    if (recommendations.length === 0) {
      recommendations.push('Security posture is good - continue monitoring and maintain current security practices');
    }

    return recommendations;
  }
}

// Export singleton instance
export const securityMonitor = SecurityMonitor.getInstance();

// Export types for external use
export { SecurityEvent, SecurityAlert, SecurityMetrics };

// Utility function for manual security event reporting
export const reportSecurityEvent = (
  type: SecurityEventType,
  source: string,
  description: string,
  metadata: Record<string, any> = {}
): string => {
  return securityMonitor.recordEvent(type, source, description, metadata);
};