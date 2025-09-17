import { AutoFixService, AutoFixOptions, FixStrategy } from '../../src/services/AutoFixService.js';
import { ValidationResult } from '../../src/models/ValidationReport.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { jest } from '@jest/globals';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('AutoFixService', () => {
  let autoFixService: AutoFixService;
  let tempDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = '/tmp/auto-fix-test';
    autoFixService = new AutoFixService(tempDir);
  });

  describe('initialization', () => {
    it('should initialize with built-in fix strategies', () => {
      const strategies = autoFixService.getFixStrategies();

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.some(s => s.ruleId === 'fileSize')).toBe(true);
      expect(strategies.some(s => s.ruleId === 'trailingWhitespace')).toBe(true);
      expect(strategies.some(s => s.ruleId === 'inconsistentIndentation')).toBe(true);
    });

    it('should allow custom backup directory', () => {
      const customDir = '/custom/backup/path';
      const service = new AutoFixService(customDir);
      expect(service).toBeInstanceOf(AutoFixService);
    });
  });

  describe('strategy registration', () => {
    it('should register custom fix strategy', () => {
      const customStrategy: FixStrategy = {
        ruleId: 'customRule',
        description: 'Custom fix',
        canAutoFix: async () => true,
        applyFix: async () => ({
          fixId: 'test',
          ruleId: 'customRule',
          modulePath: '',
          filePath: '',
          status: 'success',
          appliedFixes: [],
          performanceMetrics: {
            operation: 'test',
            startTime: new Date(),
            endTime: new Date(),
            duration: 0,
            customMetrics: {}
          }
        }),
        riskLevel: 'low',
        category: 'formatting'
      };

      autoFixService.registerFixStrategy(customStrategy);
      const strategies = autoFixService.getFixStrategies();

      expect(strategies.some(s => s.ruleId === 'customRule')).toBe(true);
    });
  });

  describe('canAutoFix', () => {
    it('should return false for unknown rule', async () => {
      const violation: ValidationResult = {
        ruleId: 'unknownRule',
        status: 'FAIL',
        severity: 'error',
        message: 'Test violation',
        details: {}
      };

      const canFix = await autoFixService.canAutoFix(violation, '/test/module');
      expect(canFix).toBe(false);
    });

    it('should return true for trailingWhitespace rule', async () => {
      const violation: ValidationResult = {
        ruleId: 'trailingWhitespace',
        status: 'FAIL',
        severity: 'warning',
        message: 'Trailing whitespace found',
        details: { filePath: 'test.ts' }
      };

      const canFix = await autoFixService.canAutoFix(violation, '/test/module');
      expect(canFix).toBe(true);
    });

    it('should handle strategy errors gracefully', async () => {
      const faultyStrategy: FixStrategy = {
        ruleId: 'faultyRule',
        description: 'Faulty fix',
        canAutoFix: async () => { throw new Error('Test error'); },
        applyFix: async () => { throw new Error('Test error'); },
        riskLevel: 'low',
        category: 'formatting'
      };

      autoFixService.registerFixStrategy(faultyStrategy);

      const violation: ValidationResult = {
        ruleId: 'faultyRule',
        status: 'FAIL',
        severity: 'error',
        message: 'Test violation',
        details: {}
      };

      const canFix = await autoFixService.canAutoFix(violation, '/test/module');
      expect(canFix).toBe(false);
    });
  });

  describe('applyAutoFix', () => {
    it('should skip unknown rules', async () => {
      const violation: ValidationResult = {
        ruleId: 'unknownRule',
        status: 'FAIL',
        severity: 'error',
        message: 'Test violation',
        details: {}
      };

      const result = await autoFixService.applyAutoFix(violation, '/test/module');

      expect(result.status).toBe('skipped');
      expect(result.errorMessage).toBe('No fix strategy available');
      expect(result.ruleId).toBe('unknownRule');
    });

    it('should skip rules in skipRules option', async () => {
      const violation: ValidationResult = {
        ruleId: 'trailingWhitespace',
        status: 'FAIL',
        severity: 'warning',
        message: 'Trailing whitespace',
        details: { filePath: 'test.ts' }
      };

      const options: AutoFixOptions = {
        skipRules: ['trailingWhitespace']
      };

      const result = await autoFixService.applyAutoFix(violation, '/test/module', options);

      expect(result.status).toBe('skipped');
      expect(result.errorMessage).toBe('Rule explicitly skipped');
    });

    it('should only include rules in includeRules option', async () => {
      const violation: ValidationResult = {
        ruleId: 'trailingWhitespace',
        status: 'FAIL',
        severity: 'warning',
        message: 'Trailing whitespace',
        details: { filePath: 'test.ts' }
      };

      const options: AutoFixOptions = {
        includeRules: ['inconsistentIndentation']
      };

      const result = await autoFixService.applyAutoFix(violation, '/test/module', options);

      expect(result.status).toBe('skipped');
      expect(result.errorMessage).toBe('Rule not in include list');
    });

    it('should handle fix application failures gracefully', async () => {
      const faultyStrategy: FixStrategy = {
        ruleId: 'faultyFix',
        description: 'Faulty fix',
        canAutoFix: async () => true,
        applyFix: async () => { throw new Error('Fix failed'); },
        riskLevel: 'low',
        category: 'formatting'
      };

      autoFixService.registerFixStrategy(faultyStrategy);

      const violation: ValidationResult = {
        ruleId: 'faultyFix',
        status: 'FAIL',
        severity: 'error',
        message: 'Test violation',
        details: {}
      };

      const result = await autoFixService.applyAutoFix(violation, '/test/module');

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('Failed to apply fix');
    });
  });

  describe('trailing whitespace fix', () => {
    it('should remove trailing whitespace in dry run mode', async () => {
      const fileContent = 'line1   \nline2\t\nline3\n';
      mockFs.readFile.mockResolvedValue(fileContent);

      const violation: ValidationResult = {
        ruleId: 'trailingWhitespace',
        status: 'FAIL',
        severity: 'warning',
        message: 'Trailing whitespace found',
        details: { filePath: 'test.ts' }
      };

      const options: AutoFixOptions = { dryRun: true };
      const result = await autoFixService.applyAutoFix(violation, '/test/module', options);

      expect(result.status).toBe('success');
      expect(result.appliedFixes).toHaveLength(2); // Two lines with trailing whitespace
      expect(result.appliedFixes[0].description).toBe('Remove trailing whitespace');
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should actually remove trailing whitespace when not in dry run', async () => {
      const fileContent = 'line1   \nline2\t\nline3\n';
      const expectedContent = 'line1\nline2\nline3\n';
      mockFs.readFile.mockResolvedValue(fileContent);
      mockFs.mkdir.mockResolvedValue(undefined);

      const violation: ValidationResult = {
        ruleId: 'trailingWhitespace',
        status: 'FAIL',
        severity: 'warning',
        message: 'Trailing whitespace found',
        details: { filePath: 'test.ts' }
      };

      const result = await autoFixService.applyAutoFix(violation, '/test/module');

      expect(result.status).toBe('success');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.resolve('/test/module', 'test.ts'),
        expectedContent
      );
    });
  });

  describe('indentation fix', () => {
    it('should fix inconsistent indentation to spaces', async () => {
      const fileContent = '  function test() {\n\tif (true) {\n    return;\n\t}\n  }';
      mockFs.readFile.mockResolvedValue(fileContent);
      mockFs.mkdir.mockResolvedValue(undefined);

      const violation: ValidationResult = {
        ruleId: 'inconsistentIndentation',
        status: 'FAIL',
        severity: 'warning',
        message: 'Inconsistent indentation',
        details: { filePath: 'test.ts' }
      };

      const result = await autoFixService.applyAutoFix(violation, '/test/module');

      expect(result.status).toBe('success');
      expect(result.appliedFixes[0].description).toContain('spaces');
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('documentation generation', () => {
    it('should generate documentation stub', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);

      const violation: ValidationResult = {
        ruleId: 'missingDocumentation',
        status: 'FAIL',
        severity: 'warning',
        message: 'Missing documentation',
        details: {
          filePath: 'README.md',
          canGenerateStub: true
        }
      };

      const result = await autoFixService.applyAutoFix(violation, '/test/my-module');

      expect(result.status).toBe('success');
      expect(result.appliedFixes[0].description).toBe('Generated documentation stub');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('README.md'),
        expect.stringContaining('# my-module')
      );
    });
  });

  describe('package.json generation', () => {
    it('should generate package.json when missing', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const violation: ValidationResult = {
        ruleId: 'packageJsonMissing',
        status: 'FAIL',
        severity: 'error',
        message: 'Missing package.json',
        details: {}
      };

      const result = await autoFixService.applyAutoFix(violation, '/test/my-module');

      expect(result.status).toBe('success');
      expect(result.appliedFixes[0].description).toBe('Generated package.json file');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        expect.stringContaining('"name": "my-module"')
      );
    });

    it('should skip when package.json already exists', async () => {
      mockFs.access.mockResolvedValue(undefined); // File exists

      const violation: ValidationResult = {
        ruleId: 'packageJsonMissing',
        status: 'FAIL',
        severity: 'error',
        message: 'Missing package.json',
        details: {}
      };

      const result = await autoFixService.applyAutoFix(violation, '/test/module');

      expect(result.status).toBe('skipped');
      expect(result.errorMessage).toBe('Violation cannot be automatically fixed');
    });
  });

  describe('batch auto-fix', () => {
    it('should process multiple violations', async () => {
      const violations: ValidationResult[] = [
        {
          ruleId: 'trailingWhitespace',
          status: 'FAIL',
          severity: 'warning',
          message: 'Trailing whitespace',
          details: { filePath: 'test1.ts' }
        },
        {
          ruleId: 'inconsistentIndentation',
          status: 'FAIL',
          severity: 'warning',
          message: 'Inconsistent indentation',
          details: { filePath: 'test2.ts' }
        },
        {
          ruleId: 'unknownRule',
          status: 'FAIL',
          severity: 'error',
          message: 'Unknown violation',
          details: {}
        }
      ];

      mockFs.readFile.mockResolvedValue('test content\n');
      mockFs.mkdir.mockResolvedValue(undefined);

      const result = await autoFixService.applyBatchAutoFix(violations, '/test/module');

      expect(result.summary.totalViolations).toBe(3);
      expect(result.summary.fixedViolations).toBe(2); // Two fixable violations
      expect(result.summary.skippedViolations).toBe(1); // One unknown rule
      expect(result.results).toHaveLength(2); // Only fixable violations processed
    });

    it('should respect maxFilesToFix option', async () => {
      const violations: ValidationResult[] = [
        {
          ruleId: 'trailingWhitespace',
          status: 'FAIL',
          severity: 'warning',
          message: 'Trailing whitespace',
          details: { filePath: 'test1.ts' }
        },
        {
          ruleId: 'trailingWhitespace',
          status: 'FAIL',
          severity: 'warning',
          message: 'Trailing whitespace',
          details: { filePath: 'test2.ts' }
        }
      ];

      mockFs.readFile.mockResolvedValue('test content\n');
      mockFs.mkdir.mockResolvedValue(undefined);

      const options: AutoFixOptions = { maxFilesToFix: 1 };
      const result = await autoFixService.applyBatchAutoFix(violations, '/test/module', options);

      expect(result.results).toHaveLength(1); // Only one fix applied
      expect(result.summary.fixedViolations).toBe(1);
    });
  });

  describe('backup functionality', () => {
    it('should create backup before modifying files', async () => {
      const originalFile = '/test/module/test.ts';
      const fileContent = 'test content   \n';

      mockFs.readFile.mockResolvedValue(fileContent);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.copyFile.mockResolvedValue(undefined);

      const violation: ValidationResult = {
        ruleId: 'trailingWhitespace',
        status: 'FAIL',
        severity: 'warning',
        message: 'Trailing whitespace',
        details: { filePath: 'test.ts' }
      };

      const result = await autoFixService.applyAutoFix(violation, '/test/module');

      expect(result.backupPath).toBeDefined();
      expect(mockFs.copyFile).toHaveBeenCalledWith(
        originalFile,
        expect.stringContaining('.backup')
      );
    });

    it('should skip backup when disabled', async () => {
      mockFs.readFile.mockResolvedValue('test content   \n');

      const violation: ValidationResult = {
        ruleId: 'trailingWhitespace',
        status: 'FAIL',
        severity: 'warning',
        message: 'Trailing whitespace',
        details: { filePath: 'test.ts' }
      };

      const options: AutoFixOptions = { backupFiles: false };
      const result = await autoFixService.applyAutoFix(violation, '/test/module', options);

      expect(result.backupPath).toBeUndefined();
      expect(mockFs.copyFile).not.toHaveBeenCalled();
    });

    it('should restore from backup', async () => {
      const backupPath = '/backup/test.ts.backup';
      const originalPath = '/test/module/test.ts';

      await autoFixService.restoreFromBackup(backupPath, originalPath);

      expect(mockFs.copyFile).toHaveBeenCalledWith(backupPath, originalPath);
    });
  });

  describe('security vulnerability fixes', () => {
    it('should update vulnerable dependencies', async () => {
      const packageContent = JSON.stringify({
        name: 'test-module',
        dependencies: {
          'vulnerable-package': '^1.0.0',
          'safe-package': '^2.0.0'
        }
      });

      mockFs.readFile.mockResolvedValue(packageContent);
      mockFs.mkdir.mockResolvedValue(undefined);

      const violation: ValidationResult = {
        ruleId: 'securityVulnerability',
        status: 'FAIL',
        severity: 'critical',
        message: 'Security vulnerability found',
        details: {
          hasSecurityFix: true,
          vulnerableDependencies: [
            { name: 'vulnerable-package', fixVersion: '^1.2.0' }
          ]
        }
      };

      const result = await autoFixService.applyAutoFix(violation, '/test/module');

      expect(result.status).toBe('success');
      expect(result.appliedFixes).toHaveLength(1);
      expect(result.appliedFixes[0].description).toContain('Updated vulnerable-package');

      const writtenContent = (mockFs.writeFile as jest.Mock).mock.calls[0][1];
      const updatedPackage = JSON.parse(writtenContent);
      expect(updatedPackage.dependencies['vulnerable-package']).toBe('^1.2.0');
    });
  });

  describe('file splitting', () => {
    it('should split large files with multiple exports', async () => {
      const largeFileContent = `
import { something } from 'somewhere';

export class ClassA {
  method() {
    return 'A';
  }
}

export function functionB() {
  return 'B';
}

export const constantC = 'C';
`;

      mockFs.readFile.mockResolvedValue(largeFileContent);
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);

      const violation: ValidationResult = {
        ruleId: 'fileSize',
        status: 'FAIL',
        severity: 'warning',
        message: 'File too large',
        details: { filePath: 'large-file.ts' }
      };

      const options: AutoFixOptions = { dryRun: true };
      const result = await autoFixService.applyAutoFix(violation, '/test/module', options);

      expect(result.status).toBe('success');
      expect(result.appliedFixes[0].description).toContain('split large file');
    });
  });
});