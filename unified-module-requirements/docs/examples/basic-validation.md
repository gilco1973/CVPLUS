# Basic Validation Examples

This guide provides practical examples of using the CVPlus Unified Module Requirements System for basic module validation scenarios.

## Example 1: Simple Module Validation

### Scenario
You have a TypeScript module and want to validate its basic structure and dependencies.

### Code

```typescript
import { ValidationService, ComplianceRule } from 'cvplus-unified-module-requirements';

async function validateBasicModule() {
  // Create validation service
  const validator = new ValidationService();

  // Define basic validation rules
  const rules = [
    ComplianceRule.createBuiltInRule('moduleStructure'),
    ComplianceRule.createBuiltInRule('dependencyValidation'),
    ComplianceRule.createBuiltInRule('fileSize', { maxLines: 200 })
  ];

  try {
    // Validate the module
    const result = await validator.validateModule('./packages/auth', rules);

    // Display results
    console.log('=== Validation Results ===');
    console.log(`Module: ${result.moduleId}`);
    console.log(`Status: ${result.summary.failed === 0 ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Total Rules: ${result.summary.total}`);
    console.log(`Passed: ${result.summary.passed}`);
    console.log(`Failed: ${result.summary.failed}`);
    console.log(`Warnings: ${result.summary.warnings}`);

    // Show individual rule results
    console.log('\n=== Rule Details ===');
    result.results.forEach(r => {
      const icon = r.status === 'passed' ? '✅' :
                   r.status === 'failed' ? '❌' : '⚠️';
      console.log(`${icon} ${r.rule}: ${r.message}`);

      if (r.details && Object.keys(r.details).length > 0) {
        console.log(`   Details: ${JSON.stringify(r.details, null, 2)}`);
      }
    });

    return result.summary.failed === 0;

  } catch (error) {
    console.error('Validation failed:', error);
    return false;
  }
}

// Run the validation
validateBasicModule().then(success => {
  process.exit(success ? 0 : 1);
});
```

### Expected Output

```
=== Validation Results ===
Module: auth
Status: ✅ PASSED
Total Rules: 3
Passed: 3
Failed: 0
Warnings: 0

=== Rule Details ===
✅ moduleStructure: Module structure is valid
✅ dependencyValidation: All dependencies are valid
✅ fileSize: All files are within size limits
```

## Example 2: Batch Validation with Progress Tracking

### Scenario
Validate multiple modules in your project with real-time progress feedback.

### Code

```typescript
import { ValidationService, ComplianceRule } from 'cvplus-unified-module-requirements';

async function validateMultipleModules() {
  const validator = new ValidationService({
    parallel: true,
    maxConcurrency: 4
  });

  const rules = [
    ComplianceRule.createBuiltInRule('moduleStructure'),
    ComplianceRule.createBuiltInRule('dependencyValidation'),
    ComplianceRule.createBuiltInRule('codeQuality')
  ];

  const modules = [
    './packages/auth',
    './packages/api',
    './packages/ui',
    './packages/utils',
    './packages/types'
  ];

  console.log(`Validating ${modules.length} modules...`);
  console.log('=' .repeat(50));

  try {
    const results = await validator.validateModules(modules, rules, {
      continueOnError: true,
      progressCallback: (progress) => {
        const percent = Math.round((progress.completed / progress.total) * 100);
        console.log(`[${percent}%] ${progress.completed}/${progress.total} - ${progress.current}`);
        if (progress.errors > 0) {
          console.log(`  ⚠️  ${progress.errors} errors so far`);
        }
      }
    });

    // Summary report
    console.log('\n' + '=' .repeat(50));
    console.log('VALIDATION SUMMARY');
    console.log('=' .repeat(50));

    let totalPassed = 0;
    let totalFailed = 0;
    let totalWarnings = 0;

    results.forEach(result => {
      const status = result.summary.failed === 0 ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.moduleId.padEnd(20)} (${result.summary.passed}/${result.summary.total})`);

      totalPassed += result.summary.passed;
      totalFailed += result.summary.failed;
      totalWarnings += result.summary.warnings;
    });

    console.log('\n' + '-'.repeat(50));
    console.log(`Total Passed: ${totalPassed}`);
    console.log(`Total Failed: ${totalFailed}`);
    console.log(`Total Warnings: ${totalWarnings}`);

    // Show failed modules details
    const failedModules = results.filter(r => r.summary.failed > 0);
    if (failedModules.length > 0) {
      console.log('\n=== FAILED MODULES ===');
      failedModules.forEach(module => {
        console.log(`\n${module.moduleId}:`);
        module.results
          .filter(r => r.status === 'failed')
          .forEach(r => {
            console.log(`  ❌ ${r.rule}: ${r.message}`);
          });
      });
    }

    return failedModules.length === 0;

  } catch (error) {
    console.error('Batch validation failed:', error);
    return false;
  }
}

validateMultipleModules();
```

### Expected Output

```
Validating 5 modules...
==================================================
[20%] 1/5 - ./packages/auth
[40%] 2/5 - ./packages/api
[60%] 3/5 - ./packages/ui
[80%] 4/5 - ./packages/utils
[100%] 5/5 - ./packages/types

==================================================
VALIDATION SUMMARY
==================================================
✅ PASS auth                 (3/3)
❌ FAIL api                  (2/3)
✅ PASS ui                   (3/3)
✅ PASS utils                (3/3)
✅ PASS types                (3/3)

--------------------------------------------------
Total Passed: 14
Total Failed: 1
Total Warnings: 0

=== FAILED MODULES ===

api:
  ❌ codeQuality: Code complexity exceeds threshold
```

## Example 3: Configuration-Based Validation

### Scenario
Use a configuration file to define validation rules and settings.

### Configuration File (`umr.config.json`)

```json
{
  "rules": [
    {
      "name": "moduleStructure",
      "enabled": true,
      "severity": "error"
    },
    {
      "name": "dependencyValidation",
      "enabled": true,
      "severity": "error"
    },
    {
      "name": "fileSize",
      "enabled": true,
      "severity": "warning",
      "options": {
        "maxLines": 200,
        "maxSize": "50KB"
      }
    },
    {
      "name": "codeQuality",
      "enabled": true,
      "severity": "warning",
      "options": {
        "complexity": 10,
        "maintainability": 80
      }
    },
    {
      "name": "security",
      "enabled": false,
      "severity": "error"
    }
  ],
  "validation": {
    "parallel": true,
    "maxConcurrency": 6,
    "timeout": 45000,
    "continueOnError": true
  },
  "output": {
    "format": "detailed",
    "destination": "./validation-reports",
    "includeTimestamp": true
  },
  "ignore": [
    "**/node_modules/**",
    "**/dist/**",
    "**/*.d.ts",
    "**/coverage/**"
  ]
}
```

### Code

```typescript
import fs from 'fs';
import path from 'path';
import { ValidationService, ComplianceRule, RuleSeverity } from 'cvplus-unified-module-requirements';

interface ValidationConfig {
  rules: Array<{
    name: string;
    enabled: boolean;
    severity: string;
    options?: any;
  }>;
  validation: {
    parallel: boolean;
    maxConcurrency: number;
    timeout: number;
    continueOnError: boolean;
  };
  output: {
    format: string;
    destination: string;
    includeTimestamp: boolean;
  };
  ignore: string[];
}

async function validateWithConfig(configPath: string, modulePaths: string[]) {
  // Load configuration
  const configData = fs.readFileSync(configPath, 'utf8');
  const config: ValidationConfig = JSON.parse(configData);

  // Create validation service with config
  const validator = new ValidationService({
    parallel: config.validation.parallel,
    maxConcurrency: config.validation.maxConcurrency,
    timeout: config.validation.timeout
  });

  // Build rules from configuration
  const rules: ComplianceRule[] = config.rules
    .filter(ruleConfig => ruleConfig.enabled)
    .map(ruleConfig => {
      if (ruleConfig.options) {
        return ComplianceRule.createBuiltInRule(ruleConfig.name, ruleConfig.options);
      } else {
        return ComplianceRule.createBuiltInRule(ruleConfig.name);
      }
    });

  console.log(`Loaded ${rules.length} rules from configuration`);
  console.log(`Rules: ${rules.map(r => r.name).join(', ')}`);

  try {
    // Validate all modules
    const results = await validator.validateModules(modulePaths, rules, {
      continueOnError: config.validation.continueOnError,
      generateReport: true,
      reportPath: config.output.destination
    });

    // Generate summary
    const summary = {
      totalModules: results.length,
      passedModules: results.filter(r => r.summary.failed === 0).length,
      failedModules: results.filter(r => r.summary.failed > 0).length,
      totalRules: results.reduce((sum, r) => sum + r.summary.total, 0),
      passedRules: results.reduce((sum, r) => sum + r.summary.passed, 0),
      failedRules: results.reduce((sum, r) => sum + r.summary.failed, 0),
      warnings: results.reduce((sum, r) => sum + r.summary.warnings, 0)
    };

    // Save detailed report
    if (config.output.destination) {
      const reportPath = path.join(
        config.output.destination,
        `validation-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
      );

      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        config: config,
        summary: summary,
        results: results
      }, null, 2));

      console.log(`Detailed report saved to: ${reportPath}`);
    }

    // Display summary
    console.log('\n=== VALIDATION SUMMARY ===');
    console.log(`Modules: ${summary.passedModules}/${summary.totalModules} passed`);
    console.log(`Rules: ${summary.passedRules}/${summary.totalRules} passed`);
    console.log(`Warnings: ${summary.warnings}`);

    return summary.failedModules === 0;

  } catch (error) {
    console.error('Configuration-based validation failed:', error);
    return false;
  }
}

// Usage
const modulePaths = [
  './packages/auth',
  './packages/api',
  './packages/ui'
];

validateWithConfig('./umr.config.json', modulePaths);
```

## Example 4: Real-time Validation with Events

### Scenario
Monitor validation progress in real-time using events.

### Code

```typescript
import { ValidationService, ComplianceRule } from 'cvplus-unified-module-requirements';

async function realTimeValidation() {
  const validator = new ValidationService();

  // Set up event listeners
  validator.on('validation:start', (event) => {
    console.log(`🚀 Starting validation of ${event.modulePath}`);
  });

  validator.on('rule:executed', (event) => {
    const icon = event.result.status === 'passed' ? '✅' :
                 event.result.status === 'failed' ? '❌' : '⚠️';
    console.log(`   ${icon} ${event.rule.name}: ${event.result.message}`);
  });

  validator.on('validation:complete', (event) => {
    console.log(`✨ Validation completed in ${event.duration}ms`);
    console.log(`   Results: ${event.result.summary.passed}/${event.result.summary.total} passed\n`);
  });

  validator.on('validation:error', (event) => {
    console.error(`💥 Validation error for ${event.modulePath}: ${event.error.message}`);
  });

  const rules = [
    ComplianceRule.createBuiltInRule('moduleStructure'),
    ComplianceRule.createBuiltInRule('dependencyValidation'),
    ComplianceRule.createBuiltInRule('fileSize'),
    ComplianceRule.createBuiltInRule('codeQuality')
  ];

  const modules = ['./packages/auth', './packages/api', './packages/ui'];

  console.log('Starting real-time validation...\n');

  try {
    for (const modulePath of modules) {
      await validator.validateModule(modulePath, rules);
    }

    console.log('All validations completed successfully! 🎉');

  } catch (error) {
    console.error('Validation process failed:', error);
  } finally {
    // Clean up event listeners
    validator.removeAllListeners();
  }
}

realTimeValidation();
```

### Expected Output

```
Starting real-time validation...

🚀 Starting validation of ./packages/auth
   ✅ moduleStructure: Module structure is valid
   ✅ dependencyValidation: All dependencies are valid
   ✅ fileSize: All files are within size limits
   ✅ codeQuality: Code quality meets standards
✨ Validation completed in 1250ms
   Results: 4/4 passed

🚀 Starting validation of ./packages/api
   ✅ moduleStructure: Module structure is valid
   ✅ dependencyValidation: All dependencies are valid
   ❌ fileSize: File api/routes/users.ts exceeds 200 lines
   ⚠️ codeQuality: Some functions have high complexity
✨ Validation completed in 1580ms
   Results: 2/4 passed

🚀 Starting validation of ./packages/ui
   ✅ moduleStructure: Module structure is valid
   ✅ dependencyValidation: All dependencies are valid
   ✅ fileSize: All files are within size limits
   ✅ codeQuality: Code quality meets standards
✨ Validation completed in 980ms
   Results: 4/4 passed

All validations completed successfully! 🎉
```

## Example 5: Custom Rule Integration

### Scenario
Combine built-in rules with custom validation logic.

### Code

```typescript
import { ValidationService, ComplianceRule, ValidationContext } from 'cvplus-unified-module-requirements';

// Create a custom rule for API modules
const apiModuleRule = new ComplianceRule(
  'apiModule',
  'API Module Standards',
  async (context: ValidationContext) => {
    const hasRoutes = await context.fileExists('routes/index.ts');
    const hasMiddleware = await context.fileExists('middleware/index.ts');
    const hasValidation = await context.fileExists('validation/index.ts');
    const hasTests = await context.fileExists('__tests__') || await context.fileExists('tests');

    const issues: string[] = [];
    if (!hasRoutes) issues.push('Missing routes/index.ts');
    if (!hasMiddleware) issues.push('Missing middleware/index.ts');
    if (!hasValidation) issues.push('Missing validation/index.ts');
    if (!hasTests) issues.push('Missing test directory');

    return {
      passed: issues.length === 0,
      message: issues.length === 0
        ? 'API module structure meets standards'
        : `API module issues: ${issues.join(', ')}`,
      details: {
        hasRoutes,
        hasMiddleware,
        hasValidation,
        hasTests,
        issues
      },
      canAutoFix: false
    };
  }
);

// Create a custom rule for documentation
const documentationRule = new ComplianceRule(
  'documentation',
  'Documentation Standards',
  async (context: ValidationContext) => {
    const hasReadme = await context.fileExists('README.md');
    const hasApiDocs = await context.fileExists('docs/api.md') ||
                      await context.fileExists('API.md');

    let readmeContent = '';
    if (hasReadme) {
      readmeContent = await context.readFile('README.md');
    }

    const hasUsageExamples = readmeContent.includes('## Usage') ||
                            readmeContent.includes('# Usage');
    const hasInstallInstructions = readmeContent.includes('npm install') ||
                                  readmeContent.includes('yarn add');

    const score = [hasReadme, hasApiDocs, hasUsageExamples, hasInstallInstructions]
                   .filter(Boolean).length;

    return {
      passed: score >= 3,
      message: score >= 3
        ? 'Documentation is comprehensive'
        : `Documentation incomplete (${score}/4 requirements met)`,
      details: {
        hasReadme,
        hasApiDocs,
        hasUsageExamples,
        hasInstallInstructions,
        score
      },
      canAutoFix: false
    };
  }
);

async function validateWithCustomRules() {
  const validator = new ValidationService();

  // Combine built-in and custom rules
  const rules = [
    // Built-in rules
    ComplianceRule.createBuiltInRule('moduleStructure'),
    ComplianceRule.createBuiltInRule('dependencyValidation'),

    // Custom rules
    apiModuleRule,
    documentationRule
  ];

  try {
    const result = await validator.validateModule('./packages/api', rules);

    console.log('=== VALIDATION WITH CUSTOM RULES ===');
    console.log(`Module: ${result.moduleId}`);
    console.log(`Overall Status: ${result.summary.failed === 0 ? '✅ PASSED' : '❌ FAILED'}`);

    // Group results by rule type
    const builtInResults = result.results.filter(r =>
      ['moduleStructure', 'dependencyValidation'].includes(r.rule));
    const customResults = result.results.filter(r =>
      ['apiModule', 'documentation'].includes(r.rule));

    console.log('\n--- Built-in Rules ---');
    builtInResults.forEach(r => {
      const icon = r.status === 'passed' ? '✅' : '❌';
      console.log(`${icon} ${r.rule}: ${r.message}`);
    });

    console.log('\n--- Custom Rules ---');
    customResults.forEach(r => {
      const icon = r.status === 'passed' ? '✅' : '❌';
      console.log(`${icon} ${r.rule}: ${r.message}`);

      if (r.details && r.status !== 'passed') {
        console.log(`   Details:`, JSON.stringify(r.details, null, 4));
      }
    });

    return result.summary.failed === 0;

  } catch (error) {
    console.error('Custom rule validation failed:', error);
    return false;
  }
}

validateWithCustomRules();
```

These examples demonstrate the flexibility and power of the CVPlus Unified Module Requirements System. You can start with simple validations and gradually add more sophisticated rules and configurations as your project grows.

For more advanced examples, see:
- [Custom Rules Guide](./custom-rules.md)
- [Integration Examples](./git-hooks-integration.md)
- [Performance Optimization](../guides/performance-optimization.md)