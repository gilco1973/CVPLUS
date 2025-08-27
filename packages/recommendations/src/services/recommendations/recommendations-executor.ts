/**
 * @cvplus/recommendations - Recommendations Executor
 * 
 * Handles execution of recommendation operations including Firebase function calls,
 * parameter validation, and response processing. Separates execution logic from orchestration.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import type {
  GetRecommendationsParams,
  GetRecommendationsResponse,
  ApplyImprovementsParams,
  ApplyImprovementsResponse,
  PreviewImprovementParams,
  PreviewImprovementResponse,
  RecommendationError,
  RecommendationErrorType
} from '../../types';

// ============================================================================
// RECOMMENDATIONS EXECUTOR
// ============================================================================

export class RecommendationsExecutor {

  /**
   * Execute recommendation generation via Firebase function
   */
  async executeRecommendationGeneration(
    params: GetRecommendationsParams,
    requestId: string
  ): Promise<GetRecommendationsResponse> {
    console.log(`[RecommendationsExecutor] Executing recommendation generation for ${requestId}`);
    
    // Import Firebase dynamically to avoid build issues
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const getRecommendations = httpsCallable(functions, 'getRecommendations');

    const result = await getRecommendations({
      jobId: params.jobId,
      targetRole: params.targetRole,
      industryKeywords: params.industryKeywords,
      forceRegenerate: params.forceRegenerate
    });

    // Validate response structure
    if (!result.data || typeof result.data !== 'object') {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Invalid response from recommendation service',
        false,
        { params, response: result }
      );
    }

    const responseData = result.data as any;
    
    return {
      success: true,
      data: {
        recommendations: responseData.data?.recommendations || responseData.recommendations || [],
        cached: false,
        generatedAt: new Date().toISOString(),
        processingTime: responseData.data?.processingTime || 0
      }
    };
  }

  /**
   * Execute improvement application via Firebase function
   */
  async executeImprovementApplication(
    params: ApplyImprovementsParams,
    requestId: string
  ): Promise<ApplyImprovementsResponse> {
    console.log(`[RecommendationsExecutor] Executing improvement application for ${requestId}`);
    
    // Validate parameters
    this.validateApplyImprovementsParams(params);
    
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const applyImprovements = httpsCallable(functions, 'applyImprovements');

    const result = await applyImprovements({
      jobId: params.jobId,
      selectedRecommendationIds: params.selectedRecommendationIds,
      targetRole: params.targetRole,
      industryKeywords: params.industryKeywords
    });

    const responseData = result.data as any;
    
    if (!responseData.success) {
      throw this.createError(
        RecommendationErrorType.AI_API_ERROR,
        responseData.error || 'Failed to apply improvements',
        true,
        { params, response: responseData }
      );
    }

    return {
      success: true,
      data: responseData.data
    };
  }

  /**
   * Execute preview generation via Firebase function
   */
  async executePreviewGeneration(
    params: PreviewImprovementParams,
    requestId: string
  ): Promise<PreviewImprovementResponse> {
    console.log(`[RecommendationsExecutor] Executing preview generation for ${requestId}`);
    
    // Validate parameters
    this.validatePreviewImprovementParams(params);
    
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const previewImprovement = httpsCallable(functions, 'previewImprovement');

    const result = await previewImprovement({
      jobId: params.jobId,
      recommendationId: params.recommendationId
    });

    const responseData = result.data as any;
    
    return {
      success: true,
      data: responseData.data
    };
  }

  // ============================================================================
  // PARAMETER VALIDATION
  // ============================================================================

  /**
   * Validate parameters for getRecommendations
   */
  private validateGetRecommendationsParams(params: GetRecommendationsParams): void {
    if (!params.jobId || params.jobId.trim() === '') {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Job ID is required and cannot be empty',
        false,
        { params }
      );
    }

    if (params.industryKeywords && !Array.isArray(params.industryKeywords)) {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Industry keywords must be an array',
        false,
        { params }
      );
    }

    if (params.targetRole && typeof params.targetRole !== 'string') {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Target role must be a string',
        false,
        { params }
      );
    }
  }

  /**
   * Validate parameters for applyImprovements
   */
  private validateApplyImprovementsParams(params: ApplyImprovementsParams): void {
    if (!params.jobId || params.jobId.trim() === '') {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Job ID is required and cannot be empty',
        false,
        { params }
      );
    }

    if (!params.selectedRecommendationIds || !Array.isArray(params.selectedRecommendationIds)) {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Selected recommendation IDs must be provided as an array',
        false,
        { params }
      );
    }

    if (params.selectedRecommendationIds.length === 0) {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'At least one recommendation ID must be selected',
        false,
        { params }
      );
    }

    // Validate each recommendation ID
    for (const id of params.selectedRecommendationIds) {
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw this.createError(
          RecommendationErrorType.VALIDATION_ERROR,
          'All recommendation IDs must be non-empty strings',
          false,
          { params, invalidId: id }
        );
      }
    }
  }

  /**
   * Validate parameters for previewImprovement
   */
  private validatePreviewImprovementParams(params: PreviewImprovementParams): void {
    if (!params.jobId || params.jobId.trim() === '') {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Job ID is required and cannot be empty',
        false,
        { params }
      );
    }

    if (!params.recommendationId || params.recommendationId.trim() === '') {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Recommendation ID is required and cannot be empty',
        false,
        { params }
      );
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Create a standardized recommendation error
   */
  private createError(
    type: RecommendationErrorType,
    message: string,
    retryable: boolean,
    context: Record<string, unknown>
  ): RecommendationError {
    const error = new Error(message) as RecommendationError;
    error.type = type;
    error.retryable = retryable;
    error.context = context;
    error.timestamp = new Date();
    return error;
  }

  /**
   * Sanitize parameters for logging (remove sensitive data)
   */
  private sanitizeParamsForLogging(params: any): any {
    const sanitized = { ...params };
    
    // Remove or mask sensitive fields if any
    if (sanitized.userId) {
      sanitized.userId = sanitized.userId.substring(0, 8) + '***';
    }
    
    return sanitized;
  }

  /**
   * Check if Firebase functions are available
   */
  async checkFirebaseFunctionsAvailability(): Promise<boolean> {
    try {
      const { getFunctions } = await import('firebase/functions');
      const functions = getFunctions();
      return !!functions;
    } catch (error) {
      console.error('[RecommendationsExecutor] Firebase functions not available:', error);
      return false;
    }
  }

  /**
   * Get execution context for debugging
   */
  getExecutionContext(requestId: string): {
    requestId: string;
    timestamp: string;
    environment: string;
  } {
    return {
      requestId,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };
  }
}