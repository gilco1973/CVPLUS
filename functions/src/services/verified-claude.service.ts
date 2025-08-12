/**
 * Verified Claude Service
 * 
 * Drop-in replacement for Anthropic Claude that includes automatic response verification
 * using OpenAI GPT-4. Provides seamless integration with existing codebase.
 */

import Anthropic from '@anthropic-ai/sdk';
import { LLMVerificationService, VerificationRequest, VerificationResult, VerificationConfig } from './llm-verification.service';

export interface VerifiedClaudeConfig extends Partial<VerificationConfig> {
  enableVerification?: boolean;
  service?: string;
  context?: string;
  fallbackToOriginal?: boolean;
}

export interface VerifiedMessageOptions {
  model?: string;
  max_tokens?: number;
  temperature?: number;
  messages: Array<{ role: string; content: string }>;
  timeout?: number;
  system?: string;
  service?: string;
  context?: string;
  validationCriteria?: string[];
  maxRetries?: number;
}

export interface VerifiedResponse {
  content: Array<{ type: 'text'; text: string }>;
  model: string;
  role: string;
  stop_reason?: string | null;
  stop_sequence?: string | null;
  type: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  verification?: VerificationResult;
}

export class VerifiedClaudeService {
  private anthropic: Anthropic;
  private verificationService: LLMVerificationService;
  private config: VerifiedClaudeConfig;

  constructor(config?: VerifiedClaudeConfig) {
    this.config = {
      enableVerification: true,
      service: 'verified-claude',
      fallbackToOriginal: true,
      maxRetries: 3,
      confidenceThreshold: 0.7,
      qualityThreshold: 75,
      enableLogging: true,
      ...config
    };

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    });

    this.verificationService = new LLMVerificationService({
      maxRetries: this.config.maxRetries,
      confidenceThreshold: this.config.confidenceThreshold,
      qualityThreshold: this.config.qualityThreshold,
      enableLogging: this.config.enableLogging
    });

    console.log(`[VERIFIED-CLAUDE] Service initialized`, {
      verificationEnabled: this.config.enableVerification,
      service: this.config.service,
      maxRetries: this.config.maxRetries
    });
  }

  /**
   * Create a verified message - drop-in replacement for anthropic.messages.create()
   */
  async createVerifiedMessage(options: VerifiedMessageOptions): Promise<VerifiedResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Get initial response from Claude
      const claudeResponse = await this.anthropic.messages.create({
        model: options.model || 'claude-sonnet-4-20250514',
        max_tokens: options.max_tokens || 4000,
        temperature: options.temperature || 0.3,
        messages: options.messages,
        timeout: options.timeout || 30000,
        ...(options.system && { system: options.system })
      });

      const initialResponse = claudeResponse.content[0];
      if (initialResponse.type !== 'text') {
        throw new Error('Invalid response type from Anthropic');
      }

      // Step 2: If verification is disabled, return original response
      if (!this.config.enableVerification) {
        console.log(`[VERIFIED-CLAUDE] Verification disabled, returning original response`);
        return this.formatResponse(claudeResponse, undefined);
      }

      // Step 3: Verify response using OpenAI
      const verificationRequest: VerificationRequest = {
        anthropicResponse: initialResponse.text,
        originalPrompt: this.buildOriginalPrompt(options),
        context: options.context || this.config.context,
        history: options.messages.slice(0, -1), // All messages except the last one
        service: options.service || this.config.service || 'verified-claude',
        maxRetries: options.maxRetries || this.config.maxRetries,
        validationCriteria: options.validationCriteria
      };

      const verificationResult = await this.verificationService.verifyResponse(verificationRequest);

      console.log(`[VERIFIED-CLAUDE] Verification completed`, {
        service: verificationRequest.service,
        isValid: verificationResult.isValid,
        confidence: verificationResult.confidence,
        qualityScore: verificationResult.qualityScore,
        retryCount: verificationResult.retryCount,
        processingTimeMs: Date.now() - startTime
      });

      // Step 4: Return formatted response with verification results
      return this.formatResponse(claudeResponse, verificationResult);

    } catch (error) {
      console.error(`[VERIFIED-CLAUDE] Error in createVerifiedMessage:`, error);
      
      // If fallback is enabled and we have API connectivity issues, try original Claude
      if (this.config.fallbackToOriginal && error instanceof Error && 
          (error.message.includes('network') || error.message.includes('timeout'))) {
        
        console.log(`[VERIFIED-CLAUDE] Falling back to original Claude due to error`);
        
        try {
          const fallbackResponse = await this.anthropic.messages.create({
            model: options.model || 'claude-sonnet-4-20250514',
            max_tokens: options.max_tokens || 4000,
            temperature: options.temperature || 0.3,
            messages: options.messages,
            timeout: options.timeout || 30000,
            ...(options.system && { system: options.system })
          });
          
          return this.formatResponse(fallbackResponse, {
            isValid: false,
            confidence: 0.5,
            qualityScore: 50,
            issues: ['Verification failed - used fallback'],
            suggestions: ['Check verification service connectivity'],
            retryCount: 0,
            processingTimeMs: Date.now() - startTime,
            finalResponse: fallbackResponse.content[0].type === 'text' ? fallbackResponse.content[0].text : ''
          });
        } catch (fallbackError) {
          throw new Error(`Both verification and fallback failed: ${error.message}`);
        }
      }

      throw error;
    }
  }

  /**
   * Convenience method for simple text prompts
   */
  async askVerified(
    prompt: string, 
    options?: {
      service?: string;
      context?: string;
      maxRetries?: number;
      validationCriteria?: string[];
    }
  ): Promise<{ text: string; verification: VerificationResult }> {
    const response = await this.createVerifiedMessage({
      messages: [{ role: 'user', content: prompt }],
      service: options?.service,
      context: options?.context,
      maxRetries: options?.maxRetries,
      validationCriteria: options?.validationCriteria
    });

    return {
      text: response.content[0].text,
      verification: response.verification!
    };
  }

  /**
   * Batch process multiple prompts with verification
   */
  async batchVerified(
    prompts: Array<{
      messages: Array<{ role: string; content: string }>;
      service?: string;
      context?: string;
    }>,
    options?: {
      maxConcurrency?: number;
      validationCriteria?: string[];
    }
  ): Promise<Array<{ response: VerifiedResponse; index: number }>> {
    const maxConcurrency = options?.maxConcurrency || 3;
    const results: Array<{ response: VerifiedResponse; index: number }> = [];

    // Process in batches to avoid overwhelming APIs
    for (let i = 0; i < prompts.length; i += maxConcurrency) {
      const batch = prompts.slice(i, i + maxConcurrency);
      
      const batchPromises = batch.map(async (prompt, batchIndex) => {
        const response = await this.createVerifiedMessage({
          messages: prompt.messages,
          service: prompt.service,
          context: prompt.context,
          validationCriteria: options?.validationCriteria
        });
        
        return {
          response,
          index: i + batchIndex
        };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results.sort((a, b) => a.index - b.index);
  }

  /**
   * Health check for the verified service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
    timestamp: string;
  }> {
    try {
      const startTime = Date.now();

      // Test basic Claude connectivity
      const claudeTest = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Health check' }],
        timeout: 5000
      });

      // Test verification service if enabled
      let verificationHealth = null;
      if (this.config.enableVerification) {
        verificationHealth = await this.verificationService.healthCheck();
      }

      const totalTime = Date.now() - startTime;

      const status = verificationHealth?.status === 'unhealthy' ? 'degraded' : 'healthy';

      return {
        status,
        details: {
          responseTimeMs: totalTime,
          claude: {
            status: 'connected',
            model: 'claude-sonnet-4-20250514'
          },
          verification: this.config.enableVerification ? verificationHealth : { status: 'disabled' },
          config: {
            verificationEnabled: this.config.enableVerification,
            maxRetries: this.config.maxRetries,
            confidenceThreshold: this.config.confidenceThreshold,
            qualityThreshold: this.config.qualityThreshold
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          config: {
            verificationEnabled: this.config.enableVerification,
            maxRetries: this.config.maxRetries
          }
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get service statistics
   */
  getStats(): {
    service: string;
    verificationEnabled: boolean;
    config: VerifiedClaudeConfig;
    apiKeysConfigured: {
      anthropic: boolean;
      openai: boolean;
    };
  } {
    return {
      service: 'VerifiedClaudeService',
      verificationEnabled: this.config.enableVerification || false,
      config: { ...this.config },
      apiKeysConfigured: {
        anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
        openai: Boolean(process.env.OPENAI_API_KEY)
      }
    };
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<VerifiedClaudeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`[VERIFIED-CLAUDE] Configuration updated:`, newConfig);
  }

  /**
   * Enable/disable verification at runtime
   */
  setVerification(enabled: boolean): void {
    this.config.enableVerification = enabled;
    console.log(`[VERIFIED-CLAUDE] Verification ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Private helper methods
   */
  private buildOriginalPrompt(options: VerifiedMessageOptions): string {
    const systemPrompt = options.system ? `System: ${options.system}\n\n` : '';
    const messages = options.messages.map(m => `${m.role}: ${m.content}`).join('\n');
    return systemPrompt + messages;
  }

  private formatResponse(claudeResponse: any, verification?: VerificationResult): VerifiedResponse {
    const baseResponse = {
      content: claudeResponse.content,
      model: claudeResponse.model,
      role: claudeResponse.role,
      stop_reason: claudeResponse.stop_reason,
      stop_sequence: claudeResponse.stop_sequence,
      type: claudeResponse.type,
      usage: claudeResponse.usage
    };

    // If verification was performed, use the final verified response
    if (verification) {
      return {
        ...baseResponse,
        content: [{ type: 'text' as const, text: verification.finalResponse }],
        verification
      };
    }

    return baseResponse;
  }
}