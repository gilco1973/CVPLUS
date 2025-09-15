/**
 * ModuleTemplate - Core data model for CVPlus module templates
 *
 * This model defines the structure for module templates that can be used
 * to generate new compliant modules with proper configuration,
 * file structure, and customizable options.
 */

export type TemplateCategory =
  | 'backend-api'         // Backend API services
  | 'frontend-component'  // React/UI components
  | 'utility-lib'        // Utility libraries
  | 'shared-types'       // Type definitions
  | 'cli-tool'           // Command line tools
  | 'service'            // Background services
  | 'middleware'         // Middleware packages
  | 'config'             // Configuration packages
  | 'testing'            // Testing utilities
  | 'other';             // Other types

export interface TemplateFile {
  /** Relative path from template root */
  path: string;
  /** File content template with variable substitution */
  content: string;
  /** Whether this file is required or optional */
  required: boolean;
  /** Conditions for including this file */
  conditions?: TemplateCondition[];
  /** File permissions (for executable files) */
  permissions?: string;
  /** Whether content is binary (base64 encoded) */
  isBinary?: boolean;
}

export interface TemplateCondition {
  /** Option key to check */
  option: string;
  /** Condition operator */
  operator: 'equals' | 'not_equals' | 'includes' | 'excludes' | 'exists' | 'not_exists';
  /** Value to compare against */
  value?: any;
}

export interface TemplateVariable {
  /** Variable name (used in template as {{ name }}) */
  name: string;
  /** Human-readable label */
  label: string;
  /** Variable description */
  description: string;
  /** Variable type */
  type: 'string' | 'number' | 'boolean' | 'array' | 'select';
  /** Whether variable is required */
  required: boolean;
  /** Default value */
  defaultValue?: any;
  /** Possible values (for select type) */
  options?: Array<{ value: any; label: string }>;
  /** Validation pattern (for string type) */
  pattern?: string;
  /** Min/max values (for number type) */
  min?: number;
  max?: number;
}

export interface TemplateDependency {
  /** Package name */
  name: string;
  /** Version constraint */
  version: string;
  /** Dependency type */
  type: 'production' | 'development' | 'peer' | 'optional';
  /** Conditions for including this dependency */
  conditions?: TemplateCondition[];
  /** Description of why this dependency is needed */
  description?: string;
}

export interface TemplateScript {
  /** Script name */
  name: string;
  /** Script command */
  command: string;
  /** Script description */
  description: string;
  /** Whether script is required */
  required: boolean;
  /** Conditions for including this script */
  conditions?: TemplateCondition[];
}

export interface ModuleTemplate {
  /** Unique template identifier */
  templateId: string;

  /** Template display name */
  name: string;

  /** Template description */
  description: string;

  /** Template category */
  category: TemplateCategory;

  /** Template version */
  version: string;

  /** Template author */
  author: string;

  /** Keywords for searching */
  keywords: string[];

  /** Template files and directory structure */
  files: TemplateFile[];

  /** Template variables for customization */
  variables: TemplateVariable[];

  /** Dependencies to include */
  dependencies: TemplateDependency[];

  /** Package.json scripts to include */
  scripts: TemplateScript[];

  /** Post-generation commands to run */
  postGenerationCommands?: string[];

  /** Minimum Node.js version required */
  minNodeVersion?: string;

  /** Minimum npm version required */
  minNpmVersion?: string;

  /** Compatible module types this template supports */
  compatibleTypes: string[];

  /** Template metadata */
  metadata: {
    /** Template icon (for UI) */
    icon?: string;
    /** Template screenshots */
    screenshots?: string[];
    /** Documentation URL */
    documentationUrl?: string;
    /** GitHub repository */
    repositoryUrl?: string;
    /** License */
    license: string;
    /** Changelog */
    changelog?: Array<{
      version: string;
      date: Date;
      changes: string[];
    }>;
  };

  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;

  /** Whether template is active */
  active: boolean;
}

/**
 * Template customization and generation context
 */
export interface TemplateGenerationContext {
  /** Template being used */
  template: ModuleTemplate;

  /** Target generation path */
  outputPath: string;

  /** User-provided values for template variables */
  variables: Record<string, any>;

  /** Additional generation options */
  options: {
    /** Whether to overwrite existing files */
    overwriteExisting?: boolean;
    /** Whether to run post-generation commands */
    runPostCommands?: boolean;
    /** Whether to initialize git repository */
    initGit?: boolean;
    /** Whether to install dependencies */
    installDependencies?: boolean;
  };

  /** Generation timestamp */
  timestamp: Date;
}

export interface GenerationResult {
  /** Success status */
  success: boolean;

  /** Generated module path */
  modulePath: string;

  /** List of files that were created */
  filesCreated: string[];

  /** List of commands that were executed */
  commandsExecuted: string[];

  /** Any errors that occurred */
  errors: string[];

  /** Warnings generated */
  warnings: string[];

  /** Generation metrics */
  metrics: {
    /** Total time taken (ms) */
    totalTime: number;
    /** Number of files processed */
    filesProcessed: number;
    /** Number of variables substituted */
    variablesSubstituted: number;
  };

  /** Initial validation report if requested */
  validationReport?: any; // ValidationReport type will be imported
}

/**
 * Template validation and utility functions
 */
export class ModuleTemplateValidator {
  /**
   * Validate a ModuleTemplate object
   */
  static validate(template: Partial<ModuleTemplate>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!template.templateId) {
      errors.push('templateId is required');
    } else if (!/^[a-z0-9-]+$/.test(template.templateId)) {
      errors.push('templateId must contain only lowercase letters, numbers, and hyphens');
    }

    if (!template.name) {
      errors.push('name is required');
    }

    if (!template.description) {
      errors.push('description is required');
    } else if (template.description.length < 20) {
      warnings.push('description should be more descriptive (20+ characters)');
    }

    if (!template.category) {
      errors.push('category is required');
    }

    if (!template.version) {
      errors.push('version is required');
    } else if (!/^\d+\.\d+\.\d+/.test(template.version)) {
      warnings.push('version should follow semantic versioning');
    }

    if (!template.author) {
      errors.push('author is required');
    }

    // Files validation
    if (!template.files || template.files.length === 0) {
      errors.push('template must have at least one file');
    } else {
      const requiredFiles = ['package.json', 'README.md'];
      const templatePaths = template.files.map(f => f.path);

      for (const requiredFile of requiredFiles) {
        if (!templatePaths.includes(requiredFile)) {
          errors.push(`Required template file missing: ${requiredFile}`);
        }
      }

      // Validate each file
      template.files.forEach((file, index) => {
        const fileValidation = this.validateTemplateFile(file);
        fileValidation.errors.forEach(err =>
          errors.push(`File ${index} (${file.path}): ${err}`)
        );
      });
    }

    // Variables validation
    if (template.variables) {
      template.variables.forEach((variable, index) => {
        const variableValidation = this.validateTemplateVariable(variable);
        variableValidation.errors.forEach(err =>
          errors.push(`Variable ${index} (${variable.name}): ${err}`)
        );
      });
    }

    // Dependencies validation
    if (template.dependencies) {
      template.dependencies.forEach((dep, index) => {
        const depValidation = this.validateTemplateDependency(dep);
        depValidation.errors.forEach(err =>
          errors.push(`Dependency ${index} (${dep.name}): ${err}`)
        );
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a TemplateFile
   */
  static validateTemplateFile(file: Partial<TemplateFile>): ValidationResult {
    const errors: string[] = [];

    if (!file.path) {
      errors.push('file path is required');
    } else if (file.path.startsWith('/') || file.path.includes('..')) {
      errors.push('file path must be relative and not escape template directory');
    }

    if (!file.content && file.content !== '') {
      errors.push('file content is required');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Validate a TemplateVariable
   */
  static validateTemplateVariable(variable: Partial<TemplateVariable>): ValidationResult {
    const errors: string[] = [];

    if (!variable.name) {
      errors.push('variable name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(variable.name)) {
      errors.push('variable name must be valid identifier');
    }

    if (!variable.label) {
      errors.push('variable label is required');
    }

    if (!variable.type) {
      errors.push('variable type is required');
    }

    if (variable.type === 'select' && (!variable.options || variable.options.length === 0)) {
      errors.push('select type variables must have options');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Validate a TemplateDependency
   */
  static validateTemplateDependency(dependency: Partial<TemplateDependency>): ValidationResult {
    const errors: string[] = [];

    if (!dependency.name) {
      errors.push('dependency name is required');
    }

    if (!dependency.version) {
      errors.push('dependency version is required');
    }

    if (!dependency.type) {
      errors.push('dependency type is required');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }
}

/**
 * Template processing and generation utilities
 */
export class TemplateProcessor {
  /**
   * Process template content with variable substitution
   */
  static processContent(content: string, variables: Record<string, any>): string {
    let processed = content;

    // Replace template variables ({{ variableName }})
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processed = processed.replace(pattern, String(value));
    }

    // Handle conditional blocks ({{#if condition}} ... {{/if}})
    processed = this.processConditionals(processed, variables);

    // Handle loops ({{#each array}} ... {{/each}})
    processed = this.processLoops(processed, variables);

    return processed;
  }

  /**
   * Process conditional blocks in template
   */
  private static processConditionals(content: string, variables: Record<string, any>): string {
    const conditionalPattern = /\{\{\#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    return content.replace(conditionalPattern, (_match, condition, innerContent) => {
      const value = variables[condition];

      // Include content if condition is truthy
      if (value && value !== 'false' && value !== '0') {
        return innerContent;
      }

      return '';
    });
  }

  /**
   * Process loop blocks in template
   */
  private static processLoops(content: string, variables: Record<string, any>): string {
    const loopPattern = /\{\{\#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return content.replace(loopPattern, (_match, arrayName, innerContent) => {
      const array = variables[arrayName];

      if (!Array.isArray(array)) {
        return '';
      }

      return array.map((item, index) => {
        let itemContent = innerContent;

        // Replace {{this}} with current item
        itemContent = itemContent.replace(/\{\{\s*this\s*\}\}/g, String(item));

        // Replace {{@index}} with current index
        itemContent = itemContent.replace(/\{\{\s*@index\s*\}\}/g, String(index));

        // If item is object, replace {{property}} with item.property
        if (typeof item === 'object' && item !== null) {
          for (const [key, value] of Object.entries(item)) {
            const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
            itemContent = itemContent.replace(pattern, String(value));
          }
        }

        return itemContent;
      }).join('');
    });
  }

  /**
   * Evaluate template conditions
   */
  static evaluateCondition(condition: TemplateCondition, variables: Record<string, any>): boolean {
    const value = variables[condition.option];

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'includes':
        return Array.isArray(value) ? value.includes(condition.value) : String(value).includes(String(condition.value));
      case 'excludes':
        return Array.isArray(value) ? !value.includes(condition.value) : !String(value).includes(String(condition.value));
      case 'exists':
        return value !== undefined && value !== null;
      case 'not_exists':
        return value === undefined || value === null;
      default:
        return false;
    }
  }

  /**
   * Get required variables for a template
   */
  static getRequiredVariables(template: ModuleTemplate): TemplateVariable[] {
    return template.variables.filter(v => v.required);
  }

  /**
   * Validate variable values against template requirements
   */
  static validateVariableValues(template: ModuleTemplate, values: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const variable of template.variables) {
      const value = values[variable.name];

      // Check required variables
      if (variable.required && (value === undefined || value === null || value === '')) {
        errors.push(`Required variable '${variable.name}' is missing`);
        continue;
      }

      // Skip validation if value is not provided and not required
      if (value === undefined || value === null) continue;

      // Type validation
      switch (variable.type) {
        case 'number':
          if (typeof value !== 'number' && isNaN(Number(value))) {
            errors.push(`Variable '${variable.name}' must be a number`);
          } else {
            const numValue = Number(value);
            if (variable.min !== undefined && numValue < variable.min) {
              errors.push(`Variable '${variable.name}' must be >= ${variable.min}`);
            }
            if (variable.max !== undefined && numValue > variable.max) {
              errors.push(`Variable '${variable.name}' must be <= ${variable.max}`);
            }
          }
          break;

        case 'boolean':
          if (typeof value !== 'boolean' && !['true', 'false'].includes(String(value).toLowerCase())) {
            errors.push(`Variable '${variable.name}' must be a boolean`);
          }
          break;

        case 'array':
          if (!Array.isArray(value)) {
            errors.push(`Variable '${variable.name}' must be an array`);
          }
          break;

        case 'select':
          const validOptions = variable.options?.map(opt => opt.value) || [];
          if (!validOptions.includes(value)) {
            errors.push(`Variable '${variable.name}' must be one of: ${validOptions.join(', ')}`);
          }
          break;

        case 'string':
          if (typeof value !== 'string') {
            warnings.push(`Variable '${variable.name}' will be converted to string`);
          }
          if (variable.pattern) {
            const regex = new RegExp(variable.pattern);
            if (!regex.test(String(value))) {
              errors.push(`Variable '${variable.name}' does not match required pattern: ${variable.pattern}`);
            }
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Built-in templates for CVPlus modules
 */
export class BuiltInTemplates {
  /**
   * Get all built-in templates
   */
  static getAllTemplates(): ModuleTemplate[] {
    return [
      this.getBackendApiTemplate(),
      this.getFrontendComponentTemplate(),
      this.getUtilityLibTemplate(),
      this.getSharedTypesTemplate(),
      this.getCliToolTemplate()
    ];
  }

  private static getBackendApiTemplate(): ModuleTemplate {
    return {
      templateId: 'backend-api',
      name: 'Backend API Service',
      description: 'A TypeScript backend API service with Express, proper error handling, and testing setup',
      category: 'backend-api',
      version: '1.0.0',
      author: 'CVPlus Team',
      keywords: ['backend', 'api', 'typescript', 'express'],
      files: [
        {
          path: 'package.json',
          content: JSON.stringify({
            name: '{{ moduleId }}',
            version: '{{ version }}',
            description: '{{ description }}',
            main: 'dist/index.js',
            types: 'dist/index.d.ts',
            scripts: {
              build: 'tsc',
              dev: 'ts-node src/index.ts',
              test: 'jest',
              lint: 'eslint src/**/*.ts',
              start: 'node dist/index.js'
            },
            dependencies: {
              express: '^4.18.0',
              cors: '^2.8.5',
              helmet: '^7.0.0'
            },
            devDependencies: {
              '@types/express': '^4.17.0',
              '@types/cors': '^2.8.0',
              typescript: '^5.0.0',
              'ts-node': '^10.9.0',
              jest: '^29.0.0',
              '@types/jest': '^29.0.0',
              'ts-jest': '^29.0.0',
              eslint: '^8.0.0',
              '@typescript-eslint/parser': '^6.0.0',
              '@typescript-eslint/eslint-plugin': '^6.0.0'
            },
            keywords: ['{{ keywords }}'],
            author: '{{ author }}',
            license: 'MIT'
          }, null, 2),
          required: true
        },
        {
          path: 'src/index.ts',
          content: `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/{{ moduleId }}', (req, res) => {
  res.json({ message: 'Hello from {{ name }}!' });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(\`{{ name }} server running on port \${PORT}\`);
});
`,
          required: true
        },
        {
          path: 'README.md',
          content: `# {{ name }}

{{ description }}

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Testing

\`\`\`bash
npm test
\`\`\`

## API Endpoints

- \`GET /health\` - Health check
- \`GET /api/{{ moduleId }}\` - Main API endpoint

## Environment Variables

- \`PORT\` - Server port (default: 3000)
`,
          required: true
        }
      ],
      variables: [
        {
          name: 'moduleId',
          label: 'Module ID',
          description: 'Unique identifier for the module',
          type: 'string',
          required: true,
          pattern: '^[a-z0-9-]+$'
        },
        {
          name: 'name',
          label: 'Module Name',
          description: 'Display name for the module',
          type: 'string',
          required: true
        },
        {
          name: 'description',
          label: 'Description',
          description: 'Brief description of the module',
          type: 'string',
          required: true
        },
        {
          name: 'version',
          label: 'Version',
          description: 'Initial version',
          type: 'string',
          required: false,
          defaultValue: '1.0.0'
        },
        {
          name: 'author',
          label: 'Author',
          description: 'Module author',
          type: 'string',
          required: false,
          defaultValue: 'CVPlus Team'
        }
      ],
      dependencies: [],
      scripts: [],
      compatibleTypes: ['backend-api', 'service'],
      metadata: {
        license: 'MIT'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true
    };
  }

  private static getFrontendComponentTemplate(): ModuleTemplate {
    return {
      templateId: 'frontend-component',
      name: 'Frontend Component Library',
      description: 'A React component library with TypeScript, Tailwind CSS, and Storybook',
      category: 'frontend-component',
      version: '1.0.0',
      author: 'CVPlus Team',
      keywords: ['react', 'components', 'typescript', 'tailwind'],
      files: [
        {
          path: 'package.json',
          content: JSON.stringify({
            name: '{{ moduleId }}',
            version: '{{ version }}',
            description: '{{ description }}',
            main: 'dist/index.js',
            module: 'dist/index.esm.js',
            types: 'dist/index.d.ts',
            scripts: {
              build: 'rollup -c',
              dev: 'rollup -c -w',
              test: 'vitest',
              lint: 'eslint src/**/*.{ts,tsx}',
              storybook: 'start-storybook -p 6006',
              'build-storybook': 'build-storybook'
            },
            peerDependencies: {
              react: '>=18.0.0',
              'react-dom': '>=18.0.0'
            },
            devDependencies: {
              '@types/react': '^18.0.0',
              '@types/react-dom': '^18.0.0',
              typescript: '^5.0.0',
              rollup: '^3.0.0',
              vitest: '^1.0.0',
              '@vitejs/plugin-react': '^4.0.0',
              tailwindcss: '^3.3.0'
            }
          }, null, 2),
          required: true
        },
        {
          path: 'src/index.tsx',
          content: `export { Button } from './components/Button';
export type { ButtonProps } from './components/Button';
`,
          required: true
        },
        {
          path: 'src/components/Button.tsx',
          content: `import React from 'react';

export interface ButtonProps {
  /** Button text */
  children: React.ReactNode;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Disabled state */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className = ''
}) => {
  const baseClasses = 'font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  const buttonClasses = \`\${baseClasses} \${variantClasses[variant]} \${sizeClasses[size]} \${disabledClasses} \${className}\`.trim();

  return (
    <button
      className={buttonClasses}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
`,
          required: true
        }
      ],
      variables: [
        {
          name: 'moduleId',
          label: 'Module ID',
          description: 'Unique identifier for the component library',
          type: 'string',
          required: true,
          pattern: '^[a-z0-9-]+$'
        },
        {
          name: 'name',
          label: 'Library Name',
          description: 'Display name for the component library',
          type: 'string',
          required: true
        },
        {
          name: 'description',
          label: 'Description',
          description: 'Brief description of the component library',
          type: 'string',
          required: true
        },
        {
          name: 'version',
          label: 'Version',
          description: 'Initial version',
          type: 'string',
          required: false,
          defaultValue: '1.0.0'
        }
      ],
      dependencies: [],
      scripts: [],
      compatibleTypes: ['frontend-component', 'utility-lib'],
      metadata: {
        license: 'MIT'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true
    };
  }

  private static getUtilityLibTemplate(): ModuleTemplate {
    return {
      templateId: 'utility-lib',
      name: 'Utility Library',
      description: 'A TypeScript utility library with comprehensive testing and documentation',
      category: 'utility-lib',
      version: '1.0.0',
      author: 'CVPlus Team',
      keywords: ['utilities', 'typescript', 'library'],
      files: [
        {
          path: 'package.json',
          content: JSON.stringify({
            name: '{{ moduleId }}',
            version: '{{ version }}',
            description: '{{ description }}',
            main: 'dist/index.js',
            types: 'dist/index.d.ts',
            scripts: {
              build: 'tsc',
              test: 'jest',
              lint: 'eslint src/**/*.ts',
              'test:watch': 'jest --watch',
              'test:coverage': 'jest --coverage'
            },
            devDependencies: {
              typescript: '^5.0.0',
              jest: '^29.0.0',
              '@types/jest': '^29.0.0',
              'ts-jest': '^29.0.0',
              eslint: '^8.0.0'
            }
          }, null, 2),
          required: true
        },
        {
          path: 'src/index.ts',
          content: `export * from './lib/string-utils';
export * from './lib/array-utils';
export * from './lib/object-utils';
`,
          required: true
        },
        {
          path: 'src/lib/string-utils.ts',
          content: `/**
 * String utility functions
 */

/**
 * Capitalize the first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to kebab-case
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Truncate string to specified length with ellipsis
 */
export function truncate(str: string, length: number, suffix = '...'): string {
  if (str.length <= length) return str;
  return str.substring(0, length - suffix.length) + suffix;
}
`,
          required: true
        }
      ],
      variables: [
        {
          name: 'moduleId',
          label: 'Module ID',
          description: 'Unique identifier for the utility library',
          type: 'string',
          required: true,
          pattern: '^[a-z0-9-]+$'
        },
        {
          name: 'name',
          label: 'Library Name',
          description: 'Display name for the utility library',
          type: 'string',
          required: true
        },
        {
          name: 'description',
          label: 'Description',
          description: 'Brief description of the utility library',
          type: 'string',
          required: true
        }
      ],
      dependencies: [],
      scripts: [],
      compatibleTypes: ['utility-lib', 'shared-types'],
      metadata: {
        license: 'MIT'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true
    };
  }

  private static getSharedTypesTemplate(): ModuleTemplate {
    return {
      templateId: 'shared-types',
      name: 'Shared TypeScript Types',
      description: 'A package for shared TypeScript type definitions',
      category: 'shared-types',
      version: '1.0.0',
      author: 'CVPlus Team',
      keywords: ['types', 'typescript', 'definitions'],
      files: [
        {
          path: 'package.json',
          content: JSON.stringify({
            name: '{{ moduleId }}',
            version: '{{ version }}',
            description: '{{ description }}',
            types: 'dist/index.d.ts',
            scripts: {
              build: 'tsc',
              lint: 'eslint src/**/*.ts'
            },
            devDependencies: {
              typescript: '^5.0.0',
              eslint: '^8.0.0'
            }
          }, null, 2),
          required: true
        },
        {
          path: 'src/index.ts',
          content: `// Core types
export * from './types/common';
export * from './types/api';
export * from './types/user';
`,
          required: true
        },
        {
          path: 'src/types/common.ts',
          content: `/**
 * Common utility types
 */

export type Status = 'pending' | 'success' | 'error' | 'cancelled';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
`,
          required: true
        }
      ],
      variables: [
        {
          name: 'moduleId',
          label: 'Module ID',
          description: 'Unique identifier for the types package',
          type: 'string',
          required: true,
          pattern: '^[a-z0-9-]+$'
        },
        {
          name: 'name',
          label: 'Package Name',
          description: 'Display name for the types package',
          type: 'string',
          required: true
        },
        {
          name: 'description',
          label: 'Description',
          description: 'Brief description of the types package',
          type: 'string',
          required: true
        }
      ],
      dependencies: [],
      scripts: [],
      compatibleTypes: ['shared-types', 'utility-lib'],
      metadata: {
        license: 'MIT'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true
    };
  }

  private static getCliToolTemplate(): ModuleTemplate {
    return {
      templateId: 'cli-tool',
      name: 'CLI Tool',
      description: 'A command line interface tool with TypeScript and Commander.js',
      category: 'cli-tool',
      version: '1.0.0',
      author: 'CVPlus Team',
      keywords: ['cli', 'command-line', 'typescript'],
      files: [
        {
          path: 'package.json',
          content: JSON.stringify({
            name: '{{ moduleId }}',
            version: '{{ version }}',
            description: '{{ description }}',
            main: 'dist/index.js',
            bin: {
              '{{ moduleId }}': 'dist/cli.js'
            },
            scripts: {
              build: 'tsc && chmod +x dist/cli.js',
              dev: 'ts-node src/cli.ts',
              test: 'jest',
              lint: 'eslint src/**/*.ts'
            },
            dependencies: {
              commander: '^11.0.0',
              chalk: '^5.0.0'
            },
            devDependencies: {
              typescript: '^5.0.0',
              '@types/node': '^20.0.0',
              'ts-node': '^10.9.0',
              jest: '^29.0.0',
              '@types/jest': '^29.0.0',
              'ts-jest': '^29.0.0',
              eslint: '^8.0.0'
            }
          }, null, 2),
          required: true
        },
        {
          path: 'src/cli.ts',
          content: `#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();

program
  .name('{{ moduleId }}')
  .description('{{ description }}')
  .version('{{ version }}');

program
  .command('hello')
  .description('Say hello')
  .option('-n, --name <name>', 'Name to greet', 'World')
  .action((options) => {
    console.log(chalk.green(\`Hello, \${options.name}!\`));
  });

program
  .command('info')
  .description('Show tool information')
  .action(() => {
    console.log(chalk.blue('{{ name }}'));
    console.log(chalk.gray('Version: {{ version }}'));
    console.log(chalk.gray('{{ description }}'));
  });

program.parse();
`,
          required: true
        }
      ],
      variables: [
        {
          name: 'moduleId',
          label: 'Module ID',
          description: 'Unique identifier for the CLI tool',
          type: 'string',
          required: true,
          pattern: '^[a-z0-9-]+$'
        },
        {
          name: 'name',
          label: 'Tool Name',
          description: 'Display name for the CLI tool',
          type: 'string',
          required: true
        },
        {
          name: 'description',
          label: 'Description',
          description: 'Brief description of the CLI tool',
          type: 'string',
          required: true
        }
      ],
      dependencies: [],
      scripts: [],
      compatibleTypes: ['cli-tool'],
      metadata: {
        license: 'MIT'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true
    };
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}