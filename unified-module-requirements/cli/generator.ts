#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { ModuleType } from '../src/models/enums';

const program = new Command();

interface TemplateConfig {
  templateId: string;
  name: string;
  description: string;
  moduleType: ModuleType;
  configurableOptions: Array<{
    name: string;
    type: string;
    default: any;
    description: string;
    choices?: string[];
  }>;
  files: Record<string, string>;
}

const templates: Record<string, TemplateConfig> = {
  'backend-api': {
    templateId: 'backend-api',
    name: 'Backend API Template',
    description: 'Complete backend API template with Express, TypeScript, and testing setup',
    moduleType: ModuleType.BACKEND,
    configurableOptions: [
      { name: 'database', type: 'list', default: 'postgresql', description: 'Database type', choices: ['postgresql', 'mysql', 'mongodb', 'sqlite'] },
      { name: 'auth', type: 'list', default: 'jwt', description: 'Authentication method', choices: ['jwt', 'oauth', 'session', 'none'] },
      { name: 'testing', type: 'list', default: 'jest', description: 'Testing framework', choices: ['jest', 'vitest', 'mocha'] }
    ],
    files: {
      'package.json': generateBackendPackageJson,
      'tsconfig.json': generateTsConfig,
      'src/index.ts': generateBackendIndex,
      'src/app.ts': generateBackendApp,
      'src/routes/index.ts': generateBackendRoutes,
      'src/middleware/auth.ts': generateAuthMiddleware,
      'tests/unit/app.test.ts': generateBackendTests,
      'README.md': generateBackendReadme,
      '.gitignore': generateGitignore,
      '.eslintrc.js': generateEslintConfig,
      'jest.config.js': generateJestConfig
    }
  },
  'frontend-component': {
    templateId: 'frontend-component',
    name: 'Frontend Component Template',
    description: 'React component template with TypeScript and testing',
    moduleType: ModuleType.FRONTEND,
    configurableOptions: [
      { name: 'framework', type: 'list', default: 'react', description: 'Frontend framework', choices: ['react', 'vue', 'angular', 'svelte'] },
      { name: 'styling', type: 'list', default: 'tailwind', description: 'Styling solution', choices: ['tailwind', 'styled-components', 'css-modules', 'sass'] }
    ],
    files: {
      'package.json': generateFrontendPackageJson,
      'tsconfig.json': generateTsConfig,
      'src/index.ts': generateFrontendIndex,
      'src/components/Example.tsx': generateExampleComponent,
      'src/hooks/useExample.ts': generateExampleHook,
      'tests/unit/Example.test.tsx': generateFrontendTests,
      'README.md': generateFrontendReadme,
      '.gitignore': generateGitignore,
      'vite.config.ts': generateViteConfig
    }
  },
  'utility-lib': {
    templateId: 'utility-lib',
    name: 'Utility Library Template',
    description: 'Utility library template with TypeScript and comprehensive testing',
    moduleType: ModuleType.UTILITY,
    configurableOptions: [
      { name: 'exports', type: 'list', default: 'named', description: 'Export style', choices: ['named', 'default', 'mixed'] }
    ],
    files: {
      'package.json': generateUtilityPackageJson,
      'tsconfig.json': generateTsConfig,
      'src/index.ts': generateUtilityIndex,
      'src/utils/validation.ts': generateValidationUtils,
      'src/utils/formatting.ts': generateFormattingUtils,
      'tests/unit/validation.test.ts': generateUtilityTests,
      'README.md': generateUtilityReadme,
      '.gitignore': generateGitignore
    }
  },
  'api-integration': {
    templateId: 'api-integration',
    name: 'API Integration Template',
    description: 'API integration template with client generation and testing',
    moduleType: ModuleType.API,
    configurableOptions: [
      { name: 'client', type: 'list', default: 'axios', description: 'HTTP client', choices: ['axios', 'fetch', 'node-fetch'] }
    ],
    files: {
      'package.json': generateApiPackageJson,
      'tsconfig.json': generateTsConfig,
      'src/index.ts': generateApiIndex,
      'src/client/api.ts': generateApiClient,
      'src/types/responses.ts': generateApiTypes,
      'tests/unit/api.test.ts': generateApiTests,
      'README.md': generateApiReadme,
      '.gitignore': generateGitignore
    }
  },
  'core-types': {
    templateId: 'core-types',
    name: 'Core Types Template',
    description: 'Core types and constants template',
    moduleType: ModuleType.CORE,
    configurableOptions: [
      { name: 'validation', type: 'confirm', default: true, description: 'Include validation schemas' }
    ],
    files: {
      'package.json': generateCorePackageJson,
      'tsconfig.json': generateTsConfig,
      'src/index.ts': generateCoreIndex,
      'src/types/common.ts': generateCommonTypes,
      'src/constants/index.ts': generateConstants,
      'src/schemas/validation.ts': generateValidationSchemas,
      'tests/unit/types.test.ts': generateCoreTests,
      'README.md': generateCoreReadme,
      '.gitignore': generateGitignore
    }
  }
};

program
  .name('cvplus-generator')
  .description('CVPlus Module Generation CLI')
  .version('1.0.0');

program
  .command('list')
  .description('List available templates')
  .option('-t, --type <type>', 'Filter by module type')
  .action(async (options) => {
    try {
      console.log(chalk.blue('=Ë Available Templates:'));
      console.log(chalk.gray('P'.repeat(50)));

      let filteredTemplates = Object.values(templates);
      if (options.type && Object.values(ModuleType).includes(options.type as ModuleType)) {
        filteredTemplates = filteredTemplates.filter(t => t.moduleType === options.type);
      }

      if (filteredTemplates.length === 0) {
        console.log(chalk.yellow('No templates found matching criteria'));
        return;
      }

      for (const template of filteredTemplates) {
        console.log(`\n${chalk.bold.green(template.templateId)}`);
        console.log(`  ${chalk.bold('Name:')} ${template.name}`);
        console.log(`  ${chalk.bold('Type:')} ${template.moduleType}`);
        console.log(`  ${chalk.bold('Description:')} ${template.description}`);

        if (template.configurableOptions.length > 0) {
          console.log(`  ${chalk.bold('Options:')} ${template.configurableOptions.map(o => o.name).join(', ')}`);
        }
      }
    } catch (error) {
      console.error(chalk.red('L Failed to list templates:'), error);
      process.exit(1);
    }
  });

program
  .command('generate')
  .description('Generate a new module from template')
  .requiredOption('-t, --template <template>', 'Template ID to use')
  .requiredOption('-n, --name <name>', 'Module name')
  .requiredOption('-o, --output <path>', 'Output directory path')
  .option('-i, --interactive', 'Interactive configuration')
  .option('-c, --config <config>', 'Configuration file path')
  .action(async (options) => {
    try {
      const spinner = ora('Generating module...').start();

      const template = templates[options.template];
      if (!template) {
        spinner.fail(`Template "${options.template}" not found`);
        console.log(chalk.yellow('Available templates:'), Object.keys(templates).join(', '));
        process.exit(1);
      }

      const modulePath = path.resolve(options.output, options.name);

      if (await fs.pathExists(modulePath)) {
        spinner.fail(`Directory "${modulePath}" already exists`);
        process.exit(1);
      }

      let config: Record<string, any> = {};

      // Load config from file if provided
      if (options.config) {
        const configPath = path.resolve(options.config);
        if (await fs.pathExists(configPath)) {
          config = await fs.readJSON(configPath);
        } else {
          spinner.fail(`Configuration file not found: ${configPath}`);
          process.exit(1);
        }
      }

      // Interactive configuration
      if (options.interactive) {
        spinner.stop();

        console.log(chalk.blue(`=' Configuring ${template.name}`));
        console.log(chalk.gray(template.description));
        console.log();

        const questions = template.configurableOptions.map(option => ({
          type: option.type,
          name: option.name,
          message: option.description,
          default: option.default,
          choices: option.choices
        }));

        const answers = await inquirer.prompt(questions);
        config = { ...config, ...answers };

        spinner.start('Generating module...');
      } else {
        // Use defaults for non-interactive mode
        for (const option of template.configurableOptions) {
          if (!(option.name in config)) {
            config[option.name] = option.default;
          }
        }
      }

      // Create module directory
      await fs.ensureDir(modulePath);

      const context = {
        moduleName: options.name,
        moduleType: template.moduleType,
        config,
        timestamp: new Date().toISOString()
      };

      // Generate files
      const filesCreated: string[] = [];
      for (const [filePath, generator] of Object.entries(template.files)) {
        const fullPath = path.join(modulePath, filePath);
        await fs.ensureDir(path.dirname(fullPath));

        const content = typeof generator === 'function' ? generator(context) : generator;
        await fs.writeFile(fullPath, content);
        filesCreated.push(filePath);
      }

      // Install dependencies if package.json was created
      if (filesCreated.includes('package.json')) {
        spinner.text = 'Installing dependencies...';
        const { spawn } = require('child_process');

        await new Promise<void>((resolve, reject) => {
          const npm = spawn('npm', ['install'], {
            cwd: modulePath,
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

      spinner.succeed('Module generated successfully!');

      console.log(chalk.green(`\n Module "${options.name}" created at: ${modulePath}`));
      console.log(chalk.bold('\n=Á Files created:'));
      for (const file of filesCreated) {
        console.log(`  ${chalk.gray('"')} ${file}`);
      }

      console.log(chalk.bold('\n=€ Next steps:'));
      console.log(`  ${chalk.gray('1.')} cd ${path.relative(process.cwd(), modulePath)}`);
      console.log(`  ${chalk.gray('2.')} npm run build`);
      console.log(`  ${chalk.gray('3.')} npm test`);

    } catch (error) {
      console.error(chalk.red('L Module generation failed:'), error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize new template')
  .requiredOption('-n, --name <name>', 'Template name')
  .requiredOption('-t, --type <type>', 'Module type')
  .option('-o, --output <path>', 'Output directory for template', './templates')
  .action(async (options) => {
    try {
      if (!Object.values(ModuleType).includes(options.type as ModuleType)) {
        console.error(chalk.red(`Invalid module type: ${options.type}`));
        console.log(chalk.yellow('Valid types:'), Object.values(ModuleType).join(', '));
        process.exit(1);
      }

      const spinner = ora('Initializing template...').start();

      const templatePath = path.resolve(options.output, options.name);
      await fs.ensureDir(templatePath);

      const templateConfig = {
        templateId: options.name,
        name: `${options.name} Template`,
        description: `Custom template for ${options.type} modules`,
        moduleType: options.type,
        version: '1.0.0',
        configurableOptions: [],
        files: {
          'package.json': '{{ packageJson }}',
          'README.md': '{{ readme }}',
          'src/index.ts': '{{ mainFile }}'
        }
      };

      await fs.writeJSON(path.join(templatePath, 'template.json'), templateConfig, { spaces: 2 });
      await fs.ensureDir(path.join(templatePath, 'files'));

      spinner.succeed('Template initialized successfully!');

      console.log(chalk.green(`\n Template "${options.name}" created at: ${templatePath}`));
      console.log(chalk.bold('\n=Ý Next steps:'));
      console.log(`  ${chalk.gray('1.')} Edit ${path.join(templatePath, 'template.json')}`);
      console.log(`  ${chalk.gray('2.')} Add template files to ${path.join(templatePath, 'files/')}`);
      console.log(`  ${chalk.gray('3.')} Use variables like {{moduleName}} in your templates`);

    } catch (error) {
      console.error(chalk.red('L Template initialization failed:'), error);
      process.exit(1);
    }
  });

// Template generators
function generateBackendPackageJson(context: any): string {
  return JSON.stringify({
    name: context.moduleName,
    version: '1.0.0',
    description: `Backend API module - ${context.moduleName}`,
    main: 'dist/index.js',
    type: 'commonjs',
    scripts: {
      build: 'tsc',
      dev: 'ts-node src/index.ts',
      test: context.config.testing === 'jest' ? 'jest' : 'vitest',
      lint: 'eslint src/**/*.ts',
      start: 'node dist/index.js'
    },
    dependencies: {
      express: '^4.18.2',
      cors: '^2.8.5',
      helmet: '^7.0.0',
      ...(context.config.database === 'postgresql' ? { pg: '^8.11.0' } : {}),
      ...(context.config.database === 'mysql' ? { mysql2: '^3.6.0' } : {}),
      ...(context.config.database === 'mongodb' ? { mongodb: '^6.0.0' } : {}),
      ...(context.config.auth === 'jwt' ? { jsonwebtoken: '^9.0.0' } : {})
    },
    devDependencies: {
      '@types/node': '^20.5.0',
      '@types/express': '^4.17.17',
      typescript: '^5.2.2',
      'ts-node': '^10.9.1',
      ...(context.config.testing === 'jest' ? { jest: '^29.6.2', '@types/jest': '^29.5.3' } : {})
    }
  }, null, 2);
}

function generateFrontendPackageJson(context: any): string {
  return JSON.stringify({
    name: context.moduleName,
    version: '1.0.0',
    description: `Frontend component module - ${context.moduleName}`,
    main: 'dist/index.js',
    type: 'module',
    scripts: {
      build: 'vite build',
      dev: 'vite',
      test: 'vitest',
      lint: 'eslint src/**/*.{ts,tsx}',
      preview: 'vite preview'
    },
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      ...(context.config.styling === 'tailwind' ? { tailwindcss: '^3.3.0' } : {}),
      ...(context.config.styling === 'styled-components' ? { 'styled-components': '^6.0.0' } : {})
    },
    devDependencies: {
      '@types/react': '^18.2.0',
      '@types/react-dom': '^18.2.0',
      typescript: '^5.2.2',
      vite: '^4.4.0',
      '@vitejs/plugin-react': '^4.0.0',
      vitest: '^0.34.0'
    }
  }, null, 2);
}

function generateUtilityPackageJson(context: any): string {
  return JSON.stringify({
    name: context.moduleName,
    version: '1.0.0',
    description: `Utility library - ${context.moduleName}`,
    main: 'dist/index.js',
    type: 'commonjs',
    scripts: {
      build: 'tsc',
      test: 'jest',
      lint: 'eslint src/**/*.ts'
    },
    dependencies: {},
    devDependencies: {
      '@types/node': '^20.5.0',
      typescript: '^5.2.2',
      jest: '^29.6.2',
      '@types/jest': '^29.5.3'
    }
  }, null, 2);
}

function generateApiPackageJson(context: any): string {
  return JSON.stringify({
    name: context.moduleName,
    version: '1.0.0',
    description: `API integration module - ${context.moduleName}`,
    main: 'dist/index.js',
    type: 'commonjs',
    scripts: {
      build: 'tsc',
      test: 'jest',
      lint: 'eslint src/**/*.ts'
    },
    dependencies: {
      ...(context.config.client === 'axios' ? { axios: '^1.5.0' } : {}),
      ...(context.config.client === 'node-fetch' ? { 'node-fetch': '^3.3.0' } : {})
    },
    devDependencies: {
      '@types/node': '^20.5.0',
      typescript: '^5.2.2',
      jest: '^29.6.2',
      '@types/jest': '^29.5.3'
    }
  }, null, 2);
}

function generateCorePackageJson(context: any): string {
  return JSON.stringify({
    name: context.moduleName,
    version: '1.0.0',
    description: `Core types and constants - ${context.moduleName}`,
    main: 'dist/index.js',
    type: 'commonjs',
    scripts: {
      build: 'tsc',
      test: 'jest',
      lint: 'eslint src/**/*.ts'
    },
    dependencies: {
      ...(context.config.validation ? { ajv: '^8.12.0', 'ajv-formats': '^2.1.1' } : {})
    },
    devDependencies: {
      '@types/node': '^20.5.0',
      typescript: '^5.2.2',
      jest: '^29.6.2',
      '@types/jest': '^29.5.3'
    }
  }, null, 2);
}

function generateTsConfig(_context: any): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      module: 'commonjs',
      lib: ['ES2020'],
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist', 'tests']
  }, null, 2);
}

function generateBackendIndex(context: any): string {
  return `import { createApp } from './app';

const PORT = process.env['PORT'] || 3000;

async function startServer(): Promise<void> {
  try {
    const app = await createApp();

    app.listen(PORT, () => {
      console.log(\`${context.moduleName} server running on port \${PORT}\`);
      console.log(\`Health check: http://localhost:\${PORT}/health\`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  void startServer();
}

export { createApp };
`;
}

function generateBackendApp(context: any): string {
  return `import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

export async function createApp(): Promise<Express> {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: '${context.moduleName}',
      timestamp: new Date().toISOString()
    });
  });

  // API routes
  app.use('/api', (await import('./routes/index')).router);

  return app;
}
`;
}

function generateBackendRoutes(context: any): string {
  return `import express from 'express';

export const router = express.Router();

router.get('/', (_req, res) => {
  res.json({
    service: '${context.moduleName}',
    version: '1.0.0',
    endpoints: [
      'GET /health',
      'GET /api'
    ]
  });
});

router.get('/status', (_req, res) => {
  res.json({
    status: 'operational',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
`;
}

function generateAuthMiddleware(context: any): string {
  if (context.config.auth === 'jwt') {
    return `import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Access denied. No token provided.' });
    return;
  }

  try {
    const secret = process.env['JWT_SECRET'] || 'your-secret-key';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
}
`;
  }

  return `import { Request, Response, NextFunction } from 'express';

export function authenticate(_req: Request, _res: Response, next: NextFunction): void {
  // No authentication configured
  next();
}
`;
}

function generateBackendTests(context: any): string {
  return `import request from 'supertest';
import { createApp } from '../src/app';

describe('${context.moduleName} API', () => {
  let app: any;

  beforeEach(async () => {
    app = await createApp();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        service: '${context.moduleName}'
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body).toMatchObject({
        service: '${context.moduleName}',
        version: '1.0.0'
      });
      expect(response.body.endpoints).toBeDefined();
    });
  });
});
`;
}

function generateBackendReadme(context: any): string {
  return `# ${context.moduleName}

${context.moduleType} module generated from backend-api template.

## Features

- Express.js server with TypeScript
- Security middleware (Helmet, CORS)
- Health check endpoint
- ${context.config.auth !== 'none' ? `Authentication: ${context.config.auth}` : 'No authentication'}
- ${context.config.database !== 'none' ? `Database: ${context.config.database}` : 'No database'}
- Testing with ${context.config.testing}

## Getting Started

\`\`\`bash
npm install
npm run build
npm run dev
\`\`\`

## API Endpoints

- \`GET /health\` - Health check
- \`GET /api\` - API information
- \`GET /api/status\` - Service status

## Environment Variables

\`\`\`env
PORT=3000
${context.config.auth === 'jwt' ? 'JWT_SECRET=your-secret-key' : ''}
\`\`\`

## Testing

\`\`\`bash
npm test
\`\`\`

Generated on: ${context.timestamp}
`;
}

function generateFrontendIndex(context: any): string {
  return `export { default as Example } from './components/Example';
export { useExample } from './hooks/useExample';

// ${context.moduleName} - Frontend Module
// Generated on: ${context.timestamp}
`;
}

function generateExampleComponent(context: any): string {
  return `import React from 'react';
import { useExample } from '../hooks/useExample';

interface ExampleProps {
  title?: string;
  className?: string;
}

const Example: React.FC<ExampleProps> = ({
  title = '${context.moduleName}',
  className = ''
}) => {
  const { data, loading, error } = useExample();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className={\`example-component \${className}\`}>
      <h2>{title}</h2>
      <div>
        <p>Data: {JSON.stringify(data)}</p>
      </div>
    </div>
  );
};

export default Example;
`;
}

function generateExampleHook(context: any): string {
  return `import { useState, useEffect } from 'react';

interface ExampleData {
  id: string;
  name: string;
  timestamp: string;
}

interface UseExampleReturn {
  data: ExampleData | null;
  loading: boolean;
  error: string | null;
}

export function useExample(): UseExampleReturn {
  const [data, setData] = useState<ExampleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        setData({
          id: '1',
          name: '${context.moduleName}',
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  return { data, loading, error };
}
`;
}

function generateFrontendTests(context: any): string {
  return `import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Example from '../src/components/Example';

describe('Example Component', () => {
  it('renders with default title', () => {
    render(<Example />);
    expect(screen.getByText('${context.moduleName}')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    const customTitle = 'Custom Title';
    render(<Example title={customTitle} />);
    expect(screen.getByText(customTitle)).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<Example />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
`;
}

function generateFrontendReadme(context: any): string {
  return `# ${context.moduleName}

${context.moduleType} module generated from frontend-component template.

## Features

- React components with TypeScript
- ${context.config.framework} framework
- ${context.config.styling} for styling
- Vitest for testing
- Vite for building

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Components

- \`Example\` - Main component with example functionality

## Hooks

- \`useExample\` - Custom hook for data fetching

## Testing

\`\`\`bash
npm test
\`\`\`

Generated on: ${context.timestamp}
`;
}

function generateUtilityIndex(context: any): string {
  return `export * from './utils/validation';
export * from './utils/formatting';

// ${context.moduleName} - Utility Library
// Generated on: ${context.timestamp}
`;
}

function generateValidationUtils(_context: any): string {
  return `export function isEmail(email: string): boolean {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
}

export function isUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

export function isRequired(value: unknown): boolean {
  return !isEmpty(value);
}
`;
}

function generateFormattingUtils(_context: any): string {
  return `export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

export function formatDate(date: Date | string, format = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: format as 'short' | 'medium' | 'long' | 'full'
  }).format(dateObj);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\\w\\s-]/g, '')
    .replace(/[\\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}
`;
}

function generateUtilityTests(context: any): string {
  return `import { isEmail, isUrl, isEmpty, formatCurrency, formatDate, slugify } from '../src/index';

describe('${context.moduleName} Utilities', () => {
  describe('Validation', () => {
    it('validates email addresses', () => {
      expect(isEmail('test@example.com')).toBe(true);
      expect(isEmail('invalid-email')).toBe(false);
    });

    it('validates URLs', () => {
      expect(isUrl('https://example.com')).toBe(true);
      expect(isUrl('invalid-url')).toBe(false);
    });

    it('checks empty values', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty({})).toBe(true);
      expect(isEmpty('test')).toBe(false);
    });
  });

  describe('Formatting', () => {
    it('formats currency', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('formats dates', () => {
      const date = new Date('2023-01-01');
      expect(formatDate(date)).toMatch(/1\\/1\\/2023/);
    });

    it('creates slugs', () => {
      expect(slugify('Hello World!')).toBe('hello-world');
    });
  });
});
`;
}

function generateUtilityReadme(context: any): string {
  return `# ${context.moduleName}

${context.moduleType} module generated from utility-lib template.

## Features

- Validation utilities
- Formatting utilities
- TypeScript definitions
- Comprehensive testing

## Getting Started

\`\`\`bash
npm install
npm run build
\`\`\`

## Utilities

### Validation
- \`isEmail(email)\` - Email validation
- \`isUrl(url)\` - URL validation
- \`isEmpty(value)\` - Empty value check
- \`isRequired(value)\` - Required field validation

### Formatting
- \`formatCurrency(amount)\` - Currency formatting
- \`formatDate(date)\` - Date formatting
- \`slugify(text)\` - URL slug creation
- \`truncate(text, length)\` - Text truncation

## Testing

\`\`\`bash
npm test
\`\`\`

Generated on: ${context.timestamp}
`;
}

function generateApiIndex(context: any): string {
  return `export { ApiClient } from './client/api';
export * from './types/responses';

// ${context.moduleName} - API Integration
// Generated on: ${context.timestamp}
`;
}

function generateApiClient(context: any): string {
  if (context.config.client === 'axios') {
    return `import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, ErrorResponse } from '../types/responses';

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string, apiKey?: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': \`Bearer \${apiKey}\` })
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        const errorResponse: ErrorResponse = {
          success: false,
          error: error.response?.data?.message || error.message,
          code: error.response?.status || 500
        };
        return Promise.reject(errorResponse);
      }
    );
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    const response = await this.client.get(path);
    return {
      success: true,
      data: response.data
    };
  }

  async post<T>(path: string, data: any): Promise<ApiResponse<T>> {
    const response = await this.client.post(path, data);
    return {
      success: true,
      data: response.data
    };
  }

  async put<T>(path: string, data: any): Promise<ApiResponse<T>> {
    const response = await this.client.put(path, data);
    return {
      success: true,
      data: response.data
    };
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    const response = await this.client.delete(path);
    return {
      success: true,
      data: response.data
    };
  }
}
`;
  }

  return `import { ApiResponse, ErrorResponse } from '../types/responses';

export class ApiClient {
  private baseURL: string;
  private headers: Record<string, string>;

  constructor(baseURL: string, apiKey?: string) {
    this.baseURL = baseURL;
    this.headers = {
      'Content-Type': 'application/json',
      ...(apiKey && { 'Authorization': \`Bearer \${apiKey}\` })
    };
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(\`\${this.baseURL}\${path}\`, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorResponse: ErrorResponse = {
          success: false,
          error: errorData.message || response.statusText,
          code: response.status
        };
        throw errorResponse;
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'success' in error) {
        throw error;
      }

      const errorResponse: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 500
      };
      throw errorResponse;
    }
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put<T>(path: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}
`;
}

function generateApiTypes(_context: any): string {
  return `export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}
`;
}

function generateApiTests(context: any): string {
  return `import { ApiClient } from '../src/client/api';

describe('${context.moduleName} API Client', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient('https://api.example.com', 'test-api-key');
  });

  describe('GET requests', () => {
    it('should handle successful GET request', async () => {
      // Mock implementation would go here
      expect(client.get).toBeDefined();
    });
  });

  describe('POST requests', () => {
    it('should handle successful POST request', async () => {
      // Mock implementation would go here
      expect(client.post).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock error scenarios would go here
      expect(client).toBeDefined();
    });
  });
});
`;
}

function generateApiReadme(context: any): string {
  return `# ${context.moduleName}

${context.moduleType} module generated from api-integration template.

## Features

- HTTP client with ${context.config.client}
- TypeScript type definitions
- Error handling
- Request/response interceptors
- Comprehensive testing

## Getting Started

\`\`\`bash
npm install
npm run build
\`\`\`

## Usage

\`\`\`typescript
import { ApiClient } from '${context.moduleName}';

const client = new ApiClient('https://api.example.com', 'your-api-key');

// GET request
const users = await client.get('/users');

// POST request
const newUser = await client.post('/users', {
  name: 'John Doe',
  email: 'john@example.com'
});
\`\`\`

## API Methods

- \`get<T>(path)\` - GET request
- \`post<T>(path, data)\` - POST request
- \`put<T>(path, data)\` - PUT request
- \`delete<T>(path)\` - DELETE request

## Testing

\`\`\`bash
npm test
\`\`\`

Generated on: ${context.timestamp}
`;
}

function generateCoreIndex(context: any): string {
  return `export * from './types/common';
export * from './constants/index';
${context.config.validation ? "export * from './schemas/validation';" : ''}

// ${context.moduleName} - Core Types and Constants
// Generated on: ${context.timestamp}
`;
}

function generateCommonTypes(_context: any): string {
  return `export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type Status = 'active' | 'inactive' | 'pending' | 'suspended';

export interface User extends BaseEntity {
  email: string;
  name: string;
  status: Status;
  role: string;
}

export interface AuditLog extends BaseEntity {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata?: Record<string, any>;
}
`;
}

function generateConstants(_context: any): string {
  return `export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator'
} as const;

export const STATUS_VALUES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  SUSPENDED: 'suspended'
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_URL: 'Please enter a valid URL',
  MIN_LENGTH: 'Must be at least {min} characters',
  MAX_LENGTH: 'Must be no more than {max} characters'
} as const;
`;
}

function generateValidationSchemas(context: any): string {
  if (!context.config.validation) return '';

  return `import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

export const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string', minLength: 1, maxLength: 255 },
    status: { type: 'string', enum: ['active', 'inactive', 'pending', 'suspended'] },
    role: { type: 'string', enum: ['admin', 'user', 'moderator'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  },
  required: ['email', 'name', 'status', 'role'],
  additionalProperties: false
};

export const createUserSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    name: { type: 'string', minLength: 1, maxLength: 255 },
    password: { type: 'string', minLength: 8, maxLength: 128 },
    role: { type: 'string', enum: ['admin', 'user', 'moderator'], default: 'user' }
  },
  required: ['email', 'name', 'password'],
  additionalProperties: false
};

export const paginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
    sortBy: { type: 'string' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' }
  },
  additionalProperties: false
};

export const validateUser = ajv.compile(userSchema);
export const validateCreateUser = ajv.compile(createUserSchema);
export const validatePagination = ajv.compile(paginationSchema);

export function getValidationErrors(validate: any): string[] {
  if (!validate.errors) return [];

  return validate.errors.map((error: any) => {
    const field = error.instancePath.replace('/', '') || error.params?.missingProperty || 'root';
    return \`\${field}: \${error.message}\`;
  });
}
`;
}

function generateCoreTests(context: any): string {
  return `import { HTTP_STATUS, USER_ROLES, validateUser } from '../src/index';
${context.config.validation ? "import { validateUser, validateCreateUser } from '../src/schemas/validation';" : ''}

describe('${context.moduleName} Core', () => {
  describe('Constants', () => {
    it('exports HTTP status codes', () => {
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
    });

    it('exports user roles', () => {
      expect(USER_ROLES.ADMIN).toBe('admin');
      expect(USER_ROLES.USER).toBe('user');
    });
  });

  ${context.config.validation ? `
  describe('Validation', () => {
    it('validates user objects', () => {
      const validUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        status: 'active',
        role: 'user',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      };

      expect(validateUser(validUser)).toBe(true);
    });

    it('rejects invalid user objects', () => {
      const invalidUser = {
        email: 'invalid-email',
        name: '',
        status: 'invalid-status'
      };

      expect(validateUser(invalidUser)).toBe(false);
    });
  });
  ` : ''}
});
`;
}

function generateCoreReadme(context: any): string {
  return `# ${context.moduleName}

${context.moduleType} module generated from core-types template.

## Features

- Common TypeScript interfaces
- Application constants
- ${context.config.validation ? 'JSON Schema validation' : 'Type definitions only'}
- Comprehensive testing

## Getting Started

\`\`\`bash
npm install
npm run build
\`\`\`

## Types

- \`BaseEntity\` - Common entity interface
- \`ApiResponse<T>\` - Standard API response format
- \`User\` - User entity interface
- \`PaginationOptions\` - Pagination parameters
- \`PaginationResult<T>\` - Paginated response format

## Constants

- \`HTTP_STATUS\` - HTTP status codes
- \`USER_ROLES\` - Application user roles
- \`STATUS_VALUES\` - Entity status values
- \`PAGINATION_DEFAULTS\` - Default pagination settings

${context.config.validation ? `
## Validation

- \`validateUser(data)\` - User object validation
- \`validateCreateUser(data)\` - Create user validation
- \`validatePagination(data)\` - Pagination validation
- \`getValidationErrors(validate)\` - Error formatting
` : ''}

## Testing

\`\`\`bash
npm test
\`\`\`

Generated on: ${context.timestamp}
`;
}

function generateGitignore(_context: any): string {
  return `node_modules/
dist/
build/
*.log
.env
.env.local
.DS_Store
coverage/
.nyc_output/
.vscode/
.idea/
*.tsbuildinfo
`;
}

function generateEslintConfig(_context: any): string {
  return `module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  env: {
    node: true,
    es6: true,
    jest: true
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn'
  }
};
`;
}

function generateJestConfig(_context: any): string {
  return `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
`;
}

function generateViteConfig(_context: any): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts']
  }
});
`;
}

program.parse();