/**
 * Security Types
 *
 * Types for security analysis and vulnerability detection
 */

export interface SecurityScanResult {
  /** Unique scan identifier */
  scanId: string;
  /** Module path that was scanned */
  modulePath: string;
  /** Scan timestamp */
  timestamp: Date;
  /** Detected vulnerabilities */
  vulnerabilities: SecurityVulnerability[];
  /** Scan summary */
  summary: SecuritySummary;
  /** Overall risk score (0-100) */
  riskScore: number;
  /** Security recommendations */
  recommendations: SecurityRecommendation[];
  /** Performance metrics for the scan */
  performanceMetrics: {
    duration: number;
    filesScanned: number;
    rulesExecuted: number;
  };
  /** Scan configuration */
  scanOptions: SecurityScanOptions;
}

export interface SecurityVulnerability {
  /** Vulnerability identifier */
  id: string;
  /** Vulnerability type */
  type: VulnerabilityType;
  /** Severity level */
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  /** Vulnerability title */
  title: string;
  /** Detailed description */
  description: string;
  /** File path where vulnerability was found */
  filePath?: string;
  /** Line number (if applicable) */
  lineNumber?: number;
  /** Code snippet */
  codeSnippet?: string;
  /** CWE identifier */
  cwe?: string;
  /** CVE identifier (if applicable) */
  cve?: string;
  /** CVSS score */
  cvss?: number;
  /** Affected package (for dependency vulnerabilities) */
  affectedPackage?: string;
  /** Affected version */
  affectedVersion?: string;
  /** Fixed version (if available) */
  fixedVersion?: string;
  /** References for more information */
  references: string[];
  /** Remediation advice */
  remediation: string;
  /** Vulnerability fingerprint for tracking */
  fingerprint: string;
}

export type VulnerabilityType =
  | 'dependency'
  | 'code'
  | 'configuration'
  | 'secrets'
  | 'injection'
  | 'xss'
  | 'csrf'
  | 'authentication'
  | 'authorization'
  | 'cryptography'
  | 'input_validation'
  | 'path_traversal'
  | 'information_disclosure';

export interface SecuritySummary {
  /** Total vulnerabilities found */
  total: number;
  /** Count by severity */
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  /** Count by type */
  byType: Record<VulnerabilityType, number>;
  /** Most critical vulnerability */
  mostCritical?: SecurityVulnerability;
}

export interface SecurityRecommendation {
  /** Recommendation identifier */
  id: string;
  /** Recommendation title */
  title: string;
  /** Detailed description */
  description: string;
  /** Priority level */
  priority: 'low' | 'medium' | 'high' | 'urgent';
  /** Implementation steps */
  steps: string[];
  /** Related vulnerabilities */
  relatedVulnerabilities: string[];
  /** Estimated effort */
  effort: string;
  /** Impact assessment */
  impact: string;
}

export interface SecurityScanOptions {
  /** Enable dependency scanning */
  scanDependencies?: boolean;
  /** Enable code analysis */
  scanCode?: boolean;
  /** Enable configuration analysis */
  scanConfiguration?: boolean;
  /** Enable secrets detection */
  scanSecrets?: boolean;
  /** Minimum severity to report */
  minSeverity?: 'info' | 'low' | 'medium' | 'high' | 'critical';
  /** Maximum scan time in seconds */
  timeout?: number;
  /** Files to exclude from scanning */
  excludePatterns?: string[];
  /** Include external dependencies */
  includeExternal?: boolean;
}

export interface SecurityAssessment {
  /** Assessment score (0-100) */
  score: number;
  /** Security issues found */
  issues: SecurityIssue[];
  /** Recommended actions */
  recommendations: string[];
}

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