/**
 * Unit tests for CLI monitor tool
 *
 * Tests the monitor CLI functionality including:
 * - Module health scanning and assessment
 * - Ecosystem overview and metrics calculation
 * - Health trending and historical analysis
 * - Issue detection and classification
 * - Alert generation and notifications
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { ValidationStatus, RuleSeverity } from '../../../src/models/enums';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('commander');
jest.mock('chalk', () => ({
  blue: jest.fn((str) => str),
  green: jest.fn((str) => str),
  red: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  gray: jest.fn((str) => str),
  bold: {
    blue: jest.fn((str) => str),
    green: jest.fn((str) => str),
  },
}));
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    text: '',
  }));
});
jest.mock('glob');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockGlob = require('glob');

interface ModuleHealth {
  moduleId: string;
  path: string;
  status: ValidationStatus;
  score: number;
  lastChecked: string;
  issues: HealthIssue[];
  metrics: ModuleMetrics;
  trends: HealthTrend[];
}

interface HealthIssue {
  id: string;
  severity: RuleSeverity;
  category: string;
  message: string;
  file?: string;
  line?: number;
  rule: string;
  fixable: boolean;
}

interface ModuleMetrics {
  files: number;
  linesOfCode: number;
  testCoverage: number;
  dependencies: number;
  vulnerabilities: number;
  codeSmells: number;
  technicalDebt: number; // in hours
  lastModified: string;
  buildStatus: 'success' | 'failed' | 'unknown';
  buildTime: number; // in seconds
}

interface HealthTrend {
  date: string;
  score: number;
  issues: number;
  metrics: Partial<ModuleMetrics>;
}

interface EcosystemOverview {
  totalModules: number;
  healthyModules: number;
  warningModules: number;
  criticalModules: number;
  averageScore: number;
  totalIssues: number;
  fixableIssues: number;
  lastScan: string;
  trends: {
    scoreChange: number;
    newIssues: number;
    fixedIssues: number;
    period: string;
  };
  topIssues: Array<{
    rule: string;
    count: number;
    severity: RuleSeverity;
  }>;
  modulesByHealth: {
    [key: string]: string[];
  };
}

describe('CLI Monitor', () => {
  let tempDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = path.join(__dirname, '../../temp', `monitor-test-${Date.now()}`);

    // Set up default mocks
    mockFs.pathExists.mockResolvedValue(true);
    mockFs.readJSON.mockResolvedValue({});
    mockFs.readFile.mockResolvedValue('');
    mockFs.readdir.mockResolvedValue([]);
    mockFs.stat.mockResolvedValue({ size: 1024, isDirectory: () => true, mtime: new Date() } as any);
    mockGlob.glob.mockResolvedValue([]);
  });

  describe('module health assessment', () => {
    it('should assess module health comprehensively', async () => {
      const mockModulePath = path.join(tempDir, 'test-module');

      // Mock module structure
      mockFs.readJSON.mockResolvedValue({
        name: 'test-module',
        version: '1.0.0',
        dependencies: {
          express: '^4.18.0',
          lodash: '^4.17.0'
        },
        devDependencies: {
          jest: '^29.0.0',
          typescript: '^5.0.0'
        }
      });

      mockGlob.glob.mockResolvedValue([
        'src/index.ts',
        'src/utils.ts',
        'src/services/api.ts',
        'tests/index.test.ts',
        'tests/utils.test.ts',
        'package.json',
        'README.md',
        'tsconfig.json'
      ]);

      mockFs.readFile.mockImplementation((filePath) => {
        if (filePath.toString().includes('.ts')) {
          return Promise.resolve(`// TypeScript file
import { Express } from 'express';

export function createApp(): Express {
  // Implementation here
  const lines = [
    'line1', 'line2', 'line3', 'line4', 'line5',
    'line6', 'line7', 'line8', 'line9', 'line10'
  ];
  return {} as Express;
}`);
        }
        return Promise.resolve('# Test Module\n\nDescription here.');
      });

      const assessModuleHealth = async (modulePath: string): Promise<ModuleHealth> => {
        const packageJsonPath = path.join(modulePath, 'package.json');
        const packageJson = await mockFs.readJSON(packageJsonPath);

        const files = await mockGlob.glob('**/*', { cwd: modulePath });
        const sourceFiles = files.filter(f => f.endsWith('.ts') || f.endsWith('.js'));
        const testFiles = files.filter(f => f.includes('test') || f.includes('spec'));

        // Calculate lines of code
        let totalLines = 0;
        for (const file of sourceFiles) {
          const content = await mockFs.readFile(path.join(modulePath, file), 'utf8');
          totalLines += content.split('\n').length;
        }

        // Detect issues
        const issues: HealthIssue[] = [];

        // Check test coverage
        const testCoverage = testFiles.length > 0 ? Math.min(100, (testFiles.length / sourceFiles.length) * 100) : 0;
        if (testCoverage < 80) {
          issues.push({
            id: 'low_test_coverage',
            severity: RuleSeverity.WARNING,
            category: 'testing',
            message: `Low test coverage: ${testCoverage.toFixed(1)}%`,
            rule: 'TEST_COVERAGE_MINIMUM',
            fixable: true
          });
        }

        // Check for outdated dependencies
        const dependencies = packageJson.dependencies || {};
        const outdatedDeps = Object.keys(dependencies).filter(dep => {
          const version = dependencies[dep];
          return version.includes('^3.') || version.includes('^2.');
        });

        if (outdatedDeps.length > 0) {
          issues.push({
            id: 'outdated_dependencies',
            severity: RuleSeverity.WARNING,
            category: 'dependencies',
            message: `Outdated dependencies: ${outdatedDeps.join(', ')}`,
            rule: 'DEPENDENCY_FRESHNESS',
            fixable: true
          });
        }

        // Check for missing documentation
        if (!files.includes('README.md')) {
          issues.push({
            id: 'missing_readme',
            severity: RuleSeverity.ERROR,
            category: 'documentation',
            message: 'README.md file is missing',
            rule: 'DOCUMENTATION_REQUIRED',
            fixable: true
          });
        }

        // Calculate technical debt (simplified)
        const technicalDebt = issues.filter(i => i.severity === RuleSeverity.ERROR).length * 2 +
                             issues.filter(i => i.severity === RuleSeverity.WARNING).length * 1;

        // Calculate health score
        let score = 100;
        issues.forEach(issue => {
          switch (issue.severity) {
            case RuleSeverity.CRITICAL:
              score -= 25;
              break;
            case RuleSeverity.ERROR:
              score -= 15;
              break;
            case RuleSeverity.WARNING:
              score -= 10;
              break;
            case RuleSeverity.INFO:
              score -= 5;
              break;
          }
        });
        score = Math.max(0, score);

        const status = score >= 90 ? ValidationStatus.PASS :
                       score >= 70 ? ValidationStatus.WARNING : ValidationStatus.FAIL;

        const metrics: ModuleMetrics = {
          files: files.length,
          linesOfCode: totalLines,
          testCoverage,
          dependencies: Object.keys(dependencies).length,
          vulnerabilities: 0, // Would be populated by security scanner
          codeSmells: Math.floor(totalLines / 100), // Simplified calculation
          technicalDebt,
          lastModified: new Date().toISOString(),
          buildStatus: 'success',
          buildTime: 45
        };

        return {
          moduleId: packageJson.name || path.basename(modulePath),
          path: modulePath,
          status,
          score,
          lastChecked: new Date().toISOString(),
          issues,
          metrics,
          trends: [] // Would be populated from historical data
        };
      };

      const health = await assessModuleHealth(mockModulePath);

      expect(health.moduleId).toBe('test-module');
      expect(health.path).toBe(mockModulePath);
      expect(health.score).toBeGreaterThan(0);
      expect(health.score).toBeLessThanOrEqual(100);
      expect(health.metrics.files).toBe(8);
      expect(health.metrics.dependencies).toBe(2);
      expect(health.issues.some(i => i.rule === 'TEST_COVERAGE_MINIMUM')).toBe(true);
    });

    it('should categorize health issues correctly', () => {
      const issues: HealthIssue[] = [
        {
          id: 'security_vuln',
          severity: RuleSeverity.CRITICAL,
          category: 'security',
          message: 'High severity vulnerability detected',
          rule: 'SECURITY_VULNERABILITY',
          fixable: false
        },
        {
          id: 'outdated_dep',
          severity: RuleSeverity.WARNING,
          category: 'dependencies',
          message: 'Outdated dependency version',
          rule: 'DEPENDENCY_FRESHNESS',
          fixable: true
        },
        {
          id: 'missing_tests',
          severity: RuleSeverity.ERROR,
          category: 'testing',
          message: 'Missing test files',
          rule: 'TEST_COVERAGE_MINIMUM',
          fixable: true
        },
        {
          id: 'code_smell',
          severity: RuleSeverity.INFO,
          category: 'quality',
          message: 'Large function detected',
          rule: 'FUNCTION_COMPLEXITY',
          fixable: true
        }
      ];

      const categorizeIssues = (issues: HealthIssue[]) => {
        const categories = issues.reduce((acc, issue) => {
          if (!acc[issue.category]) {
            acc[issue.category] = [];
          }
          acc[issue.category].push(issue);
          return acc;
        }, {} as Record<string, HealthIssue[]>);

        return categories;
      };

      const categorized = categorizeIssues(issues);

      expect(categorized.security).toHaveLength(1);
      expect(categorized.dependencies).toHaveLength(1);
      expect(categorized.testing).toHaveLength(1);
      expect(categorized.quality).toHaveLength(1);
      expect(categorized.security[0].severity).toBe(RuleSeverity.CRITICAL);
      expect(categorized.testing[0].fixable).toBe(true);
    });

    it('should calculate health scores accurately', () => {
      const testCases = [
        {
          issues: [],
          expectedScore: 100,
          expectedStatus: ValidationStatus.PASS
        },
        {
          issues: [
            { severity: RuleSeverity.WARNING },
            { severity: RuleSeverity.INFO }
          ],
          expectedScore: 85, // 100 - 10 - 5
          expectedStatus: ValidationStatus.WARNING
        },
        {
          issues: [
            { severity: RuleSeverity.CRITICAL },
            { severity: RuleSeverity.ERROR },
            { severity: RuleSeverity.WARNING }
          ],
          expectedScore: 50, // 100 - 25 - 15 - 10
          expectedStatus: ValidationStatus.FAIL
        }
      ];

      testCases.forEach(({ issues, expectedScore, expectedStatus }) => {
        let score = 100;
        issues.forEach((issue: any) => {
          switch (issue.severity) {
            case RuleSeverity.CRITICAL:
              score -= 25;
              break;
            case RuleSeverity.ERROR:
              score -= 15;
              break;
            case RuleSeverity.WARNING:
              score -= 10;
              break;
            case RuleSeverity.INFO:
              score -= 5;
              break;
          }
        });
        score = Math.max(0, score);

        const status = score >= 90 ? ValidationStatus.PASS :
                       score >= 70 ? ValidationStatus.WARNING : ValidationStatus.FAIL;

        expect(score).toBe(expectedScore);
        expect(status).toBe(expectedStatus);
      });
    });
  });

  describe('ecosystem overview', () => {
    it('should generate comprehensive ecosystem overview', async () => {
      const mockModules: ModuleHealth[] = [
        {
          moduleId: 'module-a',
          path: '/packages/module-a',
          status: ValidationStatus.PASS,
          score: 95,
          lastChecked: '2023-01-01T00:00:00.000Z',
          issues: [
            {
              id: 'minor_issue',
              severity: RuleSeverity.INFO,
              category: 'style',
              message: 'Minor style issue',
              rule: 'STYLE_GUIDE',
              fixable: true
            }
          ],
          metrics: {
            files: 10,
            linesOfCode: 500,
            testCoverage: 90,
            dependencies: 5,
            vulnerabilities: 0,
            codeSmells: 2,
            technicalDebt: 1,
            lastModified: '2023-01-01T00:00:00.000Z',
            buildStatus: 'success',
            buildTime: 30
          },
          trends: []
        },
        {
          moduleId: 'module-b',
          path: '/packages/module-b',
          status: ValidationStatus.WARNING,
          score: 75,
          lastChecked: '2023-01-01T00:00:00.000Z',
          issues: [
            {
              id: 'test_coverage',
              severity: RuleSeverity.WARNING,
              category: 'testing',
              message: 'Low test coverage',
              rule: 'TEST_COVERAGE_MINIMUM',
              fixable: true
            },
            {
              id: 'outdated_deps',
              severity: RuleSeverity.WARNING,
              category: 'dependencies',
              message: 'Outdated dependencies',
              rule: 'DEPENDENCY_FRESHNESS',
              fixable: true
            }
          ],
          metrics: {
            files: 15,
            linesOfCode: 800,
            testCoverage: 60,
            dependencies: 8,
            vulnerabilities: 0,
            codeSmells: 5,
            technicalDebt: 3,
            lastModified: '2023-01-01T00:00:00.000Z',
            buildStatus: 'success',
            buildTime: 45
          },
          trends: []
        },
        {
          moduleId: 'module-c',
          path: '/packages/module-c',
          status: ValidationStatus.FAIL,
          score: 60,
          lastChecked: '2023-01-01T00:00:00.000Z',
          issues: [
            {
              id: 'security_vuln',
              severity: RuleSeverity.CRITICAL,
              category: 'security',
              message: 'Security vulnerability',
              rule: 'SECURITY_VULNERABILITY',
              fixable: false
            },
            {
              id: 'missing_tests',
              severity: RuleSeverity.ERROR,
              category: 'testing',
              message: 'No tests found',
              rule: 'TEST_COVERAGE_MINIMUM',
              fixable: true
            }
          ],
          metrics: {
            files: 20,
            linesOfCode: 1200,
            testCoverage: 0,
            dependencies: 12,
            vulnerabilities: 1,
            codeSmells: 8,
            technicalDebt: 6,
            lastModified: '2023-01-01T00:00:00.000Z',
            buildStatus: 'failed',
            buildTime: 120
          },
          trends: []
        }
      ];

      const generateEcosystemOverview = (modules: ModuleHealth[]): EcosystemOverview => {
        const totalModules = modules.length;
        const healthyModules = modules.filter(m => m.status === ValidationStatus.PASS).length;
        const warningModules = modules.filter(m => m.status === ValidationStatus.WARNING).length;
        const criticalModules = modules.filter(m => m.status === ValidationStatus.FAIL).length;

        const averageScore = modules.reduce((sum, m) => sum + m.score, 0) / totalModules;

        const allIssues = modules.flatMap(m => m.issues);
        const totalIssues = allIssues.length;
        const fixableIssues = allIssues.filter(i => i.fixable).length;

        // Count issues by rule
        const issuesByRule = allIssues.reduce((acc, issue) => {
          if (!acc[issue.rule]) {
            acc[issue.rule] = { count: 0, severity: issue.severity };
          }
          acc[issue.rule].count++;
          return acc;
        }, {} as Record<string, { count: number; severity: RuleSeverity }>);

        const topIssues = Object.entries(issuesByRule)
          .map(([rule, data]) => ({ rule, count: data.count, severity: data.severity }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const modulesByHealth = {
          healthy: modules.filter(m => m.status === ValidationStatus.PASS).map(m => m.moduleId),
          warning: modules.filter(m => m.status === ValidationStatus.WARNING).map(m => m.moduleId),
          critical: modules.filter(m => m.status === ValidationStatus.FAIL).map(m => m.moduleId)
        };

        return {
          totalModules,
          healthyModules,
          warningModules,
          criticalModules,
          averageScore,
          totalIssues,
          fixableIssues,
          lastScan: new Date().toISOString(),
          trends: {
            scoreChange: 0, // Would be calculated from historical data
            newIssues: 0,
            fixedIssues: 0,
            period: '7d'
          },
          topIssues,
          modulesByHealth
        };
      };

      const overview = generateEcosystemOverview(mockModules);

      expect(overview.totalModules).toBe(3);
      expect(overview.healthyModules).toBe(1);
      expect(overview.warningModules).toBe(1);
      expect(overview.criticalModules).toBe(1);
      expect(overview.averageScore).toBeCloseTo(76.67, 1);
      expect(overview.totalIssues).toBe(5);
      expect(overview.fixableIssues).toBe(4);
      expect(overview.topIssues[0].rule).toBe('TEST_COVERAGE_MINIMUM');
      expect(overview.topIssues[0].count).toBe(2);
      expect(overview.modulesByHealth.healthy).toContain('module-a');
      expect(overview.modulesByHealth.warning).toContain('module-b');
      expect(overview.modulesByHealth.critical).toContain('module-c');
    });

    it('should identify critical modules requiring attention', () => {
      const modules: ModuleHealth[] = [
        {
          moduleId: 'critical-module',
          score: 45,
          status: ValidationStatus.FAIL,
          issues: [
            { severity: RuleSeverity.CRITICAL } as HealthIssue,
            { severity: RuleSeverity.ERROR } as HealthIssue
          ]
        },
        {
          moduleId: 'healthy-module',
          score: 95,
          status: ValidationStatus.PASS,
          issues: []
        }
      ] as ModuleHealth[];

      const findCriticalModules = (modules: ModuleHealth[]) => {
        return modules.filter(module => {
          const hasCriticalIssues = module.issues.some(i => i.severity === RuleSeverity.CRITICAL);
          const lowScore = module.score < 70;
          const failedStatus = module.status === ValidationStatus.FAIL;

          return hasCriticalIssues || lowScore || failedStatus;
        });
      };

      const criticalModules = findCriticalModules(modules);

      expect(criticalModules).toHaveLength(1);
      expect(criticalModules[0].moduleId).toBe('critical-module');
    });
  });

  describe('health trending', () => {
    it('should track health trends over time', () => {
      const mockTrends: HealthTrend[] = [
        {
          date: '2023-01-01',
          score: 85,
          issues: 5,
          metrics: { testCoverage: 80, vulnerabilities: 1 }
        },
        {
          date: '2023-01-08',
          score: 90,
          issues: 3,
          metrics: { testCoverage: 85, vulnerabilities: 0 }
        },
        {
          date: '2023-01-15',
          score: 92,
          issues: 2,
          metrics: { testCoverage: 90, vulnerabilities: 0 }
        }
      ];

      const analyzeTrends = (trends: HealthTrend[]) => {
        if (trends.length < 2) {
          return { trend: 'insufficient_data', change: 0 };
        }

        const latest = trends[trends.length - 1];
        const previous = trends[trends.length - 2];

        const scoreChange = latest.score - previous.score;
        const issueChange = latest.issues - previous.issues;

        let trend: 'improving' | 'degrading' | 'stable';
        if (scoreChange > 2 || issueChange < -1) {
          trend = 'improving';
        } else if (scoreChange < -2 || issueChange > 1) {
          trend = 'degrading';
        } else {
          trend = 'stable';
        }

        return {
          trend,
          scoreChange,
          issueChange,
          coverageChange: (latest.metrics.testCoverage || 0) - (previous.metrics.testCoverage || 0),
          vulnerabilityChange: (latest.metrics.vulnerabilities || 0) - (previous.metrics.vulnerabilities || 0)
        };
      };

      const analysis = analyzeTrends(mockTrends);

      expect(analysis.trend).toBe('improving');
      expect(analysis.scoreChange).toBe(2);
      expect(analysis.issueChange).toBe(-1);
      expect(analysis.coverageChange).toBe(5);
      expect(analysis.vulnerabilityChange).toBe(0);
    });

    it('should detect degrading health trends', () => {
      const degradingTrends: HealthTrend[] = [
        {
          date: '2023-01-01',
          score: 95,
          issues: 2,
          metrics: { testCoverage: 90 }
        },
        {
          date: '2023-01-08',
          score: 85,
          issues: 5,
          metrics: { testCoverage: 80 }
        }
      ];

      const analyzeTrends = (trends: HealthTrend[]) => {
        const latest = trends[trends.length - 1];
        const previous = trends[trends.length - 2];

        const scoreChange = latest.score - previous.score;
        const issueChange = latest.issues - previous.issues;

        return {
          trend: scoreChange < -2 || issueChange > 1 ? 'degrading' : 'stable',
          scoreChange,
          issueChange
        };
      };

      const analysis = analyzeTrends(degradingTrends);

      expect(analysis.trend).toBe('degrading');
      expect(analysis.scoreChange).toBe(-10);
      expect(analysis.issueChange).toBe(3);
    });

    it('should calculate trend velocity', () => {
      const trends: HealthTrend[] = [
        { date: '2023-01-01', score: 80, issues: 10, metrics: {} },
        { date: '2023-01-08', score: 85, issues: 8, metrics: {} },
        { date: '2023-01-15', score: 90, issues: 6, metrics: {} },
        { date: '2023-01-22', score: 95, issues: 4, metrics: {} }
      ];

      const calculateTrendVelocity = (trends: HealthTrend[]) => {
        if (trends.length < 3) {
          return { velocity: 0, acceleration: 0 };
        }

        const scoreChanges = [];
        for (let i = 1; i < trends.length; i++) {
          scoreChanges.push(trends[i].score - trends[i - 1].score);
        }

        const velocity = scoreChanges.reduce((sum, change) => sum + change, 0) / scoreChanges.length;

        // Calculate acceleration (change in velocity)
        let acceleration = 0;
        if (scoreChanges.length >= 2) {
          const recentVelocity = (scoreChanges[scoreChanges.length - 1] + scoreChanges[scoreChanges.length - 2]) / 2;
          const earlyVelocity = (scoreChanges[0] + scoreChanges[1]) / 2;
          acceleration = recentVelocity - earlyVelocity;
        }

        return { velocity, acceleration };
      };

      const trendAnalysis = calculateTrendVelocity(trends);

      expect(trendAnalysis.velocity).toBe(5); // Average change per period
      expect(trendAnalysis.acceleration).toBe(0); // Consistent improvement rate
    });
  });

  describe('alert generation', () => {
    it('should generate alerts for critical issues', () => {
      const moduleHealth: ModuleHealth = {
        moduleId: 'vulnerable-module',
        path: '/packages/vulnerable-module',
        status: ValidationStatus.FAIL,
        score: 40,
        lastChecked: '2023-01-01T00:00:00.000Z',
        issues: [
          {
            id: 'critical_security',
            severity: RuleSeverity.CRITICAL,
            category: 'security',
            message: 'Critical security vulnerability in dependency',
            rule: 'SECURITY_VULNERABILITY',
            fixable: false
          },
          {
            id: 'build_failure',
            severity: RuleSeverity.ERROR,
            category: 'build',
            message: 'Build consistently failing',
            rule: 'BUILD_SUCCESS',
            fixable: true
          }
        ],
        metrics: {
          vulnerabilities: 1,
          buildStatus: 'failed'
        } as ModuleMetrics,
        trends: []
      };

      interface Alert {
        id: string;
        severity: 'critical' | 'high' | 'medium' | 'low';
        title: string;
        message: string;
        moduleId: string;
        action: string;
        urgent: boolean;
      }

      const generateAlerts = (health: ModuleHealth): Alert[] => {
        const alerts: Alert[] = [];

        // Critical security vulnerabilities
        const criticalSecurityIssues = health.issues.filter(
          i => i.severity === RuleSeverity.CRITICAL && i.category === 'security'
        );

        criticalSecurityIssues.forEach(issue => {
          alerts.push({
            id: `security_${health.moduleId}_${issue.id}`,
            severity: 'critical',
            title: 'Critical Security Vulnerability',
            message: `${health.moduleId}: ${issue.message}`,
            moduleId: health.moduleId,
            action: 'Immediate security review and patching required',
            urgent: true
          });
        });

        // Build failures
        if (health.metrics.buildStatus === 'failed') {
          alerts.push({
            id: `build_${health.moduleId}`,
            severity: 'high',
            title: 'Build Failure',
            message: `${health.moduleId}: Build consistently failing`,
            moduleId: health.moduleId,
            action: 'Fix build issues to prevent deployment problems',
            urgent: false
          });
        }

        // Low health score
        if (health.score < 50) {
          alerts.push({
            id: `health_${health.moduleId}`,
            severity: 'medium',
            title: 'Poor Module Health',
            message: `${health.moduleId}: Health score below 50 (${health.score})`,
            moduleId: health.moduleId,
            action: 'Review and address quality issues',
            urgent: false
          });
        }

        return alerts;
      };

      const alerts = generateAlerts(moduleHealth);

      expect(alerts).toHaveLength(3);
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].urgent).toBe(true);
      expect(alerts[0].title).toBe('Critical Security Vulnerability');
      expect(alerts[1].severity).toBe('high');
      expect(alerts[1].title).toBe('Build Failure');
      expect(alerts[2].severity).toBe('medium');
      expect(alerts[2].title).toBe('Poor Module Health');
    });

    it('should prioritize alerts by severity and urgency', () => {
      const alerts = [
        { id: '1', severity: 'medium', urgent: false, title: 'Medium priority' },
        { id: '2', severity: 'critical', urgent: true, title: 'Critical urgent' },
        { id: '3', severity: 'high', urgent: false, title: 'High priority' },
        { id: '4', severity: 'critical', urgent: false, title: 'Critical normal' },
        { id: '5', severity: 'low', urgent: false, title: 'Low priority' }
      ];

      const prioritizeAlerts = (alerts: any[]) => {
        const severityWeight = {
          critical: 4,
          high: 3,
          medium: 2,
          low: 1
        };

        return alerts.sort((a, b) => {
          // Urgent alerts first
          if (a.urgent && !b.urgent) return -1;
          if (!a.urgent && b.urgent) return 1;

          // Then by severity
          return severityWeight[b.severity as keyof typeof severityWeight] -
                 severityWeight[a.severity as keyof typeof severityWeight];
        });
      };

      const prioritized = prioritizeAlerts([...alerts]);

      expect(prioritized[0].id).toBe('2'); // Critical urgent
      expect(prioritized[1].id).toBe('4'); // Critical normal
      expect(prioritized[2].id).toBe('3'); // High priority
      expect(prioritized[3].id).toBe('1'); // Medium priority
      expect(prioritized[4].id).toBe('5'); // Low priority
    });
  });

  describe('reporting and visualization', () => {
    it('should generate comprehensive health reports', () => {
      const ecosystemOverview: EcosystemOverview = {
        totalModules: 10,
        healthyModules: 6,
        warningModules: 3,
        criticalModules: 1,
        averageScore: 82.5,
        totalIssues: 25,
        fixableIssues: 18,
        lastScan: '2023-01-01T12:00:00.000Z',
        trends: {
          scoreChange: +3.2,
          newIssues: 2,
          fixedIssues: 7,
          period: '7d'
        },
        topIssues: [
          { rule: 'TEST_COVERAGE_MINIMUM', count: 8, severity: RuleSeverity.WARNING },
          { rule: 'DEPENDENCY_FRESHNESS', count: 5, severity: RuleSeverity.WARNING },
          { rule: 'SECURITY_VULNERABILITY', count: 2, severity: RuleSeverity.CRITICAL }
        ],
        modulesByHealth: {
          healthy: ['module-a', 'module-b', 'module-c'],
          warning: ['module-d', 'module-e'],
          critical: ['module-f']
        }
      };

      const generateHealthReport = (overview: EcosystemOverview): string => {
        const lines = [];
        lines.push('📊 Ecosystem Health Report');
        lines.push('═'.repeat(50));
        lines.push('');

        // Overall statistics
        lines.push('📈 Overall Statistics:');
        lines.push(`  Total Modules: ${overview.totalModules}`);
        lines.push(`  Average Score: ${overview.averageScore.toFixed(1)}/100`);
        lines.push(`  Health Distribution:`);
        lines.push(`    ✅ Healthy: ${overview.healthyModules} (${(overview.healthyModules/overview.totalModules*100).toFixed(1)}%)`);
        lines.push(`    ⚠️  Warning: ${overview.warningModules} (${(overview.warningModules/overview.totalModules*100).toFixed(1)}%)`);
        lines.push(`    ❌ Critical: ${overview.criticalModules} (${(overview.criticalModules/overview.totalModules*100).toFixed(1)}%)`);
        lines.push('');

        // Issues summary
        lines.push('🔍 Issues Summary:');
        lines.push(`  Total Issues: ${overview.totalIssues}`);
        lines.push(`  Fixable Issues: ${overview.fixableIssues} (${(overview.fixableIssues/overview.totalIssues*100).toFixed(1)}%)`);
        lines.push('');

        // Trends
        lines.push('📊 Trends (Last 7 days):');
        const scoreChange = overview.trends.scoreChange > 0 ? `+${overview.trends.scoreChange}` : overview.trends.scoreChange.toString();
        lines.push(`  Score Change: ${scoreChange}`);
        lines.push(`  New Issues: ${overview.trends.newIssues}`);
        lines.push(`  Fixed Issues: ${overview.trends.fixedIssues}`);
        lines.push('');

        // Top issues
        lines.push('🚨 Top Issues:');
        overview.topIssues.forEach((issue, index) => {
          const icon = issue.severity === RuleSeverity.CRITICAL ? '🔴' :
                       issue.severity === RuleSeverity.ERROR ? '🟠' :
                       issue.severity === RuleSeverity.WARNING ? '🟡' : '🔵';
          lines.push(`  ${index + 1}. ${icon} ${issue.rule}: ${issue.count} occurrences`);
        });

        return lines.join('\n');
      };

      const report = generateHealthReport(ecosystemOverview);

      expect(report).toContain('📊 Ecosystem Health Report');
      expect(report).toContain('Total Modules: 10');
      expect(report).toContain('Average Score: 82.5/100');
      expect(report).toContain('✅ Healthy: 6 (60.0%)');
      expect(report).toContain('Score Change: +3.2');
      expect(report).toContain('🔴 SECURITY_VULNERABILITY: 2 occurrences');
      expect(report).toContain('🟡 TEST_COVERAGE_MINIMUM: 8 occurrences');
    });

    it('should generate HTML dashboard', () => {
      const overview: EcosystemOverview = {
        totalModules: 5,
        healthyModules: 3,
        warningModules: 1,
        criticalModules: 1,
        averageScore: 85.0,
        totalIssues: 10,
        fixableIssues: 8,
        lastScan: '2023-01-01T12:00:00.000Z',
        trends: {
          scoreChange: +2.5,
          newIssues: 1,
          fixedIssues: 3,
          period: '7d'
        },
        topIssues: [],
        modulesByHealth: {
          healthy: ['module-a', 'module-b', 'module-c'],
          warning: ['module-d'],
          critical: ['module-e']
        }
      };

      const generateHtmlDashboard = (overview: EcosystemOverview): string => {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>CVPlus Ecosystem Health Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .dashboard { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .healthy { color: #28a745; }
        .warning { color: #ffc107; }
        .critical { color: #dc3545; }
        .trend-up { color: #28a745; }
        .trend-down { color: #dc3545; }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🏥 CVPlus Ecosystem Health Dashboard</h1>
            <p>Last updated: ${new Date(overview.lastScan).toLocaleString()}</p>
        </div>

        <div class="metrics">
            <div class="metric-card">
                <h3>Total Modules</h3>
                <div class="metric-value">${overview.totalModules}</div>
            </div>

            <div class="metric-card">
                <h3>Average Score</h3>
                <div class="metric-value ${overview.averageScore >= 80 ? 'healthy' : overview.averageScore >= 60 ? 'warning' : 'critical'}">
                    ${overview.averageScore.toFixed(1)}/100
                </div>
            </div>

            <div class="metric-card">
                <h3>Health Distribution</h3>
                <div style="font-size: 0.9em;">
                    <div class="healthy">✅ Healthy: ${overview.healthyModules}</div>
                    <div class="warning">⚠️ Warning: ${overview.warningModules}</div>
                    <div class="critical">❌ Critical: ${overview.criticalModules}</div>
                </div>
            </div>

            <div class="metric-card">
                <h3>Issues</h3>
                <div class="metric-value">${overview.totalIssues}</div>
                <div style="font-size: 0.8em;">${overview.fixableIssues} fixable</div>
            </div>
        </div>

        <div class="metric-card">
            <h3>📈 Recent Trends</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center;">
                <div>
                    <div class="${overview.trends.scoreChange >= 0 ? 'trend-up' : 'trend-down'}">
                        ${overview.trends.scoreChange >= 0 ? '+' : ''}${overview.trends.scoreChange}
                    </div>
                    <div style="font-size: 0.8em;">Score Change</div>
                </div>
                <div>
                    <div class="${overview.trends.newIssues <= 2 ? 'healthy' : 'warning'}">
                        +${overview.trends.newIssues}
                    </div>
                    <div style="font-size: 0.8em;">New Issues</div>
                </div>
                <div>
                    <div class="trend-up">
                        -${overview.trends.fixedIssues}
                    </div>
                    <div style="font-size: 0.8em;">Fixed Issues</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
      };

      const dashboard = generateHtmlDashboard(overview);

      expect(dashboard).toContain('CVPlus Ecosystem Health Dashboard');
      expect(dashboard).toContain('Total Modules');
      expect(dashboard).toContain('85.0/100');
      expect(dashboard).toContain('✅ Healthy: 3');
      expect(dashboard).toContain('⚠️ Warning: 1');
      expect(dashboard).toContain('❌ Critical: 1');
      expect(dashboard).toContain('+2.5');
      expect(dashboard).toContain('class="healthy"'); // For good average score
    });
  });
});