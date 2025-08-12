import OpenAI from 'openai';
import { config } from '../config/environment';

// Types and Interfaces
export interface VerificationRequest {
  id: string;
  service: string;
  originalPrompt: string;
  claudeResponse: string;
  context?: Record<string, any>;
  history?: Array<{ role: string; content: string }>;
  validationCriteria?: ValidationCriteria;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface ValidationCriteria {
  accuracy: boolean;
  completeness: boolean;
  relevance: boolean;
  consistency: boolean;
  safety: boolean;
  format: boolean;
  customCriteria?: Array<{
    name: string;
    description: string;
    weight: number; // 0-1
  }>;
}

export interface VerificationResult {
  verified: boolean;
  confidence: number; // 0-1
  issues: VerificationIssue[];
  overallScore: number; // 0-100
  detailedScores: {
    accuracy: number;
    completeness: number;
    relevance: number;
    consistency: number;
    safety: number;
    format: number;
  };
  recommendation: 'approve' | 'retry' | 'manual_review';
  feedback?: string;
  processingTime: number;
}

export interface VerificationIssue {
  category: 'accuracy' | 'completeness' | 'relevance' | 'consistency' | 'safety' | 'format' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  suggestion?: string;
}

export interface RetryAttempt {
  attemptNumber: number;
  timestamp: Date;
  reason: string;
  previousIssues: VerificationIssue[];
}

export interface VerificationAuditLog {
  requestId: string;
  service: string;
  userId?: string;
  sessionId?: string;
  originalPrompt: string;
  claudeResponse: string;
  verificationResult: VerificationResult;
  retryAttempts: RetryAttempt[];
  finalOutcome: 'approved' | 'rejected' | 'manual_review';
  totalProcessingTime: number;
  timestamp: Date;
  apiCosts: {
    claude: number;
    openai: number;
  };
}

// Configuration
const DEFAULT_VALIDATION_CRITERIA: ValidationCriteria = {
  accuracy: true,
  completeness: true,
  relevance: true,
  consistency: true,
  safety: true,
  format: true
};

const DEFAULT_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // ms
  timeoutMs: 30000,
  confidenceThreshold: 0.7,
  scoreThreshold: 70,
  rateLimitPerMinute: 60,
  enableDetailedLogging: true,
  sanitizeLogsForPII: true
};

/**
 * LLM Response Verification Service
 * 
 * This service implements a comprehensive verification system for LLM responses
 * using cross-validation between Anthropic Claude and OpenAI GPT-4.
 * 
 * Key Features:
 * - Response quality validation
 * - Retry logic with failure analysis
 * - Security audit logging
 * - Rate limiting protection
 * - PII sanitization
 * - Performance optimization
 */
export class LLMVerificationService {
  private openai: OpenAI;
  private rateLimitCounter: Map<string, number[]> = new Map();
  private auditLogs: VerificationAuditLog[] = [];
  private config = DEFAULT_CONFIG;

  constructor(customConfig?: Partial<typeof DEFAULT_CONFIG>) {
    this.openai = new OpenAI({
      apiKey: config.openai?.apiKey || process.env.OPENAI_API_KEY || ''
    });
    
    if (customConfig) {
      this.config = { ...DEFAULT_CONFIG, ...customConfig };
    }

    // Initialize rate limiting cleanup
    this.initializeRateLimitCleanup();
  }

  /**
   * Main verification method - validates Claude response using OpenAI GPT-4
   */
  async verifyResponse(request: VerificationRequest): Promise<{
    result: VerificationResult;
    auditId: string;
  }> {
    const startTime = Date.now();
    
    // Check rate limits
    if (!this.checkRateLimit(request.service)) {
      throw new Error(`Rate limit exceeded for service: ${request.service}`);
    }

    // Initialize audit log entry
    const auditLog: VerificationAuditLog = {
      requestId: request.id,
      service: request.service,
      userId: request.userId,
      sessionId: request.sessionId,
      originalPrompt: this.sanitizeForLogging(request.originalPrompt),
      claudeResponse: this.sanitizeForLogging(request.claudeResponse),
      verificationResult: {} as VerificationResult,
      retryAttempts: [],
      finalOutcome: 'approved',
      totalProcessingTime: 0,
      timestamp: new Date(),
      apiCosts: { claude: 0, openai: 0 }
    };

    try {
      // Perform verification
      const verificationResult = await this.performVerification(request);
      
      auditLog.verificationResult = verificationResult;
      auditLog.totalProcessingTime = Date.now() - startTime;
      
      // Determine final outcome
      if (verificationResult.verified && verificationResult.overallScore >= this.config.scoreThreshold) {
        auditLog.finalOutcome = 'approved';
      } else if (verificationResult.recommendation === 'manual_review') {
        auditLog.finalOutcome = 'manual_review';
      } else {
        auditLog.finalOutcome = 'rejected';
      }

      // Store audit log
      const auditId = this.storeAuditLog(auditLog);
      
      return {
        result: verificationResult,
        auditId
      };

    } catch (error) {
      auditLog.totalProcessingTime = Date.now() - startTime;
      auditLog.finalOutcome = 'rejected';
      const auditId = this.storeAuditLog(auditLog);
      
      console.error('LLM Verification failed:', error);
      throw new Error(`Verification failed: ${error}`);
    }
  }

  /**
   * Comprehensive response verification with retry logic
   */
  async verifyWithRetry(
    service: string,
    originalPrompt: string,
    claudeResponse: string,
    context?: Record<string, any>,
    validationCriteria?: ValidationCriteria
  ): Promise<{
    verified: boolean;
    result: VerificationResult;
    finalResponse: string;
    auditId: string;
  }> {
    const request: VerificationRequest = {
      id: this.generateRequestId(),
      service,
      originalPrompt,
      claudeResponse,
      context,
      validationCriteria: validationCriteria || DEFAULT_VALIDATION_CRITERIA,
      timestamp: new Date(),
      userId: context?.userId,
      sessionId: context?.sessionId
    };

    let currentResponse = claudeResponse;
    let attempts = 0;
    let lastVerificationResult: VerificationResult;

    while (attempts < this.config.maxRetries) {
      attempts++;
      
      try {
        const verification = await this.verifyResponse({
          ...request,
          claudeResponse: currentResponse
        });

        lastVerificationResult = verification.result;

        // Check if verification passed
        if (verification.result.verified && 
            verification.result.overallScore >= this.config.scoreThreshold &&
            verification.result.confidence >= this.config.confidenceThreshold) {
          
          return {
            verified: true,
            result: verification.result,
            finalResponse: currentResponse,
            auditId: verification.auditId
          };
        }

        // If not the last attempt, prepare retry
        if (attempts < this.config.maxRetries) {
          // Generate retry prompt with feedback
          const retryPrompt = this.generateRetryPrompt(
            originalPrompt,
            currentResponse,
            verification.result.issues,
            verification.result.feedback
          );

          // Wait before retry
          await this.delay(this.config.retryDelay * attempts);

          // Get new response from Claude (this would be implemented in calling service)
          // For now, we'll just use the same response to demonstrate the system
          // In actual implementation, the calling service would re-query Claude
          console.warn(`Verification failed, retry attempt ${attempts}/${this.config.maxRetries}`);
        }

      } catch (error) {
        console.error(`Verification attempt ${attempts} failed:`, error);
        
        if (attempts === this.config.maxRetries) {
          throw error;
        }
        
        await this.delay(this.config.retryDelay * attempts);
      }
    }

    // All retries exhausted
    return {
      verified: false,
      result: lastVerificationResult!,
      finalResponse: currentResponse,
      auditId: this.generateRequestId()
    };
  }

  /**
   * Core verification logic using OpenAI GPT-4
   */
  private async performVerification(request: VerificationRequest): Promise<VerificationResult> {
    const startTime = Date.now();
    const criteria = request.validationCriteria || DEFAULT_VALIDATION_CRITERIA;

    if (!this.openai.apiKey) {
      throw new Error('OpenAI API key not configured for verification');
    }

    const verificationPrompt = this.buildVerificationPrompt(request, criteria);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert AI response validator. Your job is to evaluate the quality, accuracy, and appropriateness of AI-generated responses. You must provide detailed, objective analysis based on specific criteria.

CRITICAL REQUIREMENTS:
1. Be thorough and objective in your evaluation
2. Identify specific issues with concrete examples
3. Provide actionable feedback for improvement
4. Score each criterion on a scale of 0-100
5. Consider the context and intended use case
6. Flag any potential safety or ethical concerns
7. Assess whether the response adequately addresses the original prompt

Return your analysis as valid JSON with the exact structure specified in the user prompt.`
          },
          {
            role: 'user',
            content: verificationPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        timeout: this.config.timeoutMs
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from verification service');
      }

      // Parse verification result
      const verificationData = JSON.parse(content);
      
      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Build final verification result
      const result: VerificationResult = {
        verified: verificationData.verified,
        confidence: verificationData.confidence,
        issues: verificationData.issues || [],
        overallScore: verificationData.overallScore,
        detailedScores: verificationData.detailedScores,
        recommendation: verificationData.recommendation,
        feedback: verificationData.feedback,
        processingTime
      };

      // Additional safety checks
      this.performSafetyValidation(result, request);

      return result;

    } catch (error) {
      console.error('Error in verification process:', error);
      
      // Return failure result
      return {
        verified: false,
        confidence: 0,
        issues: [{
          category: 'safety',
          severity: 'critical',
          description: 'Verification service failed',
          suggestion: 'Manual review required'
        }],
        overallScore: 0,
        detailedScores: {
          accuracy: 0,
          completeness: 0,
          relevance: 0,
          consistency: 0,
          safety: 0,
          format: 0
        },
        recommendation: 'manual_review',
        feedback: `Verification failed: ${error}`,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Build comprehensive verification prompt for OpenAI
   */
  private buildVerificationPrompt(request: VerificationRequest, criteria: ValidationCriteria): string {
    return `
TASK: Evaluate the quality and appropriateness of an AI response from Claude.

ORIGINAL PROMPT:
${request.originalPrompt}

CLAUDE'S RESPONSE:
${request.claudeResponse}

${request.context ? `
CONTEXT:
${JSON.stringify(request.context, null, 2)}
` : ''}

${request.history ? `
CONVERSATION HISTORY:
${request.history.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
` : ''}

EVALUATION CRITERIA:
${criteria.accuracy ? '✓ ACCURACY: Is the information factually correct and based on the provided context?' : ''}
${criteria.completeness ? '✓ COMPLETENESS: Does the response fully address all aspects of the prompt?' : ''}
${criteria.relevance ? '✓ RELEVANCE: Is the response directly relevant to the question asked?' : ''}
${criteria.consistency ? '✓ CONSISTENCY: Is the response internally consistent and logical?' : ''}
${criteria.safety ? '✓ SAFETY: Does the response avoid harmful, biased, or inappropriate content?' : ''}
${criteria.format ? '✓ FORMAT: Is the response properly structured and formatted as requested?' : ''}

${criteria.customCriteria?.map(cc => 
  `✓ ${cc.name.toUpperCase()}: ${cc.description} (Weight: ${cc.weight})`
).join('\n') || ''}

SPECIFIC EVALUATION REQUIREMENTS:
1. SERVICE CONTEXT: This is for the "${request.service}" service in a CV analysis platform
2. USER SAFETY: Ensure no PII exposure or security vulnerabilities
3. BUSINESS LOGIC: Verify response aligns with CV processing workflows
4. DATA INTEGRITY: Check that extracted data is realistic and properly formatted

Please evaluate the response and return a JSON object with this exact structure:
{
  "verified": boolean,
  "confidence": number (0-1),
  "overallScore": number (0-100),
  "detailedScores": {
    "accuracy": number (0-100),
    "completeness": number (0-100),
    "relevance": number (0-100),
    "consistency": number (0-100),
    "safety": number (0-100),
    "format": number (0-100)
  },
  "issues": [
    {
      "category": "accuracy|completeness|relevance|consistency|safety|format|custom",
      "severity": "low|medium|high|critical",
      "description": "Detailed description of the issue",
      "location": "Where in the response (optional)",
      "suggestion": "How to fix this issue"
    }
  ],
  "recommendation": "approve|retry|manual_review",
  "feedback": "Detailed feedback for improvement (if recommendation is retry)"
}
`;
  }

  /**
   * Generate retry prompt with feedback from verification issues
   */
  private generateRetryPrompt(
    originalPrompt: string,
    failedResponse: string,
    issues: VerificationIssue[],
    feedback?: string
  ): string {
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');
    
    return `
ORIGINAL REQUEST:
${originalPrompt}

PREVIOUS RESPONSE ISSUES IDENTIFIED:
${criticalIssues.length > 0 ? `
CRITICAL ISSUES (MUST FIX):
${criticalIssues.map(issue => `- ${issue.description} (${issue.suggestion})`).join('\n')}
` : ''}

${highIssues.length > 0 ? `
HIGH PRIORITY ISSUES:
${highIssues.map(issue => `- ${issue.description} (${issue.suggestion})`).join('\n')}
` : ''}

${feedback ? `
SPECIFIC FEEDBACK:
${feedback}
` : ''}

Please provide a corrected response that addresses all the issues above while maintaining accuracy and completeness.
`;
  }

  /**
   * Perform additional safety validation
   */
  private performSafetyValidation(result: VerificationResult, request: VerificationRequest): void {
    const response = request.claudeResponse;
    
    // Check for potential PII exposure
    const piiPatterns = [
      /\b\d{3}-?\d{2}-?\d{4}\b/, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit Card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email (in certain contexts)
      /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/ // Phone numbers
    ];

    for (const pattern of piiPatterns) {
      if (pattern.test(response)) {
        result.issues.push({
          category: 'safety',
          severity: 'high',
          description: 'Potential PII detected in response',
          suggestion: 'Remove or redact sensitive information'
        });
        result.detailedScores.safety = Math.min(result.detailedScores.safety, 30);
      }
    }

    // Check response length for completeness
    if (response.trim().length < 50) {
      result.issues.push({
        category: 'completeness',
        severity: 'medium',
        description: 'Response appears too short to be complete',
        suggestion: 'Provide more detailed analysis'
      });
    }
  }

  /**
   * Rate limiting implementation
   */
  private checkRateLimit(service: string): boolean {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    if (!this.rateLimitCounter.has(service)) {
      this.rateLimitCounter.set(service, []);
    }
    
    const serviceCalls = this.rateLimitCounter.get(service)!;
    
    // Remove old calls outside the window
    const recentCalls = serviceCalls.filter(timestamp => timestamp > windowStart);
    
    // Check if within limit
    if (recentCalls.length >= this.config.rateLimitPerMinute) {
      return false;
    }
    
    // Add current call
    recentCalls.push(now);
    this.rateLimitCounter.set(service, recentCalls);
    
    return true;
  }

  /**
   * Initialize rate limit cleanup job
   */
  private initializeRateLimitCleanup(): void {
    setInterval(() => {
      const cutoff = Date.now() - 60000;
      
      for (const [service, calls] of this.rateLimitCounter.entries()) {
        const recentCalls = calls.filter(timestamp => timestamp > cutoff);
        this.rateLimitCounter.set(service, recentCalls);
      }
    }, 30000); // Clean up every 30 seconds
  }

  /**
   * Sanitize content for logging (remove PII)
   */
  private sanitizeForLogging(content: string): string {
    if (!this.config.sanitizeLogsForPII) {
      return content;
    }

    let sanitized = content;
    
    // Redact common PII patterns
    sanitized = sanitized.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[SSN_REDACTED]');
    sanitized = sanitized.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD_REDACTED]');
    sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');
    sanitized = sanitized.replace(/\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/g, '[PHONE_REDACTED]');
    
    return sanitized;
  }

  /**
   * Store audit log (in production, this would go to a database)
   */
  private storeAuditLog(log: VerificationAuditLog): string {
    const auditId = this.generateRequestId();
    
    if (this.config.enableDetailedLogging) {
      console.log(`Verification Audit [${auditId}]:`, {
        service: log.service,
        outcome: log.finalOutcome,
        score: log.verificationResult.overallScore,
        processingTime: log.totalProcessingTime,
        retries: log.retryAttempts.length,
        issues: log.verificationResult.issues?.length || 0
      });
    }
    
    // Store in memory for now (in production, use database)
    this.auditLogs.push({ ...log });
    
    // Keep only last 1000 logs in memory
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }
    
    return auditId;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get verification statistics
   */
  public getVerificationStats(): {
    totalVerifications: number;
    successRate: number;
    averageScore: number;
    averageProcessingTime: number;
    issueBreakdown: Record<string, number>;
  } {
    const logs = this.auditLogs;
    
    if (logs.length === 0) {
      return {
        totalVerifications: 0,
        successRate: 0,
        averageScore: 0,
        averageProcessingTime: 0,
        issueBreakdown: {}
      };
    }

    const successful = logs.filter(log => log.finalOutcome === 'approved').length;
    const successRate = (successful / logs.length) * 100;
    
    const totalScore = logs.reduce((sum, log) => sum + log.verificationResult.overallScore, 0);
    const averageScore = totalScore / logs.length;
    
    const totalTime = logs.reduce((sum, log) => sum + log.totalProcessingTime, 0);
    const averageProcessingTime = totalTime / logs.length;
    
    const issueBreakdown: Record<string, number> = {};
    logs.forEach(log => {
      log.verificationResult.issues?.forEach(issue => {
        issueBreakdown[issue.category] = (issueBreakdown[issue.category] || 0) + 1;
      });
    });

    return {
      totalVerifications: logs.length,
      successRate,
      averageScore,
      averageProcessingTime,
      issueBreakdown
    };
  }

  /**
   * Get recent audit logs
   */
  public getAuditLogs(limit: number = 50): VerificationAuditLog[] {
    return this.auditLogs.slice(-limit);
  }
}

// Export singleton instance
export const llmVerificationService = new LLMVerificationService();