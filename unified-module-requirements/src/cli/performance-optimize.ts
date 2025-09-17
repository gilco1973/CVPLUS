import { Command } from 'commander';
import { PerformanceOptimizationService, OptimizationOptions } from '../services/PerformanceOptimizationService.js';
import { OptimizationLevel, PerformanceOptimization, PerformanceProfile } from '../types/performance.js';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs/promises';
import * as path from 'path';

export class PerformanceOptimizeCli {
  private service: PerformanceOptimizationService;

  constructor() {
    this.service = new PerformanceOptimizationService();
  }

  createCommand(): Command {
    const command = new Command('performance-optimize')
      .alias('perf')
      .description('Analyze and optimize module performance')
      .argument('<module-path>', 'Path to the module to analyze')
      .option('-l, --level <level>', 'Optimization level (conservative|balanced|aggressive)', 'balanced')
      .option('-c, --categories <categories>', 'Comma-separated list of categories to analyze (fileSystem,memory,cpu,network,bundleSize,dependencies)', 'all')
      .option('-f, --format <format>', 'Output format (summary|detailed|json|html)', 'detailed')
      .option('-o, --output <file>', 'Output file path (optional)')
      .option('--threshold <score>', 'Performance score threshold (0-100), exit with error if below', '60')
      .option('--apply-fixes', 'Automatically apply safe optimizations')
      .option('--dry-run', 'Show what optimizations would be applied without making changes')
      .option('--create-backup', 'Create backup before applying optimizations')
      .option('--aggressive', 'Enable aggressive optimizations (higher risk)')
      .option('--no-interactive', 'Disable interactive prompts')
      .action(async (modulePath: string, options) => {
        await this.handlePerformanceOptimize(modulePath, options);
      });

    // Add subcommands
    command.addCommand(this.createAnalyzeCommand());
    command.addCommand(this.createOptimizeCommand());
    command.addCommand(this.createReportCommand());

    return command;
  }

  private createAnalyzeCommand(): Command {
    return new Command('analyze')
      .description('Analyze module performance without applying optimizations')
      .argument('<module-path>', 'Path to the module to analyze')
      .option('-c, --categories <categories>', 'Comma-separated list of categories to analyze', 'all')
      .option('-f, --format <format>', 'Output format (summary|detailed|json|html)', 'detailed')
      .option('-o, --output <file>', 'Output file path (optional)')
      .action(async (modulePath: string, options) => {
        await this.handleAnalyze(modulePath, options);
      });
  }

  private createOptimizeCommand(): Command {
    return new Command('optimize')
      .description('Apply specific optimizations to a module')
      .argument('<module-path>', 'Path to the module to optimize')
      .option('-i, --optimization-ids <ids>', 'Comma-separated list of optimization IDs to apply')
      .option('--dry-run', 'Show what would be optimized without making changes')
      .option('--create-backup', 'Create backup before applying optimizations')
      .option('--force', 'Apply optimizations without confirmation prompts')
      .action(async (modulePath: string, options) => {
        await this.handleOptimize(modulePath, options);
      });
  }

  private createReportCommand(): Command {
    return new Command('report')
      .description('Generate performance report from analysis results')
      .argument('<analysis-file>', 'Path to analysis results JSON file')
      .option('-f, --format <format>', 'Output format (html|markdown|pdf)', 'html')
      .option('-o, --output <file>', 'Output file path')
      .action(async (analysisFile: string, options) => {
        await this.handleReport(analysisFile, options);
      });
  }

  private async handlePerformanceOptimize(modulePath: string, options: any): Promise<void> {
    const spinner = ora('Analyzing module performance...').start();

    try {
      // Validate module path
      await this.validateModulePath(modulePath);

      // Parse options
      const optimizationOptions: OptimizationOptions = this.parseOptions(options);

      // Perform analysis
      spinner.text = 'Analyzing performance metrics...';
      const profile = await this.service.analyzePerformance(modulePath, optimizationOptions);

      spinner.succeed('Performance analysis completed');

      // Display results
      await this.displayResults(profile, options.format);

      // Check threshold
      const threshold = parseInt(options.threshold);
      if (profile.performanceScore < threshold) {
        console.log(chalk.red(`\n❌ Performance score ${profile.performanceScore} is below threshold ${threshold}`));
        process.exit(1);
      }

      // Apply optimizations if requested
      if (options.applyFixes && profile.optimizations.length > 0) {
        await this.applyOptimizations(profile, modulePath, options);
      } else if (profile.optimizations.length > 0) {
        console.log(chalk.yellow(`\n💡 Found ${profile.optimizations.length} optimization opportunities.`));
        console.log(chalk.gray('Use --apply-fixes to apply safe optimizations automatically.'));
        console.log(chalk.gray('Use "performance-optimize optimize" command for selective optimization.'));
      }

      // Save output if requested
      if (options.output) {
        await this.saveOutput(profile, options.output, options.format);
      }

    } catch (error) {
      spinner.fail(`Performance optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  private async handleAnalyze(modulePath: string, options: any): Promise<void> {
    const spinner = ora('Analyzing module performance...').start();

    try {
      await this.validateModulePath(modulePath);
      const optimizationOptions: OptimizationOptions = this.parseOptions(options);

      const profile = await this.service.analyzePerformance(modulePath, optimizationOptions);
      spinner.succeed('Analysis completed');

      await this.displayResults(profile, options.format);

      if (options.output) {
        await this.saveOutput(profile, options.output, options.format);
      }

    } catch (error) {
      spinner.fail(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  private async handleOptimize(modulePath: string, options: any): Promise<void> {
    const spinner = ora('Loading optimization targets...').start();

    try {
      await this.validateModulePath(modulePath);

      // First analyze to get available optimizations
      const profile = await this.service.analyzePerformance(modulePath);
      spinner.succeed('Analysis completed');

      let targetOptimizations: PerformanceOptimization[] = profile.optimizations;

      // Filter by specific IDs if provided
      if (options.optimizationIds) {
        const requestedIds = options.optimizationIds.split(',').map((id: string) => id.trim());
        targetOptimizations = profile.optimizations.filter(opt => requestedIds.includes(opt.id));

        if (targetOptimizations.length === 0) {
          console.log(chalk.red('❌ No matching optimizations found'));
          process.exit(1);
        }
      }

      if (targetOptimizations.length === 0) {
        console.log(chalk.green('✅ No optimizations needed - module is already well optimized!'));
        return;
      }

      // Display what will be optimized
      console.log(chalk.blue('\n📊 Optimizations to apply:'));
      targetOptimizations.forEach((opt, index) => {
        console.log(`${index + 1}. ${opt.title} (${opt.impact} impact, ${opt.riskLevel} risk)`);
        console.log(`   ${chalk.gray(opt.description)}`);
      });

      // Confirm unless forced
      if (!options.force && !options.dryRun) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const confirmed = await new Promise<boolean>((resolve) => {
          rl.question('\nProceed with optimizations? (y/N): ', (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
          });
        });

        if (!confirmed) {
          console.log(chalk.yellow('Optimization cancelled'));
          return;
        }
      }

      // Apply optimizations
      await this.applyOptimizations({ optimizations: targetOptimizations } as PerformanceProfile, modulePath, options);

    } catch (error) {
      spinner.fail(`Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  private async handleReport(analysisFile: string, options: any): Promise<void> {
    const spinner = ora('Generating performance report...').start();

    try {
      // Load analysis results
      const analysisData = await fs.readFile(analysisFile, 'utf-8');
      const profile: PerformanceProfile = JSON.parse(analysisData);

      // Generate report
      const report = await this.generateReport(profile, options.format);

      spinner.succeed('Report generated');

      if (options.output) {
        await fs.writeFile(options.output, report);
        console.log(chalk.green(`📄 Report saved to: ${options.output}`));
      } else {
        console.log(report);
      }

    } catch (error) {
      spinner.fail(`Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  private parseOptions(options: any): OptimizationOptions {
    return {
      analyzeFileSystem: true,
      analyzeMemory: true,
      analyzeCpu: true,
      analyzeNetwork: true,
      analyzeBundleSize: true,
      analyzeDependencies: true,
      autoApplyOptimizations: options.apply || false
    };
  }

  private async validateModulePath(modulePath: string): Promise<void> {
    try {
      const stat = await fs.stat(modulePath);
      if (!stat.isDirectory()) {
        throw new Error('Module path must be a directory');
      }
    } catch (error) {
      throw new Error(`Invalid module path: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async displayResults(profile: PerformanceProfile, format: string): Promise<void> {
    switch (format) {
      case 'summary':
        this.displaySummary(profile);
        break;
      case 'detailed':
        this.displayDetailed(profile);
        break;
      case 'json':
        console.log(JSON.stringify(profile, null, 2));
        break;
      default:
        this.displayDetailed(profile);
    }
  }

  private displaySummary(profile: PerformanceProfile): void {
    console.log(chalk.blue('\n📊 Performance Summary'));
    console.log(chalk.gray('='.repeat(50)));

    // Performance score with color coding
    const score = profile.performanceScore;
    const scoreColor = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
    console.log(`Performance Score: ${scoreColor(score.toString())}/100`);

    // Key metrics
    console.log(`\nFile System: ${profile.metrics.fileSystem.totalFiles} files, ${this.formatBytes(profile.metrics.fileSystem.totalSizeBytes)}`);
    console.log(`Dependencies: ${profile.metrics.dependencies.totalDependencies} (${profile.metrics.dependencies.heavyDependencies.length} heavy)`);
    console.log(`Network Requests: ${profile.metrics.network.requestCount}`);

    // Bottlenecks
    const criticalBottlenecks = profile.bottlenecks.filter(b => b.severity === 'critical' || b.severity === 'high');
    if (criticalBottlenecks.length > 0) {
      console.log(chalk.red(`\n⚠️  ${criticalBottlenecks.length} critical performance issues found`));
    }

    // Optimization opportunities
    const autoFixable = profile.optimizations.filter(o => o.autoApplicable);
    if (autoFixable.length > 0) {
      console.log(chalk.green(`\n💡 ${autoFixable.length} auto-fixable optimizations available`));
    }
  }

  private displayDetailed(profile: PerformanceProfile): void {
    this.displaySummary(profile);

    // Detailed metrics
    console.log(chalk.blue('\n📈 Detailed Metrics'));
    console.log(chalk.gray('='.repeat(50)));

    console.log(`\n${chalk.cyan('File System:')} `);
    console.log(`  Total Files: ${profile.metrics.fileSystem.totalFiles}`);
    console.log(`  Total Size: ${this.formatBytes(profile.metrics.fileSystem.totalSizeBytes)}`);
    console.log(`  Average File Size: ${this.formatBytes(profile.metrics.fileSystem.averageFileSize)}`);
    console.log(`  Largest File: ${this.formatBytes(profile.metrics.fileSystem.largestFileSize)}`);

    console.log(`\n${chalk.cyan('Memory Usage:')}`);
    console.log(`  Memory Patterns: ${profile.metrics.memory.patterns.length}`);
    console.log(`  Potential Leaks: ${profile.metrics.memory.potentialLeaks}`);

    console.log(`\n${chalk.cyan('CPU Usage:')}`);
    console.log(`  CPU Patterns: ${profile.metrics.cpu.patterns.length}`);
    console.log(`  Blocking Operations: ${profile.metrics.cpu.blockingOperations}`);

    console.log(`\n${chalk.cyan('Network:')}`);
    console.log(`  Request Count: ${profile.metrics.network.requestCount}`);
    console.log(`  Unique Endpoints: ${profile.metrics.network.uniqueEndpoints}`);

    console.log(`\n${chalk.cyan('Bundle Size:')}`);
    console.log(`  Total Imports: ${profile.metrics.bundleSize.imports.length}`);
    console.log(`  Heavy Imports: ${profile.metrics.bundleSize.heavyImports.length}`);

    console.log(`\n${chalk.cyan('Dependencies:')}`);
    console.log(`  Total: ${profile.metrics.dependencies.totalDependencies}`);
    console.log(`  Heavy: ${profile.metrics.dependencies.heavyDependencies.length}`);
    console.log(`  Outdated: ${profile.metrics.dependencies.outdatedDependencies.length}`);

    // Bottlenecks
    if (profile.bottlenecks.length > 0) {
      console.log(chalk.red('\n⚠️  Performance Bottlenecks'));
      console.log(chalk.gray('='.repeat(50)));

      profile.bottlenecks.forEach((bottleneck, index) => {
        const severityColor = bottleneck.severity === 'critical' ? chalk.red :
                            bottleneck.severity === 'high' ? chalk.red :
                            bottleneck.severity === 'medium' ? chalk.yellow : chalk.gray;

        console.log(`\n${index + 1}. ${severityColor(bottleneck.severity.toUpperCase())} - ${bottleneck.description}`);
        console.log(`   Type: ${bottleneck.type}`);
        console.log(`   Impact: ${bottleneck.impact}%`);
        if (bottleneck.file) {
          console.log(`   File: ${bottleneck.file}`);
        }
      });
    }

    // Optimizations
    if (profile.optimizations.length > 0) {
      console.log(chalk.blue('\n💡 Optimization Opportunities'));
      console.log(chalk.gray('='.repeat(50)));

      profile.optimizations.forEach((opt, index) => {
        const impactColor = opt.impact === 'high' ? chalk.green :
                          opt.impact === 'medium' ? chalk.yellow : chalk.gray;

        console.log(`\n${index + 1}. ${opt.title} ${impactColor(`[${opt.impact} impact]`)}`);
        console.log(`   ${opt.description}`);
        console.log(`   Risk: ${opt.riskLevel}, Effort: ${opt.effort}`);
        console.log(`   Auto-applicable: ${opt.autoApplicable ? '✅' : '❌'}`);

        if (opt.estimatedSavings.fileSizeReduction) {
          console.log(`   File Size Reduction: ${opt.estimatedSavings.fileSizeReduction}`);
        }
        if (opt.estimatedSavings.performanceGain) {
          console.log(`   Performance Gain: ${opt.estimatedSavings.performanceGain}`);
        }
      });
    }
  }

  private async applyOptimizations(profile: PerformanceProfile, modulePath: string, options: any): Promise<void> {
    const safeOptimizations = profile.optimizations.filter(opt =>
      opt.autoApplicable && (options.aggressive || opt.riskLevel === 'low')
    );

    if (safeOptimizations.length === 0) {
      console.log(chalk.yellow('No safe auto-applicable optimizations found'));
      return;
    }

    console.log(chalk.blue(`\n🔧 Applying ${safeOptimizations.length} optimizations...`));

    let successCount = 0;
    let errorCount = 0;

    for (const optimization of safeOptimizations) {
      const spinner = ora(`Applying: ${optimization.title}`).start();

      try {
        const result = await this.service.applyOptimizations(
          profile,
          modulePath,
          [optimization.id],
          {
            dryRun: options.dryRun,
            backup: options.createBackup
          }
        );

        const applied = result.appliedOptimizations.find(ao => ao.optimization.id === optimization.id);
        if (applied && applied.status === 'success') {
          if (options.dryRun) {
            spinner.succeed(`Would apply: ${optimization.title}`);
          } else {
            spinner.succeed(`Applied: ${optimization.title}`);
            successCount++;
          }
        } else {
          const details = applied?.details || 'Unknown error';
          spinner.fail(`Failed: ${optimization.title} - ${details}`);
          errorCount++;
        }
      } catch (error) {
        spinner.fail(`Error: ${optimization.title} - ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
    }

    if (options.dryRun) {
      console.log(chalk.blue(`\n🔍 Dry run completed. ${safeOptimizations.length} optimizations would be applied.`));
    } else {
      console.log(chalk.green(`\n✅ Applied ${successCount} optimizations successfully`));
      if (errorCount > 0) {
        console.log(chalk.red(`❌ ${errorCount} optimizations failed`));
      }
    }
  }

  private async saveOutput(profile: PerformanceProfile, outputPath: string, format: string): Promise<void> {
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    let content: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(profile, null, 2);
        break;
      case 'html':
        content = await this.generateHtmlReport(profile);
        break;
      default:
        content = JSON.stringify(profile, null, 2);
    }

    await fs.writeFile(outputPath, content);
    console.log(chalk.green(`📄 Results saved to: ${outputPath}`));
  }

  private async generateReport(profile: PerformanceProfile, format: string): Promise<string> {
    switch (format) {
      case 'html':
        return this.generateHtmlReport(profile);
      case 'markdown':
        return this.generateMarkdownReport(profile);
      default:
        return JSON.stringify(profile, null, 2);
    }
  }

  private async generateHtmlReport(profile: PerformanceProfile): Promise<string> {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #007acc; padding-bottom: 20px; margin-bottom: 30px; }
        .score { font-size: 2em; font-weight: bold; color: ${profile.performanceScore >= 80 ? '#28a745' : profile.performanceScore >= 60 ? '#ffc107' : '#dc3545'}; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: #f8f9fa; }
        .bottleneck { margin: 10px 0; padding: 15px; border-radius: 5px; }
        .critical { background-color: #f8d7da; border-left: 4px solid #dc3545; }
        .high { background-color: #fff3cd; border-left: 4px solid #ffc107; }
        .medium { background-color: #d1ecf1; border-left: 4px solid #17a2b8; }
        .optimization { margin: 10px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Analysis Report</h1>
        <p><strong>Module:</strong> ${profile.moduleId}</p>
        <p><strong>Analysis Date:</strong> ${new Date(profile.timestamp).toLocaleString()}</p>
        <p><strong>Performance Score:</strong> <span class="score">${profile.performanceScore}/100</span></p>
    </div>

    <div class="metric-grid">
        <div class="metric-card">
            <h3>File System</h3>
            <p><strong>Total Files:</strong> ${profile.metrics.fileSystem.totalFiles}</p>
            <p><strong>Total Size:</strong> ${this.formatBytes(profile.metrics.fileSystem.totalSizeBytes)}</p>
            <p><strong>Largest File:</strong> ${this.formatBytes(profile.metrics.fileSystem.largestFileSize)}</p>
        </div>

        <div class="metric-card">
            <h3>Dependencies</h3>
            <p><strong>Total:</strong> ${profile.metrics.dependencies.totalDependencies}</p>
            <p><strong>Heavy Dependencies:</strong> ${profile.metrics.dependencies.heavyDependencies.length}</p>
            <p><strong>Outdated:</strong> ${profile.metrics.dependencies.outdatedDependencies.length}</p>
        </div>

        <div class="metric-card">
            <h3>Network</h3>
            <p><strong>Request Count:</strong> ${profile.metrics.network.requestCount}</p>
            <p><strong>Unique Endpoints:</strong> ${profile.metrics.network.uniqueEndpoints}</p>
        </div>

        <div class="metric-card">
            <h3>Memory & CPU</h3>
            <p><strong>Memory Patterns:</strong> ${profile.metrics.memory.patterns.length}</p>
            <p><strong>Potential Leaks:</strong> ${profile.metrics.memory.potentialLeaks}</p>
            <p><strong>CPU Patterns:</strong> ${profile.metrics.cpu.patterns.length}</p>
        </div>
    </div>

    ${profile.bottlenecks.length > 0 ? `
    <h2>Performance Bottlenecks</h2>
    ${profile.bottlenecks.map(bottleneck => `
        <div class="bottleneck ${bottleneck.severity}">
            <h4>${bottleneck.severity.toUpperCase()} - ${bottleneck.description}</h4>
            <p><strong>Type:</strong> ${bottleneck.type}</p>
            <p><strong>Impact:</strong> ${bottleneck.impact}%</p>
            ${bottleneck.file ? `<p><strong>File:</strong> ${bottleneck.file}</p>` : ''}
        </div>
    `).join('')}
    ` : ''}

    ${profile.optimizations.length > 0 ? `
    <h2>Optimization Opportunities</h2>
    ${profile.optimizations.map(opt => `
        <div class="optimization">
            <h4>${opt.title} <span style="color: ${opt.impact === 'high' ? '#28a745' : opt.impact === 'medium' ? '#ffc107' : '#6c757d'}">[${opt.impact} impact]</span></h4>
            <p>${opt.description}</p>
            <p><strong>Risk Level:</strong> ${opt.riskLevel} | <strong>Effort:</strong> ${opt.effort} | <strong>Auto-applicable:</strong> ${opt.autoApplicable ? '✅' : '❌'}</p>
            ${opt.estimatedSavings.fileSizeReduction ? `<p><strong>File Size Reduction:</strong> ${opt.estimatedSavings.fileSizeReduction}</p>` : ''}
            ${opt.estimatedSavings.performanceGain ? `<p><strong>Performance Gain:</strong> ${opt.estimatedSavings.performanceGain}</p>` : ''}
        </div>
    `).join('')}
    ` : ''}

    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
        <p>Generated by CVPlus Unified Module Requirements System</p>
    </footer>
</body>
</html>`;
  }

  private generateMarkdownReport(profile: PerformanceProfile): string {
    const sections = [
      `# Performance Analysis Report`,
      ``,
      `**Module:** ${profile.moduleId}`,
      `**Analysis Date:** ${new Date(profile.timestamp).toLocaleString()}`,
      `**Performance Score:** ${profile.performanceScore}/100`,
      ``,
      `## Metrics Summary`,
      ``,
      `### File System`,
      `- Total Files: ${profile.metrics.fileSystem.totalFiles}`,
      `- Total Size: ${this.formatBytes(profile.metrics.fileSystem.totalSizeBytes)}`,
      `- Largest File: ${this.formatBytes(profile.metrics.fileSystem.largestFileSize)}`,
      ``,
      `### Dependencies`,
      `- Total: ${profile.metrics.dependencies.totalDependencies}`,
      `- Heavy Dependencies: ${profile.metrics.dependencies.heavyDependencies.length}`,
      `- Outdated: ${profile.metrics.dependencies.outdatedDependencies.length}`,
      ``,
      `### Network`,
      `- Request Count: ${profile.metrics.network.requestCount}`,
      `- Unique Endpoints: ${profile.metrics.network.uniqueEndpoints}`,
      ``
    ];

    if (profile.bottlenecks.length > 0) {
      sections.push(
        `## Performance Bottlenecks`,
        ``,
        ...profile.bottlenecks.map(bottleneck =>
          `### ${bottleneck.severity.toUpperCase()} - ${bottleneck.description}\n` +
          `- Type: ${bottleneck.type}\n` +
          `- Impact: ${bottleneck.impact}%\n` +
          (bottleneck.file ? `- File: ${bottleneck.file}\n` : '') +
          ``
        )
      );
    }

    if (profile.optimizations.length > 0) {
      sections.push(
        `## Optimization Opportunities`,
        ``,
        ...profile.optimizations.map(opt =>
          `### ${opt.title} [${opt.impact} impact]\n` +
          `${opt.description}\n` +
          `- Risk Level: ${opt.riskLevel}\n` +
          `- Effort: ${opt.effort}\n` +
          `- Auto-applicable: ${opt.autoApplicable ? '✅' : '❌'}\n` +
          (opt.estimatedSavings.fileSizeReduction ? `- File Size Reduction: ${opt.estimatedSavings.fileSizeReduction}\n` : '') +
          (opt.estimatedSavings.performanceGain ? `- Performance Gain: ${opt.estimatedSavings.performanceGain}\n` : '') +
          ``
        )
      );
    }

    return sections.join('\n');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default PerformanceOptimizeCli;