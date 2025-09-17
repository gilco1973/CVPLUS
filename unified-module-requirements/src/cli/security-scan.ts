#!/usr/bin/env node

import { Command } from 'commander';
import { SecurityAnalysisService, SecurityScanOptions, SecurityVulnerability } from '../services/SecurityAnalysisService.js';
import * as fs from 'fs/promises';
import chalk from 'chalk';

interface SecurityScanCliOptions extends SecurityScanOptions {
  output?: string;
  format?: 'summary' | 'detailed' | 'json' | 'sarif' | 'csv';
  verbose?: boolean;
  fixable?: boolean;
  export?: string;
  threshold?: number;
}

export class SecurityScanCli {
  private securityService: SecurityAnalysisService;

  constructor() {
    this.securityService = new SecurityAnalysisService();
  }

  /**
   * Create CLI command
   */
  createCommand(): Command {
    const command = new Command('security-scan')
      .description('Perform security vulnerability analysis')
      .argument('[paths...]', 'Module paths to scan', ['.'])
      .option('--dependencies', 'Scan dependency vulnerabilities', true)
      .option('--no-dependencies', 'Skip dependency scanning')
      .option('--code', 'Scan code vulnerabilities', true)
      .option('--no-code', 'Skip code scanning')
      .option('--configuration', 'Scan configuration vulnerabilities', true)
      .option('--no-configuration', 'Skip configuration scanning')
      .option('--secrets', 'Scan for exposed secrets', true)
      .option('--no-secrets', 'Skip secret scanning')
      .option('--include-types <types>', 'Only scan specific types (dependency,code,configuration,secrets)', '')
      .option('--exclude-types <types>', 'Exclude specific types', '')
      .option('--min-severity <level>', 'Minimum severity level (info,low,medium,high,critical)', 'info')
      .option('--max-vulnerabilities <number>', 'Maximum vulnerabilities to report', '1000')
      .option('--timeout <ms>', 'Scan timeout in milliseconds', '60000')
      .option('-f, --format <format>', 'Output format (summary|detailed|json|sarif|csv)', 'detailed')
      .option('-o, --output <file>', 'Output file path')
      .option('-v, --verbose', 'Enable verbose output')
      .option('--fixable', 'Show only vulnerabilities that can be automatically fixed')
      .option('--export <file>', 'Export detailed results to file')
      .option('--threshold <score>', 'Fail if risk score exceeds threshold (0-100)', '70')
      .action(async (paths: string[], options: SecurityScanCliOptions) => {
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
   * Run security scan command
   */
  async run(paths: string[], options: SecurityScanCliOptions): Promise<void> {
    if (options.verbose) {
      console.log(chalk.blue('🔒 Starting security vulnerability scan...'));
      console.log(chalk.gray(`Paths: ${paths.join(', ')}`));
      console.log(chalk.gray(`Options: ${JSON.stringify(options, null, 2)}`));
    }

    // Parse scan options
    const scanOptions: SecurityScanOptions = {
      scanDependencies: options.dependencies,
      scanCode: options.code,
      scanConfiguration: options.configuration,
      scanSecrets: options.secrets,
      includeTypes: options.includeTypes ? options.includeTypes.split(',') as SecurityVulnerability['type'][] : undefined,
      excludeTypes: options.excludeTypes ? options.excludeTypes.split(',') as SecurityVulnerability['type'][] : undefined,
      minSeverity: options.minSeverity as SecurityVulnerability['severity'],
      maxVulnerabilities: parseInt(options.maxVulnerabilities || '1000'),
      timeout: parseInt(options.timeout || '60000')
    };

    let totalVulnerabilities = 0;
    let highestRiskScore = 0;
    const allResults: any[] = [];

    for (const modulePath of paths) {
      if (options.verbose) {
        console.log(chalk.blue(`\n🔍 Scanning module: ${modulePath}`));
      }

      try {
        const result = await this.securityService.performSecurityScan(modulePath, scanOptions);

        totalVulnerabilities += result.summary.total;
        highestRiskScore = Math.max(highestRiskScore, result.riskScore);
        allResults.push({ modulePath, result });

        // Display module results
        this.displayModuleResults(modulePath, result, options);

      } catch (error) {
        console.error(chalk.red(`❌ Failed to scan ${modulePath}: ${error}`));
        if (!options.verbose) {
          continue;
        }
        throw error;
      }
    }

    // Display overall summary
    this.displayOverallSummary({
      totalVulnerabilities,
      highestRiskScore,
      scannedModules: paths.length,
      results: allResults
    }, options);

    // Export results if requested
    if (options.export) {
      await this.exportResults(allResults, options.export, options.format || 'json');
    }

    // Save output if specified
    if (options.output) {
      const content = this.formatResults(allResults, options);
      await fs.writeFile(options.output, content);
      console.log(chalk.gray(`\n📄 Results saved to: ${options.output}`));
    }

    // Check threshold
    if (options.threshold && highestRiskScore > parseInt(options.threshold)) {
      console.log(chalk.red(`\n❌ Risk score ${highestRiskScore} exceeds threshold ${options.threshold}`));
      process.exit(1);
    }

    // Exit with error code if critical or high severity vulnerabilities found
    const hasCriticalIssues = allResults.some(r =>
      r.result.summary.critical > 0 || r.result.summary.high > 0
    );

    if (hasCriticalIssues) {
      console.log(chalk.red('\n⚠️ Critical or high-severity vulnerabilities found!'));
      process.exit(1);
    }
  }

  /**
   * Display results for a single module
   */
  private displayModuleResults(modulePath: string, result: any, options: SecurityScanCliOptions): void {
    const { summary, vulnerabilities, riskScore } = result;

    // Module header
    const riskColor = this.getRiskColor(riskScore);
    console.log(`\n${this.getModuleStatusIcon(summary)} ${chalk.bold(modulePath)}`);
    console.log(`   Risk Score: ${riskColor(riskScore)}/100`);

    if (options.format === 'summary') {
      this.displaySummaryFormat(summary, vulnerabilities, options);
    } else if (options.format === 'detailed') {
      this.displayDetailedFormat(summary, vulnerabilities, options);
    }

    // Show recommendations if verbose
    if (options.verbose && result.recommendations.length > 0) {
      console.log(chalk.cyan('\n💡 Recommendations:'));
      result.recommendations.slice(0, 3).forEach((rec: string) => {
        console.log(`   • ${rec}`);
      });
    }
  }

  /**
   * Display summary format
   */
  private displaySummaryFormat(summary: any, vulnerabilities: SecurityVulnerability[], options: SecurityScanCliOptions): void {
    if (summary.total === 0) {
      console.log(chalk.green('   ✅ No vulnerabilities found'));
      return;
    }

    const counts = [];
    if (summary.critical > 0) counts.push(chalk.red(`${summary.critical} critical`));
    if (summary.high > 0) counts.push(chalk.red(`${summary.high} high`));
    if (summary.medium > 0) counts.push(chalk.yellow(`${summary.medium} medium`));
    if (summary.low > 0) counts.push(chalk.blue(`${summary.low} low`));
    if (summary.info > 0) counts.push(chalk.gray(`${summary.info} info`));

    console.log(`   Found: ${counts.join(', ')}`);

    // Show top vulnerabilities
    const topVulns = vulnerabilities
      .filter(v => v.severity === 'critical' || v.severity === 'high')
      .slice(0, 3);

    if (topVulns.length > 0) {
      console.log(chalk.gray('   Top Issues:'));
      topVulns.forEach(vuln => {
        const severityIcon = this.getSeverityIcon(vuln.severity);
        console.log(`     ${severityIcon} ${vuln.title}`);
      });
    }
  }

  /**
   * Display detailed format
   */
  private displayDetailedFormat(summary: any, vulnerabilities: SecurityVulnerability[], options: SecurityScanCliOptions): void {
    // Summary line
    console.log(`   Total: ${summary.total} vulnerabilities`);
    if (summary.critical > 0) console.log(`   ${chalk.red('Critical:')} ${summary.critical}`);
    if (summary.high > 0) console.log(`   ${chalk.red('High:')} ${summary.high}`);
    if (summary.medium > 0) console.log(`   ${chalk.yellow('Medium:')} ${summary.medium}`);
    if (summary.low > 0) console.log(`   ${chalk.blue('Low:')} ${summary.low}`);
    if (summary.info > 0) console.log(`   ${chalk.gray('Info:')} ${summary.info}`);

    // Detailed vulnerabilities
    if (vulnerabilities.length > 0) {
      console.log(chalk.cyan('\n🔍 Vulnerabilities:'));

      // Filter by fixable if requested
      let displayVulns = vulnerabilities;
      if (options.fixable) {
        displayVulns = vulnerabilities.filter(v => this.isFixable(v));
      }

      // Limit display count
      const maxDisplay = options.verbose ? displayVulns.length : Math.min(10, displayVulns.length);
      displayVulns.slice(0, maxDisplay).forEach(vuln => {
        this.displayVulnerability(vuln, options);
      });

      if (displayVulns.length > maxDisplay) {
        console.log(chalk.gray(`   ... and ${displayVulns.length - maxDisplay} more`));
      }
    }
  }

  /**
   * Display single vulnerability
   */
  private displayVulnerability(vuln: SecurityVulnerability, options: SecurityScanCliOptions): void {
    const severityIcon = this.getSeverityIcon(vuln.severity);
    const typeIcon = this.getTypeIcon(vuln.type);

    console.log(`\n   ${severityIcon} ${chalk.bold(vuln.title)}`);
    console.log(`      ${typeIcon} ${vuln.type} | ${vuln.severity.toUpperCase()}`);

    if (vuln.filePath) {
      const location = vuln.lineNumber ? `${vuln.filePath}:${vuln.lineNumber}` : vuln.filePath;
      console.log(`      📁 ${location}`);
    }

    if (options.verbose) {
      console.log(chalk.gray(`      ${vuln.description}`));

      if (vuln.cwe) {
        console.log(`      🔗 CWE: ${vuln.cwe}`);
      }

      if (vuln.cvss) {
        console.log(`      📊 CVSS: ${vuln.cvss}`);
      }

      if (vuln.affectedPackage) {
        const fixInfo = vuln.fixedVersion ? ` (fix: ${vuln.fixedVersion})` : '';
        console.log(`      📦 ${vuln.affectedPackage}@${vuln.affectedVersion}${fixInfo}`);
      }

      console.log(chalk.cyan(`      💡 ${vuln.recommendation}`));
    }

    if (this.isFixable(vuln)) {
      console.log(chalk.green('      🔧 Auto-fixable'));
    }
  }

  /**
   * Display overall summary
   */
  private displayOverallSummary(summary: {
    totalVulnerabilities: number;
    highestRiskScore: number;
    scannedModules: number;
    results: any[];
  }, options: SecurityScanCliOptions): void {
    console.log(chalk.blue('\n🔒 Security Scan Summary:'));
    console.log(`  Scanned modules: ${summary.scannedModules}`);
    console.log(`  Total vulnerabilities: ${summary.totalVulnerabilities}`);

    const riskColor = this.getRiskColor(summary.highestRiskScore);
    console.log(`  Highest risk score: ${riskColor(summary.highestRiskScore)}/100`);

    // Aggregate counts
    const totalCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };

    summary.results.forEach(r => {
      totalCounts.critical += r.result.summary.critical;
      totalCounts.high += r.result.summary.high;
      totalCounts.medium += r.result.summary.medium;
      totalCounts.low += r.result.summary.low;
      totalCounts.info += r.result.summary.info;
    });

    if (totalCounts.critical > 0) console.log(`  ${chalk.red('Critical:')} ${totalCounts.critical}`);
    if (totalCounts.high > 0) console.log(`  ${chalk.red('High:')} ${totalCounts.high}`);
    if (totalCounts.medium > 0) console.log(`  ${chalk.yellow('Medium:')} ${totalCounts.medium}`);
    if (totalCounts.low > 0) console.log(`  ${chalk.blue('Low:')} ${totalCounts.low}`);
    if (totalCounts.info > 0) console.log(`  ${chalk.gray('Info:')} ${totalCounts.info}`);

    // Security status
    if (summary.totalVulnerabilities === 0) {
      console.log(chalk.green('\n✅ No security vulnerabilities detected!'));
    } else if (totalCounts.critical > 0) {
      console.log(chalk.red('\n🚨 Critical vulnerabilities require immediate attention!'));
    } else if (totalCounts.high > 0) {
      console.log(chalk.red('\n⚠️ High-severity vulnerabilities found - review and fix promptly'));
    } else {
      console.log(chalk.yellow('\n💡 Some vulnerabilities found - consider addressing them'));
    }

    // Common vulnerability types
    const typeStats = this.calculateTypeStatistics(summary.results);
    if (Object.keys(typeStats).length > 0) {
      console.log(chalk.gray('\n📊 Vulnerability Types:'));
      Object.entries(typeStats)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`  ${this.getTypeIcon(type)} ${type}: ${count}`);
        });
    }
  }

  /**
   * Calculate vulnerability type statistics
   */
  private calculateTypeStatistics(results: any[]): Record<string, number> {
    const stats: Record<string, number> = {};

    results.forEach(r => {
      r.result.vulnerabilities.forEach((vuln: SecurityVulnerability) => {
        stats[vuln.type] = (stats[vuln.type] || 0) + 1;
      });
    });

    return stats;
  }

  /**
   * Format results for output
   */
  private formatResults(results: any[], options: SecurityScanCliOptions): string {
    switch (options.format) {
      case 'json':
        return JSON.stringify(results, null, 2);

      case 'sarif':
        return this.formatSarif(results);

      case 'csv':
        return this.formatCsv(results);

      default:
        return this.formatText(results);
    }
  }

  /**
   * Format results as SARIF (Static Analysis Results Interchange Format)
   */
  private formatSarif(results: any[]): string {
    const sarifResults = results.flatMap(r =>
      r.result.vulnerabilities.map((vuln: SecurityVulnerability) => ({
        ruleId: `security-${vuln.type}`,
        level: this.severityToSarifLevel(vuln.severity),
        message: { text: vuln.title },
        locations: vuln.filePath ? [{
          physicalLocation: {
            artifactLocation: { uri: vuln.filePath },
            region: vuln.lineNumber ? {
              startLine: vuln.lineNumber,
              startColumn: 1
            } : undefined
          }
        }] : [],
        properties: {
          cwe: vuln.cwe,
          cvss: vuln.cvss,
          fingerprint: vuln.fingerprint
        }
      }))
    );

    return JSON.stringify({
      version: '2.1.0',
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      runs: [{
        tool: {
          driver: {
            name: 'CVPlus Security Scanner',
            version: '1.0.0',
            informationUri: 'https://github.com/cvplus/unified-module-requirements'
          }
        },
        results: sarifResults
      }]
    }, null, 2);
  }

  /**
   * Format results as CSV
   */
  private formatCsv(results: any[]): string {
    const headers = [
      'Module', 'Type', 'Severity', 'Title', 'Description', 'File', 'Line',
      'CWE', 'CVSS', 'Package', 'Version', 'Recommendation'
    ];

    const rows = results.flatMap(r =>
      r.result.vulnerabilities.map((vuln: SecurityVulnerability) => [
        r.modulePath,
        vuln.type,
        vuln.severity,
        `"${vuln.title.replace(/"/g, '""')}"`,
        `"${vuln.description.replace(/"/g, '""')}"`,
        vuln.filePath || '',
        vuln.lineNumber || '',
        vuln.cwe || '',
        vuln.cvss || '',
        vuln.affectedPackage || '',
        vuln.affectedVersion || '',
        `"${vuln.recommendation.replace(/"/g, '""')}"`
      ])
    );

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Format results as plain text
   */
  private formatText(results: any[]): string {
    let output = 'Security Scan Results\n';
    output += '='.repeat(50) + '\n\n';

    results.forEach(r => {
      output += `Module: ${r.modulePath}\n`;
      output += `Risk Score: ${r.result.riskScore}/100\n`;
      output += `Vulnerabilities: ${r.result.summary.total}\n\n`;

      r.result.vulnerabilities.forEach((vuln: SecurityVulnerability) => {
        output += `  ${vuln.severity.toUpperCase()}: ${vuln.title}\n`;
        output += `  Type: ${vuln.type}\n`;
        if (vuln.filePath) output += `  File: ${vuln.filePath}${vuln.lineNumber ? ':' + vuln.lineNumber : ''}\n`;
        output += `  ${vuln.description}\n`;
        output += `  Recommendation: ${vuln.recommendation}\n\n`;
      });

      output += '-'.repeat(30) + '\n\n';
    });

    return output;
  }

  /**
   * Export detailed results
   */
  private async exportResults(results: any[], filePath: string, format: string): Promise<void> {
    const content = this.formatResults(results, { format } as SecurityScanCliOptions);
    await fs.writeFile(filePath, content);
    console.log(chalk.gray(`📄 Detailed results exported to: ${filePath}`));
  }

  /**
   * Helper methods
   */
  private getModuleStatusIcon(summary: any): string {
    if (summary.total === 0) return '✅';
    if (summary.critical > 0) return '🚨';
    if (summary.high > 0) return '❌';
    if (summary.medium > 0) return '⚠️';
    return '💡';
  }

  private getRiskColor(score: number): (text: string) => string {
    if (score >= 80) return chalk.red;
    if (score >= 60) return chalk.yellow;
    if (score >= 40) return chalk.blue;
    return chalk.green;
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '❌';
      case 'medium': return '⚠️';
      case 'low': return '💡';
      case 'info': return 'ℹ️';
      default: return '❓';
    }
  }

  private getTypeIcon(type: string): string {
    switch (type) {
      case 'dependency': return '📦';
      case 'code': return '💻';
      case 'configuration': return '⚙️';
      case 'secrets': return '🔑';
      case 'injection': return '💉';
      case 'permissions': return '🔒';
      default: return '🔍';
    }
  }

  private severityToSarifLevel(severity: string): string {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
      case 'info':
        return 'note';
      default:
        return 'note';
    }
  }

  private isFixable(vuln: SecurityVulnerability): boolean {
    // Simple logic - in practice this would be more sophisticated
    return vuln.type === 'dependency' && !!vuln.fixedVersion;
  }
}

// If this file is run directly, execute the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new SecurityScanCli();
  const command = cli.createCommand();
  command.parse();
}

export default SecurityScanCli;