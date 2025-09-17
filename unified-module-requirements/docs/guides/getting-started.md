# Getting Started with CVPlus Unified Module Requirements

This guide will help you get up and running with the CVPlus Unified Module Requirements System in minutes.

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm, yarn, or pnpm
- Git 2.30.0 or higher (for git integration features)

### Install the Package

```bash
# Using npm
npm install cvplus-unified-module-requirements

# Using yarn
yarn add cvplus-unified-module-requirements

# Using pnpm
pnpm add cvplus-unified-module-requirements
```

### Global CLI Installation (Optional)

```bash
# Install globally for CLI access
npm install -g cvplus-unified-module-requirements

# Or use npx (recommended)
npx umr --help
```

## Basic Usage

### 1. Module Validation

Start by validating an existing module:

```typescript
import { ValidationService, ComplianceRule } from 'cvplus-unified-module-requirements';

// Create validation service
const validator = new ValidationService();

// Define validation rules
const rules = [
  ComplianceRule.createBuiltInRule('moduleStructure'),
  ComplianceRule.createBuiltInRule('dependencyValidation'),
  ComplianceRule.createBuiltInRule('fileSize', { maxLines: 200 })
];

// Validate a module
async function validateMyModule() {
  try {
    const result = await validator.validateModule('./packages/my-module', rules);

    console.log('Validation Summary:');
    console.log(`✅ Passed: ${result.summary.passed}`);
    console.log(`❌ Failed: ${result.summary.failed}`);
    console.log(`⚠️  Warnings: ${result.summary.warnings}`);

    // Check individual results
    result.results.forEach(r => {
      const icon = r.status === 'passed' ? '✅' : r.status === 'failed' ? '❌' : '⚠️';
      console.log(`${icon} ${r.rule}: ${r.message}`);
    });

  } catch (error) {
    console.error('Validation failed:', error);
  }
}

validateMyModule();
```

### 2. CLI Validation

Use the CLI for quick validation:

```bash
# Validate a single module
npx umr validate ./packages/my-module

# Validate all modules in a directory
npx umr validate ./packages --recursive

# Validate with specific rules
npx umr validate ./packages/my-module --rules=structure,dependencies,performance

# Generate detailed report
npx umr validate ./packages/my-module --output=detailed --format=json > validation-report.json
```

### 3. Configuration File

Create a configuration file for consistent validation:

```json
// umr.config.json
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
    }
  ],
  "ignore": [
    "**/node_modules/**",
    "**/dist/**",
    "**/*.d.ts"
  ],
  "output": {
    "format": "detailed",
    "destination": "./validation-reports"
  }
}
```

Then run validation using the config:

```bash
npx umr validate --config=umr.config.json
```

## Core Concepts

### Modules

A **module** is a self-contained unit of functionality with:
- Clear boundaries and interfaces
- Minimal external dependencies
- Consistent internal structure
- Proper documentation and testing

### Compliance Rules

**Compliance rules** define validation criteria:

- **Built-in Rules**: Pre-configured rules for common scenarios
- **Custom Rules**: Domain-specific validation logic
- **Rule Severity**: Info, Warning, Error, Critical
- **Rule Options**: Configurable parameters for rule behavior

### Validation Reports

**Validation reports** provide detailed results:

```typescript
interface ValidationReport {
  moduleId: string;
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  results: ValidationResult[];
  performance: {
    duration: number;
    memory: number;
  };
}
```

## Common Patterns

### 1. Batch Validation

Validate multiple modules efficiently:

```typescript
const validator = new ValidationService();
const rules = [/* your rules */];

// Validate multiple modules
const modules = ['./packages/auth', './packages/api', './packages/ui'];
const results = await validator.validateModules(modules, rules);

// Process results
results.forEach(result => {
  console.log(`Module: ${result.moduleId}`);
  console.log(`Status: ${result.summary.failed === 0 ? 'PASS' : 'FAIL'}`);
});
```

### 2. Progressive Validation

Start with basic rules and gradually add more:

```typescript
// Phase 1: Basic structure validation
const basicRules = [
  ComplianceRule.createBuiltInRule('moduleStructure')
];

// Phase 2: Add dependency validation
const intermediateRules = [
  ...basicRules,
  ComplianceRule.createBuiltInRule('dependencyValidation')
];

// Phase 3: Full validation suite
const fullRules = [
  ...intermediateRules,
  ComplianceRule.createBuiltInRule('codeQuality'),
  ComplianceRule.createBuiltInRule('performance'),
  ComplianceRule.createBuiltInRule('security')
];
```

### 3. Custom Rule Creation

Create domain-specific validation rules:

```typescript
import { ComplianceRule, ValidationContext } from 'cvplus-unified-module-requirements';

// Create a custom rule for API modules
const apiModuleRule = new ComplianceRule(
  'apiModule',
  'API Module Structure',
  async (context: ValidationContext) => {
    const hasRoutes = await context.fileExists('routes/index.ts');
    const hasMiddleware = await context.fileExists('middleware/index.ts');
    const hasValidation = await context.fileExists('validation/index.ts');

    return {
      passed: hasRoutes && hasMiddleware && hasValidation,
      message: hasRoutes && hasMiddleware && hasValidation
        ? 'API module structure is valid'
        : 'Missing required API module files',
      details: {
        routes: hasRoutes,
        middleware: hasMiddleware,
        validation: hasValidation
      }
    };
  }
);

// Use the custom rule
const rules = [apiModuleRule];
const result = await validator.validateModule('./packages/api', rules);
```

## Integration Setup

### Git Hooks

Set up automated validation on git operations:

```bash
# Install git hooks
npx umr install-hooks

# Configure hook behavior
npx umr configure-hooks --pre-commit --pre-push --auto-fix
```

### CI/CD Integration

Add validation to your CI/CD pipeline:

```yaml
# .github/workflows/validation.yml
name: Module Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx umr validate --all --format=github-actions
```

## Best Practices

### 1. Start Simple
- Begin with basic structural validation
- Gradually add more sophisticated rules
- Monitor validation performance impact

### 2. Use Configuration Files
- Define rules in version-controlled config files
- Share configurations across team members
- Use different configs for different environments

### 3. Automate Validation
- Set up git hooks for local validation
- Integrate with CI/CD pipelines
- Configure error tracking and monitoring

### 4. Regular Monitoring
- Monitor validation trends over time
- Set up alerts for critical failures
- Review and update rules regularly

## Next Steps

Now that you have the basics, explore more advanced features:

1. **[Module Validation Guide](./module-validation.md)** - Deep dive into validation concepts
2. **[Compliance Rules Guide](./compliance-rules.md)** - Learn about rule creation and management
3. **[Integration Setup](./integration-setup.md)** - Set up git hooks, CI/CD, and monitoring
4. **[CLI Reference](./cli-reference.md)** - Complete CLI command reference
5. **[Performance Optimization](./performance-optimization.md)** - Optimize validation performance

## Troubleshooting

### Common Issues

**"Module not found" errors**
```bash
# Ensure you're in the correct directory
pwd
ls -la

# Check if package.json exists
cat package.json
```

**Validation taking too long**
```bash
# Use parallel validation
npx umr validate --parallel

# Skip expensive rules during development
npx umr validate --skip=performance,security
```

**Permission errors with git hooks**
```bash
# Fix hook permissions
chmod +x .git/hooks/*

# Reinstall hooks
npx umr install-hooks --force
```

For more help, see our [troubleshooting guide](./troubleshooting.md) or open an issue on GitHub.