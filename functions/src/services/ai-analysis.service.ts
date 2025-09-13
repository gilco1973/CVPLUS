/**
 * AI Analysis Service
 *
 * Core AI service integrating OpenAI GPT-4 and Anthropic Claude for CV analysis,
 * personality insights, content generation, and intelligent recommendations.
 *
 * @fileoverview AI Analysis service with multiple provider support and intelligent fallbacks
 */

import { logger } from 'firebase-functions/v2';
import OpenAI from 'openai';

// Types
import {
  ProcessedCV,
  PersonalInfo,
  Experience,
  Education,
  Skills,
  PersonalityProfile,
  BigFiveScores
} from '../../../shared/types/processed-cv';

// ============================================================================
// Configuration
// ============================================================================

const OPENAI_MODEL = 'gpt-4-turbo-preview';
const CLAUDE_MODEL = 'claude-3-sonnet-20240229';
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000;
const MAX_TOKENS = 4000;

// API clients
let openaiClient: OpenAI | null = null;
let anthropicClient: any = null; // Would be Anthropic client

// ============================================================================
// AI Provider Configuration
// ============================================================================

interface AIProvider {
  name: 'openai' | 'anthropic';
  available: boolean;
  priority: number;
}

const AI_PROVIDERS: AIProvider[] = [
  { name: 'openai', available: true, priority: 1 },
  { name: 'anthropic', available: true, priority: 2 }
];

// ============================================================================
// Analysis Results Interfaces
// ============================================================================

export interface CVAnalysisResult {
  improvements: string[];
  keywords: string[];
  strengths: string[];
  weaknesses: string[];
  marketability: number;
  industryFit: string[];
}

export interface PersonalityAnalysisResult {
  mbtiType?: string;
  bigFiveScores: BigFiveScores;
  workingStyle: string[];
  idealRoles: string[];
  analysisConfidence: number;
  insights: string[];
}

export interface ContentGenerationResult {
  summary: string;
  bullets: string[];
  achievements: string[];
  confidence: number;
}

export interface StructuredCVData {
  personalInfo: PersonalInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: Skills;
  certifications?: any[];
  achievements?: any[];
  projects?: any[];
}

// ============================================================================
// Main AI Analysis Service
// ============================================================================

export class AIAnalysisService {
  constructor() {
    this.initializeClients();
  }

  /**
   * Initialize AI service clients
   */
  private initializeClients(): void {
    try {
      // Initialize OpenAI
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey) {
        openaiClient = new OpenAI({
          apiKey: openaiKey,
          timeout: TIMEOUT_MS
        });
        logger.info('OpenAI client initialized');
      } else {
        logger.warn('OpenAI API key not found');
        AI_PROVIDERS.find(p => p.name === 'openai')!.available = false;
      }

      // Initialize Anthropic (placeholder)
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (anthropicKey) {
        // anthropicClient = new Anthropic({ apiKey: anthropicKey });
        logger.info('Anthropic client would be initialized here');
      } else {
        logger.warn('Anthropic API key not found');
        AI_PROVIDERS.find(p => p.name === 'anthropic')!.available = false;
      }

    } catch (error) {
      logger.error('Failed to initialize AI clients', { error });
    }
  }

  /**
   * Extract structured CV data from raw text using AI
   */
  async extractStructuredCV(rawText: string): Promise<StructuredCVData> {
    logger.debug('Extracting structured CV data from text');

    const prompt = this.buildCVExtractionPrompt(rawText);

    try {
      const response = await this.callAIWithFallback(prompt, {
        temperature: 0.1,
        maxTokens: MAX_TOKENS,
        systemMessage: 'You are an expert CV parser. Extract structured data from CV text.'
      });

      const structuredData = this.parseCVExtractionResponse(response);

      logger.info('Successfully extracted structured CV data', {
        sectionsFound: Object.keys(structuredData).length,
        experienceCount: structuredData.experience.length,
        educationCount: structuredData.education.length
      });

      return structuredData;

    } catch (error) {
      logger.error('Failed to extract structured CV data', { error });
      throw new Error(`AI CV extraction failed: ${error}`);
    }
  }

  /**
   * Analyze CV content for improvements and insights
   */
  async analyzeCVContent(cvData: {
    summary: string;
    experience: Experience[];
    education: Education[];
    skills: Skills;
  }): Promise<CVAnalysisResult> {
    logger.debug('Analyzing CV content for improvements');

    const prompt = this.buildCVAnalysisPrompt(cvData);

    try {
      const response = await this.callAIWithFallback(prompt, {
        temperature: 0.3,
        maxTokens: 2000,
        systemMessage: 'You are a professional career consultant and CV expert.'
      });

      const analysis = this.parseCVAnalysisResponse(response);

      logger.info('Successfully analyzed CV content', {
        improvementsCount: analysis.improvements.length,
        keywordsCount: analysis.keywords.length,
        marketability: analysis.marketability
      });

      return analysis;

    } catch (error) {
      logger.error('Failed to analyze CV content', { error });
      throw new Error(`AI CV analysis failed: ${error}`);
    }
  }

  /**
   * Analyze personality from CV content
   */
  async analyzePersonality(cvData: Omit<ProcessedCV, 'id' | 'createdAt' | 'updatedAt'>): Promise<PersonalityProfile> {
    logger.debug('Analyzing personality from CV content');

    const prompt = this.buildPersonalityAnalysisPrompt(cvData);

    try {
      const response = await this.callAIWithFallback(prompt, {
        temperature: 0.2,
        maxTokens: 1500,
        systemMessage: 'You are an expert psychologist specializing in personality assessment from professional documents.'
      });

      const personalityData = this.parsePersonalityResponse(response);

      logger.info('Successfully analyzed personality', {
        mbtiType: personalityData.mbtiType,
        confidence: personalityData.analysisConfidence,
        workingStylesCount: personalityData.workingStyle.length
      });

      return {
        mbtiType: personalityData.mbtiType,
        bigFiveScores: personalityData.bigFiveScores,
        workingStyle: personalityData.workingStyle,
        idealRoles: personalityData.idealRoles,
        analysisConfidence: personalityData.analysisConfidence
      };

    } catch (error) {
      logger.error('Failed to analyze personality', { error });
      throw new Error(`AI personality analysis failed: ${error}`);
    }
  }

  /**
   * Generate optimized content for CV sections
   */
  async generateOptimizedContent(
    sectionType: 'summary' | 'experience' | 'achievements',
    context: any,
    targetRole?: string
  ): Promise<ContentGenerationResult> {
    logger.debug('Generating optimized content', { sectionType, targetRole });

    const prompt = this.buildContentGenerationPrompt(sectionType, context, targetRole);

    try {
      const response = await this.callAIWithFallback(prompt, {
        temperature: 0.4,
        maxTokens: 1000,
        systemMessage: 'You are a professional CV writer specializing in ATS-optimized content.'
      });

      const content = this.parseContentGenerationResponse(response);

      logger.info('Successfully generated optimized content', {
        sectionType,
        confidence: content.confidence
      });

      return content;

    } catch (error) {
      logger.error('Failed to generate optimized content', { error, sectionType });
      throw new Error(`AI content generation failed: ${error}`);
    }
  }

  /**
   * Analyze job market fit and provide recommendations
   */
  async analyzeJobMarketFit(
    cvData: Omit<ProcessedCV, 'id' | 'createdAt' | 'updatedAt'>,
    targetIndustry?: string
  ): Promise<{
    fitScore: number;
    recommendations: string[];
    skillGaps: string[];
    careerProgression: string[];
    marketTrends: string[];
  }> {
    logger.debug('Analyzing job market fit', { targetIndustry });

    const prompt = this.buildJobMarketAnalysisPrompt(cvData, targetIndustry);

    try {
      const response = await this.callAIWithFallback(prompt, {
        temperature: 0.3,
        maxTokens: 2000,
        systemMessage: 'You are a career strategist with deep knowledge of job market trends.'
      });

      const analysis = this.parseJobMarketResponse(response);

      logger.info('Successfully analyzed job market fit', {
        fitScore: analysis.fitScore,
        recommendationsCount: analysis.recommendations.length
      });

      return analysis;

    } catch (error) {
      logger.error('Failed to analyze job market fit', { error });
      throw new Error(`AI job market analysis failed: ${error}`);
    }
  }

  // ============================================================================
  // AI Provider Management
  // ============================================================================

  /**
   * Call AI with fallback to alternative providers
   */
  private async callAIWithFallback(
    prompt: string,
    options: {
      temperature: number;
      maxTokens: number;
      systemMessage: string;
    }
  ): Promise<string> {
    const availableProviders = AI_PROVIDERS
      .filter(p => p.available)
      .sort((a, b) => a.priority - b.priority);

    if (availableProviders.length === 0) {
      throw new Error('No AI providers available');
    }

    let lastError: Error | null = null;

    for (const provider of availableProviders) {
      try {
        logger.debug('Attempting AI call with provider', { provider: provider.name });

        switch (provider.name) {
          case 'openai':
            return await this.callOpenAI(prompt, options);
          case 'anthropic':
            return await this.callAnthropic(prompt, options);
          default:
            throw new Error(`Unknown provider: ${provider.name}`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn('AI provider failed, trying next', {
          provider: provider.name,
          error: lastError.message
        });
        continue;
      }
    }

    throw new Error(`All AI providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(
    prompt: string,
    options: { temperature: number; maxTokens: number; systemMessage: string }
  ): Promise<string> {
    if (!openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await openaiClient.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: options.systemMessage },
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      timeout: TIMEOUT_MS
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    return content;
  }

  /**
   * Call Anthropic API (placeholder implementation)
   */
  private async callAnthropic(
    prompt: string,
    options: { temperature: number; maxTokens: number; systemMessage: string }
  ): Promise<string> {
    // This would be the actual Anthropic implementation
    logger.debug('Anthropic call would be implemented here');
    throw new Error('Anthropic integration not implemented yet');
  }

  // ============================================================================
  // Prompt Building
  // ============================================================================

  private buildCVExtractionPrompt(rawText: string): string {
    return `Extract structured data from this CV text. Return a JSON object with the following structure:

{
  "personalInfo": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin": "string",
    "website": "string",
    "github": "string"
  },
  "summary": "string",
  "experience": [
    {
      "company": "string",
      "position": "string",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or null",
      "location": "string",
      "description": "string",
      "achievements": ["string"],
      "skills": ["string"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or null",
      "gpa": "string",
      "achievements": ["string"]
    }
  ],
  "skills": {
    "technical": ["string"],
    "soft": ["string"],
    "languages": [{"language": "string", "level": "native|fluent|advanced|intermediate|basic"}],
    "tools": ["string"]
  }
}

CV Text:
${rawText}

Return only the JSON object, no additional text.`;
  }

  private buildCVAnalysisPrompt(cvData: any): string {
    return `Analyze this CV and provide detailed feedback. Focus on:
1. Content improvements
2. Keyword optimization
3. Professional strengths
4. Areas for improvement
5. Overall marketability score (1-100)
6. Industry fit recommendations

CV Data:
${JSON.stringify(cvData, null, 2)}

Return a JSON object with this structure:
{
  "improvements": ["specific improvement suggestions"],
  "keywords": ["relevant industry keywords found/missing"],
  "strengths": ["key professional strengths"],
  "weaknesses": ["areas needing improvement"],
  "marketability": 85,
  "industryFit": ["recommended industries"]
}`;
  }

  private buildPersonalityAnalysisPrompt(cvData: any): string {
    return `Analyze the personality traits indicated by this professional CV. Based on the career choices, achievements, and communication style, provide:

1. Likely MBTI personality type
2. Big Five personality scores (0-100 for each trait)
3. Working style preferences
4. Ideal role types
5. Confidence level of analysis (0-100)

CV Summary: ${cvData.summary}
Experience: ${JSON.stringify(cvData.experience.slice(0, 3), null, 2)}
Skills: ${JSON.stringify(cvData.skills, null, 2)}

Return JSON:
{
  "mbtiType": "ENFP",
  "bigFiveScores": {
    "openness": 85,
    "conscientiousness": 75,
    "extraversion": 70,
    "agreeableness": 80,
    "neuroticism": 30
  },
  "workingStyle": ["collaborative", "innovative"],
  "idealRoles": ["Product Manager", "UX Designer"],
  "analysisConfidence": 75,
  "insights": ["detailed personality insights"]
}`;
  }

  private buildContentGenerationPrompt(sectionType: string, context: any, targetRole?: string): string {
    const roleContext = targetRole ? `Target Role: ${targetRole}` : '';

    return `Generate optimized ${sectionType} content for a CV. Make it:
- ATS-friendly with relevant keywords
- Compelling and professional
- Quantified where possible
- Action-oriented

${roleContext}

Context: ${JSON.stringify(context, null, 2)}

Return JSON:
{
  "summary": "optimized text",
  "bullets": ["bullet point 1", "bullet point 2"],
  "achievements": ["quantified achievement 1"],
  "confidence": 90
}`;
  }

  private buildJobMarketAnalysisPrompt(cvData: any, targetIndustry?: string): string {
    const industryContext = targetIndustry ? `Target Industry: ${targetIndustry}` : '';

    return `Analyze this CV's fit for the current job market. Provide:
1. Market fit score (0-100)
2. Specific recommendations for improvement
3. Skill gaps to address
4. Career progression suggestions
5. Current market trends relevant to this profile

${industryContext}

CV Profile Summary:
- Experience: ${cvData.experience.length} positions
- Education: ${cvData.education.length} degrees
- Skills: ${JSON.stringify(cvData.skills, null, 2)}
- Current ATS Score: ${cvData.atsScore}

Return JSON:
{
  "fitScore": 78,
  "recommendations": ["specific actionable recommendations"],
  "skillGaps": ["skills to develop"],
  "careerProgression": ["next career steps"],
  "marketTrends": ["relevant market insights"]
}`;
  }

  // ============================================================================
  // Response Parsing
  // ============================================================================

  private parseCVExtractionResponse(response: string): StructuredCVData {
    try {
      const parsed = JSON.parse(response);

      // Validate and set defaults
      return {
        personalInfo: parsed.personalInfo || { name: '' },
        summary: parsed.summary || '',
        experience: parsed.experience || [],
        education: parsed.education || [],
        skills: parsed.skills || { technical: [], soft: [], languages: [], tools: [] },
        certifications: parsed.certifications || [],
        achievements: parsed.achievements || [],
        projects: parsed.projects || []
      };
    } catch (error) {
      logger.error('Failed to parse CV extraction response', { error, response });
      throw new Error('Invalid CV extraction response format');
    }
  }

  private parseCVAnalysisResponse(response: string): CVAnalysisResult {
    try {
      const parsed = JSON.parse(response);
      return {
        improvements: parsed.improvements || [],
        keywords: parsed.keywords || [],
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        marketability: parsed.marketability || 50,
        industryFit: parsed.industryFit || []
      };
    } catch (error) {
      logger.error('Failed to parse CV analysis response', { error });
      throw new Error('Invalid CV analysis response format');
    }
  }

  private parsePersonalityResponse(response: string): PersonalityAnalysisResult {
    try {
      const parsed = JSON.parse(response);
      return {
        mbtiType: parsed.mbtiType,
        bigFiveScores: parsed.bigFiveScores || {
          openness: 50,
          conscientiousness: 50,
          extraversion: 50,
          agreeableness: 50,
          neuroticism: 50
        },
        workingStyle: parsed.workingStyle || [],
        idealRoles: parsed.idealRoles || [],
        analysisConfidence: parsed.analysisConfidence || 50,
        insights: parsed.insights || []
      };
    } catch (error) {
      logger.error('Failed to parse personality response', { error });
      throw new Error('Invalid personality analysis response format');
    }
  }

  private parseContentGenerationResponse(response: string): ContentGenerationResult {
    try {
      const parsed = JSON.parse(response);
      return {
        summary: parsed.summary || '',
        bullets: parsed.bullets || [],
        achievements: parsed.achievements || [],
        confidence: parsed.confidence || 50
      };
    } catch (error) {
      logger.error('Failed to parse content generation response', { error });
      throw new Error('Invalid content generation response format');
    }
  }

  private parseJobMarketResponse(response: string): any {
    try {
      const parsed = JSON.parse(response);
      return {
        fitScore: parsed.fitScore || 50,
        recommendations: parsed.recommendations || [],
        skillGaps: parsed.skillGaps || [],
        careerProgression: parsed.careerProgression || [],
        marketTrends: parsed.marketTrends || []
      };
    } catch (error) {
      logger.error('Failed to parse job market response', { error });
      throw new Error('Invalid job market analysis response format');
    }
  }
}

// ============================================================================
// Service Factory and Public API
// ============================================================================

let aiAnalysisService: AIAnalysisService;

export function getAIAnalysisService(): AIAnalysisService {
  if (!aiAnalysisService) {
    aiAnalysisService = new AIAnalysisService();
  }
  return aiAnalysisService;
}

/**
 * Public API functions
 */
export async function extractStructuredCV(rawText: string): Promise<StructuredCVData> {
  const service = getAIAnalysisService();
  return service.extractStructuredCV(rawText);
}

export async function analyzeCVContent(cvData: any): Promise<CVAnalysisResult> {
  const service = getAIAnalysisService();
  return service.analyzeCVContent(cvData);
}

export async function analyzePersonality(cvData: any): Promise<PersonalityProfile> {
  const service = getAIAnalysisService();
  return service.analyzePersonality(cvData);
}

export async function generateOptimizedContent(
  sectionType: 'summary' | 'experience' | 'achievements',
  context: any,
  targetRole?: string
): Promise<ContentGenerationResult> {
  const service = getAIAnalysisService();
  return service.generateOptimizedContent(sectionType, context, targetRole);
}

export async function analyzeJobMarketFit(
  cvData: any,
  targetIndustry?: string
): Promise<any> {
  const service = getAIAnalysisService();
  return service.analyzeJobMarketFit(cvData, targetIndustry);
}