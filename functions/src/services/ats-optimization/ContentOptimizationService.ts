/**
 * Content Optimization Service
 * 
 * Specialized service for content analysis, optimization, and generation.
 * Handles basic CV analysis, content improvements, and fallback scenarios.
 */

import { 
  ParsedCV, 
  ATSOptimizationResult,
  PrioritizedRecommendation 
} from '../../types/enhanced-models';
import { OptimizationContext } from './types';

export class ContentOptimizationService {

  /**
   * Perform basic CV analysis for fallback scenarios
   */
  async performBasicAnalysis(
    parsedCV: ParsedCV,
    targetRole?: string,
    targetKeywords?: string[]
  ): Promise<any> {
    console.log('📊 Performing basic CV analysis...');
    
    // Basic analysis without external API calls
    return {
      completeness: this.assessBasicCompleteness(parsedCV),
      structure: this.assessBasicStructure(parsedCV),
      content: this.assessBasicContent(parsedCV),
      keywords: this.performBasicKeywordAnalysis(parsedCV, targetKeywords || [])
    };
  }

  /**
   * Generate optimized content based on recommendations
   */
  async generateOptimizedContent(
    parsedCV: ParsedCV,
    recommendations: PrioritizedRecommendation[]
  ): Promise<Partial<ParsedCV>> {
    const optimizedCV: Partial<ParsedCV> = { ...parsedCV };
    
    // Extract recommended keywords
    const recommendedKeywords = this.extractRecommendedKeywords(recommendations);
    
    // Apply keyword optimizations
    if (optimizedCV.personalInfo?.summary) {
      optimizedCV.personalInfo.summary = this.optimizeTextWithKeywords(
        optimizedCV.personalInfo.summary,
        recommendedKeywords
      );
    }
    
    // Optimize experience descriptions
    if (optimizedCV.experience) {
      optimizedCV.experience = optimizedCV.experience.map(exp => ({
        ...exp,
        description: exp.description ? 
          this.optimizeTextWithKeywords(exp.description, recommendedKeywords) : 
          exp.description
      }));
    }
    
    return optimizedCV;
  }

  /**
   * Fallback to basic analysis when advanced analysis fails
   */
  async fallbackToBasicAnalysis(
    parsedCV: ParsedCV,
    context: OptimizationContext
  ): Promise<ATSOptimizationResult> {
    console.log('⚠️ Falling back to basic ATS analysis...');
    
    const basicScore = this.calculateBasicScore(parsedCV);
    const basicAnalysis = await this.performBasicAnalysis(
      parsedCV, 
      context.targetRole, 
      context.targetKeywords
    );
    
    return {
      overallScore: basicScore,
      breakdown: {
        parsing: this.calculateParsingScore(parsedCV),
        keywords: this.calculateKeywordScore(parsedCV, context.targetKeywords || []),
        formatting: this.calculateFormattingScore(parsedCV),
        content: this.calculateContentScore(parsedCV)
      },
      issues: this.identifyBasicIssues(parsedCV),
      suggestions: this.generateBasicSuggestions(parsedCV, context),
      keywords: {
        found: this.extractFoundKeywords(parsedCV, context.targetKeywords || []),
        missing: this.extractMissingKeywords(parsedCV, context.targetKeywords || []),
        density: this.calculateKeywordDensity(parsedCV, context.targetKeywords || []),
        suggestions: ['Add more relevant keywords', 'Improve keyword context']
      },
      processingMetadata: {
        timestamp: new Date().toISOString(),
        version: '2.0.0-fallback',
        processingTime: Date.now(),
        confidenceLevel: 0.7
      }
    };
  }

  /**
   * Calculate basic overall score
   */
  private calculateBasicScore(parsedCV: ParsedCV): number {
    const parsingScore = this.calculateParsingScore(parsedCV);
    const formattingScore = this.calculateFormattingScore(parsedCV);
    const contentScore = this.calculateContentScore(parsedCV);
    
    // Weighted average
    return Math.round(
      (parsingScore * 0.4) + 
      (formattingScore * 0.3) + 
      (contentScore * 0.3)
    );
  }

  /**
   * Calculate parsing score for basic analysis
   */
  private calculateParsingScore(parsedCV: ParsedCV): number {
    let score = 0;
    
    // Essential fields
    if (parsedCV.personalInfo?.name) score += 20;
    if (parsedCV.personalInfo?.email) score += 20;
    if (parsedCV.personalInfo?.phone) score += 10;
    if (parsedCV.experience && parsedCV.experience.length > 0) score += 20;
    if (parsedCV.education && parsedCV.education.length > 0) score += 15;
    if (parsedCV.skills) score += 15;
    
    return Math.min(score, 100);
  }

  /**
   * Calculate keyword score for basic analysis
   */
  private calculateKeywordScore(parsedCV: ParsedCV, targetKeywords: string[]): number {
    if (targetKeywords.length === 0) return 60; // Default when no targets
    
    const cvText = this.cvToText(parsedCV);
    const foundKeywords = this.extractFoundKeywords(parsedCV, targetKeywords);
    
    const matchRatio = foundKeywords.length / targetKeywords.length;
    return Math.round(matchRatio * 100);
  }

  /**
   * Calculate formatting score for basic analysis
   */
  private calculateFormattingScore(parsedCV: ParsedCV): number {
    let score = 0;
    
    // Section completeness
    const requiredSections = ['personalInfo', 'experience', 'education', 'skills'];
    const presentSections = requiredSections.filter(section => 
      this.hasValidSection(parsedCV, section)
    );
    score += (presentSections.length / requiredSections.length) * 40;
    
    // Contact info quality
    if (parsedCV.personalInfo?.email?.includes('@')) score += 20;
    if (parsedCV.personalInfo?.phone) score += 20;
    if (parsedCV.personalInfo?.name && parsedCV.personalInfo.name.length > 2) score += 20;
    
    return Math.min(score, 100);
  }

  /**
   * Calculate content score for basic analysis
   */
  private calculateContentScore(parsedCV: ParsedCV): number {
    let score = 0;
    
    // Experience quality
    if (parsedCV.experience && parsedCV.experience.length > 0) {
      const avgDescLength = parsedCV.experience.reduce((sum, exp) => 
        sum + (exp.description?.length || 0), 0
      ) / parsedCV.experience.length;
      
      score += Math.min(avgDescLength / 10, 40); // Up to 40 points for descriptions
    }
    
    // Professional summary
    if (parsedCV.personalInfo?.summary && parsedCV.personalInfo.summary.length > 50) {
      score += 30;
    }
    
    // Skills depth
    const skillsCount = this.countSkills(parsedCV.skills);
    score += Math.min(skillsCount / 2, 30); // Up to 30 points for skills
    
    return Math.min(score, 100);
  }

  /**
   * Assess basic completeness
   */
  private assessBasicCompleteness(parsedCV: ParsedCV): number {
    const requiredFields = [
      'personalInfo.name',
      'personalInfo.email',
      'experience',
      'education',
      'skills'
    ];
    
    let completed = 0;
    if (parsedCV.personalInfo?.name) completed++;
    if (parsedCV.personalInfo?.email) completed++;
    if (parsedCV.experience && parsedCV.experience.length > 0) completed++;
    if (parsedCV.education && parsedCV.education.length > 0) completed++;
    if (parsedCV.skills) completed++;
    
    return Math.round((completed / requiredFields.length) * 100);
  }

  /**
   * Assess basic structure
   */
  private assessBasicStructure(parsedCV: ParsedCV): number {
    let score = 0;
    
    // Check section order and presence
    const sections = ['personalInfo', 'experience', 'education', 'skills'];
    sections.forEach(section => {
      if (this.hasValidSection(parsedCV, section)) score += 25;
    });
    
    return score;
  }

  /**
   * Assess basic content quality
   */
  private assessBasicContent(parsedCV: ParsedCV): number {
    let score = 0;
    
    // Experience descriptions
    if (parsedCV.experience) {
      const hasGoodDescriptions = parsedCV.experience.some(exp => 
        exp.description && exp.description.length > 100
      );
      if (hasGoodDescriptions) score += 40;
    }
    
    // Professional summary
    if (parsedCV.personalInfo?.summary && parsedCV.personalInfo.summary.length > 50) {
      score += 30;
    }
    
    // Skills variety
    const skillsCount = this.countSkills(parsedCV.skills);
    score += Math.min(skillsCount * 2, 30);
    
    return Math.min(score, 100);
  }

  /**
   * Perform basic keyword analysis
   */
  private performBasicKeywordAnalysis(parsedCV: ParsedCV, targetKeywords: string[]): any {
    const cvText = this.cvToText(parsedCV);
    const foundKeywords = this.extractFoundKeywords(parsedCV, targetKeywords);
    const missingKeywords = targetKeywords.filter(kw => 
      !foundKeywords.includes(kw.toLowerCase())
    );
    
    return {
      found: foundKeywords,
      missing: missingKeywords,
      density: this.calculateKeywordDensity(parsedCV, targetKeywords),
      total: targetKeywords.length
    };
  }

  /**
   * Extract recommended keywords from recommendations
   */
  private extractRecommendedKeywords(recommendations: PrioritizedRecommendation[]): string[] {
    const keywords: string[] = [];
    
    recommendations.forEach(rec => {
      if (rec.category === 'keywords' && rec.issue.includes('Missing')) {
        // Extract keywords from issue description
        const matches = rec.issue.match(/Missing.*?:(.*?)(?:\.|$)/);
        if (matches && matches[1]) {
          const extractedKeywords = matches[1]
            .split(/[,;]/)
            .map(kw => kw.trim())
            .filter(kw => kw.length > 2);
          keywords.push(...extractedKeywords);
        }
      }
    });
    
    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Optimize text with keywords
   */
  private optimizeTextWithKeywords(text: string, keywords: string[]): string {
    let optimizedText = text;
    
    // Simple keyword integration (can be enhanced with NLP)
    keywords.forEach(keyword => {
      if (!text.toLowerCase().includes(keyword.toLowerCase()) && 
          text.length + keyword.length < 1000) {
        // Find appropriate place to insert keyword
        if (text.includes('.')) {
          const sentences = text.split('.');
          if (sentences.length > 1) {
            optimizedText = sentences[0] + `, including ${keyword}.` + sentences.slice(1).join('.');
          }
        }
      }
    });
    
    return optimizedText;
  }

  /**
   * Identify basic issues
   */
  private identifyBasicIssues(parsedCV: ParsedCV): any[] {
    const issues: any[] = [];
    
    if (!parsedCV.personalInfo?.name) {
      issues.push({ type: 'critical', description: 'Missing name in personal information', severity: 'high' });
    }
    
    if (!parsedCV.personalInfo?.email) {
      issues.push({ type: 'critical', description: 'Missing email address', severity: 'high' });
    }
    
    if (!parsedCV.experience || parsedCV.experience.length === 0) {
      issues.push({ type: 'warning', description: 'No work experience provided', severity: 'medium' });
    }
    
    if (!parsedCV.skills) {
      issues.push({ type: 'warning', description: 'No skills section found', severity: 'medium' });
    }
    
    if (!parsedCV.personalInfo?.summary) {
      issues.push({ type: 'info', description: 'Consider adding a professional summary', severity: 'low' });
    }
    
    return issues;
  }

  /**
   * Generate basic suggestions
   */
  private generateBasicSuggestions(parsedCV: ParsedCV, context: OptimizationContext): any[] {
    const suggestions: any[] = [];
    
    if (!parsedCV.personalInfo?.summary) {
      suggestions.push({
        type: 'improvement',
        description: 'Add a professional summary to highlight your key strengths',
        impact: 'medium',
        implementation: 'easy'
      });
    }
    
    if (context.targetKeywords && context.targetKeywords.length > 0) {
      const missingKeywords = this.extractMissingKeywords(parsedCV, context.targetKeywords);
      if (missingKeywords.length > 0) {
        suggestions.push({
          type: 'improvement',
          description: `Include relevant keywords: ${missingKeywords.slice(0, 3).join(', ')}`,
          impact: 'high',
          implementation: 'medium'
        });
      }
    }
    
    if (parsedCV.experience) {
      const weakDescriptions = parsedCV.experience.filter(exp => 
        !exp.description || exp.description.length < 50
      );
      if (weakDescriptions.length > 0) {
        suggestions.push({
          type: 'improvement',
          description: 'Enhance experience descriptions with specific achievements and responsibilities',
          impact: 'high',
          implementation: 'hard'
        });
      }
    }
    
    return suggestions;
  }

  /**
   * Extract found keywords
   */
  private extractFoundKeywords(parsedCV: ParsedCV, targetKeywords: string[]): string[] {
    const cvText = this.cvToText(parsedCV).toLowerCase();
    
    return targetKeywords.filter(keyword => 
      cvText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Extract missing keywords
   */
  private extractMissingKeywords(parsedCV: ParsedCV, targetKeywords: string[]): string[] {
    const foundKeywords = this.extractFoundKeywords(parsedCV, targetKeywords);
    
    return targetKeywords.filter(keyword => 
      !foundKeywords.includes(keyword)
    );
  }

  /**
   * Calculate keyword density
   */
  private calculateKeywordDensity(parsedCV: ParsedCV, targetKeywords: string[]): number {
    const cvText = this.cvToText(parsedCV);
    const totalWords = cvText.split(/\s+/).length;
    
    if (totalWords === 0) return 0;
    
    let keywordCount = 0;
    targetKeywords.forEach(keyword => {
      const matches = (cvText.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
      keywordCount += matches;
    });
    
    return keywordCount / totalWords;
  }

  // Helper methods

  private hasValidSection(parsedCV: ParsedCV, sectionName: string): boolean {
    const section = parsedCV[sectionName as keyof ParsedCV];
    if (!section) return false;
    
    if (Array.isArray(section)) {
      return section.length > 0;
    }
    
    if (typeof section === 'object') {
      return Object.keys(section).length > 0;
    }
    
    return true;
  }

  private countSkills(skills: any): number {
    if (Array.isArray(skills)) {
      return skills.length;
    }
    if (typeof skills === 'string') {
      return skills.split(/[,;|\n]/).filter(s => s.trim().length > 0).length;
    }
    if (typeof skills === 'object' && skills !== null) {
      return Object.values(skills).flat().length;
    }
    return 0;
  }

  private cvToText(cv: ParsedCV): string {
    const sections: string[] = [];

    if (cv.personalInfo?.summary) sections.push(cv.personalInfo.summary);
    if (cv.experience) {
      cv.experience.forEach(exp => {
        if (exp.role) sections.push(exp.role);
        if (exp.company) sections.push(exp.company);
        if (exp.description) sections.push(exp.description);
      });
    }
    if (cv.education) {
      cv.education.forEach(edu => {
        if (edu.degree) sections.push(edu.degree);
        if (edu.institution) sections.push(edu.institution);
      });
    }
    if (cv.skills) {
      const skillsText = this.extractSkillsText(cv.skills);
      sections.push(skillsText);
    }

    return sections.filter(section => section.trim().length > 0).join(' ');
  }

  private extractSkillsText(skills: any): string {
    if (Array.isArray(skills)) {
      return skills.join(' ');
    }
    if (typeof skills === 'string') {
      return skills;
    }
    if (typeof skills === 'object' && skills !== null) {
      return Object.values(skills).flat().join(' ');
    }
    return '';
  }
}