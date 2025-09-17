#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { ModuleType, ValidationStatus, RuleSeverity } from '../src/models/enums';

const program = new Command();

program
  .name('cvplus-validator')
  .description('CVPlus Module Validation CLI')
  .version('1.0.0');

program
  .command('validate')
  .description('Validate a CVPlus module')
  .requiredOption('-p, --path <path>', 'Path to module directory')
  .option('-r, --rules [rules...]', 'Specific rules to validate')
  .option('-s, --severity <severity>', 'Minimum severity level', 'ERROR')
  .option('-f, --format <format>', 'Output format (json|text)', 'text')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 Validating module...'));

      const modulePath = path.resolve(options.path);

      if (!await fs.pathExists(modulePath)) {
        console.error(chalk.red(`❌ Module not found at: ${modulePath}`));
        process.exit(1);
      }

      // Perform actual module validation
      const validationResult = await validateModule(modulePath, options);

      if (options.format === 'json') {
        const output = JSON.stringify(validationResult, null, 2);
        if (options.output) {
          await fs.writeFile(options.output, output);
          console.log(chalk.green(`✅ Validation report saved to: ${options.output}`));
        } else {
          console.log(output);
        }
      } else {
        displayTextReport(validationResult);
      }

      // Exit with appropriate code
      if (validationResult.status === ValidationStatus.FAIL || validationResult.status === ValidationStatus.ERROR) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Validation failed:'), error);
      process.exit(1);
    }
  });

program
  .command('validate-all')
  .description('Validate all modules in packages directory')
  .option('-p, --path <path>', 'Base path to search for modules', './packages')
  .option('--parallel <count>', 'Number of parallel validations', '4')
  .option('-f, --format <format>', 'Output format (json|html|text)', 'text')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 Validating all modules...'));

      const basePath = path.resolve(options.path);
      const moduleDirectories = await findModuleDirectories(basePath);

      console.log(chalk.gray(`Found ${moduleDirectories.length} modules to validate`));

      const parallelCount = parseInt(options.parallel);
      const validationResults = await validateModulesInParallel(moduleDirectories, parallelCount);

      if (options.format === 'html') {
        const htmlReport = generateHtmlReport(validationResults);
        if (options.output) {
          await fs.writeFile(options.output, htmlReport);
          console.log(chalk.green(`✅ HTML report saved to: ${options.output}`));
        } else {
          console.log(htmlReport);
        }
      } else if (options.format === 'json') {
        const output = JSON.stringify(validationResults, null, 2);
        if (options.output) {
          await fs.writeFile(options.output, output);
          console.log(chalk.green(`✅ Validation report saved to: ${options.output}`));
        } else {
          console.log(output);
        }
      } else {
        displayBatchTextReport(validationResults);
      }

    } catch (error) {
      console.error(chalk.red('❌ Batch validation failed:'), error);
      process.exit(1);
    }
  });

async function validateModule(modulePath: string, options: any) {
  const moduleId = path.basename(modulePath);
  const packageJsonPath = path.join(modulePath, 'package.json');
  const readmePath = path.join(modulePath, 'README.md');
  const tsconfigPath = path.join(modulePath, 'tsconfig.json');

  const results = [];
  let overallScore = 100;

  // Check required files
  if (!await fs.pathExists(packageJsonPath)) {
    results.push({
      ruleId: 'PACKAGE_JSON_REQUIRED',
      status: ValidationStatus.FAIL,
      severity: RuleSeverity.CRITICAL,
      message: 'package.json file is missing',
      remediation: 'Create a package.json file with required fields'
    });
    overallScore -= 25;
  } else {
    // Validate package.json content
    const packageJson = await fs.readJSON(packageJsonPath);
    if (!packageJson.name || !packageJson.version) {
      results.push({
        ruleId: 'PACKAGE_JSON_VALID',
        status: ValidationStatus.FAIL,
        severity: RuleSeverity.ERROR,
        message: 'package.json missing required fields (name, version)',
        remediation: 'Add name and version fields to package.json'
      });
      overallScore -= 15;
    } else {
      results.push({
        ruleId: 'PACKAGE_JSON_VALID',
        status: ValidationStatus.PASS,
        severity: RuleSeverity.ERROR,
        message: 'package.json is valid'
      });
    }
  }

  if (!await fs.pathExists(readmePath)) {
    results.push({
      ruleId: 'README_REQUIRED',
      status: ValidationStatus.FAIL,
      severity: RuleSeverity.ERROR,
      message: 'README.md file is missing',
      remediation: 'Create a README.md file with project description'
    });
    overallScore -= 20;
  } else {
    const readmeContent = await fs.readFile(readmePath, 'utf8');
    if (readmeContent.trim().length < 100) {
      results.push({
        ruleId: 'README_CONTENT',
        status: ValidationStatus.WARNING,
        severity: RuleSeverity.WARNING,
        message: 'README.md content is too brief',
        remediation: 'Add more comprehensive documentation to README.md'
      });
      overallScore -= 5;
    } else {
      results.push({
        ruleId: 'README_REQUIRED',
        status: ValidationStatus.PASS,
        severity: RuleSeverity.ERROR,
        message: 'README.md exists and has adequate content'
      });
    }
  }

  // Check TypeScript configuration
  if (await fs.pathExists(tsconfigPath)) {
    results.push({
      ruleId: 'TYPESCRIPT_CONFIG',
      status: ValidationStatus.PASS,
      severity: RuleSeverity.WARNING,
      message: 'TypeScript configuration found'
    });
  } else {
    results.push({
      ruleId: 'TYPESCRIPT_CONFIG',
      status: ValidationStatus.WARNING,
      severity: RuleSeverity.WARNING,
      message: 'No TypeScript configuration found',
      remediation: 'Add tsconfig.json for TypeScript support'
    });
    overallScore -= 10;
  }

  // Check directory structure
  const srcPath = path.join(modulePath, 'src');
  const testsPath = path.join(modulePath, 'tests');

  if (!await fs.pathExists(srcPath)) {
    results.push({
      ruleId: 'SRC_DIRECTORY',
      status: ValidationStatus.FAIL,
      severity: RuleSeverity.ERROR,
      message: 'src/ directory is missing',
      remediation: 'Create src/ directory for source code'
    });
    overallScore -= 15;
  }

  if (!await fs.pathExists(testsPath)) {
    results.push({
      ruleId: 'TESTS_DIRECTORY',
      status: ValidationStatus.WARNING,
      severity: RuleSeverity.WARNING,
      message: 'tests/ directory is missing',
      remediation: 'Create tests/ directory and add test files'
    });
    overallScore -= 10;
  }

  const status = overallScore >= 90 ? ValidationStatus.PASS :
                 overallScore >= 70 ? ValidationStatus.WARNING : ValidationStatus.FAIL;

  const recommendations = [];
  if (overallScore < 100) {
    recommendations.push('Review failed validation rules and implement recommended fixes');
  }
  if (overallScore < 80) {
    recommendations.push('Consider implementing additional best practices for higher compliance');
  }

  return {
    moduleId,
    reportId: `report-${Date.now()}`,
    timestamp: new Date().toISOString(),
    overallScore: Math.max(0, overallScore),
    status,
    results,
    recommendations,
    validator: 'cvplus-validator-cli'
  };
}

async function findModuleDirectories(basePath: string): Promise<string[]> {
  const directories: string[] = [];

  if (!await fs.pathExists(basePath)) {
    return directories;
  }

  const items = await fs.readdir(basePath);

  for (const item of items) {
    const itemPath = path.join(basePath, item);
    const stat = await fs.stat(itemPath);

    if (stat.isDirectory()) {
      const packageJsonPath = path.join(itemPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        directories.push(itemPath);
      }
    }
  }

  return directories;
}

async function validateModulesInParallel(moduleDirectories: string[], parallelCount: number) {
  const results = [];

  for (let i = 0; i < moduleDirectories.length; i += parallelCount) {
    const batch = moduleDirectories.slice(i, i + parallelCount);
    const batchPromises = batch.map(dir => validateModule(dir, {}));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

function displayTextReport(report: any) {
  console.log('\n' + chalk.bold.blue('📊 Validation Report'));
  console.log(chalk.gray('═'.repeat(50)));

  console.log(`${chalk.bold('Module:')} ${report.moduleId}`);
  console.log(`${chalk.bold('Score:')} ${getScoreColor(report.overallScore)}${report.overallScore}/100${chalk.reset()}`);
  console.log(`${chalk.bold('Status:')} ${getStatusColor(report.status)}${report.status}${chalk.reset()}`);
  console.log(`${chalk.bold('Timestamp:')} ${report.timestamp}`);

  console.log('\n' + chalk.bold('📋 Validation Results:'));

  for (const result of report.results) {
    const icon = result.status === ValidationStatus.PASS ? '✅' :
                 result.status === ValidationStatus.WARNING ? '⚠️' : '❌';
    const color = result.status === ValidationStatus.PASS ? chalk.green :
                  result.status === ValidationStatus.WARNING ? chalk.yellow : chalk.red;

    console.log(`  ${icon} ${color(result.ruleId)}: ${result.message}`);
    if (result.remediation && result.status !== ValidationStatus.PASS) {
      console.log(`     ${chalk.gray('→ ' + result.remediation)}`);
    }
  }

  if (report.recommendations.length > 0) {
    console.log('\n' + chalk.bold('💡 Recommendations:'));
    for (const rec of report.recommendations) {
      console.log(`  • ${rec}`);
    }
  }
}

function displayBatchTextReport(reports: any[]) {
  console.log('\n' + chalk.bold.blue('📊 Batch Validation Report'));
  console.log(chalk.gray('═'.repeat(60)));

  const totalModules = reports.length;
  const averageScore = reports.reduce((sum, r) => sum + r.overallScore, 0) / totalModules;

  const statusCounts = reports.reduce((counts, r) => {
    counts[r.status] = (counts[r.status] || 0) + 1;
    return counts;
  }, {});

  console.log(`${chalk.bold('Total Modules:')} ${totalModules}`);
  console.log(`${chalk.bold('Average Score:')} ${getScoreColor(averageScore)}${averageScore.toFixed(1)}/100${chalk.reset()}`);

  console.log('\n' + chalk.bold('📈 Status Distribution:'));
  for (const [status, count] of Object.entries(statusCounts)) {
    const percentage = ((count as number) / totalModules * 100).toFixed(1);
    console.log(`  ${getStatusColor(status)}${status}${chalk.reset()}: ${count} (${percentage}%)`);
  }

  console.log('\n' + chalk.bold('📋 Individual Results:'));
  for (const report of reports) {
    const statusIcon = report.status === ValidationStatus.PASS ? '✅' :
                       report.status === ValidationStatus.WARNING ? '⚠️' : '❌';
    console.log(`  ${statusIcon} ${chalk.bold(report.moduleId)}: ${getScoreColor(report.overallScore)}${report.overallScore}/100${chalk.reset()}`);
  }
}

function generateHtmlReport(reports: any[]): string {
  const totalModules = reports.length;
  const averageScore = reports.reduce((sum, r) => sum + r.overallScore, 0) / totalModules;

  const statusCounts = reports.reduce((counts, r) => {
    counts[r.status] = (counts[r.status] || 0) + 1;
    return counts;
  }, {});

  return `
<!DOCTYPE html>
<html>
<head>
    <title>CVPlus Module Validation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .summary { margin: 20px 0; }
        .module-list { margin-top: 20px; }
        .module-item { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .pass { border-left: 5px solid #28a745; }
        .warning { border-left: 5px solid #ffc107; }
        .fail { border-left: 5px solid #dc3545; }
        .score { font-size: 24px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 CVPlus Module Validation Report</h1>
        <p>Generated on: ${new Date().toISOString()}</p>
    </div>

    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Modules:</strong> ${totalModules}</p>
        <p><strong>Average Score:</strong> <span class="score">${averageScore.toFixed(1)}/100</span></p>

        <h3>Status Distribution</h3>
        ${Object.entries(statusCounts).map(([status, count]) =>
          `<p><strong>${status}:</strong> ${count} (${((count as number) / totalModules * 100).toFixed(1)}%)</p>`
        ).join('')}
    </div>

    <div class="module-list">
        <h2>Module Details</h2>
        ${reports.map(report => `
          <div class="module-item ${report.status.toLowerCase()}">
              <h3>${report.moduleId}</h3>
              <p><strong>Score:</strong> ${report.overallScore}/100</p>
              <p><strong>Status:</strong> ${report.status}</p>
              <details>
                  <summary>Validation Results</summary>
                  <ul>
                      ${report.results.map((result: any) => `
                          <li><strong>${result.ruleId}:</strong> ${result.message}</li>
                      `).join('')}
                  </ul>
              </details>
          </div>
        `).join('')}
    </div>
</body>
</html>`;
}

function getScoreColor(score: number) {
  if (score >= 90) return chalk.green;
  if (score >= 70) return chalk.yellow;
  return chalk.red;
}

function getStatusColor(status: string) {
  switch (status) {
    case ValidationStatus.PASS: return chalk.green;
    case ValidationStatus.WARNING: return chalk.yellow;
    case ValidationStatus.FAIL:
    case ValidationStatus.ERROR: return chalk.red;
    default: return chalk.gray;
  }
}

program.parse();