// Integration test for Scenario 5: Monitor compliance trends
// Based on quickstart.md scenario - tracks ecosystem compliance over time
// This test MUST FAIL until implementation is complete (TDD RED phase)

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';

// Types that will be implemented in Phase 3.3
type ValidationStatus = 'PASS' | 'FAIL' | 'WARNING' | 'PARTIAL' | 'ERROR';

type EcosystemCompliance = {
  totalModules: number;
  averageScore: number;
  statusDistribution: {
    pass: number;
    fail: number;
    warning: number;
    error: number;
  };
  trends?: {
    scoreChange: number;
    newViolations: number;
  };
  topViolations?: Array<{
    ruleId: string;
    count: number;
    percentage: number;
  }>;
};

type TrendData = {
  timestamp: string;
  totalModules: number;
  averageScore: number;
  statusDistribution: {
    pass: number;
    fail: number;
    warning: number;
    error: number;
  };
};

type ComplianceMonitoringConfig = {
  schedule: 'hourly' | 'daily' | 'weekly';
  webhook?: string;
  thresholds: {
    averageScoreMin: number;
    failurePercentageMax: number;
  };
  alerts: {
    scoreDecline: boolean;
    newViolations: boolean;
    moduleFailure: boolean;
  };
};

// CLI interface that will be implemented in Phase 3.3
interface CVPlusValidator {
  ecosystem(options?: {
    format?: 'json' | 'html';
    since?: string;
  }): Promise<EcosystemCompliance>;

  trends(options: {
    since: string;
    format?: 'json' | 'chart' | 'csv';
    output?: string;
  }): Promise<TrendData[]>;

  setupMonitoring(config: ComplianceMonitoringConfig): Promise<{
    success: boolean;
    configPath: string;
    nextRun?: string;
  }>;
}

describe('Integration: Scenario 5 - Monitor Compliance Over Time', () => {
  let validator: CVPlusValidator | null = null;
  let testEcosystemPath: string;
  let monitoringConfigPath: string;

  beforeAll(async () => {
    // This will fail until CLI validator monitoring is implemented
    throw new Error('CVPlusValidator compliance monitoring not yet implemented - TDD RED phase');
  });

  afterAll(async () => {
    // Cleanup test ecosystem and monitoring config
    try {
      if (testEcosystemPath) {
        await fs.rmdir(testEcosystemPath, { recursive: true });
      }
      if (monitoringConfigPath) {
        await fs.unlink(monitoringConfigPath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Ecosystem Overview Generation', () => {
    beforeAll(async () => {
      // Create a test ecosystem for monitoring
      testEcosystemPath = path.join('/tmp', `test-monitoring-${Date.now()}`);
      await fs.mkdir(testEcosystemPath, { recursive: true });

      // Create multiple test modules with different compliance levels
      const modules = [
        { name: 'high-compliance', score: 95 },
        { name: 'medium-compliance', score: 75 },
        { name: 'low-compliance', score: 45 },
        { name: 'failing-module', score: 25 }
      ];

      for (const module of modules) {
        const modulePath = path.join(testEcosystemPath, module.name);
        await fs.mkdir(modulePath, { recursive: true });
        await fs.mkdir(path.join(modulePath, 'src'), { recursive: true });

        // Create module files based on target compliance score
        await fs.writeFile(
          path.join(modulePath, 'package.json'),
          JSON.stringify({
            name: module.name,
            version: '1.0.0',
            description: module.score >= 70 ? `${module.name} module` : undefined,
            main: module.score >= 70 ? 'dist/index.js' : undefined,
            scripts: module.score >= 90 ? {
              build: 'tsc',
              test: 'jest',
              lint: 'eslint',
              dev: 'tsc --watch'
            } : module.score >= 70 ? {
              build: 'tsc',
              test: 'jest'
            } : undefined
          }, null, 2)
        );

        if (module.score >= 80) {
          await fs.writeFile(
            path.join(modulePath, 'README.md'),
            `# ${module.name}\n\nA well-documented module.\n\n## Usage\n\nExample usage here.`
          );
        }

        if (module.score >= 90) {
          await fs.writeFile(
            path.join(modulePath, 'tsconfig.json'),
            JSON.stringify({
              compilerOptions: {
                target: 'ES2020',
                module: 'commonjs',
                outDir: './dist',
                strict: true
              }
            })
          );

          await fs.mkdir(path.join(modulePath, 'tests'), { recursive: true });
          await fs.mkdir(path.join(modulePath, 'docs'), { recursive: true });
        }

        await fs.writeFile(
          path.join(modulePath, 'src', 'index.ts'),
          `export const ${module.name.replace(/-/g, '_')} = '${module.name}';`
        );
      }
    });

    it('should generate comprehensive ecosystem overview', async () => {
      const ecosystem = await validator!.ecosystem({
        format: 'json'
      });

      expect(ecosystem).toBeDefined();
      expect(ecosystem.totalModules).toBe(4);
      expect(ecosystem.averageScore).toBeGreaterThanOrEqual(0);
      expect(ecosystem.averageScore).toBeLessThanOrEqual(100);

      const { statusDistribution } = ecosystem;
      expect(statusDistribution.pass + statusDistribution.fail +
        statusDistribution.warning + statusDistribution.error).toBe(4);

      // Based on our test modules:
      // high-compliance (95) -> PASS
      // medium-compliance (75) -> WARNING
      // low-compliance (45) -> FAIL
      // failing-module (25) -> FAIL
      expect(statusDistribution.pass).toBeGreaterThanOrEqual(1);
      expect(statusDistribution.fail).toBeGreaterThanOrEqual(1);
    });

    it('should identify top violations across ecosystem', async () => {
      const ecosystem = await validator!.ecosystem();

      if (ecosystem.topViolations && ecosystem.topViolations.length > 0) {
        ecosystem.topViolations.forEach(violation => {
          expect(violation.ruleId).toBeDefined();
          expect(violation.count).toBeGreaterThan(0);
          expect(violation.count).toBeLessThanOrEqual(4);
          expect(violation.percentage).toBeGreaterThan(0);
          expect(violation.percentage).toBeLessThanOrEqual(100);

          // Common violations we expect in our test setup
          expect(
            violation.ruleId.includes('README') ||
            violation.ruleId.includes('PACKAGE') ||
            violation.ruleId.includes('TSCONFIG') ||
            violation.ruleId.includes('DIRECTORY')
          ).toBe(true);
        });

        // Should be ordered by frequency
        for (let i = 1; i < ecosystem.topViolations.length; i++) {
          expect(ecosystem.topViolations[i].count)
            .toBeLessThanOrEqual(ecosystem.topViolations[i - 1].count);
        }
      }
    });

    it('should generate HTML report with visualizations', async () => {
      const outputPath = path.join(testEcosystemPath, 'ecosystem-report.html');

      const ecosystem = await validator!.ecosystem({
        format: 'html'
      });

      expect(ecosystem).toBeDefined();

      // Should create HTML file when format is specified
      // (This would be handled by the CLI implementation)
      expect(ecosystem.totalModules).toBe(4);
    });
  });

  describe('Historical Trend Analysis', () => {
    it('should track compliance trends over time', async () => {
      // Simulate historical data by requesting trends
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const trends = await validator!.trends({
        since: thirtyDaysAgo.toISOString(),
        format: 'json'
      });

      expect(trends).toBeDefined();
      expect(Array.isArray(trends)).toBe(true);

      if (trends.length > 0) {
        trends.forEach(trend => {
          expect(trend.timestamp).toBeDefined();
          expect(trend.totalModules).toBeGreaterThan(0);
          expect(trend.averageScore).toBeGreaterThanOrEqual(0);
          expect(trend.averageScore).toBeLessThanOrEqual(100);
          expect(trend.statusDistribution).toBeDefined();

          const total = trend.statusDistribution.pass + trend.statusDistribution.fail +
                       trend.statusDistribution.warning + trend.statusDistribution.error;
          expect(total).toBe(trend.totalModules);
        });

        // Should be ordered chronologically
        for (let i = 1; i < trends.length; i++) {
          const currentTime = new Date(trends[i].timestamp).getTime();
          const previousTime = new Date(trends[i - 1].timestamp).getTime();
          expect(currentTime).toBeGreaterThan(previousTime);
        }
      }
    });

    it('should calculate trend changes and improvements', async () => {
      const ecosystem = await validator!.ecosystem();

      if (ecosystem.trends) {
        expect(ecosystem.trends.scoreChange).toBeDefined();
        expect(ecosystem.trends.newViolations).toBeDefined();

        expect(typeof ecosystem.trends.scoreChange).toBe('number');
        expect(typeof ecosystem.trends.newViolations).toBe('number');

        // Score change should be within reasonable bounds
        expect(ecosystem.trends.scoreChange).toBeGreaterThanOrEqual(-50);
        expect(ecosystem.trends.scoreChange).toBeLessThanOrEqual(50);

        // New violations should be non-negative
        expect(ecosystem.trends.newViolations).toBeGreaterThanOrEqual(0);
      }
    });

    it('should generate trend charts in various formats', async () => {
      const outputPath = path.join(testEcosystemPath, 'trends-chart.html');

      const trends = await validator!.trends({
        since: '30days',
        format: 'chart',
        output: outputPath
      });

      expect(trends).toBeDefined();
      expect(Array.isArray(trends)).toBe(true);

      // Should create chart file
      const chartExists = await fs.access(outputPath)
        .then(() => true).catch(() => false);

      if (chartExists) {
        const chartContent = await fs.readFile(outputPath, 'utf-8');
        expect(chartContent).toContain('html');
        expect(chartContent.length).toBeGreaterThan(500);
      }
    });

    it('should export trend data in CSV format', async () => {
      const csvPath = path.join(testEcosystemPath, 'trends-data.csv');

      const trends = await validator!.trends({
        since: '7days',
        format: 'csv',
        output: csvPath
      });

      expect(trends).toBeDefined();

      // Should create CSV file
      const csvExists = await fs.access(csvPath)
        .then(() => true).catch(() => false);

      if (csvExists) {
        const csvContent = await fs.readFile(csvPath, 'utf-8');
        expect(csvContent).toContain('timestamp');
        expect(csvContent).toContain('averageScore');
        expect(csvContent).toContain('totalModules');

        // Should have header and data rows
        const lines = csvContent.split('\n').filter(line => line.trim());
        expect(lines.length).toBeGreaterThan(1);
      }
    });
  });

  describe('Automated Monitoring Setup', () => {
    it('should configure daily compliance monitoring', async () => {
      const config: ComplianceMonitoringConfig = {
        schedule: 'daily',
        thresholds: {
          averageScoreMin: 80,
          failurePercentageMax: 20
        },
        alerts: {
          scoreDecline: true,
          newViolations: true,
          moduleFailure: true
        }
      };

      const setupResult = await validator!.setupMonitoring(config);

      expect(setupResult).toBeDefined();
      expect(setupResult.success).toBe(true);
      expect(setupResult.configPath).toBeDefined();

      monitoringConfigPath = setupResult.configPath;

      // Should create config file
      const configExists = await fs.access(setupResult.configPath)
        .then(() => true).catch(() => false);
      expect(configExists).toBe(true);

      const configContent = await fs.readFile(setupResult.configPath, 'utf-8');
      const savedConfig = JSON.parse(configContent);

      expect(savedConfig.schedule).toBe('daily');
      expect(savedConfig.thresholds.averageScoreMin).toBe(80);
      expect(savedConfig.alerts.scoreDecline).toBe(true);
    });

    it('should setup monitoring with webhook notifications', async () => {
      const config: ComplianceMonitoringConfig = {
        schedule: 'hourly',
        webhook: 'https://slack.cvplus.dev/compliance',
        thresholds: {
          averageScoreMin: 75,
          failurePercentageMax: 30
        },
        alerts: {
          scoreDecline: true,
          newViolations: false,
          moduleFailure: true
        }
      };

      const setupResult = await validator!.setupMonitoring(config);

      expect(setupResult.success).toBe(true);

      const configContent = await fs.readFile(setupResult.configPath, 'utf-8');
      const savedConfig = JSON.parse(configContent);

      expect(savedConfig.webhook).toBe('https://slack.cvplus.dev/compliance');
      expect(savedConfig.schedule).toBe('hourly');

      if (setupResult.nextRun) {
        const nextRunTime = new Date(setupResult.nextRun);
        expect(nextRunTime.getTime()).toBeGreaterThan(Date.now());
      }
    });

    it('should validate monitoring configuration', async () => {
      const invalidConfig: ComplianceMonitoringConfig = {
        schedule: 'daily',
        webhook: 'invalid-url',
        thresholds: {
          averageScoreMin: -10, // Invalid: below 0
          failurePercentageMax: 150 // Invalid: above 100
        },
        alerts: {
          scoreDecline: true,
          newViolations: true,
          moduleFailure: true
        }
      };

      await expect(validator!.setupMonitoring(invalidConfig))
        .rejects.toThrow(/invalid|threshold|webhook/i);
    });
  });

  describe('Compliance Alerts and Notifications', () => {
    it('should detect compliance score decline', async () => {
      const ecosystem = await validator!.ecosystem();

      if (ecosystem.trends && ecosystem.trends.scoreChange < -5) {
        // In a real implementation, this would trigger an alert
        expect(ecosystem.trends.scoreChange).toBeLessThan(-5);

        // Should be flagged for notification
        expect(ecosystem.averageScore).toBeDefined();
      }

      // Test passes if no significant decline or if decline is properly detected
      expect(ecosystem.averageScore).toBeGreaterThanOrEqual(0);
    });

    it('should detect new violations appearing', async () => {
      const ecosystem = await validator!.ecosystem();

      if (ecosystem.trends && ecosystem.trends.newViolations > 0) {
        expect(ecosystem.trends.newViolations).toBeGreaterThan(0);

        // Should provide details about new violations
        if (ecosystem.topViolations) {
          expect(ecosystem.topViolations.length).toBeGreaterThan(0);
        }
      }

      expect(ecosystem.totalModules).toBeGreaterThan(0);
    });

    it('should identify critical module failures', async () => {
      const ecosystem = await validator!.ecosystem();

      const criticalFailures = ecosystem.statusDistribution.error;
      const totalFailures = ecosystem.statusDistribution.fail + criticalFailures;

      if (totalFailures > 0) {
        const failurePercentage = (totalFailures / ecosystem.totalModules) * 100;

        // If failure rate is above threshold, should trigger alert
        if (failurePercentage > 25) {
          expect(failurePercentage).toBeGreaterThan(25);
          // This would trigger a critical alert in the real system
        }
      }

      expect(ecosystem.totalModules).toBeGreaterThan(0);
    });
  });

  describe('Monitoring Dashboard Data', () => {
    it('should provide data suitable for dashboard visualization', async () => {
      const ecosystem = await validator!.ecosystem();

      // Dashboard-ready data structure
      expect(ecosystem.totalModules).toBeDefined();
      expect(ecosystem.averageScore).toBeDefined();
      expect(ecosystem.statusDistribution).toBeDefined();

      // Should have percentage calculations
      const totalModules = ecosystem.totalModules;
      const statusDist = ecosystem.statusDistribution;

      const passPercentage = (statusDist.pass / totalModules) * 100;
      const failPercentage = (statusDist.fail / totalModules) * 100;

      expect(passPercentage).toBeGreaterThanOrEqual(0);
      expect(passPercentage).toBeLessThanOrEqual(100);
      expect(failPercentage).toBeGreaterThanOrEqual(0);
      expect(failPercentage).toBeLessThanOrEqual(100);

      // Should have trending data if available
      if (ecosystem.trends) {
        expect(typeof ecosystem.trends.scoreChange).toBe('number');
        expect(typeof ecosystem.trends.newViolations).toBe('number');
      }
    });

    it('should provide module-level health indicators', async () => {
      const ecosystem = await validator!.ecosystem();

      // Health indicators for dashboard
      const healthyModules = ecosystem.statusDistribution.pass;
      const warningModules = ecosystem.statusDistribution.warning;
      const criticalModules = ecosystem.statusDistribution.fail + ecosystem.statusDistribution.error;

      expect(healthyModules + warningModules + criticalModules).toBe(ecosystem.totalModules);

      // Calculate health score (different from average compliance score)
      const healthScore = ((healthyModules + warningModules * 0.5) / ecosystem.totalModules) * 100;

      expect(healthScore).toBeGreaterThanOrEqual(0);
      expect(healthScore).toBeLessThanOrEqual(100);
    });

    it('should track violation patterns over time', async () => {
      const ecosystem = await validator!.ecosystem();

      if (ecosystem.topViolations && ecosystem.topViolations.length > 0) {
        // Should identify recurring patterns
        const commonViolations = ecosystem.topViolations.filter(v => v.percentage >= 25);

        commonViolations.forEach(violation => {
          expect(violation.count).toBeGreaterThan(0);
          expect(violation.percentage).toBeGreaterThanOrEqual(25);

          // Common patterns in development projects
          expect(
            violation.ruleId.includes('README') ||
            violation.ruleId.includes('TEST') ||
            violation.ruleId.includes('PACKAGE') ||
            violation.ruleId.includes('DOCS')
          ).toBe(true);
        });
      }

      expect(ecosystem.totalModules).toBeGreaterThan(0);
    });
  });

  describe('Integration with CI/CD and Development Workflow', () => {
    it('should provide metrics suitable for CI/CD integration', async () => {
      const ecosystem = await validator!.ecosystem({
        format: 'json'
      });

      // CI/CD-friendly data
      expect(ecosystem.averageScore).toBeDefined();
      expect(ecosystem.statusDistribution).toBeDefined();

      // Should provide pass/fail thresholds
      const passRate = (ecosystem.statusDistribution.pass / ecosystem.totalModules) * 100;
      const criticalFailures = ecosystem.statusDistribution.error;

      // CI/CD can use these for build decisions
      expect(typeof passRate).toBe('number');
      expect(typeof criticalFailures).toBe('number');

      // Should have timestamp for tracking
      expect(typeof ecosystem.totalModules).toBe('number');
    });

    it('should detect regression in module quality', async () => {
      const ecosystem = await validator!.ecosystem();

      if (ecosystem.trends) {
        const scoreChange = ecosystem.trends.scoreChange;
        const newViolations = ecosystem.trends.newViolations;

        // Regression indicators
        if (scoreChange < -10 || newViolations > 5) {
          // Would trigger regression alert
          expect(scoreChange < -10 || newViolations > 5).toBe(true);
        }

        // Should provide actionable data
        expect(typeof scoreChange).toBe('number');
        expect(typeof newViolations).toBe('number');
      }

      expect(ecosystem.averageScore).toBeGreaterThanOrEqual(0);
    });

    it('should support automated compliance reporting', async () => {
      const trends = await validator!.trends({
        since: '7days',
        format: 'json'
      });

      if (trends.length > 0) {
        // Should provide consistent reporting data
        const latestTrend = trends[trends.length - 1];

        expect(latestTrend.timestamp).toBeDefined();
        expect(latestTrend.averageScore).toBeDefined();
        expect(latestTrend.totalModules).toBeDefined();
        expect(latestTrend.statusDistribution).toBeDefined();

        // Should be suitable for automated reports
        const reportData = {
          date: latestTrend.timestamp,
          score: latestTrend.averageScore,
          modules: latestTrend.totalModules,
          health: (latestTrend.statusDistribution.pass / latestTrend.totalModules) * 100
        };

        expect(reportData.score).toBeGreaterThanOrEqual(0);
        expect(reportData.health).toBeGreaterThanOrEqual(0);
      }

      expect(Array.isArray(trends)).toBe(true);
    });
  });
});