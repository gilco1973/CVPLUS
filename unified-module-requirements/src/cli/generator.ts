#!/usr/bin/env node

/**
 * CVPlus Module Generator CLI
 *
 * Command-line interface for generating new CVPlus modules from templates.
 * Supports template listing, module generation with customization, and validation.
 *
 * Usage:
 *   cvplus-generator list [options]
 *   cvplus-generator create <template> <name> <path> [options]
 *   cvplus-generator info <template>
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import { TemplateService } from '../services/TemplateService.js';
import { ValidationService } from '../services/ValidationService.js';
import { ModuleTemplate } from '../models/ModuleTemplate.js';
import { GenerationResult } from '../models/ModuleTemplate.js';

interface CreateOptions {
  /** Template variables */
  variables?: Record<string, any>;
  /** Overwrite existing files */
  overwrite?: boolean;
  /** Run post-generation commands */
  runCommands?: boolean;
  /** Initialize git repository */
  initGit?: boolean;
  /** Install dependencies */
  installDeps?: boolean;
  /** Validate after generation */
  validate?: boolean;
  /** Interactive mode */
  interactive?: boolean;
  /** Variables file */
  variablesFile?: string;
  /** Verbose output */
  verbose?: boolean;
  /** Dry run mode */
  dryRun?: boolean;
}

interface ListOptions {
  /** Filter by category */
  category?: string;
  /** Filter by keywords */
  keywords?: string[];
  /** Show template details */
  details?: boolean;
  /** Output format */
  format?: 'table' | 'json';
}

interface InfoOptions {
  /** Show variables */
  variables?: boolean;
  /** Show files */
  files?: boolean;
  /** Output format */
  format?: 'table' | 'json';
}

class GeneratorCLI {
  private templateService: TemplateService;
  private validationService: ValidationService;
  private program: Command;
  private readline: readline.Interface;

  constructor() {
    this.validationService = new ValidationService();
    this.templateService = new TemplateService(this.validationService);
    this.program = new Command();
    this.readline = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('cvplus-generator')
      .description('CVPlus Module Generator')
      .version('1.0.0');

    // List templates command
    this.program
      .command('list')
      .description('List available templates')
      .option('-c, --category <category>', 'Filter by category')
      .option('-k, --keywords <keywords...>', 'Filter by keywords')
      .option('-d, --details', 'Show template details')
      .option('-f, --format <format>', 'Output format (table|json)', 'table')
      .action(async (options: ListOptions) => {
        await this.listTemplates(options);
      });

    // Create module command
    this.program
      .command('create')
      .description('Create a new module from template')
      .argument('<template>', 'Template ID to use')
      .argument('<name>', 'Module name')
      .argument('<path>', 'Output directory path')
      .option('--overwrite', 'Overwrite existing files')
      .option('--run-commands', 'Run post-generation commands')
      .option('--init-git', 'Initialize git repository')
      .option('--install-deps', 'Install npm dependencies')
      .option('--validate', 'Validate generated module')
      .option('-i, --interactive', 'Interactive variable input')
      .option('--variables-file <file>', 'Load variables from JSON file')
      .option('--variables <json>', 'Variables as JSON string')
      .option('-v, --verbose', 'Verbose output')
      .option('--dry-run', 'Show what would be generated without creating files')
      .action(async (templateId: string, moduleName: string, outputPath: string, options: CreateOptions) => {
        await this.createModule(templateId, moduleName, outputPath, options);
      });

    // Template info command
    this.program
      .command('info')
      .description('Show detailed template information')
      .argument('<template>', 'Template ID')
      .option('--variables', 'Show template variables')
      .option('--files', 'Show template files')
      .option('-f, --format <format>', 'Output format (table|json)', 'table')
      .action(async (templateId: string, options: InfoOptions) => {
        await this.showTemplateInfo(templateId, options);
      });

    // Health check command
    this.program
      .command('health')
      .description('Check generator health and configuration')
      .action(async () => {
        await this.checkHealth();
      });
  }

  async run(): Promise<void> {
    try {
      await this.program.parseAsync(process.argv);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    } finally {
      this.readline.close();
    }
  }

  private async listTemplates(options: ListOptions): Promise<void> {
    try {
      const listOptions: any = {
        sortBy: 'category',
        sortOrder: 'asc'
      };
      if (options.category) listOptions.category = options.category;
      if (options.keywords) listOptions.keywords = options.keywords;

      const templates = await this.templateService.listTemplates(listOptions);

      if (templates.length === 0) {
        console.log('No templates found matching criteria');
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(templates, null, 2));
        return;
      }

      // Table format
      console.log(`🎨 Available Templates (${templates.length} templates):\n`);

      templates.forEach(template => {
        const categoryIcon = this.getCategoryIcon(template.category);
        const activeIcon = template.active ? '✅' : '⚠️';

        console.log(`${activeIcon} ${template.templateId}`);
        console.log(`   ${categoryIcon} ${template.category} | ${template.name}`);

        if (options.details) {
          console.log(`   📝 ${template.description}`);
          console.log(`   👤 By: ${template.author}`);
          console.log(`   📅 Version: ${template.version}`);

          if (template.keywords.length > 0) {
            console.log(`   🏷️ Keywords: ${template.keywords.join(', ')}`);
          }

          if (template.variables.length > 0) {
            console.log(`   📊 Variables: ${template.variables.length}`);
          }

          if (template.files.length > 0) {
            console.log(`   📁 Files: ${template.files.length}`);
          }
        }

        console.log();
      });

    } catch (error) {
      console.error(`❌ Failed to list templates: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private async createModule(
    templateId: string,
    moduleName: string,
    outputPath: string,
    options: CreateOptions
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Get template
      const template = await this.templateService.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      console.log(`🎨 Creating module from template: ${template.name}`);
      console.log(`📁 Output path: ${path.resolve(outputPath)}`);

      // Prepare variables
      const variables = await this.prepareVariables(template, moduleName, options);

      if (options.verbose) {
        console.log(`⚙️ Variables:`, variables);
        console.log(`⚙️ Options:`, {
          overwrite: options.overwrite,
          runCommands: options.runCommands,
          initGit: options.initGit,
          installDeps: options.installDeps,
          validate: options.validate,
          dryRun: options.dryRun
        });
      }

      // Dry run mode - show what would be generated
      if (options.dryRun) {
        console.log(`\n🔍 Dry Run - Files that would be created:`);
        template.files.forEach(file => {
          console.log(`   📄 ${file.path}${file.required ? ' (required)' : ''}`);
        });

        if (template.postGenerationCommands && options.runCommands) {
          console.log(`\n🔍 Commands that would be executed:`);
          template.postGenerationCommands.forEach(cmd => {
            console.log(`   💻 ${cmd}`);
          });
        }

        console.log(`\n✅ Dry run completed - use without --dry-run to generate files`);
        return;
      }

      // Generate module
      const result = await this.templateService.generateModule({
        templateId,
        moduleName,
        outputPath: path.resolve(outputPath),
        variables,
        options: {
          ...(options.overwrite !== undefined && { overwriteExisting: options.overwrite }),
          ...(options.runCommands !== undefined && { runPostCommands: options.runCommands }),
          ...(options.initGit !== undefined && { initGit: options.initGit }),
          ...(options.installDeps !== undefined && { installDependencies: options.installDeps }),
          ...(options.validate !== undefined && { validateAfterGeneration: options.validate })
        }
      });

      // Show results
      await this.showGenerationResults(result, options);

      const duration = Date.now() - startTime;
      console.log(`\n✅ Module generation completed in ${duration}ms`);

      // Show validation results if requested
      if (options.validate && result.validationReport) {
        const report = result.validationReport;
        const status = this.getStatusEmoji(report.status);
        console.log(`\n${status} Validation Results:`);
        console.log(`   📊 Score: ${report.overallScore}/100`);
        console.log(`   📋 Violations: ${report.metrics.failedRules}`);

        if (report.metrics.failedRules > 0) {
          console.log(`   💡 Run 'cvplus-validator validate ${outputPath}' for details`);
        }
      }

    } catch (error) {
      console.error(`❌ Module generation failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private async showTemplateInfo(templateId: string, options: InfoOptions): Promise<void> {
    try {
      const template = await this.templateService.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(template, null, 2));
        return;
      }

      // Table format
      console.log(`🎨 Template Information: ${template.name}`);
      console.log(''.padEnd(60, '='));

      const categoryIcon = this.getCategoryIcon(template.category);
      const activeIcon = template.active ? '✅' : '⚠️';

      console.log(`${activeIcon} Status: ${template.active ? 'Active' : 'Inactive'}`);
      console.log(`🆔 ID: ${template.templateId}`);
      console.log(`${categoryIcon} Category: ${template.category}`);
      console.log(`👤 Author: ${template.author}`);
      console.log(`📅 Version: ${template.version}`);
      console.log(`📝 Description: ${template.description}`);

      if (template.keywords.length > 0) {
        console.log(`🏷️ Keywords: ${template.keywords.join(', ')}`);
      }

      if (template.compatibleTypes.length > 0) {
        console.log(`🔗 Compatible Types: ${template.compatibleTypes.join(', ')}`);
      }

      // Show variables
      if (options.variables && template.variables.length > 0) {
        console.log(`\n📊 Template Variables (${template.variables.length}):`);
        console.log(''.padEnd(40, '-'));

        template.variables.forEach(variable => {
          const requiredIcon = variable.required ? '🔴' : '🔵';
          console.log(`${requiredIcon} ${variable.name} (${variable.type})`);
          console.log(`   📝 ${variable.description}`);

          if (variable.defaultValue !== undefined) {
            console.log(`   💡 Default: ${variable.defaultValue}`);
          }

          if (variable.options && variable.options.length > 0) {
            console.log(`   📋 Options: ${variable.options.map(opt => opt.label).join(', ')}`);
          }

          console.log();
        });
      }

      // Show files
      if (options.files && template.files.length > 0) {
        console.log(`\n📁 Template Files (${template.files.length}):`);
        console.log(''.padEnd(40, '-'));

        template.files.forEach(file => {
          const requiredIcon = file.required ? '🔴' : '🔵';
          const typeIcon = this.getFileTypeIcon(file.path);
          console.log(`${requiredIcon} ${typeIcon} ${file.path}`);

          if (file.conditions && file.conditions.length > 0) {
            console.log(`   ⚙️ Conditional: ${file.conditions.length} condition(s)`);
          }
        });
      }

      // Show metadata
      if (template.metadata) {
        console.log(`\n📋 Additional Information:`);
        if (template.metadata.license) {
          console.log(`   📜 License: ${template.metadata.license}`);
        }
        if (template.metadata.repositoryUrl) {
          console.log(`   🔗 Repository: ${template.metadata.repositoryUrl}`);
        }
        if (template.metadata.documentationUrl) {
          console.log(`   📚 Documentation: ${template.metadata.documentationUrl}`);
        }
      }

    } catch (error) {
      console.error(`❌ Failed to show template info: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private async checkHealth(): Promise<void> {
    try {
      const templateHealth = await this.templateService.getHealthStatus();
      const validationHealth = await this.validationService.getHealthStatus();

      const templateStatus = templateHealth.status === 'healthy' ? '✅' : templateHealth.status === 'degraded' ? '⚠️' : '❌';
      const validationStatus = validationHealth.status === 'healthy' ? '✅' : validationHealth.status === 'degraded' ? '⚠️' : '❌';

      console.log(`${templateStatus} Template Service: ${templateHealth.status.toUpperCase()}`);
      console.log(`${validationStatus} Validation Service: ${validationHealth.status.toUpperCase()}`);

      console.log(`\n📊 Template Service Details:`);
      if (templateHealth.details) {
        Object.entries(templateHealth.details).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }

      console.log(`\n📊 Validation Service Details:`);
      if (validationHealth.details) {
        Object.entries(validationHealth.details).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }

      if (templateHealth.status !== 'healthy' || validationHealth.status !== 'healthy') {
        process.exit(1);
      }

    } catch (error) {
      console.error(`❌ Health check failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private async prepareVariables(
    template: ModuleTemplate,
    moduleName: string,
    options: CreateOptions
  ): Promise<Record<string, any>> {
    let variables: Record<string, any> = {};

    // Start with default values
    template.variables.forEach(variable => {
      if (variable.defaultValue !== undefined) {
        variables[variable.name] = variable.defaultValue;
      }
    });

    // Add module name and computed values
    variables['moduleId'] = moduleName;
    variables['name'] = moduleName;

    // Load from variables file if provided
    if (options.variablesFile) {
      try {
        const fileContent = await fs.readFile(options.variablesFile, 'utf-8');
        const fileVariables = JSON.parse(fileContent);
        variables = { ...variables, ...fileVariables };
      } catch (error) {
        throw new Error(`Failed to load variables file: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Parse variables from command line
    if (options.variables) {
      variables = { ...variables, ...options.variables };
    }

    // Interactive mode - prompt for missing required variables
    if (options.interactive) {
      variables = await this.promptForVariables(template, variables);
    }

    return variables;
  }

  private async promptForVariables(
    template: ModuleTemplate,
    currentVariables: Record<string, any>
  ): Promise<Record<string, any>> {
    console.log(`\n🔧 Interactive Variable Configuration:`);

    const variables = { ...currentVariables };

    for (const variable of template.variables) {
      if (variable.required && variables[variable.name] === undefined) {
        const prompt = `${variable.required ? '🔴' : '🔵'} ${variable.name} (${variable.type}): ${variable.description}`;
        console.log(prompt);

        if (variable.options && variable.options.length > 0) {
          console.log(`   Options: ${variable.options.map(opt => `${opt.value} (${opt.label})`).join(', ')}`);
        }

        const value = await this.promptUser(`   Enter value: `);

        if (value.trim()) {
          variables[variable.name] = this.parseVariableValue(value, variable.type);
        } else if (variable.defaultValue !== undefined) {
          variables[variable.name] = variable.defaultValue;
        }
      }
    }

    return variables;
  }

  private parseVariableValue(value: string, type: string): any {
    switch (type) {
      case 'number':
        return parseInt(value, 10);
      case 'boolean':
        return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
      case 'array':
        return value.split(',').map(v => v.trim());
      default:
        return value;
    }
  }

  private async promptUser(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.readline.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  private async showGenerationResults(result: GenerationResult, _options: CreateOptions): Promise<void> {
    const statusIcon = result.success ? '✅' : '❌';
    console.log(`\n${statusIcon} Generation Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);

    if (result.errors.length > 0) {
      console.log(`\n❌ Errors:`);
      result.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log(`\n⚠️ Warnings:`);
      result.warnings.forEach(warning => {
        console.log(`   • ${warning}`);
      });
    }

    if (result.success) {
      console.log(`\n📁 Generated Files (${result.filesCreated.length}):`);
      result.filesCreated.forEach(file => {
        const typeIcon = this.getFileTypeIcon(file);
        console.log(`   ${typeIcon} ${file}`);
      });

      if (result.commandsExecuted.length > 0) {
        console.log(`\n💻 Commands Executed (${result.commandsExecuted.length}):`);
        result.commandsExecuted.forEach(cmd => {
          console.log(`   ✅ ${cmd}`);
        });
      }

      console.log(`\n📊 Generation Metrics:`);
      console.log(`   ⏱️ Time: ${result.metrics.totalTime}ms`);
      console.log(`   📄 Files: ${result.metrics.filesProcessed}`);
      console.log(`   📊 Variables: ${result.metrics.variablesSubstituted}`);
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

  private getCategoryIcon(category: string): string {
    switch (category) {
      case 'backend-api': return '🔧';
      case 'frontend-component': return '🎨';
      case 'utility-lib': return '🛠️';
      case 'shared-types': return '📋';
      case 'cli-tool': return '⚡';
      case 'service': return '⚙️';
      case 'middleware': return '🔗';
      case 'config': return '📄';
      case 'testing': return '🧪';
      default: return '📦';
    }
  }

  private getFileTypeIcon(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.ts':
      case '.tsx':
        return '📘';
      case '.js':
      case '.jsx':
        return '📒';
      case '.json':
        return '📊';
      case '.md':
        return '📝';
      case '.yml':
      case '.yaml':
        return '⚙️';
      default:
        if (filePath.includes('test') || filePath.includes('spec')) {
          return '🧪';
        }
        return '📄';
    }
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new GeneratorCLI();
  cli.run();
}

export { GeneratorCLI };