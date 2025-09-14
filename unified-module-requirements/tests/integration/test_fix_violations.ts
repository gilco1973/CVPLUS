// Integration test for Scenario 4: Fix common violations
// Based on quickstart.md scenario - auto-fixes violations in modules
// This test MUST FAIL until implementation is complete (TDD RED phase)

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';

// Types that will be implemented in Phase 3.3
type ValidationStatus = 'PASS' | 'FAIL' | 'WARNING' | 'PARTIAL' | 'ERROR';
type ValidationResult = {
  ruleId: string;
  status: ValidationStatus;
  severity: string;
  message?: string;
  filePath?: string;
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

type FixResult = {
  ruleId: string;
  fixed: boolean;
  action: string;
  filePath?: string;
  error?: string;
};

type FixSummary = {
  moduleId: string;
  totalViolations: number;
  fixedViolations: number;
  manualViolations: number;
  fixes: FixResult[];
  beforeScore: number;
  afterScore: number;
  validationReport: ValidationReport;
};

// CLI interface that will be implemented in Phase 3.3
interface CVPlusValidator {
  validate(options: { path: string }): Promise<ValidationReport>;

  fix(options: {
    path: string;
    rules?: string[];
    dryRun?: boolean;
  }): Promise<FixSummary>;
}

describe('Integration: Scenario 4 - Fix Common Violations', () => {
  let validator: CVPlusValidator | null = null;
  let testModulePath: string;

  beforeAll(async () => {
    // This will fail until CLI validator with fix capability is implemented
    throw new Error('CVPlusValidator fix functionality not yet implemented - TDD RED phase');
  });

  afterAll(async () => {
    // Cleanup test modules
    try {
      if (testModulePath) {
        await fs.rmdir(testModulePath, { recursive: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Test Module Setup with Violations', () => {
    beforeEach(async () => {
      // Create a module with intentional violations for testing auto-fixes
      testModulePath = path.join('/tmp', `test-fix-module-${Date.now()}`);

      await fs.mkdir(testModulePath, { recursive: true });
      await fs.mkdir(path.join(testModulePath, 'src'), { recursive: true });

      // Create package.json without required scripts (violation)
      await fs.writeFile(
        path.join(testModulePath, 'package.json'),
        JSON.stringify({
          name: 'test-fix-module',
          version: '1.0.0'
          // Missing: description, main, scripts
        }, null, 2)
      );

      // Missing README.md file (violation)

      // Missing tsconfig.json (violation)

      // Missing required directories (violation)
      // tests/ and docs/ directories not created

      // Create basic source file
      await fs.writeFile(
        path.join(testModulePath, 'src', 'index.ts'),
        'export const testModule = "test";'
      );
    });
  });

  describe('Dry-Run Fix Analysis', () => {
    it('should identify fixable violations without making changes', async () => {
      const fixResult = await validator!.fix({
        path: testModulePath,
        dryRun: true
      });

      expect(fixResult).toBeDefined();
      expect(fixResult.moduleId).toBe('test-fix-module');
      expect(fixResult.totalViolations).toBeGreaterThan(0);
      expect(fixResult.fixes).toBeDefined();
      expect(Array.isArray(fixResult.fixes)).toBe(true);

      // Should identify common fixable violations
      const fixableRules = fixResult.fixes.map(f => f.ruleId);

      expect(fixableRules).toContain(expect.stringMatching(/README|PACKAGE|DIRECTORY|TSCONFIG/));

      // In dry-run mode, no actual changes should be made
      const readmeExists = await fs.access(path.join(testModulePath, 'README.md'))
        .then(() => true).catch(() => false);
      expect(readmeExists).toBe(false);

      // Should show what would be fixed
      fixResult.fixes.forEach(fix => {
        expect(fix.ruleId).toBeDefined();
        expect(typeof fix.fixed).toBe('boolean');
        expect(fix.action).toBeDefined();
      });
    });

    it('should estimate fix impact on compliance score', async () => {
      const fixResult = await validator!.fix({
        path: testModulePath,
        dryRun: true
      });

      expect(fixResult.beforeScore).toBeDefined();
      expect(fixResult.afterScore).toBeDefined();

      expect(fixResult.beforeScore).toBeGreaterThanOrEqual(0);
      expect(fixResult.beforeScore).toBeLessThanOrEqual(100);
      expect(fixResult.afterScore).toBeGreaterThanOrEqual(0);
      expect(fixResult.afterScore).toBeLessThanOrEqual(100);

      // After fixing, score should improve
      expect(fixResult.afterScore).toBeGreaterThan(fixResult.beforeScore);

      // Should show significant improvement
      const improvement = fixResult.afterScore - fixResult.beforeScore;
      expect(improvement).toBeGreaterThan(10); // At least 10 point improvement
    });

    it('should categorize fixes vs manual actions needed', async () => {
      const fixResult = await validator!.fix({
        path: testModulePath,
        dryRun: true
      });

      expect(fixResult.fixedViolations).toBeGreaterThanOrEqual(0);
      expect(fixResult.manualViolations).toBeGreaterThanOrEqual(0);

      // Total violations should equal fixed + manual
      expect(fixResult.fixedViolations + fixResult.manualViolations)
        .toBe(fixResult.totalViolations);

      // Should have some auto-fixable violations
      expect(fixResult.fixedViolations).toBeGreaterThan(0);

      const autoFixableViolations = fixResult.fixes.filter(f => f.fixed);
      const manualViolations = fixResult.fixes.filter(f => !f.fixed);

      expect(autoFixableViolations.length).toBe(fixResult.fixedViolations);
      expect(manualViolations.length).toBe(fixResult.manualViolations);
    });
  });

  describe('Auto-Fix Execution', () => {
    it('should automatically fix missing package.json scripts', async () => {
      const fixResult = await validator!.fix({
        path: testModulePath
      });

      expect(fixResult).toBeDefined();
      expect(fixResult.fixedViolations).toBeGreaterThan(0);

      // Check that package.json was updated
      const packageJsonContent = await fs.readFile(
        path.join(testModulePath, 'package.json'),
        'utf-8'
      );
      const packageJson = JSON.parse(packageJsonContent);

      // Should have added required scripts
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.test).toBeDefined();
      expect(packageJson.scripts.lint).toBeDefined();
      expect(packageJson.scripts.dev).toBeDefined();

      // Should have added main field
      expect(packageJson.main).toBeDefined();

      // Should have added description
      expect(packageJson.description).toBeDefined();
    });

    it('should create missing README.md with standardized structure', async () => {
      const fixResult = await validator!.fix({
        path: testModulePath
      });

      expect(fixResult.fixedViolations).toBeGreaterThan(0);

      // Check that README.md was created
      const readmeExists = await fs.access(path.join(testModulePath, 'README.md'))
        .then(() => true).catch(() => false);
      expect(readmeExists).toBe(true);

      const readmeContent = await fs.readFile(
        path.join(testModulePath, 'README.md'),
        'utf-8'
      );

      // Should contain standard sections
      expect(readmeContent).toContain('# Test Fix Module');
      expect(readmeContent).toContain('## Installation');
      expect(readmeContent).toContain('## Usage');
      expect(readmeContent.length).toBeGreaterThan(100);

      // Should find the fix in the results
      const readmeFix = fixResult.fixes.find(f =>
        f.ruleId.includes('README') && f.fixed
      );
      expect(readmeFix).toBeDefined();
      expect(readmeFix!.action).toContain('create');
    });

    it('should create missing directory structure', async () => {
      const fixResult = await validator!.fix({
        path: testModulePath
      });

      expect(fixResult.fixedViolations).toBeGreaterThan(0);

      // Check that required directories were created
      const testsExists = await fs.access(path.join(testModulePath, 'tests'))
        .then(() => true).catch(() => false);
      expect(testsExists).toBe(true);

      const docsExists = await fs.access(path.join(testModulePath, 'docs'))
        .then(() => true).catch(() => false);
      expect(docsExists).toBe(true);

      // Should find directory fixes in results
      const directoryFixes = fixResult.fixes.filter(f =>
        f.ruleId.includes('DIRECTORY') && f.fixed
      );
      expect(directoryFixes.length).toBeGreaterThan(0);
    });

    it('should generate basic tsconfig.json with unified settings', async () => {
      const fixResult = await validator!.fix({
        path: testModulePath
      });

      expect(fixResult.fixedViolations).toBeGreaterThan(0);

      // Check that tsconfig.json was created
      const tsconfigExists = await fs.access(path.join(testModulePath, 'tsconfig.json'))
        .then(() => true).catch(() => false);
      expect(tsconfigExists).toBe(true);

      const tsconfigContent = await fs.readFile(
        path.join(testModulePath, 'tsconfig.json'),
        'utf-8'
      );
      const tsconfig = JSON.parse(tsconfigContent);

      // Should have unified TypeScript settings
      expect(tsconfig.compilerOptions).toBeDefined();
      expect(tsconfig.compilerOptions.target).toBeDefined();
      expect(tsconfig.compilerOptions.module).toBeDefined();
      expect(tsconfig.compilerOptions.outDir).toBe('./dist');
      expect(tsconfig.compilerOptions.rootDir).toBe('./src');
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });
  });

  describe('Selective Rule Fixing', () => {
    it('should fix only specified rules', async () => {
      const fixResult = await validator!.fix({
        path: testModulePath,
        rules: ['PACKAGE_SCRIPTS', 'README_STRUCTURE']
      });

      expect(fixResult).toBeDefined();

      // Should only fix the specified rules
      const fixedRules = fixResult.fixes.filter(f => f.fixed).map(f => f.ruleId);

      fixedRules.forEach(ruleId => {
        expect(
          ruleId.includes('PACKAGE') || ruleId.includes('README')
        ).toBe(true);
      });

      // Should have created README.md and updated package.json
      const readmeExists = await fs.access(path.join(testModulePath, 'README.md'))
        .then(() => true).catch(() => false);
      expect(readmeExists).toBe(true);

      const packageJsonContent = await fs.readFile(
        path.join(testModulePath, 'package.json'),
        'utf-8'
      );
      const packageJson = JSON.parse(packageJsonContent);
      expect(packageJson.scripts).toBeDefined();

      // Should NOT have created tsconfig.json (not in specified rules)
      const tsconfigExists = await fs.access(path.join(testModulePath, 'tsconfig.json'))
        .then(() => true).catch(() => false);
      expect(tsconfigExists).toBe(false);
    });

    it('should handle invalid rule names gracefully', async () => {
      await expect(validator!.fix({
        path: testModulePath,
        rules: ['INVALID_RULE_NAME', 'ANOTHER_INVALID_RULE']
      })).rejects.toThrow(/invalid rule/i);
    });
  });

  describe('Fix Validation and Improvement', () => {
    it('should validate fixes and show improvement', async () => {
      // Get initial validation
      const beforeValidation = await validator!.validate({
        path: testModulePath
      });

      expect(beforeValidation.status).not.toBe('PASS'); // Should have violations

      // Apply fixes
      const fixResult = await validator!.fix({
        path: testModulePath
      });

      expect(fixResult.fixedViolations).toBeGreaterThan(0);

      // Validate after fixes
      const afterValidation = await validator!.validate({
        path: testModulePath
      });

      expect(afterValidation.overallScore).toBeGreaterThan(beforeValidation.overallScore);

      // Should have fewer violations
      const beforeViolations = beforeValidation.results.filter(r =>
        r.status === 'FAIL' || r.status === 'WARNING'
      ).length;

      const afterViolations = afterValidation.results.filter(r =>
        r.status === 'FAIL' || r.status === 'WARNING'
      ).length;

      expect(afterViolations).toBeLessThan(beforeViolations);

      // Final validation should be included in fix result
      expect(fixResult.validationReport.overallScore).toBe(afterValidation.overallScore);
    });

    it('should achieve high compliance after auto-fixes', async () => {
      const fixResult = await validator!.fix({
        path: testModulePath
      });

      expect(fixResult.afterScore).toBeGreaterThanOrEqual(80); // Should achieve good compliance

      // Final validation should show improvement
      const finalReport = fixResult.validationReport;
      expect(finalReport.status).not.toBe('FAIL');
      expect(['PASS', 'WARNING']).toContain(finalReport.status);
    });

    it('should preserve existing content while fixing violations', async () => {
      // Add some existing content that should be preserved
      await fs.writeFile(
        path.join(testModulePath, 'src', 'custom-logic.ts'),
        `export class CustomLogic {
  process(): string {
    return 'custom processing';
  }
}`
      );

      const fixResult = await validator!.fix({
        path: testModulePath
      });

      expect(fixResult.fixedViolations).toBeGreaterThan(0);

      // Check that custom content was preserved
      const customLogicExists = await fs.access(
        path.join(testModulePath, 'src', 'custom-logic.ts')
      ).then(() => true).catch(() => false);
      expect(customLogicExists).toBe(true);

      const customContent = await fs.readFile(
        path.join(testModulePath, 'src', 'custom-logic.ts'),
        'utf-8'
      );
      expect(customContent).toContain('CustomLogic');
      expect(customContent).toContain('custom processing');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle modules with partial existing structure', async () => {
      // Create module with some existing files
      await fs.writeFile(
        path.join(testModulePath, 'README.md'),
        'Existing README content'
      );

      const fixResult = await validator!.fix({
        path: testModulePath
      });

      expect(fixResult).toBeDefined();

      // Should preserve existing README content
      const readmeContent = await fs.readFile(
        path.join(testModulePath, 'README.md'),
        'utf-8'
      );
      expect(readmeContent).toContain('Existing README content');

      // But should still fix other violations
      expect(fixResult.fixedViolations).toBeGreaterThan(0);
    });

    it('should handle file permission errors gracefully', async () => {
      // This test would simulate permission errors in a real environment
      const fixResult = await validator!.fix({
        path: testModulePath
      });

      // Even if some fixes fail due to permissions, others should succeed
      expect(fixResult.fixes).toBeDefined();

      const successfulFixes = fixResult.fixes.filter(f => f.fixed);
      const failedFixes = fixResult.fixes.filter(f => !f.fixed && f.error);

      expect(successfulFixes.length + failedFixes.length).toBe(fixResult.fixes.length);

      // Failed fixes should have error messages
      failedFixes.forEach(fix => {
        expect(fix.error).toBeDefined();
      });
    });

    it('should handle non-existent module path', async () => {
      await expect(validator!.fix({
        path: '/non/existent/path'
      })).rejects.toThrow(/not found|does not exist/i);
    });

    it('should handle corrupted module files', async () => {
      // Create invalid package.json
      await fs.writeFile(
        path.join(testModulePath, 'package.json'),
        '{invalid json content'
      );

      const fixResult = await validator!.fix({
        path: testModulePath
      });

      // Should handle the error and attempt to fix it
      expect(fixResult).toBeDefined();

      const packageJsonFix = fixResult.fixes.find(f =>
        f.ruleId.includes('PACKAGE')
      );

      if (packageJsonFix) {
        if (packageJsonFix.fixed) {
          // Should have recreated valid package.json
          const packageJsonContent = await fs.readFile(
            path.join(testModulePath, 'package.json'),
            'utf-8'
          );
          expect(() => JSON.parse(packageJsonContent)).not.toThrow();
        } else {
          // Should have error message
          expect(packageJsonFix.error).toBeDefined();
        }
      }
    });
  });

  describe('CVPlus-Specific Fixes', () => {
    it('should apply CVPlus submodule standards', async () => {
      const fixResult = await validator!.fix({
        path: testModulePath
      });

      expect(fixResult.fixedViolations).toBeGreaterThan(0);

      // Check for CVPlus-specific structure
      const packageJsonContent = await fs.readFile(
        path.join(testModulePath, 'package.json'),
        'utf-8'
      );
      const packageJson = JSON.parse(packageJsonContent);

      // Should have CVPlus-compatible scripts
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.lint).toBeDefined();

      // Should create standard CVPlus directories
      const srcExists = await fs.access(path.join(testModulePath, 'src'))
        .then(() => true).catch(() => false);
      const testsExists = await fs.access(path.join(testModulePath, 'tests'))
        .then(() => true).catch(() => false);

      expect(srcExists).toBe(true);
      expect(testsExists).toBe(true);
    });

    it('should generate CVPlus-compatible documentation', async () => {
      const fixResult = await validator!.fix({
        path: testModulePath
      });

      const readmeContent = await fs.readFile(
        path.join(testModulePath, 'README.md'),
        'utf-8'
      );

      // Should contain CVPlus-appropriate sections
      expect(readmeContent).toContain('Installation');
      expect(readmeContent).toContain('Usage');

      // Should be structured for submodule use
      expect(readmeContent.length).toBeGreaterThan(200);
    });
  });

  describe('Fix Reporting and Transparency', () => {
    it('should provide detailed fix actions report', async () => {
      const fixResult = await validator!.fix({
        path: testModulePath
      });

      expect(fixResult.fixes).toBeDefined();
      expect(fixResult.fixes.length).toBeGreaterThan(0);

      fixResult.fixes.forEach(fix => {
        expect(fix.ruleId).toBeDefined();
        expect(typeof fix.fixed).toBe('boolean');
        expect(fix.action).toBeDefined();
        expect(fix.action.length).toBeGreaterThan(10);

        if (fix.fixed && fix.filePath) {
          expect(fix.filePath.startsWith(testModulePath)).toBe(true);
        }
      });
    });

    it('should track before and after metrics', async () => {
      const fixResult = await validator!.fix({
        path: testModulePath
      });

      expect(fixResult.beforeScore).toBeDefined();
      expect(fixResult.afterScore).toBeDefined();
      expect(fixResult.totalViolations).toBeDefined();
      expect(fixResult.fixedViolations).toBeDefined();
      expect(fixResult.manualViolations).toBeDefined();

      // Should show improvement
      expect(fixResult.afterScore).toBeGreaterThan(fixResult.beforeScore);
      expect(fixResult.fixedViolations).toBeGreaterThan(0);

      // Math should check out
      expect(fixResult.fixedViolations + fixResult.manualViolations)
        .toBe(fixResult.totalViolations);
    });
  });
});