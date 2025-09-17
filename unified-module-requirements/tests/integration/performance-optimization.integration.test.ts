import { PerformanceOptimizationService } from '../../src/services/PerformanceOptimizationService.js';
import { OptimizationOptions } from '../../src/types/performance.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { jest } from '@jest/globals';

describe('PerformanceOptimizationService Integration Tests', () => {
  let service: PerformanceOptimizationService;
  let tempDir: string;

  beforeAll(async () => {
    service = new PerformanceOptimizationService();
    tempDir = '/tmp/performance-test-' + Date.now();

    // Create temporary test directory structure
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('end-to-end performance analysis', () => {
    it('should perform comprehensive analysis on performance-heavy project', async () => {
      // Create test project with performance issues
      await createPerformanceHeavyProject(tempDir);

      const result = await service.analyzePerformance(tempDir);

      // Verify analysis results
      expect(result).toBeDefined();
      expect(result.moduleId).toBe(tempDir);
      expect(result.metrics).toBeDefined();
      expect(result.bottlenecks.length).toBeGreaterThan(0);
      expect(result.optimizations.length).toBeGreaterThan(0);
      expect(result.performanceScore).toBeLessThan(80); // Should have issues

      // Verify all metric types are analyzed
      expect(result.metrics.fileSystem).toBeDefined();
      expect(result.metrics.memory).toBeDefined();
      expect(result.metrics.cpu).toBeDefined();
      expect(result.metrics.network).toBeDefined();
      expect(result.metrics.bundleSize).toBeDefined();
      expect(result.metrics.dependencies).toBeDefined();

      // Verify bottleneck detection
      const bottleneckTypes = new Set(result.bottlenecks.map(b => b.type));
      expect(bottleneckTypes.size).toBeGreaterThan(1); // Multiple types of issues

      // Verify optimization suggestions
      const optimizationCategories = new Set(result.optimizations.map(o => o.category));
      expect(optimizationCategories.size).toBeGreaterThan(1); // Multiple optimization types
    });

    it('should handle well-optimized project', async () => {
      // Create clean, optimized project
      const cleanDir = path.join(tempDir, 'clean-project');
      await createOptimizedProject(cleanDir);

      const result = await service.analyzePerformance(cleanDir);

      expect(result.bottlenecks.length).toBe(0);
      expect(result.optimizations.length).toBe(0);
      expect(result.performanceScore).toBeGreaterThan(85); // Should score well
    });

    it('should respect analysis options and filters', async () => {
      await createPerformanceHeavyProject(tempDir);

      // Test file system only analysis
      const fsResult = await service.analyzePerformance(tempDir, {
        categories: ['fileSystem'],
        level: 'conservative'
      });

      // Should have file system metrics but others should be minimal
      expect(fsResult.metrics.fileSystem.totalFiles).toBeGreaterThan(0);
      expect(fsResult.metrics.network.requestCount).toBe(0); // Not analyzed

      // Test aggressive analysis
      const aggressiveResult = await service.analyzePerformance(tempDir, {
        level: 'aggressive',
        categories: ['fileSystem', 'memory', 'cpu', 'network', 'bundleSize', 'dependencies']
      });

      // Should find more optimizations in aggressive mode
      expect(aggressiveResult.optimizations.length).toBeGreaterThanOrEqual(fsResult.optimizations.length);
    });

    it('should generate consistent results across multiple runs', async () => {
      await createPerformanceHeavyProject(tempDir);

      const result1 = await service.analyzePerformance(tempDir);
      const result2 = await service.analyzePerformance(tempDir);

      // Core metrics should be identical
      expect(result1.metrics.fileSystem.totalFiles).toBe(result2.metrics.fileSystem.totalFiles);
      expect(result1.metrics.fileSystem.totalSizeBytes).toBe(result2.metrics.fileSystem.totalSizeBytes);
      expect(result1.metrics.dependencies.totalDependencies).toBe(result2.metrics.dependencies.totalDependencies);

      // Performance scores should be very close (within 5 points)
      expect(Math.abs(result1.performanceScore - result2.performanceScore)).toBeLessThan(5);
    });

    it('should apply optimizations correctly', async () => {
      await createOptimizableProject(tempDir);

      const beforeAnalysis = await service.analyzePerformance(tempDir);
      expect(beforeAnalysis.optimizations.length).toBeGreaterThan(0);

      // Apply safe optimizations
      const safeOptimizations = beforeAnalysis.optimizations.filter(opt =>
        opt.autoApplicable && opt.riskLevel === 'low'
      );

      let successCount = 0;
      for (const optimization of safeOptimizations) {
        const result = await service.applyOptimization(optimization, tempDir, {
          dryRun: false,
          createBackup: true
        });

        if (result.success) {
          successCount++;
          expect(result.applied).toBe(true);
          expect(result.backupPath).toBeDefined();
        }
      }

      expect(successCount).toBeGreaterThan(0);

      // Verify improvements
      const afterAnalysis = await service.analyzePerformance(tempDir);
      expect(afterAnalysis.performanceScore).toBeGreaterThanOrEqual(beforeAnalysis.performanceScore);
    });

    it('should handle dry run mode correctly', async () => {
      await createOptimizableProject(tempDir);

      const analysis = await service.analyzePerformance(tempDir);
      const optimization = analysis.optimizations.find(opt => opt.autoApplicable);

      if (optimization) {
        const result = await service.applyOptimization(optimization, tempDir, {
          dryRun: true
        });

        expect(result.success).toBe(true);
        expect(result.applied).toBe(false); // Not actually applied
        expect(result.changes.length).toBeGreaterThan(0);
        expect(result.backupPath).toBeUndefined(); // No backup in dry run
      }
    });
  });

  describe('performance and scalability', () => {
    it('should complete analysis within reasonable time', async () => {
      await createLargeProject(tempDir);

      const startTime = Date.now();
      const result = await service.analyzePerformance(tempDir);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(45000); // Should complete within 45 seconds
      expect(result).toBeDefined();
    });

    it('should handle projects with many files efficiently', async () => {
      const largeDir = path.join(tempDir, 'large-project');
      await createProjectWithManyFiles(largeDir);

      const result = await service.analyzePerformance(largeDir);

      expect(result).toBeDefined();
      expect(result.metrics.fileSystem.totalFiles).toBeGreaterThan(100);
    });

    it('should handle deeply nested directory structures', async () => {
      const deepDir = path.join(tempDir, 'deep-project');
      await createDeeplyNestedProject(deepDir);

      const result = await service.analyzePerformance(deepDir);

      expect(result).toBeDefined();
      expect(result.metrics.fileSystem.totalFiles).toBeGreaterThan(0);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle non-existent directories', async () => {
      await expect(
        service.analyzePerformance('/non/existent/path')
      ).rejects.toThrow();
    });

    it('should handle empty directories', async () => {
      const emptyDir = path.join(tempDir, 'empty');
      await fs.mkdir(emptyDir, { recursive: true });

      const result = await service.analyzePerformance(emptyDir);

      expect(result).toBeDefined();
      expect(result.metrics.fileSystem.totalFiles).toBe(0);
      expect(result.performanceScore).toBeGreaterThan(90); // Empty should score well
    });

    it('should handle files with special characters', async () => {
      const specialDir = path.join(tempDir, 'special-chars');
      await fs.mkdir(specialDir, { recursive: true });

      // Create files with special characters
      await fs.writeFile(path.join(specialDir, 'file with spaces.js'), 'console.log("test");');
      await fs.writeFile(path.join(specialDir, 'file-with-dashes.js'), 'console.log("test");');
      await fs.writeFile(path.join(specialDir, 'file_with_underscores.js'), 'console.log("test");');

      const result = await service.analyzePerformance(specialDir);

      expect(result).toBeDefined();
      expect(result.metrics.fileSystem.totalFiles).toBe(3);
    });

    it('should handle corrupted package.json gracefully', async () => {
      const corruptDir = path.join(tempDir, 'corrupt-project');
      await fs.mkdir(corruptDir, { recursive: true });

      // Create corrupted package.json
      await fs.writeFile(path.join(corruptDir, 'package.json'), '{ invalid json content');
      await fs.writeFile(path.join(corruptDir, 'index.js'), 'console.log("test");');

      const result = await service.analyzePerformance(corruptDir);

      expect(result).toBeDefined();
      // Should still analyze other aspects despite corrupted package.json
      expect(result.metrics.fileSystem.totalFiles).toBe(2);
      expect(result.metrics.dependencies.totalDependencies).toBe(0); // Deps analysis skipped
    });

    it('should handle binary files appropriately', async () => {
      const binaryDir = path.join(tempDir, 'binary-project');
      await fs.mkdir(binaryDir, { recursive: true });

      // Create some binary files
      const binaryData = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG header
      await fs.writeFile(path.join(binaryDir, 'image.png'), binaryData);
      await fs.writeFile(path.join(binaryDir, 'data.bin'), Buffer.alloc(1024, 0xFF));

      // Also create a text file
      await fs.writeFile(path.join(binaryDir, 'script.js'), 'console.log("hello");');

      const result = await service.analyzePerformance(binaryDir);

      expect(result).toBeDefined();
      expect(result.metrics.fileSystem.totalFiles).toBe(3);
      // Binary files should be counted but not cause code analysis issues
    });

    it('should validate optimization application results', async () => {
      await createOptimizableProject(tempDir);

      const analysis = await service.analyzePerformance(tempDir);
      const validationResults = service.generateValidationResults(analysis);

      expect(validationResults.length).toBeGreaterThan(0);

      validationResults.forEach(result => {
        expect(result.ruleId).toMatch(/^performance-/);
        expect(['critical', 'high', 'medium', 'low', 'info']).toContain(result.severity);
        expect(result.message).toBeDefined();
        expect(result.details).toBeDefined();
      });
    });
  });

  describe('real-world scenarios', () => {
    it('should handle JavaScript/TypeScript project', async () => {
      const jsDir = path.join(tempDir, 'js-project');
      await createJavaScriptProject(jsDir);

      const result = await service.analyzePerformance(jsDir);

      expect(result).toBeDefined();
      expect(result.metrics.bundleSize.imports.length).toBeGreaterThan(0);
      expect(result.metrics.dependencies.totalDependencies).toBeGreaterThan(0);
    });

    it('should handle Node.js backend project', async () => {
      const nodeDir = path.join(tempDir, 'node-project');
      await createNodeJSProject(nodeDir);

      const result = await service.analyzePerformance(nodeDir);

      expect(result).toBeDefined();
      expect(result.metrics.network.requestCount).toBeGreaterThan(0); // Should detect API calls
      expect(result.metrics.dependencies.heavyDependencies.length).toBeGreaterThan(0);
    });

    it('should provide actionable optimization recommendations', async () => {
      await createPerformanceHeavyProject(tempDir);

      const result = await service.analyzePerformance(tempDir);

      // Check that optimizations have proper structure
      result.optimizations.forEach(opt => {
        expect(opt.id).toBeDefined();
        expect(opt.title).toBeDefined();
        expect(opt.description).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(opt.impact);
        expect(['low', 'medium', 'high']).toContain(opt.effort);
        expect(['low', 'medium', 'high']).toContain(opt.riskLevel);
        expect(typeof opt.autoApplicable).toBe('boolean');
        expect(opt.implementation).toBeDefined();
        expect(opt.implementation.strategy).toBeDefined();
        expect(Array.isArray(opt.implementation.targetFiles)).toBe(true);
        expect(Array.isArray(opt.implementation.changes)).toBe(true);
      });
    });
  });
});

// Helper functions to create test projects

async function createPerformanceHeavyProject(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });

  // Create large package.json with heavy dependencies
  const packageJson = {
    name: 'performance-heavy-project',
    version: '1.0.0',
    dependencies: {
      'moment': '^2.29.4', // Heavy date library
      'lodash': '^4.17.21', // Heavy utility library
      'rxjs': '^7.8.0', // Heavy reactive library
      'express': '^4.18.2',
      'mongoose': '^7.0.0'
    },
    devDependencies: {
      'webpack': '^5.75.0',
      'typescript': '^5.0.0'
    }
  };
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(packageJson, null, 2));

  // Create large file with performance issues
  const largeFileContent = `
// Large file with performance issues
import * as _ from 'lodash';
import * as moment from 'moment';
import { Observable } from 'rxjs';

// Memory-heavy patterns
const largeArray = new Array(1000000).fill(0);
const globalCache = new Map();

// CPU-intensive patterns
function heavyComputation() {
  for (let i = 0; i < 1000000; i++) {
    for (let j = 0; j < 100; j++) {
      Math.sqrt(i * j);
    }
  }
}

// Memory leak patterns
setInterval(() => {
  globalCache.set(Date.now(), new Array(1000).fill(Math.random()));
}, 100);

// Network-heavy patterns
async function makeLotsOfRequests() {
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(fetch(\`https://api.example.com/data/\${i}\`));
  }
  await Promise.all(promises);
}

// Inefficient code patterns
function inefficientFunction(data: any[]) {
  return data
    .map(item => ({ ...item, processed: true }))
    .filter(item => item.value > 0)
    .map(item => item.value * 2)
    .filter(item => item < 1000)
    .map(item => item.toString())
    .join(',');
}

// Large imports
import 'core-js/stable';
import 'regenerator-runtime/runtime';

export class PerformanceHeavyService {
  private cache = new WeakMap();

  process(data: unknown[]): unknown[] {
    // Inefficient processing
    return data.map(item => {
      const processed = _.cloneDeep(item);
      this.cache.set(processed, moment().format());
      return processed;
    });
  }
}
`;

  await fs.writeFile(path.join(dir, 'heavy-service.ts'), largeFileContent);

  // Create more files with issues
  const srcDir = path.join(dir, 'src');
  await fs.mkdir(srcDir, { recursive: true });

  for (let i = 0; i < 10; i++) {
    const fileContent = `
// File ${i} with some performance issues
import * as _ from 'lodash';

export class Service${i} {
  process(data: any): any {
    // Some inefficient operations
    const result = _.cloneDeep(data);
    for (let j = 0; j < 1000; j++) {
      result.computed = Math.random();
    }
    return result;
  }
}
`;
    await fs.writeFile(path.join(srcDir, `service${i}.ts`), fileContent);
  }
}

async function createOptimizedProject(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });

  // Clean package.json with minimal dependencies
  const packageJson = {
    name: 'optimized-project',
    version: '1.0.0',
    dependencies: {
      'express': '^4.18.2' // Only essential dependencies
    }
  };
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(packageJson, null, 2));

  // Clean, efficient code
  const cleanCode = `
// Clean, efficient code
export class OptimizedService {
  private cache = new Map<string, any>();

  process(data: readonly unknown[]): unknown[] {
    return data.map(item => this.processItem(item));
  }

  private processItem(item: unknown): unknown {
    const key = JSON.stringify(item);

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const result = { ...item, processed: true };
    this.cache.set(key, result);
    return result;
  }
}
`;

  await fs.writeFile(path.join(dir, 'service.ts'), cleanCode);
}

async function createOptimizableProject(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });

  // File with trailing whitespace and formatting issues
  const messyContent = `
const test = "hello";


export function process() {
  return test;
}

`;

  await fs.writeFile(path.join(dir, 'messy.ts'), messyContent);

  // Large file that could be split
  const largeContent = Array(300).fill(0).map((_, i) => `
function func${i}() {
  return ${i};
}
`).join('\n');

  await fs.writeFile(path.join(dir, 'large-file.ts'), largeContent);
}

async function createLargeProject(dir: string): Promise<void> {
  await createPerformanceHeavyProject(dir);

  // Create many additional directories and files
  for (let i = 0; i < 5; i++) {
    const subDir = path.join(dir, `module-${i}`);
    await fs.mkdir(subDir, { recursive: true });

    for (let j = 0; j < 20; j++) {
      const content = `
// Module ${i}, File ${j}
export class Module${i}Service${j} {
  process(): string {
    return "processed";
  }
}
`;
      await fs.writeFile(path.join(subDir, `service-${j}.ts`), content);
    }
  }
}

async function createProjectWithManyFiles(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });

  // Create many small files
  for (let i = 0; i < 150; i++) {
    const content = `// File ${i}\nexport const value${i} = ${i};\n`;
    await fs.writeFile(path.join(dir, `file${i}.ts`), content);
  }
}

async function createDeeplyNestedProject(dir: string): Promise<void> {
  let currentDir = dir;

  // Create deeply nested structure
  for (let i = 0; i < 10; i++) {
    currentDir = path.join(currentDir, `level-${i}`);
    await fs.mkdir(currentDir, { recursive: true });

    const content = `// Nested file at level ${i}\nexport const level = ${i};\n`;
    await fs.writeFile(path.join(currentDir, `file-${i}.ts`), content);
  }
}

async function createJavaScriptProject(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });

  const packageJson = {
    name: 'js-project',
    version: '1.0.0',
    dependencies: {
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'axios': '^1.3.0'
    },
    devDependencies: {
      'webpack': '^5.75.0',
      'babel-loader': '^9.1.0'
    }
  };
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(packageJson, null, 2));

  const jsContent = `
import React from 'react';
import axios from 'axios';

export function App() {
  const [data, setData] = React.useState([]);

  React.useEffect(() => {
    axios.get('/api/data').then(response => {
      setData(response.data);
    });
  }, []);

  return <div>{data.length} items</div>;
}
`;

  await fs.writeFile(path.join(dir, 'App.jsx'), jsContent);
}

async function createNodeJSProject(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });

  const packageJson = {
    name: 'node-project',
    version: '1.0.0',
    dependencies: {
      'express': '^4.18.2',
      'axios': '^1.3.0',
      'mongodb': '^5.0.0'
    }
  };
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(packageJson, null, 2));

  const serverContent = `
const express = require('express');
const axios = require('axios');

const app = express();

app.get('/api/data', async (req, res) => {
  try {
    const response = await axios.get('https://api.external.com/data');
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/heavy', async (req, res) => {
  // Multiple API calls
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(axios.get(\`https://api.external.com/item/\${i}\`));
  }

  const results = await Promise.all(promises);
  res.json(results.map(r => r.data));
});

module.exports = app;
`;

  await fs.writeFile(path.join(dir, 'server.js'), serverContent);
}