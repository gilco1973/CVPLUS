/**
 * Role Detection Service
 * 
 * Intelligent role matching service with fuzzy matching and enhanced accuracy
 */

import { ParsedCV } from '../types/job';
import {
  RoleProfile,
  RoleMatchResult,
  RoleDetectionConfig,
  RoleProfileAnalysis,
  ExperienceLevel
} from '../types/role-profile.types';
import { VerifiedClaudeService } from './verified-claude.service';
import { RoleProfileService } from './role-profile.service';
import { FuzzyMatchingService } from './role-detection-fuzzy.service';
import { RoleDetectionAnalyzer } from './role-detection-analyzer';
import { RoleDetectionMatcher } from './role-detection-matcher';
import { FuzzyMatchConfig } from './role-detection-helpers';
import {
  createSynonymMap,
  createAbbreviationMap,
  createNegativeIndicators,
  createSeniorityKeywords
} from './role-detection-maps';

export class RoleDetectionService {
  private claudeService: VerifiedClaudeService;
  private roleProfileService: RoleProfileService;
  private fuzzyMatcher: FuzzyMatchingService;
  private analyzer: RoleDetectionAnalyzer;
  private matcher: RoleDetectionMatcher;
  private config: RoleDetectionConfig;
  private fuzzyConfig: FuzzyMatchConfig;

  constructor(config?: Partial<RoleDetectionConfig>) {
    this.claudeService = new VerifiedClaudeService();
    this.roleProfileService = new RoleProfileService();
    
    // Enhanced configuration with updated weights
    this.config = {
      confidenceThreshold: 0.5, // Lowered to improve matching rate
      maxResults: 5,
      enableMultiRoleDetection: true,
      weightingFactors: {
        title: 0.40,     // Increased from 0.30
        skills: 0.30,    // Decreased from 0.35
        experience: 0.20, // Decreased from 0.25
        industry: 0.07,   // Decreased from 0.08
        education: 0.03   // Increased from 0.02
      },
      ...config
    };

    // Initialize fuzzy matching configuration
    this.fuzzyConfig = {
      threshold: 0.8,
      enableAbbreviations: true,
      enableSynonyms: true
    };

    // Initialize mappings
    const synonymMap = createSynonymMap();
    const abbreviationMap = createAbbreviationMap();
    const negativeIndicators = createNegativeIndicators();
    const seniorityKeywords = createSeniorityKeywords();

    // Initialize services
    this.fuzzyMatcher = new FuzzyMatchingService(
      this.fuzzyConfig,
      synonymMap,
      abbreviationMap
    );

    this.analyzer = new RoleDetectionAnalyzer(
      this.config,
      this.roleProfileService
    );

    this.matcher = new RoleDetectionMatcher(
      this.config,
      this.fuzzyConfig,
      this.fuzzyMatcher,
      this.analyzer,
      negativeIndicators,
      seniorityKeywords
    );
  }

  /**
   * Analyzes CV and detects the most suitable role profiles
   */
  async detectRoles(parsedCV: ParsedCV): Promise<RoleProfileAnalysis> {
    try {
      const availableProfiles = await this.roleProfileService.getAllProfiles();
      const cvFeatures = this.analyzer.extractEnhancedCVFeatures(
        parsedCV,
        this.matcher.getSeniorityKeywords()
      );

      console.log('[ROLE-DETECTION] Enhanced CV features extracted:', {
        titleKeywords: cvFeatures.titleKeywords.length,
        skillKeywords: cvFeatures.skillKeywords.length,
        experienceKeywords: cvFeatures.experienceKeywords.length,
        seniorityLevel: cvFeatures.seniorityIndicators.level,
        hybridRoles: cvFeatures.hybridRoles
      });

      // Calculate matches with enhanced algorithm
      const roleMatches = await Promise.all(
        availableProfiles.map(profile => 
          this.matcher.calculateEnhancedRoleMatch(profile, cvFeatures, parsedCV)
        )
      );

      const validMatches = roleMatches
        .filter(match => match.confidence >= this.config.confidenceThreshold)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, this.config.maxResults);

      if (validMatches.length === 0) {
        return this.analyzer.createFallbackAnalysis(parsedCV);
      }

      return this.analyzer.generateRoleProfileAnalysis(validMatches, parsedCV);
    } catch (error) {
      console.error('[ROLE-DETECTION] Error:', error);
      return this.analyzer.createFallbackAnalysis(parsedCV);
    }
  }

  /**
   * Detects a single best-matching role
   */
  async detectPrimaryRole(parsedCV: ParsedCV): Promise<RoleMatchResult | null> {
    const analysis = await this.detectRoles(parsedCV);
    return analysis.primaryRole;
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<RoleDetectionConfig>): void {
    this.config = { ...this.config, ...config };
    this.matcher.updateConfig(this.config);
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      service: 'RoleDetectionService',
      config: this.config,
      fuzzyConfig: this.fuzzyConfig,
      features: {
        fuzzyMatching: true,
        synonymDetection: true,
        seniorityDetection: true,
        hybridRoleDetection: true,
        negativeIndicators: true,
        recencyWeighting: true
      }
    };
  }
}