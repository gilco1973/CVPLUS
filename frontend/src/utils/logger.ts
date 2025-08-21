/**
 * Centralized logging utility for CVPlus frontend
 * Provides environment-aware logging with configurable levels
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class Logger {
  private isDevelopment: boolean;
  private logLevel: LogLevel;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  error(message: string, ...args: any[]) {
    if (this.logLevel >= LogLevel.ERROR) {
      console.error(`❌ [CVPlus] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.logLevel >= LogLevel.WARN) {
      console.warn(`⚠️ [CVPlus] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.logLevel >= LogLevel.INFO) {
      console.info(`ℹ️ [CVPlus] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]) {
    if (this.isDevelopment && this.logLevel >= LogLevel.DEBUG) {
      console.debug(`🔍 [CVPlus] ${message}`, ...args);
    }
  }

  // Component-specific loggers for better organization
  component(componentName: string) {
    return {
      error: (message: string, ...args: any[]) => this.error(`[${componentName}] ${message}`, ...args),
      warn: (message: string, ...args: any[]) => this.warn(`[${componentName}] ${message}`, ...args),
      info: (message: string, ...args: any[]) => this.info(`[${componentName}] ${message}`, ...args),
      debug: (message: string, ...args: any[]) => this.debug(`[${componentName}] ${message}`, ...args)
    };
  }

  // Service-specific loggers
  service(serviceName: string) {
    return {
      error: (message: string, ...args: any[]) => this.error(`[${serviceName}] ${message}`, ...args),
      warn: (message: string, ...args: any[]) => this.warn(`[${serviceName}] ${message}`, ...args),
      info: (message: string, ...args: any[]) => this.info(`[${serviceName}] ${message}`, ...args),
      debug: (message: string, ...args: any[]) => this.debug(`[${serviceName}] ${message}`, ...args)
    };
  }

  // Test-specific logger
  test(testName: string) {
    return {
      start: (message: string) => this.isDevelopment && console.log(`🧪 [TEST:${testName}] ${message}`),
      success: (message: string) => this.isDevelopment && console.log(`✅ [TEST:${testName}] ${message}`),
      error: (message: string, ...args: any[]) => console.error(`❌ [TEST:${testName}] ${message}`, ...args),
      info: (message: string) => this.isDevelopment && console.log(`📝 [TEST:${testName}] ${message}`)
    };
  }
}

export const logger = new Logger();
export default logger;