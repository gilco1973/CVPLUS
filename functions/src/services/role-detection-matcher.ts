/**
 * Role Detection Matcher
 * 
 * Handles matching logic between CV features and role profiles
 */

import { ParsedCV } from '../types/job';
import {
  RoleProfile,
  RoleMatchResult,
  RoleDetectionConfig,
  MatchingFactor,
  ExperienceLevel
} from '../types/role-profile.types';
import { FuzzyMatchingService } from './role-detection-fuzzy.service';
import { RoleDetectionAnalyzer } from './role-detection-analyzer';
import {
  FuzzyMatchConfig,
  getCVFullText,
  calculateSeniorityAdjustment
} from './role-detection-helpers';
import { checkNegativeIndicators } from './role-detection-maps';

export class RoleDetectionMatcher {
  private config: RoleDetectionConfig;
  private fuzzyConfig: FuzzyMatchConfig;
  private fuzzyMatcher: FuzzyMatchingService;
  private analyzer: RoleDetectionAnalyzer;
  private negativeIndicators: Map<string, string[]>;
  private seniorityKeywords: Map<ExperienceLevel, string[]>;

  constructor(
    config: RoleDetectionConfig,
    fuzzyConfig: FuzzyMatchConfig,
    fuzzyMatcher: FuzzyMatchingService,
    analyzer: RoleDetectionAnalyzer,
    negativeIndicators: Map<string, string[]>,
    seniorityKeywords: Map<ExperienceLevel, string[]>
  ) {
    this.config = config;
    this.fuzzyConfig = fuzzyConfig;
    this.fuzzyMatcher = fuzzyMatcher;
    this.analyzer = analyzer;
    this.negativeIndicators = negativeIndicators;
    this.seniorityKeywords = seniorityKeywords;
  }

  /**
   * Calculate enhanced role match with fuzzy matching
   */
  async calculateEnhancedRoleMatch(
    profile: RoleProfile,
    cvFeatures: any, // Using any to avoid circular dependency
    parsedCV: ParsedCV
  ): Promise<RoleMatchResult> {
    const cvText = getCVFullText(parsedCV);
    
    // Build matching factors for all criteria
    const factors = this.buildMatchingFactors(profile, cvFeatures);
    const matchingFactors = factors.map(factor => {
      const result = this.fuzzyMatcher.matchKeywords(
        factor.cv,
        factor.profile,
        this.fuzzyConfig.threshold
      );
      return {
        type: factor.type,
        matchedKeywords: result.matches,
        weight: this.config.weightingFactors[factor.type],
        score: result.score,
        details: `${result.matches.length}/${factor.profile.length} matched (fuzzy: ${this.fuzzyConfig.threshold * 100}%)`
      };
    });

    // Calculate adjusted confidence
    let confidence = this.analyzer.calculateWeightedConfidence(matchingFactors);
    confidence *= calculateSeniorityAdjustment(profile.experienceLevel, cvFeatures.seniorityIndicators);
    confidence *= checkNegativeIndicators(profile.name, cvText, this.negativeIndicators);

    // Generate recommendations and potential
    const [recommendations, enhancementPotential] = await Promise.all([
      this.analyzer.generateRoleRecommendations(profile, parsedCV, matchingFactors),
      Promise.resolve(this.analyzer.calculateEnhancementPotential(profile, parsedCV, matchingFactors))
    ]);

    return {
      roleId: profile.id,
      roleName: profile.name,
      confidence,
      matchingFactors,
      enhancementPotential,
      recommendations
    };
  }

  /**
   * Build matching factors for profile criteria
   */
  private buildMatchingFactors(
    profile: RoleProfile,
    cvFeatures: any
  ) {
    const factors: Array<{
      type: MatchingFactor['type'];
      cv: string[];
      profile: string[];
    }> = [
      { type: 'title', cv: cvFeatures.titleKeywords, profile: profile.matchingCriteria.titleKeywords },
      { type: 'skills', cv: cvFeatures.skillKeywords, profile: profile.matchingCriteria.skillKeywords },
      { type: 'experience', cv: cvFeatures.experienceKeywords, profile: profile.matchingCriteria.experienceKeywords },
      { type: 'industry', cv: cvFeatures.industryKeywords, profile: profile.matchingCriteria.industryKeywords }
    ];

    if (profile.matchingCriteria.educationKeywords) {
      factors.push({
        type: 'education',
        cv: cvFeatures.educationKeywords,
        profile: profile.matchingCriteria.educationKeywords
      });
    }

    return factors;
  }

  /**
   * Get seniority keywords for external use
   */
  getSeniorityKeywords(): Map<ExperienceLevel, string[]> {
    return this.seniorityKeywords;
  }

  /**
   * Update configuration
   */
  updateConfig(config: RoleDetectionConfig): void {
    this.config = config;
  }
}