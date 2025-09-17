/**
 * Unit tests for ValidationReport model
 *
 * Tests the ValidationReport data structures and validation
 */

import {
  ValidationReport,
  ValidationResult,
  ValidationReportUtils,
  ComplianceMetrics,
  RecommendationItem
} from '../../../src/models/ValidationReport';
import { ValidationStatus, RuleSeverity } from '../../../src/models/enums';

describe('ValidationReport', () => {
  describe('ValidationReportUtils', () => {
    it('should create a new ValidationReport with correct structure', () => {
      const moduleId = 'test-module';
      const moduleName = 'Test Module';
      const modulePath = '/path/to/test-module';
      const moduleType = 'backend-api';

      const report = ValidationReportUtils.create(moduleId, moduleName, modulePath, moduleType);

      expect(report.reportId).toMatch(/^test-module_\d+$/);
      expect(report.moduleId).toBe(moduleId);
      expect(report.moduleName).toBe(moduleName);
      expect(report.modulePath).toBe(modulePath);
      expect(report.moduleType).toBe(moduleType);
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.results).toEqual([]);
      expect(report.recommendations).toEqual([]);
      expect(report.overallScore).toBe(0);
      expect(report.status).toBe('PASS' as ValidationStatus);
    });

    it('should calculate basic compliance metrics', () => {
      const report = ValidationReportUtils.create('test', 'Test', '/test', 'utility');

      // Add some mock results
      report.results = [
        createMockResult('r1', 'PASS', 'ERROR'),
        createMockResult('r2', 'FAIL', 'WARNING'),
        createMockResult('r3', 'WARNING', 'INFO'),
        createMockResult('r4', 'PASS', 'CRITICAL')
      ];

      const metrics = ValidationReportUtils.calculateMetrics(report);

      expect(metrics.totalRules).toBe(4);
      expect(metrics.passedRules).toBe(2);
      expect(metrics.failedRules).toBe(1);
      expect(metrics.warningRules).toBe(1);
      expect(metrics.errorRules).toBe(0);
    });

    it('should calculate overall score correctly', () => {
      const report = ValidationReportUtils.create('test', 'Test', '/test', 'utility');

      // Test with all passing rules
      report.results = [
        createMockResult('r1', 'PASS', 'ERROR'),
        createMockResult('r2', 'PASS', 'WARNING'),
        createMockResult('r3', 'PASS', 'CRITICAL')
      ];

      ValidationReportUtils.calculateOverallScore(report);
      expect(report.overallScore).toBe(100);

      // Test with mixed results
      report.results = [
        createMockResult('r1', 'PASS', 'ERROR'),
        createMockResult('r2', 'FAIL', 'WARNING'),
        createMockResult('r3', 'PASS', 'CRITICAL'),
        createMockResult('r4', 'FAIL', 'ERROR')
      ];

      ValidationReportUtils.calculateOverallScore(report);
      expect(report.overallScore).toBe(50); // 2 passes out of 4 total
    });

    it('should handle empty results gracefully', () => {
      const report = ValidationReportUtils.create('test', 'Test', '/test', 'utility');

      const metrics = ValidationReportUtils.calculateMetrics(report);

      expect(metrics.totalRules).toBe(0);
      expect(metrics.passedRules).toBe(0);
      expect(metrics.failedRules).toBe(0);

      ValidationReportUtils.calculateOverallScore(report);
      expect(report.overallScore).toBe(100); // No failures = 100%
    });

    it('should generate recommendations based on results', () => {
      const report = ValidationReportUtils.create('test', 'Test', '/test', 'utility');

      // Add results that should generate recommendations
      report.results = [
        createMockResult('r1', 'FAIL', 'CRITICAL', true),
        createMockResult('r2', 'FAIL', 'ERROR', false),
        createMockResult('r3', 'FAIL', 'WARNING', true)
      ];

      ValidationReportUtils.generateRecommendations(report);

      expect(report.recommendations.length).toBeGreaterThan(0);

      // Check for expected recommendation types
      const recommendationCategories = report.recommendations.map(r => r.category);
      expect(recommendationCategories).toContain('CRITICAL_FIXES');
    });
  });

  describe('ValidationResult structure', () => {
    it('should create a valid ValidationResult', () => {
      const result: ValidationResult = {
        resultId: 'test-result',
        ruleId: 'TEST_RULE',
        ruleName: 'Test Rule',
        status: 'PASS' as ValidationStatus,
        severity: 'ERROR' as RuleSeverity,
        message: 'Test message',
        filePath: '/path/to/file.ts',
        lineNumber: 42,
        expected: 'expected value',
        actual: 'actual value',
        remediation: 'Fix the issue',
        canAutoFix: true,
        executionTime: 15,
        context: { additional: 'data' }
      };

      expect(result.resultId).toBe('test-result');
      expect(result.ruleId).toBe('TEST_RULE');
      expect(result.status).toBe('PASS');
      expect(result.severity).toBe('ERROR');
      expect(result.canAutoFix).toBe(true);
      expect(result.context).toEqual({ additional: 'data' });
    });
  });

  describe('ComplianceMetrics structure', () => {
    it('should calculate breakdown correctly', () => {
      const metrics: ComplianceMetrics = {
        totalRules: 10,
        passedRules: 6,
        failedRules: 3,
        warningRules: 1,
        errorRules: 0,
        severityBreakdown: {
          critical: { passed: 2, failed: 1 },
          error: { passed: 2, failed: 1 },
          warning: { passed: 2, failed: 1 },
          info: { passed: 0, failed: 0 }
        },
        categoryBreakdown: {
          'STRUCTURE': { passed: 3, failed: 1, total: 4 },
          'DOCUMENTATION': { passed: 2, failed: 1, total: 3 },
          'CONFIGURATION': { passed: 1, failed: 1, total: 2 }
        },
        autoFixableViolations: 2
      };

      expect(metrics.passedRules + metrics.failedRules + metrics.warningRules).toBe(metrics.totalRules);
      expect(metrics.severityBreakdown.critical.passed + metrics.severityBreakdown.critical.failed).toBeGreaterThan(0);
      expect(metrics.autoFixableViolations).toBeGreaterThanOrEqual(0);
    });
  });

  describe('RecommendationItem structure', () => {
    it('should create valid recommendations', () => {
      const recommendation: RecommendationItem = {
        priority: 'HIGH',
        category: 'CRITICAL_FIXES',
        title: 'Fix Critical Issues',
        description: 'There are critical issues that need immediate attention',
        effort: 'HIGH',
        impact: 'HIGH',
        steps: [
          'Identify critical violations',
          'Apply fixes',
          'Re-run validation'
        ],
        relatedRules: ['RULE1', 'RULE2']
      };

      expect(recommendation.priority).toBe('HIGH');
      expect(recommendation.steps).toHaveLength(3);
      expect(recommendation.relatedRules).toContain('RULE1');
    });
  });
});

// Helper function to create mock validation results
function createMockResult(
  id: string,
  status: ValidationStatus,
  severity: RuleSeverity,
  canAutoFix: boolean = false
): ValidationResult {
  return {
    resultId: id,
    ruleId: `RULE_${id.toUpperCase()}`,
    ruleName: `Rule ${id}`,
    status,
    severity,
    message: `Test message for ${id}`,
    remediation: `Fix ${id}`,
    canAutoFix,
    executionTime: Math.floor(Math.random() * 20) + 1
  };
}