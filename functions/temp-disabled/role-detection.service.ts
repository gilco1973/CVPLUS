// TEMPORARILY DISABLED DUE TO TYPESCRIPT ERRORS - FOR TESTING getRecommendations
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

// TEMP DISABLED - export class RoleDetectionService {
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
    
    // Enhanced configuration with guaranteed multi-role detection
    this.config = {
      confidenceThreshold: 0.3, // Lowered base threshold
      maxResults: 5,
      minResults: 2, // Guarantee at least 2 results
      enableMultiRoleDetection: true,
      enableDynamicThreshold: true, // Enable dynamic adjustment
      weightingFactors: {
        title: 0.40,     // Increased from 0.30
        skills: 0.30,    // Decreased from 0.35
        experience: 0.20, // Decreased from 0.25
        industry: 0.07,   // Decreased from 0.08
        education: 0.03   // Increased from 0.02
      },
      dynamicThresholdConfig: {
        initialThreshold: 0.5,
        minimumThreshold: 0.15,
        decrementStep: 0.05,
        maxIterations: 7
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
   * Analyzes CV and detects the most suitable role profiles with guaranteed multiple results
   */
  async detectRoles(parsedCV: ParsedCV): Promise<RoleProfileAnalysis> {
    const startTime = Date.now();
    const adjustmentsMade: string[] = [];
    
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

      // Calculate matches with enhanced reasoning algorithm
      const roleMatches = await Promise.all(
        availableProfiles.map(profile => 
          this.matcher.calculateEnhancedRoleMatchWithReasoning(profile, cvFeatures, parsedCV)
        )
      );

      // Apply dynamic threshold adjustment to guarantee minimum results
      const { validMatches, finalThreshold } = this.applyDynamicThresholdAdjustment(
        roleMatches, 
        adjustmentsMade
      );

      if (validMatches.length === 0) {
        const fallback = this.analyzer.createFallbackAnalysis(parsedCV);
        return this.addDetectionMetadata(fallback, startTime, adjustmentsMade, 0.0, 0.0);
      }

      const analysis = await this.analyzer.generateRoleProfileAnalysisWithScoring(
        validMatches, 
        parsedCV,
        availableProfiles.length,
        finalThreshold,
        this.config.confidenceThreshold
      );
      
      return this.addDetectionMetadata(
        analysis, 
        startTime, 
        adjustmentsMade, 
        finalThreshold, 
        this.config.confidenceThreshold
      );
    } catch (error) {
      console.error('[ROLE-DETECTION] Error:', error);
      const fallback = this.analyzer.createFallbackAnalysis(parsedCV);
      return this.addDetectionMetadata(fallback, startTime, ['error-fallback'], 0.0, 0.0);
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