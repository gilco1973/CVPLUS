/**
 * Role Detection Analyzer
 * 
 * Handles analysis and feature extraction for role detection
 */

import { ParsedCV } from '../types/job';
import {
  RoleProfile,
  RoleMatchResult,
  RoleDetectionConfig,
  RoleProfileAnalysis,
  MatchingFactor,
  RoleBasedRecommendation,
  CVSection,
  ExperienceLevel
} from '../types/role-profile.types';
import { RoleProfileService } from './role-profile.service';
import { RoleRecommendationsService } from './role-detection-recommendations';
import {
  getCVFullText,
  calculateRecencyWeight,
  extractKeywords,
  detectHybridRoles
} from './role-detection-helpers';
import { detectExperienceLevel } from './role-detection-maps';

export class RoleDetectionAnalyzer {
  private config: RoleDetectionConfig;
  private roleProfileService: RoleProfileService;
  private recommendationsService: RoleRecommendationsService;

  constructor(config: RoleDetectionConfig, roleProfileService: RoleProfileService) {
    this.config = config;
    this.roleProfileService = roleProfileService;
    this.recommendationsService = new RoleRecommendationsService(roleProfileService);
  }

  /**
   * Calculate weighted confidence score from matching factors
   */
  calculateWeightedConfidence(factors: MatchingFactor[]): number {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    factors.forEach(factor => {
      totalWeightedScore += factor.score * factor.weight;
      totalWeight += factor.weight;
    });

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  }

  /**
   * Generate role-specific enhancement recommendations
   */
  async generateRoleRecommendations(
    profile: RoleProfile,
    parsedCV: ParsedCV,
    matchingFactors: MatchingFactor[]
  ): Promise<RoleBasedRecommendation[]> {
    return this.recommendationsService.generateRoleRecommendations(
      profile,
      parsedCV,
      matchingFactors
    );
  }

  /**
   * Calculate enhancement potential
   */
  calculateEnhancementPotential(
    profile: RoleProfile,
    parsedCV: ParsedCV,
    matchingFactors: MatchingFactor[]
  ): number {
    return this.recommendationsService.calculateEnhancementPotential(
      profile,
      parsedCV,
      matchingFactors
    );
  }

  /**
   * Extract enhanced CV features with fuzzy matching support
   */
  extractEnhancedCVFeatures(parsedCV: ParsedCV, seniorityKeywords: Map<ExperienceLevel, string[]>) {
    const cvText = getCVFullText(parsedCV);
    const seniorityIndicators = detectExperienceLevel(cvText, seniorityKeywords);
    const hybridRoles = detectHybridRoles(parsedCV);

    const features = {
      titleKeywords: [] as string[],
      skillKeywords: [] as string[],
      experienceKeywords: [] as string[],
      industryKeywords: [] as string[],
      educationKeywords: [] as string[],
      seniorityIndicators,
      hybridRoles,
      negativeFactors: new Map<string, number>()
    };

    // Extract title keywords including hybrid roles
    const title = parsedCV.personalInfo?.title || parsedCV.personal?.title || '';
    if (title) {
      features.titleKeywords = extractKeywords(title);
    }
    features.titleKeywords.push(...hybridRoles);

    // Extract skills with enhanced processing
    if (parsedCV.skills) {
      if (Array.isArray(parsedCV.skills)) {
        features.skillKeywords = parsedCV.skills.map(s => s.toLowerCase());
      } else {
        features.skillKeywords = Object.values(parsedCV.skills)
          .flat()
          .filter(Boolean)
          .map(s => s.toLowerCase());
      }
    }

    // Extract experience with recency weighting
    if (parsedCV.experience) {
      parsedCV.experience.forEach((exp, index) => {
        const weight = calculateRecencyWeight(index, parsedCV.experience.length);
        const multiplier = Math.ceil(weight * 3);
        
        const companyKw = extractKeywords(exp.company);
        const positionKw = extractKeywords(exp.position);
        const descKw = exp.description ? extractKeywords(exp.description) : [];
        
        for (let i = 0; i < multiplier; i++) {
          features.industryKeywords.push(...companyKw);
          features.titleKeywords.push(...positionKw);
          features.experienceKeywords.push(...descKw);
        }
      });
    }

    // Extract education keywords
    if (parsedCV.education) {
      parsedCV.education.forEach(edu => {
        features.educationKeywords.push(
          ...extractKeywords(edu.degree),
          ...extractKeywords(edu.field),
          ...extractKeywords(edu.institution)
        );
      });
    }

    // Remove duplicates
    Object.keys(features).forEach(key => {
      if (Array.isArray(features[key as keyof typeof features])) {
        const arr = features[key as keyof typeof features] as string[];
        features[key as keyof typeof features] = Array.from(new Set(arr.filter(Boolean))) as any;
      }
    });

    return features;
  }

  /**
   * Generate comprehensive role profile analysis
   */
  async generateRoleProfileAnalysis(
    matches: RoleMatchResult[],
    parsedCV: ParsedCV
  ): Promise<RoleProfileAnalysis> {
    const primaryRole = matches[0];
    const alternativeRoles = matches.slice(1);
    
    // Calculate overall confidence
    const overallConfidence = matches.reduce((sum, match) => sum + match.confidence, 0) / matches.length;
    
    // Collect all recommendations and categorize
    const allRecommendations = matches.flatMap(match => match.recommendations);
    const immediateRecommendations = allRecommendations
      .filter(rec => rec.priority === 'high')
      .slice(0, 5);
    const strategicRecommendations = allRecommendations
      .filter(rec => rec.priority === 'medium' || rec.priority === 'low')
      .slice(0, 5);
    
    // Perform gap analysis
    const gapAnalysis = await this.recommendationsService.performGapAnalysis(primaryRole, parsedCV);
    
    return {
      primaryRole,
      alternativeRoles,
      overallConfidence,
      enhancementSuggestions: {
        immediate: immediateRecommendations,
        strategic: strategicRecommendations
      },
      gapAnalysis
    };
  }

  /**
   * Create fallback analysis when no strong matches are found
   */
  createFallbackAnalysis(parsedCV: ParsedCV): RoleProfileAnalysis {
    const fallbackRole: RoleMatchResult = {
      roleId: 'generic_professional',
      roleName: 'Professional',
      confidence: 0.3,
      matchingFactors: [],
      enhancementPotential: 70,
      recommendations: [{
        id: 'generic_summary',
        type: 'content',
        priority: 'high',
        title: 'Add Professional Summary',
        description: 'Create a compelling professional summary to improve CV impact',
        template: 'Results-driven professional with expertise in [YOUR FIELD]...',
        targetSection: CVSection.PROFESSIONAL_SUMMARY,
        expectedImpact: 25
      }]
    };
    
    return {
      primaryRole: fallbackRole,
      alternativeRoles: [],
      overallConfidence: 0.3,
      enhancementSuggestions: {
        immediate: [fallbackRole.recommendations[0]],
        strategic: []
      },
      gapAnalysis: {
        missingSkills: [],
        weakAreas: ['Professional positioning needs improvement'],
        strengthAreas: []
      }
    };
  }
}