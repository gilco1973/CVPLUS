/**
 * Advanced Analytics Service
 *
 * Provides machine learning-based insights, trend analysis, predictive modeling,
 * and intelligent recommendations for module validation and optimization.
 */

import {
  AnalyticsDataPoint,
  TimeSeries,
  Insight,
  InsightType,
  TrendAnalysis,
  AnomalyDetection,
  Anomaly,
  Prediction,
  PatternRecognition,
  QualityMetrics,
  QualityIssue,
  MLModel,
  MLModelType,
  Recommendation,
  AnalyticsJob,
  AnalyticsEvent,
  AnalyticsServiceConfig
} from '../types/analytics.js';
import { ValidationResult } from '../types/validation.js';
import { PerformanceProfile } from '../types/performance.js';
import { SecurityScanResult } from '../types/security.js';

export class AnalyticsService {
  private config: AnalyticsServiceConfig;
  private dataStore: Map<string, TimeSeries> = new Map();
  private models: Map<string, MLModel> = new Map();
  private insights: Map<string, Insight> = new Map();
  private _jobs: Map<string, AnalyticsJob> = new Map();
  private eventStore: AnalyticsEvent[] = [];

  constructor(config: Partial<AnalyticsServiceConfig> = {}) {
    this.config = {
      settings: {
        retentionDays: 30,
        samplingRate: 1.0,
        enableML: true,
        metrics: [],
        aggregation: {
          intervals: ['1h', '1d', '1w'],
          functions: ['avg', 'min', 'max', 'p95']
        },
        mlConfig: {
          modelTypes: ['trend_analysis', 'anomaly_detection', 'predictive_modeling'],
          trainingSchedule: 'daily',
          predictionHorizon: 7,
          confidenceThreshold: 0.8
        }
      },
      storage: {
        type: 'memory',
        config: {}
      },
      mlService: {
        enabled: true,
        provider: 'builtin',
        config: {}
      },
      alerts: [],
      dashboards: [],
      ...config
    };

    this.initializeModels();
  }

  /**
   * Initialize ML models
   */
  private initializeModels(): void {
    if (!this.config.mlService.enabled) return;

    const modelTypes = this.config.settings.mlConfig.modelTypes;

    modelTypes.forEach(type => {
      const model: MLModel = {
        id: `${type}-model-${Date.now()}`,
        name: `${type.replace('_', ' ').toUpperCase()} Model`,
        type,
        version: '1.0.0',
        trainingPeriod: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          end: new Date()
        },
        performance: {},
        config: this.getDefaultModelConfig(type),
        status: 'ready',
        trainedAt: new Date()
      };

      this.models.set(model.id, model);
    });
  }

  /**
   * Get default configuration for a model type
   */
  private getDefaultModelConfig(type: MLModelType): Record<string, any> {
    const configs = {
      trend_analysis: {
        windowSize: 24, // hours
        polynomialDegree: 2,
        confidenceLevel: 0.95
      },
      anomaly_detection: {
        algorithm: 'isolation_forest',
        contamination: 0.1,
        nEstimators: 100
      },
      predictive_modeling: {
        algorithm: 'linear_regression',
        features: ['trend', 'seasonality', 'day_of_week'],
        lookback: 168 // hours (1 week)
      },
      clustering: {
        algorithm: 'kmeans',
        nClusters: 5,
        features: ['performance', 'security', 'quality']
      },
      classification: {
        algorithm: 'random_forest',
        nEstimators: 100,
        maxDepth: 10
      },
      regression: {
        algorithm: 'linear_regression',
        regularization: 'l2',
        alpha: 0.01
      },
      time_series_forecasting: {
        algorithm: 'arima',
        order: [1, 1, 1],
        seasonal: true
      }
    };

    return configs[type] || {};
  }

  /**
   * Record analytics data point
   */
  async recordDataPoint(dataPoint: AnalyticsDataPoint): Promise<void> {
    const seriesId = `${dataPoint.source}_${dataPoint.metric}`;

    let series = this.dataStore.get(seriesId);
    if (!series) {
      series = {
        id: seriesId,
        name: `${dataPoint.source} - ${dataPoint.metric}`,
        dataPoints: [],
        metadata: {
          unit: dataPoint.metadata.unit || 'count',
          description: `${dataPoint.metric} from ${dataPoint.source}`,
          category: dataPoint.metadata.category || 'general',
          frequency: 'real-time'
        }
      };
      this.dataStore.set(seriesId, series);
    }

    // Add data point
    series.dataPoints.push(dataPoint);

    // Sort by timestamp
    series.dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Apply retention policy
    const cutoffDate = new Date(Date.now() - this.config.settings.retentionDays * 24 * 60 * 60 * 1000);
    series.dataPoints = series.dataPoints.filter(dp => dp.timestamp >= cutoffDate);

    // Trigger analysis if enough data
    if (series.dataPoints.length >= 10) {
      await this.triggerAnalysis(seriesId);
    }
  }

  /**
   * Record validation results for analytics
   */
  async recordValidationResults(results: ValidationResult[], modulePath: string): Promise<void> {
    const timestamp = new Date();

    // Record overall metrics
    await this.recordDataPoint({
      timestamp,
      metric: 'validation_results_count',
      value: results.length,
      metadata: { category: 'validation' },
      source: modulePath,
      tags: ['validation', 'results']
    });

    await this.recordDataPoint({
      timestamp,
      metric: 'validation_errors_count',
      value: results.filter(r => r.status === 'FAIL').length,
      metadata: { category: 'validation' },
      source: modulePath,
      tags: ['validation', 'errors']
    });

    // Record by severity
    const severityCounts = results.reduce((acc, result) => {
      acc[result.severity] = (acc[result.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [severity, count] of Object.entries(severityCounts)) {
      await this.recordDataPoint({
        timestamp,
        metric: `validation_${severity}_count`,
        value: count,
        metadata: { category: 'validation', severity },
        source: modulePath,
        tags: ['validation', severity]
      });
    }

    // Record by rule
    const ruleCounts = results.reduce((acc, result) => {
      acc[result.ruleId] = (acc[result.ruleId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [ruleId, count] of Object.entries(ruleCounts)) {
      await this.recordDataPoint({
        timestamp,
        metric: `rule_${ruleId}_count`,
        value: count,
        metadata: { category: 'validation', ruleId },
        source: modulePath,
        tags: ['validation', 'rule', ruleId]
      });
    }
  }

  /**
   * Record performance metrics for analytics
   */
  async recordPerformanceMetrics(profile: PerformanceProfile): Promise<void> {
    const timestamp = new Date();
    const source = profile.moduleId;

    await this.recordDataPoint({
      timestamp,
      metric: 'performance_score',
      value: profile.performanceScore,
      metadata: { category: 'performance' },
      source,
      tags: ['performance', 'score']
    });

    await this.recordDataPoint({
      timestamp,
      metric: 'file_count',
      value: profile.metrics.fileSystem.totalFiles,
      metadata: { category: 'performance', unit: 'count' },
      source,
      tags: ['performance', 'files']
    });

    await this.recordDataPoint({
      timestamp,
      metric: 'total_size_bytes',
      value: profile.metrics.fileSystem.totalSizeBytes,
      metadata: { category: 'performance', unit: 'bytes' },
      source,
      tags: ['performance', 'size']
    });

    await this.recordDataPoint({
      timestamp,
      metric: 'bottleneck_count',
      value: profile.bottlenecks.length,
      metadata: { category: 'performance' },
      source,
      tags: ['performance', 'bottlenecks']
    });

    await this.recordDataPoint({
      timestamp,
      metric: 'optimization_count',
      value: profile.optimizations.length,
      metadata: { category: 'performance' },
      source,
      tags: ['performance', 'optimizations']
    });
  }

  /**
   * Record security scan results for analytics
   */
  async recordSecurityMetrics(scanResult: SecurityScanResult): Promise<void> {
    const timestamp = new Date();
    const source = scanResult.modulePath;

    await this.recordDataPoint({
      timestamp,
      metric: 'vulnerability_count',
      value: scanResult.vulnerabilities.length,
      metadata: { category: 'security' },
      source,
      tags: ['security', 'vulnerabilities']
    });

    await this.recordDataPoint({
      timestamp,
      metric: 'risk_score',
      value: scanResult.riskScore,
      metadata: { category: 'security' },
      source,
      tags: ['security', 'risk']
    });

    // Record by vulnerability type
    const typeCounts = scanResult.vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.type] = (acc[vuln.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [type, count] of Object.entries(typeCounts)) {
      await this.recordDataPoint({
        timestamp,
        metric: `vulnerability_${type}_count`,
        value: count,
        metadata: { category: 'security', type },
        source,
        tags: ['security', 'vulnerability', type]
      });
    }

    // Record by severity
    const severityCounts = scanResult.vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [severity, count] of Object.entries(severityCounts)) {
      await this.recordDataPoint({
        timestamp,
        metric: `vulnerability_${severity}_count`,
        value: count,
        metadata: { category: 'security', severity },
        source,
        tags: ['security', 'vulnerability', severity]
      });
    }
  }

  /**
   * Trigger analysis for a time series
   */
  private async triggerAnalysis(seriesId: string): Promise<void> {
    const series = this.dataStore.get(seriesId);
    if (!series || series.dataPoints.length < 10) return;

    // Run different types of analysis
    await Promise.all([
      this.performTrendAnalysis(series),
      this.performAnomalyDetection(series),
      this.performPatternRecognition(series)
    ]);
  }

  /**
   * Perform trend analysis on time series data
   */
  async performTrendAnalysis(series: TimeSeries): Promise<TrendAnalysis> {
    const dataPoints = series.dataPoints.slice(-168); // Last week of data
    if (dataPoints.length < 10) {
      throw new Error('Insufficient data for trend analysis');
    }

    // Calculate linear trend
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, _, i) => sum + i, 0);
    const sumY = dataPoints.reduce((sum, dp) => sum + dp.value, 0);
    const sumXY = dataPoints.reduce((sum, dp, i) => sum + i * dp.value, 0);
    const sumXX = dataPoints.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Determine trend direction and strength
    const direction = slope > 0.01 ? 'increasing' :
                     slope < -0.01 ? 'decreasing' : 'stable';

    const strength = Math.min(Math.abs(slope) * 10, 1); // Normalize to 0-1

    // Calculate forecast
    const lastIndex = n - 1;
    const forecastValue = slope * (lastIndex + 24) + intercept; // 24 hours ahead
    const residuals = dataPoints.map((dp, i) => dp.value - (slope * i + intercept));
    const mse = residuals.reduce((sum, r) => sum + r * r, 0) / n;
    const std = Math.sqrt(mse);

    const trendAnalysis: TrendAnalysis = {
      metric: series.id,
      period: {
        start: dataPoints[0].timestamp,
        end: dataPoints[dataPoints.length - 1].timestamp
      },
      direction,
      strength,
      significance: Math.min(strength * 2, 1),
      slope,
      seasonality: {
        detected: false // Simplified - would implement full seasonality detection
      },
      forecast: {
        value: forecastValue,
        confidenceInterval: {
          lower: forecastValue - 1.96 * std,
          upper: forecastValue + 1.96 * std
        },
        horizon: 1 // 1 day
      }
    };

    // Generate insight if significant trend detected
    if (trendAnalysis.strength > 0.5) {
      await this.generateTrendInsight(trendAnalysis);
    }

    return trendAnalysis;
  }

  /**
   * Perform anomaly detection on time series data
   */
  async performAnomalyDetection(series: TimeSeries): Promise<AnomalyDetection> {
    const dataPoints = series.dataPoints.slice(-48); // Last 48 hours
    if (dataPoints.length < 20) {
      throw new Error('Insufficient data for anomaly detection');
    }

    // Simple statistical anomaly detection (Z-score method)
    const values = dataPoints.map(dp => dp.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    const anomalies: Anomaly[] = [];
    const threshold = 2.5; // Z-score threshold

    dataPoints.forEach((dp, index) => {
      const zScore = Math.abs((dp.value - mean) / std);

      if (zScore > threshold) {
        const anomaly: Anomaly = {
          id: `anomaly-${series.id}-${dp.timestamp.getTime()}`,
          timestamp: dp.timestamp,
          observedValue: dp.value,
          expectedValue: mean,
          score: Math.min(zScore / 5, 1), // Normalize to 0-1
          type: 'point',
          severity: zScore > 4 ? 'critical' :
                   zScore > 3.5 ? 'high' :
                   zScore > 3 ? 'medium' : 'low',
          factors: ['statistical_outlier'],
          potentialCauses: this.inferAnomalyCauses(series, dp)
        };

        anomalies.push(anomaly);
      }
    });

    const detection: AnomalyDetection = {
      metric: series.id,
      timestamp: new Date(),
      anomalies,
      algorithm: 'statistical',
      confidence: Math.min(std > 0 ? 1 : 0, 1),
      parameters: {
        threshold,
        mean,
        std,
        windowSize: dataPoints.length
      }
    };

    // Generate insights for significant anomalies
    for (const anomaly of anomalies.filter(a => a.severity === 'high' || a.severity === 'critical')) {
      await this.generateAnomalyInsight(anomaly, series);
    }

    return detection;
  }

  /**
   * Infer potential causes of anomalies
   */
  private inferAnomalyCauses(series: TimeSeries, dataPoint: AnalyticsDataPoint): string[] {
    const causes: string[] = [];

    // Check if it's a weekend/holiday effect
    const dayOfWeek = dataPoint.timestamp.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      causes.push('weekend_effect');
    }

    // Check if it's during off-hours
    const hour = dataPoint.timestamp.getHours();
    if (hour < 6 || hour > 22) {
      causes.push('off_hours_activity');
    }

    // Check for deployment or configuration changes
    if (dataPoint.tags.includes('deployment') || dataPoint.tags.includes('config_change')) {
      causes.push('deployment_impact');
    }

    // Default causes based on metric type
    if (series.metadata.category === 'performance') {
      causes.push('performance_spike', 'resource_contention');
    } else if (series.metadata.category === 'security') {
      causes.push('security_incident', 'attack_pattern');
    } else if (series.metadata.category === 'validation') {
      causes.push('code_quality_issue', 'rule_violation_spike');
    }

    return causes;
  }

  /**
   * Perform pattern recognition on time series data
   */
  async performPatternRecognition(series: TimeSeries): Promise<PatternRecognition[]> {
    const dataPoints = series.dataPoints.slice(-168); // Last week
    if (dataPoints.length < 24) {
      return [];
    }

    const patterns: PatternRecognition[] = [];

    // Detect daily patterns
    const dailyPattern = this.detectDailyPattern(dataPoints);
    if (dailyPattern) {
      patterns.push(dailyPattern);
    }

    // Detect weekly patterns
    const weeklyPattern = this.detectWeeklyPattern(dataPoints);
    if (weeklyPattern) {
      patterns.push(weeklyPattern);
    }

    return patterns;
  }

  /**
   * Detect daily recurring patterns
   */
  private detectDailyPattern(dataPoints: AnalyticsDataPoint[]): PatternRecognition | null {
    // Group by hour of day
    const hourlyData: { [hour: number]: number[] } = {};

    dataPoints.forEach(dp => {
      const hour = dp.timestamp.getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = [];
      }
      hourlyData[hour].push(dp.value);
    });

    // Calculate coefficient of variation for each hour
    const hourlyVariations = Object.entries(hourlyData).map(([hour, values]) => {
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const cv = Math.sqrt(variance) / mean;
      return { hour: parseInt(hour), cv, mean, count: values.length };
    });

    // Check if there's a consistent pattern
    const avgCv = hourlyVariations.reduce((sum, h) => sum + h.cv, 0) / hourlyVariations.length;

    if (avgCv < 0.3 && hourlyVariations.length >= 12) { // Low variation indicates pattern
      return {
        id: `daily-pattern-${Date.now()}`,
        name: 'Daily Activity Pattern',
        type: 'recurring',
        description: 'Consistent daily activity pattern detected',
        metrics: [dataPoints[0].metric],
        frequency: {
          count: Math.floor(dataPoints.length / 24),
          period: 'daily'
        },
        strength: 1 - avgCv,
        duration: {
          average: 24 * 60, // 24 hours in minutes
          min: 24 * 60,
          max: 24 * 60
        },
        characteristics: {
          peakHours: hourlyVariations
            .filter(h => h.mean > hourlyVariations.reduce((sum, h) => sum + h.mean, 0) / hourlyVariations.length)
            .map(h => h.hour),
          lowHours: hourlyVariations
            .filter(h => h.mean < hourlyVariations.reduce((sum, h) => sum + h.mean, 0) / hourlyVariations.length)
            .map(h => h.hour)
        },
        nextOccurrence: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
    }

    return null;
  }

  /**
   * Detect weekly recurring patterns
   */
  private detectWeeklyPattern(dataPoints: AnalyticsDataPoint[]): PatternRecognition | null {
    if (dataPoints.length < 168) return null; // Need at least a week of hourly data

    // Group by day of week
    const weeklyData: { [day: number]: number[] } = {};

    dataPoints.forEach(dp => {
      const day = dp.timestamp.getDay();
      if (!weeklyData[day]) {
        weeklyData[day] = [];
      }
      weeklyData[day].push(dp.value);
    });

    // Calculate average for each day
    const dailyAverages = Object.entries(weeklyData).map(([day, values]) => {
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      return { day: parseInt(day), mean, count: values.length };
    });

    // Check for weekend vs weekday pattern
    const weekdayAvg = dailyAverages
      .filter(d => d.day >= 1 && d.day <= 5)
      .reduce((sum, d) => sum + d.mean, 0) / 5;

    const weekendAvg = dailyAverages
      .filter(d => d.day === 0 || d.day === 6)
      .reduce((sum, d) => sum + d.mean, 0) / 2;

    const weekendEffect = Math.abs(weekdayAvg - weekendAvg) / weekdayAvg;

    if (weekendEffect > 0.2) { // 20% difference indicates pattern
      return {
        id: `weekly-pattern-${Date.now()}`,
        name: 'Weekly Activity Pattern',
        type: 'recurring',
        description: 'Weekly pattern with weekend effect detected',
        metrics: [dataPoints[0].metric],
        frequency: {
          count: Math.floor(dataPoints.length / 168),
          period: 'weekly'
        },
        strength: Math.min(weekendEffect, 1),
        duration: {
          average: 7 * 24 * 60, // 7 days in minutes
          min: 7 * 24 * 60,
          max: 7 * 24 * 60
        },
        characteristics: {
          weekdayAverage: weekdayAvg,
          weekendAverage: weekendAvg,
          weekendEffect: weekendEffect > 0 ? 'higher' : 'lower'
        }
      };
    }

    return null;
  }

  /**
   * Generate insight from trend analysis
   */
  private async generateTrendInsight(trendAnalysis: TrendAnalysis): Promise<void> {
    const insight: Insight = {
      id: `trend-insight-${Date.now()}`,
      type: 'trend',
      title: `${trendAnalysis.direction.toUpperCase()} trend detected in ${trendAnalysis.metric}`,
      description: `A ${trendAnalysis.direction} trend with ${(trendAnalysis.strength * 100).toFixed(1)}% strength has been detected.`,
      severity: trendAnalysis.strength > 0.8 ? 'high' : 'medium',
      confidence: trendAnalysis.significance,
      data: {
        metrics: [trendAnalysis.metric],
        timeRange: trendAnalysis.period,
        evidence: [trendAnalysis]
      },
      recommendations: this.generateTrendRecommendations(trendAnalysis),
      relatedInsights: [],
      generatedAt: new Date()
    };

    this.insights.set(insight.id, insight);
  }

  /**
   * Generate insight from anomaly detection
   */
  private async generateAnomalyInsight(anomaly: Anomaly, series: TimeSeries): Promise<void> {
    const insight: Insight = {
      id: `anomaly-insight-${Date.now()}`,
      type: 'anomaly',
      title: `${anomaly.severity.toUpperCase()} anomaly detected in ${series.id}`,
      description: `An anomalous value of ${anomaly.observedValue} was detected, expected around ${anomaly.expectedValue.toFixed(2)}.`,
      severity: anomaly.severity === 'critical' ? 'critical' :
               anomaly.severity === 'high' ? 'high' : 'medium',
      confidence: anomaly.score,
      data: {
        metrics: [series.id],
        timeRange: {
          start: anomaly.timestamp,
          end: anomaly.timestamp
        },
        evidence: [anomaly]
      },
      recommendations: this.generateAnomalyRecommendations(anomaly, series),
      relatedInsights: [],
      generatedAt: new Date()
    };

    this.insights.set(insight.id, insight);
  }

  /**
   * Generate recommendations for trend insights
   */
  private generateTrendRecommendations(trendAnalysis: TrendAnalysis): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (trendAnalysis.direction === 'increasing') {
      if (trendAnalysis.metric.includes('error') || trendAnalysis.metric.includes('violation')) {
        recommendations.push({
          id: `rec-${Date.now()}-1`,
          title: 'Investigate increasing error rate',
          description: 'The error rate is trending upward. Investigate recent changes and implement corrective measures.',
          priority: 'high',
          impact: {
            performance: 'negative',
            maintainability: 'negative'
          },
          effort: 'medium',
          steps: [
            'Review recent code changes',
            'Check system logs for error patterns',
            'Implement additional monitoring',
            'Consider rolling back recent changes if necessary'
          ],
          metrics: [trendAnalysis.metric],
          expectedOutcome: 'Reduced error rate and improved system stability'
        });
      }
    } else if (trendAnalysis.direction === 'decreasing') {
      if (trendAnalysis.metric.includes('performance') || trendAnalysis.metric.includes('score')) {
        recommendations.push({
          id: `rec-${Date.now()}-2`,
          title: 'Address declining performance',
          description: 'Performance metrics are trending downward. Optimize critical paths and resources.',
          priority: 'medium',
          impact: {
            performance: 'positive'
          },
          effort: 'medium',
          steps: [
            'Profile application performance',
            'Identify performance bottlenecks',
            'Optimize critical code paths',
            'Monitor resource usage'
          ],
          metrics: [trendAnalysis.metric],
          expectedOutcome: 'Improved performance and user experience'
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate recommendations for anomaly insights
   */
  private generateAnomalyRecommendations(anomaly: Anomaly, series: TimeSeries): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
      recommendations.push({
        id: `rec-${Date.now()}-anomaly`,
        title: 'Investigate critical anomaly',
        description: 'A significant anomaly was detected that requires immediate attention.',
        priority: anomaly.severity === 'critical' ? 'urgent' : 'high',
        impact: {
          performance: 'unknown',
          security: 'unknown'
        },
        effort: 'medium',
        steps: [
          'Review system state at anomaly timestamp',
          'Check for correlation with deployments or changes',
          'Investigate potential root causes',
          'Implement monitoring to prevent recurrence'
        ],
        metrics: [series.id],
        expectedOutcome: 'Understanding and resolution of anomalous behavior'
      });
    }

    return recommendations;
  }

  /**
   * Get all insights
   */
  getInsights(filters?: {
    type?: InsightType;
    severity?: string;
    metric?: string;
    timeRange?: { start: Date; end: Date };
  }): Insight[] {
    let insights = Array.from(this.insights.values());

    if (filters) {
      if (filters.type) {
        insights = insights.filter(i => i.type === filters.type);
      }
      if (filters.severity) {
        insights = insights.filter(i => i.severity === filters.severity);
      }
      if (filters.metric) {
        insights = insights.filter(i => i.data.metrics.includes(filters.metric));
      }
      if (filters.timeRange) {
        insights = insights.filter(i =>
          i.generatedAt >= filters.timeRange!.start &&
          i.generatedAt <= filters.timeRange!.end
        );
      }
    }

    return insights.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  /**
   * Get time series data
   */
  getTimeSeries(seriesId?: string): TimeSeries[] {
    if (seriesId) {
      const series = this.dataStore.get(seriesId);
      return series ? [series] : [];
    }

    return Array.from(this.dataStore.values());
  }

  /**
   * Get quality metrics for a module
   */
  async calculateQualityMetrics(modulePath: string): Promise<QualityMetrics> {
    // Get recent data for the module
    const recentData = this.getRecentDataForModule(modulePath);

    // Calculate quality dimensions
    const dimensions = {
      reliability: this.calculateReliabilityScore(recentData),
      maintainability: this.calculateMaintainabilityScore(recentData),
      security: this.calculateSecurityScore(recentData),
      performance: this.calculatePerformanceScore(recentData),
      testability: this.calculateTestabilityScore(recentData),
      documentation: this.calculateDocumentationScore(recentData)
    };

    const overallScore = Object.values(dimensions).reduce((sum, score) => sum + score, 0) / Object.keys(dimensions).length;

    // Identify quality issues
    const issues = this.identifyQualityIssues(dimensions, recentData);

    return {
      overallScore,
      dimensions,
      trends: {
        direction: 'stable', // Would calculate from historical data
        velocity: 0
      },
      issues,
      benchmark: {
        industryAverage: 75,
        bestPractice: 90,
        percentile: this.calculatePercentile(overallScore)
      }
    };
  }

  /**
   * Get recent analytics data for a module
   */
  private getRecentDataForModule(modulePath: string): AnalyticsDataPoint[] {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    const data: AnalyticsDataPoint[] = [];

    for (const series of this.dataStore.values()) {
      if (series.id.startsWith(modulePath)) {
        data.push(...series.dataPoints.filter(dp => dp.timestamp >= cutoffDate));
      }
    }

    return data;
  }

  /**
   * Calculate reliability score based on error rates and stability
   */
  private calculateReliabilityScore(data: AnalyticsDataPoint[]): number {
    const errorData = data.filter(dp => dp.metric.includes('error') || dp.metric.includes('fail'));
    if (errorData.length === 0) return 100;

    const totalErrors = errorData.reduce((sum, dp) => sum + dp.value, 0);
    const totalOperations = data.filter(dp => dp.metric.includes('count')).reduce((sum, dp) => sum + dp.value, 0);

    if (totalOperations === 0) return 100;

    const errorRate = totalErrors / totalOperations;
    return Math.max(0, 100 - errorRate * 1000); // Scale error rate to 0-100
  }

  /**
   * Calculate maintainability score based on code quality metrics
   */
  private calculateMaintainabilityScore(data: AnalyticsDataPoint[]): number {
    const qualityData = data.filter(dp =>
      dp.metric.includes('quality') ||
      dp.metric.includes('complexity') ||
      dp.metric.includes('debt')
    );

    if (qualityData.length === 0) return 80; // Default score

    const avgQuality = qualityData.reduce((sum, dp) => sum + dp.value, 0) / qualityData.length;
    return Math.min(100, Math.max(0, avgQuality));
  }

  /**
   * Calculate security score based on vulnerability metrics
   */
  private calculateSecurityScore(data: AnalyticsDataPoint[]): number {
    const securityData = data.filter(dp =>
      dp.metric.includes('vulnerability') ||
      dp.metric.includes('security') ||
      dp.metric.includes('risk')
    );

    if (securityData.length === 0) return 90; // Default score for no known issues

    const totalVulns = securityData.reduce((sum, dp) => sum + dp.value, 0);
    return Math.max(0, 100 - totalVulns * 10); // Reduce score by 10 points per vulnerability
  }

  /**
   * Calculate performance score based on performance metrics
   */
  private calculatePerformanceScore(data: AnalyticsDataPoint[]): number {
    const perfData = data.filter(dp => dp.metric.includes('performance'));

    if (perfData.length === 0) return 80; // Default score

    const avgPerf = perfData.reduce((sum, dp) => sum + dp.value, 0) / perfData.length;
    return Math.min(100, Math.max(0, avgPerf));
  }

  /**
   * Calculate testability score based on test coverage and quality
   */
  private calculateTestabilityScore(data: AnalyticsDataPoint[]): number {
    const testData = data.filter(dp =>
      dp.metric.includes('test') ||
      dp.metric.includes('coverage')
    );

    if (testData.length === 0) return 70; // Default score

    const avgTest = testData.reduce((sum, dp) => sum + dp.value, 0) / testData.length;
    return Math.min(100, Math.max(0, avgTest));
  }

  /**
   * Calculate documentation score based on documentation coverage
   */
  private calculateDocumentationScore(data: AnalyticsDataPoint[]): number {
    const docData = data.filter(dp => dp.metric.includes('documentation'));

    if (docData.length === 0) return 75; // Default score

    const avgDoc = docData.reduce((sum, dp) => sum + dp.value, 0) / docData.length;
    return Math.min(100, Math.max(0, avgDoc));
  }

  /**
   * Identify quality issues based on scores and data
   */
  private identifyQualityIssues(dimensions: any, data: AnalyticsDataPoint[]): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Check each dimension for issues
    Object.entries(dimensions).forEach(([dimension, score]) => {
      if (typeof score === 'number' && score < 70) {
        issues.push({
          id: `quality-issue-${dimension}-${Date.now()}`,
          type: 'quality',
          severity: score < 50 ? 'high' : 'medium',
          title: `Low ${dimension} score`,
          description: `${dimension} score of ${score.toFixed(1)} is below acceptable threshold`,
          components: ['module'],
          impact: {
            [dimension]: 'negative'
          },
          effort: 'medium',
          fixes: this.getFixesForDimension(dimension)
        });
      }
    });

    return issues;
  }

  /**
   * Get recommended fixes for a quality dimension
   */
  private getFixesForDimension(dimension: string): string[] {
    const fixes: Record<string, string[]> = {
      reliability: [
        'Add error handling and retry logic',
        'Implement proper logging and monitoring',
        'Add comprehensive tests for edge cases'
      ],
      maintainability: [
        'Refactor complex functions into smaller units',
        'Improve code documentation',
        'Reduce code duplication'
      ],
      security: [
        'Update dependencies to latest versions',
        'Implement security scanning in CI/CD',
        'Add input validation and sanitization'
      ],
      performance: [
        'Optimize critical code paths',
        'Implement caching where appropriate',
        'Profile and fix memory leaks'
      ],
      testability: [
        'Increase test coverage',
        'Add unit tests for core functionality',
        'Implement integration tests'
      ],
      documentation: [
        'Add inline code documentation',
        'Create user guides and API documentation',
        'Document architectural decisions'
      ]
    };

    return fixes[dimension] || ['Review and improve this quality dimension'];
  }

  /**
   * Calculate percentile ranking
   */
  private calculatePercentile(score: number): number {
    // Simplified percentile calculation
    // In a real implementation, this would compare against a database of scores
    if (score >= 90) return 95;
    if (score >= 80) return 85;
    if (score >= 70) return 70;
    if (score >= 60) return 50;
    if (score >= 50) return 30;
    return 10;
  }

  /**
   * Generate predictions for metrics
   */
  async generatePredictions(metricId: string, horizon: number = 7): Promise<Prediction> {
    const series = this.dataStore.get(metricId);
    if (!series || series.dataPoints.length < 20) {
      throw new Error('Insufficient data for prediction');
    }

    // Simple linear prediction (would use more sophisticated models in production)
    const recentData = series.dataPoints.slice(-48); // Last 48 hours
    const values = recentData.map(dp => dp.value);

    // Calculate linear trend
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + i * v, 0);
    const sumXX = values.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate predictions
    const predictions: PredictionPoint[] = [];
    const lastTimestamp = recentData[recentData.length - 1].timestamp;

    for (let i = 1; i <= horizon * 24; i++) { // Hourly predictions
      const futureTimestamp = new Date(lastTimestamp.getTime() + i * 60 * 60 * 1000);
      const predictedValue = slope * (n + i) + intercept;

      // Add some noise estimation for confidence interval
      const residuals = values.map((v, idx) => v - (slope * idx + intercept));
      const mse = residuals.reduce((sum, r) => sum + r * r, 0) / n;
      const std = Math.sqrt(mse);

      predictions.push({
        timestamp: futureTimestamp,
        value: predictedValue,
        confidenceInterval: {
          lower: predictedValue - 1.96 * std,
          upper: predictedValue + 1.96 * std
        },
        factors: {
          trend: slope,
          baseline: intercept,
          seasonality: 0 // Would implement seasonality factors
        }
      });
    }

    return {
      metric: metricId,
      timestamp: new Date(),
      horizon,
      predictions,
      modelId: 'linear-trend-model',
      confidence: 0.75, // Would calculate based on model performance
      accuracy: undefined // Would calculate from historical predictions
    };
  }

  /**
   * Export analytics data
   */
  async exportData(format: 'json' | 'csv' = 'json'): Promise<string> {
    const data = {
      timeSeries: Array.from(this.dataStore.values()),
      insights: Array.from(this.insights.values()),
      models: Array.from(this.models.values()),
      exportedAt: new Date()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      // Simplified CSV export for time series data
      const csvLines = ['timestamp,metric,value,source,tags'];

      for (const series of data.timeSeries) {
        for (const dp of series.dataPoints) {
          csvLines.push(`${dp.timestamp.toISOString()},${dp.metric},${dp.value},${dp.source},"${dp.tags.join(';')}"`);
        }
      }

      return csvLines.join('\n');
    }

    throw new Error(`Unsupported export format: ${format}`);
  }
}