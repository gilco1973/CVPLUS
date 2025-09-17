import { Command } from 'commander';
import { PluginManager } from '../services/PluginManager.js';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs/promises';
import * as path from 'path';

export class PluginCli {
  private pluginManager: PluginManager;

  constructor() {
    // Initialize with default configuration
    this.pluginManager = new PluginManager({
      pluginDirs: ['./plugins', './node_modules/@umr'],
      autoLoad: false,
      autoActivate: false
    });
  }

  createCommand(): Command {
    const command = new Command('plugin')
      .description('Manage UMR plugins')
      .option('--plugin-dir <dir>', 'Additional plugin directory to scan')
      .hook('preAction', (thisCommand) => {
        // Update plugin manager configuration with CLI options
        const options = thisCommand.opts();
        if (options.pluginDir) {
          // Would update plugin manager config
        }
      });

    // Add subcommands
    command.addCommand(this.createListCommand());
    command.addCommand(this.createDiscoverCommand());
    command.addCommand(this.createLoadCommand());
    command.addCommand(this.createActivateCommand());
    command.addCommand(this.createDeactivateCommand());
    command.addCommand(this.createUnloadCommand());
    command.addCommand(this.createInfoCommand());
    command.addCommand(this.createInstallCommand());
    command.addCommand(this.createValidateCommand());
    command.addCommand(this.createCreateCommand());

    return command;
  }

  private createListCommand(): Command {
    return new Command('list')
      .alias('ls')
      .description('List all plugins')
      .option('-s, --status <status>', 'Filter by status (loaded|active|error)')
      .option('-f, --format <format>', 'Output format (table|json)', 'table')
      .action(async (options) => {
        await this.handleList(options);
      });
  }

  private createDiscoverCommand(): Command {
    return new Command('discover')
      .description('Discover available plugins')
      .option('-d, --dir <directory>', 'Specific directory to scan')
      .option('-f, --format <format>', 'Output format (table|json)', 'table')
      .action(async (options) => {
        await this.handleDiscover(options);
      });
  }

  private createLoadCommand(): Command {
    return new Command('load')
      .description('Load a plugin')
      .argument('<plugin-path>', 'Path to plugin directory')
      .option('--no-activate', 'Load without activating')
      .action(async (pluginPath: string, options) => {
        await this.handleLoad(pluginPath, options);
      });
  }

  private createActivateCommand(): Command {
    return new Command('activate')
      .description('Activate a loaded plugin')
      .argument('<plugin-id>', 'Plugin ID to activate')
      .action(async (pluginId: string) => {
        await this.handleActivate(pluginId);
      });
  }

  private createDeactivateCommand(): Command {
    return new Command('deactivate')
      .description('Deactivate an active plugin')
      .argument('<plugin-id>', 'Plugin ID to deactivate')
      .action(async (pluginId: string) => {
        await this.handleDeactivate(pluginId);
      });
  }

  private createUnloadCommand(): Command {
    return new Command('unload')
      .description('Unload a plugin')
      .argument('<plugin-id>', 'Plugin ID to unload')
      .action(async (pluginId: string) => {
        await this.handleUnload(pluginId);
      });
  }

  private createInfoCommand(): Command {
    return new Command('info')
      .description('Show detailed plugin information')
      .argument('<plugin-id>', 'Plugin ID to inspect')
      .option('-f, --format <format>', 'Output format (detailed|json)', 'detailed')
      .action(async (pluginId: string, options) => {
        await this.handleInfo(pluginId, options);
      });
  }

  private createInstallCommand(): Command {
    return new Command('install')
      .description('Install a plugin from source')
      .argument('<source>', 'Plugin source (local path, npm package, git repo)')
      .option('-s, --source-type <type>', 'Source type (local|npm|git|url)', 'local')
      .option('--force', 'Force installation over existing plugin')
      .option('--no-activate', 'Install without activating')
      .action(async (source: string, options) => {
        await this.handleInstall(source, options);
      });
  }

  private createValidateCommand(): Command {
    return new Command('validate')
      .description('Validate plugin structure and security')
      .argument('<plugin-path>', 'Path to plugin directory')
      .option('-f, --format <format>', 'Output format (detailed|json)', 'detailed')
      .action(async (pluginPath: string, options) => {
        await this.handleValidate(pluginPath, options);
      });
  }

  private createCreateCommand(): Command {
    return new Command('create')
      .description('Create a new plugin from template')
      .argument('<plugin-name>', 'Plugin name')
      .option('-t, --template <template>', 'Plugin template (basic|validation|cli|report)', 'basic')
      .option('-d, --dir <directory>', 'Output directory', './plugins')
      .option('--author <author>', 'Plugin author name')
      .action(async (pluginName: string, options) => {
        await this.handleCreate(pluginName, options);
      });
  }

  private async handleList(options: any): Promise<void> {
    const plugins = this.pluginManager.getPlugins();

    // Filter by status if specified
    let filteredPlugins = plugins;
    if (options.status) {
      filteredPlugins = plugins.filter(p => p.status === options.status);
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(filteredPlugins, null, 2));
      return;
    }

    // Table format
    if (filteredPlugins.length === 0) {
      console.log(chalk.yellow('No plugins found.'));
      console.log(chalk.gray('Use "umr plugin discover" to find available plugins.'));
      return;
    }

    console.log(chalk.blue('\n📦 Loaded Plugins'));
    console.log(chalk.gray('='.repeat(80)));

    filteredPlugins.forEach((entry, index) => {
      const { plugin, status, loadedAt, activatedAt } = entry;
      const statusColor = this.getStatusColor(status);

      console.log(`\n${index + 1}. ${chalk.bold(plugin.metadata.name)} (${plugin.metadata.id})`);
      console.log(`   Version: ${plugin.metadata.version}`);
      console.log(`   Status: ${statusColor(status.toUpperCase())}`);
      console.log(`   Author: ${plugin.metadata.author}`);
      console.log(`   Loaded: ${loadedAt.toLocaleString()}`);
      if (activatedAt) {
        console.log(`   Activated: ${activatedAt.toLocaleString()}`);
      }
      if (plugin.metadata.description) {
        console.log(`   Description: ${chalk.gray(plugin.metadata.description)}`);
      }
    });
  }

  private async handleDiscover(options: any): Promise<void> {
    const spinner = ora('Discovering plugins...').start();

    try {
      const result = await this.pluginManager.discoverPlugins();
      spinner.succeed(`Discovered ${result.plugins.length} plugins in ${result.metadata.scanDuration}ms`);

      if (options.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (result.plugins.length === 0) {
        console.log(chalk.yellow('\nNo plugins found in configured directories.'));
        console.log(chalk.gray('Plugin directories searched:'));
        console.log(chalk.gray('  - ./plugins'));
        console.log(chalk.gray('  - ./node_modules/@umr'));
        return;
      }

      console.log(chalk.blue('\n🔍 Discovered Plugins'));
      console.log(chalk.gray('='.repeat(80)));

      result.plugins.forEach((plugin, index) => {
        console.log(`\n${index + 1}. ${chalk.bold(plugin.metadata.name)} (${plugin.metadata.id})`);
        console.log(`   Version: ${plugin.metadata.version}`);
        console.log(`   Path: ${chalk.gray(plugin.path)}`);
        console.log(`   Valid: ${plugin.valid ? chalk.green('✅') : chalk.red('❌')}`);
        if (plugin.metadata.description) {
          console.log(`   Description: ${chalk.gray(plugin.metadata.description)}`);
        }
        if (!plugin.valid && plugin.errors.length > 0) {
          console.log(`   Errors: ${chalk.red(plugin.errors.join(', '))}`);
        }
      });

      if (result.errors.length > 0) {
        console.log(chalk.red('\n⚠️ Discovery Errors:'));
        result.errors.forEach(error => {
          console.log(`   ${error.path}: ${error.message}`);
        });
      }

      console.log(chalk.gray(`\nScanned ${result.metadata.directoriesScanned} directories, ${result.metadata.filesScanned} files`));
    } catch (error) {
      spinner.fail(`Discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  private async handleLoad(pluginPath: string, options: any): Promise<void> {
    const spinner = ora(`Loading plugin from ${pluginPath}...`).start();

    try {
      const pluginId = await this.pluginManager.loadPlugin(pluginPath);
      spinner.succeed(`Plugin loaded: ${pluginId}`);

      if (options.activate !== false) {
        await this.handleActivate(pluginId);
      }
    } catch (error) {
      spinner.fail(`Failed to load plugin: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  private async handleActivate(pluginId: string): Promise<void> {
    const spinner = ora(`Activating plugin ${pluginId}...`).start();

    try {
      await this.pluginManager.activatePlugin(pluginId);
      spinner.succeed(`Plugin activated: ${pluginId}`);
    } catch (error) {
      spinner.fail(`Failed to activate plugin: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  private async handleDeactivate(pluginId: string): Promise<void> {
    const spinner = ora(`Deactivating plugin ${pluginId}...`).start();

    try {
      await this.pluginManager.deactivatePlugin(pluginId);
      spinner.succeed(`Plugin deactivated: ${pluginId}`);
    } catch (error) {
      spinner.fail(`Failed to deactivate plugin: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  private async handleUnload(pluginId: string): Promise<void> {
    const spinner = ora(`Unloading plugin ${pluginId}...`).start();

    try {
      await this.pluginManager.unloadPlugin(pluginId);
      spinner.succeed(`Plugin unloaded: ${pluginId}`);
    } catch (error) {
      spinner.fail(`Failed to unload plugin: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  private async handleInfo(pluginId: string, options: any): Promise<void> {
    const entry = this.pluginManager.getPlugin(pluginId);
    if (!entry) {
      console.log(chalk.red(`❌ Plugin not found: ${pluginId}`));
      return;
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(entry, null, 2));
      return;
    }

    const { plugin, status, loadedAt, activatedAt } = entry;
    const statusColor = this.getStatusColor(status);

    console.log(chalk.blue(`\n📦 Plugin Information: ${plugin.metadata.name}`));
    console.log(chalk.gray('='.repeat(60)));

    console.log(`\n${chalk.cyan('Basic Information:')}`);
    console.log(`  ID: ${plugin.metadata.id}`);
    console.log(`  Name: ${plugin.metadata.name}`);
    console.log(`  Version: ${plugin.metadata.version}`);
    console.log(`  Author: ${plugin.metadata.author}`);
    console.log(`  Status: ${statusColor(status.toUpperCase())}`);
    if (plugin.metadata.homepage) {
      console.log(`  Homepage: ${plugin.metadata.homepage}`);
    }
    if (plugin.metadata.license) {
      console.log(`  License: ${plugin.metadata.license}`);
    }

    console.log(`\n${chalk.cyan('Description:')}`);
    console.log(`  ${plugin.metadata.description || 'No description provided'}`);

    if (plugin.metadata.tags && plugin.metadata.tags.length > 0) {
      console.log(`\n${chalk.cyan('Tags:')}`);
      console.log(`  ${plugin.metadata.tags.join(', ')}`);
    }

    console.log(`\n${chalk.cyan('Lifecycle:')}`);
    console.log(`  Loaded: ${loadedAt.toLocaleString()}`);
    if (activatedAt) {
      console.log(`  Activated: ${activatedAt.toLocaleString()}`);
    }

    console.log(`\n${chalk.cyan('Capabilities:')}`);
    const caps = plugin.capabilities;
    console.log(`  Validation Rules: ${caps.validationRules?.length || 0}`);
    console.log(`  CLI Commands: ${caps.cliCommands?.length || 0}`);
    console.log(`  Report Generators: ${caps.reportGenerators?.length || 0}`);
    console.log(`  Hooks: ${caps.hooks?.length || 0}`);
    console.log(`  Config Extensions: ${caps.configExtensions?.length || 0}`);

    if (plugin.metadata.dependencies && plugin.metadata.dependencies.length > 0) {
      console.log(`\n${chalk.cyan('Dependencies:')}`);
      plugin.metadata.dependencies.forEach(dep => {
        console.log(`  ${dep.pluginId}@${dep.versionRange}${dep.optional ? ' (optional)' : ''}`);
      });
    }
  }

  private async handleInstall(_source: string, _options: any): Promise<void> {
    console.log(chalk.yellow('Plugin installation is not yet implemented.'));
    console.log(chalk.gray('This feature will be available in a future release.'));
  }

  private async handleValidate(pluginPath: string, options: any): Promise<void> {
    const spinner = ora(`Validating plugin at ${pluginPath}...`).start();

    try {
      // This would use PluginManager's validation functionality
      // For now, just check basic structure
      const manifestPath = path.join(pluginPath, 'plugin.json');
      const exists = await fs.access(manifestPath).then(() => true).catch(() => false);

      if (!exists) {
        throw new Error('plugin.json manifest file not found');
      }

      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      spinner.succeed('Plugin validation completed');

      if (options.format === 'json') {
        console.log(JSON.stringify({ valid: true, manifest }, null, 2));
        return;
      }

      console.log(chalk.green('\n✅ Plugin is valid'));
      console.log(`\nPlugin: ${manifest.metadata?.name || 'Unknown'}`);
      console.log(`Version: ${manifest.metadata?.version || 'Unknown'}`);
      console.log(`Entry Point: ${manifest.main || 'index.js'}`);
    } catch (error) {
      spinner.fail(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      if (options.format === 'json') {
        console.log(JSON.stringify({
          valid: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, null, 2));
      }

      process.exit(1);
    }
  }

  private async handleCreate(pluginName: string, options: any): Promise<void> {
    const spinner = ora(`Creating plugin ${pluginName}...`).start();

    try {
      const pluginDir = path.join(options.dir, pluginName);

      // Create plugin directory
      await fs.mkdir(pluginDir, { recursive: true });

      // Generate plugin files based on template
      await this.generatePluginTemplate(pluginDir, pluginName, options);

      spinner.succeed(`Plugin created: ${pluginDir}`);

      console.log(chalk.green('\n🎉 Plugin created successfully!'));
      console.log(`\nNext steps:`);
      console.log(chalk.gray(`  1. cd ${pluginDir}`));
      console.log(chalk.gray(`  2. npm install`));
      console.log(chalk.gray(`  3. Edit index.js to implement your plugin`));
      console.log(chalk.gray(`  4. Test with: umr plugin load ${pluginDir}`));
    } catch (error) {
      spinner.fail(`Failed to create plugin: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  private async generatePluginTemplate(pluginDir: string, pluginName: string, options: any): Promise<void> {
    const author = options.author || 'Unknown';

    // Generate plugin.json manifest
    const manifest = {
      metadata: {
        id: pluginName.toLowerCase().replace(/\s+/g, '-'),
        name: pluginName,
        version: '1.0.0',
        description: `A UMR plugin for ${pluginName}`,
        author,
        tags: ['custom'],
        umrVersion: '^1.0.0'
      },
      main: 'index.js',
      capabilities: this.getTemplateCapabilities(options.template)
    };

    await fs.writeFile(
      path.join(pluginDir, 'plugin.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Generate package.json
    const packageJson = {
      name: `umr-plugin-${manifest.metadata.id}`,
      version: '1.0.0',
      description: manifest.metadata.description,
      main: 'index.js',
      author,
      license: 'MIT',
      peerDependencies: {
        '@umr/core': '^1.0.0'
      }
    };

    await fs.writeFile(
      path.join(pluginDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Generate main plugin file
    const pluginCode = this.generatePluginCode(options.template, manifest.metadata);
    await fs.writeFile(path.join(pluginDir, 'index.js'), pluginCode);

    // Generate README
    const readme = this.generatePluginReadme(manifest.metadata, options.template);
    await fs.writeFile(path.join(pluginDir, 'README.md'), readme);
  }

  private getTemplateCapabilities(template: string): any {
    const baseCapabilities = {};

    switch (template) {
      case 'validation':
        return {
          ...baseCapabilities,
          validationRules: [{
            rule: {
              id: 'custom-validation-rule',
              name: 'Custom Validation Rule',
              description: 'A custom validation rule',
              severity: 'warning'
            },
            priority: 100
          }]
        };

      case 'cli':
        return {
          ...baseCapabilities,
          cliCommands: [{
            name: 'custom-command',
            description: 'A custom CLI command'
          }]
        };

      case 'report':
        return {
          ...baseCapabilities,
          reportGenerators: [{
            format: 'custom',
            description: 'Custom report format',
            mimeType: 'text/plain',
            fileExtension: 'txt'
          }]
        };

      default:
        return baseCapabilities;
    }
  }

  private generatePluginCode(_template: string, metadata: any): string {
    const baseCode = `
/**
 * ${metadata.name}
 * ${metadata.description}
 */

module.exports = {
  metadata: ${JSON.stringify(metadata, null, 2)},

  capabilities: {
    // Plugin capabilities will be defined here
  },

  lifecycle: {
    async onLoad(context) {
      context.logger.info('Plugin loaded: ${metadata.name}');
    },

    async onActivate(context) {
      context.logger.info('Plugin activated: ${metadata.name}');
      // Initialize plugin functionality here
    },

    async onDeactivate(context) {
      context.logger.info('Plugin deactivated: ${metadata.name}');
      // Cleanup plugin functionality here
    },

    async onUnload(context) {
      context.logger.info('Plugin unloaded: ${metadata.name}');
    }
  }
};
`;

    return baseCode.trim();
  }

  private generatePluginReadme(metadata: any, template: string): string {
    return `# ${metadata.name}

${metadata.description}

## Installation

\`\`\`bash
umr plugin load ./path/to/this/plugin
\`\`\`

## Usage

This plugin provides ${template} functionality for the UMR system.

## Configuration

Add configuration details here.

## License

MIT
`;
  }

  private getStatusColor(status: string): (text: string) => string {
    switch (status) {
      case 'active':
        return chalk.green;
      case 'loaded':
        return chalk.blue;
      case 'error':
        return chalk.red;
      case 'loading':
      case 'activating':
      case 'deactivating':
        return chalk.yellow;
      default:
        return chalk.gray;
    }
  }
}

export default PluginCli;