/**
 * Plugin System Types
 *
 * Defines the architecture for an extensible plugin system that allows
 * custom integrations, validation rules, and workflow extensions.
 */

import { ValidationResult, ValidationRule } from './validation.js';

/**
 * Plugin metadata and identification
 */
export interface PluginMetadata {
  /** Unique plugin identifier */
  id: string;
  /** Human-readable plugin name */
  name: string;
  /** Plugin version following semver */
  version: string;
  /** Plugin description */
  description: string;
  /** Plugin author information */
  author: string;
  /** Plugin homepage or repository URL */
  homepage?: string;
  /** Plugin license */
  license?: string;
  /** Plugin tags for categorization */
  tags: string[];
  /** Required UMR version compatibility */
  umrVersion: string;
  /** Plugin dependencies */
  dependencies?: PluginDependency[];
}

/**
 * Plugin dependency specification
 */
export interface PluginDependency {
  /** Dependency plugin ID */
  pluginId: string;
  /** Required version range */
  versionRange: string;
  /** Whether dependency is optional */
  optional?: boolean;
}

/**
 * Plugin capabilities and extension points
 */
export interface PluginCapabilities {
  /** Custom validation rules */
  validationRules?: ValidationRuleExtension[];
  /** Custom CLI commands */
  cliCommands?: CliCommandExtension[];
  /** Custom report generators */
  reportGenerators?: ReportGeneratorExtension[];
  /** Workflow hooks */
  hooks?: HookExtension[];
  /** Configuration schema extensions */
  configExtensions?: ConfigExtension[];
}

/**
 * Plugin lifecycle hooks
 */
export interface PluginLifecycle {
  /** Called when plugin is loaded */
  onLoad?(context: PluginContext): Promise<void> | void;
  /** Called when plugin is activated */
  onActivate?(context: PluginContext): Promise<void> | void;
  /** Called when plugin is deactivated */
  onDeactivate?(context: PluginContext): Promise<void> | void;
  /** Called when plugin is unloaded */
  onUnload?(context: PluginContext): Promise<void> | void;
}

/**
 * Plugin execution context
 */
export interface PluginContext {
  /** Plugin metadata */
  metadata: PluginMetadata;
  /** Plugin configuration */
  config: Record<string, any>;
  /** Logger instance */
  logger: PluginLogger;
  /** Event emitter for plugin communication */
  events: PluginEventEmitter;
  /** Storage interface for plugin data */
  storage: PluginStorage;
  /** UMR API access */
  api: PluginApiAccess;
}

/**
 * Plugin logger interface
 */
export interface PluginLogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

/**
 * Plugin event emitter interface
 */
export interface PluginEventEmitter {
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
}

/**
 * Plugin storage interface
 */
export interface PluginStorage {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

/**
 * Plugin API access interface
 */
export interface PluginApiAccess {
  /** Validation service access */
  validation: {
    validate(modulePath: string, rules?: string[]): Promise<ValidationResult[]>;
    registerRule(rule: ValidationRule): void;
  };
  /** Reporting service access */
  reporting: {
    generateReport(results: ValidationResult[], format: string): Promise<string>;
  };
  /** File system utilities */
  fs: {
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    glob(pattern: string, cwd?: string): Promise<string[]>;
  };
}

/**
 * Validation rule extension
 */
export interface ValidationRuleExtension {
  /** Rule definition */
  rule: ValidationRule;
  /** Rule priority (higher = executed first) */
  priority?: number;
  /** Rule conditions for activation */
  conditions?: RuleCondition[];
}

/**
 * Rule activation condition
 */
export interface RuleCondition {
  /** Condition type */
  type: 'filePattern' | 'moduleType' | 'dependency' | 'custom';
  /** Condition value/pattern */
  value: string;
  /** Custom condition function (for type: 'custom') */
  test?: (context: ValidationContext) => boolean;
}

/**
 * Validation context for rule conditions
 */
export interface ValidationContext {
  /** Module path being validated */
  modulePath: string;
  /** Module package.json content */
  packageJson?: any;
  /** List of files in module */
  files: string[];
  /** Module metadata */
  metadata: Record<string, any>;
}

/**
 * CLI command extension
 */
export interface CliCommandExtension {
  /** Command name */
  name: string;
  /** Command description */
  description: string;
  /** Command aliases */
  aliases?: string[];
  /** Command options */
  options?: CliOption[];
  /** Command arguments */
  arguments?: CliArgument[];
  /** Command handler */
  handler: (args: any, options: any, context: PluginContext) => Promise<void> | void;
}

/**
 * CLI option definition
 */
export interface CliOption {
  /** Option flag (e.g., '-v, --verbose') */
  flags: string;
  /** Option description */
  description: string;
  /** Default value */
  defaultValue?: any;
}

/**
 * CLI argument definition
 */
export interface CliArgument {
  /** Argument name */
  name: string;
  /** Argument description */
  description: string;
  /** Whether argument is required */
  required?: boolean;
  /** Argument type */
  type?: 'string' | 'number' | 'boolean';
}

/**
 * Report generator extension
 */
export interface ReportGeneratorExtension {
  /** Generator name/format */
  format: string;
  /** Generator description */
  description: string;
  /** MIME type for generated reports */
  mimeType: string;
  /** File extension for generated reports */
  fileExtension: string;
  /** Generator function */
  generate: (results: ValidationResult[], options?: any) => Promise<string | Buffer>;
}

/**
 * Workflow hook extension
 */
export interface HookExtension {
  /** Hook event name */
  event: HookEvent;
  /** Hook priority (higher = executed first) */
  priority?: number;
  /** Hook handler */
  handler: (data: any, context: PluginContext) => Promise<HookResult> | HookResult;
}

/**
 * Available hook events
 */
export type HookEvent =
  | 'validation:before'
  | 'validation:after'
  | 'validation:rule:before'
  | 'validation:rule:after'
  | 'report:before'
  | 'report:after'
  | 'autofix:before'
  | 'autofix:after'
  | 'security:scan:before'
  | 'security:scan:after'
  | 'performance:analyze:before'
  | 'performance:analyze:after'
  | 'cli:command:before'
  | 'cli:command:after';

/**
 * Hook execution result
 */
export interface HookResult {
  /** Whether to continue hook chain execution */
  continue?: boolean;
  /** Modified data to pass to next hook */
  data?: any;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Configuration schema extension
 */
export interface ConfigExtension {
  /** Configuration section name */
  section: string;
  /** JSON schema for validation */
  schema: any;
  /** Default values */
  defaults?: Record<string, any>;
  /** Configuration description */
  description?: string;
}

/**
 * Main plugin interface
 */
export interface Plugin {
  /** Plugin metadata */
  readonly metadata: PluginMetadata;
  /** Plugin capabilities */
  readonly capabilities: PluginCapabilities;
  /** Plugin lifecycle hooks */
  readonly lifecycle: PluginLifecycle;
  /** Plugin configuration schema */
  readonly configSchema?: any;
}

/**
 * Plugin registry entry
 */
export interface PluginRegistryEntry {
  /** Plugin instance */
  plugin: Plugin;
  /** Plugin status */
  status: PluginStatus;
  /** Plugin context */
  context: PluginContext;
  /** Load timestamp */
  loadedAt: Date;
  /** Activation timestamp */
  activatedAt?: Date;
  /** Error information if failed */
  error?: Error;
}

/**
 * Plugin status enumeration
 */
export type PluginStatus =
  | 'unloaded'
  | 'loading'
  | 'loaded'
  | 'activating'
  | 'active'
  | 'deactivating'
  | 'error';

/**
 * Plugin manager configuration
 */
export interface PluginManagerConfig {
  /** Plugin directories to scan */
  pluginDirs: string[];
  /** Auto-load plugins on startup */
  autoLoad: boolean;
  /** Auto-activate loaded plugins */
  autoActivate: boolean;
  /** Plugin loading timeout (ms) */
  loadTimeout: number;
  /** Maximum parallel plugin operations */
  maxConcurrency: number;
  /** Allow unsafe plugins */
  allowUnsafe: boolean;
  /** Plugin security settings */
  security: PluginSecurityConfig;
}

/**
 * Plugin security configuration
 */
export interface PluginSecurityConfig {
  /** Allowed plugin sources */
  allowedSources: string[];
  /** Required plugin signing */
  requireSigning: boolean;
  /** Sandbox plugins */
  sandboxed: boolean;
  /** Resource limits */
  resourceLimits: {
    maxMemory: number;
    maxCpu: number;
    maxFileAccess: string[];
  };
}

/**
 * Plugin discovery result
 */
export interface PluginDiscoveryResult {
  /** Discovered plugins */
  plugins: DiscoveredPlugin[];
  /** Discovery errors */
  errors: PluginDiscoveryError[];
  /** Discovery metadata */
  metadata: {
    scanDuration: number;
    directoriesScanned: number;
    filesScanned: number;
  };
}

/**
 * Discovered plugin information
 */
export interface DiscoveredPlugin {
  /** Plugin path */
  path: string;
  /** Plugin metadata */
  metadata: PluginMetadata;
  /** Plugin manifest path */
  manifestPath: string;
  /** Plugin entry point */
  entryPoint: string;
  /** Validation status */
  valid: boolean;
  /** Validation errors */
  errors: string[];
}

/**
 * Plugin discovery error
 */
export interface PluginDiscoveryError {
  /** Error path */
  path: string;
  /** Error message */
  message: string;
  /** Error details */
  details?: any;
}

/**
 * Plugin validation result
 */
export interface PluginValidationResult {
  /** Whether plugin is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Security assessment */
  security: PluginSecurityAssessment;
}

/**
 * Plugin security assessment
 */
export interface PluginSecurityAssessment {
  /** Security score (0-100) */
  score: number;
  /** Security issues found */
  issues: SecurityIssue[];
  /** Recommended actions */
  recommendations: string[];
}

/**
 * Security issue information
 */
export interface SecurityIssue {
  /** Issue type */
  type: string;
  /** Issue severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Issue description */
  description: string;
  /** Affected files/code */
  location?: string;
}

/**
 * Plugin manifest file structure
 */
export interface PluginManifest {
  /** Plugin metadata */
  metadata: PluginMetadata;
  /** Entry point file */
  main: string;
  /** Plugin capabilities */
  capabilities?: Partial<PluginCapabilities>;
  /** Configuration schema */
  configSchema?: any;
  /** Required permissions */
  permissions?: string[];
  /** Resource requirements */
  resources?: {
    memory?: string;
    cpu?: string;
    storage?: string;
  };
}

/**
 * Plugin installation options
 */
export interface PluginInstallOptions {
  /** Installation source */
  source: 'local' | 'npm' | 'git' | 'url';
  /** Source location */
  location: string;
  /** Force installation */
  force?: boolean;
  /** Skip validation */
  skipValidation?: boolean;
  /** Installation directory */
  installDir?: string;
}

/**
 * Plugin marketplace entry
 */
export interface PluginMarketplaceEntry {
  /** Plugin metadata */
  metadata: PluginMetadata;
  /** Download statistics */
  downloads: {
    total: number;
    weekly: number;
    monthly: number;
  };
  /** User ratings */
  rating: {
    average: number;
    count: number;
  };
  /** Plugin screenshots */
  screenshots?: string[];
  /** Installation instructions */
  readme?: string;
  /** Plugin source location */
  source: {
    type: 'npm' | 'git' | 'url';
    location: string;
  };
}

/**
 * Plugin events for communication
 */
export interface PluginEvents {
  'plugin:loaded': (plugin: Plugin) => void;
  'plugin:activated': (plugin: Plugin) => void;
  'plugin:deactivated': (plugin: Plugin) => void;
  'plugin:unloaded': (plugin: Plugin) => void;
  'plugin:error': (plugin: Plugin, error: Error) => void;
  'validation:start': (modulePath: string) => void;
  'validation:complete': (results: ValidationResult[]) => void;
  'report:generated': (format: string, content: string) => void;
}