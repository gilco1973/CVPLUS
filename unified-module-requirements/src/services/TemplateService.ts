/**
 * TemplateService - Core service for CVPlus module template management and generation
 *
 * This service provides comprehensive template functionality including:
 * - Template discovery and listing
 * - Module generation from templates
 * - Template variable processing and validation
 * - File creation and directory structure setup
 * - Post-generation command execution
 * - Integration with ValidationService for immediate compliance checking
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  ModuleTemplate,
  GenerationResult,
  TemplateProcessor,
  ModuleTemplateValidator,
  BuiltInTemplates
} from '../models/ModuleTemplate.js';
import { ValidationService } from './ValidationService.js';
import {
  GenerationContext,
  SystemEvent,
  createSystemEvent,
  FILE_SIZE_LIMITS,
  GenerationError
} from '../models/types.js';

const execAsync = promisify(exec);

export interface TemplateGenerationOptions {
  /** Template ID to use */
  templateId: string;
  /** Module name/ID */
  moduleName: string;
  /** Output directory path */
  outputPath: string;
  /** Template variable values */
  variables: Record<string, any>;
  /** Generation options */
  options?: {
    /** Overwrite existing files */
    overwriteExisting?: boolean;
    /** Run post-generation commands */
    runPostCommands?: boolean;
    /** Initialize git repository */
    initGit?: boolean;
    /** Install npm dependencies */
    installDependencies?: boolean;
    /** Validate generated module immediately */
    validateAfterGeneration?: boolean;
  };
}

export interface TemplateListOptions {
  /** Filter by category */
  category?: string;
  /** Filter by keywords */
  keywords?: string[];
  /** Include inactive templates */
  includeInactive?: boolean;
  /** Sort by field */
  sortBy?: 'name' | 'category' | 'created' | 'updated';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

export class TemplateService {
  private templates: ModuleTemplate[] = [];
  private validationService: ValidationService | undefined;

  constructor(validationService?: ValidationService) {
    this.validationService = validationService;
    this.loadBuiltInTemplates();
  }

  /**
   * List available templates with filtering options
   */
  async listTemplates(options: TemplateListOptions = {}): Promise<ModuleTemplate[]> {
    try {
      let filteredTemplates = this.templates.filter(template => {
        // Filter by active status
        if (!options.includeInactive && !template.active) {
          return false;
        }

        // Filter by category
        if (options.category && template.category !== options.category) {
          return false;
        }

        // Filter by keywords
        if (options.keywords && options.keywords.length > 0) {
          const templateKeywords = template.keywords.map(k => k.toLowerCase());
          const hasMatchingKeyword = options.keywords.some(keyword =>
            templateKeywords.some(tk => tk.includes(keyword.toLowerCase()))
          );
          if (!hasMatchingKeyword) {
            return false;
          }
        }

        return true;
      });

      // Sort templates
      if (options.sortBy) {
        filteredTemplates.sort((a, b) => {
          let aValue: any;
          let bValue: any;

          switch (options.sortBy) {
            case 'name':
              aValue = a.name.toLowerCase();
              bValue = b.name.toLowerCase();
              break;
            case 'category':
              aValue = a.category;
              bValue = b.category;
              break;
            case 'created':
              aValue = a.createdAt;
              bValue = b.createdAt;
              break;
            case 'updated':
              aValue = a.updatedAt;
              bValue = b.updatedAt;
              break;
            default:
              aValue = a.name.toLowerCase();
              bValue = b.name.toLowerCase();
          }

          if (aValue < bValue) return options.sortOrder === 'desc' ? 1 : -1;
          if (aValue > bValue) return options.sortOrder === 'desc' ? -1 : 1;
          return 0;
        });
      }

      this.emitEvent(createSystemEvent(
        'system',
        'debug',
        `Listed ${filteredTemplates.length} templates`,
        'TemplateService',
        { filters: options, count: filteredTemplates.length }
      ));

      return filteredTemplates;

    } catch (error) {
      this.emitEvent(createSystemEvent(
        'error',
        'error',
        `Failed to list templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TemplateService'
      ));

      throw new GenerationError(
        'Failed to list templates',
        undefined,
        { originalError: error }
      );
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<ModuleTemplate | null> {
    try {
      const template = this.templates.find(t => t.templateId === templateId);

      if (template) {
        this.emitEvent(createSystemEvent(
          'system',
          'debug',
          `Retrieved template: ${templateId}`,
          'TemplateService',
          { templateId, category: template.category }
        ));
      }

      return template || null;

    } catch (error) {
      this.emitEvent(createSystemEvent(
        'error',
        'error',
        `Failed to get template ${templateId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TemplateService'
      ));

      throw new GenerationError(
        `Failed to get template ${templateId}`,
        templateId,
        { originalError: error }
      );
    }
  }

  /**
   * Generate a new module from template
   */
  async generateModule(options: TemplateGenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    this.emitEvent(createSystemEvent(
      'generation',
      'info',
      `Starting module generation: ${options.moduleName} from ${options.templateId}`,
      'TemplateService',
      { generationId, templateId: options.templateId, moduleName: options.moduleName }
    ));

    try {
      // Get template
      const template = await this.getTemplate(options.templateId);
      if (!template) {
        throw new GenerationError(
          `Template not found: ${options.templateId}`,
          options.templateId
        );
      }

      // Validate template
      const templateValidation = ModuleTemplateValidator.validate(template);
      if (!templateValidation.valid) {
        throw new GenerationError(
          `Invalid template: ${templateValidation.errors.join(', ')}`,
          options.templateId,
          { validationErrors: templateValidation.errors }
        );
      }

      // Prepare variables
      const processedVariables = await this.prepareVariables(template, options);

      // Create generation context
      const context: GenerationContext = {
        generationId,
        templateId: options.templateId,
        outputDirectory: options.outputPath,
        variables: processedVariables,
        options: options.options || {},
        timestamp: new Date()
      };

      // Validate output path
      await this.validateOutputPath(options.outputPath, options.options?.overwriteExisting);

      // Generate files
      const filesCreated = await this.generateFiles(template, context);

      // Execute post-generation commands
      const commandsExecuted = options.options?.runPostCommands
        ? await this.executePostGenerationCommands(template, context)
        : [];

      // Initialize git repository if requested
      if (options.options?.initGit) {
        await this.initializeGitRepository(options.outputPath);
        commandsExecuted.push('git init');
      }

      // Install dependencies if requested
      if (options.options?.installDependencies) {
        await this.installDependencies(options.outputPath);
        commandsExecuted.push('npm install');
      }

      // Validate generated module if requested
      let validationReport;
      if (options.options?.validateAfterGeneration && this.validationService) {
        try {
          validationReport = await this.validationService.validateModule(options.outputPath);
        } catch (error) {
          // Don't fail generation if validation fails
          this.emitEvent(createSystemEvent(
            'generation',
            'warning',
            `Post-generation validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'TemplateService',
            { generationId, error: error instanceof Error ? error.message : String(error) }
          ));
        }
      }

      const totalTime = Date.now() - startTime;

      const result: GenerationResult = {
        success: true,
        modulePath: options.outputPath,
        filesCreated,
        commandsExecuted,
        errors: [],
        warnings: [],
        metrics: {
          totalTime,
          filesProcessed: filesCreated.length,
          variablesSubstituted: Object.keys(processedVariables).length
        },
        validationReport
      };

      this.emitEvent(createSystemEvent(
        'generation',
        'info',
        `Module generation completed successfully: ${options.moduleName}`,
        'TemplateService',
        {
          generationId,
          totalTime,
          filesCreated: filesCreated.length,
          score: validationReport?.overallScore
        }
      ));

      return result;

    } catch (error) {
      const totalTime = Date.now() - startTime;

      this.emitEvent(createSystemEvent(
        'error',
        'error',
        `Module generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TemplateService',
        { generationId, totalTime, error: error instanceof Error ? error.message : String(error) }
      ));

      // Return failed result instead of throwing
      return {
        success: false,
        modulePath: options.outputPath,
        filesCreated: [],
        commandsExecuted: [],
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        metrics: {
          totalTime,
          filesProcessed: 0,
          variablesSubstituted: 0
        }
      };
    }
  }

  /**
   * Add custom template
   */
  async addTemplate(template: ModuleTemplate): Promise<void> {
    try {
      // Validate template
      const validation = ModuleTemplateValidator.validate(template);
      if (!validation.valid) {
        throw new GenerationError(
          `Invalid template: ${validation.errors.join(', ')}`,
          template.templateId,
          { validationErrors: validation.errors }
        );
      }

      // Check for duplicate template IDs
      const existingTemplate = this.templates.find(t => t.templateId === template.templateId);
      if (existingTemplate) {
        throw new GenerationError(
          `Template with ID ${template.templateId} already exists`,
          template.templateId
        );
      }

      this.templates.push(template);

      this.emitEvent(createSystemEvent(
        'system',
        'info',
        `Custom template added: ${template.templateId}`,
        'TemplateService',
        { templateId: template.templateId, category: template.category }
      ));

    } catch (error) {
      this.emitEvent(createSystemEvent(
        'error',
        'error',
        `Failed to add template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TemplateService'
      ));

      throw error;
    }
  }

  /**
   * Remove template by ID
   */
  async removeTemplate(templateId: string): Promise<boolean> {
    try {
      const index = this.templates.findIndex(t => t.templateId === templateId);
      if (index === -1) {
        return false;
      }

      const removedTemplate = this.templates.splice(index, 1)[0]!;

      this.emitEvent(createSystemEvent(
        'system',
        'info',
        `Template removed: ${templateId}`,
        'TemplateService',
        { templateId, category: removedTemplate.category }
      ));

      return true;

    } catch (error) {
      this.emitEvent(createSystemEvent(
        'error',
        'error',
        `Failed to remove template ${templateId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TemplateService'
      ));

      throw new GenerationError(
        `Failed to remove template ${templateId}`,
        templateId,
        { originalError: error }
      );
    }
  }

  /**
   * Get health status of template service
   */
  async getHealthStatus(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy', details: any }> {
    try {
      const templatesCount = this.templates.length;
      const activeTemplatesCount = this.templates.filter(t => t.active).length;

      const status = templatesCount > 0 ? 'healthy' : 'degraded';

      return {
        status,
        details: {
          totalTemplates: templatesCount,
          activeTemplates: activeTemplatesCount,
          categories: [...new Set(this.templates.map(t => t.category))],
          lastUpdate: new Date()
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  // Private methods

  private loadBuiltInTemplates(): void {
    this.templates = BuiltInTemplates.getAllTemplates();
  }

  private async prepareVariables(
    template: ModuleTemplate,
    options: TemplateGenerationOptions
  ): Promise<Record<string, any>> {
    // Start with provided variables
    const variables = { ...options.variables };

    // Add default values for missing variables
    for (const templateVar of template.variables) {
      if (variables[templateVar.name] === undefined && templateVar.defaultValue !== undefined) {
        variables[templateVar.name] = templateVar.defaultValue;
      }
    }

    // Add computed variables
    variables['moduleId'] = variables['moduleId'] || options.moduleName;
    variables['name'] = variables['name'] || options.moduleName;
    variables['timestamp'] = new Date().toISOString();
    variables['year'] = new Date().getFullYear();

    // Validate variables
    const validation = TemplateProcessor.validateVariableValues(template, variables);
    if (!validation.valid) {
      throw new GenerationError(
        `Invalid template variables: ${validation.errors.join(', ')}`,
        template.templateId,
        { validationErrors: validation.errors }
      );
    }

    return variables;
  }

  private async validateOutputPath(outputPath: string, overwriteExisting = false): Promise<void> {
    try {
      const stats = await fs.stat(outputPath);

      // Path exists
      if (stats.isDirectory()) {
        const files = await fs.readdir(outputPath);
        if (files.length > 0 && !overwriteExisting) {
          throw new GenerationError(
            `Output directory is not empty: ${outputPath}. Use overwriteExisting option to proceed.`,
            undefined,
            { outputPath, fileCount: files.length }
          );
        }
      } else {
        throw new GenerationError(
          `Output path exists but is not a directory: ${outputPath}`,
          undefined,
          { outputPath }
        );
      }

    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Path doesn't exist, this is fine
        return;
      }
      throw error;
    }
  }

  private async generateFiles(
    template: ModuleTemplate,
    context: GenerationContext
  ): Promise<string[]> {
    const filesCreated: string[] = [];

    // Ensure output directory exists
    await fs.mkdir(context.outputDirectory, { recursive: true });

    for (const templateFile of template.files) {
      // Check conditions
      if (templateFile.conditions && templateFile.conditions.length > 0) {
        const conditionsMet = templateFile.conditions.every(condition =>
          TemplateProcessor.evaluateCondition(condition, context.variables)
        );

        if (!conditionsMet) {
          continue; // Skip this file
        }
      }

      const outputPath = path.join(context.outputDirectory, templateFile.path);

      // Ensure directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // Process file content
      const processedContent = TemplateProcessor.processContent(
        templateFile.content,
        context.variables
      );

      // Check file size
      if (processedContent.length > FILE_SIZE_LIMITS.MEDIUM) {
        this.emitEvent(createSystemEvent(
          'generation',
          'warning',
          `Large file generated: ${templateFile.path} (${Math.round(processedContent.length / 1024)}KB)`,
          'TemplateService',
          { filePath: templateFile.path, sizeKB: Math.round(processedContent.length / 1024) }
        ));
      }

      // Write file
      if (templateFile.isBinary) {
        // Handle binary files (base64 encoded)
        const buffer = Buffer.from(processedContent, 'base64');
        await fs.writeFile(outputPath, buffer);
      } else {
        // Handle text files
        await fs.writeFile(outputPath, processedContent, 'utf-8');
      }

      // Set permissions if specified
      if (templateFile.permissions) {
        await fs.chmod(outputPath, parseInt(templateFile.permissions, 8));
      }

      filesCreated.push(templateFile.path);
    }

    return filesCreated;
  }

  private async executePostGenerationCommands(
    template: ModuleTemplate,
    context: GenerationContext
  ): Promise<string[]> {
    const commandsExecuted: string[] = [];

    if (!template.postGenerationCommands || template.postGenerationCommands.length === 0) {
      return commandsExecuted;
    }

    for (const command of template.postGenerationCommands) {
      try {
        // Process command with variables
        const processedCommand = TemplateProcessor.processContent(command, context.variables);

        // Execute command in output directory
        const { stderr } = await execAsync(processedCommand, {
          cwd: context.outputDirectory,
          timeout: 30000 // 30 second timeout
        });

        if (stderr) {
          this.emitEvent(createSystemEvent(
            'generation',
            'warning',
            `Command stderr: ${stderr}`,
            'TemplateService',
            { command: processedCommand, stderr }
          ));
        }

        commandsExecuted.push(processedCommand);

      } catch (error) {
        this.emitEvent(createSystemEvent(
          'generation',
          'warning',
          `Post-generation command failed: ${command} - ${error instanceof Error ? error.message : 'Unknown error'}`,
          'TemplateService',
          { command, error: error instanceof Error ? error.message : String(error) }
        ));

        // Don't fail entire generation for command failures
      }
    }

    return commandsExecuted;
  }

  private async initializeGitRepository(outputPath: string): Promise<void> {
    try {
      await execAsync('git init', {
        cwd: outputPath,
        timeout: 10000
      });

      // Create initial .gitignore if it doesn't exist
      const gitignorePath = path.join(outputPath, '.gitignore');
      try {
        await fs.access(gitignorePath);
      } catch {
        // .gitignore doesn't exist, create it
        const defaultGitignore = `node_modules/
dist/
build/
*.log
.DS_Store
.env.local
.env.*.local
coverage/
*.tgz
.vscode/
.idea/
`;
        await fs.writeFile(gitignorePath, defaultGitignore, 'utf-8');
      }

    } catch (error) {
      this.emitEvent(createSystemEvent(
        'generation',
        'warning',
        `Failed to initialize git repository: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TemplateService',
        { error: error instanceof Error ? error.message : String(error) }
      ));
    }
  }

  private async installDependencies(outputPath: string): Promise<void> {
    try {
      // Check if package.json exists
      const packageJsonPath = path.join(outputPath, 'package.json');
      await fs.access(packageJsonPath);

      // Install dependencies
      await execAsync('npm install', {
        cwd: outputPath,
        timeout: 120000 // 2 minute timeout
      });

    } catch (error) {
      this.emitEvent(createSystemEvent(
        'generation',
        'warning',
        `Failed to install dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TemplateService',
        { error: error instanceof Error ? error.message : String(error) }
      ));
    }
  }

  private emitEvent(event: SystemEvent): void {
    // In a real implementation, this would emit to an event bus
    console.log(`[${event.type}] ${event.message}`, event.data);
  }
}