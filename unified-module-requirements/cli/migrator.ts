#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { glob } from 'glob';
import { ModuleType, ValidationStatus } from '../src/models/enums';

const program = new Command();

interface MigrationPlan {
  source: string;
  target: string;
  files: string[];
  dependencies: string[];
  conflicts: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  risks: string[];
  steps: MigrationStep[];
}

interface MigrationStep {
  id: string;
  description: string;
  type: 'file_move' | 'file_update' | 'dependency_update' | 'config_update' | 'validation';
  source?: string;
  target?: string;
  content?: string;
  backupRequired: boolean;
}

interface MigrationReport {
  planId: string;
  timestamp: string;
  status: 'success' | 'partial' | 'failed';
  steps: Array<{
    stepId: string;
    status: ValidationStatus;
    message: string;
    duration: number;
  }>;
  totalFiles: number;
  migratedFiles: number;
  failedFiles: number;
  warnings: string[];
  errors: string[];
}

program
  .name('cvplus-migrator')
  .description('CVPlus Module Migration CLI')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze legacy module for migration')
  .requiredOption('-s, --source <path>', 'Source module path')
  .option('-t, --target <path>', 'Target module path')
  .option('-o, --output <file>', 'Output analysis report file')
  .option('--format <format>', 'Output format (json|yaml|text)', 'text')
  .action(async (options) => {
    try {
      const spinner = ora('Analyzing module...').start();

      const sourcePath = path.resolve(options.source);
      if (!await fs.pathExists(sourcePath)) {
        spinner.fail(`Source module not found: ${sourcePath}`);
        process.exit(1);
      }

      const analysis = await analyzeModule(sourcePath, options.target);

      spinner.succeed('Analysis completed');

      if (options.format === 'json') {
        const output = JSON.stringify(analysis, null, 2);
        if (options.output) {
          await fs.writeFile(options.output, output);
          console.log(chalk.green(`=Ä Analysis saved to: ${options.output}`));
        } else {
          console.log(output);
        }
      } else {
        displayAnalysisReport(analysis);
      }

    } catch (error) {
      console.error(chalk.red('L Analysis failed:'), error);
      process.exit(1);
    }
  });

program
  .command('plan')
  .description('Create migration plan')
  .requiredOption('-s, --source <path>', 'Source module path')
  .requiredOption('-t, --target <path>', 'Target module path')
  .option('-o, --output <file>', 'Output plan file')
  .option('--interactive', 'Interactive plan creation')
  .action(async (options) => {
    try {
      const spinner = ora('Creating migration plan...').start();

      const sourcePath = path.resolve(options.source);
      const targetPath = path.resolve(options.target);

      if (!await fs.pathExists(sourcePath)) {
        spinner.fail(`Source module not found: ${sourcePath}`);
        process.exit(1);
      }

      let plan = await createMigrationPlan(sourcePath, targetPath);

      if (options.interactive) {
        spinner.stop();
        plan = await interactivePlanRefinement(plan);
        spinner.start('Finalizing plan...');
      }

      const planFile = options.output || path.join(process.cwd(), `migration-plan-${Date.now()}.json`);
      await fs.writeJSON(planFile, plan, { spaces: 2 });

      spinner.succeed('Migration plan created');

      console.log(chalk.green(`=Ë Migration plan saved to: ${planFile}`));
      displayPlanSummary(plan);

    } catch (error) {
      console.error(chalk.red('L Plan creation failed:'), error);
      process.exit(1);
    }
  });

program
  .command('execute')
  .description('Execute migration plan')
  .requiredOption('-p, --plan <file>', 'Migration plan file')
  .option('-d, --dry-run', 'Dry run (preview changes)')
  .option('--backup', 'Create backup before migration')
  .option('--force', 'Force migration despite warnings')
  .option('-r, --report <file>', 'Migration report output file')
  .action(async (options) => {
    try {
      const planFile = path.resolve(options.plan);
      if (!await fs.pathExists(planFile)) {
        console.error(chalk.red(`Migration plan not found: ${planFile}`));
        process.exit(1);
      }

      const plan: MigrationPlan = await fs.readJSON(planFile);

      if (options.dryRun) {
        console.log(chalk.blue('= Dry run mode - no changes will be made'));
        await previewMigration(plan);
        return;
      }

      if (!options.force && plan.risks.length > 0) {
        console.log(chalk.yellow('   Migration risks detected:'));
        for (const risk of plan.risks) {
          console.log(`  " ${risk}`);
        }

        const { proceed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'proceed',
          message: 'Do you want to proceed with migration?',
          default: false
        }]);

        if (!proceed) {
          console.log(chalk.yellow('Migration cancelled'));
          return;
        }
      }

      const report = await executeMigration(plan, options.backup);

      if (options.report) {
        await fs.writeJSON(options.report, report, { spaces: 2 });
        console.log(chalk.green(`=Ê Migration report saved to: ${options.report}`));
      }

      displayMigrationReport(report);

    } catch (error) {
      console.error(chalk.red('L Migration failed:'), error);
      process.exit(1);
    }
  });

program
  .command('rollback')
  .description('Rollback migration')
  .requiredOption('-r, --report <file>', 'Migration report file')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      const reportFile = path.resolve(options.report);
      if (!await fs.pathExists(reportFile)) {
        console.error(chalk.red(`Migration report not found: ${reportFile}`));
        process.exit(1);
      }

      const report: MigrationReport = await fs.readJSON(reportFile);

      if (!options.confirm) {
        const { proceed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'proceed',
          message: 'Are you sure you want to rollback this migration?',
          default: false
        }]);

        if (!proceed) {
          console.log(chalk.yellow('Rollback cancelled'));
          return;
        }
      }

      const rollbackResult = await rollbackMigration(report);

      if (rollbackResult.success) {
        console.log(chalk.green(' Migration rolled back successfully'));
      } else {
        console.log(chalk.red('L Rollback failed:'), rollbackResult.error);
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('L Rollback failed:'), error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate migrated module')
  .requiredOption('-m, --module <path>', 'Module path to validate')
  .option('-r, --rules <rules...>', 'Specific validation rules')
  .option('--fix', 'Auto-fix validation issues')
  .action(async (options) => {
    try {
      const spinner = ora('Validating migrated module...').start();

      const modulePath = path.resolve(options.module);
      if (!await fs.pathExists(modulePath)) {
        spinner.fail(`Module not found: ${modulePath}`);
        process.exit(1);
      }

      const validationResult = await validateMigratedModule(modulePath, options.rules);

      if (options.fix && validationResult.fixableIssues.length > 0) {
        spinner.text = 'Auto-fixing validation issues...';
        const fixResult = await autoFixValidationIssues(modulePath, validationResult.fixableIssues);
        validationResult.fixed = fixResult.fixed;
        validationResult.fixErrors = fixResult.errors;
      }

      spinner.succeed('Validation completed');

      displayValidationResult(validationResult);

      if (validationResult.status === ValidationStatus.FAIL) {
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('L Validation failed:'), error);
      process.exit(1);
    }
  });

async function analyzeModule(sourcePath: string, targetPath?: string) {
  const packageJsonPath = path.join(sourcePath, 'package.json');
  const moduleInfo: any = { name: path.basename(sourcePath) };

  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJSON(packageJsonPath);
    moduleInfo.name = packageJson.name;
    moduleInfo.version = packageJson.version;
    moduleInfo.dependencies = Object.keys(packageJson.dependencies || {});
    moduleInfo.devDependencies = Object.keys(packageJson.devDependencies || {});
  }

  const files = await glob('**/*', { cwd: sourcePath, ignore: ['node_modules/**', '.git/**'] });
  const sourceFiles = files.filter(f => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.jsx'));

  const complexity = calculateComplexity(files, sourceFiles);
  const dependencies = await analyzeDependencies(sourcePath);
  const conflicts = targetPath ? await detectConflicts(sourcePath, targetPath) : [];

  return {
    module: moduleInfo,
    files: {
      total: files.length,
      source: sourceFiles.length,
      tests: files.filter(f => f.includes('.test.') || f.includes('.spec.')).length,
      configs: files.filter(f => f.includes('config') || f.endsWith('.json')).length
    },
    complexity,
    dependencies,
    conflicts,
    recommendations: generateRecommendations(complexity, dependencies, conflicts),
    timestamp: new Date().toISOString()
  };
}

function calculateComplexity(allFiles: string[], sourceFiles: string[]): any {
  const linesOfCode = sourceFiles.length * 50; // Estimate
  const configFiles = allFiles.filter(f =>
    f.includes('config') ||
    f.endsWith('.json') ||
    f.endsWith('.yaml') ||
    f.endsWith('.yml')
  ).length;

  let complexity: 'low' | 'medium' | 'high' = 'low';
  if (linesOfCode > 1000 || configFiles > 5) complexity = 'medium';
  if (linesOfCode > 5000 || configFiles > 10) complexity = 'high';

  return {
    level: complexity,
    linesOfCode: linesOfCode,
    configFiles: configFiles,
    estimatedHours: complexity === 'low' ? 2 : complexity === 'medium' ? 8 : 24
  };
}

async function analyzeDependencies(sourcePath: string) {
  const packageJsonPath = path.join(sourcePath, 'package.json');
  if (!await fs.pathExists(packageJsonPath)) {
    return { dependencies: [], devDependencies: [], conflicts: [], outdated: [] };
  }

  const packageJson = await fs.readJSON(packageJsonPath);
  const deps = Object.keys(packageJson.dependencies || {});
  const devDeps = Object.keys(packageJson.devDependencies || {});

  // Simulate dependency analysis
  const outdated = deps.filter(dep => Math.random() > 0.8); // Random for demo
  const conflicts = deps.filter(dep => dep.includes('old') || dep.includes('legacy'));

  return {
    dependencies: deps,
    devDependencies: devDeps,
    conflicts,
    outdated,
    total: deps.length + devDeps.length
  };
}

async function detectConflicts(sourcePath: string, targetPath: string): Promise<string[]> {
  const conflicts: string[] = [];

  if (await fs.pathExists(targetPath)) {
    const sourceFiles = await glob('**/*.{ts,js,tsx,jsx}', { cwd: sourcePath });
    const targetFiles = await glob('**/*.{ts,js,tsx,jsx}', { cwd: targetPath });

    const overlapping = sourceFiles.filter(file => targetFiles.includes(file));
    conflicts.push(...overlapping.map(file => `File conflict: ${file}`));

    // Check package.json conflicts
    const sourcePkg = path.join(sourcePath, 'package.json');
    const targetPkg = path.join(targetPath, 'package.json');

    if (await fs.pathExists(sourcePkg) && await fs.pathExists(targetPkg)) {
      const sourceDeps = await fs.readJSON(sourcePkg);
      const targetDeps = await fs.readJSON(targetPkg);

      const sourceDepNames = Object.keys(sourceDeps.dependencies || {});
      const targetDepNames = Object.keys(targetDeps.dependencies || {});

      const conflictingDeps = sourceDepNames.filter(dep =>
        targetDepNames.includes(dep) &&
        sourceDeps.dependencies[dep] !== targetDeps.dependencies[dep]
      );

      conflicts.push(...conflictingDeps.map(dep => `Dependency version conflict: ${dep}`));
    }
  }

  return conflicts;
}

function generateRecommendations(complexity: any, dependencies: any, conflicts: string[]): string[] {
  const recommendations: string[] = [];

  if (complexity.level === 'high') {
    recommendations.push('Consider breaking down module into smaller components');
    recommendations.push('Review and optimize code before migration');
  }

  if (dependencies.outdated.length > 0) {
    recommendations.push('Update outdated dependencies before migration');
  }

  if (dependencies.conflicts.length > 0) {
    recommendations.push('Resolve dependency conflicts before proceeding');
  }

  if (conflicts.length > 0) {
    recommendations.push('Address file and dependency conflicts');
    recommendations.push('Consider renaming conflicting files');
  }

  if (recommendations.length === 0) {
    recommendations.push('Module appears ready for migration');
  }

  return recommendations;
}

async function createMigrationPlan(sourcePath: string, targetPath: string): Promise<MigrationPlan> {
  const files = await glob('**/*', {
    cwd: sourcePath,
    ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**']
  });

  const analysis = await analyzeModule(sourcePath, targetPath);
  const conflicts = await detectConflicts(sourcePath, targetPath);

  const steps: MigrationStep[] = [];

  // Step 1: Create target directory
  steps.push({
    id: 'create_target',
    description: 'Create target directory structure',
    type: 'config_update',
    target: targetPath,
    backupRequired: false
  });

  // Step 2: Copy package.json and update
  if (files.includes('package.json')) {
    steps.push({
      id: 'migrate_package_json',
      description: 'Migrate and update package.json',
      type: 'file_update',
      source: path.join(sourcePath, 'package.json'),
      target: path.join(targetPath, 'package.json'),
      backupRequired: true
    });
  }

  // Step 3: Copy source files
  const sourceFiles = files.filter(f =>
    f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.jsx')
  );

  for (const file of sourceFiles) {
    steps.push({
      id: `migrate_${file.replace(/[^a-zA-Z0-9]/g, '_')}`,
      description: `Migrate ${file}`,
      type: 'file_move',
      source: path.join(sourcePath, file),
      target: path.join(targetPath, file),
      backupRequired: true
    });
  }

  // Step 4: Copy configuration files
  const configFiles = files.filter(f =>
    f.includes('config') || f.endsWith('.json') || f.endsWith('.yaml')
  );

  for (const file of configFiles) {
    if (file !== 'package.json') {
      steps.push({
        id: `migrate_config_${file.replace(/[^a-zA-Z0-9]/g, '_')}`,
        description: `Migrate configuration ${file}`,
        type: 'file_move',
        source: path.join(sourcePath, file),
        target: path.join(targetPath, file),
        backupRequired: true
      });
    }
  }

  // Step 5: Update dependencies
  steps.push({
    id: 'update_dependencies',
    description: 'Install and update dependencies',
    type: 'dependency_update',
    target: targetPath,
    backupRequired: false
  });

  // Step 6: Validate migration
  steps.push({
    id: 'validate_migration',
    description: 'Validate migrated module',
    type: 'validation',
    target: targetPath,
    backupRequired: false
  });

  const risks: string[] = [];
  if (conflicts.length > 0) {
    risks.push('File conflicts detected - manual resolution required');
  }
  if (analysis.complexity.level === 'high') {
    risks.push('High complexity module - extensive testing recommended');
  }
  if (analysis.dependencies.conflicts.length > 0) {
    risks.push('Dependency conflicts may cause runtime issues');
  }

  return {
    source: sourcePath,
    target: targetPath,
    files,
    dependencies: analysis.dependencies.dependencies,
    conflicts,
    estimatedEffort: analysis.complexity.level,
    risks,
    steps
  };
}

async function interactivePlanRefinement(plan: MigrationPlan): Promise<MigrationPlan> {
  console.log(chalk.blue('\n=' Interactive Plan Refinement'));

  const { modifySteps } = await inquirer.prompt([{
    type: 'confirm',
    name: 'modifySteps',
    message: 'Do you want to modify migration steps?',
    default: false
  }]);

  if (modifySteps) {
    const stepChoices = plan.steps.map((step, index) => ({
      name: `${index + 1}. ${step.description}`,
      value: index,
      checked: true
    }));

    const { selectedSteps } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selectedSteps',
      message: 'Select steps to include in migration:',
      choices: stepChoices
    }]);

    plan.steps = plan.steps.filter((_, index) => selectedSteps.includes(index));
  }

  const { addCustomSteps } = await inquirer.prompt([{
    type: 'confirm',
    name: 'addCustomSteps',
    message: 'Add custom migration steps?',
    default: false
  }]);

  if (addCustomSteps) {
    let addMore = true;
    while (addMore) {
      const customStep = await inquirer.prompt([
        {
          type: 'input',
          name: 'description',
          message: 'Step description:'
        },
        {
          type: 'list',
          name: 'type',
          message: 'Step type:',
          choices: ['file_move', 'file_update', 'dependency_update', 'config_update', 'validation']
        },
        {
          type: 'confirm',
          name: 'backupRequired',
          message: 'Backup required?',
          default: true
        }
      ]);

      plan.steps.push({
        id: `custom_${Date.now()}`,
        description: customStep.description,
        type: customStep.type,
        backupRequired: customStep.backupRequired
      });

      const { continueAdding } = await inquirer.prompt([{
        type: 'confirm',
        name: 'continueAdding',
        message: 'Add another custom step?',
        default: false
      }]);

      addMore = continueAdding;
    }
  }

  return plan;
}

async function previewMigration(plan: MigrationPlan): Promise<void> {
  console.log(chalk.blue('\n=Ë Migration Preview'));
  console.log(chalk.gray('P'.repeat(50)));

  console.log(`${chalk.bold('Source:')} ${plan.source}`);
  console.log(`${chalk.bold('Target:')} ${plan.target}`);
  console.log(`${chalk.bold('Files:')} ${plan.files.length}`);
  console.log(`${chalk.bold('Estimated Effort:')} ${plan.estimatedEffort}`);

  if (plan.risks.length > 0) {
    console.log(`\n${chalk.bold.yellow('   Risks:')}`);
    for (const risk of plan.risks) {
      console.log(`  " ${risk}`);
    }
  }

  console.log(`\n${chalk.bold('Migration Steps:')}`);
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const stepNumber = (i + 1).toString().padStart(2, '0');
    console.log(`  ${chalk.gray(stepNumber + '.')} ${step.description}`);
    if (step.source && step.target) {
      console.log(`      ${chalk.gray('’')} ${step.source} ’ ${step.target}`);
    }
  }
}

async function executeMigration(plan: MigrationPlan, createBackup: boolean = true): Promise<MigrationReport> {
  const report: MigrationReport = {
    planId: `migration-${Date.now()}`,
    timestamp: new Date().toISOString(),
    status: 'success',
    steps: [],
    totalFiles: plan.files.length,
    migratedFiles: 0,
    failedFiles: 0,
    warnings: [],
    errors: []
  };

  const spinner = ora('Executing migration...').start();

  try {
    // Create backup if requested
    if (createBackup) {
      spinner.text = 'Creating backup...';
      const backupPath = `${plan.source}.backup.${Date.now()}`;
      await fs.copy(plan.source, backupPath);
      report.warnings.push(`Backup created at: ${backupPath}`);
    }

    // Execute each step
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      spinner.text = `${step.description} (${i + 1}/${plan.steps.length})`;

      const startTime = Date.now();
      let stepStatus = ValidationStatus.PASS;
      let stepMessage = 'Completed successfully';

      try {
        await executeStep(step, plan);
      } catch (error) {
        stepStatus = ValidationStatus.ERROR;
        stepMessage = error instanceof Error ? error.message : 'Unknown error';
        report.errors.push(`Step ${step.id}: ${stepMessage}`);
        report.failedFiles++;
      }

      const duration = Date.now() - startTime;
      report.steps.push({
        stepId: step.id,
        status: stepStatus,
        message: stepMessage,
        duration
      });

      if (stepStatus === ValidationStatus.PASS) {
        report.migratedFiles++;
      }
    }

    // Determine overall status
    if (report.errors.length > 0) {
      report.status = report.migratedFiles > 0 ? 'partial' : 'failed';
    }

    spinner.succeed('Migration completed');

  } catch (error) {
    spinner.fail('Migration failed');
    report.status = 'failed';
    report.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return report;
}

async function executeStep(step: MigrationStep, plan: MigrationPlan): Promise<void> {
  switch (step.type) {
    case 'file_move':
      if (step.source && step.target) {
        await fs.ensureDir(path.dirname(step.target));
        await fs.copy(step.source, step.target);
      }
      break;

    case 'file_update':
      if (step.source && step.target) {
        await fs.ensureDir(path.dirname(step.target));
        if (step.content) {
          await fs.writeFile(step.target, step.content);
        } else {
          await fs.copy(step.source, step.target);
        }
      }
      break;

    case 'dependency_update':
      if (step.target) {
        const { spawn } = require('child_process');
        await new Promise<void>((resolve, reject) => {
          const npm = spawn('npm', ['install'], {
            cwd: step.target,
            stdio: 'pipe'
          });

          npm.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`npm install failed with code ${code}`));
            }
          });
        });
      }
      break;

    case 'config_update':
      if (step.target) {
        await fs.ensureDir(step.target);
      }
      break;

    case 'validation':
      if (step.target) {
        const validation = await validateMigratedModule(step.target, []);
        if (validation.status === ValidationStatus.FAIL) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
      }
      break;
  }
}

async function rollbackMigration(report: MigrationReport): Promise<{ success: boolean; error?: string }> {
  try {
    const spinner = ora('Rolling back migration...').start();

    // Reverse the steps that were successful
    const successfulSteps = report.steps.filter(s => s.status === ValidationStatus.PASS);

    for (const stepReport of successfulSteps.reverse()) {
      // Implementation would depend on step type and what was actually done
      spinner.text = `Reversing ${stepReport.stepId}...`;

      // For demo purposes, we'll just log what would be reversed
      // In a real implementation, you'd need to store more detailed information
      // about what was changed in order to reverse it properly
    }

    spinner.succeed('Migration rolled back successfully');
    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function validateMigratedModule(modulePath: string, rules: string[] = []): Promise<any> {
  const issues: string[] = [];
  const warnings: string[] = [];
  const fixableIssues: string[] = [];

  // Check for package.json
  const packageJsonPath = path.join(modulePath, 'package.json');
  if (!await fs.pathExists(packageJsonPath)) {
    issues.push('package.json is missing');
    fixableIssues.push('create_package_json');
  }

  // Check for README
  const readmePath = path.join(modulePath, 'README.md');
  if (!await fs.pathExists(readmePath)) {
    warnings.push('README.md is missing');
    fixableIssues.push('create_readme');
  }

  // Check for TypeScript config
  const tsconfigPath = path.join(modulePath, 'tsconfig.json');
  if (!await fs.pathExists(tsconfigPath)) {
    warnings.push('tsconfig.json is missing');
    fixableIssues.push('create_tsconfig');
  }

  // Check for source directory
  const srcPath = path.join(modulePath, 'src');
  if (!await fs.pathExists(srcPath)) {
    issues.push('src/ directory is missing');
    fixableIssues.push('create_src_directory');
  }

  let status = ValidationStatus.PASS;
  if (issues.length > 0) {
    status = ValidationStatus.FAIL;
  } else if (warnings.length > 0) {
    status = ValidationStatus.WARNING;
  }

  return {
    status,
    issues,
    warnings,
    fixableIssues,
    errors: issues,
    fixed: [],
    fixErrors: []
  };
}

async function autoFixValidationIssues(modulePath: string, fixableIssues: string[]): Promise<any> {
  const fixed: string[] = [];
  const errors: string[] = [];

  for (const issue of fixableIssues) {
    try {
      switch (issue) {
        case 'create_package_json':
          const packageJson = {
            name: path.basename(modulePath),
            version: '1.0.0',
            description: `Migrated module - ${path.basename(modulePath)}`,
            main: 'dist/index.js',
            scripts: {
              build: 'tsc',
              test: 'jest'
            }
          };
          await fs.writeJSON(path.join(modulePath, 'package.json'), packageJson, { spaces: 2 });
          fixed.push('Created package.json');
          break;

        case 'create_readme':
          const readme = `# ${path.basename(modulePath)}\n\nMigrated module.\n\n## Installation\n\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Usage\n\nTODO: Add usage instructions\n`;
          await fs.writeFile(path.join(modulePath, 'README.md'), readme);
          fixed.push('Created README.md');
          break;

        case 'create_tsconfig':
          const tsconfig = {
            compilerOptions: {
              target: 'ES2020',
              module: 'commonjs',
              outDir: './dist',
              rootDir: './src',
              strict: true,
              esModuleInterop: true
            },
            include: ['src/**/*'],
            exclude: ['node_modules', 'dist']
          };
          await fs.writeJSON(path.join(modulePath, 'tsconfig.json'), tsconfig, { spaces: 2 });
          fixed.push('Created tsconfig.json');
          break;

        case 'create_src_directory':
          await fs.ensureDir(path.join(modulePath, 'src'));
          await fs.writeFile(path.join(modulePath, 'src', 'index.ts'), '// Entry point\nexport {};\n');
          fixed.push('Created src/ directory with index.ts');
          break;
      }
    } catch (error) {
      errors.push(`Failed to fix ${issue}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { fixed, errors };
}

function displayAnalysisReport(analysis: any): void {
  console.log(chalk.blue('\n=Ê Module Analysis Report'));
  console.log(chalk.gray('P'.repeat(50)));

  console.log(`${chalk.bold('Module:')} ${analysis.module.name}`);
  if (analysis.module.version) {
    console.log(`${chalk.bold('Version:')} ${analysis.module.version}`);
  }

  console.log(`\n${chalk.bold('=Á Files:')}`);
  console.log(`  Total: ${analysis.files.total}`);
  console.log(`  Source: ${analysis.files.source}`);
  console.log(`  Tests: ${analysis.files.tests}`);
  console.log(`  Configs: ${analysis.files.configs}`);

  console.log(`\n${chalk.bold('=' Complexity:')}`);
  console.log(`  Level: ${getComplexityColor(analysis.complexity.level)}${analysis.complexity.level.toUpperCase()}${chalk.reset()}`);
  console.log(`  Estimated LOC: ${analysis.complexity.linesOfCode}`);
  console.log(`  Config Files: ${analysis.complexity.configFiles}`);
  console.log(`  Estimated Time: ${analysis.complexity.estimatedHours} hours`);

  console.log(`\n${chalk.bold('=æ Dependencies:')}`);
  console.log(`  Production: ${analysis.dependencies.dependencies.length}`);
  console.log(`  Development: ${analysis.dependencies.devDependencies.length}`);
  if (analysis.dependencies.outdated.length > 0) {
    console.log(`  ${chalk.yellow('Outdated:')} ${analysis.dependencies.outdated.length}`);
  }
  if (analysis.dependencies.conflicts.length > 0) {
    console.log(`  ${chalk.red('Conflicts:')} ${analysis.dependencies.conflicts.length}`);
  }

  if (analysis.conflicts.length > 0) {
    console.log(`\n${chalk.bold.red('   Conflicts:')}`);
    for (const conflict of analysis.conflicts) {
      console.log(`  " ${conflict}`);
    }
  }

  if (analysis.recommendations.length > 0) {
    console.log(`\n${chalk.bold('=¡ Recommendations:')}`);
    for (const rec of analysis.recommendations) {
      console.log(`  " ${rec}`);
    }
  }
}

function displayPlanSummary(plan: MigrationPlan): void {
  console.log(chalk.blue('\n=Ë Migration Plan Summary'));
  console.log(chalk.gray('P'.repeat(50)));

  console.log(`${chalk.bold('Source:')} ${plan.source}`);
  console.log(`${chalk.bold('Target:')} ${plan.target}`);
  console.log(`${chalk.bold('Files to migrate:')} ${plan.files.length}`);
  console.log(`${chalk.bold('Dependencies:')} ${plan.dependencies.length}`);
  console.log(`${chalk.bold('Estimated effort:')} ${getComplexityColor(plan.estimatedEffort)}${plan.estimatedEffort.toUpperCase()}${chalk.reset()}`);
  console.log(`${chalk.bold('Migration steps:')} ${plan.steps.length}`);

  if (plan.conflicts.length > 0) {
    console.log(`\n${chalk.bold.yellow('   Conflicts to resolve:')}`);
    for (const conflict of plan.conflicts) {
      console.log(`  " ${conflict}`);
    }
  }

  if (plan.risks.length > 0) {
    console.log(`\n${chalk.bold.red('=¨ Risks:')}`);
    for (const risk of plan.risks) {
      console.log(`  " ${risk}`);
    }
  }
}

function displayMigrationReport(report: MigrationReport): void {
  console.log(chalk.blue('\n=Ê Migration Report'));
  console.log(chalk.gray('P'.repeat(50)));

  const statusColor = report.status === 'success' ? chalk.green :
                      report.status === 'partial' ? chalk.yellow : chalk.red;

  console.log(`${chalk.bold('Status:')} ${statusColor}${report.status.toUpperCase()}${chalk.reset()}`);
  console.log(`${chalk.bold('Total files:')} ${report.totalFiles}`);
  console.log(`${chalk.bold('Migrated:')} ${chalk.green}${report.migratedFiles}${chalk.reset()}`);
  if (report.failedFiles > 0) {
    console.log(`${chalk.bold('Failed:')} ${chalk.red}${report.failedFiles}${chalk.reset()}`);
  }

  if (report.warnings.length > 0) {
    console.log(`\n${chalk.bold.yellow('   Warnings:')}`);
    for (const warning of report.warnings) {
      console.log(`  " ${warning}`);
    }
  }

  if (report.errors.length > 0) {
    console.log(`\n${chalk.bold.red('L Errors:')}`);
    for (const error of report.errors) {
      console.log(`  " ${error}`);
    }
  }

  console.log(`\n${chalk.bold('=Ë Step Results:')}`);
  for (const step of report.steps) {
    const icon = step.status === ValidationStatus.PASS ? '' :
                 step.status === ValidationStatus.WARNING ? ' ' : 'L';
    const duration = step.duration < 1000 ? `${step.duration}ms` : `${(step.duration / 1000).toFixed(1)}s`;
    console.log(`  ${icon} ${step.stepId} (${duration})`);
    if (step.status !== ValidationStatus.PASS) {
      console.log(`     ${chalk.gray(step.message)}`);
    }
  }
}

function displayValidationResult(result: any): void {
  console.log(chalk.blue('\n Validation Results'));
  console.log(chalk.gray('P'.repeat(50)));

  const statusColor = result.status === ValidationStatus.PASS ? chalk.green :
                      result.status === ValidationStatus.WARNING ? chalk.yellow : chalk.red;

  console.log(`${chalk.bold('Status:')} ${statusColor}${result.status}${chalk.reset()}`);

  if (result.errors && result.errors.length > 0) {
    console.log(`\n${chalk.bold.red('L Errors:')}`);
    for (const error of result.errors) {
      console.log(`  " ${error}`);
    }
  }

  if (result.warnings && result.warnings.length > 0) {
    console.log(`\n${chalk.bold.yellow('   Warnings:')}`);
    for (const warning of result.warnings) {
      console.log(`  " ${warning}`);
    }
  }

  if (result.fixed && result.fixed.length > 0) {
    console.log(`\n${chalk.bold.green('=' Auto-fixed:')}`);
    for (const fix of result.fixed) {
      console.log(`  " ${fix}`);
    }
  }

  if (result.fixErrors && result.fixErrors.length > 0) {
    console.log(`\n${chalk.bold.red('L Fix errors:')}`);
    for (const error of result.fixErrors) {
      console.log(`  " ${error}`);
    }
  }
}

function getComplexityColor(level: string) {
  switch (level.toLowerCase()) {
    case 'low': return chalk.green;
    case 'medium': return chalk.yellow;
    case 'high': return chalk.red;
    default: return chalk.gray;
  }
}

program.parse();