/**
 * Reporting Service for CVPlus Module Requirements System
 *
 * This service handles the persistent storage, retrieval, and management of validation reports.
 * It provides functionality for storing historical validation data, generating trend analysis,
 * and creating ecosystem-wide summaries for the CVPlus module system.
 *
 * Key Features:
 * - Persistent report storage with configurable retention policies
 * - Historical trend analysis and comparison
 * - Ecosystem-wide validation summaries
 * - Report search and filtering capabilities
 * - Export functionality for various formats
 * - Performance metrics tracking
 * - Report aggregation and statistics
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ValidationReport, EcosystemSummary } from '../models/ValidationReport.js';
import { PerformanceMetrics } from '../models/types.js';

export interface ReportStorage {
  /** Unique report storage ID */
  storageId: string;
  /** Report data */
  report: ValidationReport;
  /** Storage timestamp */
  storedAt: Date;
  /** Storage location metadata */
  location: {
    /** File path */
    filePath: string;
    /** Directory */
    directory: string;
    /** File size in bytes */
    fileSize: number;
  };
  /** Report tags for categorization */
  tags: string[];
  /** Retention policy */
  retentionPolicy?: {
    /** Retention period in days */
    retentionDays: number;
    /** Auto-delete enabled */
    autoDelete: boolean;
  };
}

export interface ReportQuery {
  /** Filter by module ID */
  moduleId?: string;
  /** Filter by date range */
  dateRange?: {
    from: Date;
    to: Date;
  };
  /** Filter by compliance score range */
  scoreRange?: {
    min: number;
    max: number;
  };
  /** Filter by validation status */
  status?: 'PASS' | 'FAIL' | 'WARNING' | 'PARTIAL' | 'ERROR';
  /** Filter by tags */
  tags?: string[];
  /** Sort options */
  sort?: {
    field: 'timestamp' | 'moduleId' | 'score' | 'status';
    order: 'asc' | 'desc';
  };
  /** Pagination */
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface TrendAnalysis {
  /** Analysis ID */
  analysisId: string;
  /** Time period analyzed */
  period: {
    from: Date;
    to: Date;
  };
  /** Modules included in analysis */
  moduleIds: string[];
  /** Trend metrics */
  trends: {
    /** Overall compliance score trend */
    complianceTrend: {
      direction: 'improving' | 'declining' | 'stable';
      changePercentage: number;
      dataPoints: Array<{ date: Date; score: number }>;
    };
    /** Rule violation trends */
    violationTrends: Record<string, {
      count: number;
      trend: 'increasing' | 'decreasing' | 'stable';
      changePercentage: number;
    }>;
    /** Module performance trends */
    modulePerformance: Record<string, {
      averageScore: number;
      trend: 'improving' | 'declining' | 'stable';
      lastValidation: Date;
    }>;
  };
  /** Predictions and recommendations */
  insights: {
    /** Predicted future trends */
    predictions: string[];
    /** Recommended actions */
    recommendations: string[];
    /** Risk assessment */
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  /** Analysis metadata */
  timestamp: Date;
  /** Analysis performance */
  performanceMetrics: PerformanceMetrics;
}

export interface ReportingServiceOptions {
  /** Reports storage directory */
  storageDirectory: string;
  /** Maximum reports to retain */
  maxReports?: number;
  /** Default retention period in days */
  defaultRetentionDays?: number;
  /** Enable automatic cleanup */
  autoCleanup?: boolean;
  /** Compression enabled */
  enableCompression?: boolean;
  /** Index file for fast searching */
  enableIndexing?: boolean;
}

export class ReportingService {
  private storageDirectory: string;
  private maxReports: number;
  private defaultRetentionDays: number;
  private autoCleanup: boolean;
  // private enableCompression: boolean;
  private enableIndexing: boolean;
  private reportIndex: Map<string, ReportStorage> = new Map();

  constructor(options: ReportingServiceOptions) {
    this.storageDirectory = options.storageDirectory;
    this.maxReports = options.maxReports || 1000;
    this.defaultRetentionDays = options.defaultRetentionDays || 90;
    this.autoCleanup = options.autoCleanup || true;
    // this.enableCompression = options.enableCompression || true;
    this.enableIndexing = options.enableIndexing || true;
  }

  /**
   * Initialize the reporting service
   */
  async initialize(): Promise<void> {
    try {
      // Create storage directory
      await fs.mkdir(this.storageDirectory, { recursive: true });

      // Create subdirectories
      await Promise.all([
        fs.mkdir(path.join(this.storageDirectory, 'reports'), { recursive: true }),
        fs.mkdir(path.join(this.storageDirectory, 'indexes'), { recursive: true }),
        fs.mkdir(path.join(this.storageDirectory, 'exports'), { recursive: true }),
        fs.mkdir(path.join(this.storageDirectory, 'trends'), { recursive: true })
      ]);

      // Load existing index
      if (this.enableIndexing) {
        await this.loadReportIndex();
      }

      // Perform cleanup if enabled
      if (this.autoCleanup) {
        await this.performCleanup();
      }

    } catch (error) {
      throw new Error(`Failed to initialize ReportingService: ${error}`);
    }
  }

  /**
   * Store a validation report
   */
  async storeReport(report: ValidationReport, tags: string[] = []): Promise<ReportStorage> {
    // const startTime = Date.now();

    try {
      // Generate storage ID
      const storageId = this.generateStorageId(report);

      // Create file path
      const fileName = `${storageId}.json`;
      const filePath = path.join(this.storageDirectory, 'reports', fileName);

      // Prepare report data
      const reportData = {
        ...report,
        storedAt: new Date(),
        storageId
      };

      // Write report to file
      await fs.writeFile(filePath, JSON.stringify(reportData, null, 2));

      // Get file stats
      const stats = await fs.stat(filePath);

      // Create storage record
      const storage: ReportStorage = {
        storageId,
        report,
        storedAt: new Date(),
        location: {
          filePath,
          directory: path.dirname(filePath),
          fileSize: stats.size
        },
        tags,
        retentionPolicy: {
          retentionDays: this.defaultRetentionDays,
          autoDelete: this.autoCleanup
        }
      };

      // Update index
      if (this.enableIndexing) {
        this.reportIndex.set(storageId, storage);
        await this.saveReportIndex();
      }

      // Emit system event
      // const event = createSystemEvent(
      //   'validation',
      //   'info',
      //   `Report stored: ${report.moduleId} (${storageId})`,
      //   'ReportingService',
      //   { storageId, moduleId: report.moduleId, fileSize: stats.size }
      // );

      // Return storage record
      return storage;

    } catch (error) {
      throw new Error(`Failed to store report: ${error}`);
    }
  }

  /**
   * Retrieve a stored report by ID
   */
  async getReport(storageId: string): Promise<ValidationReport | null> {
    try {
      // Check index first
      if (this.enableIndexing) {
        const storage = this.reportIndex.get(storageId);
        if (!storage) {
          return null;
        }

        // Read from file
        const content = await fs.readFile(storage.location.filePath, 'utf8');
        const reportData = JSON.parse(content);
        return reportData as ValidationReport;
      }

      // Fallback: search in directory
      const filePath = path.join(this.storageDirectory, 'reports', `${storageId}.json`);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const reportData = JSON.parse(content);
        return reportData as ValidationReport;
      } catch {
        return null;
      }

    } catch (error) {
      throw new Error(`Failed to retrieve report: ${error}`);
    }
  }

  /**
   * Query reports with filtering and pagination
   */
  async queryReports(query: ReportQuery): Promise<{ reports: ValidationReport[]; total: number; pagination: any }> {
    try {
      let matchingReports: ValidationReport[] = [];

      if (this.enableIndexing) {
        // Use index for fast querying
        matchingReports = await this.queryFromIndex(query);
      } else {
        // Fallback: scan directory
        matchingReports = await this.scanDirectory(query);
      }

      // Apply sorting
      if (query.sort) {
        matchingReports.sort((a, b) => {
          let aVal, bVal;
          switch (query.sort!.field) {
            case 'timestamp':
              aVal = new Date(a.timestamp).getTime();
              bVal = new Date(b.timestamp).getTime();
              break;
            case 'moduleId':
              aVal = a.moduleId;
              bVal = b.moduleId;
              break;
            case 'score':
              aVal = a.overallScore;
              bVal = b.overallScore;
              break;
            case 'status':
              aVal = a.status;
              bVal = b.status;
              break;
            default:
              return 0;
          }

          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return query.sort!.order === 'desc' ? -comparison : comparison;
        });
      }

      const total = matchingReports.length;

      // Apply pagination
      if (query.pagination) {
        const start = (query.pagination.page - 1) * query.pagination.limit;
        const end = start + query.pagination.limit;
        matchingReports = matchingReports.slice(start, end);
      }

      return {
        reports: matchingReports,
        total,
        pagination: query.pagination ? {
          page: query.pagination.page,
          limit: query.pagination.limit,
          totalPages: Math.ceil(total / query.pagination.limit),
          hasNext: query.pagination.page * query.pagination.limit < total,
          hasPrevious: query.pagination.page > 1
        } : null
      };

    } catch (error) {
      throw new Error(`Failed to query reports: ${error}`);
    }
  }

  /**
   * Generate trend analysis for specified period and modules
   */
  async generateTrendAnalysis(
    moduleIds: string[],
    periodDays: number = 30,
    options: { includePredictions?: boolean; includeRecommendations?: boolean } = {}
  ): Promise<TrendAnalysis> {
    // const startTime = Date.now();

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (periodDays * 24 * 60 * 60 * 1000));

      // Query reports for the period
      const query: ReportQuery = {
        dateRange: { from: startDate, to: endDate },
        sort: { field: 'timestamp', order: 'asc' }
      };

      if (moduleIds.length > 0) {
        // Filter by specific modules if provided
        const moduleReports = await Promise.all(
          moduleIds.map(moduleId => this.queryReports({ ...query, moduleId }))
        );

        const allReports = moduleReports.flatMap(result => result.reports);
        return await this.analyzeTrends(allReports, startDate, endDate, options);
      } else {
        // Analyze all modules
        const result = await this.queryReports(query);
        return await this.analyzeTrends(result.reports, startDate, endDate, options);
      }

    } catch (error) {
      throw new Error(`Failed to generate trend analysis: ${error}`);
    }
  }

  /**
   * Generate ecosystem summary
   */
  async generateEcosystemSummary(): Promise<EcosystemSummary> {
    try {
      // Get all recent reports (last 7 days)
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000));

      const query: ReportQuery = {
        dateRange: { from: startDate, to: endDate }
      };

      const result = await this.queryReports(query);
      const reports = result.reports;

      // Simplified aggregation since ReportAggregator.aggregateReports method doesn't exist yet
      const totalModules = new Set(reports.map(r => r.moduleId)).size;
      const averageScore = reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length || 0;
      // const topViolations = reports.reduce((sum, r) => sum + r.results.filter(res => res.status === 'FAIL').length, 0);

      // Generate ecosystem summary
      const summary: EcosystemSummary = {
        timestamp: new Date(),
        totalModules,
        averageScore,
        scoreDistribution: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0
        },
        statusBreakdown: {
          pass: 0,
          warning: 0,
          fail: 0,
          error: 0
        },
        topViolations: [],
        moduleScores: []
      };

      return summary;

    } catch (error) {
      throw new Error(`Failed to generate ecosystem summary: ${error}`);
    }
  }

  /**
   * Export reports in various formats
   */
  async exportReports(
    query: ReportQuery,
    format: 'json' | 'csv' | 'html' | 'pdf',
    outputPath?: string
  ): Promise<string> {
    try {
      const result = await this.queryReports(query);
      const reports = result.reports;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `reports-export-${timestamp}.${format}`;
      const filePath = outputPath || path.join(this.storageDirectory, 'exports', fileName);

      let content: string;

      switch (format) {
        case 'json':
          content = JSON.stringify(reports, null, 2);
          break;

        case 'csv':
          content = this.generateCsvContent(reports);
          break;

        case 'html':
          content = this.generateHtmlContent(reports);
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      await fs.writeFile(filePath, content);
      return filePath;

    } catch (error) {
      throw new Error(`Failed to export reports: ${error}`);
    }
  }

  /**
   * Perform cleanup of old reports
   */
  async performCleanup(): Promise<{ deletedCount: number; freedSpace: number }> {
    try {
      let deletedCount = 0;
      let freedSpace = 0;

      if (!this.enableIndexing) {
        return { deletedCount: 0, freedSpace: 0 };
      }

      const now = new Date();
      const reportsToDelete: string[] = [];

      // Find expired reports
      for (const [storageId, storage] of this.reportIndex.entries()) {
        const retentionDays = storage.retentionPolicy?.retentionDays || this.defaultRetentionDays;
        const expiryDate = new Date(storage.storedAt.getTime() + (retentionDays * 24 * 60 * 60 * 1000));

        if (now > expiryDate && storage.retentionPolicy?.autoDelete) {
          reportsToDelete.push(storageId);
        }
      }

      // Delete expired reports
      for (const storageId of reportsToDelete) {
        const storage = this.reportIndex.get(storageId);
        if (storage) {
          try {
            const stats = await fs.stat(storage.location.filePath);
            await fs.unlink(storage.location.filePath);
            freedSpace += stats.size;
            deletedCount++;
            this.reportIndex.delete(storageId);
          } catch (error) {
            // File might already be deleted, continue
          }
        }
      }

      // Save updated index
      if (deletedCount > 0) {
        await this.saveReportIndex();
      }

      return { deletedCount, freedSpace };

    } catch (error) {
      throw new Error(`Failed to perform cleanup: ${error}`);
    }
  }

  /**
   * Get service health and statistics
   */
  async getServiceHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    statistics: {
      totalReports: number;
      totalStorageSize: number;
      oldestReport: Date | null;
      newestReport: Date | null;
      averageReportSize: number;
    };
    performance: {
      averageStoreTime: number;
      averageQueryTime: number;
      indexSize: number;
    };
  }> {
    try {
      const statistics = await this.calculateStatistics();
      const performance = await this.calculatePerformanceMetrics();

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      // Determine health status based on various factors
      if (statistics.totalReports > this.maxReports * 0.9) {
        status = 'degraded'; // Approaching storage limit
      }

      if (performance.averageStoreTime > 5000) { // > 5 seconds
        status = 'degraded';
      }

      if (statistics.totalReports === 0) {
        status = 'unhealthy';
      }

      return {
        status,
        statistics,
        performance
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        statistics: {
          totalReports: 0,
          totalStorageSize: 0,
          oldestReport: null,
          newestReport: null,
          averageReportSize: 0
        },
        performance: {
          averageStoreTime: 0,
          averageQueryTime: 0,
          indexSize: 0
        }
      };
    }
  }

  // Private helper methods

  private generateStorageId(report: ValidationReport): string {
    const timestamp = Date.now();
    const moduleHash = this.hashString(report.moduleId);
    return `${report.moduleId}-${moduleHash}-${timestamp}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private async loadReportIndex(): Promise<void> {
    try {
      const indexPath = path.join(this.storageDirectory, 'indexes', 'reports.json');
      const content = await fs.readFile(indexPath, 'utf8');
      const indexData = JSON.parse(content);

      this.reportIndex = new Map(indexData.entries || []);
    } catch {
      // Index file doesn't exist or is corrupted, start fresh
      this.reportIndex = new Map();
    }
  }

  private async saveReportIndex(): Promise<void> {
    try {
      const indexPath = path.join(this.storageDirectory, 'indexes', 'reports.json');
      const indexData = {
        version: '1.0',
        lastUpdated: new Date(),
        entries: Array.from(this.reportIndex.entries())
      };

      await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
    } catch (error) {
      // Continue operation even if index save fails
      console.warn('Failed to save report index:', error);
    }
  }

  private async queryFromIndex(query: ReportQuery): Promise<ValidationReport[]> {
    const matchingReports: ValidationReport[] = [];

    for (const [storageId, storage] of this.reportIndex.entries()) {
      if (this.matchesQuery(storage, query)) {
        try {
          const report = await this.getReport(storageId);
          if (report) {
            matchingReports.push(report);
          }
        } catch {
          // Skip corrupted reports
          continue;
        }
      }
    }

    return matchingReports;
  }

  private async scanDirectory(query: ReportQuery): Promise<ValidationReport[]> {
    // Fallback implementation when indexing is disabled
    const reports: ValidationReport[] = [];
    const reportsDir = path.join(this.storageDirectory, 'reports');

    try {
      const files = await fs.readdir(reportsDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(reportsDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const report = JSON.parse(content) as ValidationReport;

            // Apply basic filtering
            if (this.matchesBasicQuery(report, query)) {
              reports.push(report);
            }
          } catch {
            // Skip corrupted files
            continue;
          }
        }
      }
    } catch {
      // Directory doesn't exist or is not accessible
      return [];
    }

    return reports;
  }

  private matchesQuery(storage: ReportStorage, query: ReportQuery): boolean {
    const report = storage.report;

    // Module ID filter
    if (query.moduleId && report.moduleId !== query.moduleId) {
      return false;
    }

    // Date range filter
    if (query.dateRange) {
      const reportDate = new Date(report.timestamp);
      if (reportDate < query.dateRange.from || reportDate > query.dateRange.to) {
        return false;
      }
    }

    // Score range filter
    if (query.scoreRange) {
      if (report.overallScore < query.scoreRange.min || report.overallScore > query.scoreRange.max) {
        return false;
      }
    }

    // Status filter
    if (query.status && report.status !== query.status) {
      return false;
    }

    // Tags filter
    if (query.tags && query.tags.length > 0) {
      const hasTags = query.tags.some(tag => storage.tags.includes(tag));
      if (!hasTags) {
        return false;
      }
    }

    return true;
  }

  private matchesBasicQuery(report: ValidationReport, query: ReportQuery): boolean {
    // Simplified matching for directory scan
    if (query.moduleId && report.moduleId !== query.moduleId) {
      return false;
    }

    if (query.status && report.status !== query.status) {
      return false;
    }

    return true;
  }

  private async analyzeTrends(
    reports: ValidationReport[],
    startDate: Date,
    endDate: Date,
    options: { includePredictions?: boolean; includeRecommendations?: boolean }
  ): Promise<TrendAnalysis> {
    // Group reports by date for trend calculation
    const reportsByDate = new Map<string, ValidationReport[]>();

    reports.forEach(report => {
      const dateKey = new Date(report.timestamp).toISOString().split('T')[0] || 'unknown';
      if (!reportsByDate.has(dateKey)) {
        reportsByDate.set(dateKey, []);
      }
      reportsByDate.get(dateKey)!.push(report);
    });

    // Calculate compliance trend
    const dataPoints: Array<{ date: Date; score: number }> = [];
    for (const [dateKey, dayReports] of reportsByDate.entries()) {
      const averageScore = dayReports.reduce((sum, report) => sum + report.overallScore, 0) / dayReports.length;
      dataPoints.push({
        date: new Date(dateKey),
        score: averageScore
      });
    }

    // Calculate trend direction
    const firstScore = dataPoints[0]?.score || 0;
    const lastScore = dataPoints[dataPoints.length - 1]?.score || 0;
    const changePercentage = firstScore > 0 ? ((lastScore - firstScore) / firstScore) * 100 : 0;

    let direction: 'improving' | 'declining' | 'stable' = 'stable';
    if (Math.abs(changePercentage) > 5) {
      direction = changePercentage > 0 ? 'improving' : 'declining';
    }

    // Generate analysis
    const analysis: TrendAnalysis = {
      analysisId: `trend-${Date.now()}`,
      period: { from: startDate, to: endDate },
      moduleIds: [...new Set(reports.map(r => r.moduleId))],
      trends: {
        complianceTrend: {
          direction,
          changePercentage,
          dataPoints
        },
        violationTrends: this.calculateViolationTrends(reports),
        modulePerformance: this.calculateModulePerformance(reports)
      },
      insights: {
        predictions: options.includePredictions ? this.generatePredictions(reports) : [],
        recommendations: options.includeRecommendations ? this.generateRecommendations(reports) : [],
        riskLevel: this.assessRiskLevel(reports)
      },
      timestamp: new Date(),
      performanceMetrics: {
        operation: 'trend_analysis',
        startTime: new Date(),
        endTime: new Date(),
        duration: Date.now() - Date.now(), // Will be updated
        customMetrics: { reportCount: reports.length }
      }
    };

    return analysis;
  }

  private calculateViolationTrends(reports: ValidationReport[]): Record<string, any> {
    const violationCounts: Record<string, number[]> = {};

    // Count violations by rule over time
    reports.forEach(report => {
      report.results.forEach(result => {
        if (result.status === 'FAIL' || result.status === 'WARNING') {
          if (!violationCounts[result.ruleId]) {
            violationCounts[result.ruleId] = [];
          }
          violationCounts[result.ruleId]!.push(1);
        }
      });
    });

    const trends: Record<string, any> = {};
    for (const [ruleId, counts] of Object.entries(violationCounts)) {
      const totalCount = counts.length;
      trends[ruleId] = {
        count: totalCount,
        trend: 'stable', // Simplified for now
        changePercentage: 0 // Simplified for now
      };
    }

    return trends;
  }

  private calculateModulePerformance(reports: ValidationReport[]): Record<string, any> {
    const moduleData: Record<string, { scores: number[]; lastValidation: Date }> = {};

    reports.forEach(report => {
      if (!moduleData[report.moduleId]) {
        moduleData[report.moduleId] = {
          scores: [],
          lastValidation: new Date(report.timestamp)
        };
      }

      moduleData[report.moduleId]!.scores.push(report.overallScore);
      const reportDate = new Date(report.timestamp);
      if (reportDate > moduleData[report.moduleId]!.lastValidation) {
        moduleData[report.moduleId]!.lastValidation = reportDate;
      }
    });

    const performance: Record<string, any> = {};
    for (const [moduleId, data] of Object.entries(moduleData)) {
      const averageScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;

      performance[moduleId] = {
        averageScore,
        trend: 'stable', // Simplified
        lastValidation: data.lastValidation
      };
    }

    return performance;
  }

  private generatePredictions(reports: ValidationReport[]): string[] {
    // Simplified prediction generation
    const predictions: string[] = [];

    if (reports.length > 0) {
      const averageScore = reports.reduce((sum, report) => sum + report.overallScore, 0) / reports.length;

      if (averageScore < 70) {
        predictions.push('Compliance scores are expected to remain low without intervention');
        predictions.push('Consider implementing automated compliance checks');
      } else if (averageScore > 85) {
        predictions.push('Compliance scores are likely to remain stable');
        predictions.push('Focus on maintaining current standards');
      }
    }

    return predictions;
  }

  private generateRecommendations(reports: ValidationReport[]): string[] {
    // Simplified recommendation generation
    const recommendations: string[] = [];

    // Analyze common issues
    const violationCounts: Record<string, number> = {};
    reports.forEach(report => {
      report.results.forEach(result => {
        if (result.status === 'FAIL') {
          violationCounts[result.ruleId] = (violationCounts[result.ruleId] || 0) + 1;
        }
      });
    });

    // Generate recommendations based on most common violations
    const sortedViolations = Object.entries(violationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    sortedViolations.forEach(([ruleId, count]) => {
      recommendations.push(`Address ${ruleId} violations (${count} occurrences)`);
    });

    return recommendations;
  }

  private assessRiskLevel(reports: ValidationReport[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (reports.length === 0) return 'MEDIUM';

    const averageScore = reports.reduce((sum, report) => sum + report.overallScore, 0) / reports.length;
    const criticalViolations = reports.reduce((sum, report) => {
      return sum + report.results.filter(r => r.status === 'FAIL' && r.severity === 'CRITICAL').length;
    }, 0);

    if (averageScore < 60 || criticalViolations > 5) {
      return 'HIGH';
    } else if (averageScore < 80 || criticalViolations > 0) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  // private calculateTrendDirection(reports: ValidationReport[]): 'improving' | 'declining' | 'stable' {
  //   if (reports.length < 2) return 'stable';

  //   const sortedReports = reports.sort((a, b) =>
  //     new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  //   );

  //   const firstHalf = sortedReports.slice(0, Math.floor(sortedReports.length / 2));
  //   const secondHalf = sortedReports.slice(Math.floor(sortedReports.length / 2));

  //   const firstAvg = firstHalf.reduce((sum, report) => sum + report.overallScore, 0) / firstHalf.length;
  //   const secondAvg = secondHalf.reduce((sum, report) => sum + report.overallScore, 0) / secondHalf.length;

  //   const changePercentage = ((secondAvg - firstAvg) / firstAvg) * 100;

  //   if (Math.abs(changePercentage) <= 5) {
  //     return 'stable';
  //   }

  //   return changePercentage > 0 ? 'improving' : 'declining';
  // }

  // private findMostImprovedModules(reports: ValidationReport[]): string[] {
  //   // Simplified implementation
  //   const moduleScores: Record<string, number[]> = {};

  //   reports.forEach(report => {
  //     if (!moduleScores[report.moduleId]) {
  //       moduleScores[report.moduleId] = [];
  //     }
  //     moduleScores[report.moduleId]!.push(report.overallScore);
  //   });

  //   return Object.keys(moduleScores).slice(0, 3); // Return first 3 modules
  // }

  // private findMostProblematicRules(reports: ValidationReport[]): string[] {
  //   const ruleCounts: Record<string, number> = {};

  //   reports.forEach(report => {
  //     report.results.forEach(result => {
  //       if (result.status === 'FAIL') {
  //         ruleCounts[result.ruleId] = (ruleCounts[result.ruleId] || 0) + 1;
  //       }
  //     });
  //   });

  //   return Object.entries(ruleCounts)
  //     .sort(([,a], [,b]) => b - a)
  //     .slice(0, 3)
  //     .map(([ruleId]) => ruleId);
  // }

  private generateCsvContent(reports: ValidationReport[]): string {
    const headers = ['Module ID', 'Module Name', 'Score', 'Status', 'Generated At', 'Total Rules', 'Passed', 'Failed', 'Warnings'];
    const rows = reports.map(report => [
      report.moduleId || '',
      report.moduleName || '',
      report.overallScore.toString(),
      report.status,
      new Date(report.timestamp).toISOString(),
      report.results.length.toString(),
      report.results.filter(r => r.status === 'PASS').length.toString(),
      report.results.filter(r => r.status === 'FAIL').length.toString(),
      report.results.filter(r => r.status === 'WARNING').length.toString()
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private generateHtmlContent(reports: ValidationReport[]): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Validation Reports Export</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .status-pass { color: green; }
        .status-fail { color: red; }
        .status-warning { color: orange; }
    </style>
</head>
<body>
    <h1>Validation Reports Export</h1>
    <p>Generated: ${new Date().toISOString()}</p>
    <p>Total Reports: ${reports.length}</p>

    <table>
        <thead>
            <tr>
                <th>Module ID</th>
                <th>Score</th>
                <th>Status</th>
                <th>Generated At</th>
                <th>Results Summary</th>
            </tr>
        </thead>
        <tbody>
            ${reports.map(report => `
                <tr>
                    <td>${report.moduleId}</td>
                    <td>${report.overallScore}/100</td>
                    <td class="status-${report.status.toLowerCase()}">${report.status}</td>
                    <td>${new Date(report.timestamp).toLocaleString()}</td>
                    <td>
                        Pass: ${report.results.filter(r => r.status === 'PASS').length},
                        Fail: ${report.results.filter(r => r.status === 'FAIL').length},
                        Warning: ${report.results.filter(r => r.status === 'WARNING').length}
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>
    `;
  }

  private async calculateStatistics(): Promise<any> {
    try {
      const reports = Array.from(this.reportIndex.values());
      let totalStorageSize = 0;
      let oldestReport: Date | null = null;
      let newestReport: Date | null = null;

      reports.forEach(storage => {
        totalStorageSize += storage.location.fileSize;

        if (!oldestReport || storage.storedAt < oldestReport) {
          oldestReport = storage.storedAt;
        }

        if (!newestReport || storage.storedAt > newestReport) {
          newestReport = storage.storedAt;
        }
      });

      const averageReportSize = reports.length > 0 ? totalStorageSize / reports.length : 0;

      return {
        totalReports: reports.length,
        totalStorageSize,
        oldestReport,
        newestReport,
        averageReportSize
      };

    } catch (error) {
      throw new Error(`Failed to calculate statistics: ${error}`);
    }
  }

  private async calculatePerformanceMetrics(): Promise<any> {
    return {
      averageStoreTime: 500, // ms - would track real metrics in production
      averageQueryTime: 100, // ms - would track real metrics in production
      indexSize: this.reportIndex.size
    };
  }
}