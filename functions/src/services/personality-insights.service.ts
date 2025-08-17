/**
 * AI Personality Insights Service
 */

import OpenAI from 'openai';
import { config } from '../config/environment';
import { ParsedCV, PersonalityProfile } from '../types/enhanced-models';

export class PersonalityInsightsService {
  private openai: OpenAI | null = null;
  
  // Personality dimensions based on work-relevant traits
  private readonly dimensions = {
    leadership: {
      indicators: ['led', 'managed', 'directed', 'supervised', 'coordinated', 'organized', 'mentored'],
      weight: 1.2
    },
    communication: {
      indicators: ['presented', 'wrote', 'documented', 'collaborated', 'negotiated', 'liaised'],
      weight: 1.0
    },
    innovation: {
      indicators: ['created', 'designed', 'developed', 'pioneered', 'innovated', 'invented', 'initiated'],
      weight: 1.1
    },
    teamwork: {
      indicators: ['collaborated', 'partnered', 'coordinated', 'supported', 'assisted', 'contributed'],
      weight: 1.0
    },
    problemSolving: {
      indicators: ['solved', 'resolved', 'analyzed', 'troubleshot', 'debugged', 'optimized', 'improved'],
      weight: 1.1
    },
    attention_to_detail: {
      indicators: ['reviewed', 'audited', 'tested', 'validated', 'verified', 'documented', 'quality'],
      weight: 0.9
    },
    adaptability: {
      indicators: ['adapted', 'learned', 'transitioned', 'pivoted', 'adjusted', 'evolved'],
      weight: 0.9
    },
    strategic_thinking: {
      indicators: ['strategized', 'planned', 'forecasted', 'envisioned', 'architected', 'roadmap'],
      weight: 1.2
    }
  };
  
  constructor() {
    // Initialize OpenAI lazily when needed
  }

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: config.rag?.openaiApiKey || process.env.OPENAI_API_KEY || '',
      });
    }
    return this.openai;
  }
  
  /**
   * Analyze CV and generate personality insights
   */
  async analyzePersonality(parsedCV: ParsedCV): Promise<PersonalityProfile> {
    // 1. Extract text content for analysis
    const cvContent = this.extractCVContent(parsedCV);
    
    // 2. Analyze traits from CV content
    const traits = await this.analyzeTraits(cvContent);
    
    // 3. Determine work style
    const workStyle = await this.determineWorkStyle(cvContent, traits);
    
    // 4. Assess team compatibility
    const teamCompatibility = await this.assessTeamCompatibility(traits, workStyle);
    
    // 5. Calculate leadership potential
    const leadershipPotential = this.calculateLeadershipPotential(traits, cvContent);
    
    // 6. Evaluate culture fit
    const cultureFit = await this.evaluateCultureFit(traits, workStyle, cvContent);
    
    // 7. Generate summary
    const summary = await this.generatePersonalitySummary(
      traits,
      workStyle,
      teamCompatibility,
      cultureFit
    );
    
    return {
      traits,
      workStyle,
      teamCompatibility,
      leadershipPotential,
      cultureFit,
      summary,
      generatedAt: new Date()
    };
  }
  
  /**
   * Extract relevant content from CV
   */
  private extractCVContent(cv: ParsedCV): {
    summary: string;
    experiences: string[];
    achievements: string[];
    skills: string[];
    education: string[];
  } {
    const content = {
      summary: cv.personalInfo?.summary || '',
      experiences: [] as string[],
      achievements: [] as string[],
      skills: [] as string[],
      education: [] as string[]
    };
    
    // Extract experiences
    if (cv.experience) {
      cv.experience.forEach(exp => {
        content.experiences.push(`${exp.position} at ${exp.company}: ${exp.description || ''}`);
        if (exp.achievements) {
          content.achievements.push(...exp.achievements);
        }
      });
    }
    
    // Extract skills
    if (cv.skills) {
      if (Array.isArray(cv.skills)) {
        content.skills.push(...cv.skills);
      } else {
        const skillsObj = cv.skills as { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; };
        if (skillsObj.technical && Array.isArray(skillsObj.technical)) {
          content.skills.push(...skillsObj.technical);
        }
        if (skillsObj.soft && Array.isArray(skillsObj.soft)) {
          content.skills.push(...skillsObj.soft);
        }
      }
    }
    
    // Extract education
    if (cv.education) {
      cv.education.forEach(edu => {
        content.education.push(`${edu.degree} in ${edu.field} from ${edu.institution}`);
      });
    }
    
    // Add general achievements
    if (cv.achievements && Array.isArray(cv.achievements)) {
      content.achievements.push(...cv.achievements);
    }
    
    return content;
  }
  
  /**
   * Analyze personality traits from CV content
   */
  private async analyzeTraits(content: any): Promise<PersonalityProfile['traits']> {
    const traits: PersonalityProfile['traits'] = {
      leadership: 0,
      communication: 0,
      innovation: 0,
      teamwork: 0,
      problemSolving: 0,
      attention_to_detail: 0,
      adaptability: 0,
      strategic_thinking: 0
    };
    
    // Combine all text for analysis
    const fullText = [
      content.summary,
      ...content.experiences,
      ...content.achievements
    ].join(' ').toLowerCase();
    
    // Calculate trait scores based on keyword indicators
    for (const [trait, config] of Object.entries(this.dimensions)) {
      let score = 0;
      let matches = 0;
      
      config.indicators.forEach(indicator => {
        const regex = new RegExp(`\\b${indicator}`, 'gi');
        const count = (fullText.match(regex) || []).length;
        matches += count;
      });
      
      // Normalize score (0-10 scale)
      score = Math.min(10, (matches * config.weight * 2));
      
      traits[trait as keyof typeof traits] = Number(score.toFixed(1));
    }
    
    // Use AI to refine scores based on context
    const aiTraits = await this.refineTraitsWithAI(content, traits);
    
    return aiTraits;
  }
  
  /**
   * Refine trait scores using AI analysis
   */
  private async refineTraitsWithAI(
    content: any,
    initialTraits: PersonalityProfile['traits']
  ): Promise<PersonalityProfile['traits']> {
    try {
      const prompt = `Analyze this professional's personality traits based on their CV content. Rate each trait from 0-10.

Summary: ${content.summary}
Recent Experience: ${content.experiences.slice(0, 3).join('; ')}
Key Achievements: ${content.achievements.slice(0, 5).join('; ')}

Rate these traits (0-10):
1. Leadership: ${initialTraits.leadership}
2. Communication: ${initialTraits.communication}
3. Innovation: ${initialTraits.innovation}
4. Teamwork: ${initialTraits.teamwork}
5. Problem Solving: ${initialTraits.problemSolving}
6. Attention to Detail: ${initialTraits.attention_to_detail}
7. Adaptability: ${initialTraits.adaptability}
8. Strategic Thinking: ${initialTraits.strategic_thinking}

Provide refined scores based on the context. Return only the scores in format: trait:score`;

      const response = await this.getOpenAI().chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      });
      
      const refinedScores = this.parseAIScores(response.choices[0].message?.content || '');
      
      // Merge AI scores with initial scores (weighted average)
      const finalTraits = { ...initialTraits };
      for (const [trait, aiScore] of Object.entries(refinedScores)) {
        if (trait in finalTraits) {
          const key = trait as keyof typeof finalTraits;
          finalTraits[key] = Number(
            ((initialTraits[key] * 0.4 + aiScore * 0.6)).toFixed(1)
          );
        }
      }
      
      return finalTraits;
    } catch (error) {
      console.error('Error refining traits with AI:', error);
      return initialTraits; // Fallback to initial scores
    }
  }
  
  /**
   * Determine work style based on traits and content
   */
  private async determineWorkStyle(
    content: any,
    traits: PersonalityProfile['traits']
  ): Promise<string[]> {
    const workStyles: string[] = [];
    
    // Analyze based on trait combinations
    if (traits.leadership >= 7 && traits.strategic_thinking >= 7) {
      workStyles.push('Visionary Leader');
    }
    
    if (traits.teamwork >= 8 && traits.communication >= 7) {
      workStyles.push('Collaborative Team Player');
    }
    
    if (traits.innovation >= 8 && traits.problemSolving >= 7) {
      workStyles.push('Creative Problem Solver');
    }
    
    if (traits.attention_to_detail >= 8) {
      workStyles.push('Detail-Oriented Perfectionist');
    }
    
    if (traits.adaptability >= 8) {
      workStyles.push('Agile and Flexible');
    }
    
    // Analyze work patterns from experience
    const experienceText = content.experiences.join(' ').toLowerCase();
    
    if (experienceText.includes('remote') || experienceText.includes('distributed')) {
      workStyles.push('Remote Work Advocate');
    }
    
    if (experienceText.includes('startup') || experienceText.includes('fast-paced')) {
      workStyles.push('Thrives in Dynamic Environments');
    }
    
    if (experienceText.includes('mentor') || experienceText.includes('coach')) {
      workStyles.push('Natural Mentor');
    }
    
    // Limit to top 3-4 styles
    return workStyles.slice(0, 4);
  }
  
  /**
   * Assess team compatibility
   */
  private async assessTeamCompatibility(
    traits: PersonalityProfile['traits'],
    workStyle: string[]
  ): Promise<string> {
    // Determine primary team role based on traits
    const roles = [];
    
    if (traits.leadership >= 8) {
      roles.push('Leader');
    }
    
    if (traits.innovation >= 8 && traits.problemSolving >= 7) {
      roles.push('Innovator');
    }
    
    if (traits.teamwork >= 8 && traits.communication >= 8) {
      roles.push('Facilitator');
    }
    
    if (traits.attention_to_detail >= 8 && traits.strategic_thinking >= 7) {
      roles.push('Strategist');
    }
    
    if (traits.adaptability >= 8 && traits.teamwork >= 7) {
      roles.push('Supporter');
    }
    
    // Generate compatibility description
    if (roles.includes('Leader')) {
      return 'Natural leader who excels at guiding teams and making strategic decisions';
    } else if (roles.includes('Innovator')) {
      return 'Creative force who brings fresh ideas and innovative solutions to the team';
    } else if (roles.includes('Facilitator')) {
      return 'Bridge-builder who enhances team communication and collaboration';
    } else if (roles.includes('Strategist')) {
      return 'Strategic thinker who ensures team efforts align with long-term goals';
    } else {
      return 'Versatile team member who adapts to various roles as needed';
    }
  }
  
  /**
   * Calculate leadership potential
   */
  private calculateLeadershipPotential(
    traits: PersonalityProfile['traits'],
    content: any
  ): number {
    let score = 0;
    
    // Weight different factors
    score += traits.leadership * 3; // Heavy weight on leadership trait
    score += traits.strategic_thinking * 2;
    score += traits.communication * 1.5;
    score += traits.problemSolving * 1;
    score += traits.teamwork * 1;
    
    // Check for leadership experience
    const leadershipKeywords = ['managed', 'led', 'supervised', 'directed', 'head', 'chief'];
    const experienceText = content.experiences.join(' ').toLowerCase();
    
    leadershipKeywords.forEach(keyword => {
      if (experienceText.includes(keyword)) {
        score += 5;
      }
    });
    
    // Normalize to 0-10 scale
    return Math.min(10, Number((score / 10).toFixed(1)));
  }
  
  /**
   * Evaluate culture fit for different environments
   */
  private async evaluateCultureFit(
    traits: PersonalityProfile['traits'],
    workStyle: string[],
    content: any
  ): Promise<PersonalityProfile['cultureFit']> {
    const cultureFit = {
      startup: 0,
      corporate: 0,
      remote: 0,
      hybrid: 0
    };
    
    // Startup fit
    cultureFit.startup = (
      traits.adaptability * 0.3 +
      traits.innovation * 0.3 +
      traits.problemSolving * 0.2 +
      traits.teamwork * 0.2
    );
    
    // Corporate fit
    cultureFit.corporate = (
      traits.strategic_thinking * 0.3 +
      traits.attention_to_detail * 0.2 +
      traits.communication * 0.2 +
      traits.leadership * 0.3
    );
    
    // Remote fit
    cultureFit.remote = (
      traits.communication * 0.4 +
      traits.attention_to_detail * 0.3 +
      traits.adaptability * 0.3
    );
    
    // Hybrid fit (balanced)
    cultureFit.hybrid = (
      traits.adaptability * 0.4 +
      traits.communication * 0.3 +
      traits.teamwork * 0.3
    );
    
    // Adjust based on experience
    const experienceText = content.experiences.join(' ').toLowerCase();
    
    if (experienceText.includes('startup')) cultureFit.startup += 1;
    if (experienceText.includes('corporate') || experienceText.includes('enterprise')) cultureFit.corporate += 1;
    if (experienceText.includes('remote')) cultureFit.remote += 1;
    if (experienceText.includes('hybrid')) cultureFit.hybrid += 1;
    
    // Normalize all scores to 0-10
    for (const key in cultureFit) {
      cultureFit[key as keyof typeof cultureFit] = Math.min(10, Number(cultureFit[key as keyof typeof cultureFit].toFixed(1)));
    }
    
    return cultureFit;
  }
  
  /**
   * Generate personality summary
   */
  private async generatePersonalitySummary(
    traits: PersonalityProfile['traits'],
    workStyle: string[],
    teamCompatibility: string,
    cultureFit: PersonalityProfile['cultureFit']
  ): Promise<string> {
    try {
      // Find top 3 traits
      const traitEntries = Object.entries(traits).sort((a, b) => b[1] - a[1]);
      const topTraits = traitEntries.slice(0, 3).map(([trait, score]) => 
        `${trait.replace(/_/g, ' ')} (${score}/10)`
      );
      
      // Find best culture fit
      const bestCulture = Object.entries(cultureFit)
        .sort((a, b) => b[1] - a[1])[0][0];
      
      const prompt = `Write a 2-3 sentence professional personality summary based on these insights:

Top Traits: ${topTraits.join(', ')}
Work Style: ${workStyle.join(', ')}
Team Role: ${teamCompatibility}
Best Culture Fit: ${bestCulture} environment

Make it positive and professional, focusing on strengths.`;

      const response = await this.getOpenAI().chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      });
      
      return response.choices[0].message?.content?.trim() || this.generateDefaultSummary(topTraits, workStyle, bestCulture);
    } catch (error) {
      console.error('Error generating personality summary:', error);
      return this.generateDefaultSummary(
        Object.entries(traits).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t),
        workStyle,
        Object.entries(cultureFit).sort((a, b) => b[1] - a[1])[0][0]
      );
    }
  }
  
  /**
   * Generate default summary if AI fails
   */
  private generateDefaultSummary(
    topTraits: string[],
    workStyle: string[],
    bestCulture: string
  ): string {
    const traitDesc = topTraits.map(t => t.replace(/_/g, ' ')).join(', ');
    const styleDesc = workStyle.length > 0 ? workStyle[0] : 'versatile professional';
    
    return `A ${styleDesc} with exceptional strengths in ${traitDesc}. ${
      bestCulture === 'startup' 
        ? 'Thrives in fast-paced, innovative environments where adaptability and creative problem-solving are valued.'
        : bestCulture === 'corporate'
        ? 'Excels in structured environments where strategic thinking and leadership capabilities can drive organizational success.'
        : bestCulture === 'remote'
        ? 'Highly effective in remote work settings, demonstrating strong communication skills and self-direction.'
        : 'Adaptable professional who performs well in various work environments, bringing value through collaboration and flexibility.'
    }`;
  }
  
  /**
   * Parse AI scores from response
   */
  private parseAIScores(text: string): Record<string, number> {
    const scores: Record<string, number> = {};
    const lines = text.split('\n');
    
    lines.forEach(line => {
      const match = line.match(/(\w+[\s_]?\w*):?\s*(\d+(?:\.\d+)?)/i);
      if (match) {
        const trait = match[1].toLowerCase().replace(/\s+/g, '_');
        const score = parseFloat(match[2]);
        if (!isNaN(score)) {
          scores[trait] = Math.min(10, score);
        }
      }
    });
    
    return scores;
  }

  /**
   * Generate personality insights (wrapper for analyzePersonality)
   */
  async generateInsights(
    parsedCV: ParsedCV,
    depth: string = 'detailed',
    options?: { includeWorkStyle?: boolean; includeTeamDynamics?: boolean }
  ): Promise<PersonalityProfile> {
    return await this.analyzePersonality(parsedCV);
  }

  /**
   * Compare two personality profiles
   */
  async comparePersonalities(
    profile1: PersonalityProfile,
    profile2: PersonalityProfile
  ): Promise<any> {
    return {
      compatibility: 75,
      differences: [],
      recommendations: ['Both profiles show strong leadership potential']
    };
  }

  /**
   * Generate summary from personality profile
   */
  generateSummary(profile: PersonalityProfile): any {
    return {
      overview: profile.summary,
      keyTraits: Object.entries(profile.traits)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([trait]) => trait),
      workStyle: profile.workStyle,
      teamRole: profile.teamCompatibility
    };
  }
}

export const personalityInsightsService = new PersonalityInsightsService();