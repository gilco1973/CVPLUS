/**
 * Provider Performance Tracker
 * 
 * Real-time performance monitoring, metrics collection, and predictive
 * analytics for video generation providers.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import * as admin from 'firebase-admin';
import {
  VideoGenerationProvider,
  ProviderPerformanceMetrics,
  VideoGenerationResult,
  VideoGenerationOptions
} from './video-providers/base-provider.interface';

interface MetricsSnapshot {
  providerId: string;
  timestamp: Date;
  operationType: 'generation' | 'status_check' | 'health_check';
  success: boolean;
  responseTime: number;
  videoQuality?: number;
  userSatisfaction?: number;
  cost?: number;
  errorType?: string;
  metadata: {
    duration: number;
    resolution: string;
    format: string;
    features: string[];
  };
}

interface AggregatedMetrics {
  providerId: string;
  period: '1h' | '24h' | '7d' | '30d';
  startTime: Date;
  endTime: Date;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  averageVideoQuality: number;
  averageUserSatisfaction: number;
  totalCost: number;
  averageCost: number;
  errorBreakdown: Record<string, number>;
  uptimePercentage: number;
  trendDirection: 'improving' | 'stable' | 'declining';
  lastUpdated: Date;
}

interface PerformanceTrend {
  providerId: string;
  metric: 'responseTime' | 'successRate' | 'quality' | 'cost';
  direction: 'improving' | 'stable' | 'declining';
  changePercentage: number;
  confidence: number;
  timeframe: string;
  dataPoints: Array<{ timestamp: Date; value: number }>;
}

interface PredictionModel {
  providerId: string;
  predictions: {
    nextHourFailureRate: number;
    nextDayAverageResponseTime: number;
    expectedQualityScore: number;
    recommendedLoadDistribution: number;
  };
  confidence: number;
  lastTrainingTime: Date;
  trainingDataSize: number;
}

/**
 * Performance Metrics Collector
 */
class MetricsCollector {
  private db: admin.firestore.Firestore;
  private metricsBuffer: Map<string, MetricsSnapshot[]> = new Map();
  private bufferFlushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.db = admin.firestore();
    this.startBufferFlushing();
  }

  async recordMetric(snapshot: MetricsSnapshot): Promise<void> {
    const providerId = snapshot.providerId;
    
    // Add to buffer
    if (!this.metricsBuffer.has(providerId)) {
      this.metricsBuffer.set(providerId, []);
    }
    
    const buffer = this.metricsBuffer.get(providerId)!;
    buffer.push(snapshot);
    
    // Flush buffer if it's full
    if (buffer.length >= this.BUFFER_SIZE) {
      await this.flushBuffer(providerId);
    }
  }

  private async flushBuffer(providerId: string): Promise<void> {
    const buffer = this.metricsBuffer.get(providerId);
    if (!buffer || buffer.length === 0) return;

    try {
      const batch = this.db.batch();
      const collection = this.db.collection('provider_metrics');

      buffer.forEach(snapshot => {
        const docRef = collection.doc();
        batch.set(docRef, {
          ...snapshot,
          timestamp: admin.firestore.Timestamp.fromDate(snapshot.timestamp)
        });
      });

      await batch.commit();
      
      // Clear buffer
      this.metricsBuffer.set(providerId, []);
      
      
    } catch (error) {
      // Keep buffer for retry
    }
  }

  private startBufferFlushing(): void {
    this.bufferFlushInterval = setInterval(async () => {
      const providerIds = Array.from(this.metricsBuffer.keys());
      
      for (const providerId of providerIds) {
        await this.flushBuffer(providerId);
      }
    }, this.FLUSH_INTERVAL);
  }

  cleanup(): void {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
      this.bufferFlushInterval = null;
    }

    // Flush all remaining buffers
    const providerIds = Array.from(this.metricsBuffer.keys());
    providerIds.forEach(providerId => {
      this.flushBuffer(providerId).catch(error => {
      });
    });
  }
}

/**
 * Trend Analyzer for performance prediction
 */
class TrendAnalyzer {
  private db: admin.firestore.Firestore;

  constructor() {
    this.db = admin.firestore();
  }

  async analyzeTrends(
    providerId: string,
    metric: 'responseTime' | 'successRate' | 'quality' | 'cost',
    timeframe: '24h' | '7d' | '30d' = '24h'
  ): Promise<PerformanceTrend> {
    try {
      const cutoffDate = this.getCutoffDate(timeframe);
      
      const snapshot = await this.db.collection('provider_metrics')
        .where('providerId', '==', providerId)
        .where('timestamp', '>=', cutoffDate)
        .orderBy('timestamp', 'asc')
        .get();

      const dataPoints = this.extractDataPoints(snapshot.docs, metric);
      
      if (dataPoints.length < 2) {
        return {
          providerId,
          metric,
          direction: 'stable',
          changePercentage: 0,
          confidence: 0,
          timeframe,
          dataPoints
        };
      }

      const trend = this.calculateTrend(dataPoints);
      
      return {
        providerId,
        metric,
        direction: trend.direction,
        changePercentage: trend.changePercentage,
        confidence: trend.confidence,
        timeframe,
        dataPoints
      };

    } catch (error) {
      throw error;
    }
  }

  private getCutoffDate(timeframe: string): Date {
    const now = new Date();
    const hours = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720;
    return new Date(now.getTime() - (hours * 60 * 60 * 1000));
  }

  private extractDataPoints(
    docs: admin.firestore.QueryDocumentSnapshot[], 
    metric: string
  ): Array<{ timestamp: Date; value: number }> {
    const hourlyBuckets = new Map<string, { sum: number; count: number; timestamp: Date }>();

    docs.forEach(doc => {
      const data = doc.data();
      const timestamp = data.timestamp.toDate();
      const hourKey = timestamp.toISOString().slice(0, 13); // Group by hour

      let value: number;
      switch (metric) {
        case 'responseTime':
          value = data.responseTime;
          break;
        case 'successRate':
          value = data.success ? 1 : 0;
          break;
        case 'quality':
          value = data.videoQuality || 0;
          break;
        case 'cost':
          value = data.cost || 0;
          break;
        default:
          value = 0;
      }

      if (!hourlyBuckets.has(hourKey)) {
        hourlyBuckets.set(hourKey, { sum: 0, count: 0, timestamp });
      }

      const bucket = hourlyBuckets.get(hourKey)!;
      bucket.sum += value;
      bucket.count += 1;
    });

    return Array.from(hourlyBuckets.values()).map(bucket => ({
      timestamp: bucket.timestamp,
      value: bucket.count > 0 ? bucket.sum / bucket.count : 0
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private calculateTrend(dataPoints: Array<{ timestamp: Date; value: number }>): {
    direction: 'improving' | 'stable' | 'declining';
    changePercentage: number;
    confidence: number;
  } {
    if (dataPoints.length < 2) {
      return { direction: 'stable', changePercentage: 0, confidence: 0 };
    }

    // Simple linear regression
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, point, index) => sum + index, 0);
    const sumY = dataPoints.reduce((sum, point) => sum + point.value, 0);
    const sumXY = dataPoints.reduce((sum, point, index) => sum + (index * point.value), 0);
    const sumXX = dataPoints.reduce((sum, point, index) => sum + (index * index), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgY = sumY / n;
    
    // Calculate R-squared for confidence
    const yPredicted = dataPoints.map((_, index) => (sumY / n) + slope * (index - (sumX / n)));
    const ssRes = dataPoints.reduce((sum, point, index) => {
      const residual = point.value - yPredicted[index];
      return sum + (residual * residual);
    }, 0);
    const ssTot = dataPoints.reduce((sum, point) => {
      const deviation = point.value - avgY;
      return sum + (deviation * deviation);
    }, 0);
    
    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
    const confidence = Math.max(0, Math.min(1, rSquared));

    // Determine direction and percentage change
    const firstValue = dataPoints[0].value;
    const lastValue = dataPoints[dataPoints.length - 1].value;
    const changePercentage = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

    let direction: 'improving' | 'stable' | 'declining';
    if (Math.abs(changePercentage) < 5) { // Less than 5% change
      direction = 'stable';
    } else if (changePercentage > 0) {
      direction = 'improving';
    } else {
      direction = 'declining';
    }

    return {
      direction,
      changePercentage: Math.round(changePercentage * 100) / 100,
      confidence: Math.round(confidence * 100) / 100
    };
  }
}

/**
 * Predictive Analytics Engine
 */
class PredictiveAnalytics {
  private db: admin.firestore.Firestore;

  constructor() {
    this.db = admin.firestore();
  }

  async generatePredictions(providerId: string): Promise<PredictionModel> {
    try {
      // Get recent performance data
      const cutoffDate = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)); // 7 days
      
      const snapshot = await this.db.collection('provider_metrics')
        .where('providerId', '==', providerId)
        .where('timestamp', '>=', cutoffDate)
        .get();

      const metrics = snapshot.docs.map(doc => doc.data());
      
      if (metrics.length < 10) {
        // Not enough data for predictions
        return {
          providerId,
          predictions: {
            nextHourFailureRate: 0,
            nextDayAverageResponseTime: 60000, // Default 60 seconds
            expectedQualityScore: 8.0, // Default quality
            recommendedLoadDistribution: 0.25 // 25% load
          },
          confidence: 0,
          lastTrainingTime: new Date(),
          trainingDataSize: 0
        };
      }

      const predictions = {
        nextHourFailureRate: this.predictFailureRate(metrics),
        nextDayAverageResponseTime: this.predictResponseTime(metrics),
        expectedQualityScore: this.predictQualityScore(metrics),
        recommendedLoadDistribution: this.calculateOptimalLoad(metrics)
      };

      const confidence = Math.min(1, metrics.length / 100); // Higher confidence with more data

      return {
        providerId,
        predictions,
        confidence,
        lastTrainingTime: new Date(),
        trainingDataSize: metrics.length
      };

    } catch (error) {
      throw error;
    }
  }

  private predictFailureRate(metrics: any[]): number {
    const recentMetrics = metrics.slice(-24); // Last 24 data points
    const failures = recentMetrics.filter(m => !m.success).length;
    return recentMetrics.length > 0 ? failures / recentMetrics.length : 0;
  }

  private predictResponseTime(metrics: any[]): number {
    const recentTimes = metrics
      .filter(m => m.responseTime && m.responseTime > 0)
      .map(m => m.responseTime)
      .slice(-50); // Last 50 response times

    if (recentTimes.length === 0) return 60000;

    // Calculate weighted average (more recent = higher weight)
    let weightedSum = 0;
    let totalWeight = 0;
    
    recentTimes.forEach((time, index) => {
      const weight = index + 1; // Linear weighting
      weightedSum += time * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 60000;
  }

  private predictQualityScore(metrics: any[]): number {
    const qualityScores = metrics
      .filter(m => m.videoQuality && m.videoQuality > 0)
      .map(m => m.videoQuality)
      .slice(-30); // Last 30 quality scores

    if (qualityScores.length === 0) return 8.0;

    return qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
  }

  private calculateOptimalLoad(metrics: any[]): number {
    const successRate = this.predictFailureRate(metrics);
    const avgResponseTime = this.predictResponseTime(metrics);
    const qualityScore = this.predictQualityScore(metrics);

    // Calculate load recommendation based on performance indicators
    let loadScore = 0.5; // Start with 50%

    // Adjust based on success rate
    if (successRate < 0.05) loadScore += 0.3; // Very reliable
    else if (successRate < 0.1) loadScore += 0.2; // Reliable
    else if (successRate > 0.2) loadScore -= 0.3; // Unreliable

    // Adjust based on response time
    if (avgResponseTime < 30000) loadScore += 0.2; // Fast
    else if (avgResponseTime > 90000) loadScore -= 0.2; // Slow

    // Adjust based on quality
    if (qualityScore > 9.0) loadScore += 0.1; // High quality
    else if (qualityScore < 7.0) loadScore -= 0.1; // Low quality

    return Math.max(0, Math.min(1, loadScore));
  }
}

/**
 * Provider Performance Tracker Service
 */
export class ProviderPerformanceTracker {
  private metricsCollector: MetricsCollector;
  private trendAnalyzer: TrendAnalyzer;
  private predictiveAnalytics: PredictiveAnalytics;
  private db: admin.firestore.Firestore;

  constructor() {
    this.metricsCollector = new MetricsCollector();
    this.trendAnalyzer = new TrendAnalyzer();
    this.predictiveAnalytics = new PredictiveAnalytics();
    this.db = admin.firestore();
  }

  /**
   * Track a video generation operation
   */
  async trackVideoGeneration(
    providerId: string,
    options: VideoGenerationOptions,
    result: VideoGenerationResult,
    responseTime: number,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      const snapshot: MetricsSnapshot = {
        providerId,
        timestamp: new Date(),
        operationType: 'generation',
        success,
        responseTime,
        videoQuality: await this.estimateVideoQuality(result),
        cost: await this.estimateCost(providerId, options),
        errorType: error,
        metadata: {
          duration: this.getDurationInSeconds(options.duration),
          resolution: result.metadata?.resolution || '1920x1080',
          format: result.metadata?.format || 'mp4',
          features: this.extractFeatures(options)
        }
      };

      await this.metricsCollector.recordMetric(snapshot);

    } catch (error) {
    }
  }

  /**
   * Track a status check operation
   */
  async trackStatusCheck(
    providerId: string,
    jobId: string,
    responseTime: number,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      const snapshot: MetricsSnapshot = {
        providerId,
        timestamp: new Date(),
        operationType: 'status_check',
        success,
        responseTime,
        errorType: error,
        metadata: {
          duration: 0,
          resolution: '',
          format: '',
          features: []
        }
      };

      await this.metricsCollector.recordMetric(snapshot);

    } catch (error) {
    }
  }

  /**
   * Get aggregated performance metrics
   */
  async getPerformanceMetrics(
    providerId: string,
    period: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<ProviderPerformanceMetrics> {
    try {
      const cutoffDate = this.getCutoffDate(period);
      
      const snapshot = await this.db.collection('provider_metrics')
        .where('providerId', '==', providerId)
        .where('timestamp', '>=', cutoffDate)
        .get();

      const metrics = snapshot.docs.map(doc => doc.data());
      
      if (metrics.length === 0) {
        return this.getDefaultMetrics(providerId, period);
      }

      const aggregated = await this.aggregateMetrics(metrics);
      
      return {
        providerId,
        period,
        metrics: {
          successRate: aggregated.successRate,
          averageGenerationTime: aggregated.averageResponseTime,
          averageVideoQuality: aggregated.averageVideoQuality,
          userSatisfactionScore: aggregated.averageUserSatisfaction,
          costEfficiency: aggregated.averageCost > 0 ? aggregated.averageVideoQuality / aggregated.averageCost : 0,
          uptimePercentage: aggregated.uptimePercentage
        },
        lastUpdated: new Date()
      };

    } catch (error) {
      return this.getDefaultMetrics(providerId, period);
    }
  }

  /**
   * Get performance trends
   */
  async getPerformanceTrends(
    providerId: string,
    timeframe: '24h' | '7d' | '30d' = '24h'
  ): Promise<PerformanceTrend[]> {
    try {
      const trends = await Promise.all([
        this.trendAnalyzer.analyzeTrends(providerId, 'responseTime', timeframe),
        this.trendAnalyzer.analyzeTrends(providerId, 'successRate', timeframe),
        this.trendAnalyzer.analyzeTrends(providerId, 'quality', timeframe),
        this.trendAnalyzer.analyzeTrends(providerId, 'cost', timeframe)
      ]);

      return trends;

    } catch (error) {
      return [];
    }
  }

  /**
   * Get predictive analytics
   */
  async getPredictions(providerId: string): Promise<PredictionModel> {
    try {
      return await this.predictiveAnalytics.generatePredictions(providerId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get comprehensive performance dashboard data
   */
  async getDashboardData(providerId?: string): Promise<any> {
    try {
      if (providerId) {
        const [metrics, trends, predictions] = await Promise.all([
          this.getPerformanceMetrics(providerId, '24h'),
          this.getPerformanceTrends(providerId, '24h'),
          this.getPredictions(providerId)
        ]);

        return {
          providerId,
          metrics,
          trends,
          predictions,
          generatedAt: new Date()
        };
      }

      // Get data for all providers
      const providerIds = await this.getAllProviderIds();
      const dashboardData = await Promise.all(
        providerIds.map(async id => {
          const [metrics, trends] = await Promise.all([
            this.getPerformanceMetrics(id, '24h'),
            this.getPerformanceTrends(id, '24h')
          ]);
          return { providerId: id, metrics, trends };
        })
      );

      return {
        providers: dashboardData,
        generatedAt: new Date()
      };

    } catch (error) {
      throw error;
    }
  }

  private async estimateVideoQuality(result: VideoGenerationResult): Promise<number> {
    // This would integrate with a video quality assessment service
    // For now, return a base score that can be updated when user feedback is received
    if (result.status === 'completed' && result.videoUrl) {
      return 8.0; // Default quality score
    }
    return 0;
  }

  private async estimateCost(providerId: string, options: VideoGenerationOptions): Promise<number> {
    // This would calculate actual cost based on provider pricing
    // For now, return estimated costs
    const baseCost = 0.50;
    const durationMultiplier = options.duration === 'long' ? 1.5 : options.duration === 'short' ? 0.8 : 1.0;
    return baseCost * durationMultiplier;
  }

  private getDurationInSeconds(duration?: string): number {
    switch (duration) {
      case 'short': return 30;
      case 'long': return 90;
      case 'medium':
      default: return 60;
    }
  }

  private extractFeatures(options: VideoGenerationOptions): string[] {
    const features: string[] = [];
    if (options.includeSubtitles) features.push('subtitles');
    if (options.customAvatarId) features.push('customAvatar');
    if (options.customVoiceId) features.push('voiceCloning');
    if (options.emotion && options.emotion !== 'neutral') features.push('emotionControl');
    return features;
  }

  private getCutoffDate(period: string): Date {
    const now = new Date();
    const hours = period === '1h' ? 1 : period === '24h' ? 24 : period === '7d' ? 168 : 720;
    return new Date(now.getTime() - (hours * 60 * 60 * 1000));
  }

  private async aggregateMetrics(metrics: any[]): Promise<AggregatedMetrics> {
    const total = metrics.length;
    const successful = metrics.filter(m => m.success).length;
    const responseTimes = metrics.filter(m => m.responseTime > 0).map(m => m.responseTime);
    const qualityScores = metrics.filter(m => m.videoQuality > 0).map(m => m.videoQuality);
    const costs = metrics.filter(m => m.cost > 0).map(m => m.cost);

    const averageResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;
    
    const averageVideoQuality = qualityScores.length > 0 ? 
      qualityScores.reduce((sum, quality) => sum + quality, 0) / qualityScores.length : 0;
    
    const totalCost = costs.reduce((sum, cost) => sum + cost, 0);
    const averageCost = costs.length > 0 ? totalCost / costs.length : 0;

    return {
      providerId: '',
      period: '24h',
      startTime: new Date(),
      endTime: new Date(),
      totalOperations: total,
      successfulOperations: successful,
      failedOperations: total - successful,
      successRate: total > 0 ? successful / total : 0,
      averageResponseTime,
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99),
      averageVideoQuality,
      averageUserSatisfaction: 4.0, // Would come from user feedback
      totalCost,
      averageCost,
      errorBreakdown: this.calculateErrorBreakdown(metrics),
      uptimePercentage: total > 0 ? (successful / total) * 100 : 100,
      trendDirection: 'stable',
      lastUpdated: new Date()
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateErrorBreakdown(metrics: any[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    metrics.filter(m => !m.success && m.errorType).forEach(m => {
      breakdown[m.errorType] = (breakdown[m.errorType] || 0) + 1;
    });
    
    return breakdown;
  }

  private getDefaultMetrics(providerId: string, period: string): ProviderPerformanceMetrics {
    return {
      providerId,
      period: period as any,
      metrics: {
        successRate: 95,
        averageGenerationTime: 60,
        averageVideoQuality: 8.0,
        userSatisfactionScore: 4.0,
        costEfficiency: 10,
        uptimePercentage: 99
      },
      lastUpdated: new Date()
    };
  }

  private async getAllProviderIds(): Promise<string[]> {
    try {
      const snapshot = await this.db.collection('provider_metrics')
        .select('providerId')
        .get();

      const providerIds = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.providerId) {
          providerIds.add(data.providerId);
        }
      });

      return Array.from(providerIds);

    } catch (error) {
      return [];
    }
  }

  /**
   * Cleanup method for proper service shutdown
   */
  cleanup(): void {
    this.metricsCollector.cleanup();
  }
}

// Export singleton instance
export const providerPerformanceTracker = new ProviderPerformanceTracker();