#!/usr/bin/env node

/**
 * CVPlus Module Reporter CLI
 *
 * Command-line interface for generating compliance reports from validation data.
 * Supports historical reports, trend analysis, and various output formats.
 *
 * Usage:
 *   cvplus-reporter generate <type> [options]
 *   cvplus-reporter history <module> [options]
 *   cvplus-reporter trends [options]
 *   cvplus-reporter ecosystem [options]
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { ValidationService } from '../services/ValidationService.js';
import { ValidationReport, ReportAggregator, EcosystemSummary } from '../models/ValidationReport.js';
// import { createSystemEvent } from '../models/types.js';

interface GenerateOptions {
  /** Report type */
  type: 'module' | 'ecosystem' | 'trends' | 'violations';
  /** Input source */
  input?: string;
  /** Output file path */
  output?: string;
  /** Output format */
  format?: 'json' | 'html' | 'markdown' | 'csv';
  /** Include historical data */
  includeHistory?: boolean;
  /** Time period for trends */
  period?: string;
  /** Template for HTML reports */
  template?: string;
  /** Verbose output */
  verbose?: boolean;
}

interface HistoryOptions {
  /** Number of historical reports to include */
  limit?: number;
  /** Start date for history */
  since?: string;
  /** Output format */
  format?: 'table' | 'json' | 'chart';
  /** Show trend analysis */
  trends?: boolean;
}

interface TrendsOptions {
  /** Pattern to match modules */
  pattern?: string;
  /** Time period */
  period?: 'week' | 'month' | 'quarter' | 'year';
  /** Output format */
  format?: 'table' | 'json' | 'chart';
  /** Include predictions */
  predictions?: boolean;
}

interface EcosystemOptions {
  /** Pattern to match modules */
  pattern?: string;
  /** Include detailed breakdown */
  detailed?: boolean;
  /** Output format */
  format?: 'table' | 'json' | 'html';
  /** Generate dashboard */
  dashboard?: boolean;
}

class ReporterCLI {
  private validationService: ValidationService;
  private program: Command;
  private reportsDirectory: string;

  constructor() {
    this.validationService = new ValidationService();
    this.program = new Command();
    this.reportsDirectory = path.join(process.cwd(), 'reports');
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('cvplus-reporter')
      .description('CVPlus Module Compliance Reporter')
      .version('1.0.0');

    // Generate report command
    this.program
      .command('generate')
      .description('Generate compliance reports')
      .argument('<type>', 'Report type (module|ecosystem|trends|violations)')
      .option('-i, --input <source>', 'Input source (file, directory, or pattern)')
      .option('-o, --output <file>', 'Output file path')
      .option('-f, --format <format>', 'Output format (json|html|markdown|csv)', 'html')
      .option('--include-history', 'Include historical data')
      .option('--period <period>', 'Time period for trends (week|month|quarter)')
      .option('--template <template>', 'HTML template file')
      .option('-v, --verbose', 'Verbose output')
      .action(async (type: string, options: GenerateOptions) => {
        options.type = type as any;
        await this.generateReport(options);
      });

    // History command
    this.program
      .command('history')
      .description('Show historical compliance data for a module')
      .argument('<module>', 'Module path or ID')
      .option('-l, --limit <count>', 'Number of historical reports', '10')
      .option('--since <date>', 'Start date for history (YYYY-MM-DD)')
      .option('-f, --format <format>', 'Output format (table|json|chart)', 'table')
      .option('--trends', 'Show trend analysis')
      .action(async (moduleId: string, options: HistoryOptions) => {
        await this.showHistory(moduleId, options);
      });

    // Trends command
    this.program
      .command('trends')
      .description('Analyze compliance trends across modules')
      .option('-p, --pattern <pattern>', 'Module pattern to analyze', '**/*')
      .option('--period <period>', 'Time period (week|month|quarter|year)', 'month')
      .option('-f, --format <format>', 'Output format (table|json|chart)', 'table')
      .option('--predictions', 'Include trend predictions')
      .action(async (options: TrendsOptions) => {
        await this.analyzeTrends(options);
      });

    // Ecosystem command
    this.program
      .command('ecosystem')
      .description('Generate ecosystem-wide compliance overview')
      .option('-p, --pattern <pattern>', 'Module pattern to include', '**/*')
      .option('-d, --detailed', 'Include detailed breakdown')
      .option('-f, --format <format>', 'Output format (table|json|html)', 'table')
      .option('--dashboard', 'Generate interactive dashboard')
      .action(async (options: EcosystemOptions) => {
        await this.generateEcosystemReport(options);
      });

    // Clean reports command
    this.program
      .command('clean')
      .description('Clean up old report files')
      .option('--older-than <days>', 'Remove reports older than N days', '30')
      .option('--dry-run', 'Show what would be deleted')
      .action(async (options: { olderThan?: string; dryRun?: boolean }) => {
        await this.cleanReports(options);
      });
  }

  async run(): Promise<void> {
    try {
      // Ensure reports directory exists
      await fs.mkdir(this.reportsDirectory, { recursive: true });

      await this.program.parseAsync(process.argv);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async generateReport(options: GenerateOptions): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`📊 Generating ${options.type} report...`);

      let reportData: any;
      let filename: string;

      switch (options.type) {
        case 'module':
          if (!options.input) {
            throw new Error('Module path required for module report');
          }
          reportData = await this.generateModuleReport(options.input, options);
          filename = `module-${path.basename(options.input)}-${Date.now()}`;
          break;

        case 'ecosystem':
          const ecosystemOptions: EcosystemOptions = {
            ...(options.input && { pattern: options.input }),
            detailed: true,
            format: options.format === 'markdown' || options.format === 'csv' ? 'html' : (options.format as any),
            dashboard: false
          };
          reportData = await this.generateEcosystemReport(ecosystemOptions);
          filename = `ecosystem-${Date.now()}`;
          break;

        case 'trends':
          reportData = await this.generateTrendsReport(options);
          filename = `trends-${Date.now()}`;
          break;

        case 'violations':
          reportData = await this.generateViolationsReport(options);
          filename = `violations-${Date.now()}`;
          break;

        default:
          throw new Error(`Unknown report type: ${options.type}`);
      }

      // Generate output
      const output = await this.formatReportOutput(reportData, options);
      const outputPath = options.output || path.join(this.reportsDirectory, `${filename}.${options.format}`);

      await fs.writeFile(outputPath, output, 'utf-8');

      const duration = Date.now() - startTime;
      console.log(`✅ Report generated in ${duration}ms`);
      console.log(`📄 Output: ${outputPath}`);

      // Open in browser if HTML
      if (options.format === 'html' && !options.output) {
        console.log(`🌐 Open in browser: file://${path.resolve(outputPath)}`);
      }

    } catch (error) {
      console.error(`❌ Report generation failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private async generateModuleReport(modulePath: string, options: GenerateOptions): Promise<ValidationReport> {
    console.log(`🔍 Validating module: ${modulePath}`);

    const report = await this.validationService.validateModule(path.resolve(modulePath), {
      generateReport: true,
      trackPerformance: true
    });

    if (options.verbose) {
      console.log(`📊 Module: ${report.moduleName}`);
      console.log(`📈 Score: ${report.overallScore}/100`);
      console.log(`📋 Violations: ${report.metrics.failedRules}`);
    }

    return report;
  }

  private async showHistory(moduleId: string, options: HistoryOptions): Promise<void> {
    try {
      // This would load historical data from storage
      // For now, we'll simulate with current validation
      console.log(`📚 Loading history for module: ${moduleId}`);
      console.log(`⚠️ Historical data storage not yet implemented - showing current state`);

      const modulePath = path.resolve(moduleId);
      const currentReport = await this.validationService.validateModule(modulePath);

      console.log(`\n📊 Current Compliance Status:`);
      console.log(`   Score: ${currentReport.overallScore}/100`);
      console.log(`   Status: ${currentReport.status}`);
      console.log(`   Violations: ${currentReport.metrics.failedRules}`);
      console.log(`   Last Updated: ${currentReport.timestamp.toISOString()}`);

      if (options.format === 'json') {
        console.log(JSON.stringify([currentReport], null, 2));
      }

    } catch (error) {
      console.error(`❌ Failed to show history: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private async analyzeTrends(options: TrendsOptions): Promise<void> {
    try {
      console.log(`📈 Analyzing compliance trends...`);
      console.log(`⚠️ Trend analysis requires historical data - showing current ecosystem state`);

      // Find modules matching pattern
      const pattern = options.pattern || '**/*';
      const modulePaths = await this.findModules(pattern);

      if (modulePaths.length === 0) {
        console.log(`No modules found matching pattern: ${pattern}`);
        return;
      }

      console.log(`📁 Found ${modulePaths.length} modules`);

      // Validate all modules to get current state
      const reports: ValidationReport[] = [];
      for (const modulePath of modulePaths) {
        try {
          const report = await this.validationService.validateModule(modulePath);
          reports.push(report);
        } catch (error) {
          console.log(`⚠️ Failed to validate ${modulePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Generate ecosystem summary
      const summary = ReportAggregator.aggregateEcosystemReports(reports);

      console.log(`\n📊 Current Ecosystem Trends:`);
      console.log(`   Total Modules: ${summary.totalModules}`);
      console.log(`   Average Score: ${summary.averageScore}/100`);
      console.log(`   Passing Modules: ${summary.statusBreakdown.pass}`);
      console.log(`   Failing Modules: ${summary.statusBreakdown.fail}`);
      console.log(`   Warning Modules: ${summary.statusBreakdown.warning}`);

      if (summary.topViolations.length > 0) {
        console.log(`\n🔍 Top Violations:`);
        summary.topViolations.slice(0, 5).forEach((violation, index) => {
          console.log(`   ${index + 1}. ${violation.ruleId}: ${violation.count} modules`);
        });
      }

    } catch (error) {
      console.error(`❌ Trend analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private async generateEcosystemReport(options: EcosystemOptions): Promise<EcosystemSummary> {
    console.log(`🌍 Generating ecosystem report...`);

    // Find modules matching pattern
    const pattern = options.pattern || '**/*';
    const modulePaths = await this.findModules(pattern);

    if (modulePaths.length === 0) {
      throw new Error(`No modules found matching pattern: ${pattern}`);
    }

    console.log(`📁 Analyzing ${modulePaths.length} modules...`);

    // Validate all modules
    const reports: ValidationReport[] = [];
    let processed = 0;

    for (const modulePath of modulePaths) {
      try {
        const report = await this.validationService.validateModule(modulePath);
        reports.push(report);
        processed++;

        if (options.detailed) {
          const status = this.getStatusEmoji(report.status);
          console.log(`${status} ${path.basename(modulePath)}: ${report.overallScore}/100`);
        } else if (processed % 10 === 0) {
          console.log(`   Processed ${processed}/${modulePaths.length} modules...`);
        }
      } catch (error) {
        console.log(`⚠️ Failed to validate ${modulePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Generate ecosystem summary
    const summary = ReportAggregator.aggregateEcosystemReports(reports);

    console.log(`\n📊 Ecosystem Summary:`);
    console.log(`   Total Modules: ${summary.totalModules}`);
    console.log(`   Average Score: ${summary.averageScore}/100`);
    console.log(`   Distribution: ${summary.scoreDistribution.excellent} excellent, ${summary.scoreDistribution.good} good, ${summary.scoreDistribution.fair} fair, ${summary.scoreDistribution.poor} poor`);

    return summary;
  }

  private async generateTrendsReport(options: GenerateOptions): Promise<any> {
    // Placeholder for trends report
    return {
      type: 'trends',
      period: options.period || 'month',
      generated: new Date(),
      message: 'Trends analysis requires historical data collection'
    };
  }

  private async generateViolationsReport(options: GenerateOptions): Promise<any> {
    console.log(`🔍 Generating violations report...`);

    const pattern = options.input || '**/*';
    const modulePaths = await this.findModules(pattern);

    if (modulePaths.length === 0) {
      throw new Error(`No modules found matching pattern: ${pattern}`);
    }

    const allViolations: any[] = [];

    for (const modulePath of modulePaths) {
      try {
        const report = await this.validationService.validateModule(modulePath);
        const violations = report.results.filter(r => r.status === 'FAIL' || r.status === 'WARNING');

        violations.forEach(violation => {
          allViolations.push({
            module: path.basename(modulePath),
            modulePath,
            ...violation
          });
        });
      } catch (error) {
        console.log(`⚠️ Failed to validate ${modulePath}`);
      }
    }

    // Group violations by rule
    const violationsByRule: Record<string, any[]> = {};
    allViolations.forEach(violation => {
      if (!violationsByRule[violation.ruleId]) {
        violationsByRule[violation.ruleId] = [];
      }
      violationsByRule[violation.ruleId]!.push(violation);
    });

    return {
      type: 'violations',
      totalViolations: allViolations.length,
      violationsByRule,
      generated: new Date()
    };
  }

  private async formatReportOutput(data: any, options: GenerateOptions): Promise<string> {
    switch (options.format) {
      case 'json':
        return JSON.stringify(data, null, 2);

      case 'html':
        return await this.formatHtmlReport(data, options);

      case 'markdown':
        return this.formatMarkdownReport(data, options);

      case 'csv':
        return this.formatCsvReport(data, options);

      default:
        return JSON.stringify(data, null, 2);
    }
  }

  private async formatHtmlReport(data: any, options: GenerateOptions): Promise<string> {
    const title = `CVPlus ${options.type.charAt(0).toUpperCase() + options.type.slice(1)} Report`;
    const timestamp = new Date().toISOString();

    let content = '';

    if (data.type === 'violations') {
      content = this.formatViolationsHtml(data);
    } else if (data.totalModules !== undefined) {
      // Ecosystem report
      content = this.formatEcosystemHtml(data);
    } else if (data.moduleId) {
      // Module report
      content = this.formatModuleHtml(data);
    } else {
      content = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #007acc; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #007acc; font-size: 2.5em; margin: 0; }
        .subtitle { color: #666; font-size: 1.1em; margin: 10px 0 0 0; }
        .metric { display: inline-block; margin: 20px 20px 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; text-align: center; min-width: 120px; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007acc; }
        .metric-label { color: #666; text-transform: uppercase; font-size: 0.9em; }
        .status-pass { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-fail { color: #dc3545; }
        .violation { margin: 10px 0; padding: 15px; border-left: 4px solid #dc3545; background: #fff5f5; }
        .violation-title { font-weight: bold; color: #dc3545; }
        .violation-details { color: #666; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #007acc; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">${title}</h1>
            <p class="subtitle">Generated on ${timestamp}</p>
        </div>
        ${content}
    </div>
</body>
</html>`;
  }

  private formatEcosystemHtml(data: EcosystemSummary): string {
    return `
        <div class="metrics">
            <div class="metric">
                <div class="metric-value">${data.totalModules}</div>
                <div class="metric-label">Total Modules</div>
            </div>
            <div class="metric">
                <div class="metric-value">${data.averageScore}</div>
                <div class="metric-label">Avg Score</div>
            </div>
            <div class="metric">
                <div class="metric-value status-pass">${data.statusBreakdown.pass}</div>
                <div class="metric-label">Passing</div>
            </div>
            <div class="metric">
                <div class="metric-value status-fail">${data.statusBreakdown.fail}</div>
                <div class="metric-label">Failing</div>
            </div>
        </div>

        <h2>Score Distribution</h2>
        <div class="metrics">
            <div class="metric">
                <div class="metric-value status-pass">${data.scoreDistribution.excellent}</div>
                <div class="metric-label">Excellent (90+)</div>
            </div>
            <div class="metric">
                <div class="metric-value">${data.scoreDistribution.good}</div>
                <div class="metric-label">Good (80-89)</div>
            </div>
            <div class="metric">
                <div class="metric-value status-warning">${data.scoreDistribution.fair}</div>
                <div class="metric-label">Fair (70-79)</div>
            </div>
            <div class="metric">
                <div class="metric-value status-fail">${data.scoreDistribution.poor}</div>
                <div class="metric-label">Poor (&lt;70)</div>
            </div>
        </div>

        ${data.topViolations.length > 0 ? `
        <h2>Top Violations</h2>
        <table>
            <thead>
                <tr><th>Rule ID</th><th>Affected Modules</th></tr>
            </thead>
            <tbody>
                ${data.topViolations.slice(0, 10).map(v =>
                    `<tr><td>${v.ruleId}</td><td>${v.count}</td></tr>`
                ).join('')}
            </tbody>
        </table>
        ` : ''}
    `;
  }

  private formatModuleHtml(data: ValidationReport): string {
    const statusClass = data.status.toLowerCase().replace('_', '-');

    return `
        <div class="metrics">
            <div class="metric">
                <div class="metric-value status-${statusClass}">${data.overallScore}</div>
                <div class="metric-label">Compliance Score</div>
            </div>
            <div class="metric">
                <div class="metric-value">${data.metrics.totalRules}</div>
                <div class="metric-label">Rules Evaluated</div>
            </div>
            <div class="metric">
                <div class="metric-value status-fail">${data.metrics.failedRules}</div>
                <div class="metric-label">Violations</div>
            </div>
        </div>

        <h2>Module Information</h2>
        <table>
            <tr><td><strong>Name</strong></td><td>${data.moduleName}</td></tr>
            <tr><td><strong>Type</strong></td><td>${data.moduleType}</td></tr>
            <tr><td><strong>Path</strong></td><td>${data.modulePath}</td></tr>
            <tr><td><strong>Status</strong></td><td class="status-${statusClass}">${data.status}</td></tr>
        </table>

        ${data.results.filter(r => r.status === 'FAIL' || r.status === 'WARNING').length > 0 ? `
        <h2>Violations</h2>
        ${data.results.filter(r => r.status === 'FAIL' || r.status === 'WARNING').map(result => `
            <div class="violation">
                <div class="violation-title">${result.ruleName}</div>
                <div class="violation-details">
                    <strong>Rule:</strong> ${result.ruleId}<br>
                    <strong>Severity:</strong> ${result.severity}<br>
                    <strong>Message:</strong> ${result.message}
                    ${result.filePath ? `<br><strong>File:</strong> ${result.filePath}` : ''}
                    ${result.canAutoFix ? '<br><span style="color: #28a745;">🔧 Auto-fixable</span>' : ''}
                </div>
            </div>
        `).join('')}
        ` : '<h2>🎉 No violations found!</h2>'}
    `;
  }

  private formatViolationsHtml(data: any): string {
    return `
        <div class="metric">
            <div class="metric-value status-fail">${data.totalViolations}</div>
            <div class="metric-label">Total Violations</div>
        </div>

        <h2>Violations by Rule</h2>
        ${Object.entries(data.violationsByRule).map(([ruleId, violations]) => {
            const violationsList = violations as any[];
            return `
            <h3>${ruleId} (${violationsList.length} violations)</h3>
            <table>
                <thead>
                    <tr><th>Module</th><th>Message</th><th>Severity</th><th>Auto-Fix</th></tr>
                </thead>
                <tbody>
                    ${violationsList.map((v: any) => `
                        <tr>
                            <td>${v.module}</td>
                            <td>${v.message}</td>
                            <td><span class="status-${v.severity.toLowerCase()}">${v.severity}</span></td>
                            <td>${v.canAutoFix ? '🔧' : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            `;
        }).join('')}
    `;
  }

  private formatMarkdownReport(data: any, options: GenerateOptions): string {
    const title = `# CVPlus ${options.type.charAt(0).toUpperCase() + options.type.slice(1)} Report`;
    const timestamp = new Date().toISOString();

    let content = `${title}\n\n*Generated on ${timestamp}*\n\n`;

    if (data.moduleId) {
      // Module report
      content += `## Module: ${data.moduleName}\n\n`;
      content += `- **Score**: ${data.overallScore}/100\n`;
      content += `- **Status**: ${data.status}\n`;
      content += `- **Type**: ${data.moduleType}\n`;
      content += `- **Path**: ${data.modulePath}\n\n`;

      const violations = data.results.filter((r: any) => r.status === 'FAIL' || r.status === 'WARNING');
      if (violations.length > 0) {
        content += `## Violations (${violations.length})\n\n`;
        violations.forEach((violation: any) => {
          content += `### ${violation.ruleName}\n`;
          content += `- **Rule**: ${violation.ruleId}\n`;
          content += `- **Severity**: ${violation.severity}\n`;
          content += `- **Message**: ${violation.message}\n`;
          if (violation.canAutoFix) content += `- **Auto-fixable**: Yes\n`;
          content += '\n';
        });
      }
    }

    return content;
  }

  private formatCsvReport(data: any, _options: GenerateOptions): string {
    if (data.moduleId) {
      // Module report CSV
      const violations = data.results.filter((r: any) => r.status === 'FAIL' || r.status === 'WARNING');
      let csv = 'Module,Rule ID,Rule Name,Severity,Status,Message,Auto-Fixable\n';

      violations.forEach((violation: any) => {
        csv += `"${data.moduleName}","${violation.ruleId}","${violation.ruleName}","${violation.severity}","${violation.status}","${violation.message}","${violation.canAutoFix}"\n`;
      });

      return csv;
    }

    return 'CSV format not supported for this report type';
  }

  private async findModules(pattern: string): Promise<string[]> {
    try {
      const matches = await glob(pattern + '/');
      // Filter out node_modules and other non-module directories
      const filtered = matches.filter(match => {
        const basename = path.basename(match);
        return !['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(basename);
      });
      return filtered.map(match => path.resolve(match));
    } catch (err) {
      throw err;
    }
  }

  private async cleanReports(options: { olderThan?: string; dryRun?: boolean }): Promise<void> {
    try {
      const days = parseInt(options.olderThan || '30');
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const files = await fs.readdir(this.reportsDirectory);
      const reportFiles = files.filter(file =>
        file.endsWith('.html') || file.endsWith('.json') || file.endsWith('.md') || file.endsWith('.csv')
      );

      let deletedCount = 0;

      for (const file of reportFiles) {
        const filePath = path.join(this.reportsDirectory, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          if (options.dryRun) {
            console.log(`Would delete: ${file} (${stats.mtime.toISOString()})`);
          } else {
            await fs.unlink(filePath);
            console.log(`Deleted: ${file}`);
          }
          deletedCount++;
        }
      }

      console.log(`\n📊 Summary: ${deletedCount} files ${options.dryRun ? 'would be deleted' : 'deleted'}`);

    } catch (error) {
      console.error(`❌ Failed to clean reports: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
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
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new ReporterCLI();
  cli.run();
}

export { ReporterCLI };