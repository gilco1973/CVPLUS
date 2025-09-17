import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ValidationService } from '../services/ValidationService';
import { ValidationStatus, RuleSeverity } from '../models/enums';

const execAsync = promisify(exec);

export interface GitHookConfig {
  enabled: boolean;
  hooks: {
    preCommit: boolean;
    prePush: boolean;
    postMerge: boolean;
  };
  rules: string[];
  severity: RuleSeverity;
  blockOnFailure: boolean;
  autoFix: boolean;
  reportPath?: string;
}

export interface GitHookResult {
  hook: string;
  success: boolean;
  validationResults: any[];
  errors: string[];
  warnings: string[];
  autoFixed: string[];
  blockedFiles: string[];
  duration: number;
}

export class GitHooksIntegration {
  private config: GitHookConfig;
  private validationService: ValidationService;

  constructor(config: GitHookConfig) {
    this.config = config;
    this.validationService = new ValidationService();
  }

  async installHooks(repositoryPath: string): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Git hooks integration is disabled');
    }

    const hooksDir = path.join(repositoryPath, '.git', 'hooks');
    if (!await fs.pathExists(hooksDir)) {
      throw new Error('Not a git repository or hooks directory not found');
    }

    if (this.config.hooks.preCommit) {
      await this.installPreCommitHook(hooksDir);
    }

    if (this.config.hooks.prePush) {
      await this.installPrePushHook(hooksDir);
    }

    if (this.config.hooks.postMerge) {
      await this.installPostMergeHook(hooksDir);
    }
  }

  async uninstallHooks(repositoryPath: string): Promise<void> {
    const hooksDir = path.join(repositoryPath, '.git', 'hooks');
    if (!await fs.pathExists(hooksDir)) {
      return;
    }

    const hookFiles = ['pre-commit', 'pre-push', 'post-merge'];
    for (const hookFile of hookFiles) {
      const hookPath = path.join(hooksDir, hookFile);
      if (await fs.pathExists(hookPath)) {
        const content = await fs.readFile(hookPath, 'utf8');
        if (content.includes('CVPlus Module Validation')) {
          await fs.remove(hookPath);
        }
      }
    }
  }

  async executePreCommitValidation(repositoryPath: string): Promise<GitHookResult> {
    const startTime = Date.now();
    const result: GitHookResult = {
      hook: 'pre-commit',
      success: true,
      validationResults: [],
      errors: [],
      warnings: [],
      autoFixed: [],
      blockedFiles: [],
      duration: 0
    };

    try {
      // Get staged files
      const stagedFiles = await this.getStagedFiles(repositoryPath);
      const moduleFiles = stagedFiles.filter(file => this.isModuleFile(file));

      if (moduleFiles.length === 0) {
        result.duration = Date.now() - startTime;
        return result;
      }

      // Get affected modules
      const affectedModules = await this.getAffectedModules(repositoryPath, moduleFiles);

      // Validate each affected module
      for (const modulePath of affectedModules) {
        const validationResult = await this.validationService.validateModule(modulePath, {
          includeRules: this.config.rules
        });

        result.validationResults.push(validationResult);

        // Check for failures
        const criticalIssues = validationResult.results.filter((r: any) =>
          r.status === ValidationStatus.FAIL || r.severity === RuleSeverity.CRITICAL
        );

        if (criticalIssues.length > 0) {
          result.errors.push(`Module ${modulePath} has critical issues`);

          if (this.config.blockOnFailure) {
            result.blockedFiles.push(...moduleFiles.filter(f => f.startsWith(modulePath)));
            result.success = false;
          }
        }

        // Auto-fix if enabled
        const autoFixableResults = validationResult.results.filter(r => r.canAutoFix);
        if (this.config.autoFix && autoFixableResults.length > 0) {
          const fixResults = await this.applyAutoFixes(modulePath, autoFixableResults);
          result.autoFixed.push(...fixResults.fixed);

          if (fixResults.errors.length > 0) {
            result.warnings.push(...fixResults.errors);
          }
        }
      }

      // Generate report if configured
      if (this.config.reportPath) {
        await this.generateHookReport(result, this.config.reportPath);
      }

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  async executePrePushValidation(repositoryPath: string): Promise<GitHookResult> {
    const startTime = Date.now();
    const result: GitHookResult = {
      hook: 'pre-push',
      success: true,
      validationResults: [],
      errors: [],
      warnings: [],
      autoFixed: [],
      blockedFiles: [],
      duration: 0
    };

    try {
      // Get all modules in repository
      const modules = await this.discoverModules(repositoryPath);

      // Perform comprehensive validation
      for (const modulePath of modules) {
        const validationResult = await this.validationService.validateModule(modulePath, {
          includeRules: this.config.rules
        });

        result.validationResults.push(validationResult);

        // Check for critical failures
        const criticalIssues = validationResult.results.filter(r =>
          r.status === ValidationStatus.FAIL && r.severity === RuleSeverity.CRITICAL
        );

        if (criticalIssues.length > 0) {
          result.errors.push(`Module ${modulePath} has critical validation failures`);
          if (this.config.blockOnFailure) {
            result.success = false;
          }
        }

        // Check for error-level failures
        const errorIssues = validationResult.results.filter(r =>
          r.status === ValidationStatus.FAIL && r.severity === RuleSeverity.ERROR
        );

        if (errorIssues.length > 0) {
          result.errors.push(`Module ${modulePath} has error-level validation failures`);
          if (this.config.blockOnFailure) {
            result.success = false;
          }
        }
      }

      // Generate comprehensive report
      if (this.config.reportPath) {
        await this.generateHookReport(result, this.config.reportPath);
      }

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  async executePostMergeValidation(repositoryPath: string): Promise<GitHookResult> {
    const startTime = Date.now();
    const result: GitHookResult = {
      hook: 'post-merge',
      success: true,
      validationResults: [],
      errors: [],
      warnings: [],
      autoFixed: [],
      blockedFiles: [],
      duration: 0
    };

    try {
      // Get changed files from merge
      const changedFiles = await this.getMergeChangedFiles(repositoryPath);
      const affectedModules = await this.getAffectedModules(repositoryPath, changedFiles);

      // Validate affected modules
      for (const modulePath of affectedModules) {
        const validationResult = await this.validationService.validateModule(modulePath, {
          includeRules: this.config.rules
        });

        result.validationResults.push(validationResult);

        // Check for integration issues
        const integrationIssues = validationResult.results.filter((r: any) =>
          r.category === 'integration' && r.status === ValidationStatus.FAIL
        );

        if (integrationIssues.length > 0) {
          result.warnings.push(`Module ${modulePath} may have integration issues after merge`);
        }

        // Auto-fix if enabled
        const autoFixableResults = validationResult.results.filter(r => r.canAutoFix);
        if (this.config.autoFix && autoFixableResults.length > 0) {
          const fixResults = await this.applyAutoFixes(modulePath, autoFixableResults);
          result.autoFixed.push(...fixResults.fixed);
        }
      }

      // Trigger dependency update check
      const dependencyIssues = await this.checkDependencyConflicts(repositoryPath);
      if (dependencyIssues.length > 0) {
        result.warnings.push(...dependencyIssues);
      }

      // Generate post-merge report
      if (this.config.reportPath) {
        await this.generateHookReport(result, this.config.reportPath);
      }

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async installPreCommitHook(hooksDir: string): Promise<void> {
    const hookPath = path.join(hooksDir, 'pre-commit');
    const hookContent = `#!/bin/sh
# CVPlus Module Validation Pre-Commit Hook

echo "🔍 Running CVPlus module validation..."

# Run the validation
node -e "
const { GitHooksIntegration } = require('${__dirname}/git-hooks');
const config = require('${process.cwd()}/.cvplus-hooks.json');
const integration = new GitHooksIntegration(config);

integration.executePreCommitValidation(process.cwd())
  .then(result => {
    if (!result.success) {
      console.error('❌ Pre-commit validation failed');
      if (result.errors.length > 0) {
        console.error('Errors:', result.errors.join(', '));
      }
      if (result.blockedFiles.length > 0) {
        console.error('Blocked files:', result.blockedFiles.join(', '));
      }
      process.exit(1);
    } else {
      console.log('✅ Pre-commit validation passed');
      if (result.autoFixed.length > 0) {
        console.log('🔧 Auto-fixed:', result.autoFixed.join(', '));
      }
    }
  })
  .catch(error => {
    console.error('❌ Validation error:', error.message);
    process.exit(1);
  });
"
`;

    await fs.writeFile(hookPath, hookContent);
    await fs.chmod(hookPath, 0o755);
  }

  private async installPrePushHook(hooksDir: string): Promise<void> {
    const hookPath = path.join(hooksDir, 'pre-push');
    const hookContent = `#!/bin/sh
# CVPlus Module Validation Pre-Push Hook

echo "🔍 Running comprehensive CVPlus validation..."

# Run the validation
node -e "
const { GitHooksIntegration } = require('${__dirname}/git-hooks');
const config = require('${process.cwd()}/.cvplus-hooks.json');
const integration = new GitHooksIntegration(config);

integration.executePrePushValidation(process.cwd())
  .then(result => {
    if (!result.success) {
      console.error('❌ Pre-push validation failed');
      if (result.errors.length > 0) {
        console.error('Errors:', result.errors.join(', '));
      }
      process.exit(1);
    } else {
      console.log('✅ Pre-push validation passed');
    }
  })
  .catch(error => {
    console.error('❌ Validation error:', error.message);
    process.exit(1);
  });
"
`;

    await fs.writeFile(hookPath, hookContent);
    await fs.chmod(hookPath, 0o755);
  }

  private async installPostMergeHook(hooksDir: string): Promise<void> {
    const hookPath = path.join(hooksDir, 'post-merge');
    const hookContent = `#!/bin/sh
# CVPlus Module Validation Post-Merge Hook

echo "🔍 Running post-merge CVPlus validation..."

# Run the validation
node -e "
const { GitHooksIntegration } = require('${__dirname}/git-hooks');
const config = require('${process.cwd()}/.cvplus-hooks.json');
const integration = new GitHooksIntegration(config);

integration.executePostMergeValidation(process.cwd())
  .then(result => {
    if (result.warnings.length > 0) {
      console.warn('⚠️  Post-merge warnings:', result.warnings.join(', '));
    }
    if (result.autoFixed.length > 0) {
      console.log('🔧 Auto-fixed after merge:', result.autoFixed.join(', '));
    }
    console.log('✅ Post-merge validation completed');
  })
  .catch(error => {
    console.error('❌ Post-merge validation error:', error.message);
  });
"
`;

    await fs.writeFile(hookPath, hookContent);
    await fs.chmod(hookPath, 0o755);
  }

  private async getStagedFiles(repositoryPath: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git diff --cached --name-only', { cwd: repositoryPath });
      return stdout.trim().split('\n').filter(file => file.length > 0);
    } catch (error) {
      return [];
    }
  }

  private async getMergeChangedFiles(repositoryPath: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git diff --name-only HEAD~1..HEAD', { cwd: repositoryPath });
      return stdout.trim().split('\n').filter(file => file.length > 0);
    } catch (error) {
      return [];
    }
  }

  private isModuleFile(filePath: string): boolean {
    return filePath.includes('package.json') ||
           filePath.includes('tsconfig.json') ||
           filePath.endsWith('.ts') ||
           filePath.endsWith('.js') ||
           filePath.endsWith('.tsx') ||
           filePath.endsWith('.jsx');
  }

  private async getAffectedModules(repositoryPath: string, files: string[]): Promise<string[]> {
    const modules = new Set<string>();

    for (const file of files) {
      const filePath = path.join(repositoryPath, file);
      let currentDir = path.dirname(filePath);

      // Walk up the directory tree to find module root (package.json)
      while (currentDir !== repositoryPath && currentDir !== path.dirname(currentDir)) {
        const packageJsonPath = path.join(currentDir, 'package.json');
        if (await fs.pathExists(packageJsonPath)) {
          modules.add(currentDir);
          break;
        }
        currentDir = path.dirname(currentDir);
      }
    }

    return Array.from(modules);
  }

  private async discoverModules(repositoryPath: string): Promise<string[]> {
    const modules: string[] = [];

    const findModules = async (dirPath: string): Promise<void> => {
      const items = await fs.readdir(dirPath);

      for (const item of items) {
        if (item === 'node_modules' || item === '.git') {
          continue;
        }

        const itemPath = path.join(dirPath, item);
        const stat = await fs.stat(itemPath);

        if (stat.isDirectory()) {
          const packageJsonPath = path.join(itemPath, 'package.json');
          if (await fs.pathExists(packageJsonPath)) {
            modules.push(itemPath);
          } else {
            await findModules(itemPath);
          }
        }
      }
    };

    await findModules(repositoryPath);
    return modules;
  }

  private async applyAutoFixes(modulePath: string, results: any[]): Promise<{ fixed: string[]; errors: string[] }> {
    const fixed: string[] = [];
    const errors: string[] = [];

    for (const result of results) {
      try {
        // For now, we'll implement basic auto-fixes based on rule types
        // This could be extended to use the ValidationService's auto-fix capabilities
        switch (result.ruleId) {
          case 'README_REQUIRED':
            const readmePath = path.join(modulePath, 'README.md');
            const readmeContent = `# ${path.basename(modulePath)}\n\nModule description here.\n`;
            await fs.writeFile(readmePath, readmeContent);
            fixed.push('Created README.md');
            break;

          case 'PACKAGE_JSON_REQUIRED':
            const packageJsonPath = path.join(modulePath, 'package.json');
            const packageJson = {
              name: path.basename(modulePath),
              version: '1.0.0',
              description: '',
              main: 'index.js',
              scripts: {
                test: 'echo "Error: no test specified" && exit 1'
              }
            };
            await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
            fixed.push('Created package.json');
            break;

          case 'GITIGNORE_REQUIRED':
            const gitignorePath = path.join(modulePath, '.gitignore');
            const gitignoreContent = 'node_modules/\n*.log\n.env\n';
            await fs.writeFile(gitignorePath, gitignoreContent);
            fixed.push('Created .gitignore');
            break;

          default:
            // Log that this rule doesn't have an auto-fix implementation yet
            fixed.push(`Rule ${result.ruleId} marked for manual resolution`);
        }
      } catch (error) {
        errors.push(`Failed to auto-fix ${result.ruleId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { fixed, errors };
  }

  private async checkDependencyConflicts(repositoryPath: string): Promise<string[]> {
    const conflicts: string[] = [];

    try {
      // Check for lockfile conflicts
      const packageLockPath = path.join(repositoryPath, 'package-lock.json');
      const yarnLockPath = path.join(repositoryPath, 'yarn.lock');

      if (await fs.pathExists(packageLockPath) && await fs.pathExists(yarnLockPath)) {
        conflicts.push('Both package-lock.json and yarn.lock found - potential dependency conflict');
      }

      // Check for outdated dependencies
      try {
        const { stdout } = await execAsync('npm outdated --json', { cwd: repositoryPath });
        const outdated = JSON.parse(stdout);
        const majorUpdates = Object.keys(outdated).filter(pkg => {
          const current = outdated[pkg].current;
          const latest = outdated[pkg].latest;
          const currentMajor = current.split('.')[0];
          const latestMajor = latest.split('.')[0];
          return currentMajor !== latestMajor;
        });

        if (majorUpdates.length > 0) {
          conflicts.push(`Major dependency updates available: ${majorUpdates.join(', ')}`);
        }
      } catch (error) {
        // npm outdated returns non-zero exit code when outdated packages exist
      }

    } catch (error) {
      // Ignore errors in dependency checking
    }

    return conflicts;
  }

  private async generateHookReport(result: GitHookResult, reportPath: string): Promise<void> {
    const report = {
      hook: result.hook,
      timestamp: new Date().toISOString(),
      success: result.success,
      duration: result.duration,
      summary: {
        modulesValidated: result.validationResults.length,
        errors: result.errors.length,
        warnings: result.warnings.length,
        autoFixed: result.autoFixed.length,
        blockedFiles: result.blockedFiles.length
      },
      details: {
        errors: result.errors,
        warnings: result.warnings,
        autoFixed: result.autoFixed,
        blockedFiles: result.blockedFiles,
        validationResults: result.validationResults
      }
    };

    await fs.ensureDir(path.dirname(reportPath));
    await fs.writeJSON(reportPath, report, { spaces: 2 });
  }

  static async createDefaultConfig(repositoryPath: string): Promise<void> {
    const configPath = path.join(repositoryPath, '.cvplus-hooks.json');

    const defaultConfig: GitHookConfig = {
      enabled: true,
      hooks: {
        preCommit: true,
        prePush: true,
        postMerge: true
      },
      rules: [
        'PACKAGE_JSON_REQUIRED',
        'README_REQUIRED',
        'TYPESCRIPT_CONFIG',
        'SRC_DIRECTORY',
        'TESTS_DIRECTORY'
      ],
      severity: RuleSeverity.ERROR,
      blockOnFailure: true,
      autoFix: true,
      reportPath: '.cvplus/hook-reports'
    };

    await fs.writeJSON(configPath, defaultConfig, { spaces: 2 });
  }

  static async loadConfig(repositoryPath: string): Promise<GitHookConfig> {
    const configPath = path.join(repositoryPath, '.cvplus-hooks.json');

    if (await fs.pathExists(configPath)) {
      return await fs.readJSON(configPath);
    }

    // Return default config if none exists
    return {
      enabled: true,
      hooks: {
        preCommit: true,
        prePush: false,
        postMerge: false
      },
      rules: ['PACKAGE_JSON_REQUIRED', 'README_REQUIRED'],
      severity: RuleSeverity.ERROR,
      blockOnFailure: true,
      autoFix: false
    };
  }
}