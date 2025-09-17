# CLI Reference Guide

Complete reference for the CVPlus Unified Module Requirements command-line interface.

## Installation

```bash
# Install globally
npm install -g cvplus-unified-module-requirements

# Or use npx (recommended)
npx umr --help
```

## Global Options

These options are available for all commands:

```bash
--config, -c      Path to configuration file (default: umr.config.json)
--verbose, -v     Enable verbose output
--quiet, -q       Suppress non-error output
--help, -h        Show help information
--version, -V     Show version number
```

## Commands

### `umr validate`

Validate modules against compliance rules.

#### Syntax

```bash
umr validate [paths...] [options]
```

#### Arguments

- `paths`: Module paths to validate (default: current directory)

#### Options

```bash
--rules, -r           Comma-separated list of rules to run
--exclude-rules       Comma-separated list of rules to skip
--severity, -s        Minimum severity level (info|warning|error|critical)
--output, -o          Output format (summary|detailed|json|junit|sarif)
--report-path         Directory to save reports
--parallel            Enable parallel validation (default: true)
--max-concurrency     Maximum concurrent validations (default: 4)
--timeout             Validation timeout in milliseconds (default: 30000)
--recursive           Recursively validate subdirectories
--stop-on-error       Stop validation on first error
--cache               Enable result caching (default: true)
--watch, -w           Watch for file changes and re-validate
```

#### Examples

```bash
# Validate current directory
umr validate

# Validate specific modules
umr validate ./packages/auth ./packages/api

# Validate with specific rules
umr validate --rules=structure,dependencies,performance

# Generate detailed JSON report
umr validate --output=json --report-path=./reports

# Validate recursively with verbose output
umr validate ./packages --recursive --verbose

# Watch mode for continuous validation
umr validate --watch --output=summary

# Validate with custom configuration
umr validate --config=./custom-umr.config.json
```

#### Exit Codes

- `0`: All validations passed
- `1`: One or more validations failed
- `2`: Configuration or runtime error

---

### `umr generate`

Generate module templates, configurations, and boilerplate code.

#### Syntax

```bash
umr generate <type> [options]
```

#### Types

- `module`: Generate a new module
- `config`: Generate configuration file
- `rule`: Generate custom rule template
- `integration`: Generate integration configuration

#### Options

```bash
--name, -n            Name for the generated item
--template, -t        Template to use (default|typescript|javascript|node)
--output, -o          Output directory (default: current directory)
--force, -f           Overwrite existing files
--interactive, -i     Interactive mode with prompts
--dry-run             Show what would be generated without creating files
```

#### Examples

```bash
# Generate a new TypeScript module
umr generate module --name=my-module --template=typescript

# Generate configuration file
umr generate config --name=umr.config.json

# Generate custom rule template
umr generate rule --name=my-custom-rule --output=./rules

# Interactive module generation
umr generate module --interactive

# Dry run to preview generation
umr generate module --name=test-module --dry-run
```

#### Module Templates

**default**: Basic module structure with package.json
**typescript**: TypeScript module with tsconfig.json
**javascript**: JavaScript module with modern features
**node**: Node.js module with Express.js setup

---

### `umr migrate`

Migrate existing codebases to modular architecture.

#### Syntax

```bash
umr migrate [options]
```

#### Options

```bash
--from                Source architecture (monolith|multi-repo|custom)
--to                  Target architecture (submodules|packages|micro)
--source              Source directory (default: current directory)
--target              Target directory (default: ./migrated)
--strategy            Migration strategy (copy|move|symlink)
--analyze-only        Analyze migration requirements without executing
--create-plan         Generate migration plan file
--execute-plan        Execute existing migration plan
--preserve-history    Preserve git history during migration
--batch-size          Number of files to process in each batch (default: 100)
```

#### Examples

```bash
# Analyze migration requirements
umr migrate --from=monolith --to=submodules --analyze-only

# Create migration plan
umr migrate --from=monolith --to=submodules --create-plan

# Execute migration
umr migrate --from=monolith --to=submodules --target=./new-structure

# Execute existing plan
umr migrate --execute-plan=./migration-plan.json
```

#### Migration Strategies

**copy**: Copy files to new structure (preserves original)
**move**: Move files to new structure (modifies original)
**symlink**: Create symbolic links (requires Unix-like system)

---

### `umr monitor`

Monitor module ecosystem health and performance.

#### Syntax

```bash
umr monitor [options]
```

#### Options

```bash
--watch, -w           Continuous monitoring mode
--interval            Monitoring interval in seconds (default: 60)
--threshold           Health threshold percentage (default: 90)
--metrics             Metrics to collect (performance|quality|dependencies|all)
--output              Output format (dashboard|json|csv|prometheus)
--port                Dashboard port (default: 3000)
--alert-webhook       Webhook URL for alerts
--alert-email         Email address for alerts
--export              Export monitoring data to file
```

#### Examples

```bash
# Start continuous monitoring
umr monitor --watch --interval=30

# Monitor with web dashboard
umr monitor --watch --output=dashboard --port=3000

# Export performance metrics
umr monitor --metrics=performance --export=./metrics.csv

# Monitor with alerts
umr monitor --watch --alert-email=admin@example.com --threshold=85
```

#### Metrics

**performance**: Validation duration, memory usage, throughput
**quality**: Rule success rates, code quality trends
**dependencies**: Dependency health, security vulnerabilities
**all**: All available metrics

---

### `umr install-hooks`

Install git hooks for automated validation.

#### Syntax

```bash
umr install-hooks [options]
```

#### Options

```bash
--hooks               Hooks to install (pre-commit|pre-push|post-merge|all)
--force, -f           Overwrite existing hooks
--config              Path to hook configuration file
--auto-fix            Enable automatic fixes during validation
--block-on-error      Block git operations on validation errors
--skip-existing       Skip installation if hooks already exist
```

#### Examples

```bash
# Install all hooks
umr install-hooks

# Install specific hooks
umr install-hooks --hooks=pre-commit,pre-push

# Install with auto-fix enabled
umr install-hooks --auto-fix --force

# Install with custom configuration
umr install-hooks --config=./hooks.config.json
```

---

### `umr configure-cicd`

Configure CI/CD pipeline integration.

#### Syntax

```bash
umr configure-cicd <platform> [options]
```

#### Platforms

- `github`: GitHub Actions
- `gitlab`: GitLab CI
- `jenkins`: Jenkins
- `azure`: Azure DevOps
- `circleci`: CircleCI

#### Options

```bash
--output              Output directory for configuration files
--template            Configuration template (basic|advanced|custom)
--stages              CI/CD stages to include (validation|testing|security|deployment)
--parallel            Enable parallel stage execution
--artifacts           Artifact paths to preserve
--notifications       Enable notifications (slack|email|webhook)
```

#### Examples

```bash
# Configure GitHub Actions
umr configure-cicd github --template=advanced

# Configure GitLab CI with custom stages
umr configure-cicd gitlab --stages=validation,testing,security

# Configure Jenkins with notifications
umr configure-cicd jenkins --notifications=slack --parallel
```

---

### `umr doctor`

Diagnose and troubleshoot common issues.

#### Syntax

```bash
umr doctor [options]
```

#### Options

```bash
--fix                 Automatically fix detected issues
--check               Specific checks to run (config|dependencies|permissions|performance)
--report              Generate diagnostic report
--verbose             Show detailed diagnostic information
```

#### Examples

```bash
# Run all diagnostics
umr doctor

# Check and fix configuration issues
umr doctor --check=config --fix

# Generate diagnostic report
umr doctor --report --verbose
```

#### Diagnostic Checks

**config**: Validate configuration files and settings
**dependencies**: Check for missing or outdated dependencies
**permissions**: Verify file and directory permissions
**performance**: Analyze performance bottlenecks

---

## Configuration File

### Basic Configuration (`umr.config.json`)

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
    }
  ],
  "validation": {
    "parallel": true,
    "maxConcurrency": 4,
    "timeout": 30000
  },
  "output": {
    "format": "detailed",
    "destination": "./reports"
  },
  "ignore": [
    "**/node_modules/**",
    "**/dist/**",
    "**/*.d.ts"
  ]
}
```

### Advanced Configuration

```json
{
  "extends": ["@cvplus/umr-config-standard"],
  "rules": [
    {
      "name": "customRule",
      "enabled": true,
      "severity": "warning",
      "options": {
        "customOption": "value"
      }
    }
  ],
  "validation": {
    "parallel": true,
    "maxConcurrency": 8,
    "timeout": 60000,
    "cache": true,
    "cacheSize": 200
  },
  "integrations": {
    "gitHooks": {
      "enabled": true,
      "hooks": ["pre-commit", "pre-push"],
      "autoFix": true
    },
    "cicd": {
      "platform": "github",
      "stages": ["validation", "testing", "security"]
    },
    "errorTracking": {
      "provider": "sentry",
      "dsn": "https://...@sentry.io/...",
      "environment": "production"
    }
  },
  "output": {
    "formats": ["json", "html", "junit"],
    "destination": "./reports",
    "includeTimestamp": true
  },
  "performance": {
    "benchmarking": true,
    "profiling": false,
    "memoryLimit": "512MB"
  }
}
```

## Environment Variables

Configure UMR behavior using environment variables:

```bash
# Core Configuration
UMR_CONFIG_PATH=./custom-config.json
UMR_PARALLEL=true
UMR_MAX_CONCURRENCY=8
UMR_TIMEOUT=60000

# Output Configuration
UMR_OUTPUT_FORMAT=json
UMR_REPORT_PATH=./reports
UMR_VERBOSE=true

# Performance Configuration
UMR_CACHE=true
UMR_CACHE_SIZE=200
UMR_MEMORY_LIMIT=512

# Integration Configuration
UMR_GIT_HOOKS_ENABLED=true
UMR_CICD_PLATFORM=github
UMR_ERROR_TRACKING_DSN=https://...@sentry.io/...
```

## Output Formats

### Summary Format

```
=== Validation Summary ===
Modules: 3/3 passed
Rules: 12/15 passed
Warnings: 2
Duration: 1.2s
```

### Detailed Format

```
=== Module: auth ===
✅ moduleStructure: Module structure is valid
✅ dependencyValidation: All dependencies are valid
⚠️  fileSize: File auth.service.ts exceeds 200 lines (245 lines)

=== Module: api ===
✅ moduleStructure: Module structure is valid
❌ codeQuality: High cyclomatic complexity detected
```

### JSON Format

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "summary": {
    "totalModules": 3,
    "passedModules": 2,
    "failedModules": 1,
    "totalRules": 15,
    "passedRules": 12,
    "failedRules": 3,
    "warnings": 2
  },
  "results": [
    {
      "moduleId": "auth",
      "status": "passed",
      "summary": { "total": 5, "passed": 5, "failed": 0, "warnings": 1 },
      "results": [...]
    }
  ]
}
```

## Error Handling

### Common Exit Codes

- `0`: Success
- `1`: Validation failures
- `2`: Configuration error
- `3`: Runtime error
- `4`: Permission error
- `5`: Network error

### Error Messages

```bash
# Configuration errors
Error: Configuration file not found: umr.config.json
Error: Invalid rule configuration: unknown rule 'invalidRule'

# Runtime errors
Error: Module path does not exist: ./nonexistent/module
Error: Validation timeout after 30000ms

# Permission errors
Error: Permission denied: cannot write to ./reports
Error: Git hooks installation failed: permission denied
```

## Troubleshooting

### Common Issues

**"Command not found: umr"**
```bash
# Ensure package is installed globally
npm list -g cvplus-unified-module-requirements

# Or use npx
npx umr --version
```

**"Configuration file not found"**
```bash
# Create default configuration
umr generate config

# Or specify custom path
umr validate --config=./my-config.json
```

**"Validation timeout"**
```bash
# Increase timeout
umr validate --timeout=60000

# Or in configuration file
{
  "validation": {
    "timeout": 60000
  }
}
```

**"Permission denied for git hooks"**
```bash
# Fix hook permissions
chmod +x .git/hooks/*

# Reinstall with force
umr install-hooks --force
```

### Debug Mode

Enable debug output for troubleshooting:

```bash
# Enable debug logging
DEBUG=umr:* umr validate

# Specific debug categories
DEBUG=umr:validation umr validate
DEBUG=umr:rules umr validate
DEBUG=umr:config umr validate
```

### Performance Issues

```bash
# Reduce concurrency
umr validate --max-concurrency=2

# Disable caching
umr validate --no-cache

# Skip expensive rules
umr validate --exclude-rules=performance,security
```

For more troubleshooting help, see the [troubleshooting guide](./troubleshooting.md) or open an issue on GitHub.