import * as fs from 'fs-extra';
import * as path from 'path';

export interface ErrorTrackingConfig {
  enabled: boolean;
  provider: 'sentry' | 'bugsnag' | 'rollbar' | 'custom';
  dsn?: string;
  apiKey?: string;
  environment: string;
  release?: string;
  tags: Record<string, string>;
  filters: {
    enabledLevels: ErrorLevel[];
    excludeRules: string[];
    includeModules: string[];
    excludeModules: string[];
  };
  reporting: {
    realTime: boolean;
    batchSize: number;
    flushInterval: number; // milliseconds
    retryAttempts: number;
  };
  integration: {
    sourceMap: boolean;
    breadcrumbs: boolean;
    userContext: boolean;
    performanceTracking: boolean;
  };
}

export type ErrorLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface ErrorEvent {
  id: string;
  timestamp: string;
  level: ErrorLevel;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string | number;
  };
  context: {
    module: string;
    rule?: string;
    file?: string;
    line?: number;
    column?: number;
    function?: string;
  };
  environment: {
    platform: string;
    nodeVersion: string;
    moduleVersion: string;
    validatorVersion: string;
  };
  user?: {
    id: string;
    email?: string;
    username?: string;
  };
  tags: Record<string, string>;
  extra: Record<string, any>;
  breadcrumbs: Breadcrumb[];
  fingerprint: string[];
}

export interface Breadcrumb {
  timestamp: string;
  category: string;
  message: string;
  level: ErrorLevel;
  data?: Record<string, any>;
}

export interface ErrorReport {
  id: string;
  timestamp: string;
  totalEvents: number;
  byLevel: Record<ErrorLevel, number>;
  byModule: Record<string, number>;
  byRule: Record<string, number>;
  trends: {
    period: string;
    eventChange: number;
    errorRate: number;
  };
  topErrors: ErrorSummary[];
  newErrors: ErrorSummary[];
  resolvedErrors: string[];
}

export interface ErrorSummary {
  fingerprint: string;
  message: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  level: ErrorLevel;
  modules: string[];
  resolved: boolean;
}

export class ErrorTracking {
  private config: ErrorTrackingConfig;
  private eventBuffer: ErrorEvent[] = [];
  private breadcrumbs: Breadcrumb[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: ErrorTrackingConfig) {
    this.config = config;

    if (this.config.enabled && this.config.reporting.realTime) {
      this.startFlushTimer();
    }
  }

  async captureError(error: Error, context: Partial<ErrorEvent['context']> = {}): Promise<string> {
    if (!this.config.enabled) {
      return '';
    }

    const event: ErrorEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      error: {
        name: error.name,
        message: error.message,
        ...(error.stack && { stack: error.stack }),
        ...((error as any).code && { code: (error as any).code })
      },
      context: {
        module: context.module || 'unknown',
        ...(context.rule && { rule: context.rule }),
        ...(context.file && { file: context.file }),
        ...(context.line !== undefined && { line: context.line }),
        ...(context.column !== undefined && { column: context.column }),
        ...(context.function && { function: context.function })
      },
      environment: {
        platform: process.platform,
        nodeVersion: process.version,
        moduleVersion: this.getModuleVersion(context.module),
        validatorVersion: '1.0.0'
      },
      tags: {
        ...this.config.tags,
        module: context.module || 'unknown',
        rule: context.rule || 'unknown'
      },
      extra: {},
      breadcrumbs: [...this.breadcrumbs],
      fingerprint: this.generateFingerprint(error, context)
    };

    await this.processEvent(event);
    return event.id;
  }

  async captureValidationError(
    ruleId: string,
    message: string,
    level: ErrorLevel,
    context: Partial<ErrorEvent['context']> = {},
    extra: Record<string, any> = {}
  ): Promise<string> {
    if (!this.config.enabled) {
      return '';
    }

    if (!this.config.filters.enabledLevels.includes(level)) {
      return '';
    }

    if (this.config.filters.excludeRules.includes(ruleId)) {
      return '';
    }

    const event: ErrorEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        module: context.module || 'unknown',
        rule: ruleId,
        ...(context.file && { file: context.file }),
        ...(context.line !== undefined && { line: context.line }),
        ...(context.column !== undefined && { column: context.column }),
        ...(context.function && { function: context.function })
      },
      environment: {
        platform: process.platform,
        nodeVersion: process.version,
        moduleVersion: this.getModuleVersion(context.module),
        validatorVersion: '1.0.0'
      },
      tags: {
        ...this.config.tags,
        module: context.module || 'unknown',
        rule: ruleId,
        level
      },
      extra,
      breadcrumbs: [...this.breadcrumbs],
      fingerprint: this.generateValidationFingerprint(ruleId, context)
    };

    await this.processEvent(event);
    return event.id;
  }

  addBreadcrumb(category: string, message: string, level: ErrorLevel = 'info', data?: Record<string, any>): void {
    if (!this.config.enabled || !this.config.integration.breadcrumbs) {
      return;
    }

    const breadcrumb: Breadcrumb = {
      timestamp: new Date().toISOString(),
      category,
      message,
      level,
      ...(data && { data })
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only last 100 breadcrumbs
    if (this.breadcrumbs.length > 100) {
      this.breadcrumbs = this.breadcrumbs.slice(-100);
    }
  }

  setUserContext(user: ErrorEvent['user']): void {
    if (!this.config.enabled || !this.config.integration.userContext) {
      return;
    }

    // Store user context for future events
    this.config.tags['userId'] = user?.id || '';
  }

  setTag(key: string, value: string): void {
    if (!this.config.enabled) {
      return;
    }

    this.config.tags[key] = value;
  }

  setExtra(_key: string, _value: any): void {
    if (!this.config.enabled) {
      return;
    }

    // Store extra data for future events
    // In a real implementation, this would be stored in context
  }

  async flush(): Promise<void> {
    if (!this.config.enabled || this.eventBuffer.length === 0) {
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      await this.sendEvents(events);
    } catch (error) {
      // If sending fails, put events back in buffer for retry
      this.eventBuffer.unshift(...events);
      throw error;
    }
  }

  async generateReport(timeRange: { start: Date; end: Date }): Promise<ErrorReport> {
    const events = await this.getEventsInRange(timeRange.start, timeRange.end);

    const byLevel: Record<ErrorLevel, number> = {
      debug: 0,
      info: 0,
      warning: 0,
      error: 0,
      critical: 0
    };

    const byModule: Record<string, number> = {};
    const byRule: Record<string, number> = {};
    const errorMap = new Map<string, ErrorSummary>();

    for (const event of events) {
      byLevel[event.level]++;

      const module = event.context.module;
      byModule[module] = (byModule[module] || 0) + 1;

      if (event.context.rule) {
        const rule = event.context.rule;
        byRule[rule] = (byRule[rule] || 0) + 1;
      }

      // Group by fingerprint
      const fingerprint = event.fingerprint.join('|');
      const existing = errorMap.get(fingerprint);

      if (existing) {
        existing.count++;
        existing.lastSeen = event.timestamp;
        if (!existing.modules.includes(module)) {
          existing.modules.push(module);
        }
      } else {
        errorMap.set(fingerprint, {
          fingerprint,
          message: event.message,
          count: 1,
          firstSeen: event.timestamp,
          lastSeen: event.timestamp,
          level: event.level,
          modules: [module],
          resolved: false
        });
      }
    }

    const topErrors = Array.from(errorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const newErrors = Array.from(errorMap.values())
      .filter(error => new Date(error.firstSeen) > new Date(Date.now() - 24 * 60 * 60 * 1000))
      .slice(0, 10);

    const totalEvents = events.length;
    const errorRate = totalEvents > 0 ? (byLevel.error + byLevel.critical) / totalEvents : 0;

    return {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      totalEvents,
      byLevel,
      byModule,
      byRule,
      trends: {
        period: '24h',
        eventChange: 0, // Would calculate from previous period
        errorRate
      },
      topErrors,
      newErrors,
      resolvedErrors: [] // Would come from error tracking service
    };
  }

  async getErrorStats(moduleId?: string): Promise<any> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const events = await this.getEventsInRange(yesterday, now);
    const filteredEvents = moduleId ? events.filter(e => e.context.module === moduleId) : events;

    const stats = {
      total: filteredEvents.length,
      byLevel: {
        debug: 0,
        info: 0,
        warning: 0,
        error: 0,
        critical: 0
      },
      errorRate: 0,
      topRules: {} as Record<string, number>,
      recentTrend: this.calculateTrend(filteredEvents)
    };

    for (const event of filteredEvents) {
      stats.byLevel[event.level]++;

      if (event.context.rule) {
        stats.topRules[event.context.rule] = (stats.topRules[event.context.rule] || 0) + 1;
      }
    }

    stats.errorRate = stats.total > 0 ? (stats.byLevel.error + stats.byLevel.critical) / stats.total : 0;

    return stats;
  }

  async resolveError(fingerprint: string): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Mark error as resolved in tracking service
    await this.markErrorResolved(fingerprint);
  }

  async createAlert(condition: {
    type: 'threshold' | 'spike' | 'new_error';
    rule?: string;
    module?: string;
    level?: ErrorLevel;
    threshold?: number;
    timeWindow?: number; // minutes
  }): Promise<string> {
    // Create alert rule in error tracking service
    const alertId = this.generateEventId();

    // In a real implementation, this would configure alerts in the service
    console.log(`Alert created: ${alertId}`, condition);

    return alertId;
  }

  private async processEvent(event: ErrorEvent): Promise<void> {
    // Apply filters
    if (this.shouldFilterEvent(event)) {
      return;
    }

    // Add to buffer
    this.eventBuffer.push(event);

    // Flush immediately if real-time or buffer is full
    if (this.config.reporting.realTime || this.eventBuffer.length >= this.config.reporting.batchSize) {
      await this.flush();
    }
  }

  private shouldFilterEvent(event: ErrorEvent): boolean {
    // Check level filter
    if (!this.config.filters.enabledLevels.includes(event.level)) {
      return true;
    }

    // Check rule exclusion
    if (event.context.rule && this.config.filters.excludeRules.includes(event.context.rule)) {
      return true;
    }

    // Check module inclusion/exclusion
    const module = event.context.module;
    if (this.config.filters.includeModules.length > 0 && !this.config.filters.includeModules.includes(module)) {
      return true;
    }

    if (this.config.filters.excludeModules.includes(module)) {
      return true;
    }

    return false;
  }

  private async sendEvents(events: ErrorEvent[]): Promise<void> {
    switch (this.config.provider) {
      case 'sentry':
        await this.sendToSentry(events);
        break;
      case 'bugsnag':
        await this.sendToBugsnag(events);
        break;
      case 'rollbar':
        await this.sendToRollbar(events);
        break;
      case 'custom':
        await this.sendToCustomEndpoint(events);
        break;
      default:
        throw new Error(`Unsupported error tracking provider: ${this.config.provider}`);
    }
  }

  private async sendToSentry(events: ErrorEvent[]): Promise<void> {
    // Sentry API integration
    const sentryEvents = events.map(event => ({
      event_id: event.id,
      timestamp: event.timestamp,
      level: event.level,
      message: event.message,
      exception: event.error ? {
        values: [{
          type: event.error.name,
          value: event.error.message,
          stacktrace: event.error.stack ? {
            frames: this.parseStackTrace(event.error.stack)
          } : undefined
        }]
      } : undefined,
      tags: event.tags,
      extra: event.extra,
      user: event.user,
      breadcrumbs: event.breadcrumbs.map(b => ({
        timestamp: b.timestamp,
        category: b.category,
        message: b.message,
        level: b.level,
        data: b.data
      })),
      contexts: {
        runtime: {
          name: 'node',
          version: event.environment.nodeVersion
        },
        app: {
          app_version: event.environment.validatorVersion
        }
      },
      fingerprint: event.fingerprint
    }));

    // Send to Sentry endpoint
    try {
      const response = await fetch(`https://sentry.io/api/0/projects/${this.config.dsn}/store/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${this.config.apiKey}, sentry_client=cvplus-validator/1.0.0`
        },
        body: JSON.stringify({ events: sentryEvents })
      });

      if (!response.ok) {
        throw new Error(`Sentry API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send events to Sentry:', error);
      throw error;
    }
  }

  private async sendToBugsnag(events: ErrorEvent[]): Promise<void> {
    // Bugsnag API integration
    for (const event of events) {
      const bugsnagEvent = {
        apiKey: this.config.apiKey,
        notifier: {
          name: 'CVPlus Validator',
          version: '1.0.0',
          url: 'https://github.com/cvplus/module-requirements'
        },
        events: [{
          exceptions: event.error ? [{
            errorClass: event.error.name,
            message: event.error.message,
            stacktrace: event.error.stack ? this.parseStackTrace(event.error.stack) : []
          }] : [],
          context: event.context.module,
          severity: event.level === 'critical' ? 'error' : event.level,
          metaData: {
            context: event.context,
            environment: event.environment,
            extra: event.extra
          },
          user: event.user,
          breadcrumbs: event.breadcrumbs
        }]
      };

      try {
        const response = await fetch('https://notify.bugsnag.com/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bugsnagEvent)
        });

        if (!response.ok) {
          throw new Error(`Bugsnag API error: ${response.status}`);
        }
      } catch (error) {
        console.error('Failed to send event to Bugsnag:', error);
        throw error;
      }
    }
  }

  private async sendToRollbar(events: ErrorEvent[]): Promise<void> {
    // Rollbar API integration
    for (const event of events) {
      const rollbarEvent = {
        access_token: this.config.apiKey,
        data: {
          environment: this.config.environment,
          level: event.level,
          timestamp: Math.floor(new Date(event.timestamp).getTime() / 1000),
          uuid: event.id,
          title: event.message,
          body: event.error ? {
            trace: {
              exception: {
                class: event.error.name,
                message: event.error.message,
                description: event.error.stack
              }
            }
          } : {
            message: {
              body: event.message
            }
          },
          custom: {
            context: event.context,
            environment: event.environment,
            extra: event.extra
          },
          person: event.user,
          fingerprint: event.fingerprint.join('|')
        }
      };

      try {
        const response = await fetch('https://api.rollbar.com/api/1/item/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(rollbarEvent)
        });

        if (!response.ok) {
          throw new Error(`Rollbar API error: ${response.status}`);
        }
      } catch (error) {
        console.error('Failed to send event to Rollbar:', error);
        throw error;
      }
    }
  }

  private async sendToCustomEndpoint(events: ErrorEvent[]): Promise<void> {
    // Custom endpoint integration
    if (!this.config.dsn) {
      throw new Error('Custom endpoint URL (dsn) not configured');
    }

    try {
      const response = await fetch(this.config.dsn, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({
          events,
          metadata: {
            environment: this.config.environment,
            release: this.config.release,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Custom endpoint error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send events to custom endpoint:', error);
      throw error;
    }
  }

  private async getEventsInRange(_start: Date, _end: Date): Promise<ErrorEvent[]> {
    // In a real implementation, this would query the error tracking service
    // For now, return simulated data
    return [];
  }

  private async markErrorResolved(fingerprint: string): Promise<void> {
    // Mark error as resolved in the tracking service
    console.log(`Marking error resolved: ${fingerprint}`);
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateFingerprint(error: Error, context: Partial<ErrorEvent['context']>): string[] {
    return [
      error.name,
      error.message.replace(/\d+/g, 'X'), // Replace numbers with X for grouping
      context.module || 'unknown',
      context.rule || 'unknown'
    ];
  }

  private generateValidationFingerprint(ruleId: string, context: Partial<ErrorEvent['context']>): string[] {
    return [
      'ValidationError',
      ruleId,
      context.module || 'unknown',
      context.file || 'unknown'
    ];
  }

  private getModuleVersion(moduleName?: string): string {
    if (!moduleName) {
      return 'unknown';
    }

    try {
      const packageJsonPath = path.join(process.cwd(), 'node_modules', moduleName || '', 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = fs.readJsonSync(packageJsonPath);
        return packageJson.version || 'unknown';
      }
    } catch (_error) {
      // Ignore errors
    }

    return 'unknown';
  }

  private parseStackTrace(stack: string): any[] {
    // Parse stack trace into frames
    const lines = stack.split('\n').slice(1); // Skip first line (error message)
    return lines.map(line => {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        return {
          filename: match[2],
          function: match[1],
          lineno: match[3] ? parseInt(match[3]) : 0,
          colno: match[4] ? parseInt(match[4]) : 0
        };
      }
      return { raw: line.trim() };
    });
  }

  private calculateTrend(events: ErrorEvent[]): string {
    // Calculate trend over time
    const now = Date.now();
    const hour = 60 * 60 * 1000;

    const recent = events.filter(e => new Date(e.timestamp).getTime() > now - hour).length;
    const previous = events.filter(e => {
      const time = new Date(e.timestamp).getTime();
      return time > now - 2 * hour && time <= now - hour;
    }).length;

    if (previous === 0) {
      return recent > 0 ? 'increasing' : 'stable';
    }

    const change = (recent - previous) / previous;
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      try {
        await this.flush();
      } catch (error) {
        console.error('Error during scheduled flush:', error);
      }
    }, this.config.reporting.flushInterval);
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined as any;
    }

    // Flush any remaining events
    if (this.eventBuffer.length > 0) {
      this.flush().catch(error => {
        console.error('Error during final flush:', error);
      });
    }
  }

  static async createDefaultConfig(provider: ErrorTrackingConfig['provider'], environment: string): Promise<ErrorTrackingConfig> {
    return {
      enabled: true,
      provider,
      environment,
      tags: {
        service: 'cvplus-validator',
        version: '1.0.0'
      },
      filters: {
        enabledLevels: ['warning', 'error', 'critical'],
        excludeRules: [],
        includeModules: [],
        excludeModules: []
      },
      reporting: {
        realTime: false,
        batchSize: 10,
        flushInterval: 30000, // 30 seconds
        retryAttempts: 3
      },
      integration: {
        sourceMap: true,
        breadcrumbs: true,
        userContext: false,
        performanceTracking: false
      }
    };
  }
}