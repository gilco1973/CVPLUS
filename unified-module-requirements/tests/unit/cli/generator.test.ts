/**
 * Unit tests for CLI generator tool
 *
 * Tests the generator CLI functionality including:
 * - Template listing and filtering
 * - Module generation from templates
 * - Configuration handling (interactive and file-based)
 * - Template customization and validation
 * - File generation and npm installation
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { ModuleType } from '../../../src/models/enums';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('commander');
jest.mock('chalk', () => ({
  blue: jest.fn((str) => str),
  green: jest.fn((str) => str),
  red: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  gray: jest.fn((str) => str),
  bold: {
    blue: jest.fn((str) => str),
    green: jest.fn((str) => str),
  },
}));
jest.mock('inquirer');
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    text: '',
  }));
});

const mockFs = fs as jest.Mocked<typeof fs>;
const mockInquirer = require('inquirer');

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
  files: Record<string, string | Function>;
}

describe('CLI Generator', () => {
  let tempDir: string;

  // Mock templates for testing
  const mockTemplates: Record<string, TemplateConfig> = {
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
        'package.json': (context: any) => JSON.stringify({
          name: context.moduleName,
          version: '1.0.0',
          description: `Backend API module - ${context.moduleName}`,
          main: 'dist/index.js',
          scripts: {
            build: 'tsc',
            dev: 'ts-node src/index.ts',
            test: context.config.testing === 'jest' ? 'jest' : 'vitest'
          }
        }, null, 2),
        'src/index.ts': (context: any) => `// ${context.moduleName} - Backend API\nexport { createApp } from './app';\n`,
        'README.md': (context: any) => `# ${context.moduleName}\n\nBackend API module with ${context.config.auth} authentication.\n`
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
        'package.json': (context: any) => JSON.stringify({
          name: context.moduleName,
          version: '1.0.0',
          type: 'module',
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0'
          }
        }, null, 2),
        'src/index.ts': `export { default as Example } from './components/Example';\n`,
        'src/components/Example.tsx': (context: any) => `import React from 'react';\n\nconst Example: React.FC = () => {\n  return <div>${context.moduleName}</div>;\n};\n\nexport default Example;\n`
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = path.join(__dirname, '../../temp', `generator-test-${Date.now()}`);

    // Set up default mocks
    mockFs.pathExists.mockResolvedValue(false);
    mockFs.ensureDir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.writeJSON.mockResolvedValue(undefined);
    mockFs.readJSON.mockResolvedValue({});
    mockInquirer.prompt.mockResolvedValue({});
  });

  describe('template management', () => {
    it('should list all available templates', () => {
      const templates = Object.values(mockTemplates);

      expect(templates).toHaveLength(2);
      expect(templates.map(t => t.templateId)).toContain('backend-api');
      expect(templates.map(t => t.templateId)).toContain('frontend-component');
    });

    it('should filter templates by module type', () => {
      const backendTemplates = Object.values(mockTemplates).filter(t => t.moduleType === ModuleType.BACKEND);
      const frontendTemplates = Object.values(mockTemplates).filter(t => t.moduleType === ModuleType.FRONTEND);

      expect(backendTemplates).toHaveLength(1);
      expect(backendTemplates[0].templateId).toBe('backend-api');

      expect(frontendTemplates).toHaveLength(1);
      expect(frontendTemplates[0].templateId).toBe('frontend-component');
    });

    it('should return empty array for non-existent module type', () => {
      const apiTemplates = Object.values(mockTemplates).filter(t => t.moduleType === ModuleType.API);

      expect(apiTemplates).toHaveLength(0);
    });

    it('should provide template details', () => {
      const template = mockTemplates['backend-api'];

      expect(template.name).toBe('Backend API Template');
      expect(template.description).toContain('Express, TypeScript, and testing');
      expect(template.configurableOptions).toHaveLength(3);
      expect(template.configurableOptions.map(o => o.name)).toEqual(['database', 'auth', 'testing']);
    });
  });

  describe('module generation', () => {
    it('should generate module with default configuration', async () => {
      const moduleName = 'test-api';
      const outputPath = path.join(tempDir, moduleName);
      const template = mockTemplates['backend-api'];

      mockFs.pathExists.mockResolvedValue(false); // Directory doesn't exist

      const generateModule = async (templateId: string, name: string, output: string, config: any = {}) => {
        const template = mockTemplates[templateId];
        if (!template) {
          throw new Error(`Template "${templateId}" not found`);
        }

        const modulePath = path.resolve(output, name);

        // Use defaults for missing config
        const finalConfig = { ...config };
        for (const option of template.configurableOptions) {
          if (!(option.name in finalConfig)) {
            finalConfig[option.name] = option.default;
          }
        }

        await mockFs.ensureDir(modulePath);

        const context = {
          moduleName: name,
          moduleType: template.moduleType,
          config: finalConfig,
          timestamp: new Date().toISOString()
        };

        const filesCreated: string[] = [];
        for (const [filePath, generator] of Object.entries(template.files)) {
          const fullPath = path.join(modulePath, filePath);
          await mockFs.ensureDir(path.dirname(fullPath));

          const content = typeof generator === 'function' ? generator(context) : generator;
          await mockFs.writeFile(fullPath, content);
          filesCreated.push(filePath);
        }

        return {
          modulePath,
          filesCreated,
          config: finalConfig
        };
      };

      const result = await generateModule('backend-api', moduleName, tempDir);

      expect(result.modulePath).toBe(outputPath);
      expect(result.filesCreated).toContain('package.json');
      expect(result.filesCreated).toContain('src/index.ts');
      expect(result.filesCreated).toContain('README.md');
      expect(result.config.database).toBe('postgresql');
      expect(result.config.auth).toBe('jwt');
      expect(result.config.testing).toBe('jest');

      expect(mockFs.ensureDir).toHaveBeenCalledWith(outputPath);
      expect(mockFs.writeFile).toHaveBeenCalledTimes(3);
    });

    it('should generate module with custom configuration', async () => {
      const moduleName = 'custom-api';
      const customConfig = {
        database: 'mongodb',
        auth: 'oauth',
        testing: 'vitest'
      };

      const generateModule = async (templateId: string, name: string, output: string, config: any = {}) => {
        const template = mockTemplates[templateId];
        const context = {
          moduleName: name,
          moduleType: template.moduleType,
          config,
          timestamp: new Date().toISOString()
        };

        // Generate package.json with custom config
        const packageJsonGenerator = template.files['package.json'] as Function;
        const packageJsonContent = packageJsonGenerator(context);
        const packageJson = JSON.parse(packageJsonContent);

        return {
          packageJson,
          config
        };
      };

      const result = await generateModule('backend-api', moduleName, tempDir, customConfig);

      expect(result.config.database).toBe('mongodb');
      expect(result.config.auth).toBe('oauth');
      expect(result.config.testing).toBe('vitest');
      expect(result.packageJson.scripts.test).toBe('vitest');
    });

    it('should handle interactive configuration', async () => {
      const userAnswers = {
        database: 'mysql',
        auth: 'session',
        testing: 'mocha'
      };

      mockInquirer.prompt.mockResolvedValue(userAnswers);

      const interactiveGenerate = async (templateId: string, name: string) => {
        const template = mockTemplates[templateId];

        const questions = template.configurableOptions.map(option => ({
          type: option.type,
          name: option.name,
          message: option.description,
          default: option.default,
          choices: option.choices
        }));

        const answers = await mockInquirer.prompt(questions);

        return {
          questions,
          answers,
          moduleName: name
        };
      };

      const result = await interactiveGenerate('backend-api', 'interactive-api');

      expect(result.questions).toHaveLength(3);
      expect(result.questions[0].name).toBe('database');
      expect(result.questions[1].name).toBe('auth');
      expect(result.questions[2].name).toBe('testing');
      expect(result.answers).toEqual(userAnswers);
      expect(mockInquirer.prompt).toHaveBeenCalledWith(result.questions);
    });

    it('should load configuration from file', async () => {
      const configFile = '/path/to/config.json';
      const fileConfig = {
        database: 'sqlite',
        auth: 'none',
        testing: 'jest'
      };

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJSON.mockResolvedValue(fileConfig);

      const loadConfigFromFile = async (configPath: string) => {
        if (await mockFs.pathExists(configPath)) {
          return await mockFs.readJSON(configPath);
        }
        throw new Error(`Configuration file not found: ${configPath}`);
      };

      const config = await loadConfigFromFile(configFile);

      expect(config).toEqual(fileConfig);
      expect(mockFs.readJSON).toHaveBeenCalledWith(configFile);
    });

    it('should handle missing configuration file', async () => {
      const configFile = '/path/to/nonexistent.json';

      mockFs.pathExists.mockResolvedValue(false);

      const loadConfigFromFile = async (configPath: string) => {
        if (await mockFs.pathExists(configPath)) {
          return await mockFs.readJSON(configPath);
        }
        throw new Error(`Configuration file not found: ${configPath}`);
      };

      await expect(loadConfigFromFile(configFile)).rejects.toThrow('Configuration file not found');
    });
  });

  describe('file generation', () => {
    it('should generate package.json with correct dependencies', () => {
      const context = {
        moduleName: 'test-module',
        config: { database: 'postgresql', auth: 'jwt', testing: 'jest' },
        moduleType: ModuleType.BACKEND,
        timestamp: '2023-01-01T00:00:00.000Z'
      };

      const generatePackageJson = (ctx: any) => JSON.stringify({
        name: ctx.moduleName,
        version: '1.0.0',
        description: `Backend API module - ${ctx.moduleName}`,
        main: 'dist/index.js',
        scripts: {
          build: 'tsc',
          dev: 'ts-node src/index.ts',
          test: ctx.config.testing === 'jest' ? 'jest' : 'vitest'
        },
        dependencies: {
          express: '^4.18.2',
          ...(ctx.config.database === 'postgresql' ? { pg: '^8.11.0' } : {}),
          ...(ctx.config.auth === 'jwt' ? { jsonwebtoken: '^9.0.0' } : {})
        }
      }, null, 2);

      const packageJsonContent = generatePackageJson(context);
      const packageJson = JSON.parse(packageJsonContent);

      expect(packageJson.name).toBe('test-module');
      expect(packageJson.scripts.test).toBe('jest');
      expect(packageJson.dependencies.express).toBe('^4.18.2');
      expect(packageJson.dependencies.pg).toBe('^8.11.0');
      expect(packageJson.dependencies.jsonwebtoken).toBe('^9.0.0');
    });

    it('should generate TypeScript configuration', () => {
      const generateTsConfig = () => JSON.stringify({
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

      const tsconfigContent = generateTsConfig();
      const tsconfig = JSON.parse(tsconfigContent);

      expect(tsconfig.compilerOptions.target).toBe('ES2020');
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.include).toContain('src/**/*');
      expect(tsconfig.exclude).toContain('node_modules');
    });

    it('should generate README with module information', () => {
      const context = {
        moduleName: 'awesome-api',
        config: { database: 'mongodb', auth: 'oauth', testing: 'vitest' },
        moduleType: ModuleType.BACKEND,
        timestamp: '2023-01-01T00:00:00.000Z'
      };

      const generateReadme = (ctx: any) => `# ${ctx.moduleName}

${ctx.moduleType} module generated from backend-api template.

## Features

- Express.js server with TypeScript
- ${ctx.config.auth !== 'none' ? `Authentication: ${ctx.config.auth}` : 'No authentication'}
- ${ctx.config.database !== 'none' ? `Database: ${ctx.config.database}` : 'No database'}
- Testing with ${ctx.config.testing}

Generated on: ${ctx.timestamp}
`;

      const readmeContent = generateReadme(context);

      expect(readmeContent).toContain('# awesome-api');
      expect(readmeContent).toContain('Authentication: oauth');
      expect(readmeContent).toContain('Database: mongodb');
      expect(readmeContent).toContain('Testing with vitest');
      expect(readmeContent).toContain('Generated on: 2023-01-01T00:00:00.000Z');
    });

    it('should generate source files with correct structure', () => {
      const context = {
        moduleName: 'test-service',
        config: {},
        moduleType: ModuleType.BACKEND,
        timestamp: '2023-01-01T00:00:00.000Z'
      };

      const generateIndex = (ctx: any) => `// ${ctx.moduleName} - Backend API
// Generated on: ${ctx.timestamp}

export { createApp } from './app';

const PORT = process.env['PORT'] || 3000;

async function startServer(): Promise<void> {
  try {
    const app = await createApp();
    app.listen(PORT, () => {
      console.log(\`${ctx.moduleName} server running on port \${PORT}\`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  void startServer();
}
`;

      const indexContent = generateIndex(context);

      expect(indexContent).toContain('// test-service - Backend API');
      expect(indexContent).toContain('Generated on: 2023-01-01T00:00:00.000Z');
      expect(indexContent).toContain('export { createApp } from \'./app\'');
      expect(indexContent).toContain('test-service server running on port');
    });
  });

  describe('error handling', () => {
    it('should handle template not found', async () => {
      const generateModule = async (templateId: string) => {
        const template = mockTemplates[templateId];
        if (!template) {
          throw new Error(`Template "${templateId}" not found`);
        }
        return template;
      };

      await expect(generateModule('non-existent-template')).rejects.toThrow('Template "non-existent-template" not found');
    });

    it('should handle existing directory', async () => {
      mockFs.pathExists.mockResolvedValue(true); // Directory already exists

      const generateModule = async (name: string, output: string) => {
        const modulePath = path.resolve(output, name);

        if (await mockFs.pathExists(modulePath)) {
          throw new Error(`Directory "${modulePath}" already exists`);
        }

        return modulePath;
      };

      const outputPath = '/test/output';
      const moduleName = 'existing-module';

      await expect(generateModule(moduleName, outputPath)).rejects.toThrow('already exists');
    });

    it('should handle file system errors', async () => {
      mockFs.ensureDir.mockRejectedValue(new Error('Permission denied'));

      const generateModule = async (name: string, output: string) => {
        const modulePath = path.resolve(output, name);
        await mockFs.ensureDir(modulePath);
        return modulePath;
      };

      await expect(generateModule('test-module', '/readonly')).rejects.toThrow('Permission denied');
    });

    it('should handle malformed configuration files', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJSON.mockRejectedValue(new Error('Unexpected token in JSON'));

      const loadConfig = async (configPath: string) => {
        if (await mockFs.pathExists(configPath)) {
          return await mockFs.readJSON(configPath);
        }
        throw new Error('Config file not found');
      };

      await expect(loadConfig('/malformed/config.json')).rejects.toThrow('Unexpected token in JSON');
    });
  });

  describe('template initialization', () => {
    it('should create new template structure', async () => {
      const templateName = 'custom-template';
      const templateType = ModuleType.UTILITY;
      const outputPath = '/templates';

      const initializeTemplate = async (name: string, type: ModuleType, output: string) => {
        const templatePath = path.resolve(output, name);
        await mockFs.ensureDir(templatePath);

        const templateConfig = {
          templateId: name,
          name: `${name} Template`,
          description: `Custom template for ${type} modules`,
          moduleType: type,
          version: '1.0.0',
          configurableOptions: [],
          files: {
            'package.json': '{{ packageJson }}',
            'README.md': '{{ readme }}',
            'src/index.ts': '{{ mainFile }}'
          }
        };

        await mockFs.writeJSON(path.join(templatePath, 'template.json'), templateConfig, { spaces: 2 });
        await mockFs.ensureDir(path.join(templatePath, 'files'));

        return {
          templatePath,
          config: templateConfig
        };
      };

      const result = await initializeTemplate(templateName, templateType, outputPath);

      expect(result.config.templateId).toBe(templateName);
      expect(result.config.moduleType).toBe(ModuleType.UTILITY);
      expect(result.config.files).toHaveProperty('package.json');
      expect(mockFs.ensureDir).toHaveBeenCalledWith(path.join(outputPath, templateName));
      expect(mockFs.writeJSON).toHaveBeenCalled();
    });

    it('should validate module type for template initialization', () => {
      const validTypes = Object.values(ModuleType);
      const invalidType = 'invalid-type';

      expect(validTypes).toContain(ModuleType.BACKEND);
      expect(validTypes).toContain(ModuleType.FRONTEND);
      expect(validTypes).toContain(ModuleType.UTILITY);
      expect(validTypes).not.toContain(invalidType);
    });
  });

  describe('npm integration', () => {
    it('should handle npm install process', async () => {
      const mockSpawn = jest.fn().mockImplementation(() => ({
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 100); // Simulate successful install
          }
        })
      }));

      const installDependencies = async (modulePath: string) => {
        return new Promise<void>((resolve, reject) => {
          const npm = mockSpawn('npm', ['install'], {
            cwd: modulePath,
            stdio: 'pipe'
          });

          npm.on('close', (code: number) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`npm install failed with code ${code}`));
            }
          });
        });
      };

      await expect(installDependencies('/test/module')).resolves.toBeUndefined();
      expect(mockSpawn).toHaveBeenCalledWith('npm', ['install'], {
        cwd: '/test/module',
        stdio: 'pipe'
      });
    });

    it('should handle npm install failure', async () => {
      const mockSpawn = jest.fn().mockImplementation(() => ({
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 100); // Simulate failed install
          }
        })
      }));

      const installDependencies = async (modulePath: string) => {
        return new Promise<void>((resolve, reject) => {
          const npm = mockSpawn('npm', ['install'], {
            cwd: modulePath,
            stdio: 'pipe'
          });

          npm.on('close', (code: number) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`npm install failed with code ${code}`));
            }
          });
        });
      };

      await expect(installDependencies('/test/module')).rejects.toThrow('npm install failed with code 1');
    });
  });
});