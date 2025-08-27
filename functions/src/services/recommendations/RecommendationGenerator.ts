import { CVTransformationService, CVRecommendation } from '../cv-transformation.service';
import { ParsedCV } from '../../types/job';
import { CircuitBreakerManager } from './CircuitBreakerCore';
import { RetryManager } from './RetryManager';
import { TimeoutManager } from './TimeoutManager';

/**
 * RecommendationGenerator - Handles AI-powered recommendation generation
 * Coordinates with CVTransformationService for intelligent recommendations
 */
export class RecommendationGenerator {
  private transformationService: CVTransformationService;

  constructor() {
    this.transformationService = new CVTransformationService();
  }

  /**
   * Generates recommendations with multiple fallback strategies and circuit breaker protection
   */
  async generateWithFallbacks(
    originalCV: ParsedCV,
    targetRole?: string,
    industryKeywords?: string[]
  ): Promise<{ recommendations: CVRecommendation[]; method: string }> {
    const circuitBreaker = CircuitBreakerManager.getBreaker('recommendation-generation');

    return circuitBreaker.execute(
      async () => {
        // Primary attempt with timeout and retry
        return RetryManager.withRetry(
          async () => {
            return TimeoutManager.withTimeout(
              async () => {
                console.log('🔍 Attempting primary recommendation generation with circuit breaker');
                const recommendations = await this.transformationService.generateDetailedRecommendations(
                  originalCV,
                  targetRole,
                  industryKeywords
                );
                
                if (recommendations.length === 0) {
                  throw new Error('Primary method returned 0 recommendations');
                }
                
                console.log(`✅ Primary generation successful: ${recommendations.length} recommendations`);
                return { recommendations, method: 'detailed' };
              },
              90000, // 90 second timeout
              'Primary recommendation generation timed out'
            );
          },
          2, // 2 retry attempts
          2000 // 2 second base delay
        );
      },
      // Fallback function when circuit breaker is open
      async () => {
        console.log('🔄 Circuit breaker fallback: trying role-enhanced generation');
        
        try {
          const recommendations = await TimeoutManager.withTimeout(
            async () => this.transformationService.generateRoleEnhancedRecommendations(
              originalCV,
              true,
              targetRole,
              industryKeywords
            ),
            60000, // 60 second timeout for fallback
            'Role-enhanced generation timed out'
          );
          
          if (recommendations.length === 0) {
            throw new Error('Role-enhanced fallback returned 0 recommendations');
          }
          
          console.log(`✅ Role-enhanced fallback successful: ${recommendations.length} recommendations`);
          return { recommendations, method: 'role-enhanced-fallback' };
          
        } catch (fallbackError: any) {
          console.warn('🚨 All AI methods failed, using emergency recommendations:', fallbackError.message);
          
          // Final fallback: Emergency recommendations (no AI dependency)
          const recommendations = this.generateEmergencyRecommendations(originalCV);
          console.log(`⚠️ Emergency generation: ${recommendations.length} recommendations`);
          return { recommendations, method: 'emergency-fallback' };
        }
      }
    );
  }

  /**
   * Generates comprehensive fallback recommendations
   */
  generateComprehensiveFallback(originalCV: ParsedCV): CVRecommendation[] {
    console.log('🛠️ Generating comprehensive fallback recommendations');
    
    const recommendations: CVRecommendation[] = [];
    const baseId = `comprehensive_${Date.now()}`;
    
    // Professional title recommendation
    if (!originalCV.personalInfo?.title || originalCV.personalInfo.title.length < 5) {
      recommendations.push({
        id: `${baseId}_title`,
        type: 'content',
        category: 'professional_summary',
        section: 'Professional Title',
        actionRequired: 'add',
        title: 'Add Professional Title',
        description: 'A clear professional title helps recruiters immediately understand your role and expertise level.',
        suggestedContent: 'Add a professional title that reflects your expertise and career level.',
        impact: 'high',
        priority: 1,
        estimatedScoreImprovement: 18
      });
    }

    // Contact information enhancement
    if (!originalCV.personalInfo?.email || !originalCV.personalInfo?.phone) {
      recommendations.push({
        id: `${baseId}_contact`,
        type: 'content',
        category: 'ats_optimization',
        section: 'Contact Information',
        actionRequired: 'modify',
        title: 'Complete Contact Information',
        description: 'Ensure all essential contact information is present and accessible to recruiters.',
        suggestedContent: 'Include professional email, phone number, LinkedIn profile, and location.',
        impact: 'high',
        priority: 1,
        estimatedScoreImprovement: 15
      });
    }

    // Key achievements section
    if (!originalCV.achievements || originalCV.achievements.length === 0) {
      recommendations.push({
        id: `${baseId}_achievements`,
        type: 'section_addition',
        category: 'achievements',
        section: 'Key Achievements',
        actionRequired: 'add',
        title: 'Add Key Achievements Section',
        description: 'Highlights your most impressive accomplishments and differentiates you from candidates.',
        suggestedContent: 'Create a "Key Achievements" section with 3-5 quantifiable accomplishments.',
        impact: 'high',
        priority: 2,
        estimatedScoreImprovement: 22
      });
    }

    return recommendations;
  }

  /**
   * Generates emergency fallback recommendations when AI services fail
   */
  private generateEmergencyRecommendations(originalCV: ParsedCV): CVRecommendation[] {
    const fallbackRecommendations: CVRecommendation[] = [];
    const baseId = `fallback_${Date.now()}`;
    
    // Professional summary enhancement or creation
    if (!originalCV.summary || originalCV.summary.length < 50) {
      fallbackRecommendations.push({
        id: `${baseId}_summary_create`,
        type: 'section_addition',
        category: 'professional_summary',
        section: 'Professional Summary',
        actionRequired: 'add',
        title: 'Create Compelling Professional Summary',
        description: 'Essential for making a strong first impression and improving ATS compatibility.',
        suggestedContent: 'Experienced professional with expertise in your field. Proven track record and key skills.',
        impact: 'high',
        priority: 1,
        estimatedScoreImprovement: 25
      });
    }

    // Add experience enhancement if experience exists
    if (originalCV.experience && originalCV.experience.length > 0) {
      fallbackRecommendations.push({
        id: `${baseId}_experience`,
        type: 'content',
        category: 'experience',
        section: 'Experience',
        actionRequired: 'modify',
        title: 'Add Quantifiable Achievements',
        description: 'Transform job descriptions into achievement-focused bullet points with measurable results.',
        suggestedContent: 'Use bullet points with quantifiable achievements, such as "Increased sales by 25%".',
        impact: 'high',
        priority: 1,
        estimatedScoreImprovement: 20
      });
    }

    // ATS optimization
    fallbackRecommendations.push({
      id: `${baseId}_ats_optimization`,
      type: 'keyword_optimization',
      category: 'ats_optimization',
      section: 'Overall ATS Optimization',
      actionRequired: 'modify',
      title: 'Improve ATS Compatibility',
      description: 'Optimize your CV for Applicant Tracking Systems.',
      suggestedContent: 'Use standard section headings, include relevant keywords, use simple formatting.',
      impact: 'high',
      priority: 2,
      estimatedScoreImprovement: 15
    });

    return fallbackRecommendations;
  }
}