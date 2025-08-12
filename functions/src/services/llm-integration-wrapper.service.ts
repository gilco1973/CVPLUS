import { 
  VerifiedClaudeService, 
  VerifiedClaudeRequest,
  VerifiedClaudeResponse 
} from './verified-claude.service';
import { ValidationCriteria } from './llm-verification.service';

/**
 * LLM Integration Wrapper Service
 * 
 * This service provides a seamless integration layer for existing services
 * to adopt the LLM verification system without major code changes.
 * 
 * It maintains backward compatibility while adding verification capabilities.
 */

export interface LLMIntegrationConfig {
  enableVerification?: boolean;
  serviceName: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  customValidationCriteria?: ValidationCriteria;
}

export interface LegacyClaudeCall {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  context?: Record<string, any>;
}

export interface LegacyClaudeResponse {
  content: string;
  verified?: boolean;
  verificationScore?: number;
  auditId?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Integration wrapper that provides backward-compatible methods
 * while adding verification capabilities
 */
export class LLMIntegrationWrapperService {
  private verifiedClaudeService: VerifiedClaudeService;
  private config: Required<LLMIntegrationConfig>;

  constructor(config: LLMIntegrationConfig) {
    const defaultConfig: Required<LLMIntegrationConfig> = {
      enableVerification: true,
      serviceName: config.serviceName,
      defaultModel: 'claude-sonnet-4-20250514',
      defaultTemperature: 0,
      defaultMaxTokens: 4000,
      customValidationCriteria: VerifiedClaudeService.createValidationCriteria(config.serviceName)
    };

    this.config = { ...defaultConfig, ...config };
    
    this.verifiedClaudeService = new VerifiedClaudeService({
      verificationEnabled: this.config.enableVerification,
      validationCriteria: this.config.customValidationCriteria
    });
  }

  /**
   * Legacy-compatible Claude call method
   * 
   * This method maintains the same interface as the original Claude calls
   * but adds verification behind the scenes.
   */
  async callClaude(request: LegacyClaudeCall): Promise<LegacyClaudeResponse> {
    const verifiedRequest: VerifiedClaudeRequest = {
      model: this.config.defaultModel,
      messages: [{
        role: 'user',
        content: request.prompt
      }],
      max_tokens: request.maxTokens || this.config.defaultMaxTokens,
      temperature: request.temperature ?? this.config.defaultTemperature,
      system: request.system,
      service: this.config.serviceName,
      context: request.context,
      validationCriteria: this.config.customValidationCriteria
    };

    try {
      const response = await this.verifiedClaudeService.createVerifiedMessage(verifiedRequest);

      return {
        content: response.content,
        verified: response.verified,
        verificationScore: response.verificationScore,
        auditId: response.auditId,
        usage: response.usage ? {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        } : undefined
      };

    } catch (error) {
      console.error(`LLM Integration error for service ${this.config.serviceName}:`, error);
      throw error;
    }
  }

  /**
   * Advanced method for services that need more control
   */
  async callClaudeWithMessages(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      system?: string;
      context?: Record<string, any>;
      customValidation?: ValidationCriteria;
    }
  ): Promise<VerifiedClaudeResponse> {
    const request: VerifiedClaudeRequest = {
      model: this.config.defaultModel,
      messages,
      max_tokens: options?.maxTokens || this.config.defaultMaxTokens,
      temperature: options?.temperature ?? this.config.defaultTemperature,
      system: options?.system,
      service: this.config.serviceName,
      context: options?.context,
      validationCriteria: options?.customValidation || this.config.customValidationCriteria
    };

    return await this.verifiedClaudeService.createVerifiedMessage(request);
  }

  /**
   * Get service-specific statistics
   */
  getServiceStats() {
    return {
      serviceName: this.config.serviceName,
      verificationEnabled: this.config.enableVerification,
      ...this.verifiedClaudeService.getVerificationStats()
    };
  }
}

/**
 * Factory function to create service-specific wrappers
 */
export function createLLMWrapper(serviceName: string, options?: {
  enableVerification?: boolean;
  customValidation?: ValidationCriteria;
}): LLMIntegrationWrapperService {
  return new LLMIntegrationWrapperService({
    serviceName,
    enableVerification: options?.enableVerification ?? true,
    customValidationCriteria: options?.customValidation || 
      VerifiedClaudeService.createValidationCriteria(serviceName)
  });
}

/**
 * Pre-configured service wrappers for common CVPlus services
 */
export class CVParsingLLMWrapper extends LLMIntegrationWrapperService {
  constructor() {
    super({
      serviceName: 'cv-parsing',
      customValidationCriteria: VerifiedClaudeService.createValidationCriteria('cv-parsing')
    });
  }

  /**
   * CV-specific parsing method with enhanced validation
   */
  async parseCV(
    cvText: string, 
    userInstructions?: string,
    context?: { fileName?: string; mimeType?: string }
  ): Promise<LegacyClaudeResponse> {
    const prompt = this.buildCVParsingPrompt(cvText, userInstructions);
    
    return await this.callClaude({
      prompt,
      system: 'You are a professional CV parser that extracts structured data from CVs with absolute accuracy. You MUST only extract information that is explicitly present in the CV text.',
      temperature: 0,
      maxTokens: 4000,
      context: {
        ...context,
        parsing_type: 'cv_extraction',
        has_user_instructions: !!userInstructions
      }
    });
  }

  private buildCVParsingPrompt(cvText: string, userInstructions?: string): string {
    let prompt = 'Please analyze the following CV/resume text and extract structured information.\n\n';
    
    if (userInstructions) {
      prompt += `USER SPECIAL INSTRUCTIONS (HIGHEST PRIORITY):\n${userInstructions}\n\n`;
      prompt += 'These user instructions should take precedence and guide how you analyze and extract information from the CV.\n\n';
    }

    prompt += `IMPORTANT INSTRUCTIONS:
1. Use ONLY the provided context from the CV to answer accurately
2. Never make up, invent, or assume any information not explicitly present
3. If information is not available, use null or empty values
4. Extract ALL relevant information including work experience, education, skills, achievements
5. Maintain consistent formatting and structure
6. Ensure all dates, locations, and details are accurate as written

CV TEXT:
${cvText}

Please extract and return the information in a structured JSON format with the following schema:
{
  "personalInfo": {
    "name": string,
    "email": string,
    "phone": string,
    "address": string,
    "linkedin": string,
    "website": string,
    "summary": string
  },
  "workExperience": [
    {
      "position": string,
      "company": string,
      "startDate": string,
      "endDate": string,
      "location": string,
      "description": string,
      "achievements": [string]
    }
  ],
  "education": [
    {
      "degree": string,
      "institution": string,
      "graduationDate": string,
      "gpa": string,
      "location": string,
      "details": string
    }
  ],
  "skills": {
    "technical": [string],
    "soft": [string],
    "languages": [string],
    "certifications": [string]
  },
  "projects": [
    {
      "name": string,
      "description": string,
      "technologies": [string],
      "link": string
    }
  ],
  "achievements": [string],
  "volunteer": [
    {
      "organization": string,
      "role": string,
      "startDate": string,
      "endDate": string,
      "description": string
    }
  ]
}`;

    return prompt;
  }
}

export class PIIDetectionLLMWrapper extends LLMIntegrationWrapperService {
  constructor() {
    super({
      serviceName: 'pii-detection',
      customValidationCriteria: VerifiedClaudeService.createValidationCriteria('pii-detection')
    });
  }

  async detectPII(
    text: string,
    options?: {
      categories?: string[];
      sensitivity?: 'low' | 'medium' | 'high';
      includeContext?: boolean;
    }
  ): Promise<LegacyClaudeResponse> {
    const prompt = this.buildPIIDetectionPrompt(text, options);
    
    return await this.callClaude({
      prompt,
      system: 'You are a PII detection expert. Identify all personally identifiable information with high accuracy while minimizing false positives.',
      temperature: 0,
      maxTokens: 2000,
      context: {
        detection_type: 'pii_analysis',
        sensitivity: options?.sensitivity || 'medium',
        categories: options?.categories
      }
    });
  }

  private buildPIIDetectionPrompt(
    text: string, 
    options?: {
      categories?: string[];
      sensitivity?: 'low' | 'medium' | 'high';
      includeContext?: boolean;
    }
  ): string {
    const categories = options?.categories || [
      'names', 'email', 'phone', 'address', 'ssn', 'credit_card', 
      'bank_account', 'date_of_birth', 'government_id'
    ];

    return `Analyze the following text and identify all personally identifiable information (PII).

DETECTION CATEGORIES:
${categories.map(cat => `- ${cat}`).join('\n')}

SENSITIVITY LEVEL: ${options?.sensitivity || 'medium'}

TEXT TO ANALYZE:
${text}

Return results in JSON format:
{
  "piiDetected": boolean,
  "totalFindings": number,
  "findings": [
    {
      "type": string,
      "value": string,
      "confidence": number,
      "location": {
        "start": number,
        "end": number
      },
      "context": string
    }
  ],
  "riskLevel": "low|medium|high|critical",
  "recommendations": [string]
}`;
  }
}

export class SkillsAnalysisLLMWrapper extends LLMIntegrationWrapperService {
  constructor() {
    super({
      serviceName: 'skills-analysis',
      customValidationCriteria: VerifiedClaudeService.createValidationCriteria('skills-analysis')
    });
  }

  async analyzeSkills(
    cvData: any,
    options?: {
      includeMarketAnalysis?: boolean;
      targetRole?: string;
      industry?: string;
    }
  ): Promise<LegacyClaudeResponse> {
    const prompt = this.buildSkillsAnalysisPrompt(cvData, options);
    
    return await this.callClaude({
      prompt,
      system: 'You are a skills analysis expert specializing in technical and professional competencies assessment.',
      temperature: 0.1,
      maxTokens: 3000,
      context: {
        analysis_type: 'skills_proficiency',
        target_role: options?.targetRole,
        industry: options?.industry,
        include_market_analysis: options?.includeMarketAnalysis
      }
    });
  }

  private buildSkillsAnalysisPrompt(cvData: any, options?: any): string {
    return `Analyze the skills and competencies from this CV data and provide detailed assessment.

CV DATA:
${JSON.stringify(cvData, null, 2)}

${options?.targetRole ? `TARGET ROLE: ${options.targetRole}` : ''}
${options?.industry ? `INDUSTRY: ${options.industry}` : ''}

Provide analysis in JSON format:
{
  "skillsBreakdown": {
    "technical": [
      {
        "name": string,
        "category": string,
        "proficiencyLevel": "beginner|intermediate|advanced|expert",
        "yearsOfExperience": number,
        "marketDemand": "low|medium|high",
        "evidence": [string]
      }
    ],
    "soft": [similar structure],
    "certifications": [similar structure]
  },
  "overallAssessment": {
    "strengths": [string],
    "gaps": [string],
    "recommendations": [string]
  },
  "marketAlignment": {
    "score": number,
    "analysis": string,
    "improvementAreas": [string]
  }
}`;
  }
}

// Export pre-configured wrappers
export const cvParsingWrapper = new CVParsingLLMWrapper();
export const piiDetectionWrapper = new PIIDetectionLLMWrapper();
export const skillsAnalysisWrapper = new SkillsAnalysisLLMWrapper();