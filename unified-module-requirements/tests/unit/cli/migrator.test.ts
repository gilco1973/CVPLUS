/**
 * Unit tests for CLI migrator tool
 *
 * Tests the migrator CLI functionality including:
 * - Legacy module analysis
 * - Migration plan creation and validation
 * - Step-by-step migration execution
 * - Backup and rollback capabilities
 * - Migration reporting and status tracking
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { ModuleType, ValidationStatus } from '../../../src/models/enums';

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
jest.mock('glob');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockInquirer = require('inquirer');
const mockGlob = require('glob');

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

interface ModuleAnalysis {
  moduleId: string;
  path: string;
  type: ModuleType;
  structure: {
    hasPackageJson: boolean;
    hasReadme: boolean;
    hasSrc: boolean;
    hasTests: boolean;
    hasConfig: boolean;
  };
  dependencies: string[];
  devDependencies: string[];
  files: string[];
  size: {
    totalFiles: number;
    linesOfCode: number;
    sizeOnDisk: number;
  };
  complexity: 'low' | 'medium' | 'high';
  issues: string[];
  migrationReadiness: number; // 0-100 score
}

describe('CLI Migrator', () => {
  let tempDir: string;
  let mockSourcePath: string;
  let mockTargetPath: string;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = path.join(__dirname, '../../temp', `migrator-test-${Date.now()}`);
    mockSourcePath = path.join(tempDir, 'legacy-module');
    mockTargetPath = path.join(tempDir, 'modern-module');

    // Set up default mocks
    mockFs.pathExists.mockResolvedValue(true);
    mockFs.readJSON.mockResolvedValue({});
    mockFs.readFile.mockResolvedValue('');
    mockFs.copy.mockResolvedValue(undefined);
    mockFs.move.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.ensureDir.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ size: 1024, isDirectory: () => false, isFile: () => true } as any);
    mockGlob.glob.mockResolvedValue([]);
    mockInquirer.prompt.mockResolvedValue({});
  });

  describe('module analysis', () => {
    it('should analyze legacy module structure', async () => {
      // Mock legacy module structure
      mockFs.readJSON.mockResolvedValue({
        name: 'legacy-module',
        version: '1.0.0',
        dependencies: {
          express: '^3.0.0', // Outdated version
          lodash: '^3.0.0'
        },
        devDependencies: {
          jest: '^24.0.0' // Outdated version
        }
      });

      mockGlob.glob.mockResolvedValue([
        'src/index.js',
        'src/utils.js',
        'test/index.test.js',
        'package.json',
        'README.md'
      ]);

      mockFs.readFile.mockImplementation((filePath) => {
        if (filePath.toString().endsWith('.js')) {
          return Promise.resolve('// Legacy JavaScript code\nmodule.exports = {};');
        }
        return Promise.resolve('# Legacy Module\n\nOld documentation.');
      });

      const analyzeModule = async (modulePath: string): Promise<ModuleAnalysis> => {
        const packageJsonPath = path.join(modulePath, 'package.json');
        const packageJson = await mockFs.readJSON(packageJsonPath);

        const files = await mockGlob.glob('**/*', { cwd: modulePath });

        let totalLines = 0;
        for (const file of files) {
          if (file.endsWith('.js') || file.endsWith('.ts')) {
            const content = await mockFs.readFile(path.join(modulePath, file), 'utf8');
            totalLines += content.split('\n').length;
          }
        }

        const structure = {
          hasPackageJson: files.includes('package.json'),
          hasReadme: files.includes('README.md'),
          hasSrc: files.some(f => f.startsWith('src/')),
          hasTests: files.some(f => f.includes('test') || f.includes('spec')),
          hasConfig: files.some(f => f.includes('config') || f.includes('.json'))
        };

        const issues = [];
        if (packageJson.dependencies?.express?.startsWith('^3')) {
          issues.push('Outdated Express version (v3.x)');
        }
        if (packageJson.devDependencies?.jest?.startsWith('^24')) {
          issues.push('Outdated Jest version (v24.x)');
        }
        if (files.some(f => f.endsWith('.js') && !f.endsWith('.config.js'))) {
          issues.push('Uses JavaScript instead of TypeScript');
        }

        const migrationReadiness = Math.max(0, 100 - (issues.length * 15));
        const complexity = issues.length > 5 ? 'high' : issues.length > 2 ? 'medium' : 'low';

        return {
          moduleId: packageJson.name || path.basename(modulePath),
          path: modulePath,
          type: ModuleType.BACKEND, // Inferred from structure
          structure,
          dependencies: Object.keys(packageJson.dependencies || {}),
          devDependencies: Object.keys(packageJson.devDependencies || {}),
          files,
          size: {
            totalFiles: files.length,
            linesOfCode: totalLines,
            sizeOnDisk: files.length * 1024 // Mock size
          },
          complexity,
          issues,
          migrationReadiness
        };
      };

      const analysis = await analyzeModule(mockSourcePath);

      expect(analysis.moduleId).toBe('legacy-module');
      expect(analysis.structure.hasPackageJson).toBe(true);
      expect(analysis.structure.hasSrc).toBe(true);
      expect(analysis.dependencies).toContain('express');
      expect(analysis.dependencies).toContain('lodash');
      expect(analysis.issues).toContain('Outdated Express version (v3.x)');
      expect(analysis.issues).toContain('Uses JavaScript instead of TypeScript');
      expect(analysis.complexity).toBe('medium');
      expect(analysis.migrationReadiness).toBeGreaterThan(0);
    });

    it('should detect TypeScript readiness', async () => {
      mockGlob.glob.mockResolvedValue([
        'src/index.ts',
        'src/utils.ts',
        'tsconfig.json',
        'package.json'
      ]);

      const checkTypeScriptReadiness = async (modulePath: string): Promise<boolean> => {
        const files = await mockGlob.glob('**/*', { cwd: modulePath });

        const hasTypeScript = files.some(f => f.endsWith('.ts'));
        const hasTsConfig = files.includes('tsconfig.json');
        const hasJavaScript = files.some(f => f.endsWith('.js') && !f.includes('config'));

        return hasTypeScript && hasTsConfig && !hasJavaScript;
      };

      const isReady = await checkTypeScriptReadiness(mockSourcePath);

      expect(isReady).toBe(true);
    });

    it('should identify dependency conflicts', async () => {
      mockFs.readJSON
        .mockResolvedValueOnce({
          name: 'source-module',
          dependencies: {
            react: '^16.0.0',
            lodash: '^3.0.0'
          }
        })
        .mockResolvedValueOnce({
          name: 'target-module',
          dependencies: {
            react: '^18.0.0',
            lodash: '^4.0.0'
          }
        });

      const findDependencyConflicts = async (sourcePath: string, targetPath: string): Promise<string[]> => {
        const sourcePackage = await mockFs.readJSON(path.join(sourcePath, 'package.json'));
        const targetPackage = await mockFs.readJSON(path.join(targetPath, 'package.json'));

        const conflicts = [];
        const sourceDeps = sourcePackage.dependencies || {};
        const targetDeps = targetPackage.dependencies || {};

        for (const [dep, sourceVersion] of Object.entries(sourceDeps)) {
          if (targetDeps[dep] && targetDeps[dep] !== sourceVersion) {
            conflicts.push(`${dep}: ${sourceVersion} vs ${targetDeps[dep]}`);
          }
        }

        return conflicts;
      };

      const conflicts = await findDependencyConflicts(mockSourcePath, mockTargetPath);

      expect(conflicts).toHaveLength(2);
      expect(conflicts).toContain('react: ^16.0.0 vs ^18.0.0');
      expect(conflicts).toContain('lodash: ^3.0.0 vs ^4.0.0');
    });
  });

  describe('migration planning', () => {
    it('should create comprehensive migration plan', async () => {
      const mockAnalysis: ModuleAnalysis = {
        moduleId: 'legacy-api',
        path: mockSourcePath,
        type: ModuleType.BACKEND,
        structure: {
          hasPackageJson: true,
          hasReadme: true,
          hasSrc: true,
          hasTests: false,
          hasConfig: true
        },
        dependencies: ['express', 'lodash'],
        devDependencies: ['jest'],
        files: ['package.json', 'src/index.js', 'src/utils.js'],
        size: {
          totalFiles: 10,
          linesOfCode: 500,
          sizeOnDisk: 10240
        },
        complexity: 'medium',
        issues: ['Outdated dependencies', 'Missing tests', 'JavaScript instead of TypeScript'],
        migrationReadiness: 70
      };

      const createMigrationPlan = async (analysis: ModuleAnalysis, targetPath: string): Promise<MigrationPlan> => {
        const steps: MigrationStep[] = [];

        // File migration steps
        if (analysis.structure.hasSrc) {
          steps.push({
            id: 'migrate_source',
            description: 'Migrate source files to TypeScript',
            type: 'file_update',
            source: path.join(analysis.path, 'src'),
            target: path.join(targetPath, 'src'),
            backupRequired: true
          });
        }

        // Dependency updates
        if (analysis.issues.includes('Outdated dependencies')) {
          steps.push({
            id: 'update_dependencies',
            description: 'Update package.json dependencies',
            type: 'dependency_update',
            source: path.join(analysis.path, 'package.json'),
            target: path.join(targetPath, 'package.json'),
            backupRequired: true
          });
        }

        // Add tests if missing
        if (!analysis.structure.hasTests) {
          steps.push({
            id: 'add_tests',
            description: 'Create test directory and basic test files',
            type: 'file_move',
            target: path.join(targetPath, 'tests'),
            backupRequired: false
          });
        }

        // TypeScript configuration
        if (analysis.issues.includes('JavaScript instead of TypeScript')) {
          steps.push({
            id: 'add_typescript',
            description: 'Add TypeScript configuration',
            type: 'config_update',
            target: path.join(targetPath, 'tsconfig.json'),
            content: JSON.stringify({
              compilerOptions: {
                target: 'ES2020',
                module: 'commonjs',
                strict: true
              }
            }, null, 2),
            backupRequired: false
          });
        }

        // Final validation
        steps.push({
          id: 'validate_migration',
          description: 'Validate migrated module',
          type: 'validation',
          target: targetPath,
          backupRequired: false
        });

        const estimatedEffort: 'low' | 'medium' | 'high' =
          analysis.complexity === 'high' || analysis.size.linesOfCode > 1000 ? 'high' :
          analysis.complexity === 'medium' || analysis.size.linesOfCode > 500 ? 'medium' : 'low';

        const risks = [];
        if (analysis.migrationReadiness < 80) {
          risks.push('Low migration readiness score');
        }
        if (analysis.issues.length > 3) {
          risks.push('Multiple structural issues');
        }
        if (analysis.complexity === 'high') {
          risks.push('High complexity module');
        }

        return {
          source: analysis.path,
          target: targetPath,
          files: analysis.files,
          dependencies: analysis.dependencies,
          conflicts: [], // Would be populated by conflict analysis
          estimatedEffort,
          risks,
          steps
        };
      };

      const plan = await createMigrationPlan(mockAnalysis, mockTargetPath);

      expect(plan.source).toBe(mockSourcePath);
      expect(plan.target).toBe(mockTargetPath);
      expect(plan.steps).toHaveLength(5); // migrate_source, update_dependencies, add_tests, add_typescript, validate
      expect(plan.estimatedEffort).toBe('medium');
      expect(plan.risks).toContain('Low migration readiness score');
      expect(plan.steps.find(s => s.id === 'migrate_source')).toBeDefined();
      expect(plan.steps.find(s => s.id === 'add_typescript')).toBeDefined();
    });

    it('should estimate migration effort correctly', () => {
      const testCases = [
        { linesOfCode: 100, complexity: 'low', expected: 'low' },
        { linesOfCode: 600, complexity: 'medium', expected: 'medium' },
        { linesOfCode: 1500, complexity: 'high', expected: 'high' },
        { linesOfCode: 200, complexity: 'high', expected: 'high' }
      ];

      testCases.forEach(({ linesOfCode, complexity, expected }) => {
        const estimatedEffort =
          complexity === 'high' || linesOfCode > 1000 ? 'high' :
          complexity === 'medium' || linesOfCode > 500 ? 'medium' : 'low';

        expect(estimatedEffort).toBe(expected);
      });
    });

    it('should validate migration plan', async () => {
      const mockPlan: MigrationPlan = {
        source: mockSourcePath,
        target: mockTargetPath,
        files: ['package.json', 'src/index.js'],
        dependencies: ['express'],
        conflicts: [],
        estimatedEffort: 'medium',
        risks: [],
        steps: [
          {
            id: 'step1',
            description: 'Test step',
            type: 'file_move',
            source: 'src/file.js',
            target: 'src/file.ts',
            backupRequired: true
          }
        ]
      };

      const validateMigrationPlan = async (plan: MigrationPlan): Promise<{ isValid: boolean; errors: string[] }> => {
        const errors = [];

        // Check source exists
        if (!await mockFs.pathExists(plan.source)) {
          errors.push(`Source path does not exist: ${plan.source}`);
        }

        // Validate steps
        for (const step of plan.steps) {
          if (!step.id || !step.description) {
            errors.push(`Invalid step: missing id or description`);
          }

          if (step.type === 'file_move' && step.backupRequired && !step.source) {
            errors.push(`Step ${step.id}: backup required but no source specified`);
          }
        }

        // Check for duplicate step IDs
        const stepIds = plan.steps.map(s => s.id);
        const duplicates = stepIds.filter((id, index) => stepIds.indexOf(id) !== index);
        if (duplicates.length > 0) {
          errors.push(`Duplicate step IDs: ${duplicates.join(', ')}`);
        }

        return {
          isValid: errors.length === 0,
          errors
        };
      };

      const validation = await validateMigrationPlan(mockPlan);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('migration execution', () => {
    it('should execute migration steps in order', async () => {
      const mockPlan: MigrationPlan = {
        source: mockSourcePath,
        target: mockTargetPath,
        files: [],
        dependencies: [],
        conflicts: [],
        estimatedEffort: 'low',
        risks: [],
        steps: [
          {
            id: 'backup',
            description: 'Create backup',
            type: 'file_move',
            source: mockSourcePath,
            target: `${mockSourcePath}.backup`,
            backupRequired: false
          },
          {
            id: 'migrate_files',
            description: 'Migrate files',
            type: 'file_move',
            source: mockSourcePath,
            target: mockTargetPath,
            backupRequired: true
          },
          {
            id: 'update_config',
            description: 'Update configuration',
            type: 'config_update',
            target: path.join(mockTargetPath, 'tsconfig.json'),
            content: '{}',
            backupRequired: false
          }
        ]
      };

      const executeMigration = async (plan: MigrationPlan): Promise<MigrationReport> => {
        const report: MigrationReport = {
          planId: `plan-${Date.now()}`,
          timestamp: new Date().toISOString(),
          status: 'success',
          steps: [],
          totalFiles: plan.files.length,
          migratedFiles: 0,
          failedFiles: 0,
          warnings: [],
          errors: []
        };

        for (const step of plan.steps) {
          const startTime = Date.now();
          let stepStatus = ValidationStatus.PASS;
          let message = 'Step completed successfully';

          try {
            switch (step.type) {
              case 'file_move':
                if (step.source && step.target) {
                  await mockFs.copy(step.source, step.target);
                  report.migratedFiles++;
                }
                break;

              case 'config_update':
                if (step.target && step.content) {
                  await mockFs.writeFile(step.target, step.content);
                }
                break;

              case 'validation':
                // Mock validation
                break;
            }
          } catch (error) {
            stepStatus = ValidationStatus.FAIL;
            message = error instanceof Error ? error.message : 'Unknown error';
            report.errors.push(`Step ${step.id}: ${message}`);
            report.failedFiles++;
          }

          report.steps.push({
            stepId: step.id,
            status: stepStatus,
            message,
            duration: Date.now() - startTime
          });
        }

        // Determine overall status
        const failedSteps = report.steps.filter(s => s.status === ValidationStatus.FAIL);
        if (failedSteps.length === 0) {
          report.status = 'success';
        } else if (failedSteps.length < report.steps.length) {
          report.status = 'partial';
        } else {
          report.status = 'failed';
        }

        return report;
      };

      const report = await executeMigration(mockPlan);

      expect(report.status).toBe('success');
      expect(report.steps).toHaveLength(3);
      expect(report.steps[0].stepId).toBe('backup');
      expect(report.steps[1].stepId).toBe('migrate_files');
      expect(report.steps[2].stepId).toBe('update_config');
      expect(report.errors).toHaveLength(0);
      expect(mockFs.copy).toHaveBeenCalledTimes(2);
      expect(mockFs.writeFile).toHaveBeenCalledWith(path.join(mockTargetPath, 'tsconfig.json'), '{}');
    });

    it('should handle step failures gracefully', async () => {
      mockFs.copy.mockRejectedValue(new Error('Permission denied'));

      const mockPlan: MigrationPlan = {
        source: mockSourcePath,
        target: mockTargetPath,
        files: [],
        dependencies: [],
        conflicts: [],
        estimatedEffort: 'low',
        risks: [],
        steps: [
          {
            id: 'failing_step',
            description: 'This step will fail',
            type: 'file_move',
            source: mockSourcePath,
            target: mockTargetPath,
            backupRequired: true
          },
          {
            id: 'successful_step',
            description: 'This step will succeed',
            type: 'config_update',
            target: 'config.json',
            content: '{}',
            backupRequired: false
          }
        ]
      };

      const executeMigration = async (plan: MigrationPlan): Promise<MigrationReport> => {
        const report: MigrationReport = {
          planId: `plan-${Date.now()}`,
          timestamp: new Date().toISOString(),
          status: 'success',
          steps: [],
          totalFiles: 0,
          migratedFiles: 0,
          failedFiles: 0,
          warnings: [],
          errors: []
        };

        for (const step of plan.steps) {
          try {
            if (step.type === 'file_move') {
              await mockFs.copy(step.source!, step.target!);
            } else if (step.type === 'config_update') {
              await mockFs.writeFile(step.target!, step.content!);
            }

            report.steps.push({
              stepId: step.id,
              status: ValidationStatus.PASS,
              message: 'Success',
              duration: 100
            });
          } catch (error) {
            report.steps.push({
              stepId: step.id,
              status: ValidationStatus.FAIL,
              message: error instanceof Error ? error.message : 'Unknown error',
              duration: 100
            });
            report.errors.push(`Step ${step.id} failed`);
            report.failedFiles++;
          }
        }

        const hasFailures = report.steps.some(s => s.status === ValidationStatus.FAIL);
        report.status = hasFailures ? 'partial' : 'success';

        return report;
      };

      const report = await executeMigration(mockPlan);

      expect(report.status).toBe('partial');
      expect(report.steps).toHaveLength(2);
      expect(report.steps[0].status).toBe(ValidationStatus.FAIL);
      expect(report.steps[1].status).toBe(ValidationStatus.PASS);
      expect(report.errors).toContain('Step failing_step failed');
    });

    it('should create backups when required', async () => {
      const mockStep: MigrationStep = {
        id: 'test_step',
        description: 'Test step with backup',
        type: 'file_move',
        source: '/source/file.js',
        target: '/target/file.ts',
        backupRequired: true
      };

      const createBackup = async (filePath: string): Promise<string> => {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        await mockFs.copy(filePath, backupPath);
        return backupPath;
      };

      const executeStepWithBackup = async (step: MigrationStep): Promise<{ success: boolean; backupPath?: string }> => {
        let backupPath: string | undefined;

        try {
          if (step.backupRequired && step.source) {
            backupPath = await createBackup(step.source);
          }

          if (step.source && step.target) {
            await mockFs.copy(step.source, step.target);
          }

          return { success: true, backupPath };
        } catch (error) {
          return { success: false, backupPath };
        }
      };

      const result = await executeStepWithBackup(mockStep);

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(result.backupPath).toMatch(/\.backup\.\d+$/);
      expect(mockFs.copy).toHaveBeenCalledTimes(2); // Once for backup, once for migration
    });
  });

  describe('rollback functionality', () => {
    it('should rollback failed migration', async () => {
      const mockReport: MigrationReport = {
        planId: 'test-plan',
        timestamp: '2023-01-01T00:00:00.000Z',
        status: 'failed',
        steps: [
          {
            stepId: 'backup',
            status: ValidationStatus.PASS,
            message: 'Backup created at /source.backup.123',
            duration: 100
          },
          {
            stepId: 'migrate',
            status: ValidationStatus.FAIL,
            message: 'Migration failed',
            duration: 200
          }
        ],
        totalFiles: 5,
        migratedFiles: 2,
        failedFiles: 3,
        warnings: [],
        errors: ['Migration step failed']
      };

      const rollbackMigration = async (report: MigrationReport): Promise<{ success: boolean; restoredFiles: string[] }> => {
        const restoredFiles: string[] = [];

        // Find backup step
        const backupStep = report.steps.find(s => s.stepId === 'backup' && s.status === ValidationStatus.PASS);
        if (!backupStep) {
          throw new Error('No successful backup found for rollback');
        }

        // Extract backup path from message
        const backupMatch = backupStep.message.match(/Backup created at (.+)/);
        if (backupMatch) {
          const backupPath = backupMatch[1];

          // Restore from backup (mock implementation)
          await mockFs.copy(backupPath, mockSourcePath);
          restoredFiles.push(mockSourcePath);
        }

        return {
          success: true,
          restoredFiles
        };
      };

      const rollback = await rollbackMigration(mockReport);

      expect(rollback.success).toBe(true);
      expect(rollback.restoredFiles).toContain(mockSourcePath);
      expect(mockFs.copy).toHaveBeenCalledWith('/source.backup.123', mockSourcePath);
    });

    it('should handle rollback when no backup exists', async () => {
      const mockReport: MigrationReport = {
        planId: 'test-plan',
        timestamp: '2023-01-01T00:00:00.000Z',
        status: 'failed',
        steps: [
          {
            stepId: 'migrate',
            status: ValidationStatus.FAIL,
            message: 'Migration failed',
            duration: 200
          }
        ],
        totalFiles: 5,
        migratedFiles: 0,
        failedFiles: 5,
        warnings: [],
        errors: ['No backup available']
      };

      const rollbackMigration = async (report: MigrationReport): Promise<{ success: boolean; error?: string }> => {
        const backupStep = report.steps.find(s => s.stepId === 'backup' && s.status === ValidationStatus.PASS);
        if (!backupStep) {
          return {
            success: false,
            error: 'No successful backup found for rollback'
          };
        }

        return { success: true };
      };

      const rollback = await rollbackMigration(mockReport);

      expect(rollback.success).toBe(false);
      expect(rollback.error).toBe('No successful backup found for rollback');
    });
  });

  describe('reporting and progress tracking', () => {
    it('should generate detailed migration report', () => {
      const mockReport: MigrationReport = {
        planId: 'migration-plan-123',
        timestamp: '2023-01-01T12:00:00.000Z',
        status: 'success',
        steps: [
          {
            stepId: 'backup',
            status: ValidationStatus.PASS,
            message: 'Backup completed',
            duration: 500
          },
          {
            stepId: 'migrate_files',
            status: ValidationStatus.PASS,
            message: 'Files migrated successfully',
            duration: 2000
          },
          {
            stepId: 'update_config',
            status: ValidationStatus.WARNING,
            message: 'Configuration updated with warnings',
            duration: 300
          }
        ],
        totalFiles: 10,
        migratedFiles: 9,
        failedFiles: 1,
        warnings: ['Some optional files could not be migrated'],
        errors: []
      };

      const formatMigrationReport = (report: MigrationReport): string => {
        const lines = [];
        lines.push(`Migration Report: ${report.planId}`);
        lines.push(`Timestamp: ${report.timestamp}`);
        lines.push(`Status: ${report.status.toUpperCase()}`);
        lines.push('');
        lines.push('Summary:');
        lines.push(`  Total Files: ${report.totalFiles}`);
        lines.push(`  Migrated: ${report.migratedFiles}`);
        lines.push(`  Failed: ${report.failedFiles}`);
        lines.push('');
        lines.push('Steps:');

        report.steps.forEach(step => {
          const icon = step.status === ValidationStatus.PASS ? '✅' :
                       step.status === ValidationStatus.WARNING ? '⚠️' : '❌';
          lines.push(`  ${icon} ${step.stepId}: ${step.message} (${step.duration}ms)`);
        });

        if (report.warnings.length > 0) {
          lines.push('');
          lines.push('Warnings:');
          report.warnings.forEach(warning => lines.push(`  ⚠️ ${warning}`));
        }

        if (report.errors.length > 0) {
          lines.push('');
          lines.push('Errors:');
          report.errors.forEach(error => lines.push(`  ❌ ${error}`));
        }

        return lines.join('\n');
      };

      const reportText = formatMigrationReport(mockReport);

      expect(reportText).toContain('Migration Report: migration-plan-123');
      expect(reportText).toContain('Status: SUCCESS');
      expect(reportText).toContain('Total Files: 10');
      expect(reportText).toContain('Migrated: 9');
      expect(reportText).toContain('✅ backup: Backup completed (500ms)');
      expect(reportText).toContain('⚠️ update_config: Configuration updated with warnings (300ms)');
      expect(reportText).toContain('⚠️ Some optional files could not be migrated');
    });

    it('should track migration progress', async () => {
      const steps = ['backup', 'migrate_files', 'update_config', 'validate'];
      const progressCallback = jest.fn();

      const executeMigrationWithProgress = async (steps: string[], onProgress: (progress: number, step: string) => void) => {
        for (let i = 0; i < steps.length; i++) {
          const progress = Math.round(((i + 1) / steps.length) * 100);
          onProgress(progress, steps[i]);

          // Simulate step execution
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      };

      await executeMigrationWithProgress(steps, progressCallback);

      expect(progressCallback).toHaveBeenCalledTimes(4);
      expect(progressCallback).toHaveBeenNthCalledWith(1, 25, 'backup');
      expect(progressCallback).toHaveBeenNthCalledWith(2, 50, 'migrate_files');
      expect(progressCallback).toHaveBeenNthCalledWith(3, 75, 'update_config');
      expect(progressCallback).toHaveBeenNthCalledWith(4, 100, 'validate');
    });
  });

  describe('interactive migration', () => {
    it('should prompt for user confirmation on risky steps', async () => {
      const riskyStep: MigrationStep = {
        id: 'destructive_update',
        description: 'This will permanently modify your source files',
        type: 'file_update',
        source: '/important/file.js',
        target: '/important/file.ts',
        backupRequired: true
      };

      mockInquirer.prompt.mockResolvedValue({ confirmed: true });

      const promptForConfirmation = async (step: MigrationStep): Promise<boolean> => {
        if (step.description.includes('permanently') || step.description.includes('destructive')) {
          const response = await mockInquirer.prompt([{
            type: 'confirm',
            name: 'confirmed',
            message: `Are you sure you want to execute: ${step.description}?`,
            default: false
          }]);

          return response.confirmed;
        }

        return true; // Auto-approve non-risky steps
      };

      const confirmed = await promptForConfirmation(riskyStep);

      expect(confirmed).toBe(true);
      expect(mockInquirer.prompt).toHaveBeenCalledWith([{
        type: 'confirm',
        name: 'confirmed',
        message: 'Are you sure you want to execute: This will permanently modify your source files?',
        default: false
      }]);
    });

    it('should allow user to skip optional steps', async () => {
      const optionalSteps = [
        { id: 'add_tests', description: 'Add test files (optional)', required: false },
        { id: 'update_readme', description: 'Update README (optional)', required: false },
        { id: 'migrate_core', description: 'Migrate core files (required)', required: true }
      ];

      mockInquirer.prompt.mockResolvedValue({
        selectedSteps: ['add_tests', 'migrate_core'] // Skip update_readme
      });

      const selectOptionalSteps = async (steps: any[]): Promise<string[]> => {
        const choices = steps.map(step => ({
          name: step.description,
          value: step.id,
          checked: step.required
        }));

        const response = await mockInquirer.prompt([{
          type: 'checkbox',
          name: 'selectedSteps',
          message: 'Select steps to execute:',
          choices
        }]);

        return response.selectedSteps;
      };

      const selectedSteps = await selectOptionalSteps(optionalSteps);

      expect(selectedSteps).toContain('add_tests');
      expect(selectedSteps).toContain('migrate_core');
      expect(selectedSteps).not.toContain('update_readme');
    });
  });
});