# ValidationService API Reference

The `ValidationService` is the core component for module validation in the CVPlus Unified Module Requirements System.

## Class: ValidationService

### Constructor

```typescript
new ValidationService(options?: ValidationServiceOptions)
```

Creates a new ValidationService instance.

#### Parameters

- `options` (optional): Configuration options for the validation service

```typescript
interface ValidationServiceOptions {
  parallel?: boolean;          // Enable parallel validation (default: true)
  maxConcurrency?: number;     // Maximum concurrent validations (default: 4)
  timeout?: number;            // Validation timeout in ms (default: 30000)
  cache?: boolean;             // Enable result caching (default: true)
  cacheSize?: number;          // Maximum cache entries (default: 100)
}
```

#### Example

```typescript
import { ValidationService } from 'cvplus-unified-module-requirements';

// Default configuration
const validator = new ValidationService();

// Custom configuration
const customValidator = new ValidationService({
  parallel: true,
  maxConcurrency: 8,
  timeout: 60000,
  cache: true,
  cacheSize: 200
});
```

### Methods

#### validateModule

```typescript
async validateModule(
  modulePath: string,
  rules: ComplianceRule[],
  options?: ValidationOptions
): Promise<ValidationReport>
```

Validates a single module against the provided compliance rules.

##### Parameters

- `modulePath`: Absolute or relative path to the module directory
- `rules`: Array of compliance rules to apply
- `options` (optional): Validation-specific options

```typescript
interface ValidationOptions {
  includeRules?: string[];     // Only run specified rules
  excludeRules?: string[];     // Skip specified rules
  severity?: RuleSeverity;     // Minimum severity level
  stopOnFirstError?: boolean;  // Stop validation on first error
  generateReport?: boolean;    // Generate detailed report
  reportPath?: string;         // Path to save report
}
```

##### Returns

`Promise<ValidationReport>` - Detailed validation results

##### Example

```typescript
const rules = [
  ComplianceRule.createBuiltInRule('moduleStructure'),
  ComplianceRule.createBuiltInRule('dependencyValidation')
];

const result = await validator.validateModule('./packages/auth', rules, {
  includeRules: ['moduleStructure'],
  severity: RuleSeverity.ERROR,
  generateReport: true,
  reportPath: './reports'
});

console.log(`Validation ${result.summary.failed === 0 ? 'PASSED' : 'FAILED'}`);
```

#### validateModules

```typescript
async validateModules(
  modulePaths: string[],
  rules: ComplianceRule[],
  options?: BatchValidationOptions
): Promise<ValidationReport[]>
```

Validates multiple modules in parallel for improved performance.

##### Parameters

- `modulePaths`: Array of module paths to validate
- `rules`: Array of compliance rules to apply
- `options` (optional): Batch validation options

```typescript
interface BatchValidationOptions extends ValidationOptions {
  continueOnError?: boolean;   // Continue validation if one module fails
  progressCallback?: (progress: ValidationProgress) => void;
}

interface ValidationProgress {
  completed: number;
  total: number;
  current: string;
  errors: number;
}
```

##### Returns

`Promise<ValidationReport[]>` - Array of validation results

##### Example

```typescript
const modules = ['./packages/auth', './packages/api', './packages/ui'];
const rules = [ComplianceRule.createBuiltInRule('moduleStructure')];

const results = await validator.validateModules(modules, rules, {
  continueOnError: true,
  progressCallback: (progress) => {
    console.log(`Progress: ${progress.completed}/${progress.total} - ${progress.current}`);
  }
});

// Process results
const failedModules = results.filter(r => r.summary.failed > 0);
console.log(`${failedModules.length} modules failed validation`);
```

#### validateRule

```typescript
async validateRule(
  modulePath: string,
  rule: ComplianceRule,
  context?: ValidationContext
): Promise<ValidationResult>
```

Validates a single rule against a module.

##### Parameters

- `modulePath`: Path to the module directory
- `rule`: Compliance rule to validate
- `context` (optional): Pre-built validation context

##### Returns

`Promise<ValidationResult>` - Individual rule validation result

##### Example

```typescript
const rule = ComplianceRule.createBuiltInRule('fileSize', { maxLines: 200 });
const result = await validator.validateRule('./packages/auth', rule);

if (result.status === 'failed') {
  console.log(`Rule failed: ${result.message}`);
  console.log(`Details:`, result.details);
}
```

#### createValidationContext

```typescript
async createValidationContext(modulePath: string): Promise<ValidationContext>
```

Creates a validation context for a module, containing metadata and analysis results.

##### Parameters

- `modulePath`: Path to the module directory

##### Returns

`Promise<ValidationContext>` - Validation context object

##### Example

```typescript
const context = await validator.createValidationContext('./packages/auth');

console.log(`Module: ${context.module.name}`);
console.log(`Files: ${context.files.length}`);
console.log(`Dependencies: ${context.dependencies.length}`);
console.log(`Size: ${context.statistics.totalSize} bytes`);
```

#### clearCache

```typescript
clearCache(): void
```

Clears the validation result cache.

##### Example

```typescript
// Clear cache to force fresh validation
validator.clearCache();

// Run validation again
const result = await validator.validateModule('./packages/auth', rules);
```

#### getStatistics

```typescript
getStatistics(): ValidationServiceStatistics
```

Returns performance and usage statistics for the validation service.

##### Returns

`ValidationServiceStatistics` - Service statistics

```typescript
interface ValidationServiceStatistics {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  averageDuration: number;
  cacheHitRate: number;
  memoryUsage: number;
}
```

##### Example

```typescript
const stats = validator.getStatistics();

console.log(`Total validations: ${stats.totalValidations}`);
console.log(`Success rate: ${(stats.successfulValidations / stats.totalValidations * 100).toFixed(2)}%`);
console.log(`Average duration: ${stats.averageDuration}ms`);
console.log(`Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(2)}%`);
```

### Events

The ValidationService extends EventEmitter and emits the following events:

#### validation:start

Emitted when validation begins.

```typescript
validator.on('validation:start', (event: ValidationStartEvent) => {
  console.log(`Starting validation of ${event.modulePath}`);
});
```

#### validation:complete

Emitted when validation completes successfully.

```typescript
validator.on('validation:complete', (event: ValidationCompleteEvent) => {
  console.log(`Validation completed in ${event.duration}ms`);
});
```

#### validation:error

Emitted when validation encounters an error.

```typescript
validator.on('validation:error', (event: ValidationErrorEvent) => {
  console.error(`Validation error: ${event.error.message}`);
});
```

#### rule:executed

Emitted when each rule is executed.

```typescript
validator.on('rule:executed', (event: RuleExecutedEvent) => {
  console.log(`Rule ${event.rule.name}: ${event.result.status}`);
});
```

### Configuration

#### Default Configuration

```typescript
const defaultOptions: ValidationServiceOptions = {
  parallel: true,
  maxConcurrency: 4,
  timeout: 30000,
  cache: true,
  cacheSize: 100
};
```

#### Environment Variables

The ValidationService respects the following environment variables:

- `UMR_PARALLEL`: Enable/disable parallel validation (true/false)
- `UMR_MAX_CONCURRENCY`: Maximum concurrent validations (number)
- `UMR_TIMEOUT`: Validation timeout in milliseconds (number)
- `UMR_CACHE`: Enable/disable caching (true/false)
- `UMR_CACHE_SIZE`: Maximum cache entries (number)

```bash
# Example environment configuration
export UMR_PARALLEL=true
export UMR_MAX_CONCURRENCY=8
export UMR_TIMEOUT=60000
export UMR_CACHE=true
export UMR_CACHE_SIZE=200
```

### Error Handling

The ValidationService throws specific error types for different failure scenarios:

#### ValidationError

```typescript
class ValidationError extends Error {
  code: string;
  modulePath: string;
  rule?: string;
  details?: any;
}
```

#### TimeoutError

```typescript
class TimeoutError extends ValidationError {
  timeout: number;
}
```

#### Example Error Handling

```typescript
try {
  const result = await validator.validateModule('./packages/auth', rules);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(`Validation failed for ${error.modulePath}: ${error.message}`);
    if (error.rule) {
      console.error(`Failed rule: ${error.rule}`);
    }
  } else if (error instanceof TimeoutError) {
    console.error(`Validation timed out after ${error.timeout}ms`);
  } else {
    console.error(`Unexpected error: ${error.message}`);
  }
}
```

### Performance Considerations

#### Optimization Tips

1. **Use Parallel Validation**: Enable parallel processing for multiple modules
2. **Configure Concurrency**: Adjust `maxConcurrency` based on your system resources
3. **Enable Caching**: Use validation result caching for repeated validations
4. **Rule Filtering**: Use `includeRules`/`excludeRules` to run only necessary rules
5. **Timeout Configuration**: Set appropriate timeouts for your validation complexity

#### Memory Management

```typescript
// Monitor memory usage
const stats = validator.getStatistics();
if (stats.memoryUsage > threshold) {
  validator.clearCache();
}

// Dispose of validator when done
validator.removeAllListeners();
```

### Best Practices

1. **Reuse Instances**: Create one ValidationService instance and reuse it
2. **Handle Events**: Listen to validation events for progress tracking
3. **Error Handling**: Always wrap validation calls in try-catch blocks
4. **Resource Cleanup**: Clear caches and remove listeners when appropriate
5. **Configuration**: Use environment variables for deployment-specific settings

### TypeScript Integration

The ValidationService is fully typed with TypeScript:

```typescript
import {
  ValidationService,
  ValidationServiceOptions,
  ValidationReport,
  ValidationResult,
  ComplianceRule
} from 'cvplus-unified-module-requirements';

// Type-safe usage
const validator: ValidationService = new ValidationService();
const rules: ComplianceRule[] = [/* rules */];
const result: ValidationReport = await validator.validateModule('./module', rules);
```

For more examples and advanced usage patterns, see the [examples documentation](../examples/).