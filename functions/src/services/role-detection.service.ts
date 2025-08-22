/**
 * Role Detection Service
 * 
 * Intelligent role matching service that analyzes CV data to determine
 * the best role profile match with confidence scoring and enhancement suggestions
 */

import { ParsedCV } from '../types/job';
import {
  RoleProfile,
  RoleMatchResult,
  RoleDetectionConfig,
  RoleProfileAnalysis,
  MatchingFactor,
  RoleBasedRecommendation,
  ConfidenceScore,
  RoleCategory,
  ExperienceLevel,
  CVSection
} from '../types/role-profile.types';
import { VerifiedClaudeService } from './verified-claude.service';
import { RoleProfileService } from './role-profile.service';

export class RoleDetectionService {
  private claudeService: VerifiedClaudeService;
  private roleProfileService: RoleProfileService;
  private config: RoleDetectionConfig;

  constructor(config?: Partial<RoleDetectionConfig>) {
    this.claudeService = new VerifiedClaudeService();
    this.roleProfileService = new RoleProfileService();
    this.config = {
      confidenceThreshold: 0.6,
      maxResults: 5,
      enableMultiRoleDetection: true,
      weightingFactors: {
        title: 0.3,
        skills: 0.35,
        experience: 0.25,
        industry: 0.08,
        education: 0.02
      },
      ...config
    };

  }

  /**
   * Analyzes CV and detects the most suitable role profiles
   */
  async detectRoles(parsedCV: ParsedCV): Promise<RoleProfileAnalysis> {
    
    try {
      // Step 1: Get all available role profiles
      const availableProfiles = await this.roleProfileService.getAllProfiles();

      // Step 2: Extract relevant data from CV
      const cvFeatures = this.extractCVFeatures(parsedCV);
      console.log('[ROLE-DETECTION] CV features extracted:', {
        titleKeywords: cvFeatures.titleKeywords.length,
        skillKeywords: cvFeatures.skillKeywords.length,
        experienceKeywords: cvFeatures.experienceKeywords.length,
        industryKeywords: cvFeatures.industryKeywords.length
      });

      // Step 3: Calculate matches for each role profile
      const roleMatches = await Promise.all(
        availableProfiles.map(profile => this.calculateRoleMatch(profile, cvFeatures, parsedCV))
      );

      // Step 4: Sort by confidence and filter by threshold
      const validMatches = roleMatches
        .filter(match => match.confidence >= this.config.confidenceThreshold)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, this.config.maxResults);

      if (validMatches.length === 0) {
        return this.createFallbackAnalysis(parsedCV);
      }

      // Step 5: Generate comprehensive analysis
      const analysis = await this.generateRoleProfileAnalysis(validMatches, parsedCV);
      
      return analysis;

    } catch (error) {
      return this.createFallbackAnalysis(parsedCV);
    }
  }

  /**
   * Detects a single best-matching role for quick operations
   */
  async detectPrimaryRole(parsedCV: ParsedCV): Promise<RoleMatchResult | null> {
    const analysis = await this.detectRoles(parsedCV);
    return analysis.primaryRole;
  }

  /**
   * Extracts relevant features from CV for role matching
   */
  private extractCVFeatures(parsedCV: ParsedCV): {
    titleKeywords: string[];
    skillKeywords: string[];
    experienceKeywords: string[];
    industryKeywords: string[];
    educationKeywords: string[];
  } {
    const features = {
      titleKeywords: [] as string[],
      skillKeywords: [] as string[],
      experienceKeywords: [] as string[],
      industryKeywords: [] as string[],
      educationKeywords: [] as string[]
    };

    // Extract title keywords
    const title = parsedCV.personalInfo?.title || parsedCV.personal?.title || '';
    if (title) {
      features.titleKeywords = this.extractKeywords(title);
    }

    // Extract skills keywords
    if (parsedCV.skills) {
      if (Array.isArray(parsedCV.skills)) {
        features.skillKeywords = parsedCV.skills.map(skill => skill.toLowerCase());
      } else {
        features.skillKeywords = Object.values(parsedCV.skills)
          .flat()
          .filter(Boolean)
          .map(skill => skill.toLowerCase());
      }
    }

    // Extract experience keywords
    if (parsedCV.experience) {
      parsedCV.experience.forEach(exp => {
        // Company and position keywords
        features.industryKeywords.push(...this.extractKeywords(exp.company));
        features.titleKeywords.push(...this.extractKeywords(exp.position));
        
        // Description keywords
        if (exp.description) {
          features.experienceKeywords.push(...this.extractKeywords(exp.description));
        }

        // Achievement keywords
        if (exp.achievements) {
          exp.achievements.forEach(achievement => {
            features.experienceKeywords.push(...this.extractKeywords(achievement));
          });
        }
      });
    }

    // Extract education keywords
    if (parsedCV.education) {
      parsedCV.education.forEach(edu => {
        features.educationKeywords.push(...this.extractKeywords(edu.degree));
        features.educationKeywords.push(...this.extractKeywords(edu.field));
        features.industryKeywords.push(...this.extractKeywords(edu.institution));
      });
    }

    // Remove duplicates and empty strings
    Object.keys(features).forEach(key => {
      features[key as keyof typeof features] = Array.from(new Set(
        features[key as keyof typeof features].filter(Boolean)
      ));
    });

    return features;
  }

  /**
   * Calculates match score between a role profile and CV features
   */
  private async calculateRoleMatch(
    profile: RoleProfile,
    cvFeatures: ReturnType<typeof this.extractCVFeatures>,
    parsedCV: ParsedCV
  ): Promise<RoleMatchResult> {
    const matchingFactors: MatchingFactor[] = [];

    // Calculate title matching
    const titleMatch = this.calculateKeywordMatch(
      cvFeatures.titleKeywords,
      profile.matchingCriteria.titleKeywords,
      'title'
    );
    matchingFactors.push(titleMatch);

    // Calculate skills matching
    const skillsMatch = this.calculateKeywordMatch(
      cvFeatures.skillKeywords,
      profile.matchingCriteria.skillKeywords,
      'skills'
    );
    matchingFactors.push(skillsMatch);

    // Calculate experience matching
    const experienceMatch = this.calculateKeywordMatch(
      cvFeatures.experienceKeywords,
      profile.matchingCriteria.experienceKeywords,
      'experience'
    );
    matchingFactors.push(experienceMatch);

    // Calculate industry matching
    const industryMatch = this.calculateKeywordMatch(
      cvFeatures.industryKeywords,
      profile.matchingCriteria.industryKeywords,
      'industry'
    );
    matchingFactors.push(industryMatch);

    // Calculate education matching (if criteria exist)
    if (profile.matchingCriteria.educationKeywords) {
      const educationMatch = this.calculateKeywordMatch(
        cvFeatures.educationKeywords,
        profile.matchingCriteria.educationKeywords,
        'education'
      );
      matchingFactors.push(educationMatch);
    }

    // Calculate weighted confidence score
    const confidence = this.calculateWeightedConfidence(matchingFactors);

    // Generate role-based recommendations
    const recommendations = await this.generateRoleRecommendations(profile, parsedCV, matchingFactors);

    // Calculate enhancement potential
    const enhancementPotential = this.calculateEnhancementPotential(profile, parsedCV, matchingFactors);

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
   * Calculates keyword matching between CV features and profile criteria
   */
  private calculateKeywordMatch(
    cvKeywords: string[],
    profileKeywords: string[],
    type: MatchingFactor['type']
  ): MatchingFactor {
    const matchedKeywords: string[] = [];
    
    // Check for exact matches and partial matches
    cvKeywords.forEach(cvKeyword => {
      profileKeywords.forEach(profileKeyword => {
        if (cvKeyword.includes(profileKeyword.toLowerCase()) || 
            profileKeyword.toLowerCase().includes(cvKeyword)) {
          matchedKeywords.push(cvKeyword);
        }
      });
    });

    // Remove duplicates
    const uniqueMatches = Array.from(new Set(matchedKeywords));
    
    // Calculate score (percentage of profile keywords matched)
    const score = profileKeywords.length > 0 
      ? Math.min(uniqueMatches.length / profileKeywords.length, 1.0)
      : 0;

    return {
      type,
      matchedKeywords: uniqueMatches,
      weight: this.config.weightingFactors[type],
      score,
      details: `${uniqueMatches.length}/${profileKeywords.length} keywords matched`
    };
  }

  /**
   * Calculates weighted confidence score from matching factors
   */
  private calculateWeightedConfidence(factors: MatchingFactor[]): number {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    factors.forEach(factor => {
      totalWeightedScore += factor.score * factor.weight;
      totalWeight += factor.weight;
    });

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  }

  /**
   * Generates role-specific enhancement recommendations
   */
  private async generateRoleRecommendations(
    profile: RoleProfile,
    parsedCV: ParsedCV,
    matchingFactors: MatchingFactor[]
  ): Promise<RoleBasedRecommendation[]> {
    const recommendations: RoleBasedRecommendation[] = [];

    // Analyze gaps and generate recommendations
    const weakFactors = matchingFactors.filter(f => f.score < 0.5);
    
    for (const factor of weakFactors) {
      const recommendation = this.createRecommendationFromFactor(profile, factor, parsedCV);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    // Add profile-specific template recommendations
    if (profile.enhancementTemplates.professionalSummary && !parsedCV.summary) {
      recommendations.push({
        id: `${profile.id}_summary`,
        type: 'content',
        priority: 'high',
        title: `Add ${profile.name} Professional Summary`,
        description: `Create a compelling professional summary tailored for ${profile.name} roles`,
        template: profile.enhancementTemplates.professionalSummary,
        targetSection: CVSection.PROFESSIONAL_SUMMARY,
        expectedImpact: 25
      });
    }

    return recommendations.slice(0, 8); // Limit to top 8 recommendations
  }

  /**
   * Creates recommendation from matching factor analysis
   */
  private createRecommendationFromFactor(
    profile: RoleProfile,
    factor: MatchingFactor,
    parsedCV: ParsedCV
  ): RoleBasedRecommendation | null {
    const baseId = `${profile.id}_${factor.type}`;
    
    switch (factor.type) {
      case 'skills':
        return {
          id: `${baseId}_enhancement`,
          type: 'keyword',
          priority: 'high',
          title: `Enhance ${profile.name} Skills`,
          description: `Add key skills relevant to ${profile.name} roles`,
          template: `Consider adding: ${profile.requiredSkills.slice(0, 5).join(', ')}`,
          targetSection: CVSection.SKILLS,
          expectedImpact: 20
        };
        
      case 'experience':
        return {
          id: `${baseId}_optimization`,
          type: 'content',
          priority: 'medium',
          title: `Optimize Experience for ${profile.name}`,
          description: `Highlight experience relevant to ${profile.name} responsibilities`,
          template: profile.enhancementTemplates.experienceEnhancements[0]?.bulletPointTemplate || '',
          targetSection: CVSection.EXPERIENCE,
          expectedImpact: 18
        };
        
      case 'title':
        return {
          id: `${baseId}_title`,
          type: 'content',
          priority: 'high',
          title: `Update Professional Title`,
          description: `Align professional title with ${profile.name} role expectations`,
          template: `Consider titles like: ${profile.matchingCriteria.titleKeywords.slice(0, 3).join(', ')}`,
          targetSection: CVSection.PERSONAL_INFO,
          expectedImpact: 15
        };
        
      default:
        return null;
    }
  }

  /**
   * Calculates the potential for CV enhancement based on role match
   */
  private calculateEnhancementPotential(
    profile: RoleProfile,
    parsedCV: ParsedCV,
    matchingFactors: MatchingFactor[]
  ): number {
    let potential = 0;
    
    // Base potential from weak matching factors
    const weakFactors = matchingFactors.filter(f => f.score < 0.7);
    potential += weakFactors.length * 15;
    
    // Additional potential from missing sections
    const missingSections = profile.validationRules.requiredSections.filter(section => {
      switch (section) {
        case CVSection.PROFESSIONAL_SUMMARY:
          return !parsedCV.summary;
        case CVSection.ACHIEVEMENTS:
          return !parsedCV.achievements || parsedCV.achievements.length === 0;
        case CVSection.CERTIFICATIONS:
          return !parsedCV.certifications || parsedCV.certifications.length === 0;
        case CVSection.PROJECTS:
          return !parsedCV.projects || parsedCV.projects.length === 0;
        default:
          return false;
      }
    });
    
    potential += missingSections.length * 10;
    
    return Math.min(potential, 100); // Cap at 100%
  }

  /**
   * Generates comprehensive role profile analysis
   */
  private async generateRoleProfileAnalysis(
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
    const gapAnalysis = await this.performGapAnalysis(primaryRole, parsedCV);
    
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
   * Performs gap analysis between CV and role requirements
   */
  private async performGapAnalysis(
    primaryRole: RoleMatchResult,
    parsedCV: ParsedCV
  ): Promise<RoleProfileAnalysis['gapAnalysis']> {
    const profile = await this.roleProfileService.getProfileById(primaryRole.roleId);
    if (!profile) {
      return { missingSkills: [], weakAreas: [], strengthAreas: [] };
    }
    
    const cvSkills = this.extractCVFeatures(parsedCV).skillKeywords;
    
    // Find missing required skills
    const missingSkills = profile.requiredSkills.filter(
      skill => !cvSkills.some(cvSkill => 
        cvSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );
    
    // Identify weak areas from matching factors
    const weakAreas = primaryRole.matchingFactors
      .filter(factor => factor.score < 0.5)
      .map(factor => factor.type);
    
    // Identify strength areas
    const strengthAreas = primaryRole.matchingFactors
      .filter(factor => factor.score > 0.8)
      .map(factor => factor.type);
    
    return {
      missingSkills: missingSkills.slice(0, 10),
      weakAreas,
      strengthAreas
    };
  }

  /**
   * Creates fallback analysis when no strong matches are found
   */
  private createFallbackAnalysis(parsedCV: ParsedCV): RoleProfileAnalysis {
    
    // Create generic role match
    const fallbackRole: RoleMatchResult = {
      roleId: 'generic_professional',
      roleName: 'Professional',
      confidence: 0.3,
      matchingFactors: [],
      enhancementPotential: 70,
      recommendations: [
        {
          id: 'generic_summary',
          type: 'content',
          priority: 'high',
          title: 'Add Professional Summary',
          description: 'Create a compelling professional summary to improve CV impact',
          template: 'Results-driven professional with expertise in [YOUR FIELD]...',
          targetSection: CVSection.PROFESSIONAL_SUMMARY,
          expectedImpact: 25
        }
      ]
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

  /**
   * Utility method to extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    if (!text) return [];
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 20); // Limit keywords per text
  }

  /**
   * Updates the detection configuration
   */
  updateConfig(config: Partial<RoleDetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets current service statistics
   */
  getStats(): {
    service: string;
    config: RoleDetectionConfig;
    profileCount: number;
  } {
    return {
      service: 'RoleDetectionService',
      config: this.config,
      profileCount: 0 // Will be populated when profiles are loaded
    };
  }
}