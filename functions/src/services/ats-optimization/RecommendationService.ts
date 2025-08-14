/**
 * Recommendation Service
 * 
 * Specialized service for generating prioritized, actionable recommendations
 * for ATS optimization based on analysis results from all other services.
 */

import { 
  ParsedCV, 
  AdvancedATSScore, 
  SemanticKeywordAnalysis, 
  ATSSystemSimulation,
  CompetitorAnalysis,
  PrioritizedRecommendation 
} from '../types/enhanced-models';
import { RecommendationParams } from './types';

export class RecommendationService {

  /**
   * Generate comprehensive prioritized recommendations
   */
  async generatePrioritizedRecommendations(params: RecommendationParams): Promise<PrioritizedRecommendation[]> {
    const { parsedCV, advancedScore, semanticAnalysis, systemSimulations, competitorBenchmark } = params;
    
    console.log('🎯 Generating prioritized ATS recommendations...');
    
    const recommendations: PrioritizedRecommendation[] = [];
    
    // Generate different types of recommendations
    const keywordRecs = this.generateKeywordRecommendations(semanticAnalysis, parsedCV);
    const structureRecs = this.generateStructureRecommendations(parsedCV, advancedScore);
    const contentRecs = this.generateContentRecommendations(parsedCV, advancedScore);
    const systemRecs = this.generateSystemSpecificRecommendations(systemSimulations);
    const competitiveRecs = this.generateCompetitiveRecommendations(competitorBenchmark, advancedScore);
    
    // Combine all recommendations
    recommendations.push(...keywordRecs);
    recommendations.push(...structureRecs);
    recommendations.push(...contentRecs);
    recommendations.push(...systemRecs);
    recommendations.push(...competitiveRecs);
    
    // Sort by priority and impact
    const prioritizedRecs = this.prioritizeRecommendations(recommendations, advancedScore);
    
    console.log(`✅ Generated ${prioritizedRecs.length} prioritized recommendations`);
    return prioritizedRecs;
  }

  /**
   * Generate keyword-specific recommendations
   */
  private generateKeywordRecommendations(
    semanticAnalysis: SemanticKeywordAnalysis, 
    parsedCV: ParsedCV
  ): PrioritizedRecommendation[] {
    const recommendations: PrioritizedRecommendation[] = [];
    
    if (!semanticAnalysis) return recommendations;

    // Missing keywords recommendations
    if (semanticAnalysis.missingKeywords && semanticAnalysis.missingKeywords.length > 0) {
      const criticalKeywords = semanticAnalysis.missingKeywords.slice(0, 5);
      
      recommendations.push({
        category: 'keywords',
        priority: 'critical',
        issue: `Missing ${criticalKeywords.length} critical keywords: ${criticalKeywords.join(', ')}`,
        solution: 'Integrate these keywords naturally into your experience descriptions and skills section',
        expectedImpact: 'high',
        implementation: 'medium',
        timeToComplete: '2-3 hours',
        atsSystemsAffected: ['workday', 'greenhouse', 'lever'],
        specificSteps: [
          'Review job description for keyword context',
          'Add keywords to relevant experience descriptions',
          'Update skills section with missing technical terms',
          'Include keywords in professional summary'
        ]
      });
    }

    // Keyword density recommendations
    const currentDensity = semanticAnalysis.keywordDensity || 0;
    const optimalDensity = semanticAnalysis.optimalDensity || 0.03;
    
    if (currentDensity < optimalDensity * 0.7) {
      recommendations.push({
        category: 'keywords',
        priority: 'high',
        issue: `Keyword density too low (${(currentDensity * 100).toFixed(1)}% vs optimal ${(optimalDensity * 100).toFixed(1)}%)`,
        solution: 'Increase keyword frequency by naturally incorporating relevant terms throughout your CV',
        expectedImpact: 'high',
        implementation: 'medium',
        timeToComplete: '1-2 hours',
        atsSystemsAffected: ['greenhouse', 'lever', 'icims'],
        specificSteps: [
          'Identify underused important keywords',
          'Add synonyms and variations of key terms',
          'Include keywords in multiple sections',
          'Use keywords in context, not as lists'
        ]
      });
    } else if (currentDensity > optimalDensity * 1.3) {
      recommendations.push({
        category: 'keywords',
        priority: 'medium',
        issue: `Keyword density too high (${(currentDensity * 100).toFixed(1)}% vs optimal ${(optimalDensity * 100).toFixed(1)}%)`,
        solution: 'Reduce keyword repetition to avoid appearing as keyword stuffing',
        expectedImpact: 'medium',
        implementation: 'easy',
        timeToComplete: '30-60 minutes',
        atsSystemsAffected: ['workday', 'bamboohr'],
        specificSteps: [
          'Review for repetitive keyword usage',
          'Replace some keywords with synonyms',
          'Focus on natural language flow',
          'Maintain keyword relevance in context'
        ]
      });
    }

    // Low-frequency keyword recommendations
    if (semanticAnalysis.matchedKeywords) {
      const lowFreqKeywords = semanticAnalysis.matchedKeywords.filter(kw => kw.frequency === 1);
      if (lowFreqKeywords.length > 3) {
        recommendations.push({
          category: 'keywords',
          priority: 'medium',
          issue: `${lowFreqKeywords.length} important keywords appear only once`,
          solution: 'Increase frequency of critical keywords by using them in multiple relevant contexts',
          expectedImpact: 'medium',
          implementation: 'medium',
          timeToComplete: '1 hour',
          atsSystemsAffected: ['greenhouse', 'icims'],
          specificSteps: [
            'Identify single-use critical keywords',
            'Find additional relevant contexts for usage',
            'Add to skills section if technical terms',
            'Include in achievement descriptions'
          ]
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate structure and formatting recommendations
   */
  private generateStructureRecommendations(
    parsedCV: ParsedCV, 
    advancedScore: AdvancedATSScore
  ): PrioritizedRecommendation[] {
    const recommendations: PrioritizedRecommendation[] = [];
    
    // Missing essential sections
    const missingSections: string[] = [];
    if (!parsedCV.personalInfo?.name) missingSections.push('name');
    if (!parsedCV.personalInfo?.email) missingSections.push('email');
    if (!parsedCV.personalInfo?.phone) missingSections.push('phone');
    if (!parsedCV.experience || parsedCV.experience.length === 0) missingSections.push('experience');
    if (!parsedCV.education || parsedCV.education.length === 0) missingSections.push('education');
    if (!parsedCV.skills) missingSections.push('skills');

    if (missingSections.length > 0) {
      recommendations.push({
        category: 'structure',
        priority: 'critical',
        issue: `Missing essential sections: ${missingSections.join(', ')}`,
        solution: 'Add all missing essential sections to ensure ATS can parse your information',
        expectedImpact: 'very high',
        implementation: 'easy',
        timeToComplete: '30-60 minutes',
        atsSystemsAffected: ['all'],
        specificSteps: [
          'Add complete contact information',
          'Include professional experience section',
          'Add education background',
          'Create comprehensive skills section'
        ]
      });
    }

    // Professional summary missing
    if (!parsedCV.personalInfo?.summary) {
      recommendations.push({
        category: 'structure',
        priority: 'high',
        issue: 'Missing professional summary section',
        solution: 'Add a compelling 2-3 sentence professional summary at the top of your CV',
        expectedImpact: 'high',
        implementation: 'medium',
        timeToComplete: '30-45 minutes',
        atsSystemsAffected: ['workday', 'smartrecruiters'],
        specificSteps: [
          'Write 2-3 sentences highlighting your key strengths',
          'Include your most relevant experience',
          'Add 2-3 important keywords naturally',
          'Focus on value proposition to employers'
        ]
      });
    }

    // Date formatting issues
    const hasInconsistentDates = this.checkDateConsistency(parsedCV);
    if (hasInconsistentDates) {
      recommendations.push({
        category: 'structure',
        priority: 'medium',
        issue: 'Inconsistent date formatting across sections',
        solution: 'Standardize all dates to MM/YYYY format for better ATS parsing',
        expectedImpact: 'medium',
        implementation: 'easy',
        timeToComplete: '15-30 minutes',
        atsSystemsAffected: ['workday', 'smartrecruiters', 'bamboohr'],
        specificSteps: [
          'Review all dates in experience section',
          'Review all dates in education section',
          'Convert to consistent MM/YYYY format',
          'Use "Present" for current positions'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Generate content quality recommendations
   */
  private generateContentRecommendations(
    parsedCV: ParsedCV, 
    advancedScore: AdvancedATSScore
  ): PrioritizedRecommendation[] {
    const recommendations: PrioritizedRecommendation[] = [];
    
    // Weak experience descriptions
    const weakExperiences = this.identifyWeakExperiences(parsedCV.experience || []);
    if (weakExperiences.length > 0) {
      recommendations.push({
        category: 'content',
        priority: 'high',
        issue: `${weakExperiences.length} experience entries lack detailed descriptions`,
        solution: 'Enhance experience descriptions with specific achievements, responsibilities, and quantified results',
        expectedImpact: 'high',
        implementation: 'hard',
        timeToComplete: '2-4 hours',
        atsSystemsAffected: ['greenhouse', 'icims', 'lever'],
        specificSteps: [
          'Add specific responsibilities for each role',
          'Include quantified achievements (numbers, percentages)',
          'Use action verbs to start bullet points',
          'Highlight impact and results of your work'
        ]
      });
    }

    // Lack of quantified achievements
    const hasQuantifiedAchievements = this.checkQuantifiedAchievements(parsedCV);
    if (!hasQuantifiedAchievements) {
      recommendations.push({
        category: 'content',
        priority: 'high',
        issue: 'Experience lacks quantified achievements and measurable results',
        solution: 'Add specific numbers, percentages, and metrics to demonstrate your impact',
        expectedImpact: 'very high',
        implementation: 'hard',
        timeToComplete: '3-5 hours',
        atsSystemsAffected: ['icims', 'greenhouse', 'lever'],
        specificSteps: [
          'Identify achievements from each role',
          'Quantify results with specific numbers',
          'Add percentages for improvements made',
          'Include timeframes for project completion'
        ]
      });
    }

    // Insufficient skills detail
    const skillsQuality = this.assessSkillsQuality(parsedCV.skills);
    if (skillsQuality < 0.7) {
      recommendations.push({
        category: 'content',
        priority: 'medium',
        issue: 'Skills section lacks depth and organization',
        solution: 'Expand and categorize skills by type (Technical, Soft Skills, Tools, etc.)',
        expectedImpact: 'medium',
        implementation: 'medium',
        timeToComplete: '1-2 hours',
        atsSystemsAffected: ['greenhouse', 'icims'],
        specificSteps: [
          'Categorize skills by type',
          'Add proficiency levels where relevant',
          'Include both technical and soft skills',
          'Update with current industry-relevant skills'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Generate ATS system-specific recommendations
   */
  private generateSystemSpecificRecommendations(
    systemSimulations: ATSSystemSimulation[]
  ): PrioritizedRecommendation[] {
    const recommendations: PrioritizedRecommendation[] = [];
    
    // Find systems with low compatibility scores
    const problemSystems = systemSimulations.filter(sim => sim.compatibilityScore < 75);
    
    if (problemSystems.length > 0) {
      const systemNames = problemSystems.map(sys => sys.systemName);
      const commonIssues = this.identifyCommonSystemIssues(problemSystems);
      
      recommendations.push({
        category: 'ats-compatibility',
        priority: 'high',
        issue: `Low compatibility with ${systemNames.length} ATS systems: ${systemNames.join(', ')}`,
        solution: 'Address common parsing issues to improve compatibility across multiple ATS platforms',
        expectedImpact: 'high',
        implementation: 'medium',
        timeToComplete: '2-3 hours',
        atsSystemsAffected: systemNames,
        specificSteps: [
          ...commonIssues.slice(0, 4),
          'Test CV with ATS-friendly formatting',
          'Ensure clean section breaks and headers'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Generate competitive positioning recommendations
   */
  private generateCompetitiveRecommendations(
    competitorBenchmark: CompetitorAnalysis | undefined, 
    advancedScore: AdvancedATSScore
  ): PrioritizedRecommendation[] {
    const recommendations: PrioritizedRecommendation[] = [];
    
    if (!competitorBenchmark) return recommendations;

    const currentScore = advancedScore.overall;
    const averageScore = competitorBenchmark.averageScore || 75;
    
    // Below average performance
    if (currentScore < averageScore - 5) {
      recommendations.push({
        category: 'competitive',
        priority: 'high',
        issue: `CV scores ${currentScore} vs industry average of ${averageScore}`,
        solution: 'Implement targeted improvements to exceed industry benchmarks',
        expectedImpact: 'very high',
        implementation: 'hard',
        timeToComplete: '4-6 hours',
        atsSystemsAffected: ['all'],
        specificSteps: [
          ...competitorBenchmark.improvementRecommendations?.slice(0, 4) || [
            'Add industry-specific keywords',
            'Quantify achievements with metrics',
            'Enhance technical skills section',
            'Improve formatting consistency'
          ]
        ]
      });
    }

    // Missing competitive advantages
    if (competitorBenchmark.keyDifferentiators && competitorBenchmark.keyDifferentiators.length < 3) {
      recommendations.push({
        category: 'competitive',
        priority: 'medium',
        issue: 'CV lacks clear differentiators from other candidates',
        solution: 'Highlight unique achievements and specialized skills that set you apart',
        expectedImpact: 'high',
        implementation: 'hard',
        timeToComplete: '2-3 hours',
        atsSystemsAffected: ['lever', 'greenhouse'],
        specificSteps: [
          'Identify unique projects or achievements',
          'Highlight specialized certifications',
          'Emphasize leadership and innovation examples',
          'Showcase measurable business impact'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Prioritize recommendations by impact and urgency
   */
  private prioritizeRecommendations(
    recommendations: PrioritizedRecommendation[], 
    advancedScore: AdvancedATSScore
  ): PrioritizedRecommendation[] {
    // Define priority weights
    const priorityWeights = {
      'critical': 100,
      'high': 75,
      'medium': 50,
      'low': 25
    };

    const impactWeights = {
      'very high': 40,
      'high': 30,
      'medium': 20,
      'low': 10
    };

    const implementationWeights = {
      'easy': 30,
      'medium': 20,
      'hard': 10
    };

    // Calculate weighted scores for sorting
    const scoredRecommendations = recommendations.map(rec => ({
      ...rec,
      _score: (priorityWeights[rec.priority] || 50) + 
              (impactWeights[rec.expectedImpact] || 20) + 
              (implementationWeights[rec.implementation] || 15)
    }));

    // Sort by score (highest first) and remove scoring field
    return scoredRecommendations
      .sort((a, b) => b._score - a._score)
      .map(({ _score, ...rec }) => rec)
      .slice(0, 15); // Limit to top 15 recommendations
  }

  // Helper methods

  private checkDateConsistency(parsedCV: ParsedCV): boolean {
    const dates: string[] = [];
    
    // Collect dates from experience
    if (parsedCV.experience) {
      parsedCV.experience.forEach(exp => {
        if (exp.startDate) dates.push(exp.startDate);
        if (exp.endDate) dates.push(exp.endDate);
      });
    }
    
    // Collect dates from education
    if (parsedCV.education) {
      parsedCV.education.forEach(edu => {
        if (edu.startDate) dates.push(edu.startDate);
        if (edu.endDate) dates.push(edu.endDate);
      });
    }

    if (dates.length < 2) return false;

    // Simple consistency check - look for different formats
    const formats = dates.map(date => this.getDateFormat(date));
    return new Set(formats).size > 1; // Inconsistent if multiple formats
  }

  private getDateFormat(date: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'YYYY-MM-DD';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return 'MM/DD/YYYY';
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(date)) return 'YYYY/MM/DD';
    if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4}$/i.test(date)) return 'Mon YYYY';
    if (/^\d{4}$/.test(date)) return 'YYYY';
    return 'unknown';
  }

  private identifyWeakExperiences(experiences: any[]): any[] {
    return experiences.filter(exp => 
      !exp.description || 
      exp.description.length < 50 || 
      !this.containsActionVerbs(exp.description || '')
    );
  }

  private containsActionVerbs(text: string): boolean {
    const actionVerbs = [
      'achieved', 'implemented', 'developed', 'managed', 'led', 'created', 
      'optimized', 'improved', 'increased', 'reduced', 'delivered', 'executed'
    ];
    
    const textLower = text.toLowerCase();
    return actionVerbs.some(verb => textLower.includes(verb));
  }

  private checkQuantifiedAchievements(parsedCV: ParsedCV): boolean {
    if (!parsedCV.experience) return false;
    
    return parsedCV.experience.some(exp => 
      exp.description && this.containsNumbers(exp.description)
    );
  }

  private containsNumbers(text: string): boolean {
    return /\d/.test(text) && (
      /%/.test(text) || 
      /\$/.test(text) || 
      /million|thousand|k\b/i.test(text) ||
      /increased?|improved?|reduced?|saved?/i.test(text)
    );
  }

  private assessSkillsQuality(skills: any): number {
    if (!skills) return 0;
    
    const skillsArray = this.extractSkillsArray(skills);
    if (skillsArray.length === 0) return 0;
    
    let quality = Math.min(skillsArray.length / 10, 0.7); // Up to 70% for quantity
    
    // Bonus for organization (object structure)
    if (typeof skills === 'object' && !Array.isArray(skills)) {
      quality += 0.3;
    }
    
    return Math.min(quality, 1);
  }

  private extractSkillsArray(skills: any): string[] {
    if (Array.isArray(skills)) {
      return skills.map(skill => typeof skill === 'string' ? skill : skill.name || skill.skill || '');
    }
    if (typeof skills === 'string') {
      return skills.split(/[,;|\n]/).map(s => s.trim()).filter(s => s.length > 0);
    }
    if (typeof skills === 'object' && skills !== null) {
      return Object.values(skills).flat().map(skill => 
        typeof skill === 'string' ? skill : skill?.name || skill?.skill || ''
      );
    }
    return [];
  }

  private identifyCommonSystemIssues(problemSystems: ATSSystemSimulation[]): string[] {
    const allIssues = problemSystems.flatMap(sys => sys.identifiedIssues || []);
    const issueCount: { [key: string]: number } = {};
    
    // Count issue frequency
    allIssues.forEach(issue => {
      issueCount[issue] = (issueCount[issue] || 0) + 1;
    });
    
    // Return most common issues
    return Object.entries(issueCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([issue]) => `Address: ${issue}`);
  }
}