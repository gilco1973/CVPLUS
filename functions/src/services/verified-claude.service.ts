import Anthropic from '@anthropic-ai/sdk';
import { 
  LLMVerificationService, 
  ValidationCriteria, 
  VerificationRequest 
} from './llm-verification.service';
import { config } from '../config/environment';

/**
 * Verified Claude Service
 * 
 * This service wraps all Anthropic Claude API calls with automatic verification
 * using OpenAI GPT-4. It provides the same interface as the Claude API but
 * adds comprehensive response validation, retry logic, and audit logging.
 */

export interface VerifiedClaudeConfig {
  apiKey?: string;
  maxRetries?: number;
  verificationEnabled?: boolean;
  validationCriteria?: ValidationCriteria;
  timeoutMs?: number;
  enableAuditLogging?: boolean;
}

export interface VerifiedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface VerifiedClaudeRequest {
  model?: string;
  messages: VerifiedMessage[];
  max_tokens?: number;
  temperature?: number;
  system?: string;
  context?: Record<string, any>;
  service: string; // Service name for audit logging
  validationCriteria?: ValidationCriteria;
}

export interface VerifiedClaudeResponse {
  content: string;
  verified: boolean;
  verificationScore: number;
  verificationDetails: {
    confidence: number;
    issues: Array<{
      category: string;
      severity: string;
      description: string;
    }>;
    processingTime: number;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  auditId: string;
  retryCount: number;
}

export class VerifiedClaudeService {
  private anthropic: Anthropic;
  private verificationService: LLMVerificationService;
  private config: Required<VerifiedClaudeConfig>;

  constructor(customConfig?: VerifiedClaudeConfig) {
    const defaultConfig: Required<VerifiedClaudeConfig> = {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      maxRetries: 3,
      verificationEnabled: true,
      validationCriteria: {
        accuracy: true,
        completeness: true,
        relevance: true,
        consistency: true,
        safety: true,
        format: true
      },
      timeoutMs: 60000,
      enableAuditLogging: true
    };

    this.config = { ...defaultConfig, ...customConfig };

    // Initialize Anthropic client
    this.anthropic = new Anthropic({
      apiKey: this.config.apiKey
    });

    // Initialize verification service
    this.verificationService = new LLMVerificationService({
      maxRetries: this.config.maxRetries,
      timeoutMs: this.config.timeoutMs,
      enableDetailedLogging: this.config.enableAuditLogging
    });
  }

  /**
   * Create a verified message with Claude
   * 
   * This method mirrors the Claude messages.create API but adds comprehensive
   * verification using OpenAI GPT-4 as a cross-validation system.
   */
  async createVerifiedMessage(request: VerifiedClaudeRequest): Promise<VerifiedClaudeResponse> {
    const startTime = Date.now();
    let retryCount = 0;
    let currentPrompt = this.buildPromptFromMessages(request);
    let lastClaudeResponse = '';
    let auditId = '';

    // Validate required fields
    if (!request.service) {
      throw new Error('Service name is required for audit logging');
    }

    if (!request.messages || request.messages.length === 0) {
      throw new Error('Messages array cannot be empty');
    }

    while (retryCount <= this.config.maxRetries) {
      try {
        // Call Claude API
        const claudeResponse = await this.callClaude({
          ...request,
          messages: request.messages
        });

        lastClaudeResponse = claudeResponse.content;

        // Skip verification if disabled
        if (!this.config.verificationEnabled) {
          return {
            content: claudeResponse.content,
            verified: true,
            verificationScore: 100,
            verificationDetails: {
              confidence: 1,
              issues: [],
              processingTime: Date.now() - startTime
            },
            usage: claudeResponse.usage,
            auditId: 'verification_disabled',
            retryCount
          };
        }

        // Perform verification
        const verificationResult = await this.verificationService.verifyResponse({
          id: this.generateRequestId(),
          service: request.service,
          originalPrompt: currentPrompt,
          claudeResponse: claudeResponse.content,
          context: {
            ...request.context,
            model: request.model,
            temperature: request.temperature,
            max_tokens: request.max_tokens
          },
          validationCriteria: request.validationCriteria || this.config.validationCriteria,
          timestamp: new Date()
        });

        auditId = verificationResult.auditId;

        // Check if verification passed
        if (verificationResult.result.verified && 
            verificationResult.result.overallScore >= 70 &&
            verificationResult.result.confidence >= 0.7) {
          
          return {
            content: claudeResponse.content,
            verified: true,
            verificationScore: verificationResult.result.overallScore,
            verificationDetails: {
              confidence: verificationResult.result.confidence,
              issues: verificationResult.result.issues,
              processingTime: verificationResult.result.processingTime
            },
            usage: claudeResponse.usage,
            auditId,
            retryCount
          };
        }

        // If verification failed and we have retries left
        if (retryCount < this.config.maxRetries) {
          retryCount++;
          
          // Generate improved prompt based on verification feedback
          currentPrompt = this.generateRetryPrompt(
            currentPrompt,
            claudeResponse.content,
            verificationResult.result.issues,
            verificationResult.result.feedback
          );

          // Update request messages with retry prompt
          request.messages = [{
            role: 'user',
            content: currentPrompt
          }];

          // Wait before retry (exponential backoff)
          await this.delay(1000 * Math.pow(2, retryCount - 1));
          
          console.warn(`Verification failed, retrying (${retryCount}/${this.config.maxRetries})`);
          continue;
        }

        // All retries exhausted
        console.error('Verification failed after all retries');
        return {
          content: claudeResponse.content,
          verified: false,
          verificationScore: verificationResult.result.overallScore,
          verificationDetails: {
            confidence: verificationResult.result.confidence,
            issues: verificationResult.result.issues,
            processingTime: verificationResult.result.processingTime
          },
          usage: claudeResponse.usage,
          auditId,
          retryCount
        };

      } catch (error) {
        console.error(`Attempt ${retryCount + 1} failed:`, error);
        
        if (retryCount >= this.config.maxRetries) {
          throw new Error(`Failed to get verified response after ${this.config.maxRetries} attempts: ${error}`);
        }
        
        retryCount++;
        await this.delay(1000 * retryCount);
      }
    }

    throw new Error('Unexpected end of retry loop');
  }

  /**
   * Call Claude API directly
   */
  private async callClaude(request: VerifiedClaudeRequest): Promise<{
    content: string;
    usage?: { input_tokens: number; output_tokens: number };
  }> {
    const response = await this.anthropic.messages.create({
      model: request.model || 'claude-sonnet-4-20250514',
      max_tokens: request.max_tokens || 4000,
      temperature: request.temperature || 0,
      system: request.system,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return {
      content: content.text,
      usage: response.usage ? {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      } : undefined
    };
  }

  /**
   * Build prompt string from messages array
   */
  private buildPromptFromMessages(request: VerifiedClaudeRequest): string {
    let prompt = '';
    
    if (request.system) {
      prompt += `System: ${request.system}\n\n`;
    }

    request.messages.forEach(message => {
      prompt += `${message.role}: ${message.content}\n`;
    });

    return prompt.trim();
  }

  /**
   * Generate retry prompt with verification feedback
   */
  private generateRetryPrompt(
    originalPrompt: string,
    failedResponse: string,
    issues: Array<{ category: string; severity: string; description: string; suggestion?: string }>,
    feedback?: string
  ): string {
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');

    let retryPrompt = `${originalPrompt}\n\n`;
    
    retryPrompt += `IMPORTANT: Your previous response had quality issues that need to be addressed:\n\n`;

    if (criticalIssues.length > 0) {
      retryPrompt += `CRITICAL ISSUES (MUST FIX):\n`;
      criticalIssues.forEach(issue => {
        retryPrompt += `- ${issue.description}`;
        if (issue.suggestion) {
          retryPrompt += ` → ${issue.suggestion}`;
        }
        retryPrompt += '\n';
      });
      retryPrompt += '\n';
    }

    if (highIssues.length > 0) {
      retryPrompt += `HIGH PRIORITY ISSUES:\n`;
      highIssues.forEach(issue => {
        retryPrompt += `- ${issue.description}`;
        if (issue.suggestion) {
          retryPrompt += ` → ${issue.suggestion}`;
        }
        retryPrompt += '\n';
      });
      retryPrompt += '\n';
    }

    if (feedback) {
      retryPrompt += `SPECIFIC FEEDBACK:\n${feedback}\n\n`;
    }

    retryPrompt += `Please provide a corrected response that addresses all the issues above while maintaining accuracy and completeness.`;

    return retryPrompt;
  }

  /**
   * Utility methods
   */
  private generateRequestId(): string {
    return `claude_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get verification service statistics
   */
  public getVerificationStats() {
    return this.verificationService.getVerificationStats();
  }

  /**
   * Get recent audit logs
   */
  public getAuditLogs(limit?: number) {
    return this.verificationService.getAuditLogs(limit);
  }

  /**
   * Batch processing for multiple verification requests
   */
  async createBatchVerifiedMessages(
    requests: VerifiedClaudeRequest[],
    options?: {
      maxConcurrent?: number;
      stopOnFirstFailure?: boolean;
    }
  ): Promise<{
    results: (VerifiedClaudeResponse | Error)[];
    successCount: number;
    failureCount: number;
    totalTime: number;
  }> {
    const startTime = Date.now();
    const maxConcurrent = options?.maxConcurrent || 3;
    const stopOnFirstFailure = options?.stopOnFirstFailure || false;
    
    const results: (VerifiedClaudeResponse | Error)[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Process requests in batches to avoid overwhelming APIs
    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const batch = requests.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (request) => {
        try {
          const result = await this.createVerifiedMessage(request);
          if (result.verified) {
            successCount++;
          } else {
            failureCount++;
          }
          return result;
        } catch (error) {
          failureCount++;
          return error instanceof Error ? error : new Error(String(error));
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push(new Error(result.reason));
          if (stopOnFirstFailure) {
            return {
              results,
              successCount,
              failureCount,
              totalTime: Date.now() - startTime
            };
          }
        }
      }
    }

    return {
      results,
      successCount,
      failureCount,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Stream verified responses for real-time applications
   */
  async *streamVerifiedMessage(
    request: VerifiedClaudeRequest
  ): AsyncGenerator<{
    type: 'progress' | 'partial' | 'verification' | 'complete' | 'error';
    data: any;
  }> {
    try {
      yield { type: 'progress', data: { stage: 'initializing', message: 'Starting Claude request...' } };
      
      const startTime = Date.now();
      
      // Call Claude API (in a real streaming implementation, this would use Claude's streaming API)
      yield { type: 'progress', data: { stage: 'claude_request', message: 'Calling Claude API...' } };
      
      const claudeResponse = await this.callClaude(request);
      
      yield { 
        type: 'partial', 
        data: { 
          content: claudeResponse.content,
          usage: claudeResponse.usage,
          processingTime: Date.now() - startTime
        } 
      };

      if (this.config.verificationEnabled) {
        yield { type: 'progress', data: { stage: 'verification', message: 'Starting verification...' } };
        
        const verificationResult = await this.verificationService.verifyResponse({
          id: this.generateRequestId(),
          service: request.service,
          originalPrompt: this.buildPromptFromMessages(request),
          claudeResponse: claudeResponse.content,
          context: request.context,
          validationCriteria: request.validationCriteria || this.config.validationCriteria,
          timestamp: new Date()
        });

        yield {
          type: 'verification',
          data: {
            verified: verificationResult.result.verified,
            confidence: verificationResult.result.confidence,
            score: verificationResult.result.overallScore,
            issues: verificationResult.result.issues
          }
        };

        yield {
          type: 'complete',
          data: {
            content: claudeResponse.content,
            verified: verificationResult.result.verified,
            verificationScore: verificationResult.result.overallScore,
            verificationDetails: {
              confidence: verificationResult.result.confidence,
              issues: verificationResult.result.issues,
              processingTime: verificationResult.result.processingTime
            },
            usage: claudeResponse.usage,
            auditId: verificationResult.auditId,
            retryCount: 0
          }
        };
      } else {
        yield {
          type: 'complete',
          data: {
            content: claudeResponse.content,
            verified: true,
            verificationScore: 100,
            verificationDetails: {
              confidence: 1,
              issues: [],
              processingTime: 0
            },
            usage: claudeResponse.usage,
            auditId: 'verification_disabled',
            retryCount: 0
          }
        };
      }
    } catch (error) {
      yield {
        type: 'error',
        data: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Advanced configuration management
   */
  public updateConfiguration(newConfig: Partial<VerifiedClaudeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize services if needed
    if (newConfig.apiKey) {
      this.anthropic = new Anthropic({
        apiKey: newConfig.apiKey
      });
    }

    // Log configuration change
    console.info('VerifiedClaudeService configuration updated', {
      timestamp: new Date(),
      updatedFields: Object.keys(newConfig),
      verificationEnabled: this.config.verificationEnabled
    });
  }

  /**
   * Performance optimization: Warm up the service
   */
  public async warmUp(): Promise<{
    success: boolean;
    anthropicReady: boolean;
    verificationReady: boolean;
    responseTime: number;
  }> {
    const startTime = Date.now();
    let anthropicReady = false;
    let verificationReady = false;

    try {
      // Test Claude API
      await this.callClaude({
        service: 'warmup',
        messages: [{ role: 'user', content: 'Warmup test - respond with OK' }],
        max_tokens: 5,
        temperature: 0
      });
      anthropicReady = true;

      if (this.config.verificationEnabled) {
        // Test verification service
        const healthCheck = await this.verificationService.healthCheck();
        verificationReady = healthCheck.healthy;
      } else {
        verificationReady = true; // Not applicable when verification is disabled
      }

      return {
        success: anthropicReady && verificationReady,
        anthropicReady,
        verificationReady,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Service warmup failed:', error);
      return {
        success: false,
        anthropicReady,
        verificationReady,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get comprehensive service health status
   */
  public async getHealthStatus(): Promise<{
    service: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      claude: 'healthy' | 'degraded' | 'unhealthy';
      verification: 'healthy' | 'degraded' | 'unhealthy';
      memory: 'healthy' | 'degraded' | 'unhealthy';
    };
    metrics: {
      totalRequests: number;
      successRate: number;
      averageResponseTime: number;
      uptime: number;
    };
    timestamp: Date;
  }> {
    const startTime = Date.now();
    
    // Check Claude API
    let claudeStatus: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';
    try {
      await this.callClaude({
        service: 'health-check',
        messages: [{ role: 'user', content: 'Health check - respond briefly' }],
        max_tokens: 5,
        temperature: 0
      });
      claudeStatus = 'healthy';
    } catch (error) {
      console.error('Claude health check failed:', error);
    }

    // Check verification service if enabled
    let verificationStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (this.config.verificationEnabled) {
      try {
        const healthCheck = await this.verificationService.healthCheck();
        verificationStatus = healthCheck.status;
      } catch (error) {
        console.error('Verification service health check failed:', error);
        verificationStatus = 'unhealthy';
      }
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
    let memoryStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (memoryMB > 512) {
      memoryStatus = 'unhealthy';
    } else if (memoryMB > 256) {
      memoryStatus = 'degraded';
    }

    // Get verification statistics
    const stats = this.getVerificationStats();
    
    // Determine overall service status
    const components = { claude: claudeStatus, verification: verificationStatus, memory: memoryStatus };
    const unhealthyComponents = Object.values(components).filter(status => status === 'unhealthy').length;
    const degradedComponents = Object.values(components).filter(status => status === 'degraded').length;
    
    let serviceStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyComponents > 0) {
      serviceStatus = 'unhealthy';
    } else if (degradedComponents > 0) {
      serviceStatus = 'degraded';
    } else {
      serviceStatus = 'healthy';
    }

    return {
      service: serviceStatus,
      components,
      metrics: {
        totalRequests: stats.totalVerifications,
        successRate: stats.successRate,
        averageResponseTime: stats.averageProcessingTime,
        uptime: Date.now() - startTime
      },
      timestamp: new Date()
    };
  }

  /**
   * Create specialized validation criteria for different service types
   */
  public static createValidationCriteria(serviceType: string): ValidationCriteria {
    const baseCriteria: ValidationCriteria = {
      accuracy: true,
      completeness: true,
      relevance: true,
      consistency: true,
      safety: true,
      format: true
    };

    switch (serviceType) {
      case 'cv-parsing':
        return {
          ...baseCriteria,
          customCriteria: [
            {
              name: 'data_extraction_accuracy',
              description: 'Verify that personal information, work experience, and skills are accurately extracted',
              weight: 0.9
            },
            {
              name: 'json_structure_compliance',
              description: 'Ensure response follows required JSON schema for CV data',
              weight: 0.8
            }
          ]
        };

      case 'pii-detection':
        return {
          ...baseCriteria,
          safety: true,
          customCriteria: [
            {
              name: 'pii_identification',
              description: 'Accurately identify all types of personally identifiable information',
              weight: 1.0
            },
            {
              name: 'false_positive_minimization',
              description: 'Minimize false positives while maintaining high sensitivity',
              weight: 0.7
            }
          ]
        };

      case 'skills-analysis':
        return {
          ...baseCriteria,
          customCriteria: [
            {
              name: 'skill_categorization',
              description: 'Properly categorize skills by type and proficiency level',
              weight: 0.8
            },
            {
              name: 'market_relevance',
              description: 'Assess current market relevance of identified skills',
              weight: 0.6
            }
          ]
        };

      case 'achievements-extraction':
        return {
          ...baseCriteria,
          customCriteria: [
            {
              name: 'quantifiable_metrics',
              description: 'Extract specific, quantifiable achievements with metrics',
              weight: 0.9
            },
            {
              name: 'impact_assessment',
              description: 'Assess business impact and significance of achievements',
              weight: 0.7
            }
          ]
        };

      default:
        return baseCriteria;
    }
  }
}

// Export singleton instance
export const verifiedClaudeService = new VerifiedClaudeService();