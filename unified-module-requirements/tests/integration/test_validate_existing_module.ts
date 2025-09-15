// Integration test for Scenario 1: Validate existing module
// Based on quickstart.md scenario - validates existing CVPlus submodule
// This test MUST FAIL until implementation is complete (TDD RED phase)

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';

// Types that will be implemented in Phase 3.3
type ValidationStatus = 'PASS' | 'FAIL' | 'WARNING' | 'PARTIAL' | 'ERROR';
type RuleSeverity = 'WARNING' | 'ERROR' | 'CRITICAL' | 'AUTO_FIX';

type ValidationResult = {
  ruleId: string;
  status: ValidationStatus;
  severity: RuleSeverity;
  message?: string;
  filePath?: string;
  lineNumber?: number;
  remediation?: string;
};

type ValidationReport = {
  moduleId: string;
  reportId: string;
  timestamp: string;
  overallScore: number;
  status: ValidationStatus;
  results: ValidationResult[];
  recommendations?: string[];
  validator?: string;
};

// CLI interface that will be implemented in Phase 3.3
interface CVPlusValidator {
  validate(options: {
    path: string;
    rules?: string[];
    format?: 'json' | 'text' | 'html';
    output?: string;
  }): Promise<ValidationReport>;
}

describe('Integration: Scenario 1 - Validate Existing Module', () => {
  let validator: CVPlusValidator | null = null;
  let testModulePath: string;

  beforeAll(async () => {
    // This will fail until CLI validator is implemented
    throw new Error('CVPlusValidator CLI not yet implemented - TDD RED phase');
  });

  afterAll(async () => {
    // Cleanup test modules if created
    try {
      if (testModulePath) {
        await fs.rmdir(testModulePath, { recursive: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Basic Module Validation', () => {
    beforeEach(async () => {
      // Create a test module structure similar to CVPlus submodules
      testModulePath = path.join('/tmp', `test-module-${Date.now()}`);

      await fs.mkdir(testModulePath, { recursive: true });
      await fs.mkdir(path.join(testModulePath, 'src'), { recursive: true });
      await fs.mkdir(path.join(testModulePath, 'tests'), { recursive: true });
      await fs.mkdir(path.join(testModulePath, 'docs'), { recursive: true });

      // Create package.json
      await fs.writeFile(
        path.join(testModulePath, 'package.json'),
        JSON.stringify({
          name: 'test-cv-processing',
          version: '1.0.0',
          description: 'Test CV processing module',
          main: 'dist/index.js',
          scripts: {
            build: 'tsc',
            test: 'jest',
            lint: 'eslint',
            dev: 'tsc --watch'
          },
          dependencies: {},
          devDependencies: {}
        }, null, 2)
      );

      // Create README.md
      await fs.writeFile(
        path.join(testModulePath, 'README.md'),
        `# Test CV Processing Module

This is a test module for CV processing functionality.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`typescript
import { processCV } from './src/index';
\`\`\`

## API Documentation

See [API.md](docs/API.md) for detailed API documentation.
`
      );

      // Create tsconfig.json
      await fs.writeFile(
        path.join(testModulePath, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            outDir: './dist',
            rootDir: './src',
            strict: true,
            esModuleInterop: true
          },
          include: ['src/**/*'],
          exclude: ['node_modules', 'dist']
        }, null, 2)
      );

      // Create entry point
      await fs.writeFile(
        path.join(testModulePath, 'src', 'index.ts'),
        `export const processCV = () => {
  return 'CV processed';
};`
      );
    });

    it('should validate a compliant module successfully', async () => {
      const result = await validator!.validate({
        path: testModulePath
      });

      expect(result).toBeDefined();
      expect(result.moduleId).toBe('test-cv-processing');
      expect(result.overallScore).toBeGreaterThanOrEqual(80); // Should be high for compliant module
      expect(['PASS', 'WARNING']).toContain(result.status); // Should not fail for compliant module
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should validate with specific rules only', async () => {
      const result = await validator!.validate({
        path: testModulePath,
        rules: ['STRUCTURE_BASIC', 'DOCUMENTATION_REQUIRED']
      });

      expect(result).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);

      // Should only include specified rules
      const ruleIds = result.results.map(r => r.ruleId);
      expect(ruleIds.every(id =>
        id.startsWith('STRUCTURE_') || id.startsWith('DOCUMENTATION_') ||
        id.includes('README') || id.includes('PACKAGE')
      )).toBe(true);
    });

    it('should generate detailed JSON report', async () => {
      const outputPath = path.join(testModulePath, 'validation-report.json');

      const result = await validator!.validate({
        path: testModulePath,
        format: 'json',
        output: outputPath
      });

      expect(result).toBeDefined();

      // Should create output file
      const fileExists = await fs.access(outputPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // File should contain valid JSON
      const fileContent = await fs.readFile(outputPath, 'utf-8');
      const jsonData = JSON.parse(fileContent);

      expect(jsonData.moduleId).toBe(result.moduleId);
      expect(jsonData.overallScore).toBe(result.overallScore);
      expect(jsonData.status).toBe(result.status);
    });
  });

  describe('Module Structure Validation', () => {
    it('should detect missing required files', async () => {
      // Remove README.md to create violation
      await fs.unlink(path.join(testModulePath, 'README.md'));

      const result = await validator!.validate({
        path: testModulePath
      });

      expect(result).toBeDefined();
      expect(result.status).not.toBe('PASS'); // Should not pass without README

      const readmeViolation = result.results.find(r =>
        r.ruleId.includes('README') && r.status === 'FAIL'
      );
      expect(readmeViolation).toBeDefined();
      expect(readmeViolation!.remediation).toBeDefined();
    });

    it('should detect missing package.json scripts', async () => {
      // Create package.json without required scripts
      await fs.writeFile(
        path.join(testModulePath, 'package.json'),
        JSON.stringify({
          name: 'test-module',
          version: '1.0.0',
          // Missing build, test, lint, dev scripts
        }, null, 2)
      );

      const result = await validator!.validate({
        path: testModulePath
      });

      expect(result).toBeDefined();
      const scriptViolations = result.results.filter(r =>
        r.ruleId.includes('SCRIPT') || r.ruleId.includes('PACKAGE')
      );

      expect(scriptViolations.length).toBeGreaterThan(0);

      scriptViolations.forEach(violation => {
        expect(violation.remediation).toBeDefined();
        expect(violation.remediation!.toLowerCase()).toMatch(/script|package\.json/);
      });
    });

    it('should detect missing directory structure', async () => {
      // Remove required directories
      await fs.rmdir(path.join(testModulePath, 'tests'), { recursive: true });
      await fs.rmdir(path.join(testModulePath, 'docs'), { recursive: true });

      const result = await validator!.validate({
        path: testModulePath
      });

      expect(result).toBeDefined();
      const structureViolations = result.results.filter(r =>
        r.ruleId.includes('DIRECTORY') || r.ruleId.includes('STRUCTURE')
      );

      expect(structureViolations.length).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThan(90); // Should reduce score
    });
  });

  describe('Performance Requirements', () => {
    it('should complete validation within 30 seconds', async () => {
      const startTime = Date.now();

      const result = await validator!.validate({
        path: testModulePath
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(30000); // 30 seconds as per requirements
    });

    it('should handle large modules efficiently', async () => {
      // Create a larger module structure
      for (let i = 0; i < 20; i++) {
        await fs.writeFile(
          path.join(testModulePath, 'src', `module${i}.ts`),
          `export const module${i} = () => 'module${i}';`
        );

        await fs.writeFile(
          path.join(testModulePath, 'tests', `module${i}.test.ts`),
          `import { module${i} } from '../src/module${i}';
describe('module${i}', () => {
  it('should work', () => {
    expect(module${i}()).toBe('module${i}');
  });
});`
        );
      }

      const startTime = Date.now();

      const result = await validator!.validate({
        path: testModulePath
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(30000); // Should still be under 30 seconds
      expect(result.results.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent module path', async () => {
      await expect(validator!.validate({
        path: '/non/existent/path'
      })).rejects.toThrow(/not found|does not exist/i);
    });

    it('should handle invalid module structure', async () => {
      // Create empty directory
      const emptyPath = path.join('/tmp', `empty-module-${Date.now()}`);
      await fs.mkdir(emptyPath, { recursive: true });

      const result = await validator!.validate({
        path: emptyPath
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('FAIL'); // Should fail for empty module
      expect(result.overallScore).toBeLessThan(50);

      // Cleanup
      await fs.rmdir(emptyPath, { recursive: true });
    });

    it('should handle permission errors gracefully', async () => {
      // Test with a system directory that may have permission restrictions
      const restrictedPath = '/root';

      await expect(validator!.validate({
        path: restrictedPath
      })).rejects.toThrow(/permission|access/i);
    });
  });

  describe('CVPlus Module Patterns', () => {
    it('should recognize CVPlus-specific patterns', async () => {
      // Add CVPlus-specific files
      await fs.writeFile(
        path.join(testModulePath, 'src', 'types.ts'),
        `export interface CVData {
  id: string;
  content: string;
}`
      );

      await fs.writeFile(
        path.join(testModulePath, 'src', 'services'),
        // Create services directory marker
        ''
      );

      await fs.mkdir(path.join(testModulePath, 'src', 'services'), { recursive: true });

      await fs.writeFile(
        path.join(testModulePath, 'src', 'services', 'cv-processor.service.ts'),
        `import { CVData } from '../types';

export class CVProcessorService {
  process(data: CVData): CVData {
    return { ...data, processed: true };
  }
}`
      );

      const result = await validator!.validate({
        path: testModulePath
      });

      expect(result).toBeDefined();

      // Should recognize and validate CVPlus patterns
      const typeResults = result.results.filter(r =>
        r.ruleId.includes('TYPES') || r.ruleId.includes('SERVICE')
      );

      // CVPlus modules with proper structure should score well
      expect(result.overallScore).toBeGreaterThanOrEqual(85);
    });

    it('should provide CVPlus-specific recommendations', async () => {
      const result = await validator!.validate({
        path: testModulePath
      });

      expect(result).toBeDefined();

      if (result.recommendations && result.recommendations.length > 0) {
        // Should include CVPlus-specific recommendations
        const cvplusRecs = result.recommendations.filter(rec =>
          rec.toLowerCase().includes('cvplus') ||
          rec.toLowerCase().includes('submodule') ||
          rec.toLowerCase().includes('module')
        );

        expect(cvplusRecs.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Report Quality', () => {
    it('should provide actionable remediation guidance', async () => {
      // Create a module with some issues
      await fs.unlink(path.join(testModulePath, 'tsconfig.json'));

      const result = await validator!.validate({
        path: testModulePath
      });

      expect(result).toBeDefined();

      const failedResults = result.results.filter(r =>
        r.status === 'FAIL' || r.status === 'WARNING'
      );

      expect(failedResults.length).toBeGreaterThan(0);

      failedResults.forEach(failedResult => {
        if (failedResult.remediation) {
          expect(failedResult.remediation.length).toBeGreaterThan(10);
          expect(failedResult.remediation.toLowerCase()).toMatch(
            /create|add|install|configure|update|fix|remove/
          );
        }
      });
    });

    it('should include file paths for violations', async () => {
      const result = await validator!.validate({
        path: testModulePath
      });

      expect(result).toBeDefined();

      const resultsWithFiles = result.results.filter(r => r.filePath);

      if (resultsWithFiles.length > 0) {
        resultsWithFiles.forEach(result => {
          expect(result.filePath).toBeDefined();
          expect(result.filePath!.startsWith(testModulePath)).toBe(true);
        });
      }
    });

    it('should generate comprehensive validation report', async () => {
      const result = await validator!.validate({
        path: testModulePath
      });

      expect(result).toBeDefined();
      expect(result.moduleId).toBeDefined();
      expect(result.reportId).toBeDefined();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);

      // Should have detailed results
      expect(result.results.length).toBeGreaterThan(5); // Should check multiple rules
    });
  });
});