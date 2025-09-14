/**
 * T039: Logging middleware for Express functions in functions/src/middleware/logging.ts
 *
 * Firebase Functions logging middleware that automatically logs function invocations,
 * completions, failures, and performance metrics using the CVPlus logging system.
 */

import { Request, Response, NextFunction } from 'express';
import { FunctionLogger, CorrelationService, generateCorrelationId } from '@cvplus/logging/backend';
import { AuthRequest } from './auth.middleware';

/**
 * Enhanced request interface with logging context
 */
export interface LoggingRequest extends AuthRequest {
  correlationId?: string;
  startTime?: number;
  functionName?: string;
  logger?: FunctionLogger;
}

/**
 * Logging middleware configuration options
 */
export interface LoggingMiddlewareConfig {
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  logHeaders?: boolean;
  excludeHeaders?: string[];
  performanceThreshold?: number;
  timeoutWarningThreshold?: number;
}

/**
 * Default logging configuration
 */
const DEFAULT_CONFIG: LoggingMiddlewareConfig = {
  logRequestBody: true,
  logResponseBody: false,
  logHeaders: false,
  excludeHeaders: ['authorization', 'cookie', 'x-api-key'],
  performanceThreshold: 1000, // Log slow operations over 1s
  timeoutWarningThreshold: 0.8 // Warn at 80% of timeout limit
};

/**
 * Initialize logging for a Firebase Function
 * Creates correlation ID, logger instance, and logs function invocation
 */
export const initializeLogging = (
  functionName: string,
  config: Partial<LoggingMiddlewareConfig> = {}
) => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  return (req: LoggingRequest, res: Response, next: NextFunction) => {
    // Generate correlation ID for request tracking
    const correlationId = req.headers['x-correlation-id'] as string || generateCorrelationId();
    req.correlationId = correlationId;
    req.startTime = Date.now();
    req.functionName = functionName;

    // Create function-specific logger
    req.logger = new FunctionLogger(`firebase-functions-${functionName}`);

    // Set correlation context for the request
    CorrelationService.setCorrelationId(correlationId);

    // Prepare request context for logging
    const requestContext: any = {
      functionName,
      userId: req.user?.uid,
      requestId: correlationId,
      method: req.method,
      endpoint: req.path,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      correlationId
    };

    // Include headers if configured
    if (fullConfig.logHeaders) {
      const filteredHeaders = { ...req.headers };
      fullConfig.excludeHeaders?.forEach(header => {
        delete filteredHeaders[header];
      });
      requestContext.headers = filteredHeaders;
    }

    // Include request body if configured (and not too large)
    if (fullConfig.logRequestBody && req.body) {
      const bodyString = JSON.stringify(req.body);
      if (bodyString.length < 5000) { // Avoid logging huge payloads
        requestContext.body = req.body;
      } else {
        requestContext.bodySize = bodyString.length;
      }
    }

    // Log function invocation
    req.logger.functionInvoked(requestContext);

    // Set response header for correlation tracking
    res.setHeader('x-correlation-id', correlationId);

    next();
  };
};

/**
 * Finalize logging for a Firebase Function
 * Logs function completion, performance metrics, and any errors
 */
export const finalizeLogging = () => {
  return (req: LoggingRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;

    // Override res.send to capture response
    res.send = function(body?: any) {
      logFunctionCompletion(req, res, body);
      return originalSend.call(this, body);
    };

    // Override res.json to capture JSON response
    res.json = function(body?: any) {
      logFunctionCompletion(req, res, body);
      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Log function completion with performance metrics
 */
function logFunctionCompletion(req: LoggingRequest, res: Response, responseBody?: any) {
  if (!req.logger || !req.startTime) return;

  const executionDuration = Date.now() - req.startTime;
  const memoryUsed = process.memoryUsage().heapUsed;

  const completionContext: any = {
    functionName: req.functionName,
    userId: req.user?.uid,
    requestId: req.correlationId,
    executionDuration,
    statusCode: res.statusCode,
    memoryUsed,
    correlationId: req.correlationId
  };

  // Include response size if available
  if (responseBody) {
    const responseString = typeof responseBody === 'string'
      ? responseBody
      : JSON.stringify(responseBody);
    completionContext.responseSize = responseString.length;
  }

  // Check if this is a slow operation
  const config = DEFAULT_CONFIG;
  if (executionDuration > (config.performanceThreshold || 1000)) {
    completionContext.slowOperation = true;
  }

  // Log successful completion
  if (res.statusCode < 400) {
    req.logger.functionCompleted(completionContext);
  } else {
    // Log as error for 4xx/5xx responses
    req.logger.functionFailed({
      ...completionContext,
      statusCode: res.statusCode,
      errorCategory: res.statusCode >= 500 ? 'server_error' : 'client_error'
    });
  }

  // Log performance warning if approaching timeout
  const timeoutLimit = 540000; // 9 minutes for Firebase Functions
  const timeoutThreshold = timeoutLimit * (config.timeoutWarningThreshold || 0.8);

  if (executionDuration > timeoutThreshold) {
    req.logger.timeoutWarning({
      functionName: req.functionName,
      executionTime: executionDuration,
      timeoutLimit,
      remainingTime: timeoutLimit - executionDuration,
      warningThreshold: config.timeoutWarningThreshold,
      correlationId: req.correlationId
    });
  }
}

/**
 * Error logging middleware
 * Captures and logs unhandled errors in Firebase Functions
 */
export const errorLoggingMiddleware = (
  error: Error,
  req: LoggingRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.logger) {
    // Fallback logger if middleware wasn't initialized
    req.logger = new FunctionLogger('firebase-functions-error');
  }

  const executionDuration = req.startTime ? Date.now() - req.startTime : undefined;

  req.logger.functionFailed({
    functionName: req.functionName || 'unknown',
    userId: req.user?.uid,
    requestId: req.correlationId,
    error,
    executionDuration,
    statusCode: res.statusCode || 500,
    errorCategory: 'unhandled_error',
    correlationId: req.correlationId
  });

  // Continue with error handling
  next(error);
};

/**
 * Convenience function to apply all logging middleware
 */
export const applyLoggingMiddleware = (
  functionName: string,
  config?: Partial<LoggingMiddlewareConfig>
) => {
  return [
    initializeLogging(functionName, config),
    finalizeLogging(),
    errorLoggingMiddleware
  ];
};

/**
 * Log authentication events from middleware
 */
export const logAuthenticationEvent = (req: LoggingRequest, success: boolean, error?: string) => {
  if (!req.logger) return;

  if (success) {
    req.logger.authenticationContext({
      uid: req.user?.uid,
      email: req.user?.email,
      customClaims: {
        role: req.user?.role,
        tier: req.user?.subscription?.tier
      },
      correlationId: req.correlationId
    });
  } else {
    req.logger.authorizationFailed({
      uid: req.user?.uid,
      reason: error,
      endpoint: req.path,
      correlationId: req.correlationId
    });
  }
};

/**
 * Log external service calls from functions
 */
export const logExternalServiceCall = (
  req: LoggingRequest,
  service: string,
  endpoint: string,
  options: {
    method?: string;
    duration?: number;
    statusCode?: number;
    success?: boolean;
    cost?: number;
    tokens?: { input: number; output: number; total: number };
  } = {}
) => {
  if (!req.logger) return;

  req.logger.externalServiceCall({
    service,
    endpoint,
    method: options.method,
    duration: options.duration,
    statusCode: options.statusCode,
    success: options.success,
    cost: options.cost,
    tokens: options.tokens,
    correlationId: req.correlationId
  });
};