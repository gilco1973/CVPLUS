/**
 * Advanced Prompt Engineering Service
 * 
 * Multi-layer prompt architecture for enhanced video script generation
 * Features: Context analysis, industry optimization, quality scoring
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { ParsedCV } from '../types/enhanced-models';
import OpenAI from 'openai';
import { config } from '../config/environment';
import { industryTemplatesService, IndustryTemplate } from './industry-templates.service';

export interface VideoGenerationOptions {
  duration?: 'short' | 'medium' | 'long';
  style?: 'professional' | 'friendly' | 'energetic';
  avatarStyle?: 'realistic' | 'illustrated' | 'corporate';
  background?: 'office' | 'modern' | 'gradient' | 'custom';
  includeSubtitles?: boolean;
  includeNameCard?: boolean;
}

export interface PromptEngineOptions extends VideoGenerationOptions {
  targetIndustry?: string;
  customPersonality?: PersonalityProfile;
  optimizationLevel?: 'basic' | 'enhanced' | 'premium';
}

export interface PersonalityProfile {
  communicationStyle: 'direct' | 'collaborative' | 'analytical' | 'creative';
  leadershipType: 'visionary' | 'operational' | 'servant' | 'strategic';
  technicalDepth: 'specialist' | 'generalist' | 'architect' | 'manager';
  industryFocus: string;
  careerStage: 'early' | 'mid' | 'senior' | 'executive';
  personalityTraits: string[];
}

export interface ScriptQualityMetrics {
  overallScore: number; // 0-10 scale
  engagementScore: number; // 0-10 scale
  industryAlignment: number; // 0-1 scale
  personalityMatch: number; // 0-1 scale
  technicalAccuracy: number; // 0-1 scale
  deliveryOptimization: number; // 0-1 scale
  professionalImpact: number; // 0-1 scale
  feedback: string[];
}

export interface EnhancedScriptResult {
  script: string;
  qualityMetrics: ScriptQualityMetrics;
  industryTemplate: string;
  personalityProfile: PersonalityProfile;
  optimizationLayers: {
    contextLayer: string;
    optimizationLayer: string;
    productionLayer: string;
  };
  generationTime: number;
}

/**
 * Advanced Prompt Engine with multi-layer architecture
 */
export class AdvancedPromptEngine {
  protected openai: OpenAI;
  private qualityThresholds: Map<string, number>;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai?.apiKey || process.env.OPENAI_API_KEY || ''
    });

    this.qualityThresholds = new Map([
      ['minimum', 7.0],
      ['target', 8.5],
      ['premium', 9.0]
    ]);
  }

  /**
   * Generate enhanced video script with multi-layer optimization
   */
  async generateEnhancedScript(
    cv: ParsedCV,
    options: PromptEngineOptions = {}
  ): Promise<EnhancedScriptResult> {
    const startTime = Date.now();

    try {
      // Layer 1: Context Analysis
      const contextLayer = await this.buildContextLayer(cv);
      
      // Layer 2: Industry & Personality Optimization
      const personalityProfile = await this.analyzePersonality(cv);
      const industryTemplate = this.selectIndustryTemplate(cv, options.targetIndustry);
      const optimizationLayer = await this.buildOptimizationLayer(
        cv, 
        personalityProfile, 
        industryTemplate, 
        options
      );

      // Layer 3: Production Optimization
      const productionLayer = await this.buildProductionLayer(
        optimizationLayer,
        options
      );

      // Generate final script
      const script = await this.synthesizeScript(
        contextLayer,
        optimizationLayer,
        productionLayer,
        options
      );

      // Quality assessment
      const qualityMetrics = await this.assessScriptQuality(
        script,
        cv,
        personalityProfile,
        industryTemplate
      );

      // Iterative improvement if needed
      const finalScript = await this.optimizeScriptQuality(
        script,
        qualityMetrics,
        options.optimizationLevel || 'enhanced'
      );

      const generationTime = Date.now() - startTime;

      return {
        script: finalScript,
        qualityMetrics: await this.assessScriptQuality(
          finalScript,
          cv,
          personalityProfile,
          industryTemplate
        ),
        industryTemplate: industryTemplate.name,
        personalityProfile,
        optimizationLayers: {
          contextLayer,
          optimizationLayer,
          productionLayer
        },
        generationTime
      };

    } catch (error: any) {
      throw new Error(`Enhanced prompt generation failed: ${error.message}`);
    }
  }

  /**
   * Layer 1: Deep Context Analysis
   */
  private async buildContextLayer(cv: ParsedCV): Promise<string> {
    const analysisPrompt = `Analyze this professional profile for video script generation:

Professional Information:
- Name: ${cv.personalInfo?.name || cv.personal?.name || 'Professional'}
- Title: ${cv.personalInfo?.title || cv.personal?.title || 'Not specified'}
- Current Role: ${cv.experience?.[0]?.position || 'Professional'}
- Current Company: ${cv.experience?.[0]?.company || 'Organization'}
- Experience Years: ${this.calculateExperienceYears(cv)}
- Industry: ${this.detectIndustry(cv)}

Key Strengths:
${this.extractKeyStrengths(cv)}

Career Progression:
${this.analyzeCareerProgression(cv)}

Technical Expertise:
${this.extractTechnicalExpertise(cv)}

Provide a comprehensive context analysis focusing on:
1. Professional identity and positioning
2. Core value proposition
3. Leadership qualities and achievements
4. Technical depth and specialization
5. Communication style indicators
6. Career trajectory insights

Format as structured analysis for script generation.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'You are a professional career analyst specializing in executive positioning and personal branding.'
        }, {
          role: 'user',
          content: analysisPrompt
        }],
        temperature: 0.3,
        max_tokens: 800
      });

      return response.choices[0].message?.content || '';
    } catch (error) {
      return this.generateFallbackContext(cv);
    }
  }

  /**
   * Layer 2: Industry & Personality Optimization
   */
  private async buildOptimizationLayer(
    cv: ParsedCV,
    personality: PersonalityProfile,
    industryTemplate: any,
    options: PromptEngineOptions
  ): Promise<string> {
    const optimizationPrompt = `Create industry-optimized messaging strategy:

Context Analysis: Based on professional background and achievements
Industry Focus: ${industryTemplate.name}
Personality Type: ${personality.communicationStyle} communicator, ${personality.leadershipType} leader
Career Stage: ${personality.careerStage}
Technical Depth: ${personality.technicalDepth}

Industry Requirements:
${industryTemplate.requirements.join('\n')}

Optimization Strategy:
1. Value proposition alignment with ${industryTemplate.name} sector
2. Communication style optimization for ${personality.communicationStyle} approach
3. Achievement framing for maximum impact
4. Technical credibility establishment
5. Leadership positioning strategy

Provide optimized messaging framework including:
- Hook strategy
- Value proposition
- Credibility indicators
- Differentiation factors
- Call-to-action approach`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: `You are a strategic communications expert specializing in ${industryTemplate.name} sector professional positioning.`
        }, {
          role: 'user',
          content: optimizationPrompt
        }],
        temperature: 0.4,
        max_tokens: 600
      });

      return response.choices[0].message?.content || '';
    } catch (error) {
      return this.generateFallbackOptimization(cv, personality, industryTemplate);
    }
  }

  /**
   * Layer 3: Production Optimization for Avatar Delivery
   */
  private async buildProductionLayer(
    optimizationStrategy: string,
    options: PromptEngineOptions
  ): Promise<string> {
    const duration = options.duration || 'medium';
    const style = options.style || 'professional';
    
    const productionPrompt = `Optimize for video avatar delivery:

Messaging Strategy: ${optimizationStrategy}

Technical Requirements:
- Duration: ${duration} (${this.getDurationSpecs(duration)})
- Delivery Style: ${style}
- Avatar Optimization: Natural speech patterns, appropriate pacing
- Engagement: Maintain viewer attention throughout

Production Optimization:
1. Speech rhythm and natural pauses
2. Emphasis placement for key messages
3. Transition smoothness between concepts
4. Emotional resonance points
5. Call-to-action timing and placement

Provide production-ready script framework with:
- Timing markers
- Emphasis indicators
- Pause placements
- Engagement hooks
- Natural conclusion`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'You are a video production specialist optimizing scripts for AI avatar delivery and viewer engagement.'
        }, {
          role: 'user',
          content: productionPrompt
        }],
        temperature: 0.2,
        max_tokens: 500
      });

      return response.choices[0].message?.content || '';
    } catch (error) {
      return this.generateFallbackProduction(duration, style);
    }
  }

  /**
   * Synthesize final script from all layers
   */
  private async synthesizeScript(
    contextLayer: string,
    optimizationLayer: string,
    productionLayer: string,
    options: PromptEngineOptions
  ): Promise<string> {
    const duration = options.duration || 'medium';
    const targetWords = this.getTargetWordCount(duration);

    const synthesisPrompt = `Create final video script using multi-layer analysis:

CONTEXT FOUNDATION:
${contextLayer}

OPTIMIZATION STRATEGY:
${optimizationLayer}

PRODUCTION REQUIREMENTS:
${productionLayer}

SCRIPT REQUIREMENTS:
- Exactly ${targetWords} words
- First-person delivery
- Natural, conversational tone
- Professional yet engaging
- Clear structure with smooth transitions
- Strong opening hook
- Compelling conclusion with call-to-action

Create the final script that integrates all layers seamlessly.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'You are a master scriptwriter creating compelling video introductions that integrate strategic positioning with natural delivery.'
        }, {
          role: 'user',
          content: synthesisPrompt
        }],
        temperature: 0.6,
        max_tokens: targetWords * 2
      });

      return response.choices[0].message?.content || '';
    } catch (error) {
      throw error;
    }
  }


  /**
   * Analyze personality from CV data
   */
  private async analyzePersonality(cv: ParsedCV): Promise<PersonalityProfile> {
    // Simplified personality analysis - will be enhanced
    const industry = this.detectIndustry(cv);
    const experience = this.calculateExperienceYears(cv);
    
    return {
      communicationStyle: 'collaborative',
      leadershipType: experience > 8 ? 'strategic' : 'operational',
      technicalDepth: this.assessTechnicalDepth(cv),
      industryFocus: industry,
      careerStage: this.determineCareerStage(experience),
      personalityTraits: ['analytical', 'results-driven', 'collaborative']
    };
  }

  /**
   * Helper methods for CV analysis
   */
  protected calculateExperienceYears(cv: ParsedCV): number {
    if (!cv.experience || cv.experience.length === 0) return 0;
    
    let totalYears = 0;
    for (const exp of cv.experience) {
      const years = this.parseDurationToYears(exp.duration);
      totalYears += years;
    }
    return Math.min(totalYears, 20); // Cap at 20 years for calculation
  }

  protected detectIndustry(cv: ParsedCV): string {
    const skills = this.getTechnicalSkills(cv);
    const experience = cv.experience?.[0]?.company?.toLowerCase() || '';
    
    if (skills.some(skill => 
      ['javascript', 'python', 'react', 'node', 'aws', 'docker'].includes(skill.toLowerCase())
    )) {
      return 'Technology';
    }
    
    if (experience.includes('marketing') || experience.includes('sales')) {
      return 'Marketing & Sales';
    }
    
    if (experience.includes('finance') || experience.includes('consulting')) {
      return 'Finance & Consulting';
    }
    
    return 'General Business';
  }

  protected getTechnicalSkills(cv: ParsedCV): string[] {
    if (!cv.skills) return [];
    return Array.isArray(cv.skills) ? cv.skills : (cv.skills.technical || []);
  }

  private parseDurationToYears(duration: string): number {
    const yearMatch = duration.match(/(\d+)\s*year/i);
    const monthMatch = duration.match(/(\d+)\s*month/i);
    
    let years = yearMatch ? parseInt(yearMatch[1]) : 0;
    const months = monthMatch ? parseInt(monthMatch[1]) : 0;
    
    return years + (months / 12);
  }

  protected assessTechnicalDepth(cv: ParsedCV): 'specialist' | 'generalist' | 'architect' | 'manager' {
    const skills = this.getTechnicalSkills(cv);
    const experience = this.calculateExperienceYears(cv);
    
    if (skills.length > 15 && experience > 8) return 'architect';
    if (skills.length > 10) return 'specialist';
    if (experience > 5) return 'manager';
    return 'generalist';
  }

  protected determineCareerStage(experience: number): 'early' | 'mid' | 'senior' | 'executive' {
    if (experience < 3) return 'early';
    if (experience < 8) return 'mid';
    if (experience < 15) return 'senior';
    return 'executive';
  }

  protected selectIndustryTemplate(cv: ParsedCV, targetIndustry?: string): IndustryTemplate {
    if (targetIndustry) {
      const template = industryTemplatesService.getTemplate(targetIndustry);
      if (template) return template;
    }

    // Use AI-powered template recommendation
    const recommendations = industryTemplatesService.analyzeAndRecommendTemplate(cv);
    if (recommendations.length > 0 && recommendations[0].score > 0.6) {
      const bestTemplate = industryTemplatesService.getTemplate(recommendations[0].templateId);
      if (bestTemplate) return bestTemplate;
    }

    // Fallback to general business template
    return industryTemplatesService.getTemplate('general-business') || 
           industryTemplatesService.getAllTemplates()[0];
  }

  private async assessScriptQuality(
    script: string,
    cv: ParsedCV,
    personality: PersonalityProfile,
    industryTemplate: IndustryTemplate
  ): Promise<ScriptQualityMetrics> {
    try {
      // Multi-dimensional quality assessment
      const engagementScore = await this.assessEngagement(script);
      const industryAlignment = this.assessIndustryAlignment(script, industryTemplate);
      const personalityMatch = this.assessPersonalityMatch(script, personality);
      const technicalAccuracy = this.assessTechnicalAccuracy(script, cv);
      const deliveryOptimization = this.assessDeliveryOptimization(script);
      const professionalImpact = this.assessProfessionalImpact(script, cv);

      // Calculate weighted overall score
      const overallScore = (
        engagementScore * 0.25 +
        industryAlignment * 10 * 0.20 +
        personalityMatch * 10 * 0.15 +
        technicalAccuracy * 10 * 0.15 +
        deliveryOptimization * 10 * 0.15 +
        professionalImpact * 10 * 0.10
      );

      const feedback = this.generateQualityFeedback(
        script, 
        engagementScore, 
        industryAlignment, 
        personalityMatch
      );

      return {
        overallScore: Math.round(overallScore * 10) / 10,
        engagementScore: Math.round(engagementScore * 10) / 10,
        industryAlignment,
        personalityMatch,
        technicalAccuracy,
        deliveryOptimization,
        professionalImpact,
        feedback
      };

    } catch (error) {
      // Fallback quality metrics
      return {
        overallScore: 7.5,
        engagementScore: 7.0,
        industryAlignment: 0.75,
        personalityMatch: 0.80,
        technicalAccuracy: 0.70,
        deliveryOptimization: 0.80,
        professionalImpact: 0.75,
        feedback: ['Quality assessment unavailable - using baseline scores']
      };
    }
  }

  /**
   * Assess script engagement potential using AI analysis
   */
  private async assessEngagement(script: string): Promise<number> {
    try {
      const engagementPrompt = `Analyze this video script for viewer engagement potential:

Script: "${script}"

Rate the script on a scale of 1-10 for each criterion:
1. Opening hook strength (captures attention immediately)
2. Narrative flow and pacing (maintains interest throughout)
3. Emotional connection (creates personal resonance)
4. Call-to-action effectiveness (motivates viewer response)
5. Professional credibility (establishes trust and expertise)

Provide only a JSON response with:
{
  "hookScore": number,
  "flowScore": number,
  "emotionalScore": number,
  "ctaScore": number,
  "credibilityScore": number,
  "overallEngagement": number,
  "reasoning": "brief explanation"
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'You are an expert in video content engagement analysis. Provide precise numerical scores based on proven engagement principles.'
        }, {
          role: 'user',
          content: engagementPrompt
        }],
        temperature: 0.1,
        max_tokens: 300
      });

      const result = JSON.parse(response.choices[0].message?.content || '{}');
      return result.overallEngagement || 7.0;

    } catch (error) {
      return this.calculateBasicEngagement(script);
    }
  }

  /**
   * Assess alignment with industry template requirements
   */
  protected assessIndustryAlignment(script: string, template: IndustryTemplate): number {
    const scriptLower = script.toLowerCase();
    let alignmentScore = 0;

    // Check vocabulary focus alignment
    const vocabularyMatches = template.vocabularyFocus.filter(word =>
      scriptLower.includes(word.toLowerCase())
    ).length;
    const vocabularyScore = vocabularyMatches / template.vocabularyFocus.length;

    // Check industry keyword presence
    const keywordMatches = template.commonKeywords.filter(keyword =>
      scriptLower.includes(keyword.toLowerCase())
    ).length;
    const keywordScore = Math.min(keywordMatches / (template.commonKeywords.length * 0.3), 1);

    // Check against avoid keywords (penalty)
    const avoidMatches = template.avoidKeywords.filter(keyword =>
      scriptLower.includes(keyword.toLowerCase())
    ).length;
    const avoidPenalty = avoidMatches * 0.1;

    alignmentScore = (vocabularyScore * 0.6 + keywordScore * 0.4) - avoidPenalty;
    return Math.max(Math.min(alignmentScore, 1), 0);
  }

  /**
   * Assess how well script matches personality profile
   */
  protected assessPersonalityMatch(script: string, personality: PersonalityProfile): number {
    const scriptLower = script.toLowerCase();
    let matchScore = 0;

    // Communication style alignment
    const styleIndicators = this.getStyleIndicators(personality.communicationStyle);
    const styleMatches = styleIndicators.filter(indicator =>
      scriptLower.includes(indicator.toLowerCase())
    ).length;
    const styleScore = styleMatches / styleIndicators.length;

    // Personality traits alignment
    const traitIndicators = this.getTraitIndicators(personality.personalityTraits);
    const traitMatches = traitIndicators.filter(indicator =>
      scriptLower.includes(indicator.toLowerCase())
    ).length;
    const traitScore = traitMatches / Math.max(traitIndicators.length, 1);

    matchScore = (styleScore * 0.6 + traitScore * 0.4);
    return Math.min(matchScore, 1);
  }

  /**
   * Assess technical accuracy and relevance
   */
  protected assessTechnicalAccuracy(script: string, cv: ParsedCV): number {
    const skills = this.getTechnicalSkills(cv);
    const scriptLower = script.toLowerCase();

    if (skills.length === 0) return 0.8; // Default if no technical skills

    // Check if mentioned skills are accurate
    const mentionedSkills = skills.filter(skill =>
      scriptLower.includes(skill.toLowerCase())
    );

    // Accuracy based on skill relevance and correct usage
    const accuracyScore = mentionedSkills.length > 0 ? 
      Math.min(mentionedSkills.length / (skills.length * 0.4), 1) : 0.7;

    return accuracyScore;
  }

  /**
   * Assess script optimization for avatar delivery
   */
  protected assessDeliveryOptimization(script: string): number {
    let score = 0;

    // Check for natural pauses and pacing
    const hasPauses = script.includes('...') || script.includes(',');
    if (hasPauses) score += 0.2;

    // Check sentence length variation
    const sentences = script.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
    if (avgLength < 120) score += 0.2; // Optimal for avatar delivery

    // Check for natural speech patterns
    const conversationalWords = ['I', 'you', 'we', 'let\'s', 'together', 'passionate'];
    const conversationalScore = conversationalWords.filter(word =>
      script.toLowerCase().includes(word.toLowerCase())
    ).length / conversationalWords.length;
    score += conversationalScore * 0.3;

    // Check for clear structure
    const hasStructure = script.toLowerCase().includes('hello') || 
                        script.toLowerCase().includes('hi') ||
                        script.toLowerCase().includes('let\'s') ||
                        script.toLowerCase().includes('connect');
    if (hasStructure) score += 0.3;

    return Math.min(score, 1);
  }

  /**
   * Assess professional impact potential
   */
  protected assessProfessionalImpact(script: string, cv: ParsedCV): number {
    const scriptLower = script.toLowerCase();
    let impactScore = 0;

    // Check for achievement mentions
    const achievements = cv.achievements || [];
    const experienceAchievements = cv.experience?.flatMap(exp => exp.achievements || []) || [];
    const allAchievements = [...achievements, ...experienceAchievements];

    const achievementMentions = allAchievements.filter(achievement =>
      scriptLower.includes(achievement.toLowerCase().substring(0, 20))
    ).length;

    if (achievementMentions > 0) impactScore += 0.3;

    // Check for impact keywords
    const impactKeywords = ['results', 'success', 'improve', 'grow', 'lead', 'achieve'];
    const impactMatches = impactKeywords.filter(keyword =>
      scriptLower.includes(keyword)
    ).length;
    impactScore += (impactMatches / impactKeywords.length) * 0.4;

    // Check for professional credibility indicators
    const credibilityIndicators = ['experience', 'expertise', 'specialist', 'professional'];
    const credibilityMatches = credibilityIndicators.filter(indicator =>
      scriptLower.includes(indicator)
    ).length;
    impactScore += (credibilityMatches / credibilityIndicators.length) * 0.3;

    return Math.min(impactScore, 1);
  }

  /**
   * Generate quality feedback based on assessment
   */
  private generateQualityFeedback(
    script: string,
    engagement: number,
    industryAlignment: number,
    personalityMatch: number
  ): string[] {
    const feedback: string[] = [];

    // Engagement feedback
    if (engagement >= 8.5) {
      feedback.push('Excellent engagement potential with strong hook and flow');
    } else if (engagement >= 7.0) {
      feedback.push('Good engagement level, consider strengthening opening hook');
    } else {
      feedback.push('Engagement needs improvement - enhance storytelling and emotional connection');
    }

    // Industry alignment feedback
    if (industryAlignment >= 0.8) {
      feedback.push('Strong industry vocabulary and messaging alignment');
    } else if (industryAlignment >= 0.6) {
      feedback.push('Good industry relevance, could incorporate more sector-specific language');
    } else {
      feedback.push('Industry alignment needs improvement - add more relevant keywords and concepts');
    }

    // Personality match feedback
    if (personalityMatch >= 0.8) {
      feedback.push('Excellent personality and communication style match');
    } else if (personalityMatch >= 0.6) {
      feedback.push('Good personality alignment with room for style optimization');
    } else {
      feedback.push('Communication style should better reflect professional personality');
    }

    // Length feedback
    const wordCount = script.split(' ').length;
    if (wordCount < 60) {
      feedback.push('Script may be too short - consider adding more detail');
    } else if (wordCount > 250) {
      feedback.push('Script may be too long - consider condensing key messages');
    }

    return feedback;
  }

  /**
   * Helper methods for quality assessment
   */
  private calculateBasicEngagement(script: string): number {
    const wordCount = script.split(' ').length;
    const hasHook = script.toLowerCase().startsWith('hi') || 
                   script.toLowerCase().startsWith('hello') ||
                   script.toLowerCase().includes('passionate');
    const hasCTA = script.toLowerCase().includes('connect') ||
                  script.toLowerCase().includes('reach out') ||
                  script.toLowerCase().includes('together');
    
    let score = 6.0; // Base score
    if (hasHook) score += 0.5;
    if (hasCTA) score += 0.5;
    if (wordCount >= 60 && wordCount <= 200) score += 1.0;
    
    return Math.min(score, 10);
  }

  private getStyleIndicators(style: string): string[] {
    const indicators: Record<string, string[]> = {
      direct: ['focus', 'results', 'efficient', 'clear', 'precise'],
      collaborative: ['together', 'team', 'partnership', 'collective', 'shared'],
      analytical: ['analyze', 'data', 'insight', 'systematic', 'methodical'],
      creative: ['innovative', 'creative', 'unique', 'imaginative', 'original']
    };
    return indicators[style] || ['professional', 'experienced', 'skilled'];
  }

  private getTraitIndicators(traits: string[]): string[] {
    const traitMap: Record<string, string[]> = {
      analytical: ['analyze', 'data', 'systematic'],
      'results-driven': ['results', 'achieve', 'success'],
      collaborative: ['team', 'together', 'partnership'],
      innovative: ['innovative', 'creative', 'new'],
      'detail-oriented': ['precise', 'thorough', 'careful'],
      strategic: ['strategy', 'vision', 'planning']
    };

    return traits.flatMap(trait => traitMap[trait] || []);
  }

  private async optimizeScriptQuality(
    script: string,
    metrics: ScriptQualityMetrics,
    level: string
  ): Promise<string> {
    const threshold = this.qualityThresholds.get(level) || 8.5;
    
    if (metrics.overallScore >= threshold) {
      return script;
    }
    
    // Quality optimization logic would go here
    return script;
  }

  protected getTargetWordCount(duration: 'short' | 'medium' | 'long'): number {
    const wordCounts = { short: 75, medium: 150, long: 225 };
    return wordCounts[duration];
  }

  private getDurationSpecs(duration: string): string {
    const specs = {
      short: '30 seconds, 75 words',
      medium: '60 seconds, 150 words', 
      long: '90 seconds, 225 words'
    };
    return specs[duration as keyof typeof specs] || specs.medium;
  }

  // Fallback methods
  private generateFallbackContext(cv: ParsedCV): string {
    return `Professional with expertise in ${this.getTechnicalSkills(cv).slice(0, 3).join(', ')}`;
  }

  private generateFallbackOptimization(cv: ParsedCV, personality: PersonalityProfile, template: any): string {
    return `Focus on ${personality.industryFocus} sector positioning with ${personality.communicationStyle} approach`;
  }

  private generateFallbackProduction(duration: string, style: string): string {
    return `${duration} format with ${style} delivery style, natural pacing and clear transitions`;
  }

  private extractKeyStrengths(cv: ParsedCV): string {
    const skills = this.getTechnicalSkills(cv).slice(0, 5);
    const achievements = cv.achievements?.slice(0, 3) || [];
    return [...skills, ...achievements].join('\n- ');
  }

  private analyzeCareerProgression(cv: ParsedCV): string {
    if (!cv.experience || cv.experience.length === 0) return 'Professional experience';
    
    const progression = cv.experience.slice(0, 3).map(exp => 
      `${exp.position} at ${exp.company}`
    ).join(' → ');
    
    return progression;
  }

  private extractTechnicalExpertise(cv: ParsedCV): string {
    const skills = this.getTechnicalSkills(cv);
    if (skills.length === 0) return 'Various professional skills';
    
    return skills.slice(0, 8).join(', ');
  }
}

/**
 * Error handling and fallback mechanisms
 */
export enum PromptEngineErrorType {
  OPENAI_API_ERROR = 'openai_api_error',
  CONTEXT_ANALYSIS_FAILED = 'context_analysis_failed',
  OPTIMIZATION_FAILED = 'optimization_failed',
  PRODUCTION_LAYER_FAILED = 'production_layer_failed',
  QUALITY_ASSESSMENT_FAILED = 'quality_assessment_failed',
  INDUSTRY_TEMPLATE_ERROR = 'industry_template_error',
  SCRIPT_SYNTHESIS_FAILED = 'script_synthesis_failed',
  INVALID_CV_DATA = 'invalid_cv_data'
}

export class PromptEngineError extends Error {
  constructor(
    public type: PromptEngineErrorType,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'PromptEngineError';
  }
}

/**
 * Enhanced error handling with comprehensive fallback mechanisms
 */
export class EnhancedPromptEngineWithFallbacks extends AdvancedPromptEngine {
  private fallbackAttempts: number = 0;
  private maxFallbackAttempts: number = 3;

  async generateEnhancedScript(
    cv: ParsedCV,
    options: PromptEngineOptions = {}
  ): Promise<EnhancedScriptResult> {
    this.fallbackAttempts = 0;
    
    try {
      return await this.generateWithFallbacks(cv, options);
    } catch (error: any) {
      
      // Ultimate fallback: Generate basic template script
      const fallbackScript = this.generateUltimateFallbackScript(cv, options);
      
      return {
        script: fallbackScript,
        qualityMetrics: {
          overallScore: 6.0,
          engagementScore: 6.0,
          industryAlignment: 0.5,
          personalityMatch: 0.5,
          technicalAccuracy: 0.7,
          deliveryOptimization: 0.6,
          professionalImpact: 0.5,
          feedback: ['Generated using fallback template due to system limitations']
        },
        industryTemplate: 'fallback',
        personalityProfile: this.generateBasicPersonalityProfile(cv),
        optimizationLayers: {
          contextLayer: 'Fallback context analysis',
          optimizationLayer: 'Basic optimization applied',
          productionLayer: 'Standard production formatting'
        },
        generationTime: 0
      };
    }
  }

  private async generateWithFallbacks(
    cv: ParsedCV,
    options: PromptEngineOptions
  ): Promise<EnhancedScriptResult> {
    while (this.fallbackAttempts < this.maxFallbackAttempts) {
      try {
        this.fallbackAttempts++;
        
        if (this.fallbackAttempts === 1) {
          // First attempt: Full enhanced generation
          return await super.generateEnhancedScript(cv, options);
        } else if (this.fallbackAttempts === 2) {
          // Second attempt: Simplified enhanced generation
          return await this.generateSimplifiedEnhanced(cv, options);
        } else {
          // Third attempt: Basic enhanced with minimal AI calls
          return await this.generateMinimalEnhanced(cv, options);
        }
      } catch (error: any) {
        
        if (this.fallbackAttempts >= this.maxFallbackAttempts) {
          throw new PromptEngineError(
            PromptEngineErrorType.SCRIPT_SYNTHESIS_FAILED,
            'All enhanced generation attempts failed',
            error
          );
        }
        
        // Add exponential backoff delay
        await this.delay(Math.pow(2, this.fallbackAttempts) * 1000);
      }
    }
    
    throw new Error('Maximum fallback attempts exceeded');
  }

  /**
   * Simplified enhanced generation with reduced AI calls
   */
  private async generateSimplifiedEnhanced(
    cv: ParsedCV,
    options: PromptEngineOptions
  ): Promise<EnhancedScriptResult> {
    const startTime = Date.now();
    
    try {
      // Use local analysis instead of AI for some layers
      const contextLayer = this.generateLocalContext(cv);
      const personalityProfile = this.generateBasicPersonalityProfile(cv);
      const industryTemplate = this.selectIndustryTemplateSafe(cv, options.targetIndustry);
      
      // Only use AI for final script synthesis
      const script = await this.synthesizeScriptSimplified(
        contextLayer,
        personalityProfile,
        industryTemplate,
        options
      );

      // Local quality assessment
      const qualityMetrics = this.assessQualityLocal(script, cv, personalityProfile, industryTemplate);

      return {
        script,
        qualityMetrics,
        industryTemplate: industryTemplate?.name || 'general',
        personalityProfile,
        optimizationLayers: {
          contextLayer,
          optimizationLayer: 'Simplified optimization',
          productionLayer: 'Basic production optimization'
        },
        generationTime: Date.now() - startTime
      };
    } catch (error) {
      throw new PromptEngineError(
        PromptEngineErrorType.OPTIMIZATION_FAILED,
        'Simplified enhanced generation failed',
        error
      );
    }
  }

  /**
   * Minimal enhanced generation with no external AI calls
   */
  private async generateMinimalEnhanced(
    cv: ParsedCV,
    options: PromptEngineOptions
  ): Promise<EnhancedScriptResult> {
    const startTime = Date.now();
    
    try {
      const contextLayer = this.generateLocalContext(cv);
      const personalityProfile = this.generateBasicPersonalityProfile(cv);
      const industryTemplate = this.selectIndustryTemplateSafe(cv, options.targetIndustry);
      
      // Generate script using templates only
      const script = this.generateTemplateBasedScript(cv, options, industryTemplate);
      const qualityMetrics = this.assessQualityLocal(script, cv, personalityProfile, industryTemplate);

      return {
        script,
        qualityMetrics,
        industryTemplate: industryTemplate?.name || 'general',
        personalityProfile,
        optimizationLayers: {
          contextLayer,
          optimizationLayer: 'Template-based optimization',
          productionLayer: 'Standard template formatting'
        },
        generationTime: Date.now() - startTime
      };
    } catch (error) {
      throw new PromptEngineError(
        PromptEngineErrorType.PRODUCTION_LAYER_FAILED,
        'Minimal enhanced generation failed',
        error
      );
    }
  }

  /**
   * Local context generation without AI
   */
  private generateLocalContext(cv: ParsedCV): string {
    const name = cv.personalInfo?.name || cv.personal?.name || 'Professional';
    const role = cv.experience?.[0]?.position || 'Professional';
    const company = cv.experience?.[0]?.company || 'organization';
    const skills = this.getTechnicalSkills(cv).slice(0, 5).join(', ');
    
    return `Professional: ${name}\nCurrent Role: ${role} at ${company}\nKey Skills: ${skills}\nExperience Level: ${this.determineCareerStage(this.calculateExperienceYears(cv))}`;
  }

  /**
   * Basic personality profile generation
   */
  private generateBasicPersonalityProfile(cv: ParsedCV): PersonalityProfile {
    const experience = this.calculateExperienceYears(cv);
    const industry = this.detectIndustry(cv);
    const skills = this.getTechnicalSkills(cv);
    
    return {
      communicationStyle: skills.length > 10 ? 'analytical' : 'collaborative',
      leadershipType: experience > 8 ? 'strategic' : 'operational',
      technicalDepth: this.assessTechnicalDepth(cv),
      industryFocus: industry,
      careerStage: this.determineCareerStage(experience),
      personalityTraits: ['professional', 'results-driven', 'experienced']
    };
  }

  /**
   * Safe industry template selection with fallbacks
   */
  private selectIndustryTemplateSafe(cv: ParsedCV, targetIndustry?: string): any {
    try {
      return this.selectIndustryTemplate(cv, targetIndustry);
    } catch (error) {
      return {
        name: 'General Professional',
        vocabularyFocus: ['professional', 'experienced', 'skilled'],
        commonKeywords: ['experience', 'professional', 'skilled'],
        avoidKeywords: [],
        requirements: ['Professional presentation', 'Clear communication']
      };
    }
  }

  /**
   * Simplified script synthesis with reduced complexity
   */
  private async synthesizeScriptSimplified(
    contextLayer: string,
    personality: PersonalityProfile,
    industryTemplate: any,
    options: PromptEngineOptions
  ): Promise<string> {
    const duration = options.duration || 'medium';
    const targetWords = this.getTargetWordCount(duration);
    
    const simplifiedPrompt = `Create a ${targetWords}-word professional video script based on:

Context: ${contextLayer}
Industry: ${industryTemplate?.name || 'Professional'}
Communication Style: ${personality.communicationStyle}

Requirements:
- First person delivery
- Professional and engaging tone
- ${targetWords} words exactly
- Include hook, expertise, and call-to-action

Write a natural, conversational script suitable for video delivery.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Use faster, more reliable model for fallback
        messages: [{
          role: 'system',
          content: 'Create professional video scripts with clear structure and natural delivery.'
        }, {
          role: 'user',
          content: simplifiedPrompt
        }],
        temperature: 0.7,
        max_tokens: targetWords * 2,
// timeout: 30000 // 30 second timeout - not supported in this version
      });

      return response.choices[0].message?.content || this.generateTemplateBasedScript(
        { personalInfo: { name: 'Professional' } } as ParsedCV, 
        options, 
        industryTemplate
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Template-based script generation (no AI required)
   */
  private generateTemplateBasedScript(
    cv: ParsedCV,
    options: PromptEngineOptions,
    industryTemplate?: any
  ): string {
    const duration = options.duration || 'medium';
    const name = cv.personalInfo?.name || cv.personal?.name || 'I';
    const role = cv.experience?.[0]?.position || 'professional';
    const company = cv.experience?.[0]?.company || 'my organization';
    const skills = this.getTechnicalSkills(cv).slice(0, 3).join(', ') || 'various skills';
    
    const templates = {
      short: `Hi, I'm ${name}. As a ${role} at ${company}, I specialize in ${skills}. I'm passionate about delivering results and creating value. Let's connect to explore opportunities together.`,
      
      medium: `Hello! I'm ${name}, a ${role} at ${company}. With expertise in ${skills}, I've built a career focused on excellence and innovation. I thrive on solving complex challenges and collaborating with talented teams. My approach combines technical skills with strategic thinking to deliver meaningful results. I'm always excited to connect with fellow professionals and explore new opportunities. Let's discuss how we can work together.`,
      
      long: `Greetings! I'm ${name}, currently serving as ${role} at ${company}. Throughout my career, I've developed deep expertise in ${skills}, which has enabled me to tackle complex challenges and deliver innovative solutions. I believe in the power of collaboration and continuous learning to drive success. My approach combines technical proficiency with strategic vision, always focusing on creating value and achieving results. Whether you're looking for expertise in ${skills.split(',')[0]}, seeking innovative solutions, or interested in professional collaboration, I'd love to connect. Let's explore how we can work together to achieve remarkable outcomes and drive success forward.`
    };
    
    return templates[duration as keyof typeof templates] || templates.medium;
  }

  /**
   * Local quality assessment without AI calls
   */
  private assessQualityLocal(
    script: string,
    cv: ParsedCV,
    personality: PersonalityProfile,
    industryTemplate: any
  ): ScriptQualityMetrics {
    const wordCount = script.split(' ').length;
    const hasHook = script.toLowerCase().includes('hi') || script.toLowerCase().includes('hello');
    const hasCTA = script.toLowerCase().includes('connect') || script.toLowerCase().includes('together');
    
    // Basic scoring based on simple metrics
    let engagementScore = 6.0;
    if (hasHook) engagementScore += 1.0;
    if (hasCTA) engagementScore += 1.0;
    if (wordCount >= 60 && wordCount <= 200) engagementScore += 0.5;

    const industryAlignment = this.assessIndustryAlignment(script, industryTemplate);
    const personalityMatch = this.assessPersonalityMatch(script, personality);
    const technicalAccuracy = this.assessTechnicalAccuracy(script, cv);
    const deliveryOptimization = this.assessDeliveryOptimization(script);
    const professionalImpact = this.assessProfessionalImpact(script, cv);

    const overallScore = (
      engagementScore * 0.25 +
      industryAlignment * 10 * 0.20 +
      personalityMatch * 10 * 0.15 +
      technicalAccuracy * 10 * 0.15 +
      deliveryOptimization * 10 * 0.15 +
      professionalImpact * 10 * 0.10
    );

    return {
      overallScore: Math.round(overallScore * 10) / 10,
      engagementScore: Math.round(engagementScore * 10) / 10,
      industryAlignment,
      personalityMatch,
      technicalAccuracy,
      deliveryOptimization,
      professionalImpact,
      feedback: ['Generated using local assessment algorithms']
    };
  }

  /**
   * Ultimate fallback script generation
   */
  private generateUltimateFallbackScript(cv: ParsedCV, options: PromptEngineOptions): string {
    const name = cv.personalInfo?.name || cv.personal?.name || 'I';
    const role = cv.experience?.[0]?.position || 'professional';
    
    return `Hello! I'm ${name}, a dedicated ${role} with a passion for excellence and innovation. I bring experience, expertise, and enthusiasm to every project. I'm always excited to connect with fellow professionals and explore new opportunities. Let's connect and discuss how we can collaborate to achieve great results together.`;
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enhanced error categorization and logging
   */
  private categorizeError(error: any): PromptEngineErrorType {
    if (error.code === 'insufficient_quota' || error.status === 429) {
      return PromptEngineErrorType.OPENAI_API_ERROR;
    }
    if (error.message?.includes('context')) {
      return PromptEngineErrorType.CONTEXT_ANALYSIS_FAILED;
    }
    if (error.message?.includes('optimization')) {
      return PromptEngineErrorType.OPTIMIZATION_FAILED;
    }
    if (error.message?.includes('production')) {
      return PromptEngineErrorType.PRODUCTION_LAYER_FAILED;
    }
    if (error.message?.includes('quality')) {
      return PromptEngineErrorType.QUALITY_ASSESSMENT_FAILED;
    }
    if (error.message?.includes('industry')) {
      return PromptEngineErrorType.INDUSTRY_TEMPLATE_ERROR;
    }
    
    return PromptEngineErrorType.SCRIPT_SYNTHESIS_FAILED;
  }
}

export const advancedPromptEngine = new EnhancedPromptEngineWithFallbacks();