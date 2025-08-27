/**
 * Enhanced Provider Selection Engine
 * 
 * AI-driven provider selection system with intelligent scoring,
 * performance tracking, and cost optimization for video generation.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import {
  VideoGenerationProvider,
  ProviderSelectionCriteria,
  ProviderSelectionResult,
  VideoRequirements,
  ProviderPerformanceMetrics,
  ProviderHealthStatus,
  VideoProviderError,
  VideoProviderErrorType
} from './video-providers/base-provider.interface';
import * as admin from 'firebase-admin';

interface ProviderScore {
  provider: VideoGenerationProvider;
  score: number;
  cost: number;
  estimatedTime: number;
  reliability: number;
  qualityScore: number;
  breakdown: ScoreBreakdown;
}

interface ScoreBreakdown {
  baseScore: number;
  healthScore: number;
  performanceScore: number;
  costScore: number;
  reliabilityScore: number;
  contextScore: number;
  businessRuleScore: number;
}

interface BusinessRules {
  costOptimization: boolean;
  qualityGuarantee: boolean;
  speedRequirement: 'low' | 'normal' | 'high' | 'critical';
  userTier: 'free' | 'premium' | 'enterprise';
  allowFallback: boolean;
  maxCostThreshold?: number;
  minQualityThreshold?: number;
}

interface SelectionContext {
  userTier: 'free' | 'premium' | 'enterprise';
  currentLoad: number;
  timeOfDay: number;
  isRetry: boolean;
  previousFailures: string[];
  urgency: 'low' | 'normal' | 'high';
  sessionHistory: ProviderUsageHistory[];
}

interface ProviderUsageHistory {
  providerId: string;
  timestamp: Date;
  success: boolean;
  duration: number;
  cost: number;
  qualityScore?: number;
}

/**
 * AI-Driven Provider Selection Algorithm
 */
class AIProviderScorer {
  private metricsCache: Map<string, { metrics: ProviderPerformanceMetrics; timestamp: Date }> = new Map();
  private healthCache: Map<string, { health: ProviderHealthStatus; timestamp: Date }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache TTL

  async scoreProviders(
    providers: VideoGenerationProvider[],
    criteria: ProviderSelectionCriteria,
    businessRules: BusinessRules
  ): Promise<ProviderScore[]> {
    const scoredProviders = await Promise.all(
      providers.map(provider => this.scoreProvider(provider, criteria, businessRules))
    );

    // Sort by total score (highest first)
    return scoredProviders.sort((a, b) => b.score - a.score);
  }

  private async scoreProvider(
    provider: VideoGenerationProvider,
    criteria: ProviderSelectionCriteria,
    businessRules: BusinessRules
  ): Promise<ProviderScore> {
    // Get cached or fresh metrics
    const [health, metrics] = await Promise.all([
      this.getCachedHealth(provider),
      this.getCachedMetrics(provider, '24h')
    ]);

    const cost = await provider.getEstimatedCost({
      duration: this.getDurationLabel(criteria.requirements.duration),
      style: 'professional'
    });

    // Calculate individual score components
    const breakdown: ScoreBreakdown = {
      baseScore: this.calculateBaseScore(provider),
      healthScore: this.calculateHealthScore(health),
      performanceScore: this.calculatePerformanceScore(metrics),
      costScore: this.calculateCostScore(cost, businessRules),
      reliabilityScore: this.calculateReliabilityScore(provider, criteria.context),
      contextScore: this.calculateContextScore(provider, criteria.context),
      businessRuleScore: this.calculateBusinessRuleScore(provider, businessRules)
    };

    // Weighted total score calculation
    const weights = this.getScoreWeights(criteria.preferences, businessRules);
    const totalScore = this.calculateWeightedScore(breakdown, weights);

    return {
      provider,
      score: Math.max(0, Math.min(100, totalScore)),
      cost,
      estimatedTime: metrics.metrics.averageGenerationTime,
      reliability: breakdown.reliabilityScore,
      qualityScore: metrics.metrics.averageVideoQuality,
      breakdown
    };
  }

  private calculateBaseScore(provider: VideoGenerationProvider): number {
    // Base score inversely related to priority (1 = highest priority = highest score)
    return (6 - provider.priority) * 15; // Max 75 points for priority 1
  }

  private calculateHealthScore(health: ProviderHealthStatus): number {
    if (!health.isHealthy) return 0;
    
    let score = 30; // Base health score
    score += (health.uptime - 95) * 0.5; // Bonus for high uptime
    score -= health.errorRate * 0.3; // Penalty for errors
    score -= Math.max(0, (health.responseTime - 1000) * 0.01); // Penalty for slow response
    
    return Math.max(0, Math.min(30, score));
  }

  private calculatePerformanceScore(metrics: ProviderPerformanceMetrics): number {
    const { successRate, averageGenerationTime, averageVideoQuality, userSatisfactionScore } = metrics.metrics;
    
    let score = 0;
    score += successRate * 0.2; // Max 20 points
    score += Math.max(0, (120 - averageGenerationTime) * 0.1); // Max 12 points for sub-2min generation
    score += averageVideoQuality * 1.5; // Max 15 points for quality 10
    score += userSatisfactionScore * 3; // Max 15 points for satisfaction 5
    
    return Math.max(0, Math.min(25, score));
  }

  private calculateCostScore(cost: number, businessRules: BusinessRules): number {
    if (!businessRules.costOptimization) return 10; // Neutral score if cost not prioritized
    
    // Inverse relationship: lower cost = higher score
    const maxCost = businessRules.maxCostThreshold || 2.0;
    const score = Math.max(0, (maxCost - cost) / maxCost * 15);
    
    return Math.min(15, score);
  }

  private calculateReliabilityScore(provider: VideoGenerationProvider, context: ProviderSelectionCriteria['context']): number {
    let score = 10; // Base reliability score
    
    // Penalty for recent failures
    const recentFailures = context.previousFailures.filter(id => id === provider.name).length;
    score -= recentFailures * 5;
    
    // Bonus for consistent performance in user's history (if available)
    // Note: sessionHistory not available in ProviderSelectionCriteria context
    // This would require a separate method or extended context type
    
    return Math.max(0, Math.min(15, score));
  }

  private calculateContextScore(provider: VideoGenerationProvider, context: ProviderSelectionCriteria['context']): number {
    let score = 5; // Base context score
    
    // Time-based scoring (some providers perform better at certain times)
    if (context.timeOfDay >= 9 && context.timeOfDay <= 17) {
      // Business hours - premium providers may have better support
      if (provider.priority <= 2) score += 2;
    }
    
    // Load-based scoring
    if (context.currentLoad > 80) {
      // High load - prefer faster providers
      if (provider.capabilities.realTimeGeneration) score += 3;
    }
    
    // User tier matching
    if (context.userTier === 'enterprise' && provider.capabilities.voiceCloning) {
      score += 2;
    }
    
    return Math.max(0, Math.min(10, score));
  }

  private calculateBusinessRuleScore(provider: VideoGenerationProvider, businessRules: BusinessRules): number {
    let score = 5; // Base business rule score
    
    // Quality guarantee requirements
    if (businessRules.qualityGuarantee && provider.capabilities.voiceCloning) {
      score += 3;
    }
    
    // Speed requirements
    if (businessRules.speedRequirement === 'critical' && provider.capabilities.realTimeGeneration) {
      score += 4;
    } else if (businessRules.speedRequirement === 'high' && provider.priority <= 2) {
      score += 2;
    }
    
    // User tier considerations
    if (businessRules.userTier === 'enterprise') {
      if (provider.capabilities.customAvatars && provider.capabilities.voiceCloning) {
        score += 3;
      }
    }
    
    return Math.max(0, Math.min(10, score));
  }

  private getScoreWeights(
    preferences: any,
    businessRules: BusinessRules
  ): Record<keyof ScoreBreakdown, number> {
    const defaultWeights = {
      baseScore: 0.2,
      healthScore: 0.25,
      performanceScore: 0.2,
      costScore: 0.1,
      reliabilityScore: 0.15,
      contextScore: 0.05,
      businessRuleScore: 0.05
    };

    // Adjust weights based on preferences
    if (preferences.prioritizeSpeed) {
      defaultWeights.performanceScore += 0.1;
      defaultWeights.healthScore += 0.05;
      defaultWeights.baseScore -= 0.1;
      defaultWeights.costScore -= 0.05;
    }

    if (preferences.prioritizeQuality) {
      defaultWeights.performanceScore += 0.15;
      defaultWeights.reliabilityScore += 0.1;
      defaultWeights.costScore -= 0.15;
      defaultWeights.contextScore -= 0.1;
    }

    if (preferences.prioritizeCost || businessRules.costOptimization) {
      defaultWeights.costScore += 0.2;
      defaultWeights.performanceScore -= 0.1;
      defaultWeights.baseScore -= 0.1;
    }

    return defaultWeights;
  }

  private calculateWeightedScore(breakdown: ScoreBreakdown, weights: Record<keyof ScoreBreakdown, number>): number {
    return Object.entries(breakdown).reduce((total, [key, value]) => {
      return total + (value * weights[key as keyof ScoreBreakdown]);
    }, 0);
  }

  private async getCachedHealth(provider: VideoGenerationProvider): Promise<ProviderHealthStatus> {
    const cached = this.healthCache.get(provider.name);
    if (cached && (Date.now() - cached.timestamp.getTime()) < this.CACHE_TTL) {
      return cached.health;
    }

    const health = await provider.getHealthStatus();
    this.healthCache.set(provider.name, { health, timestamp: new Date() });
    return health;
  }

  private async getCachedMetrics(provider: VideoGenerationProvider, period: '1h' | '24h' | '7d' | '30d'): Promise<ProviderPerformanceMetrics> {
    const cacheKey = `${provider.name}-${period}`;
    const cached = this.metricsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp.getTime()) < this.CACHE_TTL) {
      return cached.metrics;
    }

    const metrics = await provider.getPerformanceMetrics(period);
    this.metricsCache.set(cacheKey, { metrics, timestamp: new Date() });
    return metrics;
  }

  private getDurationLabel(duration: number): 'short' | 'medium' | 'long' {
    if (duration <= 30) return 'short';
    if (duration <= 90) return 'medium';
    return 'long';
  }
}

/**
 * Enhanced Provider Selection Engine
 */
export class ProviderSelectionEngine {
  private providers: Map<string, VideoGenerationProvider> = new Map();
  private aiScorer: AIProviderScorer;
  private db: admin.firestore.Firestore;

  constructor() {
    this.aiScorer = new AIProviderScorer();
    this.db = admin.firestore();
  }

  registerProvider(provider: VideoGenerationProvider): void {
    this.providers.set(provider.name, provider);
    console.log(`[Provider Selection Engine] Registered provider: ${provider.name} (priority: ${provider.priority})`);
  }

  async selectOptimalProvider(
    criteria: ProviderSelectionCriteria,
    businessRules?: Partial<BusinessRules>
  ): Promise<ProviderSelectionResult> {
    try {
      // Build complete business rules with defaults
      const completeBusinessRules: BusinessRules = {
        costOptimization: businessRules?.costOptimization || false,
        qualityGuarantee: businessRules?.qualityGuarantee || false,
        speedRequirement: businessRules?.speedRequirement || 'normal',
        userTier: criteria.context.userTier,
        allowFallback: businessRules?.allowFallback !== false,
        maxCostThreshold: businessRules?.maxCostThreshold || 2.0,
        minQualityThreshold: businessRules?.minQualityThreshold || 7.0
      };

      // Get available providers that can handle requirements
      const availableProviders = this.getCapableProviders(criteria.requirements, criteria.context);
      
      if (availableProviders.length === 0) {
        throw new VideoProviderError(
          VideoProviderErrorType.PROVIDER_UNAVAILABLE,
          'No providers available to handle the specified requirements',
          'selection_engine'
        );
      }

      // Score providers using AI algorithm
      const scoredProviders = await this.aiScorer.scoreProviders(
        availableProviders,
        criteria,
        completeBusinessRules
      );

      // Apply business rule filters
      const filteredProviders = this.applyBusinessRuleFilters(scoredProviders, completeBusinessRules);

      if (filteredProviders.length === 0) {
        throw new VideoProviderError(
          VideoProviderErrorType.UNSUPPORTED_FEATURE,
          'No providers meet the business rule requirements',
          'selection_engine'
        );
      }

      // Select primary and fallback providers
      const selectedProvider = filteredProviders[0];
      const fallbackProviders = filteredProviders.slice(1).map(sp => sp.provider);

      // Build reasoning explanation
      const reasoning = this.buildSelectionReasoning(selectedProvider, criteria, completeBusinessRules);

      // Store selection decision for analytics
      await this.logSelectionDecision(selectedProvider, criteria, filteredProviders);

      return {
        selectedProvider: selectedProvider.provider,
        fallbackProviders,
        selectionScore: selectedProvider.score,
        reasoning,
        estimatedCost: selectedProvider.cost,
        estimatedTime: selectedProvider.estimatedTime
      };

    } catch (error: any) {
      console.error('[Provider Selection Engine] Selection failed:', error);
      
      if (error instanceof VideoProviderError) {
        throw error;
      }
      
      throw new VideoProviderError(
        VideoProviderErrorType.PROCESSING_ERROR,
        `Provider selection failed: ${error.message}`,
        'selection_engine',
        true,
        error
      );
    }
  }

  private getCapableProviders(
    requirements: VideoRequirements,
    context: ProviderSelectionCriteria['context']
  ): VideoGenerationProvider[] {
    const availableProviders = Array.from(this.providers.values());
    
    return availableProviders.filter(provider => {
      // Skip providers that failed recently
      if (context.previousFailures?.includes(provider.name)) {
        console.log(`[Provider Selection Engine] Skipping ${provider.name} due to recent failure`);
        return false;
      }
      
      // Check if provider can handle requirements
      if (!provider.canHandle(requirements)) {
        console.log(`[Provider Selection Engine] ${provider.name} cannot handle requirements`);
        return false;
      }
      
      return true;
    });
  }

  private applyBusinessRuleFilters(
    scoredProviders: ProviderScore[],
    businessRules: BusinessRules
  ): ProviderScore[] {
    return scoredProviders.filter(scored => {
      // Cost threshold filter
      if (businessRules.maxCostThreshold && scored.cost > businessRules.maxCostThreshold) {
        console.log(`[Provider Selection Engine] ${scored.provider.name} exceeds cost threshold: $${scored.cost}`);
        return false;
      }
      
      // Quality threshold filter
      if (businessRules.minQualityThreshold && scored.qualityScore < businessRules.minQualityThreshold) {
        console.log(`[Provider Selection Engine] ${scored.provider.name} below quality threshold: ${scored.qualityScore}`);
        return false;
      }
      
      // Speed requirement filter
      if (businessRules.speedRequirement === 'critical' && !scored.provider.capabilities.realTimeGeneration) {
        console.log(`[Provider Selection Engine] ${scored.provider.name} doesn't support real-time generation for critical speed`);
        return false;
      }
      
      return true;
    });
  }

  private buildSelectionReasoning(
    selectedProvider: ProviderScore,
    criteria: ProviderSelectionCriteria,
    businessRules: BusinessRules
  ): string[] {
    const reasoning = [
      `Selected ${selectedProvider.provider.name} with score ${selectedProvider.score.toFixed(1)}/100`,
      `Priority: ${selectedProvider.provider.priority}, Cost: $${selectedProvider.cost.toFixed(2)}, Time: ${selectedProvider.estimatedTime}s`,
      `Quality score: ${selectedProvider.qualityScore.toFixed(1)}/10, Reliability: ${selectedProvider.reliability.toFixed(1)}/15`
    ];

    // Add specific reasoning based on preferences
    if (criteria.preferences.prioritizeSpeed) {
      reasoning.push(`Speed prioritized: Performance score ${selectedProvider.breakdown.performanceScore.toFixed(1)}/25`);
    }
    
    if (criteria.preferences.prioritizeQuality) {
      reasoning.push(`Quality prioritized: Video quality ${selectedProvider.qualityScore.toFixed(1)}/10`);
    }
    
    if (criteria.preferences.prioritizeCost || businessRules.costOptimization) {
      reasoning.push(`Cost optimized: Cost score ${selectedProvider.breakdown.costScore.toFixed(1)}/15`);
    }

    // Add context-specific reasoning
    if (criteria.context.isRetry) {
      reasoning.push('Retry attempt: Selected different provider for reliability');
    }
    
    if (criteria.context.currentLoad > 80) {
      reasoning.push('High system load: Prioritized fast generation capabilities');
    }

    return reasoning;
  }

  private async logSelectionDecision(
    selectedProvider: ProviderScore,
    criteria: ProviderSelectionCriteria,
    allProviders: ProviderScore[]
  ): Promise<void> {
    try {
      const logData = {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        selectedProvider: selectedProvider.provider.name,
        selectionScore: selectedProvider.score,
        cost: selectedProvider.cost,
        estimatedTime: selectedProvider.estimatedTime,
        criteria: {
          requirements: criteria.requirements,
          preferences: criteria.preferences,
          context: {
            userTier: criteria.context.userTier,
            urgency: criteria.context.urgency || 'normal',
            isRetry: criteria.context.isRetry || false
          }
        },
        providerScores: allProviders.map(p => ({
          name: p.provider.name,
          score: p.score,
          cost: p.cost,
          breakdown: p.breakdown
        }))
      };

      await this.db.collection('provider_selection_logs').add(logData);
    } catch (error) {
      console.error('[Provider Selection Engine] Failed to log selection decision:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): VideoGenerationProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): VideoGenerationProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Remove a provider from the registry
   */
  unregisterProvider(name: string): boolean {
    return this.providers.delete(name);
  }

  /**
   * Get provider performance analytics
   */
  async getProviderAnalytics(period: '24h' | '7d' | '30d' = '24h'): Promise<any> {
    try {
      const providers = Array.from(this.providers.values());
      const analytics = await Promise.all(
        providers.map(async provider => {
          const [health, metrics] = await Promise.all([
            provider.getHealthStatus(),
            provider.getPerformanceMetrics(period)
          ]);
          
          return {
            name: provider.name,
            priority: provider.priority,
            health,
            metrics: metrics.metrics,
            capabilities: provider.capabilities
          };
        })
      );
      
      return {
        period,
        providers: analytics,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('[Provider Selection Engine] Failed to get analytics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const providerSelectionEngine = new ProviderSelectionEngine();