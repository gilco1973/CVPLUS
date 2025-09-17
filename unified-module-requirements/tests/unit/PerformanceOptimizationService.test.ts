import { PerformanceOptimizationService } from '../../src/services/PerformanceOptimizationService.js';
import { OptimizationOptions, PerformanceProfile, OptimizationLevel } from '../../src/types/performance.js';
import { ValidationResult } from '../../src/types/validation.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { jest } from '@jest/globals';

// Mock fs/promises
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock path
jest.mock('path');
const mockPath = path as jest.Mocked<typeof path>;

describe('PerformanceOptimizationService', () => {
  let service: PerformanceOptimizationService;

  beforeEach(() => {
    service = new PerformanceOptimizationService();
    jest.clearAllMocks();

    // Setup default mocks
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.relative.mockImplementation((from, to) => to);
    mockPath.extname.mockImplementation((filePath) => {
      const lastDot = filePath.lastIndexOf('.');
      return lastDot >= 0 ? filePath.substring(lastDot) : '';
    });
    mockPath.basename.mockImplementation((filePath) => {
      return filePath.split('/').pop() || filePath;
    });
  });

  describe('analyzePerformance', () => {
    it('should analyze performance with default options', async () => {
      // Mock file system structure
      mockFs.readdir.mockResolvedValueOnce([
        { name: 'src', isDirectory: () => true } as any,
        { name: 'package.json', isDirectory: () => false } as any,
        { name: 'index.ts', isDirectory: () => false } as any
      ]);

      mockFs.readdir.mockResolvedValueOnce([
        { name: 'service.ts', isDirectory: () => false } as any,
        { name: 'utils.ts', isDirectory: () => false } as any
      ]);

      mockFs.stat.mockImplementation(async (filePath) => ({
        isDirectory: () => (filePath as string).endsWith('src'),
        isFile: () => !(filePath as string).endsWith('src'),
        size: 1024
      } as any));

      mockFs.readFile.mockImplementation(async (filePath) => {
        if ((filePath as string).endsWith('package.json')) {
          return JSON.stringify({
            dependencies: { lodash: '^4.17.21' },
            devDependencies: { jest: '^29.0.0' }
          });
        }
        return 'export const test = "hello";';
      });

      const result = await service.analyzePerformance('/test/module');

      expect(result).toBeDefined();
      expect(result.moduleId).toBe('/test/module');
      expect(result.metrics).toBeDefined();
      expect(result.metrics.fileSystem).toBeDefined();
      expect(result.metrics.dependencies).toBeDefined();
      expect(result.bottlenecks).toBeDefined();
      expect(result.optimizations).toBeDefined();
      expect(result.performanceScore).toBeGreaterThanOrEqual(0);
      expect(result.performanceScore).toBeLessThanOrEqual(100);
    });

    it('should handle empty directories', async () => {
      mockFs.readdir.mockResolvedValue([]);
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        isFile: () => false,
        size: 0
      } as any);

      const result = await service.analyzePerformance('/empty/module');

      expect(result.metrics.fileSystem.totalFiles).toBe(0);
      expect(result.metrics.fileSystem.totalSizeBytes).toBe(0);
      expect(result.performanceScore).toBeGreaterThan(80); // Empty should score well
    });

    it('should identify large files as bottlenecks', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'large-file.ts', isDirectory: () => false } as any
      ]);

      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 50 * 1024 * 1024 // 50MB file
      } as any);

      mockFs.readFile.mockResolvedValue('// Large file content');

      const result = await service.analyzePerformance('/test/module');

      const fileSizeBottlenecks = result.bottlenecks.filter(b => b.type === 'file_size');
      expect(fileSizeBottlenecks.length).toBeGreaterThan(0);
      expect(fileSizeBottlenecks[0].severity).toBe('high');
    });

    it('should identify memory usage issues', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'memory-heavy.ts', isDirectory: () => false } as any
      ]);

      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 1024
      } as any);

      // Mock file with memory-intensive patterns
      mockFs.readFile.mockResolvedValue(`
        const largeArray = new Array(1000000);
        const memoryLeak = setInterval(() => {
          // Memory leak pattern
        }, 100);
        const globalVar = [];
        for(let i = 0; i < 1000000; i++) {
          globalVar.push(new Object());
        }
      `);

      const result = await service.analyzePerformance('/test/module');

      const memoryBottlenecks = result.bottlenecks.filter(b => b.type === 'memory_usage');
      expect(memoryBottlenecks.length).toBeGreaterThan(0);
    });

    it('should identify CPU usage issues', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'cpu-heavy.ts', isDirectory: () => false } as any
      ]);

      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 1024
      } as any);

      // Mock file with CPU-intensive patterns
      mockFs.readFile.mockResolvedValue(`
        while(true) {
          // Infinite loop
        }
        for(let i = 0; i < 1000000; i++) {
          for(let j = 0; j < 1000; j++) {
            // Nested loops
          }
        }
        setInterval(() => {}, 1); // High frequency interval
      `);

      const result = await service.analyzePerformance('/test/module');

      const cpuBottlenecks = result.bottlenecks.filter(b => b.type === 'cpu_usage');
      expect(cpuBottlenecks.length).toBeGreaterThan(0);
    });

    it('should analyze network usage patterns', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'network.ts', isDirectory: () => false } as any
      ]);

      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 1024
      } as any);

      mockFs.readFile.mockResolvedValue(`
        fetch('http://api.example.com');
        axios.get('http://api.example.com');
        request('http://api.example.com');
        for(let i = 0; i < 100; i++) {
          fetch('http://api.example.com/' + i);
        }
      `);

      const result = await service.analyzePerformance('/test/module');

      expect(result.metrics.network.requestCount).toBeGreaterThan(0);
      expect(result.metrics.network.patterns.some(p => p.includes('fetch'))).toBe(true);
    });

    it('should analyze bundle size issues', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'bundle.ts', isDirectory: () => false } as any
      ]);

      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 1024
      } as any);

      mockFs.readFile.mockResolvedValue(`
        import * as lodash from 'lodash';
        import * as moment from 'moment';
        import { entire } from 'large-library';
      `);

      const result = await service.analyzePerformance('/test/module');

      expect(result.metrics.bundleSize.imports.length).toBeGreaterThan(0);
      expect(result.metrics.bundleSize.heavyImports.length).toBeGreaterThan(0);
    });

    it('should analyze dependency performance', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'package.json', isDirectory: () => false } as any
      ]);

      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 1024
      } as any);

      mockFs.readFile.mockResolvedValue(JSON.stringify({
        dependencies: {
          'lodash': '^4.17.21',
          'moment': '^2.29.4', // Known heavy dependency
          'express': '^4.18.2'
        },
        devDependencies: {
          'jest': '^29.0.0',
          'typescript': '^5.0.0'
        }
      }));

      const result = await service.analyzePerformance('/test/module');

      expect(result.metrics.dependencies.totalDependencies).toBe(3);
      expect(result.metrics.dependencies.heavyDependencies.length).toBeGreaterThan(0);
    });
  });

  describe('generateOptimizations', () => {
    it('should generate file size optimizations', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'large-file.ts', isDirectory: () => false } as any
      ]);

      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 100 * 1024 // 100KB file
      } as any);

      mockFs.readFile.mockResolvedValue('// Large file content with lots of code');

      const result = await service.analyzePerformance('/test/module');

      const fileSizeOptimizations = result.optimizations.filter(o => o.category === 'file_size');
      expect(fileSizeOptimizations.length).toBeGreaterThan(0);
      expect(fileSizeOptimizations[0].impact).toBe('medium');
    });

    it('should generate memory optimizations', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'memory.ts', isDirectory: () => false } as any
      ]);

      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 1024
      } as any);

      mockFs.readFile.mockResolvedValue(`
        const largeArray = new Array(1000000);
        setInterval(() => {}, 100);
      `);

      const result = await service.analyzePerformance('/test/module');

      const memoryOptimizations = result.optimizations.filter(o => o.category === 'memory');
      expect(memoryOptimizations.length).toBeGreaterThan(0);
    });

    it('should generate dependency optimizations', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'package.json', isDirectory: () => false } as any
      ]);

      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 1024
      } as any);

      mockFs.readFile.mockResolvedValue(JSON.stringify({
        dependencies: {
          'moment': '^2.29.4', // Heavy dependency
          'lodash': '^4.17.21'
        }
      }));

      const result = await service.analyzePerformance('/test/module');

      const depOptimizations = result.optimizations.filter(o => o.category === 'dependencies');
      expect(depOptimizations.length).toBeGreaterThan(0);
    });
  });

  describe('applyOptimization', () => {
    it('should apply file size optimization in dry run mode', async () => {
      mockFs.readFile.mockResolvedValue('// Original content with lots of whitespace   \n\n\n');

      const optimization = {
        id: 'opt-001',
        category: 'file_size' as const,
        title: 'Remove excessive whitespace',
        description: 'Remove trailing whitespace and empty lines',
        impact: 'low' as const,
        effort: 'low' as const,
        riskLevel: 'low' as const,
        autoApplicable: true,
        estimatedSavings: {
          fileSizeReduction: '10%',
          performanceGain: '2%'
        },
        implementation: {
          strategy: 'whitespace_cleanup',
          targetFiles: ['/test/file.ts'],
          changes: ['Remove trailing whitespace', 'Remove excessive empty lines']
        }
      };

      const result = await service.applyOptimization(optimization, '/test/module', { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.applied).toBe(false); // Dry run
      expect(result.changes.length).toBeGreaterThan(0);
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should apply optimization with backup', async () => {
      mockFs.readFile.mockResolvedValue('const test = "hello";   \n\n\n');

      const optimization = {
        id: 'opt-002',
        category: 'file_size' as const,
        title: 'Clean whitespace',
        description: 'Remove trailing whitespace',
        impact: 'low' as const,
        effort: 'low' as const,
        riskLevel: 'low' as const,
        autoApplicable: true,
        estimatedSavings: {
          fileSizeReduction: '5%',
          performanceGain: '1%'
        },
        implementation: {
          strategy: 'whitespace_cleanup',
          targetFiles: ['/test/file.ts'],
          changes: ['Remove trailing whitespace']
        }
      };

      const result = await service.applyOptimization(optimization, '/test/module', {
        dryRun: false,
        createBackup: true
      });

      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2); // Original + backup
    });

    it('should handle optimization application errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const optimization = {
        id: 'opt-003',
        category: 'file_size' as const,
        title: 'Test optimization',
        description: 'Test description',
        impact: 'low' as const,
        effort: 'low' as const,
        riskLevel: 'low' as const,
        autoApplicable: true,
        estimatedSavings: {
          fileSizeReduction: '5%',
          performanceGain: '1%'
        },
        implementation: {
          strategy: 'test_strategy',
          targetFiles: ['/nonexistent/file.ts'],
          changes: ['Test change']
        }
      };

      const result = await service.applyOptimization(optimization, '/test/module');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('File not found');
    });
  });

  describe('generateValidationResults', () => {
    it('should generate validation results from performance profile', async () => {
      // Create a performance profile with issues
      mockFs.readdir.mockResolvedValue([
        { name: 'large-file.ts', isDirectory: () => false } as any
      ]);

      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 100 * 1024 // 100KB file
      } as any);

      mockFs.readFile.mockResolvedValue('// Large file content');

      const profile = await service.analyzePerformance('/test/module');
      const validationResults = service.generateValidationResults(profile);

      expect(validationResults.length).toBeGreaterThan(0);

      validationResults.forEach(result => {
        expect(result.ruleId).toMatch(/^performance-/);
        expect(['critical', 'high', 'medium', 'low', 'info']).toContain(result.severity);
        expect(result.message).toBeDefined();
        expect(result.details).toBeDefined();
      });
    });

    it('should generate different validation results for different bottleneck types', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'test.ts', isDirectory: () => false } as any,
        { name: 'package.json', isDirectory: () => false } as any
      ]);

      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 50 * 1024 * 1024 // Large file
      } as any);

      mockFs.readFile.mockImplementation(async (filePath) => {
        if ((filePath as string).endsWith('package.json')) {
          return JSON.stringify({
            dependencies: {
              'moment': '^2.29.4', // Heavy dependency
            }
          });
        }
        return `
          const largeArray = new Array(1000000); // Memory issue
          while(true) {} // CPU issue
          fetch('http://api.example.com'); // Network issue
        `;
      });

      const profile = await service.analyzePerformance('/test/module');
      const validationResults = service.generateValidationResults(profile);

      const ruleIds = validationResults.map(r => r.ruleId);
      expect(ruleIds.some(id => id.includes('file-size'))).toBe(true);
      expect(ruleIds.some(id => id.includes('memory') || id.includes('cpu'))).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle permission denied errors', async () => {
      mockFs.readdir.mockRejectedValue(new Error('EACCES: permission denied'));

      await expect(service.analyzePerformance('/restricted/module')).rejects.toThrow('permission denied');
    });

    it('should handle non-existent directories', async () => {
      mockFs.readdir.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      await expect(service.analyzePerformance('/nonexistent/module')).rejects.toThrow('no such file or directory');
    });

    it('should handle malformed package.json', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'package.json', isDirectory: () => false } as any
      ]);

      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 1024
      } as any);

      mockFs.readFile.mockResolvedValue('{ invalid json');

      const result = await service.analyzePerformance('/test/module');

      // Should still complete analysis, just skip dependency analysis
      expect(result).toBeDefined();
      expect(result.metrics.dependencies.totalDependencies).toBe(0);
    });

    it('should handle binary files gracefully', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'image.png', isDirectory: () => false } as any
      ]);

      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 1024
      } as any);

      mockFs.readFile.mockResolvedValue(Buffer.from([0x89, 0x50, 0x4E, 0x47])); // PNG header

      const result = await service.analyzePerformance('/test/module');

      expect(result).toBeDefined();
      // Binary files should be included in file system metrics but not code analysis
      expect(result.metrics.fileSystem.totalFiles).toBe(1);
    });

    it('should calculate performance score correctly', async () => {
      // Mock perfect module (small, efficient)
      mockFs.readdir.mockResolvedValue([
        { name: 'small.ts', isDirectory: () => false } as any
      ]);

      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 100 // Very small file
      } as any);

      mockFs.readFile.mockResolvedValue('export const hello = "world";');

      const result = await service.analyzePerformance('/test/module');

      expect(result.performanceScore).toBeGreaterThan(90); // Should score very well
      expect(result.bottlenecks.length).toBe(0); // No bottlenecks
    });
  });
});