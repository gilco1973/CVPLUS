/**
 * T041: Alert rule management service
 *
 * Manages alert rules, monitors log events, and triggers notifications
 * when specified conditions are met. Provides comprehensive alerting
 * capabilities for the CVPlus logging system.
 */

import {
  LoggerFactory,
  CorrelationService,
  AlertRule,
  AlertRuleManager,
  globalAlertManager,
  LogLevel,
  LogDomain,
  AlertConditionType,
  type Logger,
  type LogEntry
} from '@cvplus/logging';

export interface AlertRuleCreateRequest {
  name: string;
  description?: string;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  throttle?: AlertThrottle;
  tags?: string[];
}

export interface AlertCondition {
  type: AlertConditionType;
  field: string;
  operator: ComparisonOperator;
  value: string | number | boolean;
  timeWindow?: number; // minutes
  threshold?: number;
}

export interface AlertAction {
  type: AlertActionType;
  configuration: AlertActionConfig;
}

export interface AlertActionConfig {
  // Email action
  email?: {
    to: string[];
    cc?: string[];
    subject: string;
    template?: string;
  };
  // Webhook action
  webhook?: {
    url: string;
    method: 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    payload?: Record<string, any>;
  };
  // Slack action
  slack?: {
    channel: string;
    message: string;
    username?: string;
    iconEmoji?: string;
  };
  // SMS action
  sms?: {
    to: string[];
    message: string;
  };
}

export interface AlertThrottle {
  enabled: boolean;
  windowMinutes: number;
  maxAlertsPerWindow: number;
}

export enum ComparisonOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  GREATER_THAN_EQUAL = 'greater_than_equal',
  LESS_THAN = 'less_than',
  LESS_THAN_EQUAL = 'less_than_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  REGEX_MATCH = 'regex_match',
  IN = 'in',
  NOT_IN = 'not_in'
}

export enum AlertActionType {
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  SMS = 'sms',
  FIREBASE_NOTIFICATION = 'firebase_notification'
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  timestamp: Date;
  severity: AlertSeverity;
  triggerLog: LogEntry;
  matchedConditions: AlertCondition[];
  actionResults: AlertActionResult[];
}

export interface AlertActionResult {
  actionType: AlertActionType;
  success: boolean;
  error?: string;
  executedAt: Date;
  duration: number;
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export class AlertRuleService {
  private readonly logger: Logger;
  private readonly alertManager: AlertRuleManager;
  private readonly alertHistory: Map<string, AlertEvent[]> = new Map();
  private readonly throttleState: Map<string, number[]> = new Map(); // ruleId -> timestamps

  constructor() {
    this.logger = LoggerFactory.createLogger('@cvplus/alert-rules');
    this.alertManager = globalAlertManager;
  }

  /**
   * Create a new alert rule
   */
  async createAlertRule(request: AlertRuleCreateRequest): Promise<string> {
    const correlationId = CorrelationService.getCurrentCorrelationId();

    try {
      // Validate request
      this.validateAlertRuleRequest(request);

      // Create alert rule
      const ruleId = await this.alertManager.createRule({
        id: this.generateRuleId(),
        name: request.name,
        description: request.description || '',
        enabled: request.enabled,
        conditions: request.conditions.map(condition => ({
          type: condition.type,
          field: condition.field,
          operator: condition.operator,
          value: condition.value,
          timeWindow: condition.timeWindow || 5
        })),
        actions: this.convertActions(request.actions),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Initialize throttle state if needed
      if (request.throttle?.enabled) {
        this.throttleState.set(ruleId, []);
      }

      this.logger.info('Alert rule created', {
        event: 'alert.rule.created',
        ruleId,
        ruleName: request.name,
        correlationId
      });

      return ruleId;

    } catch (error) {
      this.logger.error('Failed to create alert rule', {
        event: 'alert.rule.create.failed',
        ruleName: request.name,
        correlationId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      throw error;
    }
  }

  /**
   * Update an existing alert rule
   */
  async updateAlertRule(ruleId: string, updates: Partial<AlertRuleCreateRequest>): Promise<void> {
    const correlationId = CorrelationService.getCurrentCorrelationId();

    try {
      const existingRule = await this.alertManager.getRule(ruleId);
      if (!existingRule) {
        throw new Error(`Alert rule not found: ${ruleId}`);
      }

      // Validate updates if provided
      if (updates) {
        this.validateAlertRuleRequest(updates as AlertRuleCreateRequest);
      }

      // Update rule
      await this.alertManager.updateRule(ruleId, {
        ...existingRule,
        ...updates,
        updatedAt: new Date()
      });

      this.logger.info('Alert rule updated', {
        event: 'alert.rule.updated',
        ruleId,
        correlationId
      });

    } catch (error) {
      this.logger.error('Failed to update alert rule', {
        event: 'alert.rule.update.failed',
        ruleId,
        correlationId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      throw error;
    }
  }

  /**
   * Delete an alert rule
   */
  async deleteAlertRule(ruleId: string): Promise<void> {
    const correlationId = CorrelationService.getCurrentCorrelationId();

    try {
      await this.alertManager.removeRule(ruleId);

      // Clean up throttle state
      this.throttleState.delete(ruleId);

      // Clean up alert history
      this.alertHistory.delete(ruleId);

      this.logger.info('Alert rule deleted', {
        event: 'alert.rule.deleted',
        ruleId,
        correlationId
      });

    } catch (error) {
      this.logger.error('Failed to delete alert rule', {
        event: 'alert.rule.delete.failed',
        ruleId,
        correlationId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      throw error;
    }
  }

  /**
   * Get alert rule by ID
   */
  async getAlertRule(ruleId: string): Promise<AlertRule | null> {
    try {
      return await this.alertManager.getRule(ruleId);
    } catch (error) {
      this.logger.error('Failed to get alert rule', {
        event: 'alert.rule.get.failed',
        ruleId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      return null;
    }
  }

  /**
   * List all alert rules
   */
  async listAlertRules(): Promise<AlertRule[]> {
    try {
      return await this.alertManager.listRules();
    } catch (error) {
      this.logger.error('Failed to list alert rules', {
        event: 'alert.rule.list.failed',
        error: {
          name: error.name,
          message: error.message
        }
      });
      return [];
    }
  }

  /**
   * Enable/disable alert rule
   */
  async toggleAlertRule(ruleId: string, enabled: boolean): Promise<void> {
    const correlationId = CorrelationService.getCurrentCorrelationId();

    try {
      const rule = await this.alertManager.getRule(ruleId);
      if (!rule) {
        throw new Error(`Alert rule not found: ${ruleId}`);
      }

      await this.alertManager.updateRule(ruleId, {
        ...rule,
        enabled,
        updatedAt: new Date()
      });

      this.logger.info('Alert rule toggled', {
        event: 'alert.rule.toggled',
        ruleId,
        enabled,
        correlationId
      });

    } catch (error) {
      this.logger.error('Failed to toggle alert rule', {
        event: 'alert.rule.toggle.failed',
        ruleId,
        enabled,
        correlationId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      throw error;
    }
  }

  /**
   * Process log entry and check for alert triggers
   */
  async processLogForAlerts(log: LogEntry): Promise<AlertEvent[]> {
    const correlationId = CorrelationService.getCurrentCorrelationId();
    const triggeredEvents: AlertEvent[] = [];

    try {
      const rules = await this.alertManager.listRules();
      const enabledRules = rules.filter(rule => rule.enabled);

      for (const rule of enabledRules) {
        try {
          const shouldTrigger = await this.evaluateRule(rule, log);

          if (shouldTrigger) {
            // Check throttle
            if (this.isThrottled(rule.id)) {
              this.logger.debug('Alert rule throttled', {
                event: 'alert.rule.throttled',
                ruleId: rule.id,
                ruleName: rule.name,
                correlationId
              });
              continue;
            }

            // Create alert event
            const alertEvent = await this.createAlertEvent(rule, log);
            triggeredEvents.push(alertEvent);

            // Execute actions
            await this.executeAlertActions(rule, alertEvent);

            // Update throttle state
            this.updateThrottleState(rule.id);

            // Store in history
            this.addToHistory(rule.id, alertEvent);

          }
        } catch (error) {
          this.logger.error('Error evaluating alert rule', {
            event: 'alert.rule.evaluation.error',
            ruleId: rule.id,
            correlationId,
            error: {
              name: error.name,
              message: error.message
            }
          });
        }
      }

      return triggeredEvents;

    } catch (error) {
      this.logger.error('Error processing log for alerts', {
        event: 'alert.log.processing.error',
        logId: log.id,
        correlationId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      return [];
    }
  }

  /**
   * Get alert history for a rule
   */
  getAlertHistory(ruleId: string, limit: number = 100): AlertEvent[] {
    const history = this.alertHistory.get(ruleId) || [];
    return history.slice(0, limit);
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(): {
    totalRules: number;
    enabledRules: number;
    totalAlerts: number;
    alertsByRule: Record<string, number>;
    alertsBySeverity: Record<AlertSeverity, number>;
  } {
    const statistics = {
      totalRules: 0,
      enabledRules: 0,
      totalAlerts: 0,
      alertsByRule: {} as Record<string, number>,
      alertsBySeverity: {} as Record<AlertSeverity, number>
    };

    // Initialize severity counts
    Object.values(AlertSeverity).forEach(severity => {
      statistics.alertsBySeverity[severity] = 0;
    });

    // Count alerts from history
    for (const [ruleId, events] of this.alertHistory.entries()) {
      statistics.alertsByRule[ruleId] = events.length;
      statistics.totalAlerts += events.length;

      events.forEach(event => {
        statistics.alertsBySeverity[event.severity]++;
      });
    }

    return statistics;
  }

  private validateAlertRuleRequest(request: AlertRuleCreateRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new Error('Alert rule name is required');
    }

    if (!request.conditions || request.conditions.length === 0) {
      throw new Error('At least one condition is required');
    }

    if (!request.actions || request.actions.length === 0) {
      throw new Error('At least one action is required');
    }

    // Validate conditions
    for (const condition of request.conditions) {
      if (!condition.field || !condition.operator || condition.value === undefined) {
        throw new Error('Condition must have field, operator, and value');
      }
    }

    // Validate actions
    for (const action of request.actions) {
      if (!action.type || !action.configuration) {
        throw new Error('Action must have type and configuration');
      }
    }
  }

  private async evaluateRule(rule: AlertRule, log: LogEntry): Promise<boolean> {
    // Check if any condition matches
    for (const condition of rule.conditions) {
      const matches = await this.evaluateCondition(condition, log);
      if (matches) {
        return true; // OR logic - any condition can trigger
      }
    }
    return false;
  }

  private async evaluateCondition(condition: any, log: LogEntry): Promise<boolean> {
    const fieldValue = this.getFieldValue(log, condition.field);

    if (fieldValue === undefined) {
      return false;
    }

    switch (condition.operator) {
      case ComparisonOperator.EQUALS:
        return fieldValue === condition.value;
      case ComparisonOperator.NOT_EQUALS:
        return fieldValue !== condition.value;
      case ComparisonOperator.GREATER_THAN:
        return Number(fieldValue) > Number(condition.value);
      case ComparisonOperator.GREATER_THAN_EQUAL:
        return Number(fieldValue) >= Number(condition.value);
      case ComparisonOperator.LESS_THAN:
        return Number(fieldValue) < Number(condition.value);
      case ComparisonOperator.LESS_THAN_EQUAL:
        return Number(fieldValue) <= Number(condition.value);
      case ComparisonOperator.CONTAINS:
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case ComparisonOperator.NOT_CONTAINS:
        return !String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case ComparisonOperator.REGEX_MATCH:
        const regex = new RegExp(String(condition.value), 'i');
        return regex.test(String(fieldValue));
      case ComparisonOperator.IN:
        const inValues = Array.isArray(condition.value) ? condition.value : [condition.value];
        return inValues.includes(fieldValue);
      case ComparisonOperator.NOT_IN:
        const notInValues = Array.isArray(condition.value) ? condition.value : [condition.value];
        return !notInValues.includes(fieldValue);
      default:
        return false;
    }
  }

  private getFieldValue(log: LogEntry, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value: any = log;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private async createAlertEvent(rule: AlertRule, log: LogEntry): Promise<AlertEvent> {
    const severity = this.determineSeverity(rule, log);

    return {
      id: this.generateEventId(),
      ruleId: rule.id,
      ruleName: rule.name,
      timestamp: new Date(),
      severity,
      triggerLog: log,
      matchedConditions: rule.conditions,
      actionResults: []
    };
  }

  private determineSeverity(rule: AlertRule, log: LogEntry): AlertSeverity {
    // Simple severity mapping based on log level
    switch (log.level) {
      case LogLevel.FATAL:
        return AlertSeverity.CRITICAL;
      case LogLevel.ERROR:
        return AlertSeverity.HIGH;
      case LogLevel.WARN:
        return AlertSeverity.MEDIUM;
      default:
        return AlertSeverity.LOW;
    }
  }

  private async executeAlertActions(rule: AlertRule, alertEvent: AlertEvent): Promise<void> {
    // In a real implementation, you would execute the actual actions
    // For now, we'll just log the action execution
    const correlationId = CorrelationService.getCurrentCorrelationId();

    this.logger.info('Alert actions executed', {
      event: 'alert.actions.executed',
      ruleId: rule.id,
      alertEventId: alertEvent.id,
      actionCount: rule.actions.length,
      correlationId
    });

    // Simulate action results
    alertEvent.actionResults = rule.actions.map(action => ({
      actionType: action.type as AlertActionType,
      success: true,
      executedAt: new Date(),
      duration: Math.random() * 1000 // Random duration for simulation
    }));
  }

  private isThrottled(ruleId: string): boolean {
    const timestamps = this.throttleState.get(ruleId);
    if (!timestamps) return false;

    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minutes default
    const maxAlerts = 10; // default limit

    // Remove old timestamps outside the window
    const recentTimestamps = timestamps.filter(ts => now - ts < windowMs);
    this.throttleState.set(ruleId, recentTimestamps);

    return recentTimestamps.length >= maxAlerts;
  }

  private updateThrottleState(ruleId: string): void {
    const timestamps = this.throttleState.get(ruleId) || [];
    timestamps.push(Date.now());
    this.throttleState.set(ruleId, timestamps);
  }

  private addToHistory(ruleId: string, alertEvent: AlertEvent): void {
    const history = this.alertHistory.get(ruleId) || [];
    history.unshift(alertEvent); // Add to beginning

    // Keep only last 1000 events per rule
    if (history.length > 1000) {
      history.splice(1000);
    }

    this.alertHistory.set(ruleId, history);
  }

  private convertActions(actions: AlertAction[]): any[] {
    // Convert actions to internal format
    return actions.map(action => ({
      type: action.type,
      configuration: action.configuration
    }));
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Global alert rule service instance
 */
export const globalAlertRuleService = new AlertRuleService();

export default AlertRuleService;