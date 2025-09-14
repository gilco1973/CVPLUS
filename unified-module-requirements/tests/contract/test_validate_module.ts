// Contract test for POST /modules/validate endpoint
// This test MUST FAIL until implementation is complete (TDD RED phase)

import { describe, it, expect } from '@jest/globals';
import { ValidationService } from '../../src/services/ValidationService';



describe('Contract: POST /modules/validate', () => {
  let validationService: ValidationService | null = null;

  beforeEach(() => {
    validationService = new ValidationService();
  });

  describe('Valid Requests', () => {
    it('should validate a module with default rules', async () => {
      const modulePath = '/test/modules/cv-processing';

      const result = await validationService!.validateModule(modulePath);

      expect(result).toBeDefined();
      expect(result.moduleId).toBe('cv-processing');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.status).toMatch(/^(PASS|FAIL|WARNING|PARTIAL|ERROR)$/);
      expect(result.results).toBeInstanceOf(Array);
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should validate a module with specific rules', async () => {
      const modulePath = '/test/modules/multimedia';
      const options = {
        includeRules: ['STRUCTURE_BASIC', 'DOCUMENTATION_REQUIRED']
      };

      const result = await validationService!.validateModule(modulePath, options);

      expect(result).toBeDefined();
      expect(result.moduleId).toBe('multimedia');
      expect(result.results).toHaveLength(2);
      expect(result.results.every(r => ['STRUCTURE_BASIC', 'DOCUMENTATION_REQUIRED'].includes(r.ruleId))).toBe(true);
    });

    it('should filter results by severity level', async () => {
      const modulePath = '/test/modules/auth';

      const result = await validationService!.validateModule(modulePath);

      expect(result).toBeDefined();
      expect(result.results.every(r => ['CRITICAL', 'AUTO_FIX'].includes(r.severity))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent module path', async () => {
      const modulePath = '/non/existent/path';

      await expect(validationService!.validateModule(modulePath))
        .rejects
        .toThrow('Module not found');
    });

    it('should handle invalid rule names', async () => {
      const modulePath = '/test/modules/core';
      const options = {
        includeRules: ['INVALID_RULE_NAME']
      };

      await expect(validationService!.validateModule(modulePath, options))
        .rejects
        .toThrow('Invalid rule');
    });

    it('should handle empty module path', async () => {
      const modulePath = '';

      await expect(validationService!.validateModule(modulePath))
        .rejects
        .toThrow('Module path is required');
    });
  });

  describe('Response Schema Validation', () => {
    it('should return all required fields in ValidationReport', async () => {
      const modulePath = '/test/modules/analytics';

      const result = await validationService!.validateModule(modulePath);

      // Required fields from OpenAPI schema
      expect(result).toHaveProperty('moduleId');
      expect(result).toHaveProperty('reportId');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('results');

      // Validate each result has required fields
      result.results.forEach(validationResult => {
        expect(validationResult).toHaveProperty('ruleId');
        expect(validationResult).toHaveProperty('status');
        expect(validationResult).toHaveProperty('severity');
      });
    });

    it('should return valid overallScore range', async () => {
      const modulePath = '/test/modules/premium';

      const result = await validationService!.validateModule(modulePath);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(Number.isInteger(result.overallScore)).toBe(true);
    });

    it('should include recommendations when available', async () => {
      const modulePath = '/test/modules/workflow';

      const result = await validationService!.validateModule(modulePath);

      if (result.recommendations) {
        expect(result.recommendations).toBeInstanceOf(Array);
        expect(result.recommendations.every(r => typeof r === 'string')).toBe(true);
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should complete validation within 30 seconds', async () => {
      const modulePath = '/test/modules/large-module';

      const startTime = Date.now();
      await validationService!.validateModule(modulePath);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(30000); // 30 seconds
    });
  });
});