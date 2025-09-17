/**
 * Performance tests for ValidationService
 *
 * Tests validation performance under various conditions:
 * - Single module validation speed
 * - Batch validation throughput
 * - Memory usage
 * - Concurrent validation performance
 * - Large module handling
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ValidationService } from '../../src/services/ValidationService';

describe('ValidationService Performance', () => {
  let validationService: ValidationService;
  let tempDir: string;
  let performanceResults: Array<{
    testName: string;
    duration: number;
    memoryUsage: number;
    operationsPerSecond?: number;
  }> = [];

  beforeAll(async () => {
    validationService = new ValidationService();
    tempDir = path.join(__dirname, '../temp', `perf-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    // Output performance results
    console.log('\n=== PERFORMANCE TEST RESULTS ===');
    performanceResults.forEach(result => {
      console.log(`${result.testName}:`);
      console.log(`  Duration: ${result.duration}ms`);
      console.log(`  Memory: ${(result.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      if (result.operationsPerSecond) {
        console.log(`  Throughput: ${result.operationsPerSecond.toFixed(2)} ops/sec`);
      }
      console.log('');
    });
  });

  beforeEach(() => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('Single Module Validation Performance', () => {
    it('should validate a simple module quickly', async () => {
      const testName = 'Simple Module Validation';
      const modulePath = await createTestModule('simple-module', {
        packageJson: true,
        readme: true,
        tsconfig: true,
        sourceFiles: 5
      });

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const result = await validationService.validateModule(modulePath);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsage = endMemory - startMemory;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      performanceResults.push({
        testName,
        duration,
        memoryUsage
      });
    });

    it('should handle large modules efficiently', async () => {
      const testName = 'Large Module Validation';
      const modulePath = await createTestModule('large-module', {
        packageJson: true,
        readme: true,
        tsconfig: true,
        sourceFiles: 50,
        testFiles: 25,
        configFiles: 10
      });

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const result = await validationService.validateModule(modulePath);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsage = endMemory - startMemory;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      performanceResults.push({
        testName,
        duration,
        memoryUsage
      });
    });

    it('should maintain performance with complex directory structures', async () => {
      const testName = 'Complex Structure Validation';
      const modulePath = await createTestModule('complex-module', {
        packageJson: true,
        readme: true,
        tsconfig: true,
        sourceFiles: 30,
        testFiles: 15,
        configFiles: 8,
        nestedDirectories: 5,
        depthLevel: 3
      });

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const result = await validationService.validateModule(modulePath);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsage = endMemory - startMemory;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds

      performanceResults.push({
        testName,
        duration,
        memoryUsage
      });
    });
  });

  describe('Batch Validation Performance', () => {
    it('should process small batches efficiently', async () => {
      const testName = 'Small Batch Validation (5 modules)';
      const moduleCount = 5;
      const modules = [];

      // Create multiple test modules
      for (let i = 0; i < moduleCount; i++) {
        const modulePath = await createTestModule(`batch-module-${i}`, {
          packageJson: true,
          readme: true,
          sourceFiles: 10
        });
        modules.push(modulePath);
      }

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const result = await validationService.validateModulesBatch(modules);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsage = endMemory - startMemory;
      const operationsPerSecond = (moduleCount / duration) * 1000;

      expect(result).toBeDefined();
      expect(result.totalItems).toBe(moduleCount);
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds

      performanceResults.push({
        testName,
        duration,
        memoryUsage,
        operationsPerSecond
      });
    });

    it('should handle medium batches with good throughput', async () => {
      const testName = 'Medium Batch Validation (15 modules)';
      const moduleCount = 15;
      const modules = [];

      // Create multiple test modules
      for (let i = 0; i < moduleCount; i++) {
        const modulePath = await createTestModule(`medium-batch-module-${i}`, {
          packageJson: true,
          readme: i % 2 === 0, // Some modules missing README
          sourceFiles: 8,
          testFiles: 4
        });
        modules.push(modulePath);
      }

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const result = await validationService.validateModulesBatch(modules, {
        maxParallel: 5
      });

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsage = endMemory - startMemory;
      const operationsPerSecond = (moduleCount / duration) * 1000;

      expect(result).toBeDefined();
      expect(result.totalItems).toBe(moduleCount);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      performanceResults.push({
        testName,
        duration,
        memoryUsage,
        operationsPerSecond
      });
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not leak memory during repeated validations', async () => {
      const testName = 'Memory Leak Test (20 iterations)';
      const modulePath = await createTestModule('memory-test-module', {
        packageJson: true,
        readme: true,
        sourceFiles: 10
      });

      const iterations = 20;
      const memorySnapshots: number[] = [];

      const startTime = Date.now();
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterations; i++) {
        await validationService.validateModule(modulePath);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        memorySnapshots.push(process.memoryUsage().heapUsed);
      }

      const endTime = Date.now();
      const finalMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;

      // Check for memory leaks - final memory shouldn't be significantly higher
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercentage = (memoryIncrease / initialMemory) * 100;

      expect(memoryIncreasePercentage).toBeLessThan(50); // Less than 50% increase

      performanceResults.push({
        testName,
        duration,
        memoryUsage: memoryIncrease,
        operationsPerSecond: (iterations / duration) * 1000
      });
    });
  });

  describe('Concurrent Validation Performance', () => {
    it('should handle concurrent validations efficiently', async () => {
      const testName = 'Concurrent Validation (10 parallel)';
      const concurrentCount = 10;

      // Create modules for concurrent validation
      const modulePromises = Array.from({ length: concurrentCount }, (_, i) =>
        createTestModule(`concurrent-module-${i}`, {
          packageJson: true,
          readme: true,
          sourceFiles: 8
        })
      );

      const modules = await Promise.all(modulePromises);

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      // Run validations concurrently
      const validationPromises = modules.map(modulePath =>
        validationService.validateModule(modulePath)
      );

      const results = await Promise.all(validationPromises);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsage = endMemory - startMemory;
      const operationsPerSecond = (concurrentCount / duration) * 1000;

      expect(results).toHaveLength(concurrentCount);
      results.forEach(result => expect(result).toBeDefined());

      performanceResults.push({
        testName,
        duration,
        memoryUsage,
        operationsPerSecond
      });
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks', async () => {
      const testName = 'Performance Benchmark';

      // Create a representative module
      const modulePath = await createTestModule('benchmark-module', {
        packageJson: true,
        readme: true,
        tsconfig: true,
        sourceFiles: 20,
        testFiles: 10,
        configFiles: 5
      });

      // Warm up
      await validationService.validateModule(modulePath);

      const iterations = 5;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await validationService.validateModule(modulePath);
        const duration = Date.now() - startTime;
        durations.push(duration);
      }

      const averageDuration = durations.reduce((sum, d) => sum + d, 0) / iterations;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      // Performance benchmarks
      expect(averageDuration).toBeLessThan(1500); // Average < 1.5 seconds
      expect(maxDuration).toBeLessThan(2000);     // Max < 2 seconds
      expect(minDuration).toBeLessThan(1000);     // Min < 1 second

      performanceResults.push({
        testName: `${testName} (avg: ${averageDuration.toFixed(0)}ms, min: ${minDuration}ms, max: ${maxDuration}ms)`,
        duration: averageDuration,
        memoryUsage: 0
      });
    });
  });

  // Helper function to create test modules with various characteristics
  async function createTestModule(
    moduleName: string,
    options: {
      packageJson?: boolean;
      readme?: boolean;
      tsconfig?: boolean;
      sourceFiles?: number;
      testFiles?: number;
      configFiles?: number;
      nestedDirectories?: number;
      depthLevel?: number;
    }
  ): Promise<string> {
    const modulePath = path.join(tempDir, moduleName);
    await fs.mkdir(modulePath, { recursive: true });

    // Create package.json
    if (options.packageJson) {
      await fs.writeFile(
        path.join(modulePath, 'package.json'),
        JSON.stringify({
          name: moduleName,
          version: '1.0.0',
          description: `Test module ${moduleName}`,
          main: 'index.js',
          scripts: {
            build: 'tsc',
            test: 'jest'
          }
        }, null, 2)
      );
    }

    // Create README.md
    if (options.readme) {
      await fs.writeFile(
        path.join(modulePath, 'README.md'),
        `# ${moduleName}\n\nTest module for performance testing.\n`
      );
    }

    // Create tsconfig.json
    if (options.tsconfig) {
      await fs.writeFile(
        path.join(modulePath, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'es2020',
            module: 'commonjs',
            outDir: 'dist',
            strict: true
          },
          include: ['src/**/*'],
          exclude: ['node_modules', 'dist']
        }, null, 2)
      );
    }

    // Create source files
    if (options.sourceFiles) {
      const srcDir = path.join(modulePath, 'src');
      await fs.mkdir(srcDir, { recursive: true });

      for (let i = 0; i < options.sourceFiles; i++) {
        await fs.writeFile(
          path.join(srcDir, `file${i}.ts`),
          `// Source file ${i}\nexport const value${i} = ${i};\n`
        );
      }
    }

    // Create test files
    if (options.testFiles) {
      const testDir = path.join(modulePath, 'tests');
      await fs.mkdir(testDir, { recursive: true });

      for (let i = 0; i < options.testFiles; i++) {
        await fs.writeFile(
          path.join(testDir, `test${i}.test.ts`),
          `// Test file ${i}\nimport { value${i % (options.sourceFiles || 1)} } from '../src/file${i % (options.sourceFiles || 1)}';\ntest('test ${i}', () => expect(true).toBe(true));\n`
        );
      }
    }

    // Create config files
    if (options.configFiles) {
      for (let i = 0; i < options.configFiles; i++) {
        await fs.writeFile(
          path.join(modulePath, `config${i}.json`),
          JSON.stringify({ setting: `value${i}` }, null, 2)
        );
      }
    }

    // Create nested directories
    if (options.nestedDirectories && options.depthLevel) {
      for (let i = 0; i < options.nestedDirectories; i++) {
        let currentPath = modulePath;
        for (let depth = 0; depth < options.depthLevel; depth++) {
          currentPath = path.join(currentPath, `level${depth}`);
          await fs.mkdir(currentPath, { recursive: true });
          await fs.writeFile(
            path.join(currentPath, `file${i}.ts`),
            `// Nested file ${i} at depth ${depth}\n`
          );
        }
      }
    }

    return modulePath;
  }
});