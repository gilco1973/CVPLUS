#!/usr/bin/env node

/**
 * CVPlus Module Validator CLI
 *
 * Command-line interface for validating CVPlus modules against compliance rules.
 * Supports single module validation, batch validation, and various output formats.
 *
 * Usage:
 *   cvplus-validator validate <path> [options]
 *   cvplus-validator batch <pattern> [options]
 *   cvplus-validator rules [options]
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { ValidationService } from '../services/ValidationService.js';
import { ValidationReport } from '../models/ValidationReport.js';
// import { ComplianceRule } from '../models/ComplianceRule.js';
// import { createSystemEvent, SystemEvent } from '../models/types.js';

interface ValidateOptions {
  /** Output format */
  format?: 'json' | 'table' | 'summary';
  /** Output file path */
  output?: string;
  /** Rules to include */
  include?: string[];
  /** Rules to exclude */
  exclude?: string[];
  /** Enable auto-fix */
  autofix?: boolean;
  /** Validation timeout */
  timeout?: number;
  /** Verbose output */
  verbose?: boolean;
  /** Show only violations */
  onlyViolations?: boolean;
  /** Minimum score threshold */
  minScore?: number;
}

interface BatchValidateOptions extends ValidateOptions {
  /** Maximum parallel validations */
  parallel?: number;
  /** Continue on errors */
  continueOnError?: boolean;
  /** Generate summary report */
  summary?: boolean;
}

interface RulesOptions {
  /** Filter by category */
  category?: string;
  /** Filter by severity */
  severity?: string;
  /** Show rule details */
  details?: boolean;
  /** Output format */
  format?: 'table' | 'json';
}

class ValidatorCLI {
  private validationService: ValidationService;
  private program: Command;

  constructor() {
    this.validationService = new ValidationService();
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('cvplus-validator')
      .description('CVPlus Module Compliance Validator')
      .version('1.0.0');

    // Validate single module command
    this.program
      .command('validate')
      .description('Validate a single module')
      .argument('<path>', 'Path to module directory')
      .option('-f, --format <format>', 'Output format (json|table|summary)', 'table')
      .option('-o, --output <file>', 'Output file path')
      .option('--include <rules...>', 'Include specific rules')
      .option('--exclude <rules...>', 'Exclude specific rules')
      .option('--autofix', 'Enable auto-fix for violations')
      .option('--timeout <ms>', 'Validation timeout in milliseconds', '30000')
      .option('-v, --verbose', 'Verbose output')
      .option('--only-violations', 'Show only violations')
      .option('--min-score <score>', 'Minimum score threshold', '0')
      .action(async (modulePath: string, options: ValidateOptions) => {
        await this.validateModule(modulePath, options);
      });

    // Batch validate command
    this.program
      .command('batch')
      .description('Validate multiple modules')
      .argument('<pattern>', 'Glob pattern for module directories')
      .option('-f, --format <format>', 'Output format (json|table|summary)', 'table')
      .option('-o, --output <file>', 'Output file path')
      .option('--include <rules...>', 'Include specific rules')
      .option('--exclude <rules...>', 'Exclude specific rules')
      .option('--autofix', 'Enable auto-fix for violations')
      .option('--timeout <ms>', 'Validation timeout in milliseconds', '30000')
      .option('--parallel <count>', 'Maximum parallel validations', '5')
      .option('--continue-on-error', 'Continue validation on individual failures')
      .option('--summary', 'Generate ecosystem summary report')
      .option('-v, --verbose', 'Verbose output')
      .option('--only-violations', 'Show only violations')
      .option('--min-score <score>', 'Minimum score threshold', '0')
      .action(async (pattern: string, options: BatchValidateOptions) => {
        await this.batchValidate(pattern, options);
      });

    // List and filter rules command
    this.program
      .command('rules')
      .description('List available compliance rules')
      .option('-c, --category <category>', 'Filter by category')
      .option('-s, --severity <severity>', 'Filter by severity')
      .option('-d, --details', 'Show detailed rule information')
      .option('-f, --format <format>', 'Output format (table|json)', 'table')
      .action(async (options: RulesOptions) => {
        await this.listRules(options);
      });

    // Health check command
    this.program
      .command('health')
      .description('Check validator health and configuration')
      .action(async () => {
        await this.checkHealth();
      });
  }

  async run(): Promise<void> {
    try {
      await this.program.parseAsync(process.argv);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async validateModule(modulePath: string, options: ValidateOptions): Promise<void> {
    const startTime = Date.now();

    try {
      // Resolve and validate path
      const resolvedPath = path.resolve(modulePath);
      await this.validatePath(resolvedPath);

      console.log(`🔍 Validating module: ${resolvedPath}`);
      if (options.verbose) {
        console.log(`⚙️ Options:`, {
          format: options.format,
          autofix: options.autofix,
          timeout: options.timeout,
          include: options.include,
          exclude: options.exclude
        });
      }

      // Perform validation
      const validationOptions: any = {
        timeout: parseInt(String(options.timeout || '30000')),
        generateReport: true,
        trackPerformance: true
      };
      if (options.include) validationOptions.includeRules = options.include;
      if (options.exclude) validationOptions.excludeRules = options.exclude;
      if (options.autofix !== undefined) validationOptions.enableAutoFix = options.autofix;

      const report = await this.validationService.validateModule(resolvedPath, validationOptions);

      // Check minimum score threshold
      if (options.minScore && report.overallScore < parseInt(String(options.minScore))) {
        console.error(`❌ Module score ${report.overallScore} below minimum threshold ${options.minScore}`);
        process.exit(1);
      }

      // Generate output
      await this.outputReport(report, options);

      // Show summary
      const duration = Date.now() - startTime;
      const status = this.getStatusEmoji(report.status);
      console.log(`\n${status} Validation completed in ${duration}ms`);
      console.log(`📊 Score: ${report.overallScore}/100`);
      console.log(`📋 Rules: ${report.metrics.totalRules} evaluated, ${report.metrics.failedRules} violations`);

      // Exit with error code if validation failed
      if (report.status === 'FAIL' || report.status === 'ERROR') {
        process.exit(1);
      }

    } catch (error) {
      console.error(`❌ Validation failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private async batchValidate(pattern: string, options: BatchValidateOptions): Promise<void> {
    const startTime = Date.now();

    try {
      // Find matching directories
      const paths = await this.findModulePaths(pattern);
      if (paths.length === 0) {
        console.log(`⚠️ No modules found matching pattern: ${pattern}`);
        return;
      }

      console.log(`🔍 Found ${paths.length} modules to validate`);
      if (options.verbose) {
        paths.forEach(p => console.log(`  📁 ${p}`));
      }

      // Setup progress tracking
      let completed = 0;
      const reports: ValidationReport[] = [];
      // const failures: { path: string; error: string }[] = [];

      const onProgress = (progress: any) => {
        if (options.verbose) {
          console.log(`⏳ Progress: ${progress.completed}/${progress.total} (${progress.percentage}%)`);
        }
      };

      const onItemComplete = (modulePath: string, result: ValidationReport) => {
        completed++;
        reports.push(result);

        const status = this.getStatusEmoji(result.status);
        const score = result.overallScore;
        console.log(`${status} ${path.basename(modulePath)}: ${score}/100 (${completed}/${paths.length})`);
      };

      // Perform batch validation
      const batchOptions: any = {
        timeout: parseInt(String(options.timeout || '30000')),
        maxParallel: parseInt(String(options.parallel || '5')),
        onProgress,
        onItemComplete
      };
      if (options.include) batchOptions.includeRules = options.include;
      if (options.exclude) batchOptions.excludeRules = options.exclude;
      if (options.autofix !== undefined) batchOptions.enableAutoFix = options.autofix;
      if (options.continueOnError !== undefined) batchOptions.continueOnError = options.continueOnError;

      const batchResult = await this.validationService.validateModulesBatch(paths, batchOptions);

      // Generate summary report if requested
      if (options.summary) {
        await this.generateSummaryReport(reports, options);
      }

      // Show batch results
      const duration = Date.now() - startTime;
      console.log(`\n📊 Batch Validation Results:`);
      console.log(`   Duration: ${Math.round(duration / 1000)}s`);
      console.log(`   Modules: ${batchResult.totalItems}`);
      console.log(`   Success: ${batchResult.successfulResults.length}`);
      console.log(`   Failed: ${batchResult.failedItems.length}`);
      console.log(`   Success Rate: ${Math.round(batchResult.metrics.successRate * 100)}%`);
      console.log(`   Avg Score: ${Math.round(reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length)}/100`);

      // Show failures if any
      if (batchResult.failedItems.length > 0) {
        console.log(`\n❌ Failed Validations:`);
        batchResult.failedItems.forEach(item => {
          console.log(`   ${path.basename(item.item)}: ${item.error}`);
        });
      }

      // Exit with error if there were failures and not continuing on error
      if (batchResult.failedItems.length > 0 && !options.continueOnError) {
        process.exit(1);
      }

    } catch (error) {
      console.error(`❌ Batch validation failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private async listRules(options: RulesOptions): Promise<void> {
    try {
      const rules = this.validationService.getRules();

      if (rules.length === 0) {
        console.log('No rules found matching criteria');
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(rules, null, 2));
        return;
      }

      // Table format
      console.log(`📋 Available Compliance Rules (${rules.length} rules):\n`);

      rules.forEach(rule => {
        const severityIcon = this.getSeverityIcon(rule.severity);
        const categoryIcon = this.getCategoryIcon(rule.category);

        console.log(`${severityIcon} ${rule.ruleId}`);
        console.log(`   ${categoryIcon} ${rule.category} | ${rule.name}`);

        if (options.details) {
          console.log(`   📝 ${rule.description}`);
          if (rule.canAutoFix) {
            console.log(`   🔧 Auto-fixable`);
          }
          if (rule.tags.length > 0) {
            console.log(`   🏷️ Tags: ${rule.tags.join(', ')}`);
          }
        }

        console.log();
      });

    } catch (error) {
      console.error(`❌ Failed to list rules: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private async checkHealth(): Promise<void> {
    try {
      const health = await this.validationService.getHealthStatus();
      const status = health.status === 'healthy' ? '✅' : health.status === 'degraded' ? '⚠️' : '❌';

      console.log(`${status} Validator Health Status: ${health.status.toUpperCase()}`);
      console.log(`\n📊 Details:`);

      if (health.details) {
        Object.entries(health.details).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }

      if (health.status !== 'healthy') {
        process.exit(1);
      }

    } catch (error) {
      console.error(`❌ Health check failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private async validatePath(modulePath: string): Promise<void> {
    try {
      const stats = await fs.stat(modulePath);
      if (!stats.isDirectory()) {
        throw new Error('Path must be a directory');
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Module path does not exist: ${modulePath}`);
      }
      throw error;
    }
  }

  private async findModulePaths(pattern: string): Promise<string[]> {
    try {
      const matches = await glob(pattern + '/');
      return matches.map(match => path.resolve(match));
    } catch (err) {
      throw err;
    }
  }

  private async outputReport(report: ValidationReport, options: ValidateOptions): Promise<void> {
    const output = this.formatReport(report, options);

    if (options.output) {
      await fs.writeFile(options.output, output, 'utf-8');
      console.log(`📄 Report saved to: ${options.output}`);
    } else {
      console.log(output);
    }
  }

  private formatReport(report: ValidationReport, options: ValidateOptions): string {
    switch (options.format) {
      case 'json':
        return JSON.stringify(report, null, 2);

      case 'summary':
        return this.formatSummary(report, options);

      case 'table':
      default:
        return this.formatTable(report, options);
    }
  }

  private formatSummary(report: ValidationReport, _options: ValidateOptions): string {
    const lines = [];
    const status = this.getStatusEmoji(report.status);

    lines.push(`${status} ${report.moduleName} (${report.moduleType})`);
    lines.push(`📊 Score: ${report.overallScore}/100`);
    lines.push(`📋 Rules: ${report.metrics.totalRules} evaluated, ${report.metrics.failedRules} violations`);

    if (report.metrics.autoFixableViolations > 0) {
      lines.push(`🔧 ${report.metrics.autoFixableViolations} violations can be auto-fixed`);
    }

    if (report.recommendations.length > 0) {
      lines.push(`\n💡 Top Recommendations:`);
      report.recommendations.slice(0, 3).forEach(rec => {
        lines.push(`   • ${rec.title}`);
      });
    }

    return lines.join('\n');
  }

  private formatTable(report: ValidationReport, options: ValidateOptions): string {
    const lines = [];

    // Header
    lines.push(`\n📋 Validation Report: ${report.moduleName}`);
    lines.push(''.padEnd(60, '='));

    // Overview
    const status = this.getStatusEmoji(report.status);
    lines.push(`${status} Overall Status: ${report.status}`);
    lines.push(`📊 Compliance Score: ${report.overallScore}/100`);
    lines.push(`📁 Module Path: ${report.modulePath}`);
    lines.push(`⏱️ Validation Time: ${report.performance.totalTime}ms`);
    lines.push('');

    // Filter results if needed
    let results = report.results;
    if (options.onlyViolations) {
      results = results.filter(r => r.status === 'FAIL' || r.status === 'WARNING');
    }

    if (results.length === 0) {
      lines.push('✅ No violations found!');
      return lines.join('\n');
    }

    // Results table
    lines.push('📋 Validation Results:');
    lines.push(''.padEnd(60, '-'));

    results.forEach(result => {
      const statusIcon = this.getStatusEmoji(result.status);
      const severityIcon = this.getSeverityIcon(result.severity);

      lines.push(`${statusIcon} ${result.ruleName}`);
      lines.push(`   ${severityIcon} ${result.severity} | ${result.ruleId}`);
      lines.push(`   💬 ${result.message}`);

      if (result.filePath) {
        lines.push(`   📁 ${result.filePath}${result.lineNumber ? ':' + result.lineNumber : ''}`);
      }

      if (result.canAutoFix) {
        lines.push(`   🔧 Auto-fixable`);
      }

      if (options.verbose && result.remediation) {
        lines.push(`   💡 ${result.remediation}`);
      }

      lines.push('');
    });

    // Summary
    lines.push('📊 Summary:');
    lines.push(`   Total Rules: ${report.metrics.totalRules}`);
    lines.push(`   Passed: ${report.metrics.passedRules}`);
    lines.push(`   Failed: ${report.metrics.failedRules}`);
    lines.push(`   Warnings: ${report.metrics.warningRules}`);
    if (report.metrics.autoFixableViolations > 0) {
      lines.push(`   Auto-fixable: ${report.metrics.autoFixableViolations}`);
    }

    return lines.join('\n');
  }

  private async generateSummaryReport(reports: ValidationReport[], options: BatchValidateOptions): Promise<void> {
    // This would integrate with ReportingService when implemented
    const summary = {
      totalModules: reports.length,
      averageScore: Math.round(reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length),
      passedModules: reports.filter(r => r.status === 'PASS').length,
      failedModules: reports.filter(r => r.status === 'FAIL').length,
      timestamp: new Date().toISOString()
    };

    if (options.output) {
      const summaryPath = options.output.replace(/\.[^.]+$/, '-summary.json');
      await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
      console.log(`📄 Summary report saved to: ${summaryPath}`);
    }
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'PASS': return '✅';
      case 'WARNING': return '⚠️';
      case 'FAIL': return '❌';
      case 'ERROR': return '💥';
      case 'PARTIAL': return '🔄';
      default: return '❓';
    }
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return '🔴';
      case 'ERROR': return '🟠';
      case 'WARNING': return '🟡';
      case 'INFO': return '🔵';
      default: return '⚪';
    }
  }

  private getCategoryIcon(category: string): string {
    switch (category) {
      case 'STRUCTURE': return '🏗️';
      case 'DOCUMENTATION': return '📚';
      case 'CONFIGURATION': return '⚙️';
      case 'TESTING': return '🧪';
      case 'SECURITY': return '🔒';
      case 'PERFORMANCE': return '⚡';
      case 'DEPENDENCIES': return '📦';
      case 'STANDARDS': return '📏';
      case 'INTEGRATION': return '🔗';
      default: return '📋';
    }
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new ValidatorCLI();
  cli.run();
}

export { ValidatorCLI };