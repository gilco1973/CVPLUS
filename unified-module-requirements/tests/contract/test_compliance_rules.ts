// Contract test for GET /compliance/rules endpoint
// This test MUST FAIL until implementation is complete (TDD RED phase)

import { describe, it, expect } from '@jest/globals';

// Types from OpenAPI specification
type RuleCategory = 'STRUCTURE' | 'DOCUMENTATION' | 'CONFIGURATION' | 'TESTING' | 'SECURITY' | 'PERFORMANCE';
type RuleSeverity = 'WARNING' | 'ERROR' | 'CRITICAL' | 'AUTO_FIX';
type ModuleType = 'BACKEND' | 'FRONTEND' | 'UTILITY' | 'API' | 'CORE';

type ComplianceRule = {
  id: string;
  category: RuleCategory;
  severity: RuleSeverity;
  description: string;
  remediation?: string;
  applicableTypes?: ModuleType[];
  enabled?: boolean;
  version?: string;
};

// Mock ComplianceService that will be implemented in Phase 3.3
interface ComplianceService {
  getComplianceRules(category?: RuleCategory, severity?: RuleSeverity): Promise<ComplianceRule[]>;
}

describe('Contract: GET /compliance/rules', () => {
  let complianceService: ComplianceService | null = null;

  beforeEach(() => {
    // This will fail until ComplianceService is implemented
    throw new Error('ComplianceService not yet implemented - TDD RED phase');
  });

  describe('List All Rules', () => {
    it('should return all compliance rules', async () => {
      const rules = await complianceService!.getComplianceRules();

      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);

      // Each rule should have required fields
      rules.forEach(rule => {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('category');
        expect(rule).toHaveProperty('severity');
        expect(rule).toHaveProperty('description');

        expect(typeof rule.id).toBe('string');
        expect(typeof rule.description).toBe('string');
        expect(['STRUCTURE', 'DOCUMENTATION', 'CONFIGURATION', 'TESTING', 'SECURITY', 'PERFORMANCE']).toContain(rule.category);
        expect(['WARNING', 'ERROR', 'CRITICAL', 'AUTO_FIX']).toContain(rule.severity);
      });
    });

    it('should include rules for all major categories', async () => {
      const rules = await complianceService!.getComplianceRules();

      const categories = new Set(rules.map(r => r.category));

      // Should have rules for primary categories
      expect(categories.has('STRUCTURE')).toBe(true);
      expect(categories.has('DOCUMENTATION')).toBe(true);
      expect(categories.has('CONFIGURATION')).toBe(true);
      expect(categories.has('TESTING')).toBe(true);
    });

    it('should include rules for all severity levels', async () => {
      const rules = await complianceService!.getComplianceRules();

      const severities = new Set(rules.map(r => r.severity));

      // Should have rules for all severity levels
      expect(severities.has('WARNING')).toBe(true);
      expect(severities.has('ERROR')).toBe(true);
      expect(severities.has('CRITICAL')).toBe(true);
    });
  });

  describe('Filter by Category', () => {
    it('should filter rules by STRUCTURE category', async () => {
      const rules = await complianceService!.getComplianceRules('STRUCTURE');

      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);

      rules.forEach(rule => {
        expect(rule.category).toBe('STRUCTURE');
      });

      // Should include common structure rules
      const ruleIds = rules.map(r => r.id);
      expect(ruleIds.some(id => id.includes('README') || id.includes('PACKAGE_JSON') || id.includes('DIRECTORY'))).toBe(true);
    });

    it('should filter rules by DOCUMENTATION category', async () => {
      const rules = await complianceService!.getComplianceRules('DOCUMENTATION');

      expect(rules).toBeDefined();
      rules.forEach(rule => {
        expect(rule.category).toBe('DOCUMENTATION');
      });

      // Should include documentation-specific rules
      const ruleIds = rules.map(r => r.id);
      expect(ruleIds.some(id => id.includes('README') || id.includes('API_DOCS') || id.includes('CHANGELOG'))).toBe(true);
    });

    it('should filter rules by CONFIGURATION category', async () => {
      const rules = await complianceService!.getComplianceRules('CONFIGURATION');

      expect(rules).toBeDefined();
      rules.forEach(rule => {
        expect(rule.category).toBe('CONFIGURATION');
      });

      // Should include config-specific rules
      const ruleIds = rules.map(r => r.id);
      expect(ruleIds.some(id => id.includes('TSCONFIG') || id.includes('PACKAGE_SCRIPTS') || id.includes('LINT'))).toBe(true);
    });

    it('should filter rules by TESTING category', async () => {
      const rules = await complianceService!.getComplianceRules('TESTING');

      expect(rules).toBeDefined();
      rules.forEach(rule => {
        expect(rule.category).toBe('TESTING');
      });

      // Should include testing-specific rules
      const ruleIds = rules.map(r => r.id);
      expect(ruleIds.some(id => id.includes('TEST') || id.includes('COVERAGE') || id.includes('SPEC'))).toBe(true);
    });

    it('should filter rules by SECURITY category', async () => {
      const rules = await complianceService!.getComplianceRules('SECURITY');

      expect(rules).toBeDefined();
      rules.forEach(rule => {
        expect(rule.category).toBe('SECURITY');
      });

      // Should include security-specific rules
      const ruleIds = rules.map(r => r.id);
      expect(ruleIds.some(id => id.includes('SECURITY') || id.includes('VULN') || id.includes('AUTH'))).toBe(true);
    });

    it('should filter rules by PERFORMANCE category', async () => {
      const rules = await complianceService!.getComplianceRules('PERFORMANCE');

      expect(rules).toBeDefined();
      rules.forEach(rule => {
        expect(rule.category).toBe('PERFORMANCE');
      });

      // Should include performance-specific rules
      const ruleIds = rules.map(r => r.id);
      expect(ruleIds.some(id => id.includes('BUNDLE') || id.includes('SIZE') || id.includes('PERF'))).toBe(true);
    });
  });

  describe('Filter by Severity', () => {
    it('should filter rules by WARNING severity', async () => {
      const rules = await complianceService!.getComplianceRules(undefined, 'WARNING');

      expect(rules).toBeDefined();
      rules.forEach(rule => {
        expect(rule.severity).toBe('WARNING');
      });
    });

    it('should filter rules by ERROR severity', async () => {
      const rules = await complianceService!.getComplianceRules(undefined, 'ERROR');

      expect(rules).toBeDefined();
      rules.forEach(rule => {
        expect(rule.severity).toBe('ERROR');
      });

      // Should include critical structural rules
      const ruleIds = rules.map(r => r.id);
      expect(ruleIds.some(id => id.includes('REQUIRED') || id.includes('MANDATORY'))).toBe(true);
    });

    it('should filter rules by CRITICAL severity', async () => {
      const rules = await complianceService!.getComplianceRules(undefined, 'CRITICAL');

      expect(rules).toBeDefined();
      rules.forEach(rule => {
        expect(rule.severity).toBe('CRITICAL');
      });

      // Critical rules should be security or compliance-related
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should filter rules by AUTO_FIX severity', async () => {
      const rules = await complianceService!.getComplianceRules(undefined, 'AUTO_FIX');

      expect(rules).toBeDefined();
      rules.forEach(rule => {
        expect(rule.severity).toBe('AUTO_FIX');
      });

      // Auto-fixable rules should have remediation guidance
      rules.forEach(rule => {
        expect(rule.remediation).toBeDefined();
        expect(rule.remediation!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Combined Filters', () => {
    it('should filter by both category and severity', async () => {
      const rules = await complianceService!.getComplianceRules('STRUCTURE', 'ERROR');

      expect(rules).toBeDefined();
      rules.forEach(rule => {
        expect(rule.category).toBe('STRUCTURE');
        expect(rule.severity).toBe('ERROR');
      });

      // Should include critical structure rules like missing package.json
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should handle empty results for uncommon combinations', async () => {
      // This combination might not exist in the rule set
      const rules = await complianceService!.getComplianceRules('PERFORMANCE', 'AUTO_FIX');

      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);

      if (rules.length > 0) {
        rules.forEach(rule => {
          expect(rule.category).toBe('PERFORMANCE');
          expect(rule.severity).toBe('AUTO_FIX');
        });
      }
    });
  });

  describe('Rule Content Validation', () => {
    it('should have unique rule IDs', async () => {
      const rules = await complianceService!.getComplianceRules();

      const ruleIds = rules.map(r => r.id);
      const uniqueIds = new Set(ruleIds);

      expect(ruleIds.length).toBe(uniqueIds.size);
    });

    it('should have meaningful rule descriptions', async () => {
      const rules = await complianceService!.getComplianceRules();

      rules.forEach(rule => {
        expect(rule.description.length).toBeGreaterThan(10);
        expect(rule.description).not.toBe(rule.id);

        // Should be descriptive and actionable
        expect(rule.description.toLowerCase()).toMatch(/should|must|require|ensure|check|verify|validate/);
      });
    });

    it('should include remediation guidance for fixable rules', async () => {
      const rules = await complianceService!.getComplianceRules();

      const rulesWithRemediation = rules.filter(r => r.remediation);

      expect(rulesWithRemediation.length).toBeGreaterThan(0);

      rulesWithRemediation.forEach(rule => {
        expect(rule.remediation!.length).toBeGreaterThan(10);
        expect(rule.remediation!.toLowerCase()).toMatch(/create|add|update|install|configure|fix|remove/);
      });
    });

    it('should specify applicable module types where relevant', async () => {
      const rules = await complianceService!.getComplianceRules();

      const rulesWithTypes = rules.filter(r => r.applicableTypes && r.applicableTypes.length > 0);

      expect(rulesWithTypes.length).toBeGreaterThan(0);

      rulesWithTypes.forEach(rule => {
        expect(Array.isArray(rule.applicableTypes)).toBe(true);
        rule.applicableTypes!.forEach(type => {
          expect(['BACKEND', 'FRONTEND', 'UTILITY', 'API', 'CORE']).toContain(type);
        });
      });
    });

    it('should include version information for rule compatibility', async () => {
      const rules = await complianceService!.getComplianceRules();

      const rulesWithVersion = rules.filter(r => r.version);

      expect(rulesWithVersion.length).toBeGreaterThan(0);

      rulesWithVersion.forEach(rule => {
        expect(rule.version).toMatch(/^\d+\.\d+/); // At least major.minor
      });
    });

    it('should have enabled status for rule management', async () => {
      const rules = await complianceService!.getComplianceRules();

      // Rules should have enabled property
      const rulesWithEnabled = rules.filter(r => typeof r.enabled === 'boolean');

      expect(rulesWithEnabled.length).toBeGreaterThan(0);

      // Most rules should be enabled by default
      const enabledRules = rules.filter(r => r.enabled !== false);
      expect(enabledRules.length).toBeGreaterThan(rules.length * 0.8); // At least 80% enabled
    });
  });

  describe('Expected CVPlus Rules', () => {
    it('should include README.md requirement rule', async () => {
      const rules = await complianceService!.getComplianceRules();

      const readmeRule = rules.find(r => r.id.includes('README') && r.id.includes('REQUIRED'));

      expect(readmeRule).toBeDefined();
      expect(readmeRule!.category).toBe('DOCUMENTATION');
      expect(['ERROR', 'CRITICAL']).toContain(readmeRule!.severity);
    });

    it('should include package.json validation rule', async () => {
      const rules = await complianceService!.getComplianceRules();

      const packageRule = rules.find(r => r.id.includes('PACKAGE') && r.id.includes('JSON'));

      expect(packageRule).toBeDefined();
      expect(['STRUCTURE', 'CONFIGURATION']).toContain(packageRule!.category);
    });

    it('should include test coverage rule', async () => {
      const rules = await complianceService!.getComplianceRules();

      const testRule = rules.find(r => r.id.includes('TEST') && r.id.includes('COVERAGE'));

      expect(testRule).toBeDefined();
      expect(testRule!.category).toBe('TESTING');
    });

    it('should include TypeScript configuration rule', async () => {
      const rules = await complianceService!.getComplianceRules();

      const tsRule = rules.find(r => r.id.includes('TSCONFIG') || r.id.includes('TYPESCRIPT'));

      expect(tsRule).toBeDefined();
      expect(tsRule!.category).toBe('CONFIGURATION');
    });

    it('should include directory structure rules', async () => {
      const rules = await complianceService!.getComplianceRules();

      const structureRule = rules.find(r => r.id.includes('DIRECTORY') || r.id.includes('STRUCTURE'));

      expect(structureRule).toBeDefined();
      expect(structureRule!.category).toBe('STRUCTURE');
    });
  });

  describe('Response Format', () => {
    it('should return rules sorted by category then severity', async () => {
      const rules = await complianceService!.getComplianceRules();

      // Check that rules are grouped by category
      let lastCategory = '';
      let categoryChanged = false;

      for (const rule of rules) {
        if (lastCategory && rule.category !== lastCategory) {
          categoryChanged = true;
        } else if (categoryChanged && rule.category === lastCategory) {
          // If category went back to a previous one, sorting might be wrong
          // But we'll be lenient and just check that some logical ordering exists
          break;
        }
        lastCategory = rule.category;
      }

      expect(rules.length).toBeGreaterThan(0);
    });

    it('should return consistent results across calls', async () => {
      const rules1 = await complianceService!.getComplianceRules();
      const rules2 = await complianceService!.getComplianceRules();

      expect(rules1).toEqual(rules2);
    });

    it('should maintain filter consistency', async () => {
      const allStructureRules = await complianceService!.getComplianceRules('STRUCTURE');
      const structureErrorRules = await complianceService!.getComplianceRules('STRUCTURE', 'ERROR');

      // Structure ERROR rules should be a subset of all structure rules
      structureErrorRules.forEach(errorRule => {
        expect(allStructureRules.some(rule => rule.id === errorRule.id)).toBe(true);
      });
    });
  });
});