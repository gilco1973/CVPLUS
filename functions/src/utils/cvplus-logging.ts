/**
 * CVPlus Logging Utility
 * Centralized logging system for the CVPlus application
 */

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  metadata?: Record<string, any>;
  error?: Error;
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export class Logger {
  private context: string;
  private static instances: Map<string, Logger> = new Map();

  constructor(context: string) {
    this.context = context;
  }

  static getLogger(context: string): Logger {
    if (!this.instances.has(context)) {
      this.instances.set(context, new Logger(context));
    }
    return this.instances.get(context)!;
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, metadata, error);
  }

  critical(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.CRITICAL, message, metadata, error);
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: Error): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: this.context,
      metadata,
      error
    };

    // Output to console for now
    const levelName = LogLevel[level];
    const timestamp = entry.timestamp.toISOString();
    const contextStr = this.context ? `[${this.context}]` : '';

    console.log(`${timestamp} ${levelName} ${contextStr} ${message}`);

    if (metadata) {
      console.log('Metadata:', metadata);
    }

    if (error) {
      console.error('Error:', error);
    }
  }
}

// Export compatibility layer for @cvplus/logging
export const createLogger = Logger.getLogger;
export default Logger;