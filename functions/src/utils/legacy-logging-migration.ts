/**
 * T055: Legacy logging migration strategy in functions/src/utils/legacy-logging-migration.ts
 *
 * Migration utilities and strategies for transitioning from the legacy cvplus-logging.ts
 * system to the new @cvplus/logging package. Provides backward compatibility,
 * gradual migration path, and validation tools.
 */

import { LogLevel, LogDomain } from '@cvplus/logging';
import { logger } from '@cvplus/logging/backend';
import { FunctionLogger } from '@cvplus/logging/backend/specialized/FunctionLogger';

// Legacy logging interface for backward compatibility
interface LegacyLogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  timestamp: Date;
  component?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  error?: Error;
}

// Migration configuration
interface MigrationConfig {
  enabled: boolean;
  mode: 'dual' | 'new-only' | 'legacy-only';
  deprecationWarnings: boolean;
  validationEnabled: boolean;
  fallbackToLegacy: boolean;
  migrationMetrics: boolean;
}

// Migration statistics
interface MigrationStats {
  totalCalls: number;
  legacyCalls: number;
  newCalls: number;
  dualCalls: number;
  errors: number;
  warnings: number;
  startTime: Date;
  components: Set<string>;
  levels: Record<string, number>;
}

const DEFAULT_MIGRATION_CONFIG: MigrationConfig = {
  enabled: true,
  mode: 'dual',
  deprecationWarnings: true,
  validationEnabled: true,
  fallbackToLegacy: false,
  migrationMetrics: true
};

class LegacyLoggingMigrator {
  private config: MigrationConfig;
  private stats: MigrationStats;
  private legacyLogger: any; // Original cvplus-logging instance
  private newLogger: FunctionLogger;
  private componentLoggers: Map<string, FunctionLogger> = new Map();

  constructor(config: Partial<MigrationConfig> = {}) {
    this.config = { ...DEFAULT_MIGRATION_CONFIG, ...config };
    this.stats = {
      totalCalls: 0,
      legacyCalls: 0,
      newCalls: 0,
      dualCalls: 0,
      errors: 0,
      warnings: 0,
      startTime: new Date(),
      components: new Set(),
      levels: {}
    };

    this.newLogger = new FunctionLogger('legacy-migration');

    // Initialize legacy logger if needed
    this.initializeLegacyLogger();

    // Log migration initialization
    this.newLogger.logInfo('Legacy logging migration initialized', {
      event: 'MIGRATION_INIT',
      config: this.config,
      timestamp: new Date().toISOString()
    });
  }

  private initializeLegacyLogger(): void {
    try {
      // Try to require the legacy logging module
      const legacyLoggingPath = './cvplus-logging';
      delete require.cache[require.resolve(legacyLoggingPath)];
      this.legacyLogger = require(legacyLoggingPath);
    } catch (error) {
      console.warn('Legacy logging module not found:', error);
      this.legacyLogger = null;
    }
  }

  /**
   * Get or create a component-specific logger
   */
  getComponentLogger(component: string): FunctionLogger {
    if (!this.componentLoggers.has(component)) {
      this.componentLoggers.set(component, new FunctionLogger(`migration-${component}`));
    }
    return this.componentLoggers.get(component)!;
  }

  /**
   * Map legacy log level to new LogLevel enum
   */
  private mapLogLevel(legacyLevel: string): LogLevel {
    const levelMap: Record<string, LogLevel> = {
      'debug': LogLevel.DEBUG,
      'info': LogLevel.INFO,
      'warn': LogLevel.WARN,
      'error': LogLevel.ERROR,
      'fatal': LogLevel.FATAL
    };

    return levelMap[legacyLevel.toLowerCase()] || LogLevel.INFO;
  }

  /**
   * Determine appropriate domain based on component or context
   */
  private determineDomain(component?: string, metadata?: Record<string, any>): LogDomain {
    if (!component && !metadata) return LogDomain.SYSTEM;

    const componentLower = component?.toLowerCase() || '';

    // Map component names to domains
    if (componentLower.includes('auth') || componentLower.includes('login')) {
      return LogDomain.AUTHENTICATION;
    }
    if (componentLower.includes('cv') || componentLower.includes('process')) {
      return LogDomain.BUSINESS_LOGIC;
    }
    if (componentLower.includes('multimedia') || componentLower.includes('video') || componentLower.includes('audio')) {
      return LogDomain.INTEGRATION;
    }
    if (componentLower.includes('analytics') || componentLower.includes('track')) {
      return LogDomain.ANALYTICS;
    }
    if (componentLower.includes('premium') || componentLower.includes('payment')) {
      return LogDomain.BUSINESS_LOGIC;
    }
    if (componentLower.includes('api') || componentLower.includes('endpoint')) {
      return LogDomain.API;
    }
    if (componentLower.includes('security') || componentLower.includes('threat')) {
      return LogDomain.SECURITY;
    }

    // Check metadata for domain hints
    if (metadata?.domain) {
      return metadata.domain as LogDomain;
    }

    return LogDomain.SYSTEM;
  }

  /**
   * Migrate a legacy log entry to the new logging system
   */
  async migrateLegacyLog(legacyEntry: LegacyLogEntry): Promise<void> {
    this.updateStats('total');

    if (!this.config.enabled) {
      await this.handleLegacyOnly(legacyEntry);
      return;
    }

    try {
      const newLevel = this.mapLogLevel(legacyEntry.level);
      const domain = this.determineDomain(legacyEntry.component, legacyEntry.metadata);
      const componentLogger = legacyEntry.component
        ? this.getComponentLogger(legacyEntry.component)
        : this.newLogger;

      const context = {
        ...legacyEntry.metadata,
        userId: legacyEntry.userId,
        sessionId: legacyEntry.sessionId,
        event: 'LEGACY_LOG_MIGRATION',
        originalLevel: legacyEntry.level,
        migrationMode: this.config.mode,
        timestamp: legacyEntry.timestamp.toISOString()
      };

      switch (this.config.mode) {
        case 'new-only':
          await this.handleNewOnly(componentLogger, newLevel, legacyEntry.message, context, legacyEntry.error);
          break;

        case 'legacy-only':
          await this.handleLegacyOnly(legacyEntry);
          break;

        case 'dual':
        default:
          await this.handleDualMode(componentLogger, newLevel, legacyEntry, context);
          break;
      }

      // Track component usage
      if (legacyEntry.component) {
        this.stats.components.add(legacyEntry.component);
      }

    } catch (error) {
      this.handleMigrationError(error, legacyEntry);
    }
  }

  private async handleNewOnly(
    componentLogger: FunctionLogger,
    level: LogLevel,
    message: string,
    context: any,
    error?: Error
  ): Promise<void> {
    this.updateStats('new');

    if (error) {
      componentLogger.logError(message, error, { domain: this.determineDomain(), ...context });
    } else {
      switch (level) {
        case LogLevel.DEBUG:
          componentLogger.logDebug(message, context);
          break;
        case LogLevel.INFO:
          componentLogger.logInfo(message, context);
          break;
        case LogLevel.WARN:
          componentLogger.logWarn(message, context);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          componentLogger.logError(message, new Error(message), { domain: this.determineDomain(), ...context });
          break;
      }
    }

    if (this.config.deprecationWarnings) {
      this.logDeprecationWarning(context.component || 'unknown');
    }
  }

  private async handleLegacyOnly(legacyEntry: LegacyLogEntry): Promise<void> {
    this.updateStats('legacy');

    if (this.legacyLogger) {
      // Use legacy logging system
      try {
        this.legacyLogger.log(legacyEntry.level, legacyEntry.message, {
          ...legacyEntry.metadata,
          userId: legacyEntry.userId,
          sessionId: legacyEntry.sessionId,
          component: legacyEntry.component,
          error: legacyEntry.error
        });
      } catch (error) {
        console.error('Legacy logging failed:', error);
        // Fallback to console
        console.log(`[LEGACY-${legacyEntry.level.toUpperCase()}]`, legacyEntry.message, legacyEntry.metadata);
      }
    } else {
      // Fallback to console logging
      console.log(`[LEGACY-${legacyEntry.level.toUpperCase()}]`, legacyEntry.message, legacyEntry.metadata);
    }
  }

  private async handleDualMode(
    componentLogger: FunctionLogger,
    level: LogLevel,
    legacyEntry: LegacyLogEntry,
    context: any
  ): Promise<void> {
    this.updateStats('dual');

    // Log to both systems
    const promises: Promise<void>[] = [
      this.handleNewOnly(componentLogger, level, legacyEntry.message, context, legacyEntry.error),
      this.handleLegacyOnly(legacyEntry)
    ];

    try {
      await Promise.all(promises);
    } catch (error) {
      // If new system fails and fallback is enabled, ensure legacy works
      if (this.config.fallbackToLegacy) {
        await this.handleLegacyOnly(legacyEntry);
      } else {
        throw error;
      }
    }
  }

  private handleMigrationError(error: any, legacyEntry: LegacyLogEntry): void {
    this.updateStats('error');

    console.error('Migration error for log entry:', {
      error: error.message,
      entry: {
        level: legacyEntry.level,
        message: legacyEntry.message,
        component: legacyEntry.component
      }
    });

    // Try to log error to new system
    try {
      this.newLogger.logError('Legacy log migration failed', error, {
        event: 'MIGRATION_ERROR',
        originalEntry: {
          level: legacyEntry.level,
          message: legacyEntry.message,
          component: legacyEntry.component
        }
      });
    } catch (secondaryError) {
      console.error('Failed to log migration error:', secondaryError);
    }

    // Fallback to legacy if configured
    if (this.config.fallbackToLegacy) {
      this.handleLegacyOnly(legacyEntry);
    }
  }

  private logDeprecationWarning(component: string): void {
    const warningKey = `deprecation_${component}`;

    // Rate limit warnings (once per component per hour)
    const now = Date.now();
    const lastWarning = (this as any)[warningKey] || 0;

    if (now - lastWarning > 3600000) { // 1 hour
      this.newLogger.logWarn(
        `Legacy logging detected in component: ${component}`,
        {
          event: 'DEPRECATION_WARNING',
          component,
          message: 'Please migrate to @cvplus/logging package',
          migrationGuide: 'https://docs.cvplus.com/logging-migration',
          timestamp: new Date().toISOString()
        }
      );

      (this as any)[warningKey] = now;
    }
  }

  private updateStats(type: 'total' | 'legacy' | 'new' | 'dual' | 'error' | 'warning'): void {
    if (!this.config.migrationMetrics) return;

    switch (type) {
      case 'total':
        this.stats.totalCalls++;
        break;
      case 'legacy':
        this.stats.legacyCalls++;
        break;
      case 'new':
        this.stats.newCalls++;
        break;
      case 'dual':
        this.stats.dualCalls++;
        break;
      case 'error':
        this.stats.errors++;
        break;
      case 'warning':
        this.stats.warnings++;
        break;
    }
  }

  /**
   * Get migration statistics
   */
  getStats(): MigrationStats & {
    uptime: number;
    migrationRate: number;
    errorRate: number;
  } {
    const uptime = Date.now() - this.stats.startTime.getTime();
    const migrationRate = this.stats.totalCalls > 0
      ? (this.stats.newCalls + this.stats.dualCalls) / this.stats.totalCalls * 100
      : 0;
    const errorRate = this.stats.totalCalls > 0
      ? this.stats.errors / this.stats.totalCalls * 100
      : 0;

    return {
      ...this.stats,
      uptime,
      migrationRate,
      errorRate
    };
  }

  /**
   * Generate migration report
   */
  generateMigrationReport(): string {
    const stats = this.getStats();
    const uptimeHours = Math.floor(stats.uptime / (1000 * 60 * 60));
    const uptimeMinutes = Math.floor((stats.uptime % (1000 * 60 * 60)) / (1000 * 60));

    return `
# Legacy Logging Migration Report

## Configuration
- Mode: ${this.config.mode}
- Migration Enabled: ${this.config.enabled}
- Deprecation Warnings: ${this.config.deprecationWarnings}
- Fallback to Legacy: ${this.config.fallbackToLegacy}

## Statistics (Uptime: ${uptimeHours}h ${uptimeMinutes}m)
- Total Log Calls: ${stats.totalCalls.toLocaleString()}
- Legacy Calls: ${stats.legacyCalls.toLocaleString()} (${((stats.legacyCalls / stats.totalCalls) * 100).toFixed(1)}%)
- New System Calls: ${stats.newCalls.toLocaleString()} (${((stats.newCalls / stats.totalCalls) * 100).toFixed(1)}%)
- Dual Mode Calls: ${stats.dualCalls.toLocaleString()} (${((stats.dualCalls / stats.totalCalls) * 100).toFixed(1)}%)
- Migration Rate: ${stats.migrationRate.toFixed(1)}%
- Error Rate: ${stats.errorRate.toFixed(2)}%

## Components Using Legacy Logging
${Array.from(stats.components).map(c => `- ${c}`).join('\n')}

## Recommendations
${this.generateRecommendations(stats)}
    `.trim();
  }

  private generateRecommendations(stats: any): string {
    const recommendations: string[] = [];

    if (stats.migrationRate < 50) {
      recommendations.push('- Consider increasing migration to new logging system');
    }

    if (stats.errorRate > 1) {
      recommendations.push('- Investigate migration errors and consider enabling fallback');
    }

    if (stats.components.size > 10) {
      recommendations.push('- Plan phased migration approach for large number of components');
    }

    if (this.config.mode === 'dual') {
      recommendations.push('- Consider switching to new-only mode after validation');
    }

    if (recommendations.length === 0) {
      recommendations.push('- Migration is performing well, continue monitoring');
    }

    return recommendations.join('\n');
  }

  /**
   * Update migration configuration
   */
  updateConfig(newConfig: Partial<MigrationConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    this.newLogger.logInfo('Migration configuration updated', {
      event: 'MIGRATION_CONFIG_UPDATE',
      oldConfig,
      newConfig: this.config,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Export migration data for analysis
   */
  exportMigrationData(): any {
    return {
      config: this.config,
      stats: this.getStats(),
      report: this.generateMigrationReport(),
      timestamp: new Date().toISOString()
    };
  }
}

// Global migrator instance
let globalMigrator: LegacyLoggingMigrator | null = null;

/**
 * Initialize the global migration system
 */
export function initializeMigration(config?: Partial<MigrationConfig>): LegacyLoggingMigrator {
  if (!globalMigrator) {
    globalMigrator = new LegacyLoggingMigrator(config);
  }
  return globalMigrator;
}

/**
 * Get the global migrator instance
 */
export function getMigrator(): LegacyLoggingMigrator | null {
  return globalMigrator;
}

/**
 * Legacy logging compatibility wrapper
 * This function provides backward compatibility with the old cvplus-logging interface
 */
export async function legacyLog(
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal',
  message: string,
  options: {
    component?: string;
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
    error?: Error;
  } = {}
): Promise<void> {
  const migrator = getMigrator();

  if (!migrator) {
    // Fallback to console if migration not initialized
    console.log(`[${level.toUpperCase()}]`, message, options);
    return;
  }

  const legacyEntry: LegacyLogEntry = {
    level,
    message,
    timestamp: new Date(),
    component: options.component,
    userId: options.userId,
    sessionId: options.sessionId,
    metadata: options.metadata,
    error: options.error
  };

  await migrator.migrateLegacyLog(legacyEntry);
}

/**
 * Validation utility to check if legacy logging is still being used
 */
export function validateMigrationProgress(): {
  isComplete: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const migrator = getMigrator();

  if (!migrator) {
    return {
      isComplete: false,
      warnings: ['Migration system not initialized'],
      recommendations: ['Initialize migration system with initializeMigration()']
    };
  }

  const stats = migrator.getStats();
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (stats.legacyCalls > 0) {
    warnings.push(`${stats.legacyCalls} legacy logging calls detected`);
    recommendations.push('Update remaining components to use @cvplus/logging');
  }

  if (stats.errorRate > 5) {
    warnings.push(`High error rate: ${stats.errorRate.toFixed(2)}%`);
    recommendations.push('Investigate and fix migration errors');
  }

  const isComplete = stats.legacyCalls === 0 && stats.errorRate < 1;

  if (isComplete) {
    recommendations.push('Migration complete - consider disabling legacy support');
  }

  return {
    isComplete,
    warnings,
    recommendations
  };
}

export { LegacyLoggingMigrator, MigrationConfig, MigrationStats };