import { CICDIntegration, CICDConfig } from '../../src/integrations/ci-cd.js';
import { ValidationService } from '../../src/services/ValidationService.js';
import { RuleSeverity } from '../../src/models/enums.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('CICDIntegration', () => {
  let integration: CICDIntegration;
  let validationService: ValidationService;
  let tempDir: string;
  let tempProjectDir: string;

  beforeEach(async () => {
    validationService = new ValidationService();

    const config: CICDConfig = {
      platform: 'github-actions',
      enabled: true,
      stages: {
        validation: true,
        testing: true,
        security: true,
        deployment: false
      },
      rules: ['test-rule'],
      severity: RuleSeverity.ERROR,
      parallel: true,
      failFast: false,
      reportFormat: 'json',
      artifactPaths: ['reports/', 'coverage/'],
      notifications: {}
    };

    integration = new CICDIntegration(config);

    // Create temporary directory for project
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cicd-test-'));
    tempProjectDir = path.join(tempDir, 'test-project');
    await fs.mkdir(tempProjectDir);

    // Initialize git repository
    process.chdir(tempProjectDir);
    execSync('git init', { stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { stdio: 'pipe' });
    execSync('git config user.name "Test User"', { stdio: 'pipe' });

    // Create package.json
    await fs.writeFile(
      path.join(tempProjectDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        type: 'module',
        scripts: {
          test: 'echo "test command"',
          build: 'echo "build command"',
          lint: 'echo "lint command"'
        }
      }, null, 2)
    );
  });

  afterEach(async () => {
    try {
      process.chdir('/');
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('generatePipeline', () => {
    it('should generate GitHub Actions pipeline successfully', async () => {
      await integration.generatePipeline(tempProjectDir);

      // Verify workflow file was created
      const workflowPath = path.join(tempProjectDir, '.github/workflows/validation.yml');
      const workflowExists = await fs.access(workflowPath).then(() => true).catch(() => false);
      expect(workflowExists).toBe(true);

      if (workflowExists) {
        const workflowContent = await fs.readFile(workflowPath, 'utf-8');
        expect(workflowContent).toContain('name:');
        expect(workflowContent).toContain('on:');
        expect(workflowContent).toContain('jobs:');
      }
    });

    it('should generate GitLab CI pipeline successfully', async () => {
      const gitlabConfig: CICDConfig = {
        platform: 'gitlab-ci',
        enabled: true,
        stages: {
          validation: true,
          testing: true,
          security: false,
          deployment: false
        },
        rules: ['test-rule'],
        severity: RuleSeverity.WARNING,
        parallel: false,
        failFast: true,
        reportFormat: 'junit',
        artifactPaths: ['reports/'],
        notifications: {}
      };

      const gitlabIntegration = new CICDIntegration(gitlabConfig);
      await gitlabIntegration.generatePipeline(tempProjectDir);

      // Verify pipeline file was created
      const pipelinePath = path.join(tempProjectDir, '.gitlab-ci.yml');
      const pipelineExists = await fs.access(pipelinePath).then(() => true).catch(() => false);
      expect(pipelineExists).toBe(true);

      if (pipelineExists) {
        const pipelineContent = await fs.readFile(pipelinePath, 'utf-8');
        expect(pipelineContent).toContain('stages:');
        expect(pipelineContent).toContain('validation');
      }
    });

    it('should generate Jenkins pipeline successfully', async () => {
      const jenkinsConfig: CICDConfig = {
        platform: 'jenkins',
        enabled: true,
        stages: {
          validation: true,
          testing: true,
          security: true,
          deployment: false
        },
        rules: ['test-rule'],
        severity: RuleSeverity.ERROR,
        parallel: true,
        failFast: false,
        reportFormat: 'json',
        artifactPaths: ['reports/'],
        notifications: {}
      };

      const jenkinsIntegration = new CICDIntegration(jenkinsConfig);
      await jenkinsIntegration.generatePipeline(tempProjectDir);

      // Verify Jenkinsfile was created
      const jenkinsfilePath = path.join(tempProjectDir, 'Jenkinsfile');
      const jenkinsfileExists = await fs.access(jenkinsfilePath).then(() => true).catch(() => false);
      expect(jenkinsfileExists).toBe(true);

      if (jenkinsfileExists) {
        const jenkinsfileContent = await fs.readFile(jenkinsfilePath, 'utf-8');
        expect(jenkinsfileContent).toContain('pipeline');
        expect(jenkinsfileContent).toContain('agent');
        expect(jenkinsfileContent).toContain('stages');
      }
    });

    it('should handle disabled configuration', async () => {
      const disabledConfig: CICDConfig = {
        platform: 'github-actions',
        enabled: false,
        stages: {
          validation: true,
          testing: true,
          security: false,
          deployment: false
        },
        rules: [],
        severity: RuleSeverity.ERROR,
        parallel: true,
        failFast: false,
        reportFormat: 'json',
        artifactPaths: [],
        notifications: {}
      };

      const disabledIntegration = new CICDIntegration(disabledConfig);

      await expect(disabledIntegration.generatePipeline(tempProjectDir)).rejects.toThrow('CI/CD integration is disabled');
    });
  });

  describe('executeValidationStage', () => {
    beforeEach(async () => {
      await integration.generatePipeline(tempProjectDir);
    });

    it('should execute validation stage successfully', async () => {
      // Create a module structure
      const moduleDir = path.join(tempProjectDir, 'src');
      await fs.mkdir(moduleDir, { recursive: true });
      await fs.writeFile(
        path.join(moduleDir, 'index.ts'),
        'export const greeting = "Hello, World!";'
      );

      const result = await integration.executeValidationStage(tempProjectDir, 'build-123');

      expect(result.pipeline).toBe('github-actions');
      expect(result.build).toBe('build-123');
      expect(result.stage).toBe('validation');
      expect(result.success).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
      expect(Array.isArray(result.modules)).toBe(true);
      expect(result.summary).toBeDefined();
      expect(typeof result.summary.total).toBe('number');
      expect(typeof result.summary.passed).toBe('number');
      expect(typeof result.summary.failed).toBe('number');
      expect(typeof result.summary.warnings).toBe('number');
    });

    it('should handle validation failures in CI/CD context', async () => {
      // Create a structure that might trigger validation issues
      const moduleDir = path.join(tempProjectDir, 'src');
      await fs.mkdir(moduleDir, { recursive: true });

      // Create a file that might cause validation issues
      const longContent = Array(250).fill('// This is a comment line').join('\n');
      await fs.writeFile(path.join(moduleDir, 'long-file.ts'), longContent);

      const result = await integration.executeValidationStage(tempProjectDir, 'build-456');

      expect(result.pipeline).toBe('github-actions');
      expect(result.build).toBe('build-456');
      expect(result.stage).toBe('validation');
      expect(result.success).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('executeTestingStage', () => {
    beforeEach(async () => {
      await integration.generatePipeline(tempProjectDir);
    });

    it('should execute testing stage successfully', async () => {
      const result = await integration.executeTestingStage(tempProjectDir, 'build-123');

      expect(result.pipeline).toBe('github-actions');
      expect(result.build).toBe('build-123');
      expect(result.stage).toBe('testing');
      expect(result.success).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('executeSecurityStage', () => {
    beforeEach(async () => {
      await integration.generatePipeline(tempProjectDir);
    });

    it('should execute security stage successfully', async () => {
      const result = await integration.executeSecurityStage(tempProjectDir, 'build-123');

      expect(result.pipeline).toBe('github-actions');
      expect(result.build).toBe('build-123');
      expect(result.stage).toBe('security');
      expect(result.success).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('integration scenarios', () => {
    beforeEach(async () => {
      await integration.generatePipeline(tempProjectDir);
    });

    it('should integrate with ValidationService properly', async () => {
      // Create a comprehensive module structure
      const moduleDir = path.join(tempProjectDir, 'src');
      await fs.mkdir(moduleDir, { recursive: true });
      await fs.writeFile(
        path.join(moduleDir, 'index.ts'),
        'export const greeting = "Hello, World!";'
      );
      await fs.writeFile(
        path.join(moduleDir, 'package.json'),
        JSON.stringify({
          name: 'test-submodule',
          version: '1.0.0',
          type: 'module'
        }, null, 2)
      );

      // Execute validation through CI/CD
      const result = await integration.executeValidationStage(tempProjectDir, 'integration-test');

      expect(result.success).toBeDefined();
      expect(result.modules).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should handle multiple platforms correctly', async () => {
      const platforms: Array<CICDConfig['platform']> = [
        'github-actions',
        'gitlab-ci',
        'jenkins',
        'azure-devops',
        'circleci'
      ];

      for (const platform of platforms) {
        const config: CICDConfig = {
          platform,
          enabled: true,
          stages: {
            validation: true,
            testing: false,
            security: false,
            deployment: false
          },
          rules: ['test-rule'],
          severity: RuleSeverity.WARNING,
          parallel: false,
          failFast: false,
          reportFormat: 'json',
          artifactPaths: [],
          notifications: {}
        };

        const platformIntegration = new CICDIntegration(config);

        // Should generate pipeline without errors
        await expect(platformIntegration.generatePipeline(tempProjectDir)).resolves.toBeUndefined();

        // Clean up generated files for next iteration
        const files = [
          '.github/workflows/validation.yml',
          '.gitlab-ci.yml',
          'Jenkinsfile',
          'azure-pipelines.yml',
          '.circleci/config.yml'
        ];

        for (const file of files) {
          const filePath = path.join(tempProjectDir, file);
          try {
            await fs.rm(filePath, { recursive: true, force: true });
          } catch {
            // Ignore cleanup errors
          }
        }
      }
    });

    it('should handle parallel vs sequential execution', async () => {
      // Test parallel execution
      const parallelConfig: CICDConfig = {
        platform: 'github-actions',
        enabled: true,
        stages: {
          validation: true,
          testing: true,
          security: true,
          deployment: false
        },
        rules: ['test-rule'],
        severity: RuleSeverity.WARNING,
        parallel: true,
        failFast: false,
        reportFormat: 'json',
        artifactPaths: [],
        notifications: {}
      };

      const parallelIntegration = new CICDIntegration(parallelConfig);
      await parallelIntegration.generatePipeline(tempProjectDir);

      const parallelResult = await parallelIntegration.executeValidationStage(tempProjectDir, 'parallel-test');
      expect(parallelResult.success).toBeDefined();

      // Test sequential execution
      const sequentialConfig: CICDConfig = {
        ...parallelConfig,
        parallel: false
      };

      const sequentialIntegration = new CICDIntegration(sequentialConfig);
      await sequentialIntegration.generatePipeline(tempProjectDir);

      const sequentialResult = await sequentialIntegration.executeValidationStage(tempProjectDir, 'sequential-test');
      expect(sequentialResult.success).toBeDefined();
    });

    it('should handle different report formats', async () => {
      const formats: Array<CICDConfig['reportFormat']> = ['json', 'junit', 'html', 'sarif'];

      for (const reportFormat of formats) {
        const config: CICDConfig = {
          platform: 'github-actions',
          enabled: true,
          stages: {
            validation: true,
            testing: false,
            security: false,
            deployment: false
          },
          rules: ['test-rule'],
          severity: RuleSeverity.INFO,
          parallel: false,
          failFast: false,
          reportFormat,
          artifactPaths: [`reports.${reportFormat}`],
          notifications: {}
        };

        const formatIntegration = new CICDIntegration(config);
        await formatIntegration.generatePipeline(tempProjectDir);

        const result = await formatIntegration.executeValidationStage(tempProjectDir, `format-test-${reportFormat}`);
        expect(result.success).toBeDefined();
      }
    });
  });

  describe('error handling', () => {
    it('should handle unsupported CI/CD platforms', async () => {
      const invalidConfig = {
        platform: 'unsupported-platform' as any,
        enabled: true,
        stages: {
          validation: true,
          testing: false,
          security: false,
          deployment: false
        },
        rules: [],
        severity: RuleSeverity.ERROR,
        parallel: false,
        failFast: false,
        reportFormat: 'json' as const,
        artifactPaths: [],
        notifications: {}
      };

      const invalidIntegration = new CICDIntegration(invalidConfig);

      await expect(invalidIntegration.generatePipeline(tempProjectDir)).rejects.toThrow('Unsupported CI/CD platform');
    });

    it('should handle missing project directories', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent');

      await expect(integration.executeValidationStage(nonExistentPath, 'test-build')).rejects.toThrow();
    });
  });

  describe('performance and scalability', () => {
    it('should handle large projects efficiently', async () => {
      // Create a larger project structure
      const modules = ['auth', 'api', 'ui', 'utils', 'types'];

      for (const module of modules) {
        const moduleDir = path.join(tempProjectDir, 'src', module);
        await fs.mkdir(moduleDir, { recursive: true });

        await fs.writeFile(
          path.join(moduleDir, 'index.ts'),
          `export const ${module}Module = "${module}";`
        );

        await fs.writeFile(
          path.join(moduleDir, 'package.json'),
          JSON.stringify({
            name: `test-${module}`,
            version: '1.0.0',
            type: 'module'
          }, null, 2)
        );
      }

      const startTime = Date.now();
      const result = await integration.executeValidationStage(tempProjectDir, 'large-project-test');
      const duration = Date.now() - startTime;

      expect(result.success).toBeDefined();
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.summary.total).toBeGreaterThan(0);
    });
  });
});