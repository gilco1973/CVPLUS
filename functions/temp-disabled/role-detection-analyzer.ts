// TEMPORARILY DISABLED DUE TO TYPESCRIPT ERRORS - FOR TESTING getRecommendations
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

// TEMP DISABLED - export class RoleDetectionAnalyzer {
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
   * Create improved fallback analysis when no strong matches are found
   * Attempts to detect likely roles based on skills and experience patterns
   */
  createFallbackAnalysis(parsedCV: ParsedCV): RoleProfileAnalysis {
    // Try to detect role based on skills and experience
    const detectedRole = this.detectRoleFromSkills(parsedCV);
    
    const fallbackRole: RoleMatchResult = {
      roleId: detectedRole.roleId,
      roleName: detectedRole.roleName,
      confidence: detectedRole.confidence,
      matchingFactors: detectedRole.matchingFactors,
      enhancementPotential: 75,
      recommendations: [{
        id: 'improve_targeting',
        type: 'content',
        priority: 'high',
        title: 'Enhance Role Targeting',
        description: `Based on your background, consider emphasizing your ${detectedRole.roleName.toLowerCase()} experience`,
        template: detectedRole.template,
        targetSection: CVSection.PROFESSIONAL_SUMMARY,
        expectedImpact: 30
      }, {
        id: 'manual_selection',
        type: 'structure',
        priority: 'medium',
        title: 'Manual Role Selection',
        description: 'Select a specific role profile to get more targeted recommendations',
        template: 'Choose from available role profiles for personalized suggestions',
        targetSection: CVSection.PROFESSIONAL_SUMMARY,
        expectedImpact: 40
      }]
    };
    
    return {
      primaryRole: fallbackRole,
      alternativeRoles: [],
      overallConfidence: detectedRole.confidence,
      enhancementSuggestions: {
        immediate: fallbackRole.recommendations,
        strategic: [{
          id: 'skills_alignment',
          type: 'content',
          priority: 'medium',
          title: 'Align Skills with Target Role',
          description: 'Review and emphasize skills most relevant to your target role',
          template: 'Highlight key skills: ' + detectedRole.keySkills.join(', '),
          targetSection: CVSection.SKILLS,
          expectedImpact: 25
        }]
      },
      gapAnalysis: {
        missingSkills: [],
        weakAreas: ['Role targeting could be more specific'],
        strengthAreas: detectedRole.keySkills.length > 0 ? ['Strong skill foundation'] : []
      }
    };
  }

  /**
   * Detect most likely role based on skills and experience patterns
   */
  private detectRoleFromSkills(parsedCV: ParsedCV): {
    roleId: string;
    roleName: string;
    confidence: number;
    matchingFactors: MatchingFactor[];
    keySkills: string[];
    template: string;
  } {
    const skillPatterns = {
      'software_developer': {
        keywords: ['javascript', 'python', 'java', 'react', 'node', 'programming', 'development', 'coding', 'software', 'web'],
        roleName: 'Software Developer',
        template: 'Experienced software developer with expertise in modern programming languages and frameworks...'
      },
      'data_analyst': {
        keywords: ['data', 'sql', 'python', 'analytics', 'excel', 'tableau', 'statistics', 'analysis', 'reporting'],
        roleName: 'Data Analyst', 
        template: 'Detail-oriented data analyst with strong analytical skills and experience in data visualization...'
      },
      'project_manager': {
        keywords: ['project', 'management', 'agile', 'scrum', 'planning', 'coordination', 'leadership', 'team'],
        roleName: 'Project Manager',
        template: 'Results-driven project manager with proven ability to lead cross-functional teams...'
      },
      'marketing_specialist': {
        keywords: ['marketing', 'social media', 'content', 'seo', 'advertising', 'brand', 'campaigns', 'digital'],
        roleName: 'Marketing Specialist',
        template: 'Creative marketing professional with expertise in digital marketing strategies...'
      },
      'business_analyst': {
        keywords: ['business', 'analysis', 'requirements', 'stakeholder', 'process', 'improvement', 'documentation'],
        roleName: 'Business Analyst',
        template: 'Strategic business analyst with strong analytical and communication skills...'
      }
    };

    // Extract all skills and experience text
    const allSkills: string[] = [];
    if (parsedCV.skills) {
      if (Array.isArray(parsedCV.skills)) {
        allSkills.push(...parsedCV.skills.map(s => s.toLowerCase()));
      } else {
        allSkills.push(...Object.values(parsedCV.skills).flat().map(s => s.toLowerCase()));
      }
    }

    // Add experience keywords
    if (parsedCV.experience) {
      parsedCV.experience.forEach(exp => {
        allSkills.push(...extractKeywords(exp.position.toLowerCase()));
        if (exp.description) {
          allSkills.push(...extractKeywords(exp.description.toLowerCase()));
        }
      });
    }

    // Score each role pattern
    let bestMatch = {
      roleId: 'general_professional',
      roleName: 'Professional',
      confidence: 0.65,
      matchingFactors: [] as MatchingFactor[],
      keySkills: [] as string[],
      template: 'Dedicated professional with diverse experience and strong work ethic...'
    };

    Object.entries(skillPatterns).forEach(([roleId, pattern]) => {
      const matchingSkills = allSkills.filter(skill => 
        pattern.keywords.some(keyword => skill.includes(keyword))
      );
      
      if (matchingSkills.length > 0) {
        const confidence = Math.min(0.8, 0.5 + (matchingSkills.length / pattern.keywords.length) * 0.3);
        
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            roleId,
            roleName: pattern.roleName,
            confidence,
            matchingFactors: [{
              type: 'skills',
              score: confidence,
              weight: 1.0,
              details: `Found ${matchingSkills.length} relevant skills: ${matchingSkills.slice(0, 5).join(', ')}`,
              matchedKeywords: matchingSkills
            }],
            keySkills: Array.from(new Set(matchingSkills)).slice(0, 5),
            template: pattern.template
          };
        }
      }
    });

    return bestMatch;
  }
}