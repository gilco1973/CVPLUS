/**
 * ModuleStructure - Core data model for representing CVPlus module structure
 *
 * This model defines the complete structure of a CVPlus module including:
 * - Physical file/directory layout
 * - Package configuration and dependencies
 * - Build and development scripts
 * - Documentation and testing structure
 * - Git submodule integration details
 */

export interface ModuleFile {
  /** Relative path from module root */
  path: string;
  /** File content type */
  type: 'typescript' | 'javascript' | 'json' | 'markdown' | 'config' | 'test' | 'other';
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  lastModified: Date;
  /** Whether file is required for compliance */
  required: boolean;
  /** File content hash for change detection */
  contentHash?: string;
}

export interface ModuleDependency {
  /** Package name */
  name: string;
  /** Version constraint */
  version: string;
  /** Dependency type */
  type: 'production' | 'development' | 'peer' | 'optional';
  /** Whether this is a CVPlus submodule dependency */
  isCVPlusModule: boolean;
}

export interface ModuleScript {
  /** Script name */
  name: string;
  /** Script command */
  command: string;
  /** Script description */
  description?: string;
  /** Whether script is required for compliance */
  required: boolean;
}

export interface GitSubmoduleInfo {
  /** Submodule path relative to parent repo */
  path: string;
  /** Remote repository URL */
  url: string;
  /** Current commit hash */
  commit: string;
  /** Branch being tracked */
  branch: string;
  /** Whether submodule is properly initialized */
  initialized: boolean;
}

export interface ModuleStructure {
  /** Unique module identifier */
  moduleId: string;

  /** Module display name */
  name: string;

  /** Module description */
  description: string;

  /** Module type/category */
  moduleType: 'backend-api' | 'frontend-component' | 'utility-lib' | 'shared-types' | 'cli-tool' | 'service' | 'other';

  /** Absolute path to module directory */
  path: string;

  /** Module version from package.json */
  version: string;

  /** Module author/maintainer */
  author?: string;

  /** License information */
  license?: string;

  /** All files in the module */
  files: ModuleFile[];

  /** Package dependencies */
  dependencies: ModuleDependency[];

  /** Package scripts */
  scripts: ModuleScript[];

  /** Git submodule configuration (if applicable) */
  gitSubmodule?: GitSubmoduleInfo;

  /** Whether module has TypeScript configuration */
  hasTypeScript: boolean;

  /** Whether module has test configuration */
  hasTests: boolean;

  /** Whether module has documentation */
  hasDocumentation: boolean;

  /** Whether module has build configuration */
  hasBuildConfig: boolean;

  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;

  /** Compliance score (0-100) */
  complianceScore?: number;

  /** Custom metadata */
  metadata: Record<string, any>;
}

/**
 * Validation schema for ModuleStructure
 * Ensures all required fields are present and valid
 */
export class ModuleStructureValidator {
  /**
   * Validate a complete ModuleStructure object
   */
  static validate(structure: Partial<ModuleStructure>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!structure.moduleId) {
      errors.push('moduleId is required');
    } else if (!/^[a-z0-9-]+$/.test(structure.moduleId)) {
      errors.push('moduleId must contain only lowercase letters, numbers, and hyphens');
    }

    if (!structure.name) {
      errors.push('name is required');
    }

    if (!structure.path) {
      errors.push('path is required');
    }

    if (!structure.moduleType) {
      errors.push('moduleType is required');
    }

    if (!structure.version) {
      errors.push('version is required');
    } else if (!/^\d+\.\d+\.\d+/.test(structure.version)) {
      warnings.push('version should follow semantic versioning (x.y.z)');
    }

    // File structure validation
    if (!structure.files || structure.files.length === 0) {
      errors.push('files array cannot be empty');
    } else {
      const requiredFiles = ['package.json', 'README.md'];
      const filesPaths = structure.files.map(f => f.path);

      for (const requiredFile of requiredFiles) {
        if (!filesPaths.includes(requiredFile)) {
          errors.push(`Required file missing: ${requiredFile}`);
        }
      }
    }

    // Dependency validation
    if (structure.dependencies) {
      for (const dep of structure.dependencies) {
        if (!dep.name || !dep.version || !dep.type) {
          errors.push(`Invalid dependency: ${dep.name || 'unknown'}`);
        }
      }
    }

    // TypeScript project validation
    if (structure.hasTypeScript) {
      const hasTypescriptConfig = structure.files?.some(f => f.path === 'tsconfig.json');
      if (!hasTypescriptConfig) {
        errors.push('TypeScript projects must have tsconfig.json');
      }
    }

    // Test configuration validation
    if (structure.hasTests) {
      const hasTestDir = structure.files?.some(f => f.path.startsWith('tests/') || f.path.startsWith('test/'));
      const hasTestScripts = structure.scripts?.some(s => s.name.includes('test'));

      if (!hasTestDir && !hasTestScripts) {
        warnings.push('Module marked as having tests but no test directory or scripts found');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate ModuleFile object
   */
  static validateFile(file: Partial<ModuleFile>): ValidationResult {
    const errors: string[] = [];

    if (!file.path) {
      errors.push('file path is required');
    }

    if (!file.type) {
      errors.push('file type is required');
    }

    if (file.size !== undefined && file.size < 0) {
      errors.push('file size cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Validate ModuleDependency object
   */
  static validateDependency(dependency: Partial<ModuleDependency>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!dependency.name) {
      errors.push('dependency name is required');
    }

    if (!dependency.version) {
      errors.push('dependency version is required');
    }

    if (!dependency.type) {
      errors.push('dependency type is required');
    } else if (!['production', 'development', 'peer', 'optional'].includes(dependency.type)) {
      errors.push('dependency type must be one of: production, development, peer, optional');
    }

    // Check for CVPlus module naming convention
    if (dependency.name?.startsWith('@cvplus/') && !dependency.isCVPlusModule) {
      warnings.push('Dependency appears to be a CVPlus module but isCVPlusModule is false');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Utility functions for working with ModuleStructure
 */
export class ModuleStructureUtils {
  /**
   * Create a new ModuleStructure with default values
   */
  static create(moduleId: string, name: string, path: string, moduleType: ModuleStructure['moduleType']): ModuleStructure {
    return {
      moduleId,
      name,
      description: '',
      moduleType,
      path,
      version: '1.0.0',
      files: [],
      dependencies: [],
      scripts: [],
      hasTypeScript: false,
      hasTests: false,
      hasDocumentation: false,
      hasBuildConfig: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {}
    };
  }

  /**
   * Check if module is a CVPlus submodule
   */
  static isCVPlusSubmodule(structure: ModuleStructure): boolean {
    return structure.path.includes('/packages/') && !!structure.gitSubmodule;
  }

  /**
   * Get required files for a specific module type
   */
  static getRequiredFiles(moduleType: ModuleStructure['moduleType']): string[] {
    const base = ['package.json', 'README.md'];

    switch (moduleType) {
      case 'backend-api':
        return [...base, 'src/index.ts', 'tsconfig.json'];
      case 'frontend-component':
        return [...base, 'src/index.tsx', 'tsconfig.json'];
      case 'utility-lib':
        return [...base, 'src/index.ts', 'tsconfig.json'];
      case 'shared-types':
        return [...base, 'src/types.ts', 'tsconfig.json'];
      case 'cli-tool':
        return [...base, 'src/cli.ts', 'tsconfig.json'];
      case 'service':
        return [...base, 'src/service.ts', 'tsconfig.json'];
      default:
        return base;
    }
  }

  /**
   * Calculate compliance score based on structure
   */
  static calculateComplianceScore(structure: ModuleStructure): number {
    let score = 100;
    const validation = ModuleStructureValidator.validate(structure);

    // Deduct points for errors and warnings
    score -= validation.errors.length * 10;
    score -= validation.warnings.length * 5;

    // Check for best practices
    if (!structure.hasTypeScript && structure.moduleType !== 'other') {
      score -= 15; // TypeScript is strongly encouraged
    }

    if (!structure.hasTests) {
      score -= 20; // Tests are critical
    }

    if (!structure.hasDocumentation) {
      score -= 10; // Documentation is important
    }

    // Bonus points for good practices
    if (structure.files.some(f => f.path === '.gitignore')) {
      score += 2;
    }

    if (structure.files.some(f => f.path === 'jest.config.js' || f.path === 'vitest.config.ts')) {
      score += 3;
    }

    return Math.max(0, Math.min(100, score));
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}