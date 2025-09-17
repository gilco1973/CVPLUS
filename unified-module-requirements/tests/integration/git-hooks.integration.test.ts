import { GitHooksIntegration, GitHookConfig } from '../../src/integrations/git-hooks.js';
import { ValidationService } from '../../src/services/ValidationService.js';
import { RuleSeverity } from '../../src/models/enums.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('GitHooksIntegration', () => {
  let integration: GitHooksIntegration;
  let validationService: ValidationService;
  let tempDir: string;
  let tempGitRepo: string;

  beforeEach(async () => {
    validationService = new ValidationService();

    const config: GitHookConfig = {
      enabled: true,
      hooks: {
        preCommit: true,
        prePush: true,
        postMerge: true
      },
      rules: ['test-rule'],
      severity: RuleSeverity.ERROR,
      blockOnFailure: true,
      autoFix: false
    };

    integration = new GitHooksIntegration(config);

    // Create temporary directory for git repository
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-hooks-test-'));
    tempGitRepo = path.join(tempDir, 'test-repo');
    await fs.mkdir(tempGitRepo);

    // Initialize git repository
    process.chdir(tempGitRepo);
    execSync('git init', { stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { stdio: 'pipe' });
    execSync('git config user.name "Test User"', { stdio: 'pipe' });

    // Create package.json
    await fs.writeFile(
      path.join(tempGitRepo, 'package.json'),
      JSON.stringify({
        name: 'test-module',
        version: '1.0.0',
        type: 'module'
      }, null, 2)
    );
  });

  afterEach(async () => {
    try {
      process.chdir('/');
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('installHooks', () => {
    it('should install git hooks successfully', async () => {
      await integration.installHooks(tempGitRepo);

      // Verify hooks directory exists
      const hooksDir = path.join(tempGitRepo, '.git', 'hooks');
      const hooksDirExists = await fs.access(hooksDir).then(() => true).catch(() => false);
      expect(hooksDirExists).toBe(true);

      // Verify hook files were created
      const preCommitPath = path.join(hooksDir, 'pre-commit');
      const preCommitExists = await fs.access(preCommitPath).then(() => true).catch(() => false);
      expect(preCommitExists).toBe(true);

      const prePushPath = path.join(hooksDir, 'pre-push');
      const prePushExists = await fs.access(prePushPath).then(() => true).catch(() => false);
      expect(prePushExists).toBe(true);

      const postMergePath = path.join(hooksDir, 'post-merge');
      const postMergeExists = await fs.access(postMergePath).then(() => true).catch(() => false);
      expect(postMergeExists).toBe(true);
    });

    it('should handle installation errors for non-git directories', async () => {
      const nonGitDir = path.join(tempDir, 'non-git');
      await fs.mkdir(nonGitDir);

      await expect(integration.installHooks(nonGitDir)).rejects.toThrow();
    });

    it('should handle disabled configuration', async () => {
      const disabledConfig: GitHookConfig = {
        enabled: false,
        hooks: {
          preCommit: true,
          prePush: true,
          postMerge: true
        },
        rules: [],
        severity: RuleSeverity.ERROR,
        blockOnFailure: true,
        autoFix: false
      };

      const disabledIntegration = new GitHooksIntegration(disabledConfig);

      await expect(disabledIntegration.installHooks(tempGitRepo)).rejects.toThrow('Git hooks integration is disabled');
    });
  });

  describe('uninstallHooks', () => {
    beforeEach(async () => {
      await integration.installHooks(tempGitRepo);
    });

    it('should uninstall git hooks successfully', async () => {
      await integration.uninstallHooks(tempGitRepo);

      // Hooks should be removed
      const hooksDir = path.join(tempGitRepo, '.git', 'hooks');
      const hookFiles = ['pre-commit', 'pre-push', 'post-merge'];

      for (const hookFile of hookFiles) {
        const hookPath = path.join(hooksDir, hookFile);
        const hookExists = await fs.access(hookPath).then(() => true).catch(() => false);
        expect(hookExists).toBe(false);
      }
    });

    it('should handle uninstallation from non-git directories gracefully', async () => {
      const nonGitDir = path.join(tempDir, 'non-git');
      await fs.mkdir(nonGitDir);

      // Should not throw
      await expect(integration.uninstallHooks(nonGitDir)).resolves.toBeUndefined();
    });
  });

  describe('executePreCommitValidation', () => {
    beforeEach(async () => {
      await integration.installHooks(tempGitRepo);
    });

    it('should execute pre-commit validation successfully', async () => {
      // Create a simple file and stage it
      const moduleDir = path.join(tempGitRepo, 'src');
      await fs.mkdir(moduleDir, { recursive: true });
      await fs.writeFile(
        path.join(moduleDir, 'index.ts'),
        'export const greeting = "Hello, World!";'
      );

      execSync('git add .', { stdio: 'pipe' });

      const result = await integration.executePreCommitValidation(tempGitRepo);

      expect(result.hook).toBe('pre-commit');
      expect(result.success).toBeDefined();
      expect(result.validationResults).toBeDefined();
      expect(Array.isArray(result.validationResults)).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should handle validation with no staged files', async () => {
      const result = await integration.executePreCommitValidation(tempGitRepo);

      expect(result.hook).toBe('pre-commit');
      expect(result.success).toBeDefined();
      expect(result.validationResults).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('executePrePushValidation', () => {
    beforeEach(async () => {
      await integration.installHooks(tempGitRepo);
    });

    it('should execute pre-push validation successfully', async () => {
      // Create and commit a file
      const moduleDir = path.join(tempGitRepo, 'src');
      await fs.mkdir(moduleDir, { recursive: true });
      await fs.writeFile(
        path.join(moduleDir, 'index.ts'),
        'export const greeting = "Hello, World!";'
      );

      execSync('git add .', { stdio: 'pipe' });
      execSync('git commit -m "Initial commit"', { stdio: 'pipe' });

      const result = await integration.executePrePushValidation(tempGitRepo);

      expect(result.hook).toBe('pre-push');
      expect(result.success).toBeDefined();
      expect(result.validationResults).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('executePostMergeValidation', () => {
    beforeEach(async () => {
      await integration.installHooks(tempGitRepo);
    });

    it('should execute post-merge validation successfully', async () => {
      const result = await integration.executePostMergeValidation(tempGitRepo);

      expect(result.hook).toBe('post-merge');
      expect(result.success).toBeDefined();
      expect(result.validationResults).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('integration scenarios', () => {
    beforeEach(async () => {
      await integration.installHooks(tempGitRepo);
    });

    it('should integrate with ValidationService properly', async () => {
      // Create a module structure that can be validated
      const moduleDir = path.join(tempGitRepo, 'src');
      await fs.mkdir(moduleDir, { recursive: true });
      await fs.writeFile(
        path.join(moduleDir, 'index.ts'),
        'export const greeting = "Hello, World!";'
      );
      await fs.writeFile(
        path.join(moduleDir, 'package.json'),
        JSON.stringify({
          name: 'test-submodule',
          version: '1.0.0',
          type: 'module'
        }, null, 2)
      );

      execSync('git add .', { stdio: 'pipe' });

      // Execute validation through git hooks
      const result = await integration.executePreCommitValidation(tempGitRepo);

      expect(result.success).toBeDefined();
      expect(result.validationResults).toBeDefined();

      if (result.validationResults && result.validationResults.length > 0) {
        // Verify the structure of validation results
        const firstResult = result.validationResults[0];
        expect(firstResult).toBeDefined();
      }
    });

    it('should handle auto-fix when enabled', async () => {
      const autoFixConfig: GitHookConfig = {
        enabled: true,
        hooks: {
          preCommit: true,
          prePush: true,
          postMerge: true
        },
        rules: ['test-rule'],
        severity: RuleSeverity.WARNING,
        blockOnFailure: false,
        autoFix: true
      };

      const autoFixIntegration = new GitHooksIntegration(autoFixConfig);
      await autoFixIntegration.installHooks(tempGitRepo);

      // Create a file that might need auto-fixing
      const moduleDir = path.join(tempGitRepo, 'src');
      await fs.mkdir(moduleDir, { recursive: true });
      await fs.writeFile(
        path.join(moduleDir, 'index.ts'),
        'export const greeting = "Hello, World!";'
      );

      execSync('git add .', { stdio: 'pipe' });

      const result = await autoFixIntegration.executePreCommitValidation(tempGitRepo);

      expect(result.success).toBeDefined();
      expect(Array.isArray(result.autoFixed)).toBe(true);
    });

    it('should handle blocking on failure when configured', async () => {
      const blockingConfig: GitHookConfig = {
        enabled: true,
        hooks: {
          preCommit: true,
          prePush: false,
          postMerge: false
        },
        rules: ['strict-rule'],
        severity: RuleSeverity.ERROR,
        blockOnFailure: true,
        autoFix: false
      };

      const blockingIntegration = new GitHooksIntegration(blockingConfig);
      await blockingIntegration.installHooks(tempGitRepo);

      // Create files and stage them
      const moduleDir = path.join(tempGitRepo, 'src');
      await fs.mkdir(moduleDir, { recursive: true });
      await fs.writeFile(
        path.join(moduleDir, 'index.ts'),
        'export const greeting = "Hello, World!";'
      );

      execSync('git add .', { stdio: 'pipe' });

      const result = await blockingIntegration.executePreCommitValidation(tempGitRepo);

      expect(result.success).toBeDefined();
      expect(result.validationResults).toBeDefined();
    });

    it('should handle multiple hooks in sequence', async () => {
      // Create and commit initial content
      const moduleDir = path.join(tempGitRepo, 'src');
      await fs.mkdir(moduleDir, { recursive: true });
      await fs.writeFile(
        path.join(moduleDir, 'index.ts'),
        'export const greeting = "Hello, World!";'
      );

      execSync('git add .', { stdio: 'pipe' });

      // Execute pre-commit
      const preCommitResult = await integration.executePreCommitValidation(tempGitRepo);
      expect(preCommitResult.hook).toBe('pre-commit');

      // Commit the file
      execSync('git commit -m "Test commit"', { stdio: 'pipe' });

      // Execute pre-push
      const prePushResult = await integration.executePrePushValidation(tempGitRepo);
      expect(prePushResult.hook).toBe('pre-push');

      // Execute post-merge
      const postMergeResult = await integration.executePostMergeValidation(tempGitRepo);
      expect(postMergeResult.hook).toBe('post-merge');

      // All should be successful in basic case
      expect(preCommitResult.success).toBeDefined();
      expect(prePushResult.success).toBeDefined();
      expect(postMergeResult.success).toBeDefined();
    });
  });

  describe('configuration scenarios', () => {
    it('should work with different severity levels', async () => {
      const configs = [
        RuleSeverity.INFO,
        RuleSeverity.WARNING,
        RuleSeverity.ERROR
      ];

      for (const severity of configs) {
        const config: GitHookConfig = {
          enabled: true,
          hooks: {
            preCommit: true,
            prePush: false,
            postMerge: false
          },
          rules: ['test-rule'],
          severity,
          blockOnFailure: false,
          autoFix: false
        };

        const testIntegration = new GitHooksIntegration(config);

        // Should not throw during installation
        await expect(testIntegration.installHooks(tempGitRepo)).resolves.toBeUndefined();

        // Clean up for next iteration
        await testIntegration.uninstallHooks(tempGitRepo);
      }
    });

    it('should work with selective hook enablement', async () => {
      const hookConfigurations = [
        { preCommit: true, prePush: false, postMerge: false },
        { preCommit: false, prePush: true, postMerge: false },
        { preCommit: false, prePush: false, postMerge: true },
        { preCommit: true, prePush: true, postMerge: true }
      ];

      for (const hooks of hookConfigurations) {
        const config: GitHookConfig = {
          enabled: true,
          hooks,
          rules: ['test-rule'],
          severity: RuleSeverity.WARNING,
          blockOnFailure: false,
          autoFix: false
        };

        const testIntegration = new GitHooksIntegration(config);

        // Should install without issues
        await expect(testIntegration.installHooks(tempGitRepo)).resolves.toBeUndefined();

        // Clean up for next iteration
        await testIntegration.uninstallHooks(tempGitRepo);
      }
    });
  });
});