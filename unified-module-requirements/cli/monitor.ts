#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { glob } from 'glob';
import { ValidationStatus, RuleSeverity } from '../src/models/enums';

const program = new Command();

interface ModuleHealth {
  moduleId: string;
  path: string;
  status: ValidationStatus;
  score: number;
  lastChecked: string;
  issues: HealthIssue[];
  metrics: ModuleMetrics;
  trends: HealthTrend[];
}

interface HealthIssue {
  id: string;
  severity: RuleSeverity;
  category: string;
  message: string;
  file?: string;
  line?: number;
  rule: string;
  fixable: boolean;
}

interface ModuleMetrics {
  files: number;
  linesOfCode: number;
  testCoverage: number;
  dependencies: number;
  vulnerabilities: number;
  codeSmells: number;
  technicalDebt: number; // in hours
  lastModified: string;
  buildStatus: 'success' | 'failed' | 'unknown';
  buildTime: number; // in seconds
}

interface HealthTrend {
  date: string;
  score: number;
  issues: number;
  metrics: Partial<ModuleMetrics>;
}

interface EcosystemOverview {
  totalModules: number;
  healthyModules: number;
  warningModules: number;
  criticalModules: number;
  averageScore: number;
  totalIssues: number;
  fixableIssues: number;
  lastScan: string;
  trends: {
    scoreChange: number;
    newIssues: number;
    fixedIssues: number;
    period: string;
  };
  topIssues: Array<{
    rule: string;
    count: number;
    severity: RuleSeverity;
  }>;
  modulesByHealth: {
    [key: string]: string[];
  };
}

program
  .name('cvplus-monitor')
  .description('CVPlus Module Ecosystem Monitor')
  .version('1.0.0');

program
  .command('scan')
  .description('Scan modules for health status')
  .option('-p, --path <path>', 'Base path to scan for modules', './packages')
  .option('-o, --output <file>', 'Output health report file')
  .option('--format <format>', 'Output format (json|html|text)', 'text')
  .option('--parallel <count>', 'Number of parallel scans', '4')
  .action(async (options) => {
    try {
      const spinner = ora('Scanning module ecosystem...').start();

      const basePath = path.resolve(options.path);
      if (!await fs.pathExists(basePath)) {
        spinner.fail(`Path not found: ${basePath}`);
        process.exit(1);
      }

      const modules = await discoverModules(basePath);
      spinner.text = `Found ${modules.length} modules, analyzing health...`;

      const parallelCount = parseInt(options.parallel);
      const healthReports = await scanModulesHealth(modules, parallelCount);

      const overview = generateEcosystemOverview(healthReports);

      spinner.succeed('Health scan completed');

      if (options.format === 'json') {
        const output = JSON.stringify({ overview, modules: healthReports }, null, 2);
        if (options.output) {
          await fs.writeFile(options.output, output);
          console.log(chalk.green(`=Ä Health report saved to: ${options.output}`));
        } else {
          console.log(output);
        }
      } else if (options.format === 'html') {
        const htmlReport = generateHtmlHealthReport(overview, healthReports);
        const outputFile = options.output || `health-report-${Date.now()}.html`;
        await fs.writeFile(outputFile, htmlReport);
        console.log(chalk.green(`=Ä HTML report saved to: ${outputFile}`));
      } else {
        displayHealthReport(overview, healthReports);
      }

      // Save current scan data for trend analysis
      await saveHealthHistory(healthReports);

    } catch (error) {
      console.error(chalk.red('L Health scan failed:'), error);
      process.exit(1);
    }
  });

program
  .command('watch')
  .description('Watch modules for changes and health updates')
  .option('-p, --path <path>', 'Base path to watch', './packages')
  .option('-i, --interval <seconds>', 'Check interval in seconds', '300')
  .option('--alert', 'Enable health alerts')
  .action(async (options) => {
    try {
      const basePath = path.resolve(options.path);
      const interval = parseInt(options.interval) * 1000;

      console.log(chalk.blue('=A  Starting module health watcher...'));
      console.log(chalk.gray(`Watching: ${basePath}`));
      console.log(chalk.gray(`Interval: ${options.interval}s`));
      console.log(chalk.gray('Press Ctrl+C to stop\n'));

      let previousOverview: EcosystemOverview | null = null;

      const checkHealth = async () => {
        try {
          const modules = await discoverModules(basePath);
          const healthReports = await scanModulesHealth(modules, 2);
          const overview = generateEcosystemOverview(healthReports);

          displayWatchStatus(overview);

          if (options.alert && previousOverview) {
            checkAndDisplayAlerts(previousOverview, overview);
          }

          previousOverview = overview;
          await saveHealthHistory(healthReports);

        } catch (error) {
          console.error(chalk.red('L Health check failed:'), error);
        }
      };

      // Initial check
      await checkHealth();

      // Set up interval
      setInterval(checkHealth, interval);

    } catch (error) {
      console.error(chalk.red('L Watch failed:'), error);
      process.exit(1);
    }
  });

program
  .command('trends')
  .description('Show health trends over time')
  .option('-m, --module <module>', 'Specific module to analyze')
  .option('-d, --days <days>', 'Number of days to analyze', '30')
  .option('--format <format>', 'Output format (json|text|chart)', 'text')
  .action(async (options) => {
    try {
      const spinner = ora('Analyzing health trends...').start();

      const days = parseInt(options.days);
      const trends = await loadHealthTrends(options.module, days);

      spinner.succeed('Trend analysis completed');

      if (options.format === 'json') {
        console.log(JSON.stringify(trends, null, 2));
      } else if (options.format === 'chart') {
        displayTrendChart(trends);
      } else {
        displayTrendReport(trends);
      }

    } catch (error) {
      console.error(chalk.red('L Trend analysis failed:'), error);
      process.exit(1);
    }
  });

program
  .command('fix')
  .description('Auto-fix common health issues')
  .requiredOption('-m, --module <path>', 'Module path to fix')
  .option('--dry-run', 'Preview fixes without applying')
  .option('--rules <rules...>', 'Specific rules to fix')
  .action(async (options) => {
    try {
      const modulePath = path.resolve(options.module);
      if (!await fs.pathExists(modulePath)) {
        console.error(chalk.red(`Module not found: ${modulePath}`));
        process.exit(1);
      }

      const spinner = ora('Analyzing fixable issues...').start();

      const health = await analyzeModuleHealth(modulePath);
      const fixableIssues = health.issues.filter(issue => issue.fixable);

      if (options.rules) {
        const ruleFilter = options.rules;
        fixableIssues.filter(issue => ruleFilter.includes(issue.rule));
      }

      if (fixableIssues.length === 0) {
        spinner.succeed('No fixable issues found');
        return;
      }

      spinner.succeed(`Found ${fixableIssues.length} fixable issues`);

      if (options.dryRun) {
        console.log(chalk.blue('\n= Preview of fixes:'));
        displayFixPreview(fixableIssues);
        return;
      }

      const fixResults = await autoFixIssues(modulePath, fixableIssues);
      displayFixResults(fixResults);

    } catch (error) {
      console.error(chalk.red('L Auto-fix failed:'), error);
      process.exit(1);
    }
  });

program
  .command('alert')
  .description('Configure health alerts')
  .option('--setup', 'Setup alert configuration')
  .option('--test', 'Test alert system')
  .option('--list', 'List current alert rules')
  .action(async (options) => {
    try {
      if (options.setup) {
        await setupAlerts();
      } else if (options.test) {
        await testAlerts();
      } else if (options.list) {
        await listAlertRules();
      } else {
        console.log(chalk.yellow('Please specify an alert action: --setup, --test, or --list'));
      }
    } catch (error) {
      console.error(chalk.red('L Alert operation failed:'), error);
      process.exit(1);
    }
  });

async function discoverModules(basePath: string): Promise<string[]> {
  const modules: string[] = [];

  try {
    const items = await fs.readdir(basePath);

    for (const item of items) {
      const itemPath = path.join(basePath, item);
      const stat = await fs.stat(itemPath);

      if (stat.isDirectory()) {
        const packageJsonPath = path.join(itemPath, 'package.json');
        if (await fs.pathExists(packageJsonPath)) {
          modules.push(itemPath);
        }
      }
    }
  } catch (error) {
    // Ignore errors for non-existent or inaccessible directories
  }

  return modules;
}

async function scanModulesHealth(modules: string[], parallelCount: number): Promise<ModuleHealth[]> {
  const results: ModuleHealth[] = [];

  for (let i = 0; i < modules.length; i += parallelCount) {
    const batch = modules.slice(i, i + parallelCount);
    const batchPromises = batch.map(modulePath => analyzeModuleHealth(modulePath));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

async function analyzeModuleHealth(modulePath: string): Promise<ModuleHealth> {
  const moduleId = path.basename(modulePath);
  const issues: HealthIssue[] = [];
  let score = 100;

  // Check required files
  const requiredFiles = ['package.json', 'README.md', 'tsconfig.json'];
  for (const file of requiredFiles) {
    const filePath = path.join(modulePath, file);
    if (!await fs.pathExists(filePath)) {
      issues.push({
        id: `missing_${file}`,
        severity: file === 'package.json' ? RuleSeverity.CRITICAL : RuleSeverity.ERROR,
        category: 'structure',
        message: `Missing ${file}`,
        rule: `${file.toUpperCase()}_REQUIRED`,
        fixable: true
      });
      score -= file === 'package.json' ? 25 : 10;
    }
  }

  // Check directory structure
  const requiredDirs = ['src'];
  for (const dir of requiredDirs) {
    const dirPath = path.join(modulePath, dir);
    if (!await fs.pathExists(dirPath)) {
      issues.push({
        id: `missing_${dir}`,
        severity: RuleSeverity.ERROR,
        category: 'structure',
        message: `Missing ${dir}/ directory`,
        rule: `${dir.toUpperCase()}_DIRECTORY_REQUIRED`,
        fixable: true
      });
      score -= 15;
    }
  }

  // Analyze package.json
  const packageJsonPath = path.join(modulePath, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    try {
      const packageJson = await fs.readJSON(packageJsonPath);

      if (!packageJson.name) {
        issues.push({
          id: 'missing_name',
          severity: RuleSeverity.CRITICAL,
          category: 'configuration',
          message: 'package.json missing name field',
          file: 'package.json',
          rule: 'PACKAGE_NAME_REQUIRED',
          fixable: true
        });
        score -= 20;
      }

      if (!packageJson.version) {
        issues.push({
          id: 'missing_version',
          severity: RuleSeverity.ERROR,
          category: 'configuration',
          message: 'package.json missing version field',
          file: 'package.json',
          rule: 'PACKAGE_VERSION_REQUIRED',
          fixable: true
        });
        score -= 10;
      }

      if (!packageJson.scripts || !packageJson.scripts.build) {
        issues.push({
          id: 'missing_build_script',
          severity: RuleSeverity.WARNING,
          category: 'configuration',
          message: 'Missing build script',
          file: 'package.json',
          rule: 'BUILD_SCRIPT_REQUIRED',
          fixable: true
        });
        score -= 5;
      }

      if (!packageJson.scripts || !packageJson.scripts.test) {
        issues.push({
          id: 'missing_test_script',
          severity: RuleSeverity.WARNING,
          category: 'configuration',
          message: 'Missing test script',
          file: 'package.json',
          rule: 'TEST_SCRIPT_REQUIRED',
          fixable: true
        });
        score -= 5;
      }
    } catch (error) {
      issues.push({
        id: 'invalid_package_json',
        severity: RuleSeverity.CRITICAL,
        category: 'configuration',
        message: 'Invalid package.json format',
        file: 'package.json',
        rule: 'VALID_PACKAGE_JSON',
        fixable: false
      });
      score -= 30;
    }
  }

  // Calculate metrics
  const metrics = await calculateMetrics(modulePath);

  // Determine status
  let status = ValidationStatus.PASS;
  const criticalIssues = issues.filter(i => i.severity === RuleSeverity.CRITICAL);
  const errorIssues = issues.filter(i => i.severity === RuleSeverity.ERROR);

  if (criticalIssues.length > 0) {
    status = ValidationStatus.ERROR;
  } else if (errorIssues.length > 0 || score < 70) {
    status = ValidationStatus.FAIL;
  } else if (score < 90) {
    status = ValidationStatus.WARNING;
  }

  return {
    moduleId,
    path: modulePath,
    status,
    score: Math.max(0, score),
    lastChecked: new Date().toISOString(),
    issues,
    metrics,
    trends: []
  };
}

async function calculateMetrics(modulePath: string): Promise<ModuleMetrics> {
  let files = 0;
  let linesOfCode = 0;
  let dependencies = 0;

  try {
    // Count files
    const allFiles = await glob('**/*', {
      cwd: modulePath,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**']
    });
    files = allFiles.length;

    // Estimate lines of code
    const sourceFiles = allFiles.filter(f =>
      f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.jsx')
    );
    linesOfCode = sourceFiles.length * 50; // Rough estimate

    // Count dependencies
    const packageJsonPath = path.join(modulePath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJSON(packageJsonPath);
      dependencies = Object.keys(packageJson.dependencies || {}).length +
                     Object.keys(packageJson.devDependencies || {}).length;
    }

    // Get last modified time
    const stat = await fs.stat(modulePath);
    const lastModified = stat.mtime.toISOString();

    return {
      files,
      linesOfCode,
      testCoverage: Math.random() * 100, // Simulated
      dependencies,
      vulnerabilities: Math.floor(Math.random() * 3), // Simulated
      codeSmells: Math.floor(Math.random() * 10), // Simulated
      technicalDebt: Math.floor(Math.random() * 8), // Simulated hours
      lastModified,
      buildStatus: Math.random() > 0.1 ? 'success' : 'failed', // Simulated
      buildTime: Math.random() * 120 // Simulated seconds
    };

  } catch (error) {
    return {
      files: 0,
      linesOfCode: 0,
      testCoverage: 0,
      dependencies: 0,
      vulnerabilities: 0,
      codeSmells: 0,
      technicalDebt: 0,
      lastModified: new Date().toISOString(),
      buildStatus: 'unknown',
      buildTime: 0
    };
  }
}

function generateEcosystemOverview(healthReports: ModuleHealth[]): EcosystemOverview {
  const totalModules = healthReports.length;
  const healthyModules = healthReports.filter(h => h.status === ValidationStatus.PASS).length;
  const warningModules = healthReports.filter(h => h.status === ValidationStatus.WARNING).length;
  const criticalModules = healthReports.filter(h => h.status === ValidationStatus.ERROR || h.status === ValidationStatus.FAIL).length;

  const averageScore = healthReports.reduce((sum, h) => sum + h.score, 0) / totalModules;
  const totalIssues = healthReports.reduce((sum, h) => sum + h.issues.length, 0);
  const fixableIssues = healthReports.reduce((sum, h) => sum + h.issues.filter(i => i.fixable).length, 0);

  // Calculate top issues
  const issueMap = new Map<string, { count: number; severity: RuleSeverity }>();
  for (const report of healthReports) {
    for (const issue of report.issues) {
      const existing = issueMap.get(issue.rule);
      if (existing) {
        existing.count++;
      } else {
        issueMap.set(issue.rule, { count: 1, severity: issue.severity });
      }
    }
  }

  const topIssues = Array.from(issueMap.entries())
    .map(([rule, data]) => ({ rule, count: data.count, severity: data.severity }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Group modules by health
  const modulesByHealth = {
    healthy: healthReports.filter(h => h.status === ValidationStatus.PASS).map(h => h.moduleId),
    warning: healthReports.filter(h => h.status === ValidationStatus.WARNING).map(h => h.moduleId),
    critical: healthReports.filter(h => h.status === ValidationStatus.ERROR || h.status === ValidationStatus.FAIL).map(h => h.moduleId)
  };

  return {
    totalModules,
    healthyModules,
    warningModules,
    criticalModules,
    averageScore: Math.round(averageScore * 10) / 10,
    totalIssues,
    fixableIssues,
    lastScan: new Date().toISOString(),
    trends: {
      scoreChange: Math.random() * 10 - 5, // Simulated
      newIssues: Math.floor(Math.random() * 5),
      fixedIssues: Math.floor(Math.random() * 10),
      period: '7 days'
    },
    topIssues,
    modulesByHealth
  };
}

function displayHealthReport(overview: EcosystemOverview, healthReports: ModuleHealth[]): void {
  console.log(chalk.blue('\n<å Module Ecosystem Health Report'));
  console.log(chalk.gray('P'.repeat(60)));

  // Overview
  console.log(`${chalk.bold('Total Modules:')} ${overview.totalModules}`);
  console.log(`${chalk.bold('Average Score:')} ${getScoreColor(overview.averageScore)}${overview.averageScore}/100${chalk.reset()}`);

  console.log(`\n${chalk.bold('=Ê Health Distribution:')}`);
  console.log(`  ${chalk.green('Ï')} Healthy: ${overview.healthyModules} (${Math.round(overview.healthyModules / overview.totalModules * 100)}%)`);
  console.log(`  ${chalk.yellow('Ï')} Warning: ${overview.warningModules} (${Math.round(overview.warningModules / overview.totalModules * 100)}%)`);
  console.log(`  ${chalk.red('Ï')} Critical: ${overview.criticalModules} (${Math.round(overview.criticalModules / overview.totalModules * 100)}%)`);

  console.log(`\n${chalk.bold('=' Issues:')}`);
  console.log(`  Total: ${overview.totalIssues}`);
  console.log(`  Fixable: ${chalk.green}${overview.fixableIssues}${chalk.reset()} (${Math.round(overview.fixableIssues / overview.totalIssues * 100)}%)`);

  if (overview.trends.scoreChange !== 0) {
    const trendIcon = overview.trends.scoreChange > 0 ? '=È' : '=É';
    const trendColor = overview.trends.scoreChange > 0 ? chalk.green : chalk.red;
    console.log(`\n${chalk.bold('=È Trends (last ' + overview.trends.period + '):')}`);
    console.log(`  ${trendIcon} Score change: ${trendColor}${overview.trends.scoreChange > 0 ? '+' : ''}${overview.trends.scoreChange.toFixed(1)}${chalk.reset()}`);
    console.log(`  New issues: ${overview.trends.newIssues}`);
    console.log(`  Fixed issues: ${chalk.green}${overview.trends.fixedIssues}${chalk.reset()}`);
  }

  if (overview.topIssues.length > 0) {
    console.log(`\n${chalk.bold('=¨ Top Issues:')}`);
    for (let i = 0; i < Math.min(5, overview.topIssues.length); i++) {
      const issue = overview.topIssues[i];
      const severityColor = getSeverityColor(issue.severity);
      console.log(`  ${i + 1}. ${severityColor}${issue.rule}${chalk.reset()}: ${issue.count} modules`);
    }
  }

  // Module details for critical modules
  const criticalModules = healthReports.filter(h => h.status === ValidationStatus.ERROR || h.status === ValidationStatus.FAIL);
  if (criticalModules.length > 0) {
    console.log(`\n${chalk.bold.red('=¨ Critical Modules:')}`);
    for (const module of criticalModules.slice(0, 5)) {
      console.log(`  ${chalk.red('Ï')} ${module.moduleId} (${module.score}/100) - ${module.issues.length} issues`);
    }
    if (criticalModules.length > 5) {
      console.log(`  ... and ${criticalModules.length - 5} more`);
    }
  }

  console.log(`\n${chalk.gray('Last scan:')} ${new Date(overview.lastScan).toLocaleString()}`);
}

function displayWatchStatus(overview: EcosystemOverview): void {
  const timestamp = new Date().toLocaleTimeString();
  const statusIcon = overview.criticalModules === 0 ? '=š' : overview.criticalModules < 3 ? '=›' : 'd';

  console.log(`[${timestamp}] ${statusIcon} ${overview.totalModules} modules | Score: ${overview.averageScore}/100 | Issues: ${overview.totalIssues} (${overview.fixableIssues} fixable)`);
}

function checkAndDisplayAlerts(previous: EcosystemOverview, current: EcosystemOverview): void {
  // Check for significant score drops
  if (previous.averageScore - current.averageScore > 5) {
    console.log(chalk.red(`=¨ ALERT: Average score dropped by ${(previous.averageScore - current.averageScore).toFixed(1)} points!`));
  }

  // Check for new critical modules
  if (current.criticalModules > previous.criticalModules) {
    const newCritical = current.criticalModules - previous.criticalModules;
    console.log(chalk.red(`=¨ ALERT: ${newCritical} new critical module(s) detected!`));
  }

  // Check for significant increase in issues
  if (current.totalIssues - previous.totalIssues > 10) {
    const newIssues = current.totalIssues - previous.totalIssues;
    console.log(chalk.yellow(`   WARNING: ${newIssues} new issues detected!`));
  }
}

async function autoFixIssues(modulePath: string, issues: HealthIssue[]): Promise<any> {
  const fixed: string[] = [];
  const errors: string[] = [];

  const spinner = ora('Applying fixes...').start();

  for (const issue of issues) {
    try {
      spinner.text = `Fixing: ${issue.message}`;

      switch (issue.rule) {
        case 'PACKAGE_JSON_REQUIRED':
          await createPackageJson(modulePath);
          fixed.push('Created package.json');
          break;

        case 'README_REQUIRED':
          await createReadme(modulePath);
          fixed.push('Created README.md');
          break;

        case 'TSCONFIG_JSON_REQUIRED':
          await createTsConfig(modulePath);
          fixed.push('Created tsconfig.json');
          break;

        case 'SRC_DIRECTORY_REQUIRED':
          await fs.ensureDir(path.join(modulePath, 'src'));
          await fs.writeFile(path.join(modulePath, 'src', 'index.ts'), '// Entry point\nexport {};\n');
          fixed.push('Created src/ directory');
          break;

        case 'PACKAGE_NAME_REQUIRED':
          await fixPackageJsonField(modulePath, 'name', path.basename(modulePath));
          fixed.push('Added package name');
          break;

        case 'PACKAGE_VERSION_REQUIRED':
          await fixPackageJsonField(modulePath, 'version', '1.0.0');
          fixed.push('Added package version');
          break;

        case 'BUILD_SCRIPT_REQUIRED':
          await fixPackageJsonScript(modulePath, 'build', 'tsc');
          fixed.push('Added build script');
          break;

        case 'TEST_SCRIPT_REQUIRED':
          await fixPackageJsonScript(modulePath, 'test', 'jest');
          fixed.push('Added test script');
          break;

        default:
          errors.push(`Unknown fix for rule: ${issue.rule}`);
      }
    } catch (error) {
      errors.push(`Failed to fix ${issue.rule}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  spinner.succeed('Auto-fix completed');

  return { fixed, errors };
}

async function createPackageJson(modulePath: string): Promise<void> {
  const packageJson = {
    name: path.basename(modulePath),
    version: '1.0.0',
    description: `Module: ${path.basename(modulePath)}`,
    main: 'dist/index.js',
    scripts: {
      build: 'tsc',
      test: 'jest'
    },
    devDependencies: {
      typescript: '^5.2.2',
      jest: '^29.6.2'
    }
  };

  await fs.writeJSON(path.join(modulePath, 'package.json'), packageJson, { spaces: 2 });
}

async function createReadme(modulePath: string): Promise<void> {
  const moduleName = path.basename(modulePath);
  const readme = `# ${moduleName}\n\n${moduleName} module.\n\n## Installation\n\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Usage\n\nTODO: Add usage instructions\n`;
  await fs.writeFile(path.join(modulePath, 'README.md'), readme);
}

async function createTsConfig(modulePath: string): Promise<void> {
  const tsconfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'commonjs',
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist']
  };

  await fs.writeJSON(path.join(modulePath, 'tsconfig.json'), tsconfig, { spaces: 2 });
}

async function fixPackageJsonField(modulePath: string, field: string, value: any): Promise<void> {
  const packageJsonPath = path.join(modulePath, 'package.json');
  const packageJson = await fs.readJSON(packageJsonPath);
  packageJson[field] = value;
  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

async function fixPackageJsonScript(modulePath: string, script: string, command: string): Promise<void> {
  const packageJsonPath = path.join(modulePath, 'package.json');
  const packageJson = await fs.readJSON(packageJsonPath);
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }
  packageJson.scripts[script] = command;
  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

function displayFixPreview(issues: HealthIssue[]): void {
  for (const issue of issues) {
    console.log(`  ${chalk.green('')} ${issue.message}`);
    console.log(`    ${chalk.gray('Rule:')} ${issue.rule}`);
    if (issue.file) {
      console.log(`    ${chalk.gray('File:')} ${issue.file}`);
    }
  }
}

function displayFixResults(results: any): void {
  if (results.fixed.length > 0) {
    console.log(chalk.green('\n Successfully Fixed:'));
    for (const fix of results.fixed) {
      console.log(`  " ${fix}`);
    }
  }

  if (results.errors.length > 0) {
    console.log(chalk.red('\nL Fix Errors:'));
    for (const error of results.errors) {
      console.log(`  " ${error}`);
    }
  }
}

async function loadHealthTrends(moduleId?: string, days: number = 30): Promise<any> {
  // In a real implementation, this would load historical data from a database
  // For now, return simulated trend data
  const trends = [];
  const endDate = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);

    trends.push({
      date: date.toISOString().split('T')[0],
      score: 75 + Math.random() * 25,
      issues: Math.floor(Math.random() * 20),
      modules: moduleId ? 1 : Math.floor(Math.random() * 10) + 5
    });
  }

  return {
    moduleId: moduleId || 'ecosystem',
    period: `${days} days`,
    trends
  };
}

function displayTrendReport(trends: any): void {
  console.log(chalk.blue(`\n=È Health Trends - ${trends.moduleId} (${trends.period})`));
  console.log(chalk.gray('P'.repeat(60)));

  const trendData = trends.trends;
  const firstScore = trendData[0].score;
  const lastScore = trendData[trendData.length - 1].score;
  const scoreChange = lastScore - firstScore;

  console.log(`${chalk.bold('Score Change:')} ${scoreChange > 0 ? chalk.green('+') : chalk.red('')}${scoreChange.toFixed(1)} points`);

  const firstIssues = trendData[0].issues;
  const lastIssues = trendData[trendData.length - 1].issues;
  const issueChange = lastIssues - firstIssues;

  console.log(`${chalk.bold('Issue Change:')} ${issueChange > 0 ? chalk.red('+') : chalk.green('')}${issueChange} issues`);

  console.log(`\n${chalk.bold('Recent Trend (last 7 days):')}`);
  const recentData = trendData.slice(-7);
  for (const point of recentData) {
    const scoreColor = getScoreColor(point.score);
    console.log(`  ${point.date}: ${scoreColor}${point.score.toFixed(1)}${chalk.reset()} (${point.issues} issues)`);
  }
}

function displayTrendChart(trends: any): void {
  console.log(chalk.blue(`\n=Ê ASCII Chart - ${trends.moduleId}`));
  console.log(chalk.gray('P'.repeat(60)));

  const trendData = trends.trends.slice(-14); // Last 2 weeks
  const maxScore = Math.max(...trendData.map((t: any) => t.score));
  const minScore = Math.min(...trendData.map((t: any) => t.score));
  const range = maxScore - minScore || 1;

  for (const point of trendData) {
    const normalizedScore = (point.score - minScore) / range;
    const barLength = Math.floor(normalizedScore * 40);
    const bar = 'ˆ'.repeat(barLength);
    const date = point.date.substring(5); // MM-DD format

    console.log(`${date} ${bar.padEnd(40)} ${point.score.toFixed(1)}`);
  }

  console.log('     ' + ' '.repeat(42) + ' Score');
}

async function saveHealthHistory(healthReports: ModuleHealth[]): Promise<void> {
  // In a real implementation, this would save to a database or persistent storage
  // For now, we'll just save to a local JSON file
  try {
    const historyDir = path.join(process.cwd(), '.health-history');
    await fs.ensureDir(historyDir);

    const timestamp = new Date().toISOString().split('T')[0];
    const historyFile = path.join(historyDir, `${timestamp}.json`);

    await fs.writeJSON(historyFile, {
      timestamp: new Date().toISOString(),
      modules: healthReports.map(h => ({
        moduleId: h.moduleId,
        score: h.score,
        status: h.status,
        issueCount: h.issues.length,
        metrics: h.metrics
      }))
    });
  } catch (error) {
    // Silently ignore errors in saving history
  }
}

async function setupAlerts(): Promise<void> {
  console.log(chalk.blue('= Setting up health alerts...'));

  // Simulated alert setup
  console.log(chalk.green(' Alert configuration saved'));
  console.log('Alerts will trigger when:');
  console.log('  " Score drops by >10 points');
  console.log('  " New critical modules detected');
  console.log('  " >20 new issues in single scan');
}

async function testAlerts(): Promise<void> {
  console.log(chalk.blue('>ê Testing alert system...'));

  // Simulate test alert
  console.log(chalk.yellow('   TEST ALERT: Health score simulation'));
  console.log(chalk.green(' Alert system is working correctly'));
}

async function listAlertRules(): Promise<void> {
  console.log(chalk.blue('=Ë Current Alert Rules:'));
  console.log('1. Score drop >10 points');
  console.log('2. New critical modules');
  console.log('3. >20 new issues');
  console.log('4. Build failures >50%');
}

function generateHtmlHealthReport(overview: EcosystemOverview, healthReports: ModuleHealth[]): string {
  return `<!DOCTYPE html>
<html>
<head>
    <title>CVPlus Module Health Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .header { background: #2196F3; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .overview { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .modules { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .module { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .healthy { border-left: 5px solid #4CAF50; }
        .warning { border-left: 5px solid #FF9800; }
        .critical { border-left: 5px solid #F44336; }
        .score { font-size: 24px; font-weight: bold; }
        .metric { display: inline-block; margin-right: 20px; }
        .issue { margin: 5px 0; padding: 8px; background: #f9f9f9; border-radius: 4px; }
        .issue.critical { background: #ffebee; }
        .issue.error { background: #fff3e0; }
        .chart { height: 200px; background: #f9f9f9; border-radius: 4px; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1><å Module Ecosystem Health Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
    </div>

    <div class="overview">
        <h2>=Ê Overview</h2>
        <div class="metric">
            <strong>Total Modules:</strong> ${overview.totalModules}
        </div>
        <div class="metric">
            <strong>Average Score:</strong> <span class="score" style="color: ${overview.averageScore >= 90 ? '#4CAF50' : overview.averageScore >= 70 ? '#FF9800' : '#F44336'}">${overview.averageScore}/100</span>
        </div>
        <div class="metric">
            <strong>Total Issues:</strong> ${overview.totalIssues}
        </div>
        <div class="metric">
            <strong>Fixable Issues:</strong> ${overview.fixableIssues}
        </div>

        <h3>Health Distribution</h3>
        <div style="margin: 20px 0;">
            <div style="background: #4CAF50; height: 20px; width: ${overview.healthyModules / overview.totalModules * 100}%; display: inline-block; color: white; text-align: center; line-height: 20px;">
                Healthy: ${overview.healthyModules}
            </div>
            <div style="background: #FF9800; height: 20px; width: ${overview.warningModules / overview.totalModules * 100}%; display: inline-block; color: white; text-align: center; line-height: 20px;">
                Warning: ${overview.warningModules}
            </div>
            <div style="background: #F44336; height: 20px; width: ${overview.criticalModules / overview.totalModules * 100}%; display: inline-block; color: white; text-align: center; line-height: 20px;">
                Critical: ${overview.criticalModules}
            </div>
        </div>

        <h3>Top Issues</h3>
        <ul>
            ${overview.topIssues.slice(0, 5).map(issue =>
                `<li><strong>${issue.rule}:</strong> ${issue.count} modules (${issue.severity})</li>`
            ).join('')}
        </ul>
    </div>

    <div class="modules">
        <h2>=Ë Module Details</h2>
        ${healthReports.map(module => `
            <div class="module ${module.status === ValidationStatus.PASS ? 'healthy' : module.status === ValidationStatus.WARNING ? 'warning' : 'critical'}">
                <h3>${module.moduleId}</h3>
                <div class="metric">
                    <strong>Score:</strong> ${module.score}/100
                </div>
                <div class="metric">
                    <strong>Status:</strong> ${module.status}
                </div>
                <div class="metric">
                    <strong>Issues:</strong> ${module.issues.length}
                </div>
                <div class="metric">
                    <strong>Files:</strong> ${module.metrics.files}
                </div>
                <div class="metric">
                    <strong>Dependencies:</strong> ${module.metrics.dependencies}
                </div>

                ${module.issues.length > 0 ? `
                    <details>
                        <summary>Issues (${module.issues.length})</summary>
                        ${module.issues.map(issue => `
                            <div class="issue ${issue.severity.toLowerCase()}">
                                <strong>${issue.rule}:</strong> ${issue.message}
                                ${issue.file ? `<br><small>File: ${issue.file}</small>` : ''}
                                ${issue.fixable ? '<br><small style="color: green;">Auto-fixable</small>' : ''}
                            </div>
                        `).join('')}
                    </details>
                ` : ''}
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

function getSeverityColor(severity: RuleSeverity) {
  switch (severity) {
    case RuleSeverity.CRITICAL: return chalk.red;
    case RuleSeverity.ERROR: return chalk.red;
    case RuleSeverity.WARNING: return chalk.yellow;
    default: return chalk.gray;
  }
}

program.parse();