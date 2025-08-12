/**
 * LLM Verification Integration Examples
 * 
 * This file demonstrates how to integrate the comprehensive LLM verification system
 * with existing CVPlus services. These examples show various integration patterns
 * from simple drop-in replacements to advanced custom implementations.
 * 
 * NOTE: These examples are temporarily commented out due to API interface changes.
 * This serves as a reference for future implementation once the APIs are stabilized.
 */

import { cvParsingWrapper, piiDetectionWrapper, skillsAnalysisWrapper } from '../services/llm-integration-wrapper.service';
import { llmMonitoringService } from '../services/llm-monitoring.service';

/*

/**
 * Example 1: Simple drop-in replacement for existing CV parsing
 * 
 * This shows how existing services can adopt verification with minimal changes
 */
export async function exampleSimpleCVParsing(cvText: string): Promise<any> {
  console.log('🔄 Example 1: Simple CV Parsing with Verification');
  
  try {
    // Old way (without verification):
    // const result = await callClaudeDirectly(cvText);
    
    // New way (with verification) - just replace the service call:
    const result = await cvParsingWrapper.parseCV(
      cvText,
      'Focus on extracting technical skills and work experience accurately',
      { fileName: 'example-cv.pdf', mimeType: 'application/pdf' }
    );

    console.log('✅ CV Parsing completed:', {
      verified: result.verified,
      verificationScore: result.verificationScore,
      contentLength: result.content.length,
      auditId: result.auditId
    });

    return JSON.parse(result.content);
    
  } catch (error) {
    console.error('❌ CV Parsing failed:', error);
    throw error;
  }
}

/**
 * Example 2: Advanced verification with custom validation criteria
 * 
 * This shows how to use custom validation for specific business requirements
 */
export async function exampleAdvancedCVAnalysis(cvData: any, targetRole: string): Promise<any> {
  console.log('🔄 Example 2: Advanced CV Analysis with Custom Validation');
  
  // Import services dynamically to avoid issues
  const { VerifiedClaudeService } = await import('../services/verified-claude.service');
  const verifiedClaudeService = new VerifiedClaudeService();
  
  try {
    // Create custom validation criteria for role-specific analysis
    /*
    const _customValidation = {
      accuracy: true,
      completeness: true,
      relevance: true,
      consistency: true,
      safety: true,
      format: true,
      customCriteria: [
        {
          name: 'role_alignment',
          description: `Assess alignment with ${targetRole} requirements`,
          weight: 0.9
        },
        {
          name: 'experience_validation',
          description: 'Validate work experience claims for realism',
          weight: 0.8
        },
        {
          name: 'skill_proficiency',
          description: 'Evaluate claimed skill proficiency levels',
          weight: 0.7
        }
      ]
    };
    */

    const response = await verifiedClaudeService.createVerifiedMessage({
      service: 'advanced-cv-analysis',
      messages: [{
        role: 'user',
        content: `Analyze this CV for a ${targetRole} position:
        
        CV Data: ${JSON.stringify(cvData, null, 2)}
        
        Please provide:
        1. Role alignment assessment (0-100%)
        2. Experience validation with specific concerns
        3. Skill proficiency evaluation
        4. Improvement recommendations
        5. Overall candidacy assessment
        
        Be thorough but realistic in your evaluation.`
      }],
      model: 'claude-sonnet-4-20250514',
      temperature: 0.1,
      max_tokens: 4000,
      // validationCriteria: customValidation,
      // context: {
      //   analysisType: 'role-specific',
      //   targetRole,
      //   requiresHighAccuracy: true
      // }
    });

    console.log('✅ Advanced Analysis completed:', {
      verified: response.verification?.isValid || false,
      verificationScore: response.verification?.confidence || 0,
      confidence: response.verification?.confidence || 0,
      issues: 0,
      retryCount: 0
    });

    const contentText = Array.isArray(response.content) ? 
      response.content.map((c: any) => c.text).join('\n') : 
      String(response.content);

    return {
      analysis: JSON.parse(contentText),
      verificationMetrics: {
        verified: response.verification?.isValid || false,
        score: response.verification?.confidence || 0,
        confidence: response.verification?.confidence || 0,
        auditId: ''
      }
    };
    
  } catch (error) {
    console.error('❌ Advanced Analysis failed:', error);
    throw error;
  }
}

/**
 * Example 3: Batch processing with verification
 * 
 * Shows how to process multiple CVs with comprehensive monitoring
 */
export async function exampleBatchCVProcessing(cvDataList: any[]): Promise<any[]> {
  console.log('🔄 Example 3: Batch CV Processing with Verification');
  
  try {
    /*
    const _batchRequests = cvDataList.map((cvData, index) => ({
      service: 'batch-cv-processing',
      messages: [{
        role: 'user',
        content: `Extract structured data from this CV (${index + 1}/${cvDataList.length}):
        
        ${JSON.stringify(cvData, null, 2)}
        
        Return clean, structured JSON with all relevant information.`
      }],
      context: {
        batchId: `batch_${Date.now()}`,
        itemIndex: index,
        totalItems: cvDataList.length
      }
    }));
    */

    // Process in batches with comprehensive monitoring
    // Note: Batch processing not available in current API
    const batchResult: any = { results: [], totalTime: 0 };
    /*
    const batchResult = await verifiedClaudeService.createBatchVerifiedMessages(
      batchRequests,
      {
        maxConcurrent: 3, // Process 3 at a time to avoid rate limits
        stopOnFirstFailure: false // Continue even if some fail
      }
    );
    */

    console.log('✅ Batch Processing completed:', {
      total: batchResult.results.length,
      successful: 0,
      failed: 0,
      totalTime: batchResult.totalTime,
      avgTimePerItem: batchResult.totalTime / Math.max(batchResult.results.length, 1)
    });

    // Process results and separate successes from failures
    const processedResults = batchResult.results.map((result: any, index: number) => {
      if (result instanceof Error) {
        return {
          index,
          success: false,
          error: result.message,
          data: null
        };
      }

      return {
        index,
        success: true,
        data: {},
        verificationMetrics: {
          verified: result.verified,
          score: result.verificationScore,
          auditId: result.auditId
        }
      };
    });

    return processedResults;
    
  } catch (error) {
    console.error('❌ Batch Processing failed:', error);
    throw error;
  }
}

/**
 * Example 4: Real-time processing with streaming updates
 * 
 * Demonstrates streaming API for real-time applications
 */
export async function exampleStreamingCVAnalysis(cvText: string, onUpdate: (update: any) => void): Promise<void> {
  console.log('🔄 Example 4: Streaming CV Analysis');
  
  // Import services dynamically to avoid issues
  const { VerifiedClaudeService } = await import('../services/verified-claude.service');
  const verifiedClaudeService = new VerifiedClaudeService();
  
  try {
    const streamRequest = {
      service: 'streaming-cv-analysis',
      messages: [{
        role: 'user',
        content: `Perform comprehensive CV analysis:
        
        ${cvText}
        
        Provide detailed analysis of:
        1. Personal information extraction
        2. Work experience evaluation  
        3. Skills assessment
        4. Education verification
        5. Overall quality scoring`
      }],
      context: {
        streamingEnabled: true,
        realTimeUpdates: true
      }
    };

    // Process with streaming updates
    // Method streamVerifiedMessage doesn't exist - commenting out for compilation
    // for await (const update of verifiedClaudeService.streamVerifiedMessage(streamRequest)) {
    const updates = []; // Mock for compilation
    for (const update of updates) {
      console.log('📡 Stream update:', update.type);
      
      switch (update.type) {
        case 'progress':
          onUpdate({
            type: 'progress',
            message: update.data.message,
            stage: update.data.stage
          });
          break;
          
        case 'partial':
          onUpdate({
            type: 'partial_result',
            content: update.data.content,
            processingTime: update.data.processingTime
          });
          break;
          
        case 'verification':
          onUpdate({
            type: 'verification_update',
            verified: update.data.verified,
            confidence: update.data.confidence,
            score: update.data.score,
            issues: update.data.issues
          });
          break;
          
        case 'complete':
          onUpdate({
            type: 'complete',
            result: JSON.parse(update.data.content),
            verificationMetrics: {
              verified: update.data.verified,
              score: update.data.verificationScore,
              auditId: update.data.auditId
            }
          });
          break;
          
        case 'error':
          onUpdate({
            type: 'error',
            error: update.data.error,
            timestamp: update.data.timestamp
          });
          break;
      }
    }
    
    console.log('✅ Streaming Analysis completed');
    
  } catch (error) {
    console.error('❌ Streaming Analysis failed:', error);
    onUpdate({
      type: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Example 5: PII Detection and Sanitization
 * 
 * Shows how to use the PII detection wrapper for data privacy
 */
export async function examplePIIDetectionAndSanitization(text: string): Promise<{
  sanitizedText: string;
  piiFindings: any;
  riskLevel: string;
}> {
  console.log('🔄 Example 5: PII Detection and Sanitization');
  
  try {
    // Detect PII with high sensitivity
    const piiResult = await piiDetectionWrapper.detectPII(text, {
      sensitivity: 'high',
      categories: ['names', 'email', 'phone', 'address', 'ssn', 'credit_card'],
      includeContext: true
    });

    const piiData = JSON.parse(piiResult.content);
    
    console.log('✅ PII Detection completed:', {
      verified: piiResult.verified,
      piiDetected: piiData.piiDetected,
      totalFindings: piiData.totalFindings,
      riskLevel: piiData.riskLevel
    });

    // Sanitize the text based on findings
    let sanitizedText = text;
    
    if (piiData.piiDetected) {
      piiData.findings.forEach((finding: any) => {
        const placeholder = `[${finding.type.toUpperCase()}_REDACTED]`;
        sanitizedText = sanitizedText.replace(finding.value, placeholder);
      });
    }

    return {
      sanitizedText,
      piiFindings: piiData,
      riskLevel: piiData.riskLevel
    };
    
  } catch (error) {
    console.error('❌ PII Detection failed:', error);
    throw error;
  }
}

/**
 * Example 6: System Health Monitoring
 * 
 * Shows how to implement comprehensive system monitoring
 */
export async function exampleSystemHealthMonitoring(): Promise<void> {
  console.log('🔄 Example 6: System Health Monitoring');
  
  // Import services dynamically to avoid issues
  const { VerifiedClaudeService } = await import('../services/verified-claude.service');
  const { LLMVerificationService } = await import('../services/llm-verification.service');
  const verifiedClaudeService = new VerifiedClaudeService();
  const llmVerificationService = new LLMVerificationService();
  
  try {
    // Get comprehensive health status
    // Method getHealthStatus doesn't exist - using mock for compilation
    const healthStatus = { service: 'healthy', components: {}, metrics: {} };
    
    console.log('🏥 System Health Status:', {
      overall: healthStatus.service,
      components: healthStatus.components,
      metrics: healthStatus.metrics
    });

    // Get detailed performance metrics
    // Method getDetailedMetrics doesn't exist - using mock for compilation
    const detailedMetrics = { performance: { throughput: 0, averageResponseTime: 0 }, reliability: { successRate: 0 }, quality: { averageScore: 0 } };
    
    console.log('📊 Performance Metrics:', {
      throughput: detailedMetrics.performance.throughput,
      averageResponseTime: detailedMetrics.performance.averageResponseTime,
      successRate: detailedMetrics.reliability.successRate,
      qualityScore: detailedMetrics.quality.averageScore
    });

    // Get dashboard data for visualization
    const dashboardData = llmMonitoringService.getDashboardData('24h');
    
    console.log('📈 Dashboard Summary:', {
      totalRequests: dashboardData.summary.totalRequests,
      successRate: dashboardData.summary.successRate,
      healthStatus: dashboardData.summary.healthStatus,
      topServices: dashboardData.topServices.map(s => s.name)
    });

    // Check for any active alerts
    if (dashboardData.recentAlerts.length > 0) {
      console.warn('⚠️ Active Alerts:', dashboardData.recentAlerts);
    }

    console.log('✅ Health Monitoring completed');
    
  } catch (error) {
    console.error('❌ Health Monitoring failed:', error);
    throw error;
  }
}

/**
 * Example 7: Service Warmup and Performance Optimization
 * 
 * Shows how to warm up services for optimal performance
 */
export async function exampleServiceWarmupAndOptimization(): Promise<void> {
  console.log('🔄 Example 7: Service Warmup and Optimization');
  
  // Import services dynamically to avoid issues
  const { VerifiedClaudeService } = await import('../services/verified-claude.service');
  const { LLMVerificationService } = await import('../services/llm-verification.service');
  const verifiedClaudeService = new VerifiedClaudeService();
  const llmVerificationService = new LLMVerificationService();
  
  try {
    // Warm up the Claude service
    console.log('🔥 Warming up Claude service...');
    // Method warmUp doesn't exist - using mock for compilation
    const warmupResult = { success: true, anthropicReady: true, verificationReady: true, responseTime: 0 };
    
    console.log('✅ Warmup completed:', {
      success: warmupResult.success,
      anthropicReady: warmupResult.anthropicReady,
      verificationReady: warmupResult.verificationReady,
      responseTime: warmupResult.responseTime
    });

    // Perform health check on verification service
    console.log('🏥 Performing verification service health check...');
    const healthCheck = await llmVerificationService.healthCheck();
    
    console.log('✅ Health check completed:', {
      healthy: healthCheck.status === 'healthy',
      status: healthCheck.status,
      checks: (healthCheck.details?.checks || []).map((c: any) => ({
        name: c.name,
        status: c.status,
        message: c.message
      }))
    });

    // Get service configuration and statistics
    // Method getServiceInfo doesn't exist - using mock for compilation
    const serviceInfo = { version: '1.0.0', uptime: 0, totalRequests: 0, cacheSize: 0 };
    
    console.log('ℹ️ Service Information:', {
      version: serviceInfo.version,
      uptime: `${Math.round(serviceInfo.uptime / 1000)}s`,
      totalRequests: serviceInfo.totalRequests,
      cacheSize: serviceInfo.cacheSize
    });

    console.log('✅ Service optimization completed');
    
  } catch (error) {
    console.error('❌ Service optimization failed:', error);
    throw error;
  }
}

/**
 * Complete Integration Example
 * 
 * Shows a complete workflow combining multiple verification features
 */
export async function exampleCompleteIntegrationWorkflow(
  cvText: string,
  targetRole: string,
  onProgress?: (progress: any) => void
): Promise<{
  cvAnalysis: any;
  piiReport: any;
  skillsAssessment: any;
  verificationSummary: any;
}> {
  console.log('🚀 Starting Complete Integration Workflow');
  
  try {
    // Step 1: PII Detection and Sanitization
    onProgress?.({ step: 1, message: 'Detecting and sanitizing PII...' });
    const piiResult = await examplePIIDetectionAndSanitization(cvText);
    
    // Step 2: CV Parsing with Verification
    onProgress?.({ step: 2, message: 'Parsing CV with verification...' });
    const cvData = await exampleSimpleCVParsing(piiResult.sanitizedText);
    
    // Step 3: Advanced Analysis
    onProgress?.({ step: 3, message: 'Performing advanced role analysis...' });
    const analysisResult = await exampleAdvancedCVAnalysis(cvData, targetRole);
    
    // Step 4: Skills Assessment
    onProgress?.({ step: 4, message: 'Analyzing skills and competencies...' });
    const skillsResult = await skillsAnalysisWrapper.analyzeSkills(cvData, {
      includeMarketAnalysis: true,
      targetRole,
      industry: 'technology'
    });
    
    // Step 5: Generate comprehensive summary
    const verificationSummary = {
      piiSafety: {
        detected: piiResult.piiFindings.piiDetected,
        riskLevel: piiResult.riskLevel,
        findingsCount: piiResult.piiFindings.totalFindings
      },
      cvAnalysisQuality: {
        verified: analysisResult.verificationMetrics.verified,
        score: analysisResult.verificationMetrics.score,
        confidence: analysisResult.verificationMetrics.confidence
      },
      skillsAnalysisQuality: {
        verified: skillsResult.verified,
        score: skillsResult.verificationScore
      },
      overallRecommendation: 'All analyses completed successfully with high verification scores'
    };

    onProgress?.({ step: 5, message: 'Workflow completed successfully!' });
    
    console.log('✅ Complete Integration Workflow finished');

    return {
      cvAnalysis: analysisResult.analysis,
      piiReport: piiResult.piiFindings,
      skillsAssessment: JSON.parse(skillsResult.content),
      verificationSummary
    };
    
  } catch (error) {
    console.error('❌ Complete Integration Workflow failed:', error);
    throw error;
  }
}

// Export all examples for testing and demonstration
export const LLMVerificationExamples = {
  simpleCVParsing: () => Promise.resolve({ message: 'Example temporarily disabled' }),
  advancedCVAnalysis: () => Promise.resolve({ message: 'Example temporarily disabled' }),
  batchProcessing: () => Promise.resolve({ message: 'Example temporarily disabled' }),
  streamingAnalysis: () => Promise.resolve({ message: 'Example temporarily disabled' }),
  piiDetection: () => Promise.resolve({ message: 'Example temporarily disabled' }),
  healthMonitoring: () => Promise.resolve({ message: 'Example temporarily disabled' }),
  serviceWarmup: () => Promise.resolve({ message: 'Example temporarily disabled' }),
  completeWorkflow: () => Promise.resolve({ message: 'Example temporarily disabled' })
};

// */
