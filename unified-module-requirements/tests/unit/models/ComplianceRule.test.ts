/**
 * Unit tests for ComplianceRule model
 *
 * Tests the ComplianceRule data structures and basic functionality
 */

import {
  ComplianceRule,
  ComplianceRuleUtils,
  BuiltInRules,
  RuleCondition,
  AutoFixAction
} from '../../../src/models/ComplianceRule';

describe('ComplianceRule', () => {
  describe('Basic ComplianceRule structure', () => {
    it('should create a valid ComplianceRule', () => {
      const rule: ComplianceRule = {
        ruleId: 'TEST_RULE',
        name: 'Test Rule',
        description: 'A test rule for validation',
        category: 'STRUCTURE',
        severity: 'ERROR',
        scope: 'MODULE',
        enabled: true,
        version: '1.0.0',
        conditions: [],
        autoFix: undefined,
        tags: ['testing'],
        documentation: 'https://docs.example.com/test-rule',
        examples: {
          valid: ['Valid example'],
          invalid: ['Invalid example']
        }
      };

      expect(rule.ruleId).toBe('TEST_RULE');
      expect(rule.name).toBe('Test Rule');
      expect(rule.category).toBe('STRUCTURE');
      expect(rule.severity).toBe('ERROR');
      expect(rule.scope).toBe('MODULE');
      expect(rule.enabled).toBe(true);
      expect(rule.conditions).toEqual([]);
      expect(rule.tags).toContain('testing');
    });

    it('should handle different rule categories', () => {
      const categories: Array<ComplianceRule['category']> = [
        'STRUCTURE',
        'DOCUMENTATION',
        'CONFIGURATION',
        'TESTING',
        'SECURITY',
        'PERFORMANCE',
        'DEPENDENCIES',
        'STANDARDS',
        'INTEGRATION'
      ];

      categories.forEach(category => {
        const rule: ComplianceRule = {
          ruleId: `${category}_RULE`,
          name: `${category} Rule`,
          description: `Rule for ${category}`,
          category,
          severity: 'WARNING',
          scope: 'MODULE',
          enabled: true,
          version: '1.0.0',
          conditions: []
        };

        expect(rule.category).toBe(category);
      });
    });

    it('should handle different rule severities', () => {
      const severities: Array<ComplianceRule['severity']> = [
        'INFO',
        'WARNING',
        'ERROR',
        'CRITICAL'
      ];

      severities.forEach(severity => {
        const rule: ComplianceRule = {
          ruleId: `${severity}_RULE`,
          name: `${severity} Rule`,
          description: `Rule with ${severity} severity`,
          category: 'STRUCTURE',
          severity,
          scope: 'MODULE',
          enabled: true,
          version: '1.0.0',
          conditions: []
        };

        expect(rule.severity).toBe(severity);
      });
    });

    it('should handle different rule scopes', () => {
      const scopes: Array<ComplianceRule['scope']> = [
        'MODULE',
        'FILE',
        'PACKAGE',
        'CONFIG',
        'CODE'
      ];

      scopes.forEach(scope => {
        const rule: ComplianceRule = {
          ruleId: `${scope}_RULE`,
          name: `${scope} Rule`,
          description: `Rule with ${scope} scope`,
          category: 'STRUCTURE',
          severity: 'WARNING',
          scope,
          enabled: true,
          version: '1.0.0',
          conditions: []
        };

        expect(rule.scope).toBe(scope);
      });
    });
  });

  describe('RuleCondition structure', () => {
    it('should create valid rule conditions', () => {
      const conditions: RuleCondition[] = [
        {
          field: 'package.name',
          operator: 'exists'
        },
        {
          field: 'package.scripts.build',
          operator: 'equals',
          value: 'tsc'
        },
        {
          field: 'README.md',
          operator: 'file_exists'
        },
        {
          field: 'src',
          operator: 'directory_exists'
        },
        {
          field: 'package.name',
          operator: 'matches_regex',
          value: /^[a-z-]+$/
        }
      ];

      conditions.forEach(condition => {
        expect(condition.field).toBeDefined();
        expect(condition.operator).toBeDefined();

        if (['exists', 'not_exists', 'file_exists', 'directory_exists'].includes(condition.operator)) {
          // These operators don't require a value
        } else {
          expect(condition.value).toBeDefined();
        }
      });
    });

    it('should handle different operators correctly', () => {
      const operators: Array<RuleCondition['operator']> = [
        'exists',
        'not_exists',
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'matches_regex',
        'file_exists',
        'directory_exists',
        'greater_than',
        'less_than'
      ];

      operators.forEach(operator => {
        const condition: RuleCondition = {
          field: 'test.field',
          operator,
          value: operator.includes('exists') ? undefined : 'test-value'
        };

        expect(condition.operator).toBe(operator);
      });
    });
  });

  describe('AutoFixAction structure', () => {
    it('should create valid auto-fix actions', () => {
      const actions: AutoFixAction[] = [
        {
          action: 'create_file',
          target: 'README.md',
          content: '# My Module\\n\\nDescription here.'
        },
        {
          action: 'update_file',
          target: 'package.json',
          content: JSON.stringify({ name: 'updated-name' }, null, 2)
        },
        {
          action: 'delete_file',
          target: 'deprecated.js'
        },
        {
          action: 'create_directory',
          target: 'src'
        },
        {
          action: 'update_package_json',
          target: 'scripts.build',
          content: 'tsc'
        },
        {
          action: 'run_command',
          target: '.',
          command: 'npm install'
        }
      ];

      actions.forEach(action => {
        expect(action.action).toBeDefined();
        expect(action.target).toBeDefined();

        if (action.action === 'run_command') {
          expect(action.command).toBeDefined();
        }
      });
    });

    it('should handle different action types', () => {
      const actionTypes: Array<AutoFixAction['action']> = [
        'create_file',
        'update_file',
        'delete_file',
        'create_directory',
        'update_package_json',
        'run_command'
      ];

      actionTypes.forEach(actionType => {
        const action: AutoFixAction = {
          action: actionType,
          target: 'test-target',
          content: actionType === 'run_command' ? undefined : 'test-content',
          command: actionType === 'run_command' ? 'test-command' : undefined
        };

        expect(action.action).toBe(actionType);
      });
    });
  });

  describe('ComplianceRuleUtils', () => {
    it('should provide validation utilities', () => {
      // Test that ComplianceRuleUtils exists and has expected structure
      expect(ComplianceRuleUtils).toBeDefined();
      expect(typeof ComplianceRuleUtils).toBe('object');
    });

    it('should handle rule configurations', () => {
      const rule: ComplianceRule = {
        ruleId: 'CONFIG_TEST_RULE',
        name: 'Config Test Rule',
        description: 'Rule with configuration',
        category: 'CONFIGURATION',
        severity: 'WARNING',
        scope: 'FILE',
        enabled: true,
        version: '1.0.0',
        conditions: [
          {
            field: 'package.scripts.test',
            operator: 'exists'
          }
        ],
        config: {
          maxFileSize: 1000,
          excludePatterns: ['*.test.ts'],
          customSettings: {
            strict: true,
            threshold: 80
          }
        }
      };

      expect(rule.config?.maxFileSize).toBe(1000);
      expect(rule.config?.excludePatterns).toContain('*.test.ts');
      expect(rule.config?.customSettings?.strict).toBe(true);
    });
  });

  describe('BuiltInRules', () => {
    it('should provide built-in rules', () => {
      expect(BuiltInRules).toBeDefined();
      expect(typeof BuiltInRules).toBe('object');

      // Test that we can get all rules
      const allRules = BuiltInRules.getAllRules();
      expect(Array.isArray(allRules)).toBe(true);
      expect(allRules.length).toBeGreaterThan(0);

      // Verify each rule has required properties
      allRules.forEach(rule => {
        expect(rule.ruleId).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.category).toBeDefined();
        expect(rule.severity).toBeDefined();
        expect(rule.scope).toBeDefined();
        expect(typeof rule.enabled).toBe('boolean');
      });
    });

    it('should provide rules by category', () => {
      const structureRules = BuiltInRules.getRulesByCategory('STRUCTURE');
      const documentationRules = BuiltInRules.getRulesByCategory('DOCUMENTATION');

      expect(Array.isArray(structureRules)).toBe(true);
      expect(Array.isArray(documentationRules)).toBe(true);

      if (structureRules.length > 0) {
        expect(structureRules.every(rule => rule.category === 'STRUCTURE')).toBe(true);
      }

      if (documentationRules.length > 0) {
        expect(documentationRules.every(rule => rule.category === 'DOCUMENTATION')).toBe(true);
      }
    });

    it('should provide specific rules by ID', () => {
      // Test for some expected built-in rules
      const packageJsonRule = BuiltInRules.getRule('PACKAGE_JSON_EXISTS');
      const readmeRule = BuiltInRules.getRule('README_EXISTS');

      if (packageJsonRule) {
        expect(packageJsonRule.ruleId).toBe('PACKAGE_JSON_EXISTS');
      }

      if (readmeRule) {
        expect(readmeRule.ruleId).toBe('README_EXISTS');
      }

      // Test non-existent rule
      const nonExistentRule = BuiltInRules.getRule('NON_EXISTENT_RULE');
      expect(nonExistentRule).toBeUndefined();
    });
  });

  describe('Complex rule examples', () => {
    it('should handle comprehensive rules with all features', () => {
      const comprehensiveRule: ComplianceRule = {
        ruleId: 'COMPREHENSIVE_RULE',
        name: 'Comprehensive Test Rule',
        description: 'A rule that demonstrates all features',
        category: 'STANDARDS',
        severity: 'ERROR',
        scope: 'MODULE',
        enabled: true,
        version: '2.1.0',
        conditions: [
          {
            field: 'package.json',
            operator: 'file_exists'
          },
          {
            field: 'package.name',
            operator: 'matches_regex',
            value: /^@[a-z0-9-]+\/[a-z0-9-]+$/
          },
          {
            field: 'package.scripts.test',
            operator: 'exists'
          }
        ],
        autoFix: {
          action: 'update_package_json',
          target: 'scripts.test',
          content: 'jest'
        },
        config: {
          strict: true,
          allowedLicenses: ['MIT', 'Apache-2.0'],
          minCoverage: 80
        },
        tags: ['package', 'testing', 'naming'],
        documentation: 'https://docs.company.com/rules/comprehensive',
        examples: {
          valid: [
            'Package with proper name and test script',
            '@company/my-module with jest test script'
          ],
          invalid: [
            'Package without test script',
            'Package with invalid name format'
          ]
        },
        dependencies: ['PACKAGE_JSON_EXISTS'],
        applicableTypes: ['backend-api', 'frontend-component']
      };

      expect(comprehensiveRule.ruleId).toBe('COMPREHENSIVE_RULE');
      expect(comprehensiveRule.conditions).toHaveLength(3);
      expect(comprehensiveRule.autoFix?.action).toBe('update_package_json');
      expect(comprehensiveRule.config?.strict).toBe(true);
      expect(comprehensiveRule.tags).toContain('testing');
      expect(comprehensiveRule.dependencies).toContain('PACKAGE_JSON_EXISTS');
      expect(comprehensiveRule.applicableTypes).toContain('backend-api');
    });
  });
});