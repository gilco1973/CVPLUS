// Core enumerations for the unified module requirements system

export enum ModuleType {
  BACKEND = 'BACKEND',
  FRONTEND = 'FRONTEND',
  UTILITY = 'UTILITY',
  API = 'API',
  CORE = 'CORE'
}

export enum RuleCategory {
  STRUCTURE = 'STRUCTURE',
  DOCUMENTATION = 'DOCUMENTATION',
  CONFIGURATION = 'CONFIGURATION',
  TESTING = 'TESTING',
  SECURITY = 'SECURITY',
  PERFORMANCE = 'PERFORMANCE'
}

export enum RuleSeverity {
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
  AUTO_FIX = 'AUTO_FIX'
}

export enum ValidationStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  WARNING = 'WARNING',
  PARTIAL = 'PARTIAL',
  ERROR = 'ERROR'
}

// Request/Response interfaces
export interface ValidateModuleRequest {
  modulePath: string;
  rules?: string[];
  severity?: RuleSeverity;
}

export interface BatchValidateRequest {
  modules: Array<{
    path: string;
    id: string;
  }>;
  rules?: string[];
}

export interface GenerateModuleRequest {
  moduleName: string;
  outputPath: string;
  options?: Record<string, unknown>;
  author?: string;
  description?: string;
}

export interface GenerateModuleResponse {
  modulePath: string;
  filesCreated: string[];
  validationReport: ValidationReport;
}

export interface ValidationResult {
  ruleId: string;
  status: ValidationStatus;
  severity: RuleSeverity;
  message?: string;
  filePath?: string;
  lineNumber?: number;
  remediation?: string;
}

export interface ValidationReport {
  moduleId: string;
  reportId: string;
  timestamp: string;
  overallScore: number;
  status: ValidationStatus;
  results: ValidationResult[];
  recommendations: string[];
  validator: string;
}

export interface ComplianceRule {
  id: string;
  category: RuleCategory;
  severity: RuleSeverity;
  description: string;
  remediation?: string;
  applicableTypes: ModuleType[];
  enabled: boolean;
  version: string;
}

export interface ModuleTemplate {
  templateId: string;
  name: string;
  description: string;
  moduleType: ModuleType;
  configurableOptions: TemplateOption[];
  version: string;
  maintainer: string;
}

export interface TemplateOption {
  name: string;
  type: string;
  default: unknown;
  description: string;
}

export interface ModuleStructure {
  name: string;
  type: ModuleType;
  requiredFiles: string[];
  requiredDirectories: string[];
  optionalFiles: string[];
  entryPoint: string;
  exports: ExportDefinition[];
  version: string;
  lastValidated: Date;
}

export interface ExportDefinition {
  name: string;
  type: string;
  path: string;
}

export interface EcosystemCompliance {
  totalModules: number;
  averageScore: number;
  statusDistribution: {
    pass: number;
    fail: number;
    warning: number;
    error: number;
  };
  trends: {
    scoreChange: number;
    newViolations: number;
  };
  topViolations: Array<{
    ruleId: string;
    count: number;
    percentage: number;
  }>;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}