/**
 * Validation Types
 *
 * Core types for the validation system
 */

export interface ValidationResult {
  /** Unique identifier for this validation result */
  resultId: string;
  /** Rule identifier that generated this result */
  ruleId: string;
  /** Human-readable rule name */
  ruleName: string;
  /** Validation status */
  status: 'PASS' | 'FAIL' | 'WARNING' | 'SKIP';
  /** Result severity */
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  /** Human-readable message */
  message: string;
  /** Detailed result information */
  details: Record<string, any>;
  /** Suggested remediation */
  remediation?: string;
  /** Whether this issue can be auto-fixed */
  canAutoFix: boolean;
  /** Rule execution time in milliseconds */
  executionTime: number;
}

export interface ValidationRule {
  /** Unique rule identifier */
  id: string;
  /** Human-readable rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Rule severity level */
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  /** Rule validation function */
  validate: (context: ValidationContext) => Promise<ValidationResult[]> | ValidationResult[];
  /** Rule configuration */
  config?: Record<string, any>;
}

export interface ValidationContext {
  /** Module path being validated */
  modulePath: string;
  /** Module files */
  files: string[];
  /** Additional context data */
  metadata: Record<string, any>;
}

export interface ValidationOptions {
  /** Rules to include */
  includeRules?: string[];
  /** Rules to exclude */
  excludeRules?: string[];
  /** Maximum concurrent validations */
  maxConcurrency?: number;
  /** Validation timeout */
  timeout?: number;
}

export interface ComplianceRule {
  /** Rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Rule type */
  type: 'structure' | 'quality' | 'security' | 'performance';
  /** Rule severity */
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  /** Rule implementation */
  validate: (context: ValidationContext) => Promise<ValidationResult[]>;
}