/**
 * Supporting types and interfaces for the unified module requirements system
 *
 * This file contains shared types, enums, and utility interfaces used across
 * all models and services in the CVPlus module validation system.
 */

// Re-export key types from other models for convenience
export type { ModuleStructure, ModuleFile, ModuleDependency, GitSubmoduleInfo } from './ModuleStructure.js';
export type { ComplianceRule, RuleCategory, RuleSeverity, RuleScope, AutoFixAction } from './ComplianceRule.js';
export type { ValidationReport, ValidationResult, ValidationStatus, ComplianceMetrics } from './ValidationReport.js';
export type { ModuleTemplate, TemplateCategory, TemplateFile, TemplateVariable, GenerationResult } from './ModuleTemplate.js';

/**
 * Common validation result interface used across all validators
 */
export interface CommonValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

/**
 * File system related types
 */
export interface FileSystemEntry {
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified: Date;
  permissions?: string;
}

export interface DirectoryTree {
  name: string;
  path: string;
  children: DirectoryTree[];
  files: FileSystemEntry[];
}

/**
 * Configuration types
 */
export interface SystemConfig {
  /** Global validation settings */
  validation: {
    /** Default timeout for validation operations (ms) */
    defaultTimeout: number;
    /** Maximum number of parallel validations */
    maxParallelJobs: number;
    /** Whether to enable auto-fix by default */
    enableAutoFix: boolean;
    /** Minimum compliance score threshold */
    minComplianceScore: number;
  };

  /** Template management settings */
  templates: {
    /** Directory containing templates */
    templateDirectory: string;
    /** Whether to cache compiled templates */
    enableCache: boolean;
    /** Template cache TTL (ms) */
    cacheTtl: number;
  };

  /** Reporting settings */
  reporting: {
    /** Directory for storing reports */
    reportsDirectory: string;
    /** Maximum number of historical reports to keep */
    maxHistoricalReports: number;
    /** Whether to generate detailed reports */
    enableDetailedReports: boolean;
  };

  /** CVPlus specific settings */
  cvplus: {
    /** Root directory of CVPlus project */
    rootDirectory: string;
    /** Packages directory (where submodules are located) */
    packagesDirectory: string;
    /** List of known submodule names */
    knownSubmodules: string[];
    /** Git configuration */
    git: {
      /** Default branch name */
      defaultBranch: string;
      /** Whether to enforce commit message format */
      enforceCommitFormat: boolean;
      /** Commit message pattern */
      commitMessagePattern?: string;
    };
  };
}

/**
 * API request/response types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Validation operation context
 */
export interface ValidationContext {
  /** Operation ID for tracking */
  operationId: string;
  /** Timestamp when validation started */
  startTime: Date;
  /** Configuration for this validation */
  config: {
    /** Rules to include (if empty, include all) */
    includeRules?: string[];
    /** Rules to exclude */
    excludeRules?: string[];
    /** Custom rule configurations */
    customRules?: Record<string, any>;
    /** Whether to run auto-fix */
    autoFix?: boolean;
    /** Timeout for validation (ms) */
    timeout?: number;
  };
  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * Module generation context
 */
export interface GenerationContext {
  /** Generation ID for tracking */
  generationId: string;
  /** Template being used */
  templateId: string;
  /** Target output directory */
  outputDirectory: string;
  /** User-provided variable values */
  variables: Record<string, any>;
  /** Generation options */
  options: {
    overwriteExisting?: boolean;
    runPostCommands?: boolean;
    initGit?: boolean;
    installDependencies?: boolean;
    validateAfterGeneration?: boolean;
  };
  /** Generation timestamp */
  timestamp: Date;
}

/**
 * Batch operation types
 */
export interface BatchOperation<T, R> {
  /** Operation ID */
  id: string;
  /** Operation type */
  type: 'validation' | 'generation' | 'auto-fix' | 'migration';
  /** Items to process */
  items: T[];
  /** Operation configuration */
  config: Record<string, any>;
  /** Callback for progress updates */
  onProgress?: (progress: BatchProgress) => void;
  /** Callback for individual item completion */
  onItemComplete?: (item: T, result: R) => void;
}

export interface BatchProgress {
  /** Total items to process */
  total: number;
  /** Items completed */
  completed: number;
  /** Items failed */
  failed: number;
  /** Items currently processing */
  processing: number;
  /** Overall progress percentage (0-100) */
  percentage: number;
  /** Current processing rate (items per second) */
  rate: number;
  /** Estimated time remaining (ms) */
  estimatedTimeRemaining: number;
}

export interface BatchResult<T, R> {
  /** Operation ID */
  operationId: string;
  /** Overall success status */
  success: boolean;
  /** Total items processed */
  totalItems: number;
  /** Successful results */
  successfulResults: Array<{ item: T; result: R }>;
  /** Failed items with errors */
  failedItems: Array<{ item: T; error: string }>;
  /** Execution metrics */
  metrics: {
    totalTime: number;
    averageTimePerItem: number;
    successRate: number;
    throughput: number;
  };
}

/**
 * Migration operation types
 */
export interface MigrationPlan {
  /** Migration plan ID */
  planId: string;
  /** Source module path */
  sourcePath: string;
  /** Target module type */
  targetType: string;
  /** Migration steps */
  steps: MigrationStep[];
  /** Estimated effort */
  estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  /** Risk assessment */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  /** Backup strategy */
  backupStrategy: {
    createBackup: boolean;
    backupPath?: string;
    rollbackInstructions?: string[];
  };
}

export interface MigrationStep {
  /** Step ID */
  id: string;
  /** Step description */
  description: string;
  /** Step type */
  type: 'file_operation' | 'dependency_update' | 'configuration_change' | 'code_transformation' | 'validation';
  /** Step parameters */
  parameters: Record<string, any>;
  /** Whether step is reversible */
  reversible: boolean;
  /** Rollback instructions if reversible */
  rollbackInstructions?: string[];
  /** Prerequisites for this step */
  prerequisites?: string[];
}

export interface MigrationResult {
  /** Migration plan ID */
  planId: string;
  /** Overall success status */
  success: boolean;
  /** Completed steps */
  completedSteps: string[];
  /** Failed step (if any) */
  failedStep?: {
    stepId: string;
    error: string;
  };
  /** Changes made */
  changes: Array<{
    type: 'file_created' | 'file_modified' | 'file_deleted' | 'directory_created' | 'dependency_added' | 'dependency_removed';
    path?: string;
    description: string;
  }>;
  /** Rollback available */
  canRollback: boolean;
}

/**
 * Performance monitoring types
 */
export interface PerformanceMetrics {
  /** Operation type */
  operation: string;
  /** Start timestamp */
  startTime: Date;
  /** End timestamp */
  endTime: Date;
  /** Duration in milliseconds */
  duration: number;
  /** Memory usage during operation (MB) */
  memoryUsage?: {
    peak: number;
    average: number;
    start: number;
    end: number;
  };
  /** CPU usage during operation (%) */
  cpuUsage?: {
    peak: number;
    average: number;
  };
  /** Additional metrics */
  customMetrics?: Record<string, number>;
}

export interface SystemHealth {
  /** Overall system status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Last health check timestamp */
  lastCheck: Date;
  /** Component health statuses */
  components: {
    filesystem: 'healthy' | 'error';
    templates: 'healthy' | 'error';
    validation: 'healthy' | 'error';
    reporting: 'healthy' | 'error';
  };
  /** System metrics */
  metrics: {
    /** Available disk space (MB) */
    availableDiskSpace: number;
    /** Available memory (MB) */
    availableMemory: number;
    /** CPU usage (%) */
    cpuUsage: number;
    /** Active operations */
    activeOperations: number;
  };
}

/**
 * Event types for system monitoring
 */
export interface SystemEvent {
  /** Event ID */
  id: string;
  /** Event timestamp */
  timestamp: Date;
  /** Event type */
  type: 'validation' | 'generation' | 'migration' | 'system' | 'error';
  /** Event severity */
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  /** Event message */
  message: string;
  /** Event source */
  source: string;
  /** Additional event data */
  data?: Record<string, any>;
  /** User/process that triggered the event */
  triggeredBy?: string;
}

/**
 * WebSocket message types for real-time updates
 */
export interface WebSocketMessage {
  /** Message type */
  type: 'progress_update' | 'operation_complete' | 'system_event' | 'health_update';
  /** Message payload */
  payload: any;
  /** Message timestamp */
  timestamp: Date;
  /** Operation ID (if applicable) */
  operationId?: string;
}

/**
 * Plugin system types
 */
export interface Plugin {
  /** Plugin ID */
  id: string;
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description: string;
  /** Plugin author */
  author: string;
  /** Plugin entry point */
  main: string;
  /** Plugin dependencies */
  dependencies?: Record<string, string>;
  /** Plugin configuration schema */
  configSchema?: Record<string, any>;
  /** Whether plugin is enabled */
  enabled: boolean;
}

export interface PluginContext {
  /** System configuration */
  config: SystemConfig;
  /** Plugin logger */
  logger: {
    debug: (message: string, data?: any) => void;
    info: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
  };
  /** Plugin storage */
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
  /** Event system */
  events: {
    emit: (event: SystemEvent) => void;
    on: (eventType: string, handler: (event: SystemEvent) => void) => void;
    off: (eventType: string, handler: (event: SystemEvent) => void) => void;
  };
}

/**
 * Utility types for type safety
 */
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Constants and enums
 */
export const VALIDATION_TIMEOUTS = {
  QUICK: 10000,      // 10 seconds
  STANDARD: 30000,   // 30 seconds
  THOROUGH: 120000,  // 2 minutes
  COMPREHENSIVE: 300000  // 5 minutes
} as const;

export const FILE_SIZE_LIMITS = {
  SMALL: 1024 * 1024,        // 1 MB
  MEDIUM: 10 * 1024 * 1024,  // 10 MB
  LARGE: 50 * 1024 * 1024    // 50 MB
} as const;

export const COMPLIANCE_THRESHOLDS = {
  EXCELLENT: 95,
  GOOD: 85,
  ACCEPTABLE: 75,
  POOR: 60,
  FAILING: 0
} as const;

export const SYSTEM_LIMITS = {
  MAX_CONCURRENT_VALIDATIONS: 10,
  MAX_BATCH_SIZE: 100,
  MAX_REPORT_HISTORY: 1000,
  MAX_EVENT_HISTORY: 10000,
  MAX_TEMPLATE_SIZE: 100 * 1024 * 1024  // 100 MB
} as const;

/**
 * Error types
 */
export class ValidationError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GenerationError extends Error {
  constructor(message: string, public templateId?: string, public details?: any) {
    super(message);
    this.name = 'GenerationError';
  }
}

export class MigrationError extends Error {
  constructor(message: string, public step?: string, public rollbackAvailable?: boolean) {
    super(message);
    this.name = 'MigrationError';
  }
}

export class SystemError extends Error {
  constructor(message: string, public component?: string, public recoverable?: boolean) {
    super(message);
    this.name = 'SystemError';
  }
}

/**
 * Type guards for runtime type checking
 */
export function isValidationStatus(value: any): boolean {
  return typeof value === 'string' && ['PASS', 'FAIL', 'WARNING', 'PARTIAL', 'ERROR'].includes(value);
}

export function isRuleSeverity(value: any): boolean {
  return typeof value === 'string' && ['INFO', 'WARNING', 'ERROR', 'CRITICAL'].includes(value);
}

export function isSystemEvent(value: any): value is SystemEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    value.timestamp instanceof Date &&
    typeof value.type === 'string' &&
    typeof value.severity === 'string' &&
    typeof value.message === 'string' &&
    typeof value.source === 'string'
  );
}

export function isApiResponse(value: any): value is ApiResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.success === 'boolean' &&
    value.timestamp instanceof Date
  );
}

/**
 * Utility functions for working with types
 */
export function createEmptyValidationResult(): CommonValidationResult {
  return {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: []
  };
}

export function createApiResponse<T>(data?: T, error?: { code: string; message: string; details?: any }): ApiResponse<T> {
  return {
    success: !error,
    data: data as T,
    error,
    timestamp: new Date()
  } as ApiResponse<T>;
}

export function createSystemEvent(
  type: SystemEvent['type'],
  severity: SystemEvent['severity'],
  message: string,
  source: string,
  data?: Record<string, any>
): SystemEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date(),
    type,
    severity,
    message,
    source,
    data: data || {}
  };
}