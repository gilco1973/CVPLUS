/**
 * T041: Alert rule management in functions/src/services/AlertRuleService.ts
 *
 * Service for managing alert rules, evaluating conditions, and triggering notifications
 * when log patterns or thresholds are met. Provides comprehensive alert management
 * for the CVPlus logging system.
 */

import { LoggerFactory, LogLevel, LogDomain, LogEntry } from '@cvplus/logging/backend';
import { AuditTrailClass as AuditTrail, AuditAction, AuditEventType } from '@cvplus/logging/backend';
import { firestore } from 'firebase-admin';

/**
 * Alert rule condition types
 */
export enum AlertConditionType {
  ERROR_RATE = 'error_rate',
  ERROR_COUNT = 'error_count',
  PERFORMANCE_THRESHOLD = 'performance_threshold',
  SECURITY_EVENT = 'security_event',
  LOG_PATTERN = 'log_pattern',
  VOLUME_SPIKE = 'volume_spike',
  CUSTOM_METRIC = 'custom_metric'
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Alert notification channels
 */
export enum AlertChannel {
  EMAIL = 'email',
  SMS = 'sms',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  PUSH_NOTIFICATION = 'push_notification'
}

/**
 * Alert rule condition definition
 */
export interface AlertCondition {
  type: AlertConditionType;
  threshold: number;
  timeWindow: number; // seconds
  aggregation?: 'count' | 'rate' | 'average' | 'max' | 'min';
  field?: string;
  pattern?: string; // for log pattern matching
  comparison: 'greater_than' | 'less_than' | 'equals' | 'contains';
}

/**
 * Alert rule configuration
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: AlertSeverity;
  conditions: AlertCondition[];
  channels: AlertChannel[];
  recipients: string[]; // email addresses, phone numbers, etc.
  cooldownPeriod: number; // seconds before re-alerting
  tags: string[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  lastTriggered?: number;
  triggerCount: number;
  filters?: {
    domains?: LogDomain[];
    levels?: LogLevel[];
    functionNames?: string[];
    userIds?: string[];
  };
}

/**
 * Alert instance when a rule is triggered
 */
export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  message: string;
  details: Record<string, any>;
  triggeredAt: number;
  resolvedAt?: number;
  status: 'active' | 'resolved' | 'suppressed';
  relatedLogIds: string[];
  notificationsSent: {
    channel: AlertChannel;
    recipient: string;
    sentAt: number;
    success: boolean;
  }[];
}

/**
 * Alert evaluation context
 */
interface AlertEvaluationContext {
  rule: AlertRule;
  logs: LogEntry[];
  timeWindow: number;
  currentTime: number;
}

/**
 * Service for managing alert rules and processing alerts
 */
export class AlertRuleService {
  private logger = LoggerFactory.createLogger('alert-rule-service');
  private db = firestore();
  private auditTrail = new AuditTrail();

  /**
   * Create a new alert rule
   */
  async createAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt' | 'triggerCount'>): Promise<string> {
    try {
      const ruleId = this.db.collection('alert_rules').doc().id;
      const now = Date.now();

      const newRule: AlertRule = {
        ...rule,
        id: ruleId,
        createdAt: now,
        updatedAt: now,
        triggerCount: 0
      };

      await this.db.collection('alert_rules').doc(ruleId).set(newRule);

      // Audit log
      this.auditTrail.logAction({
        action: AuditAction.CREATE,
        eventType: AuditEventType.SYSTEM_CONFIG,
        resourceType: 'alert_rule',
        resourceId: ruleId,
        userId: rule.createdBy,
        details: {
          ruleName: rule.name,
          severity: rule.severity,
          conditionCount: rule.conditions.length
        }
      });

      this.logger.log(LogLevel.INFO, 'Alert rule created', {
        domain: LogDomain.AUDIT,
        event: 'ALERT_RULE_CREATED',
        ruleId,
        ruleName: rule.name,
        severity: rule.severity
      });

      return ruleId;
    } catch (error) {
      this.logger.log(LogLevel.ERROR, 'Failed to create alert rule', {
        domain: LogDomain.SYSTEM,
        event: 'ALERT_RULE_CREATION_FAILED',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  /**
   * Update an existing alert rule
   */
  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>, updatedBy: string): Promise<void> {
    try {
      const ruleRef = this.db.collection('alert_rules').doc(ruleId);
      const ruleDoc = await ruleRef.get();

      if (!ruleDoc.exists) {
        throw new Error(`Alert rule ${ruleId} not found`);
      }

      const currentRule = ruleDoc.data() as AlertRule;
      const updatedRule = {
        ...currentRule,
        ...updates,
        updatedAt: Date.now()
      };

      await ruleRef.update(updatedRule);

      // Audit log
      this.auditTrail.logAction({
        action: AuditAction.UPDATE,
        eventType: AuditEventType.SYSTEM_CONFIG,
        resourceType: 'alert_rule',
        resourceId: ruleId,
        userId: updatedBy,
        details: {
          changes: updates,
          previousValues: Object.keys(updates).reduce((prev, key) => {
            prev[key] = currentRule[key as keyof AlertRule];
            return prev;
          }, {} as Record<string, any>)
        }
      });

      this.logger.log(LogLevel.INFO, 'Alert rule updated', {
        domain: LogDomain.AUDIT,
        event: 'ALERT_RULE_UPDATED',
        ruleId,
        updatedBy,
        changes: Object.keys(updates)
      });
    } catch (error) {
      this.logger.log(LogLevel.ERROR, 'Failed to update alert rule', {
        domain: LogDomain.SYSTEM,
        event: 'ALERT_RULE_UPDATE_FAILED',
        ruleId,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * Delete an alert rule
   */
  async deleteAlertRule(ruleId: string, deletedBy: string): Promise<void> {
    try {
      const ruleRef = this.db.collection('alert_rules').doc(ruleId);
      const ruleDoc = await ruleRef.get();

      if (!ruleDoc.exists) {
        throw new Error(`Alert rule ${ruleId} not found`);
      }

      const rule = ruleDoc.data() as AlertRule;
      await ruleRef.delete();

      // Audit log
      this.auditTrail.logAction({
        action: AuditAction.DELETE,
        eventType: AuditEventType.SYSTEM_CONFIG,
        resourceType: 'alert_rule',
        resourceId: ruleId,
        userId: deletedBy,
        details: {
          ruleName: rule.name,
          severity: rule.severity,
          triggerCount: rule.triggerCount
        }
      });

      this.logger.log(LogLevel.INFO, 'Alert rule deleted', {
        domain: LogDomain.AUDIT,
        event: 'ALERT_RULE_DELETED',
        ruleId,
        deletedBy
      });
    } catch (error) {
      this.logger.log(LogLevel.ERROR, 'Failed to delete alert rule', {
        domain: LogDomain.SYSTEM,
        event: 'ALERT_RULE_DELETION_FAILED',
        ruleId,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * Get all alert rules
   */
  async getAlertRules(filters?: { enabled?: boolean; severity?: AlertSeverity }): Promise<AlertRule[]> {
    try {
      let query = this.db.collection('alert_rules') as any;

      if (filters?.enabled !== undefined) {
        query = query.where('enabled', '==', filters.enabled);
      }
      if (filters?.severity) {
        query = query.where('severity', '==', filters.severity);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as AlertRule));
    } catch (error) {
      this.logger.log(LogLevel.ERROR, 'Failed to get alert rules', {
        domain: LogDomain.SYSTEM,
        event: 'ALERT_RULES_FETCH_FAILED',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * Evaluate all enabled alert rules against recent logs
   */
  async evaluateAlertRules(logs: LogEntry[]): Promise<Alert[]> {
    try {
      const rules = await this.getAlertRules({ enabled: true });
      const triggeredAlerts: Alert[] = [];

      for (const rule of rules) {
        // Check cooldown period
        if (rule.lastTriggered) {
          const timeSinceLastTrigger = Date.now() - rule.lastTriggered;
          if (timeSinceLastTrigger < (rule.cooldownPeriod * 1000)) {
            continue; // Skip rule due to cooldown
          }
        }

        const matchingLogs = this.filterLogsForRule(logs, rule);
        const alerts = await this.evaluateRule(rule, matchingLogs);
        triggeredAlerts.push(...alerts);
      }

      return triggeredAlerts;
    } catch (error) {
      this.logger.log(LogLevel.ERROR, 'Failed to evaluate alert rules', {
        domain: LogDomain.SYSTEM,
        event: 'ALERT_EVALUATION_FAILED',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * Evaluate a single alert rule
   */
  private async evaluateRule(rule: AlertRule, logs: LogEntry[]): Promise<Alert[]> {
    const alerts: Alert[] = [];

    for (const condition of rule.conditions) {
      const context: AlertEvaluationContext = {
        rule,
        logs,
        timeWindow: condition.timeWindow,
        currentTime: Date.now()
      };

      if (await this.evaluateCondition(condition, context)) {
        const alert = await this.createAlert(rule, condition, logs);
        alerts.push(alert);

        // Update rule trigger count and last triggered time
        await this.updateRuleTriggerInfo(rule.id);
      }
    }

    return alerts;
  }

  /**
   * Evaluate a single alert condition
   */
  private async evaluateCondition(condition: AlertCondition, context: AlertEvaluationContext): Promise<boolean> {
    const { logs, timeWindow, currentTime } = context;

    // Filter logs by time window
    const windowStart = currentTime - (timeWindow * 1000);
    const windowLogs = logs.filter(log => log.timestamp >= windowStart);

    switch (condition.type) {
      case AlertConditionType.ERROR_RATE:
        return this.evaluateErrorRate(condition, windowLogs);

      case AlertConditionType.ERROR_COUNT:
        return this.evaluateErrorCount(condition, windowLogs);

      case AlertConditionType.PERFORMANCE_THRESHOLD:
        return this.evaluatePerformanceThreshold(condition, windowLogs);

      case AlertConditionType.SECURITY_EVENT:
        return this.evaluateSecurityEvent(condition, windowLogs);

      case AlertConditionType.LOG_PATTERN:
        return this.evaluateLogPattern(condition, windowLogs);

      case AlertConditionType.VOLUME_SPIKE:
        return this.evaluateVolumeSpike(condition, windowLogs);

      default:
        return false;
    }
  }

  /**
   * Evaluate error rate condition
   */
  private evaluateErrorRate(condition: AlertCondition, logs: LogEntry[]): boolean {
    const totalLogs = logs.length;
    const errorLogs = logs.filter(log => log.level === LogLevel.ERROR).length;
    const errorRate = totalLogs > 0 ? errorLogs / totalLogs : 0;

    return condition.comparison === 'greater_than'
      ? errorRate > condition.threshold
      : errorRate < condition.threshold;
  }

  /**
   * Evaluate error count condition
   */
  private evaluateErrorCount(condition: AlertCondition, logs: LogEntry[]): boolean {
    const errorCount = logs.filter(log => log.level === LogLevel.ERROR).length;

    return condition.comparison === 'greater_than'
      ? errorCount > condition.threshold
      : errorCount < condition.threshold;
  }

  /**
   * Evaluate performance threshold condition
   */
  private evaluatePerformanceThreshold(condition: AlertCondition, logs: LogEntry[]): boolean {
    const performanceLogs = logs.filter(log =>
      log.context?.performance?.duration !== undefined
    );

    if (performanceLogs.length === 0) return false;

    const durations = performanceLogs.map(log => log.context!.performance!.duration);
    let value: number;

    switch (condition.aggregation) {
      case 'average':
        value = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        break;
      case 'max':
        value = Math.max(...durations);
        break;
      case 'min':
        value = Math.min(...durations);
        break;
      default:
        value = durations.length;
    }

    return condition.comparison === 'greater_than'
      ? value > condition.threshold
      : value < condition.threshold;
  }

  /**
   * Evaluate security event condition
   */
  private evaluateSecurityEvent(condition: AlertCondition, logs: LogEntry[]): boolean {
    const securityLogs = logs.filter(log => log.domain === LogDomain.SECURITY);
    return securityLogs.length > condition.threshold;
  }

  /**
   * Evaluate log pattern condition
   */
  private evaluateLogPattern(condition: AlertCondition, logs: LogEntry[]): boolean {
    if (!condition.pattern) return false;

    const regex = new RegExp(condition.pattern, 'i');
    const matchingLogs = logs.filter(log =>
      regex.test(log.message) ||
      (log.context && JSON.stringify(log.context).match(regex))
    );

    return matchingLogs.length > condition.threshold;
  }

  /**
   * Evaluate volume spike condition
   */
  private evaluateVolumeSpike(condition: AlertCondition, logs: LogEntry[]): boolean {
    // Compare current window volume to historical average
    // This is a simplified implementation
    return logs.length > condition.threshold;
  }

  /**
   * Filter logs based on rule filters
   */
  private filterLogsForRule(logs: LogEntry[], rule: AlertRule): LogEntry[] {
    let filteredLogs = logs;

    if (rule.filters) {
      if (rule.filters.domains) {
        filteredLogs = filteredLogs.filter(log =>
          rule.filters!.domains!.includes(log.domain)
        );
      }

      if (rule.filters.levels) {
        filteredLogs = filteredLogs.filter(log =>
          rule.filters!.levels!.includes(log.level)
        );
      }

      if (rule.filters.functionNames) {
        filteredLogs = filteredLogs.filter(log =>
          log.context?.functionName &&
          rule.filters!.functionNames!.includes(log.context.functionName)
        );
      }

      if (rule.filters.userIds) {
        filteredLogs = filteredLogs.filter(log =>
          log.context?.userId &&
          rule.filters!.userIds!.includes(log.context.userId)
        );
      }
    }

    return filteredLogs;
  }

  /**
   * Create an alert when a rule is triggered
   */
  private async createAlert(rule: AlertRule, condition: AlertCondition, relatedLogs: LogEntry[]): Promise<Alert> {
    const alertId = this.db.collection('alerts').doc().id;
    const now = Date.now();

    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `Alert: ${rule.name} - ${condition.type} threshold exceeded`,
      details: {
        condition,
        threshold: condition.threshold,
        timeWindow: condition.timeWindow,
        triggerTime: now
      },
      triggeredAt: now,
      status: 'active',
      relatedLogIds: relatedLogs.map(log => log.id),
      notificationsSent: []
    };

    // Store alert
    await this.db.collection('alerts').doc(alertId).set(alert);

    // Send notifications
    await this.sendAlertNotifications(alert, rule);

    this.logger.log(LogLevel.ERROR, 'Alert triggered', {
      domain: LogDomain.SYSTEM,
      event: 'ALERT_TRIGGERED',
      alertId,
      ruleId: rule.id,
      severity: rule.severity,
      conditionType: condition.type
    });

    return alert;
  }

  /**
   * Send notifications for an alert
   */
  private async sendAlertNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    for (const channel of rule.channels) {
      for (const recipient of rule.recipients) {
        try {
          // This would integrate with actual notification services
          await this.sendNotification(channel, recipient, alert);

          alert.notificationsSent.push({
            channel,
            recipient,
            sentAt: Date.now(),
            success: true
          });
        } catch (error) {
          alert.notificationsSent.push({
            channel,
            recipient,
            sentAt: Date.now(),
            success: false
          });

          this.logger.log(LogLevel.ERROR, 'Failed to send alert notification', {
            domain: LogDomain.SYSTEM,
            event: 'ALERT_NOTIFICATION_FAILED',
            alertId: alert.id,
            channel,
            recipient,
            error: {
              message: error instanceof Error ? error.message : 'Unknown error'
            }
          });
        }
      }
    }
  }

  /**
   * Send a single notification (placeholder implementation)
   */
  private async sendNotification(channel: AlertChannel, recipient: string, alert: Alert): Promise<void> {
    // This would integrate with actual notification services like:
    // - SendGrid for email
    // - Twilio for SMS
    // - Slack API for Slack
    // - Webhooks for custom integrations

    this.logger.log(LogLevel.INFO, 'Alert notification sent', {
      domain: LogDomain.SYSTEM,
      event: 'ALERT_NOTIFICATION_SENT',
      alertId: alert.id,
      channel,
      recipient: '[RECIPIENT_REDACTED]'
    });
  }

  /**
   * Update rule trigger information
   */
  private async updateRuleTriggerInfo(ruleId: string): Promise<void> {
    const ruleRef = this.db.collection('alert_rules').doc(ruleId);
    await ruleRef.update({
      lastTriggered: Date.now(),
      triggerCount: firestore.FieldValue.increment(1)
    });
  }
}