/**
 * T040: Log aggregation service in functions/src/services/LogAggregationService.ts
 *
 * Service for aggregating, processing, and analyzing logs from across the CVPlus ecosystem.
 * Handles log collection from multiple sources, real-time processing, and metric generation.
 */

import { LoggerFactory, LogLevel, LogDomain, LogEntry } from '@cvplus/logging/backend';
import { firestore } from 'firebase-admin';

/**
 * Log aggregation configuration
 */
export interface AggregationConfig {
  batchSize: number;
  flushInterval: number; // milliseconds
  retentionDays: number;
  enableRealTimeProcessing: boolean;
  enableMetricGeneration: boolean;
  alertThresholds: {
    errorRate: number;
    performanceThreshold: number;
    securityEventThreshold: number;
  };
}

/**
 * Aggregated log metrics
 */
export interface LogMetrics {
  timestamp: number;
  timeWindow: string; // e.g., '1h', '24h'
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  errorRate: number;
  averageResponseTime: number;
  slowRequestCount: number;
  securityEventCount: number;
  topErrors: Array<{
    message: string;
    count: number;
    lastOccurrence: number;
  }>;
  performanceMetrics: {
    p50: number;
    p95: number;
    p99: number;
  };
  domainBreakdown: Record<LogDomain, number>;
}

/**
 * Log aggregation query parameters
 */
export interface AggregationQuery {
  startTime: number;
  endTime: number;
  domain?: LogDomain;
  level?: LogLevel;
  userId?: string;
  functionName?: string;
  correlationId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Log aggregation service for processing and analyzing logs
 */
export class LogAggregationService {
  private logger = LoggerFactory.createLogger('log-aggregation-service');
  private db = firestore();
  private config: AggregationConfig;
  private logBuffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: Partial<AggregationConfig> = {}) {
    this.config = {
      batchSize: 100,
      flushInterval: 5000, // 5 seconds
      retentionDays: 30,
      enableRealTimeProcessing: true,
      enableMetricGeneration: true,
      alertThresholds: {
        errorRate: 0.05, // 5% error rate threshold
        performanceThreshold: 2000, // 2 second response time
        securityEventThreshold: 10 // 10 security events per hour
      },
      ...config
    };

    this.startPeriodicFlush();
  }

  /**
   * Aggregate logs from a specific time range
   */
  async aggregateLogs(query: AggregationQuery): Promise<LogEntry[]> {
    try {
      this.logger.log(LogLevel.INFO, 'Starting log aggregation', {
        domain: LogDomain.SYSTEM,
        event: 'LOG_AGGREGATION_STARTED',
        query
      });

      let firestoreQuery = this.db.collection('logs')
        .where('timestamp', '>=', query.startTime)
        .where('timestamp', '<=', query.endTime);

      // Apply additional filters
      if (query.domain) {
        firestoreQuery = firestoreQuery.where('domain', '==', query.domain);
      }
      if (query.level) {
        firestoreQuery = firestoreQuery.where('level', '==', query.level);
      }
      if (query.userId) {
        firestoreQuery = firestoreQuery.where('context.userId', '==', query.userId);
      }
      if (query.functionName) {
        firestoreQuery = firestoreQuery.where('context.functionName', '==', query.functionName);
      }

      // Apply limit and ordering
      firestoreQuery = firestoreQuery.orderBy('timestamp', 'desc');
      if (query.limit) {
        firestoreQuery = firestoreQuery.limit(query.limit);
      }

      const snapshot = await firestoreQuery.get();
      const logs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as LogEntry));

      this.logger.log(LogLevel.INFO, 'Log aggregation completed', {
        domain: LogDomain.PERFORMANCE,
        event: 'LOG_AGGREGATION_COMPLETED',
        resultCount: logs.length,
        executionTime: Date.now() - query.startTime
      });

      return logs;
    } catch (error) {
      this.logger.log(LogLevel.ERROR, 'Log aggregation failed', {
        domain: LogDomain.SYSTEM,
        event: 'LOG_AGGREGATION_FAILED',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  /**
   * Generate metrics from aggregated logs
   */
  async generateMetrics(timeWindow: string, query: Partial<AggregationQuery> = {}): Promise<LogMetrics> {
    const endTime = Date.now();
    const startTime = this.getStartTimeForWindow(timeWindow, endTime);

    const logs = await this.aggregateLogs({
      startTime,
      endTime,
      ...query
    });

    const metrics: LogMetrics = {
      timestamp: endTime,
      timeWindow,
      totalLogs: logs.length,
      errorCount: 0,
      warningCount: 0,
      errorRate: 0,
      averageResponseTime: 0,
      slowRequestCount: 0,
      securityEventCount: 0,
      topErrors: [],
      performanceMetrics: { p50: 0, p95: 0, p99: 0 },
      domainBreakdown: {
        [LogDomain.SYSTEM]: 0,
        [LogDomain.BUSINESS]: 0,
        [LogDomain.SECURITY]: 0,
        [LogDomain.PERFORMANCE]: 0,
        [LogDomain.AUDIT]: 0
      }
    };

    // Calculate metrics from logs
    const responseTimes: number[] = [];
    const errorMessages: Map<string, number> = new Map();

    for (const log of logs) {
      // Count by level
      if (log.level === LogLevel.ERROR) metrics.errorCount++;
      if (log.level === LogLevel.WARN) metrics.warningCount++;

      // Count by domain
      metrics.domainBreakdown[log.domain]++;

      // Security events
      if (log.domain === LogDomain.SECURITY) {
        metrics.securityEventCount++;
      }

      // Performance metrics
      if (log.context?.performance?.duration) {
        const duration = log.context.performance.duration;
        responseTimes.push(duration);
        if (duration > this.config.alertThresholds.performanceThreshold) {
          metrics.slowRequestCount++;
        }
      }

      // Error tracking
      if (log.level === LogLevel.ERROR && log.message) {
        const count = errorMessages.get(log.message) || 0;
        errorMessages.set(log.message, count + 1);
      }
    }

    // Calculate derived metrics
    metrics.errorRate = metrics.totalLogs > 0 ? metrics.errorCount / metrics.totalLogs : 0;

    if (responseTimes.length > 0) {
      responseTimes.sort((a, b) => a - b);
      metrics.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      metrics.performanceMetrics.p50 = this.percentile(responseTimes, 0.5);
      metrics.performanceMetrics.p95 = this.percentile(responseTimes, 0.95);
      metrics.performanceMetrics.p99 = this.percentile(responseTimes, 0.99);
    }

    // Top errors
    metrics.topErrors = Array.from(errorMessages.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([message, count]) => ({
        message,
        count,
        lastOccurrence: endTime // Approximate
      }));

    // Store metrics
    if (this.config.enableMetricGeneration) {
      await this.storeMetrics(metrics);
    }

    // Check alert thresholds
    await this.checkAlertThresholds(metrics);

    return metrics;
  }

  /**
   * Add logs to buffer for batch processing
   */
  bufferLog(logEntry: LogEntry): void {
    this.logBuffer.push(logEntry);

    if (this.logBuffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Process logs in real-time
   */
  async processLogInRealTime(logEntry: LogEntry): Promise<void> {
    if (!this.config.enableRealTimeProcessing) return;

    try {
      // Check for immediate alerts
      if (logEntry.level === LogLevel.ERROR && logEntry.domain === LogDomain.SECURITY) {
        await this.triggerSecurityAlert(logEntry);
      }

      // Track performance issues
      if (logEntry.context?.performance?.duration) {
        const duration = logEntry.context.performance.duration;
        if (duration > this.config.alertThresholds.performanceThreshold) {
          await this.triggerPerformanceAlert(logEntry);
        }
      }

      this.logger.log(LogLevel.DEBUG, 'Real-time log processing completed', {
        domain: LogDomain.SYSTEM,
        event: 'REALTIME_PROCESSING_COMPLETED',
        logId: logEntry.id,
        logLevel: logEntry.level
      });
    } catch (error) {
      this.logger.log(LogLevel.ERROR, 'Real-time processing failed', {
        domain: LogDomain.SYSTEM,
        event: 'REALTIME_PROCESSING_FAILED',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Flush buffered logs to storage
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const batch = this.db.batch();
    const currentBuffer = [...this.logBuffer];
    this.logBuffer = [];

    try {
      for (const logEntry of currentBuffer) {
        const docRef = this.db.collection('logs').doc();
        batch.set(docRef, {
          ...logEntry,
          storedAt: Date.now()
        });
      }

      await batch.commit();

      this.logger.log(LogLevel.DEBUG, 'Log batch flushed successfully', {
        domain: LogDomain.SYSTEM,
        event: 'LOG_BATCH_FLUSHED',
        batchSize: currentBuffer.length
      });
    } catch (error) {
      // Re-add logs to buffer on failure
      this.logBuffer.unshift(...currentBuffer);

      this.logger.log(LogLevel.ERROR, 'Log batch flush failed', {
        domain: LogDomain.SYSTEM,
        event: 'LOG_BATCH_FLUSH_FAILED',
        batchSize: currentBuffer.length,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Start periodic flush timer
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Store metrics in Firestore
   */
  private async storeMetrics(metrics: LogMetrics): Promise<void> {
    try {
      await this.db.collection('log_metrics').add({
        ...metrics,
        createdAt: Date.now()
      });
    } catch (error) {
      this.logger.log(LogLevel.ERROR, 'Failed to store metrics', {
        domain: LogDomain.SYSTEM,
        event: 'METRICS_STORAGE_FAILED',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Check alert thresholds and trigger alerts
   */
  private async checkAlertThresholds(metrics: LogMetrics): Promise<void> {
    // Error rate alert
    if (metrics.errorRate > this.config.alertThresholds.errorRate) {
      await this.triggerErrorRateAlert(metrics);
    }

    // Security event alert
    if (metrics.securityEventCount > this.config.alertThresholds.securityEventThreshold) {
      await this.triggerSecurityThresholdAlert(metrics);
    }
  }

  /**
   * Trigger security alert
   */
  private async triggerSecurityAlert(logEntry: LogEntry): Promise<void> {
    this.logger.log(LogLevel.ERROR, 'Security alert triggered', {
      domain: LogDomain.SECURITY,
      event: 'SECURITY_ALERT_TRIGGERED',
      logId: logEntry.id,
      severity: 'high'
    });
  }

  /**
   * Trigger performance alert
   */
  private async triggerPerformanceAlert(logEntry: LogEntry): Promise<void> {
    this.logger.log(LogLevel.WARN, 'Performance alert triggered', {
      domain: LogDomain.PERFORMANCE,
      event: 'PERFORMANCE_ALERT_TRIGGERED',
      logId: logEntry.id,
      duration: logEntry.context?.performance?.duration
    });
  }

  /**
   * Trigger error rate alert
   */
  private async triggerErrorRateAlert(metrics: LogMetrics): Promise<void> {
    this.logger.log(LogLevel.ERROR, 'Error rate threshold exceeded', {
      domain: LogDomain.SYSTEM,
      event: 'ERROR_RATE_ALERT',
      errorRate: metrics.errorRate,
      threshold: this.config.alertThresholds.errorRate,
      timeWindow: metrics.timeWindow
    });
  }

  /**
   * Trigger security threshold alert
   */
  private async triggerSecurityThresholdAlert(metrics: LogMetrics): Promise<void> {
    this.logger.log(LogLevel.ERROR, 'Security event threshold exceeded', {
      domain: LogDomain.SECURITY,
      event: 'SECURITY_THRESHOLD_ALERT',
      securityEventCount: metrics.securityEventCount,
      threshold: this.config.alertThresholds.securityEventThreshold,
      timeWindow: metrics.timeWindow
    });
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[index] || 0;
  }

  /**
   * Get start time for time window
   */
  private getStartTimeForWindow(window: string, endTime: number): number {
    const now = endTime;
    switch (window) {
      case '1h': return now - (60 * 60 * 1000);
      case '24h': return now - (24 * 60 * 60 * 1000);
      case '7d': return now - (7 * 24 * 60 * 60 * 1000);
      case '30d': return now - (30 * 24 * 60 * 60 * 1000);
      default: return now - (60 * 60 * 1000); // Default to 1 hour
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(); // Final flush
  }
}