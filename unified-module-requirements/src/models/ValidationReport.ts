/**
 * ValidationReport - Core data model for CVPlus module validation results
 *
 * This model defines the structure for validation reports that aggregate
 * compliance results, track violations, provide recommendations,
 * and support historical analysis and trend monitoring.
 */

import { RuleSeverity } from './ComplianceRule';

export type ValidationStatus = 'PASS' | 'FAIL' | 'WARNING' | 'PARTIAL' | 'ERROR';

export interface ValidationResult {
  /** Unique identifier for this validation result */
  resultId: string;

  /** Rule that was validated */
  ruleId: string;

  /** Rule name for display */
  ruleName: string;

  /** Validation status */
  status: ValidationStatus;

  /** Rule severity level */
  severity: RuleSeverity;

  /** Human-readable message */
  message: string;

  /** File path if rule applies to specific file */
  filePath?: string;

  /** Line number if applicable */
  lineNumber?: number;

  /** Expected value */
  expected?: string;

  /** Actual value found */
  actual?: string;

  /** Detailed remediation instructions */
  remediation: string;

  /** Whether this violation can be auto-fixed */
  canAutoFix: boolean;

  /** Time taken to validate this rule (ms) */
  executionTime: number;

  /** Additional context or metadata */
  context?: Record<string, any>;
}

export interface RecommendationItem {
  /** Recommendation priority */
  priority: 'HIGH' | 'MEDIUM' | 'LOW';

  /** Category of recommendation */
  category: string;

  /** Recommendation title */
  title: string;

  /** Detailed recommendation description */
  description: string;

  /** Estimated effort to implement */
  effort: 'LOW' | 'MEDIUM' | 'HIGH';

  /** Expected impact/benefit */
  impact: 'LOW' | 'MEDIUM' | 'HIGH';

  /** Steps to implement the recommendation */
  steps?: string[];

  /** Related rules or documentation */
  relatedRules?: string[];
}

export interface ComplianceMetrics {
  /** Total number of rules evaluated */
  totalRules: number;

  /** Number of rules that passed */
  passedRules: number;

  /** Number of rules that failed */
  failedRules: number;

  /** Number of rules with warnings */
  warningRules: number;

  /** Number of rules with errors */
  errorRules: number;

  /** Breakdown by severity */
  severityBreakdown: {
    critical: { passed: number; failed: number };
    error: { passed: number; failed: number };
    warning: { passed: number; failed: number };
    info: { passed: number; failed: number };
  };

  /** Breakdown by category */
  categoryBreakdown: Record<string, { passed: number; failed: number; total: number }>;

  /** Auto-fixable violations count */
  autoFixableViolations: number;
}

export interface ValidationReport {
  /** Unique report identifier */
  reportId: string;

  /** Module being validated */
  moduleId: string;

  /** Module name for display */
  moduleName: string;

  /** Module path */
  modulePath: string;

  /** Module type */
  moduleType: string;

  /** When validation was performed */
  timestamp: Date;

  /** Overall compliance score (0-100) */
  overallScore: number;

  /** Overall validation status */
  status: ValidationStatus;

  /** Individual validation results */
  results: ValidationResult[];

  /** Compliance metrics summary */
  metrics: ComplianceMetrics;

  /** Recommendations for improvement */
  recommendations: RecommendationItem[];

  /** Validation configuration used */
  validationConfig: {
    /** Rules that were included */
    includedRules: string[];
    /** Rules that were excluded */
    excludedRules: string[];
    /** Custom rule configurations */
    customRules?: Record<string, any>;
  };

  /** Performance metrics */
  performance: {
    /** Total validation time (ms) */
    totalTime: number;
    /** Rules per second */
    rulesPerSecond: number;
    /** Files scanned */
    filesScanned: number;
    /** Memory usage (MB) */
    memoryUsage?: number;
  };

  /** Previous report ID for comparison */
  previousReportId?: string;

  /** Changes since previous report */
  changesSincePrevious?: {
    /** Score change */
    scoreChange: number;
    /** New violations */
    newViolations: number;
    /** Fixed violations */
    fixedViolations: number;
    /** Regression violations */
    regressions: number;
  };

  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * Utility functions for working with ValidationReport
 */
export class ValidationReportUtils {
  /**
   * Create a new ValidationReport
   */
  static create(moduleId: string, moduleName: string, modulePath: string, moduleType: string): ValidationReport {
    const reportId = `${moduleId}_${Date.now()}`;

    return {
      reportId,
      moduleId,
      moduleName,
      modulePath,
      moduleType,
      timestamp: new Date(),
      overallScore: 0,
      status: 'PARTIAL',
      results: [],
      metrics: this.createEmptyMetrics(),
      recommendations: [],
      validationConfig: {
        includedRules: [],
        excludedRules: []
      },
      performance: {
        totalTime: 0,
        rulesPerSecond: 0,
        filesScanned: 0
      },
      metadata: {}
    };
  }

  /**
   * Calculate overall score from results
   */
  static calculateScore(results: ValidationResult[]): number {
    if (results.length === 0) return 0;

    const weights = {
      'CRITICAL': 20,
      'ERROR': 15,
      'WARNING': 10,
      'INFO': 5
    };

    let totalWeight = 0;
    let earnedWeight = 0;

    for (const result of results) {
      const weight = weights[result.severity] || 5;
      totalWeight += weight;

      if (result.status === 'PASS') {
        earnedWeight += weight;
      } else if (result.status === 'WARNING') {
        earnedWeight += weight * 0.7; // Partial credit for warnings
      }
    }

    return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  }

  /**
   * Determine overall status from results
   */
  static calculateOverallStatus(results: ValidationResult[]): ValidationStatus {
    if (results.length === 0) return 'ERROR';

    const hasCriticalFailure = results.some(r => r.severity === 'CRITICAL' && r.status === 'FAIL');
    if (hasCriticalFailure) return 'FAIL';

    const hasErrorFailure = results.some(r => r.severity === 'ERROR' && r.status === 'FAIL');
    if (hasErrorFailure) return 'FAIL';

    const hasWarning = results.some(r => r.status === 'WARNING');
    const hasFailure = results.some(r => r.status === 'FAIL');

    if (hasFailure) return 'FAIL';
    if (hasWarning) return 'WARNING';

    const allPassed = results.every(r => r.status === 'PASS');
    return allPassed ? 'PASS' : 'PARTIAL';
  }

  /**
   * Calculate compliance metrics from results
   */
  static calculateMetrics(results: ValidationResult[]): ComplianceMetrics {
    const metrics = this.createEmptyMetrics();
    metrics.totalRules = results.length;

    for (const result of results) {
      // Overall counts
      switch (result.status) {
        case 'PASS':
          metrics.passedRules++;
          break;
        case 'FAIL':
          metrics.failedRules++;
          break;
        case 'WARNING':
          metrics.warningRules++;
          break;
        case 'ERROR':
          metrics.errorRules++;
          break;
      }

      // Severity breakdown
      const severityKey = result.severity.toLowerCase() as keyof typeof metrics.severityBreakdown;
      if (metrics.severityBreakdown[severityKey]) {
        if (result.status === 'PASS') {
          metrics.severityBreakdown[severityKey].passed++;
        } else {
          metrics.severityBreakdown[severityKey].failed++;
        }
      }

      // Auto-fixable count
      if (result.canAutoFix && result.status !== 'PASS') {
        metrics.autoFixableViolations++;
      }
    }

    return metrics;
  }

  /**
   * Generate recommendations based on validation results
   */
  static generateRecommendations(results: ValidationResult[]): RecommendationItem[] {
    const recommendations: RecommendationItem[] = [];

    // Group failures by severity
    const criticalFailures = results.filter(r => r.severity === 'CRITICAL' && r.status === 'FAIL');
    const errorFailures = results.filter(r => r.severity === 'ERROR' && r.status === 'FAIL');
    const warningFailures = results.filter(r => r.severity === 'WARNING' && r.status === 'FAIL');

    // Critical issues first
    if (criticalFailures.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'CRITICAL_FIXES',
        title: 'Fix Critical Issues',
        description: `${criticalFailures.length} critical issues must be resolved immediately`,
        effort: 'HIGH',
        impact: 'HIGH',
        steps: criticalFailures.map(r => r.remediation),
        relatedRules: criticalFailures.map(r => r.ruleId)
      });
    }

    // Auto-fixable items
    const autoFixable = results.filter(r => r.canAutoFix && r.status !== 'PASS');
    if (autoFixable.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'AUTO_FIX',
        title: 'Auto-Fix Available Violations',
        description: `${autoFixable.length} violations can be automatically fixed`,
        effort: 'LOW',
        impact: 'MEDIUM',
        steps: ['Run auto-fix command to resolve these violations automatically'],
        relatedRules: autoFixable.map(r => r.ruleId)
      });
    }

    // Error fixes
    if (errorFailures.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'ERROR_FIXES',
        title: 'Resolve Error-Level Issues',
        description: `${errorFailures.length} error-level issues should be fixed`,
        effort: 'MEDIUM',
        impact: 'MEDIUM',
        relatedRules: errorFailures.map(r => r.ruleId)
      });
    }

    // Warning improvements
    if (warningFailures.length > 0) {
      recommendations.push({
        priority: 'LOW',
        category: 'IMPROVEMENTS',
        title: 'Address Warnings for Better Compliance',
        description: `${warningFailures.length} warnings could be improved`,
        effort: 'LOW',
        impact: 'LOW',
        relatedRules: warningFailures.map(r => r.ruleId)
      });
    }

    return recommendations;
  }

  /**
   * Compare two validation reports
   */
  static compareReports(current: ValidationReport, previous: ValidationReport): ValidationReport['changesSincePrevious'] {
    const scoreChange = current.overallScore - previous.overallScore;

    // Find new violations (rules that failed in current but passed in previous)
    const previousPassed = new Set(
      previous.results.filter(r => r.status === 'PASS').map(r => r.ruleId)
    );
    const currentFailed = current.results.filter(r => r.status === 'FAIL').map(r => r.ruleId);
    const newViolations = currentFailed.filter(ruleId => previousPassed.has(ruleId)).length;

    // Find fixed violations (rules that failed in previous but passed in current)
    const previousFailed = new Set(
      previous.results.filter(r => r.status === 'FAIL').map(r => r.ruleId)
    );
    const currentPassed = current.results.filter(r => r.status === 'PASS').map(r => r.ruleId);
    const fixedViolations = currentPassed.filter(ruleId => previousFailed.has(ruleId)).length;

    return {
      scoreChange,
      newViolations,
      fixedViolations,
      regressions: newViolations // New violations are essentially regressions
    };
  }

  /**
   * Filter results by status
   */
  static filterByStatus(results: ValidationResult[], status: ValidationStatus): ValidationResult[] {
    return results.filter(r => r.status === status);
  }

  /**
   * Filter results by severity
   */
  static filterBySeverity(results: ValidationResult[], severity: RuleSeverity): ValidationResult[] {
    return results.filter(r => r.severity === severity);
  }

  /**
   * Get auto-fixable results
   */
  static getAutoFixableResults(results: ValidationResult[]): ValidationResult[] {
    return results.filter(r => r.canAutoFix && r.status !== 'PASS');
  }

  /**
   * Group results by category
   */
  static groupByCategory(results: ValidationResult[]): Record<string, ValidationResult[]> {
    const groups: Record<string, ValidationResult[]> = {};

    for (const result of results) {
      // Extract category from rule ID (assuming format like CATEGORY_RULE_NAME)
      const category = result.ruleId.split('_')[0] || 'OTHER';

      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(result);
    }

    return groups;
  }

  /**
   * Create empty metrics structure
   */
  private static createEmptyMetrics(): ComplianceMetrics {
    return {
      totalRules: 0,
      passedRules: 0,
      failedRules: 0,
      warningRules: 0,
      errorRules: 0,
      severityBreakdown: {
        critical: { passed: 0, failed: 0 },
        error: { passed: 0, failed: 0 },
        warning: { passed: 0, failed: 0 },
        info: { passed: 0, failed: 0 }
      },
      categoryBreakdown: {},
      autoFixableViolations: 0
    };
  }
}

/**
 * Report aggregation for batch processing and trend analysis
 */
export class ReportAggregator {
  /**
   * Aggregate multiple module reports into ecosystem summary
   */
  static aggregateEcosystemReports(reports: ValidationReport[]): EcosystemSummary {
    const summary: EcosystemSummary = {
      totalModules: reports.length,
      timestamp: new Date(),
      averageScore: 0,
      scoreDistribution: {
        excellent: 0, // 90+
        good: 0,      // 80-89
        fair: 0,      // 70-79
        poor: 0       // <70
      },
      statusBreakdown: {
        pass: 0,
        warning: 0,
        fail: 0,
        error: 0
      },
      topViolations: [],
      moduleScores: reports.map(r => ({
        moduleId: r.moduleId,
        score: r.overallScore,
        status: r.status
      }))
    };

    if (reports.length === 0) return summary;

    // Calculate averages and distributions
    const scores = reports.map(r => r.overallScore);
    summary.averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // Score distribution
    for (const score of scores) {
      if (score >= 90) summary.scoreDistribution.excellent++;
      else if (score >= 80) summary.scoreDistribution.good++;
      else if (score >= 70) summary.scoreDistribution.fair++;
      else summary.scoreDistribution.poor++;
    }

    // Status breakdown
    for (const report of reports) {
      switch (report.status) {
        case 'PASS':
          summary.statusBreakdown.pass++;
          break;
        case 'WARNING':
          summary.statusBreakdown.warning++;
          break;
        case 'FAIL':
          summary.statusBreakdown.fail++;
          break;
        case 'ERROR':
          summary.statusBreakdown.error++;
          break;
      }
    }

    // Aggregate top violations
    const violationCounts: Record<string, number> = {};
    for (const report of reports) {
      for (const result of report.results) {
        if (result.status === 'FAIL') {
          violationCounts[result.ruleId] = (violationCounts[result.ruleId] || 0) + 1;
        }
      }
    }

    summary.topViolations = Object.entries(violationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ruleId, count]) => ({ ruleId, count }));

    return summary;
  }
}

export interface EcosystemSummary {
  totalModules: number;
  timestamp: Date;
  averageScore: number;
  scoreDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  statusBreakdown: {
    pass: number;
    warning: number;
    fail: number;
    error: number;
  };
  topViolations: Array<{ ruleId: string; count: number }>;
  moduleScores: Array<{ moduleId: string; score: number; status: ValidationStatus }>;
}