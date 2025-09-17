#!/usr/bin/env node

import { Command } from 'commander';
import { AutoFixService, AutoFixOptions } from '../services/AutoFixService.js';
import { ValidationService } from '../services/ValidationService.js';
import { ValidationResult } from '../models/ValidationReport.js';
import * as fs from 'fs/promises';
import chalk from 'chalk';

interface AutoFixCliOptions {
  dryRun?: boolean;
  backup?: boolean;
  backupDir?: string;
  maxFiles?: string;
  aggressive?: boolean;
  rules?: string;
  excludeRules?: string;
  output?: string;
  verbose?: boolean;
  interactive?: boolean;
  confirmHigh?: boolean;
  showStrategy?: boolean;
}

export class AutoFixCli {
  private autoFixService: AutoFixService;
  private validationService: ValidationService;

  constructor() {
    this.autoFixService = new AutoFixService();
    this.validationService = new ValidationService();
  }

  /**
   * Create CLI command
   */
  createCommand(): Command {
    const command = new Command('auto-fix')
      .description('Automatically fix validation violations')
      .argument('[paths...]', 'Module paths to fix', ['.'])
      .option('-r, --rules <rules>', 'Only fix specific rules (comma-separated)')
      .option('--exclude-rules <rules>', 'Skip specific rules (comma-separated)')
      .option('--dry-run', 'Show what would be fixed without making changes')
      .option('--no-backup', 'Skip creating backup files')
      .option('--backup-dir <dir>', 'Custom backup directory')
      .option('--max-files <number>', 'Maximum number of files to fix', '100')
      .option('--aggressive', 'Enable aggressive fixes (higher risk)')
      .option('-o, --output <format>', 'Output format (summary|detailed|json)', 'summary')
      .option('-v, --verbose', 'Enable verbose output')
      .option('-i, --interactive', 'Interactive mode with confirmations')
      .option('--confirm-high', 'Confirm high-risk fixes')
      .option('--show-strategy', 'Show available fix strategies')
      .action(async (paths: string[], options: AutoFixCliOptions) => {
        try {
          await this.run(paths, options);
        } catch (error) {
          console.error(chalk.red(`Error: ${error}`));
          process.exit(1);
        }
      });

    return command;
  }

  /**
   * Run auto-fix command
   */
  async run(paths: string[], options: AutoFixCliOptions): Promise<void> {
    if (options.showStrategy) {
      this.showAvailableStrategies();
      return;
    }

    if (options.verbose) {
      console.log(chalk.blue('🔧 Starting auto-fix process...'));
      console.log(chalk.gray(`Paths: ${paths.join(', ')}`));
      console.log(chalk.gray(`Options: ${JSON.stringify(options, null, 2)}`));
    }

    // Parse options
    const autoFixOptions: AutoFixOptions = {
      dryRun: options.dryRun || false,
      backupFiles: options.backup !== false,
      backupDirectory: options.backupDir || './.umr-backup',
      maxFilesToFix: parseInt(options.maxFiles || '100', 10),
      aggressiveMode: options.aggressive || false
    };

    // Only add array properties if they have values
    if (options.rules) {
      autoFixOptions.includeRules = options.rules.split(',');
    }
    if (options.excludeRules) {
      autoFixOptions.skipRules = options.excludeRules.split(',');
    }

    let totalFixedViolations = 0;
    let totalFailedFixes = 0;
    let totalSkippedViolations = 0;
    const allResults: any[] = [];

    for (const modulePath of paths) {
      if (options.verbose) {
        console.log(chalk.blue(`\n📁 Processing module: ${modulePath}`));
      }

      try {
        // Validate module to get violations
        const violations = await this.getModuleViolations(modulePath);

        if (violations.length === 0) {
          if (options.verbose) {
            console.log(chalk.green(`✅ No violations found in ${modulePath}`));
          }
          continue;
        }

        // Filter violations based on options
        const filteredViolations = await this.filterViolations(violations, modulePath, autoFixOptions);

        if (filteredViolations.length === 0) {
          if (options.verbose) {
            console.log(chalk.yellow(`⚠️  No fixable violations in ${modulePath}`));
          }
          continue;
        }

        // Interactive confirmation for high-risk fixes
        if (options.interactive || options.confirmHigh) {
          const confirmed = await this.confirmFixes(filteredViolations, modulePath, options);
          if (!confirmed) {
            console.log(chalk.yellow(`⏭️  Skipped module: ${modulePath}`));
            continue;
          }
        }

        // Apply fixes
        const result = await this.autoFixService.applyBatchAutoFix(
          filteredViolations,
          modulePath,
          autoFixOptions
        );

        totalFixedViolations += result.summary.fixedViolations;
        totalFailedFixes += result.summary.failedFixes;
        totalSkippedViolations += result.summary.skippedViolations;
        allResults.push({ modulePath, result });

        // Display module results
        this.displayModuleResults(modulePath, result, options);

      } catch (error) {
        console.error(chalk.red(`❌ Failed to process ${modulePath}: ${error}`));
        totalFailedFixes++;
      }
    }

    // Display summary
    this.displaySummary({
      totalFixedViolations,
      totalFailedFixes,
      totalSkippedViolations,
      processedModules: paths.length
    }, options);

    // Save results if requested
    if (options.output === 'json' && options.output) {
      await this.saveResults(allResults, options.output);
    }

    // Exit with appropriate code
    if (totalFailedFixes > 0) {
      process.exit(1);
    }
  }

  /**
   * Get validation violations for a module
   */
  private async getModuleViolations(modulePath: string): Promise<ValidationResult[]> {
    // Use validation options to specify which rules to run
    const validationOptions = {
      includeRules: [
        'moduleStructure',
        'fileSize',
        'dependencyValidation',
        'codeQuality',
        'security'
      ]
    };

    const report = await this.validationService.validateModule(modulePath, validationOptions);
    return report.results.filter(result => result.status === 'FAIL' || result.status === 'WARNING');
  }

  /**
   * Filter violations based on auto-fix capability and options
   */
  private async filterViolations(
    violations: ValidationResult[],
    modulePath: string,
    options: AutoFixOptions
  ): Promise<ValidationResult[]> {
    const filteredViolations = [];

    for (const violation of violations) {
      // Check if rule should be included/excluded
      if (options.includeRules && !options.includeRules.includes(violation.ruleId)) {
        continue;
      }

      if (options.skipRules?.includes(violation.ruleId)) {
        continue;
      }

      // Check if violation can be auto-fixed
      const canFix = await this.autoFixService.canAutoFix(violation, modulePath);
      if (canFix) {
        filteredViolations.push(violation);
      }
    }

    return filteredViolations;
  }

  /**
   * Confirm fixes with user in interactive mode
   */
  private async confirmFixes(
    violations: ValidationResult[],
    modulePath: string,
    options: AutoFixCliOptions
  ): Promise<boolean> {
    console.log(chalk.cyan(`\n🔍 Found ${violations.length} fixable violations in ${modulePath}:`));

    // Group violations by risk level
    const strategies = this.autoFixService.getFixStrategies();
    const riskGroups = {
      low: [] as ValidationResult[],
      medium: [] as ValidationResult[],
      high: [] as ValidationResult[]
    };

    violations.forEach(violation => {
      const strategy = strategies.find(s => s.ruleId === violation.ruleId);
      const riskLevel = strategy?.riskLevel || 'medium';
      riskGroups[riskLevel].push(violation);
    });

    // Display violations by risk level
    Object.entries(riskGroups).forEach(([risk, viols]) => {
      if (viols.length > 0) {
        const color = risk === 'high' ? chalk.red : risk === 'medium' ? chalk.yellow : chalk.green;
        console.log(color(`\n${risk.toUpperCase()} RISK (${viols.length} violations):`));
        viols.forEach(violation => {
          const strategy = strategies.find(s => s.ruleId === violation.ruleId);
          console.log(`  • ${violation.ruleId}: ${strategy?.description || violation.message}`);
        });
      }
    });

    // Confirm high-risk fixes if required
    if (options.confirmHigh && riskGroups.high.length > 0) {
      const answer = await this.promptUser(
        chalk.red(`⚠️  Apply ${riskGroups.high.length} high-risk fixes? (y/N): `)
      );
      if (!answer.toLowerCase().startsWith('y')) {
        return false;
      }
    }

    // Confirm all fixes in interactive mode
    if (options.interactive) {
      const answer = await this.promptUser(
        chalk.cyan(`\n🔧 Apply all ${violations.length} fixes? (Y/n): `)
      );
      return !answer.toLowerCase().startsWith('n');
    }

    return true;
  }

  /**
   * Prompt user for input
   */
  private async promptUser(question: string): Promise<string> {
    process.stdout.write(question);
    return new Promise((resolve) => {
      process.stdin.once('data', (data) => {
        resolve(data.toString().trim());
      });
    });
  }

  /**
   * Display results for a single module
   */
  private displayModuleResults(modulePath: string, result: any, options: AutoFixCliOptions): void {
    const { summary } = result;

    if (options.output === 'summary') {
      const statusIcon = summary.failedFixes > 0 ? '❌' : summary.fixedViolations > 0 ? '✅' : '⚪';
      console.log(
        `${statusIcon} ${modulePath}: ${chalk.green(summary.fixedViolations)} fixed, ` +
        `${chalk.red(summary.failedFixes)} failed, ${chalk.gray(summary.skippedViolations)} skipped`
      );

      if (summary.filesModified > 0) {
        console.log(chalk.gray(`   Modified ${summary.filesModified} files`));
      }

      if (summary.backupsCreated > 0) {
        console.log(chalk.gray(`   Created ${summary.backupsCreated} backups`));
      }

    } else if (options.output === 'detailed') {
      console.log(chalk.blue(`\n📊 Results for ${modulePath}:`));
      console.log(`  Fixed violations: ${chalk.green(summary.fixedViolations)}`);
      console.log(`  Failed fixes: ${chalk.red(summary.failedFixes)}`);
      console.log(`  Skipped violations: ${chalk.gray(summary.skippedViolations)}`);
      console.log(`  Files modified: ${summary.filesModified}`);
      console.log(`  Backups created: ${summary.backupsCreated}`);
      console.log(`  Duration: ${result.duration}ms`);

      if (options.verbose && result.results.length > 0) {
        console.log(chalk.gray('\n  Individual fixes:'));
        result.results.forEach((fixResult: any) => {
          const statusIcon = fixResult.status === 'success' ? '✅' :
                            fixResult.status === 'failed' ? '❌' : '⚪';
          console.log(`    ${statusIcon} ${fixResult.ruleId}: ${fixResult.status}`);

          if (fixResult.appliedFixes.length > 0) {
            fixResult.appliedFixes.forEach((fix: any) => {
              console.log(chalk.gray(`      - ${fix.description}`));
            });
          }

          if (fixResult.errorMessage) {
            console.log(chalk.red(`      Error: ${fixResult.errorMessage}`));
          }
        });
      }
    }
  }

  /**
   * Display overall summary
   */
  private displaySummary(summary: {
    totalFixedViolations: number;
    totalFailedFixes: number;
    totalSkippedViolations: number;
    processedModules: number;
  }, options: AutoFixCliOptions): void {
    console.log(chalk.blue('\n📋 Auto-fix Summary:'));
    console.log(`  Processed modules: ${summary.processedModules}`);
    console.log(`  Fixed violations: ${chalk.green(summary.totalFixedViolations)}`);
    console.log(`  Failed fixes: ${chalk.red(summary.totalFailedFixes)}`);
    console.log(`  Skipped violations: ${chalk.gray(summary.totalSkippedViolations)}`);

    if (summary.totalFixedViolations > 0) {
      console.log(chalk.green('\n✅ Auto-fix completed successfully!'));
      if (!options.dryRun) {
        console.log(chalk.gray('Files have been modified. Review changes before committing.'));
      }
    } else if (summary.totalFailedFixes > 0) {
      console.log(chalk.red('\n❌ Some fixes failed. Check the logs above.'));
    } else {
      console.log(chalk.yellow('\n⚠️  No violations were fixed.'));
    }
  }

  /**
   * Show available fix strategies
   */
  private showAvailableStrategies(): void {
    const strategies = this.autoFixService.getFixStrategies();

    console.log(chalk.blue('🔧 Available Auto-fix Strategies:\n'));

    // Group by category
    const categories: Record<string, any[]> = {};
    strategies.forEach(strategy => {
      const category = strategy.category || 'uncategorized';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(strategy);
    });

    Object.entries(categories).forEach(([category, categoryStrategies]) => {
      console.log(chalk.cyan(`${category.toUpperCase()}:`));
      categoryStrategies.forEach(strategy => {
        const riskColor = strategy.riskLevel === 'high' ? chalk.red :
                         strategy.riskLevel === 'medium' ? chalk.yellow : chalk.green;
        console.log(`  • ${chalk.bold(strategy.ruleId)} ${riskColor(`[${strategy.riskLevel}]`)}`);
        console.log(`    ${chalk.gray(strategy.description)}`);
      });
      console.log('');
    });

    console.log(chalk.gray('Usage: umr auto-fix --rules=ruleId1,ruleId2 [paths...]'));
  }

  /**
   * Save results to file
   */
  private async saveResults(results: any[], outputPath: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const reportData = {
      timestamp,
      summary: {
        totalModules: results.length,
        totalFixedViolations: results.reduce((sum, r) => sum + r.result.summary.fixedViolations, 0),
        totalFailedFixes: results.reduce((sum, r) => sum + r.result.summary.failedFixes, 0),
        totalSkippedViolations: results.reduce((sum, r) => sum + r.result.summary.skippedViolations, 0)
      },
      results
    };

    await fs.writeFile(outputPath, JSON.stringify(reportData, null, 2));
    console.log(chalk.gray(`\n📄 Results saved to: ${outputPath}`));
  }
}

// If this file is run directly, execute the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new AutoFixCli();
  const command = cli.createCommand();
  command.parse();
}

export default AutoFixCli;