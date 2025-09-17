#!/usr/bin/env node

/**
 * CVPlus Unified Module Requirements CLI
 *
 * Main entry point for the CVPlus module validation and compliance system.
 * Provides commands for validation, auto-fixing, reporting, and module generation.
 */

import { Command } from 'commander';
import { ValidatorCLI } from './validator.js';
import AutoFixCli from './auto-fix.js';
import { ReporterCLI } from './reporter.js';
import { GeneratorCLI } from './generator.js';
import SecurityScanCli from './security-scan.js';
import PerformanceOptimizeCli from './performance-optimize.js';
import PluginCli from './plugin.js';

class UnifiedModuleRequirementsCli {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('umr')
      .description('CVPlus Unified Module Requirements - Validation and compliance framework')
      .version('1.0.0')
      .option('-v, --verbose', 'Enable verbose output')
      .option('--config <path>', 'Path to configuration file');

    // Register subcommands with their own CLI instances
    this.registerSubCommand('validate', new ValidatorCLI());
    this.registerSubCommand('auto-fix', new AutoFixCli());
    this.registerSubCommand('report', new ReporterCLI());
    this.registerSubCommand('generate', new GeneratorCLI());
    this.registerSubCommand('security-scan', new SecurityScanCli());
    this.registerSubCommand('performance', new PerformanceOptimizeCli());
    this.registerSubCommand('plugin', new PluginCli());

    // Additional utility commands
    this.addUtilityCommands();
  }

  private registerSubCommand(name: string, cliInstance: any): void {
    this.program
      .command(name)
      .description(`Run ${name} command`)
      .allowUnknownOption(true)
      .action(async () => {
        // Set up the argv for the subcommand to handle their own argument parsing
        const originalArgv = process.argv;
        process.argv = [process.argv[0] || 'node', `umr-${name}`, ...process.argv.slice(3)];

        try {
          // Call the CLI's own run method with proper argument handling
          if (typeof cliInstance.run === 'function') {
            if (cliInstance.run.length === 0) {
              // CLI has run() with no parameters
              await cliInstance.run();
            } else {
              // CLI expects parameters - let it parse argv itself
              await cliInstance.run();
            }
          }
        } finally {
          process.argv = originalArgv;
        }
      });
  }

  private addUtilityCommands(): void {
    // Health check command
    this.program
      .command('health')
      .description('Check system health and configuration')
      .action(async () => {
        await this.checkHealth();
      });

    // Configuration setup command
    this.program
      .command('init')
      .description('Initialize UMR configuration in current directory')
      .option('--template <name>', 'Configuration template to use', 'default')
      .option('--force', 'Overwrite existing configuration')
      .action(async (options) => {
        await this.initializeConfig(options);
      });

    // Install git hooks command
    this.program
      .command('install-hooks')
      .description('Install git hooks for automated validation')
      .option('--hooks <types>', 'Hook types to install (pre-commit,pre-push,post-merge)', 'pre-commit,pre-push')
      .option('--force', 'Overwrite existing hooks')
      .action(async (options) => {
        await this.installGitHooks(options);
      });

    // Doctor command for troubleshooting
    this.program
      .command('doctor')
      .description('Diagnose and fix common issues')
      .option('--fix', 'Automatically fix detected issues')
      .action(async (options) => {
        await this.runDiagnostics(options);
      });
  }

  async run(): Promise<void> {
    try {
      await this.program.parseAsync(process.argv);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async checkHealth(): Promise<void> {
    console.log('🏥 Checking UMR system health...\n');

    const checks = [
      { name: 'Node.js version', check: () => this.checkNodeVersion() },
      { name: 'Dependencies', check: () => this.checkDependencies() },
      { name: 'Configuration', check: () => this.checkConfiguration() },
      { name: 'Git repository', check: () => this.checkGitRepository() },
      { name: 'File permissions', check: () => this.checkFilePermissions() }
    ];

    let allHealthy = true;

    for (const check of checks) {
      try {
        const result = await check.check();
        console.log(`✅ ${check.name}: ${result}`);
      } catch (error) {
        console.log(`❌ ${check.name}: ${error instanceof Error ? error.message : String(error)}`);
        allHealthy = false;
      }
    }

    console.log(`\n🏥 Overall health: ${allHealthy ? '✅ Healthy' : '❌ Issues detected'}`);

    if (!allHealthy) {
      console.log('\n💡 Run `umr doctor --fix` to attempt automatic repairs');
      process.exit(1);
    }
  }

  private async initializeConfig(options: { template: string; force?: boolean }): Promise<void> {
    const fs = await import('fs/promises');

    const configPath = './umr.config.json';

    // Check if config already exists
    try {
      await fs.access(configPath);
      if (!options.force) {
        console.log('❌ Configuration file already exists. Use --force to overwrite.');
        return;
      }
    } catch {
      // File doesn't exist, continue
    }

    // Template configurations
    const templates = {
      default: {
        rules: [
          { name: 'moduleStructure', enabled: true, severity: 'error' },
          { name: 'dependencyValidation', enabled: true, severity: 'error' },
          { name: 'fileSize', enabled: true, severity: 'warning', options: { maxLines: 200 } },
          { name: 'documentation', enabled: true, severity: 'warning' },
          { name: 'testing', enabled: true, severity: 'warning' }
        ],
        validation: {
          parallel: true,
          maxConcurrency: 4,
          timeout: 30000
        },
        output: {
          format: 'detailed',
          destination: './reports'
        }
      },
      strict: {
        rules: [
          { name: 'moduleStructure', enabled: true, severity: 'error' },
          { name: 'dependencyValidation', enabled: true, severity: 'error' },
          { name: 'fileSize', enabled: true, severity: 'error', options: { maxLines: 150 } },
          { name: 'documentation', enabled: true, severity: 'error' },
          { name: 'testing', enabled: true, severity: 'error' },
          { name: 'security', enabled: true, severity: 'error' },
          { name: 'performance', enabled: true, severity: 'warning' }
        ],
        validation: {
          parallel: true,
          maxConcurrency: 2,
          timeout: 60000
        },
        autoFix: {
          enabled: true,
          backupFiles: true,
          maxFiles: 50
        }
      },
      minimal: {
        rules: [
          { name: 'moduleStructure', enabled: true, severity: 'error' },
          { name: 'dependencyValidation', enabled: true, severity: 'warning' }
        ],
        validation: {
          parallel: false,
          timeout: 15000
        }
      }
    };

    const config = templates[options.template as keyof typeof templates] || templates.default;

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Created ${options.template} configuration: ${configPath}`);
    console.log('\n💡 Edit the configuration file to customize rules and settings');
  }

  private async installGitHooks(options: { hooks: string; force?: boolean }): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    console.log('🪝 Installing git hooks...');

    // Check if we're in a git repository
    try {
      await fs.access('.git');
    } catch {
      console.log('❌ Not in a git repository. Initialize git first.');
      return;
    }

    const hookTypes = options.hooks.split(',');
    const hooksDir = '.git/hooks';

    for (const hookType of hookTypes) {
      const hookPath = path.join(hooksDir, hookType.trim());

      // Check if hook already exists
      try {
        await fs.access(hookPath);
        if (!options.force) {
          console.log(`⚠️ ${hookType} hook already exists. Use --force to overwrite.`);
          continue;
        }
      } catch {
        // Hook doesn't exist, continue
      }

      // Create hook script
      const hookScript = this.generateHookScript(hookType.trim());
      await fs.writeFile(hookPath, hookScript);
      await fs.chmod(hookPath, 0o755); // Make executable

      console.log(`✅ Installed ${hookType} hook`);
    }

    console.log('\n🎉 Git hooks installed successfully!');
    console.log('💡 Hooks will run UMR validation before git operations');
  }

  private generateHookScript(hookType: string): string {
    const baseScript = `#!/bin/sh
# UMR ${hookType} hook
# Auto-generated by CVPlus Unified Module Requirements

echo "🔍 Running UMR validation..."

`;

    switch (hookType) {
      case 'pre-commit':
        return baseScript + `
# Validate staged files
npx umr validate --staged --format=summary

if [ $? -ne 0 ]; then
  echo "❌ Validation failed. Fix issues before committing."
  echo "💡 Run 'npx umr auto-fix' to fix common issues automatically"
  exit 1
fi
`;

      case 'pre-push':
        return baseScript + `
# Validate all modules before push
npx umr validate --all --format=summary

if [ $? -ne 0 ]; then
  echo "❌ Validation failed. Fix issues before pushing."
  exit 1
fi
`;

      case 'post-merge':
        return baseScript + `
# Validate after merge
npx umr validate --changed --format=summary
`;

      default:
        return baseScript + `
# Generic validation hook
npx umr validate --format=summary
`;
    }
  }

  private async runDiagnostics(options: { fix?: boolean }): Promise<void> {
    console.log('🔬 Running UMR diagnostics...\n');

    const diagnostics = [
      {
        name: 'Configuration file',
        diagnose: () => this.diagnoseConfiguration(),
        fix: () => this.fixConfiguration()
      },
      {
        name: 'Dependencies',
        diagnose: () => this.diagnoseDependencies(),
        fix: () => this.fixDependencies()
      },
      {
        name: 'Git hooks',
        diagnose: () => this.diagnoseGitHooks(),
        fix: () => this.fixGitHooks()
      },
      {
        name: 'File permissions',
        diagnose: () => this.diagnoseFilePermissions(),
        fix: () => this.fixFilePermissions()
      }
    ];

    let issuesFound = 0;
    let issuesFixed = 0;

    for (const diagnostic of diagnostics) {
      try {
        const issue = await diagnostic.diagnose();
        if (issue) {
          console.log(`❌ ${diagnostic.name}: ${issue}`);
          issuesFound++;

          if (options.fix) {
            try {
              await diagnostic.fix();
              console.log(`✅ Fixed: ${diagnostic.name}`);
              issuesFixed++;
            } catch (error) {
              console.log(`⚠️ Could not fix ${diagnostic.name}: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        } else {
          console.log(`✅ ${diagnostic.name}: OK`);
        }
      } catch (error) {
        console.log(`❌ ${diagnostic.name}: ${error instanceof Error ? error.message : String(error)}`);
        issuesFound++;
      }
    }

    console.log(`\n🔬 Diagnostics complete:`);
    console.log(`   Issues found: ${issuesFound}`);
    if (options.fix) {
      console.log(`   Issues fixed: ${issuesFixed}`);
    }

    if (issuesFound > 0 && !options.fix) {
      console.log('\n💡 Run with --fix to attempt automatic repairs');
    }
  }

  // Health check implementations
  private async checkNodeVersion(): Promise<string> {
    const version = process.version;
    const versionParts = version.slice(1).split('.');
    const majorString = versionParts[0];
    if (!majorString) {
      throw new Error(`Invalid Node.js version format: ${version}`);
    }
    const major = parseInt(majorString, 10);
    if (major < 18) {
      throw new Error(`Node.js ${version} is not supported. Requires Node.js 18+`);
    }
    return `${version} (OK)`;
  }

  private async checkDependencies(): Promise<string> {
    try {
      const packageJson = await import('../../package.json', { assert: { type: 'json' } });
      return `${Object.keys(packageJson.default.dependencies || {}).length} dependencies installed`;
    } catch {
      throw new Error('package.json not found or invalid');
    }
  }

  private async checkConfiguration(): Promise<string> {
    const fs = await import('fs/promises');
    try {
      await fs.access('./umr.config.json');
      return 'Configuration file found';
    } catch {
      return 'No configuration file (using defaults)';
    }
  }

  private async checkGitRepository(): Promise<string> {
    const fs = await import('fs/promises');
    try {
      await fs.access('.git');
      return 'Git repository detected';
    } catch {
      return 'Not a git repository';
    }
  }

  private async checkFilePermissions(): Promise<string> {
    const fs = await import('fs/promises');
    try {
      await fs.access('./umr.config.json', fs.constants.R_OK | fs.constants.W_OK);
      return 'File permissions OK';
    } catch {
      return 'Some files may have permission issues';
    }
  }

  // Diagnostic implementations
  private async diagnoseConfiguration(): Promise<string | null> {
    const fs = await import('fs/promises');
    try {
      const content = await fs.readFile('./umr.config.json', 'utf8');
      JSON.parse(content); // Validate JSON
      return null;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return 'Configuration file missing';
      }
      return 'Configuration file is invalid JSON';
    }
  }

  private async fixConfiguration(): Promise<void> {
    await this.initializeConfig({ template: 'default', force: true });
  }

  private async diagnoseDependencies(): Promise<string | null> {
    // Check if node_modules exists
    const fs = await import('fs/promises');
    try {
      await fs.access('./node_modules');
      return null;
    } catch {
      return 'Dependencies not installed';
    }
  }

  private async fixDependencies(): Promise<void> {
    const { spawn } = await import('child_process');
    return new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install'], { stdio: 'inherit' });
      npm.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`npm install failed with code ${code}`));
        }
      });
    });
  }

  private async diagnoseGitHooks(): Promise<string | null> {
    const fs = await import('fs/promises');
    try {
      const files = await fs.readdir('.git/hooks');
      const umrHooks = files.filter(f => {
        // Check if any hooks contain UMR
        return ['pre-commit', 'pre-push', 'post-merge'].includes(f);
      });
      if (umrHooks.length === 0) {
        return 'No UMR git hooks installed';
      }
      return null;
    } catch {
      return 'Cannot access git hooks directory';
    }
  }

  private async fixGitHooks(): Promise<void> {
    await this.installGitHooks({ hooks: 'pre-commit,pre-push', force: true });
  }

  private async diagnoseFilePermissions(): Promise<string | null> {
    const fs = await import('fs/promises');
    try {
      // Test write permission in current directory
      const testFile = '.umr-permission-test';
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      return null;
    } catch {
      return 'Insufficient file permissions';
    }
  }

  private async fixFilePermissions(): Promise<void> {
    // This would require platform-specific permission fixing
    throw new Error('File permission fixes must be done manually');
  }
}

// Export the CLI classes for use in other modules
export { UnifiedModuleRequirementsCli, ValidatorCLI, ReporterCLI, GeneratorCLI };
export { default as AutoFixCli } from './auto-fix.js';
export { default as SecurityScanCli } from './security-scan.js';
export { default as PerformanceOptimizeCli } from './performance-optimize.js';
export { default as PluginCli } from './plugin.js';

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new UnifiedModuleRequirementsCli();
  cli.run();
}