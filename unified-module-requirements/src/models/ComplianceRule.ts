/**
 * ComplianceRule - Core data model for CVPlus module compliance rules
 *
 * This model defines the structure for compliance rules that govern
 * module standards, including validation logic, severity levels,
 * and auto-fix capabilities for maintaining consistent module quality.
 */

export type RuleCategory =
  | 'STRUCTURE'      // File/directory structure requirements
  | 'DOCUMENTATION'  // README, docs, comments requirements
  | 'CONFIGURATION'  // package.json, tsconfig, build configs
  | 'TESTING'        // Test coverage, test structure
  | 'SECURITY'       // Security best practices
  | 'PERFORMANCE'    // Performance guidelines
  | 'DEPENDENCIES'   // Dependency management
  | 'STANDARDS'      // Code style, naming conventions
  | 'INTEGRATION';   // Git submodule integration

export type RuleSeverity =
  | 'INFO'     // Informational, suggestions
  | 'WARNING'  // Should be fixed, non-blocking
  | 'ERROR'    // Must be fixed, blocks certain operations
  | 'CRITICAL'; // Critical issues, blocks all operations

export type RuleScope =
  | 'MODULE'    // Applies to entire module
  | 'FILE'      // Applies to specific files
  | 'PACKAGE'   // Applies to package.json
  | 'CONFIG'    // Applies to configuration files
  | 'CODE';     // Applies to source code

export interface RuleCondition {
  /** Field path to check (dot notation: 'package.scripts.build') */
  field: string;
  /** Condition operator */
  operator: 'exists' | 'not_exists' | 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'matches_regex' | 'file_exists' | 'directory_exists' | 'greater_than' | 'less_than';
  /** Expected value (optional for exists/not_exists) */
  value?: string | number | boolean | RegExp;
}

export interface AutoFixAction {
  /** Action type */
  action: 'create_file' | 'update_file' | 'delete_file' | 'create_directory' | 'update_package_json' | 'run_command';
  /** Target path/field for the action */
  target: string;
  /** Content or value to set */
  content?: string;
  /** Command to run (for run_command action) */
  command?: string;
  /** Whether action requires user confirmation */
  requiresConfirmation: boolean;
}

export interface RuleCustomization {
  /** Modules that this customization applies to */
  moduleTypes?: string[];
  /** Module IDs that this customization applies to */
  moduleIds?: string[];
  /** Override conditions for specific contexts */
  conditions?: RuleCondition[];
  /** Custom severity for this context */
  severity?: RuleSeverity;
  /** Whether rule is disabled for this context */
  disabled?: boolean;
}

export interface ComplianceRule {
  /** Unique rule identifier */
  ruleId: string;

  /** Human-readable rule name */
  name: string;

  /** Detailed description of what the rule checks */
  description: string;

  /** Rule category */
  category: RuleCategory;

  /** Rule severity level */
  severity: RuleSeverity;

  /** What scope the rule applies to */
  scope: RuleScope;

  /** Conditions that must be met for rule to pass */
  conditions: RuleCondition[];

  /** Auto-fix actions available for this rule */
  autoFix?: AutoFixAction[];

  /** Whether this rule can be auto-fixed */
  canAutoFix: boolean;

  /** Remediation instructions for manual fixes */
  remediation: string;

  /** Examples of compliant and non-compliant cases */
  examples?: {
    compliant?: string[];
    nonCompliant?: string[];
  };

  /** Rule customizations for different contexts */
  customizations?: RuleCustomization[];

  /** Tags for grouping and filtering rules */
  tags: string[];

  /** Whether rule is enabled by default */
  enabled: boolean;

  /** When rule was created */
  createdAt: Date;

  /** When rule was last updated */
  updatedAt: Date;

  /** Rule version for change tracking */
  version: string;

  /** Author/maintainer of the rule */
  author?: string;

  /** Documentation URL for more details */
  documentationUrl?: string;
}

/**
 * Validation and utility functions for ComplianceRule
 */
export class ComplianceRuleValidator {
  /**
   * Validate a ComplianceRule object
   */
  static validate(rule: Partial<ComplianceRule>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!rule.ruleId) {
      errors.push('ruleId is required');
    } else if (!/^[A-Z][A-Z0-9_]*$/.test(rule.ruleId)) {
      errors.push('ruleId must be SCREAMING_SNAKE_CASE (e.g., PACKAGE_JSON_EXISTS)');
    }

    if (!rule.name) {
      errors.push('name is required');
    }

    if (!rule.description) {
      errors.push('description is required');
    } else if (rule.description.length < 20) {
      warnings.push('description should be more descriptive (20+ characters)');
    }

    if (!rule.category) {
      errors.push('category is required');
    }

    if (!rule.severity) {
      errors.push('severity is required');
    }

    if (!rule.scope) {
      errors.push('scope is required');
    }

    if (!rule.conditions || rule.conditions.length === 0) {
      errors.push('at least one condition is required');
    } else {
      rule.conditions.forEach((condition, index) => {
        const conditionValidation = this.validateCondition(condition);
        conditionValidation.errors.forEach(err =>
          errors.push(`Condition ${index}: ${err}`)
        );
      });
    }

    if (!rule.remediation) {
      errors.push('remediation instructions are required');
    }

    if (rule.canAutoFix && (!rule.autoFix || rule.autoFix.length === 0)) {
      errors.push('canAutoFix is true but no autoFix actions provided');
    }

    if (rule.autoFix && rule.autoFix.length > 0) {
      rule.autoFix.forEach((action, index) => {
        const actionValidation = this.validateAutoFixAction(action);
        actionValidation.errors.forEach(err =>
          errors.push(`AutoFix ${index}: ${err}`)
        );
      });
    }

    if (!rule.version) {
      errors.push('version is required');
    } else if (!/^\d+\.\d+\.\d+/.test(rule.version)) {
      warnings.push('version should follow semantic versioning');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a RuleCondition
   */
  static validateCondition(condition: Partial<RuleCondition>): ValidationResult {
    const errors: string[] = [];

    if (!condition.field) {
      errors.push('condition field is required');
    }

    if (!condition.operator) {
      errors.push('condition operator is required');
    }

    const operatorsRequiringValue = ['equals', 'not_equals', 'contains', 'not_contains', 'matches_regex', 'greater_than', 'less_than'];
    if (condition.operator && operatorsRequiringValue.includes(condition.operator) && condition.value === undefined) {
      errors.push(`operator '${condition.operator}' requires a value`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Validate an AutoFixAction
   */
  static validateAutoFixAction(action: Partial<AutoFixAction>): ValidationResult {
    const errors: string[] = [];

    if (!action.action) {
      errors.push('action type is required');
    }

    if (!action.target) {
      errors.push('action target is required');
    }

    if (action.action === 'run_command' && !action.command) {
      errors.push('run_command action requires command field');
    }

    if (['create_file', 'update_file', 'update_package_json'].includes(action.action!) && !action.content) {
      errors.push(`${action.action} action requires content field`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }
}

/**
 * Utility functions for working with ComplianceRule
 */
export class ComplianceRuleUtils {
  /**
   * Create a new ComplianceRule with default values
   */
  static create(
    ruleId: string,
    name: string,
    category: RuleCategory,
    severity: RuleSeverity,
    scope: RuleScope
  ): ComplianceRule {
    return {
      ruleId,
      name,
      description: '',
      category,
      severity,
      scope,
      conditions: [],
      canAutoFix: false,
      remediation: '',
      tags: [],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0'
    };
  }

  /**
   * Check if rule applies to a specific module type
   */
  static appliesTo(rule: ComplianceRule, moduleType: string, moduleId?: string): boolean {
    // Check if rule has customizations that disable it for this context
    if (rule.customizations) {
      for (const customization of rule.customizations) {
        if (customization.disabled) {
          if (customization.moduleTypes?.includes(moduleType)) return false;
          if (moduleId && customization.moduleIds?.includes(moduleId)) return false;
        }
      }
    }

    return rule.enabled;
  }

  /**
   * Get effective severity for a rule in a specific context
   */
  static getEffectiveSeverity(rule: ComplianceRule, moduleType: string, moduleId?: string): RuleSeverity {
    // Check customizations for severity overrides
    if (rule.customizations) {
      for (const customization of rule.customizations) {
        if (customization.severity) {
          if (customization.moduleTypes?.includes(moduleType)) return customization.severity;
          if (moduleId && customization.moduleIds?.includes(moduleId)) return customization.severity;
        }
      }
    }

    return rule.severity;
  }

  /**
   * Get all rules for a specific category
   */
  static filterByCategory(rules: ComplianceRule[], category: RuleCategory): ComplianceRule[] {
    return rules.filter(rule => rule.category === category);
  }

  /**
   * Get all rules with auto-fix capability
   */
  static getAutoFixableRules(rules: ComplianceRule[]): ComplianceRule[] {
    return rules.filter(rule => rule.canAutoFix && rule.autoFix && rule.autoFix.length > 0);
  }

  /**
   * Get rules by severity level
   */
  static filterBySeverity(rules: ComplianceRule[], severity: RuleSeverity): ComplianceRule[] {
    return rules.filter(rule => rule.severity === severity);
  }

  /**
   * Get rules by tags
   */
  static filterByTags(rules: ComplianceRule[], tags: string[]): ComplianceRule[] {
    return rules.filter(rule =>
      tags.some(tag => rule.tags.includes(tag))
    );
  }
}

/**
 * Built-in compliance rules for CVPlus modules
 */
export class BuiltInRules {
  /**
   * Get all built-in compliance rules
   */
  static getAllRules(): ComplianceRule[] {
    return [
      this.getPackageJsonExistsRule(),
      this.getReadmeExistsRule(),
      this.getTypeScriptConfigRule(),
      this.getTestDirectoryRule(),
      this.getBuildScriptRule(),
      this.getGitIgnoreRule(),
      this.getNoMockDataRule(),
      this.getFileSizeLimitRule(),
      this.getSecurityConfigRule()
    ];
  }

  private static getPackageJsonExistsRule(): ComplianceRule {
    return {
      ruleId: 'PACKAGE_JSON_EXISTS',
      name: 'Package.json Required',
      description: 'Every CVPlus module must have a package.json file with valid configuration',
      category: 'CONFIGURATION',
      severity: 'CRITICAL',
      scope: 'MODULE',
      conditions: [
        { field: 'files', operator: 'contains', value: 'package.json' }
      ],
      canAutoFix: true,
      autoFix: [{
        action: 'create_file',
        target: 'package.json',
        content: JSON.stringify({
          name: '{{ moduleId }}',
          version: '1.0.0',
          description: '{{ description }}',
          main: 'dist/index.js',
          types: 'dist/index.d.ts',
          scripts: {
            build: 'tsc',
            test: 'jest',
            lint: 'eslint src/**/*.ts'
          }
        }, null, 2),
        requiresConfirmation: false
      }],
      remediation: 'Create a package.json file in the module root with proper configuration',
      tags: ['required', 'structure'],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0'
    };
  }

  private static getReadmeExistsRule(): ComplianceRule {
    return {
      ruleId: 'README_EXISTS',
      name: 'README.md Required',
      description: 'Every CVPlus module must have a README.md file with proper documentation',
      category: 'DOCUMENTATION',
      severity: 'ERROR',
      scope: 'MODULE',
      conditions: [
        { field: 'files', operator: 'contains', value: 'README.md' }
      ],
      canAutoFix: true,
      autoFix: [{
        action: 'create_file',
        target: 'README.md',
        content: '# {{ name }}\n\n{{ description }}\n\n## Installation\n\n```bash\nnpm install\n```\n\n## Usage\n\n```typescript\n// Add usage examples here\n```\n\n## Development\n\n```bash\nnpm run dev\n```\n\n## Testing\n\n```bash\nnpm test\n```',
        requiresConfirmation: false
      }],
      remediation: 'Create a README.md file with module documentation',
      tags: ['documentation', 'required'],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0'
    };
  }

  private static getTypeScriptConfigRule(): ComplianceRule {
    return {
      ruleId: 'TYPESCRIPT_CONFIG_REQUIRED',
      name: 'TypeScript Configuration Required',
      description: 'TypeScript modules must have proper tsconfig.json configuration',
      category: 'CONFIGURATION',
      severity: 'ERROR',
      scope: 'MODULE',
      conditions: [
        { field: 'hasTypeScript', operator: 'equals', value: true },
        { field: 'files', operator: 'contains', value: 'tsconfig.json' }
      ],
      canAutoFix: true,
      autoFix: [{
        action: 'create_file',
        target: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'ES2022',
            lib: ['ES2022'],
            module: 'ESNext',
            moduleResolution: 'bundler',
            declaration: true,
            outDir: './dist',
            rootDir: './src',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true
          },
          include: ['src/**/*'],
          exclude: ['node_modules', 'dist', 'tests']
        }, null, 2),
        requiresConfirmation: false
      }],
      remediation: 'Create tsconfig.json with proper TypeScript configuration',
      tags: ['typescript', 'configuration'],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0'
    };
  }

  private static getTestDirectoryRule(): ComplianceRule {
    return {
      ruleId: 'TEST_DIRECTORY_REQUIRED',
      name: 'Test Directory Required',
      description: 'Modules should have a tests directory with test files',
      category: 'TESTING',
      severity: 'WARNING',
      scope: 'MODULE',
      conditions: [
        { field: 'hasTests', operator: 'equals', value: true }
      ],
      canAutoFix: true,
      autoFix: [{
        action: 'create_directory',
        target: 'tests',
        requiresConfirmation: false
      }],
      remediation: 'Create a tests directory and add test files',
      tags: ['testing', 'structure'],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0'
    };
  }

  private static getBuildScriptRule(): ComplianceRule {
    return {
      ruleId: 'BUILD_SCRIPT_REQUIRED',
      name: 'Build Script Required',
      description: 'Package.json must have a build script configured',
      category: 'CONFIGURATION',
      severity: 'ERROR',
      scope: 'PACKAGE',
      conditions: [
        { field: 'scripts.build', operator: 'exists' }
      ],
      canAutoFix: true,
      autoFix: [{
        action: 'update_package_json',
        target: 'scripts.build',
        content: 'tsc',
        requiresConfirmation: false
      }],
      remediation: 'Add a build script to package.json scripts section',
      tags: ['scripts', 'build'],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0'
    };
  }

  private static getGitIgnoreRule(): ComplianceRule {
    return {
      ruleId: 'GITIGNORE_REQUIRED',
      name: '.gitignore Required',
      description: 'Modules should have .gitignore to exclude build artifacts',
      category: 'CONFIGURATION',
      severity: 'WARNING',
      scope: 'MODULE',
      conditions: [
        { field: 'files', operator: 'contains', value: '.gitignore' }
      ],
      canAutoFix: true,
      autoFix: [{
        action: 'create_file',
        target: '.gitignore',
        content: 'node_modules/\ndist/\nbuild/\n*.log\n.DS_Store\n.env.local\n.env.*.local\ncoverage/\n*.tgz',
        requiresConfirmation: false
      }],
      remediation: 'Create .gitignore file to exclude build artifacts and dependencies',
      tags: ['git', 'configuration'],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0'
    };
  }

  private static getNoMockDataRule(): ComplianceRule {
    return {
      ruleId: 'NO_MOCK_DATA',
      name: 'No Mock Data Allowed',
      description: 'CVPlus modules must never contain mock data or placeholders',
      category: 'STANDARDS',
      severity: 'CRITICAL',
      scope: 'CODE',
      conditions: [
        { field: 'content', operator: 'not_contains', value: 'mock' },
        { field: 'content', operator: 'not_contains', value: 'placeholder' },
        { field: 'content', operator: 'not_contains', value: 'TODO: replace' }
      ],
      canAutoFix: false,
      remediation: 'Remove all mock data and placeholders. Request real data or flag as missing.',
      tags: ['data', 'critical'],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0'
    };
  }

  private static getFileSizeLimitRule(): ComplianceRule {
    return {
      ruleId: 'FILE_SIZE_LIMIT',
      name: 'File Size Limit',
      description: 'Source files should be under 200 lines to maintain readability',
      category: 'STANDARDS',
      severity: 'WARNING',
      scope: 'FILE',
      conditions: [
        { field: 'lineCount', operator: 'less_than', value: 200 }
      ],
      canAutoFix: false,
      remediation: 'Refactor large files into smaller, focused modules with single responsibilities',
      tags: ['size', 'maintainability'],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0'
    };
  }

  private static getSecurityConfigRule(): ComplianceRule {
    return {
      ruleId: 'SECURITY_CONFIG_CHECK',
      name: 'Security Configuration Check',
      description: 'Verify no sensitive data in configuration files',
      category: 'SECURITY',
      severity: 'CRITICAL',
      scope: 'CONFIG',
      conditions: [
        { field: 'content', operator: 'not_contains', value: 'password' },
        { field: 'content', operator: 'not_contains', value: 'api_key' },
        { field: 'content', operator: 'not_contains', value: 'secret' }
      ],
      canAutoFix: false,
      remediation: 'Remove sensitive data from configuration. Use environment variables or secure vaults.',
      tags: ['security', 'configuration'],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0'
    };
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}