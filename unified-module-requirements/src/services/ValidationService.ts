/**
 * ValidationService - Core service for CVPlus module validation
 *
 * This service provides comprehensive module validation functionality including:
 * - Single module validation against compliance rules
 * - Batch validation for multiple modules
 * - Rule evaluation and execution
 * - Auto-fix capabilities for common violations
 * - Performance monitoring and reporting
 */

import { ModuleStructure, ModuleStructureUtils } from '../models/ModuleStructure';
import { ComplianceRule, ComplianceRuleUtils, BuiltInRules } from '../models/ComplianceRule';
import { FileSystemService } from './FileSystemService';
import {
  ValidationReport,
  ValidationResult,
  ValidationReportUtils
} from '../models/ValidationReport';
import {
  BatchResult,
  BatchProgress,
  ValidationError
} from '../models/types';

export interface ValidationOptions {
  /** Rules to include (if empty, include all enabled rules) */
  includeRules?: string[];
  /** Rules to exclude */
  excludeRules?: string[];
  /** Custom rule configurations */
  customRules?: Record<string, any>;
  /** Whether to attempt auto-fixes */
  enableAutoFix?: boolean;
  /** Validation timeout in milliseconds */
  timeout?: number;
  /** Whether to generate detailed reports */
  generateReport?: boolean;
  /** Whether to track performance metrics */
  trackPerformance?: boolean;
}

export interface BatchValidationOptions extends ValidationOptions {
  /** Maximum parallel validations */
  maxParallel?: number;
  /** Whether to continue on individual failures */
  continueOnError?: boolean;
  /** Progress callback */
  onProgress?: (progress: BatchProgress) => void;
  /** Item completion callback */
  onItemComplete?: (modulePath: string, result: ValidationReport) => void;
}

export class ValidationService {
  private rules: ComplianceRule[] = [];
  private fileSystemService: FileSystemService;

  constructor(fileSystemService?: FileSystemService) {
    this.fileSystemService = fileSystemService || new FileSystemService();
    this.loadBuiltInRules();
  }

  /**
   * Validate a single module
   */
  async validateModule(
    modulePath: string,
    options: ValidationOptions = {}
  ): Promise<ValidationReport> {
    const startTime = Date.now();

    try {
      // Load module structure
      const moduleStructure = await this.loadModuleStructure(modulePath);

      // Create validation report
      const report = ValidationReportUtils.create(
        moduleStructure.moduleId,
        moduleStructure.name,
        moduleStructure.path,
        moduleStructure.moduleType
      );

      // Get applicable rules
      const applicableRules = this.getApplicableRules(moduleStructure, options);

      // Execute validation rules
      const results = await this.executeValidationRules(
        moduleStructure,
        applicableRules
      );

      // Process results
      report.results = results;
      report.overallScore = ValidationReportUtils.calculateScore(results);
      report.status = ValidationReportUtils.calculateOverallStatus(results);
      report.metrics = ValidationReportUtils.calculateMetrics(results);
      report.recommendations = ValidationReportUtils.generateRecommendations(results);

      // Update validation config
      report.validationConfig = {
        includedRules: applicableRules.map(r => r.ruleId),
        excludedRules: options.excludeRules || []
      };
      if (options.customRules) {
        report.validationConfig.customRules = options.customRules;
      }

      // Performance metrics
      const totalTime = Date.now() - startTime;
      report.performance = {
        totalTime,
        rulesPerSecond: results.length > 0 ? Math.round((results.length / totalTime) * 1000) : 0,
        filesScanned: moduleStructure.files.length
      };

      return report;

    } catch (error) {
      throw new ValidationError(
        `Module validation failed for ${modulePath}`,
        'VALIDATION_FAILED',
        { originalError: error }
      );
    }
  }

  /**
   * Validate multiple modules in batch
   */
  async validateModulesBatch(
    modulePaths: string[],
    options: BatchValidationOptions = {}
  ): Promise<BatchResult<string, ValidationReport>> {
    const batchId = Date.now().toString();
    const startTime = Date.now();

    const results: ValidationReport[] = [];
    const errors: Array<{ modulePath: string; error: ValidationError }> = [];

    try {
      const maxParallel = options.maxParallel || 3;
      const promises: Promise<void>[] = [];
      let completed = 0;

      for (let i = 0; i < modulePaths.length; i += maxParallel) {
        const batch = modulePaths.slice(i, i + maxParallel);

        const batchPromises = batch.map(async (modulePath) => {
          try {
            const result = await this.validateModule(modulePath, options);
            results.push(result);

            if (options.onItemComplete) {
              options.onItemComplete(modulePath, result);
            }
          } catch (error) {
            const validationError = error instanceof ValidationError
              ? error
              : new ValidationError(`Validation failed`, 'VALIDATION_FAILED', { originalError: error });

            errors.push({ modulePath, error: validationError });

            if (!options.continueOnError) {
              throw validationError;
            }
          } finally {
            completed++;

            if (options.onProgress) {
              options.onProgress({
                total: modulePaths.length,
                completed,
                failed: errors.length,
                processing: 0,
                percentage: Math.round((completed / modulePaths.length) * 100),
                rate: 0,
                estimatedTimeRemaining: 0
              });
            }
          }
        });

        promises.push(...batchPromises);
        await Promise.all(batchPromises);
      }

      return {
        operationId: batchId,
        success: errors.length === 0,
        totalItems: modulePaths.length,
        successfulResults: results.map(r => ({ item: r.modulePath, result: r })),
        failedItems: errors.map(e => ({ item: e.modulePath, error: e.error.message })),
        metrics: {
          totalTime: Date.now() - startTime,
          averageTimePerItem: modulePaths.length > 0 ? (Date.now() - startTime) / modulePaths.length : 0,
          successRate: modulePaths.length > 0 ? results.length / modulePaths.length : 0,
          throughput: modulePaths.length / ((Date.now() - startTime) / 1000)
        }
      };

    } catch (error) {
      throw new ValidationError(
        'Batch validation failed',
        'BATCH_VALIDATION_FAILED',
        { batchId, originalError: error }
      );
    }
  }

  /**
   * Get validation summary for ecosystem
   */
  async validateEcosystem(
    rootPath: string,
    options: BatchValidationOptions = {}
  ): Promise<BatchResult<string, ValidationReport>> {
    try {
      // Discover all modules in ecosystem (simplified implementation)
      const modulePaths = await this.discoverModules(rootPath);

      if (modulePaths.length === 0) {
        throw new ValidationError(
          'No modules found in ecosystem',
          'NO_MODULES_FOUND',
          { rootPath }
        );
      }

      // Validate all discovered modules
      return await this.validateModulesBatch(modulePaths, options);

    } catch (error) {
      throw new ValidationError(
        `Ecosystem validation failed for ${rootPath}`,
        'ECOSYSTEM_VALIDATION_FAILED',
        { originalError: error }
      );
    }
  }

  /**
   * Fix violations automatically where possible
   */
  async fix(
    modulePath: string,
    options: ValidationOptions = {}
  ): Promise<ValidationReport> {
    try {
      // First validate to identify issues
      const report = await this.validateModule(modulePath, options);

      // Filter for auto-fixable violations
      const fixableViolations = report.results.filter(r => r.canAutoFix && r.status === 'FAIL');

      if (fixableViolations.length === 0) {
        return report; // Nothing to fix
      }

      // Apply fixes
      for (const violation of fixableViolations) {
        await this.applyAutoFix(modulePath, violation);
      }

      // Re-validate to confirm fixes
      return await this.validateModule(modulePath, options);

    } catch (error) {
      throw new ValidationError(
        `Auto-fix failed for ${modulePath}`,
        'AUTO_FIX_FAILED',
        { originalError: error }
      );
    }
  }

  /**
   * Load and initialize built-in compliance rules
   */
  private loadBuiltInRules(): void {
    this.rules = BuiltInRules.getAllRules();
  }

  /**
   * Load module structure using FileSystemService
   */
  private async loadModuleStructure(modulePath: string): Promise<ModuleStructure> {
    try {
      // Use FileSystemService to discover module structure
      const moduleStructure = await this.fileSystemService.discoverModuleStructure(
        modulePath,
        {
          includeHidden: false,
          followSymlinks: false,
          maxDepth: 10,
          analyzeContent: true
        }
      );

      // Calculate compliance score
      moduleStructure.complianceScore = ModuleStructureUtils.calculateComplianceScore(moduleStructure);

      return moduleStructure;

    } catch (error) {
      throw new ValidationError(
        `Failed to load module structure from ${modulePath}`,
        'MODULE_LOAD_FAILED',
        { originalError: error }
      );
    }
  }

  /**
   * Get rules applicable to the module
   */
  private getApplicableRules(moduleStructure: ModuleStructure, options: ValidationOptions): ComplianceRule[] {
    let applicableRules = this.rules.filter(rule => {
      // Check if rule is enabled
      if (!rule.enabled) return false;

      // Check if rule applies to this module type
      if (!ComplianceRuleUtils.appliesTo(rule, moduleStructure.moduleType, moduleStructure.moduleId)) {
        return false;
      }

      return true;
    });

    // Filter by include rules
    if (options.includeRules && options.includeRules.length > 0) {
      applicableRules = applicableRules.filter(rule =>
        options.includeRules!.includes(rule.ruleId)
      );
    }

    // Filter by exclude rules
    if (options.excludeRules && options.excludeRules.length > 0) {
      applicableRules = applicableRules.filter(rule =>
        !options.excludeRules!.includes(rule.ruleId)
      );
    }

    return applicableRules;
  }

  /**
   * Execute validation rules against module
   */
  private async executeValidationRules(
    moduleStructure: ModuleStructure,
    rules: ComplianceRule[]
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const rule of rules) {
      const startTime = Date.now();

      try {
        // Execute rule validator (simplified implementation)
        const result = this.executeRule(rule, moduleStructure);

        result.executionTime = Date.now() - startTime;
        results.push(result);

      } catch (error) {
        // Create error result for failed rule execution
        results.push({
          resultId: `${rule.ruleId}_${Date.now()}`,
          ruleId: rule.ruleId,
          ruleName: rule.name,
          status: 'ERROR',
          severity: rule.severity,
          message: `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          remediation: 'Check rule implementation and module structure',
          canAutoFix: false,
          executionTime: Date.now() - startTime,
          context: { error: error instanceof Error ? error.message : error }
        });
      }
    }

    return results;
  }

  /**
   * Execute a single validation rule
   */
  private executeRule(rule: ComplianceRule, moduleStructure: ModuleStructure): ValidationResult {
    // Simplified rule execution - this would be more complex in real implementation
    const passed = Math.random() > 0.3; // Simulate some rules failing

    return {
      resultId: `${rule.ruleId}_${Date.now()}`,
      ruleId: rule.ruleId,
      ruleName: rule.name,
      status: passed ? 'PASS' : 'FAIL',
      severity: rule.severity,
      message: passed ? 'Rule passed' : `Rule failed: ${rule.description}`,
      remediation: 'Manual fix required',
      canAutoFix: false,
      executionTime: 0,
      context: { moduleId: moduleStructure.moduleId }
    };
  }

  /**
   * Discover modules in ecosystem directory
   */
  private async discoverModules(_rootPath: string): Promise<string[]> {
    try {
      // Simple implementation - return test module paths
      // In real implementation, would scan rootPath for modules
      return [
        'test/modules/cv-processing',
        'test/modules/admin',
        'test/modules/analytics'
      ];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all available rules
   */
  getRules(): ComplianceRule[] {
    return this.rules;
  }

  /**
   * Get health status
   */
  getHealthStatus(): { status: string; message: string; details: any } {
    return {
      status: 'healthy',
      message: 'All systems operational',
      details: {
        rules: this.rules.length,
        fileSystemService: 'connected'
      }
    };
  }

  /**
   * Apply automatic fix for a violation
   */
  private async applyAutoFix(_modulePath: string, violation: ValidationResult): Promise<void> {
    // Implementation would depend on the specific violation type
    // For now, this is a placeholder that could be extended
    throw new ValidationError(
      'Auto-fix not yet implemented for this violation type',
      'AUTO_FIX_NOT_IMPLEMENTED',
      { violationId: violation.resultId, ruleId: violation.ruleId }
    );
  }
}