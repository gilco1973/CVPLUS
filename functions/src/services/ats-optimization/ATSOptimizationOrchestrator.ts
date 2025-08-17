/**
 * ATS Optimization Orchestrator
 * 
 * Coordinates the entire ATS optimization workflow across all specialized services.
 * Maintains backward compatibility with the original AdvancedATSOptimizationService interface.
 */

import { 
  ParsedCV, 
  ATSOptimizationResult 
} from '../../types/enhanced-models';
import { KeywordAnalysisService } from './KeywordAnalysisService';
import { ATSScoringService } from './ATSScoringService';
import { ContentOptimizationService } from './ContentOptimizationService';
import { FormatOptimizationService } from './FormatOptimizationService';
import { SystemSimulationService } from './SystemSimulationService';
import { CompetitorAnalysisService } from './CompetitorAnalysisService';
import { VerificationService } from './VerificationService';
import { RecommendationService } from './RecommendationService';
import { OptimizationContext } from './types';

export class ATSOptimizationOrchestrator {
  private keywordService: KeywordAnalysisService;
  private scoringService: ATSScoringService;
  private contentService: ContentOptimizationService;
  private formatService: FormatOptimizationService;
  private simulationService: SystemSimulationService;
  private competitorService: CompetitorAnalysisService;
  private verificationService: VerificationService;
  private recommendationService: RecommendationService;

  constructor() {
    this.keywordService = new KeywordAnalysisService();
    this.scoringService = new ATSScoringService();
    this.contentService = new ContentOptimizationService();
    this.formatService = new FormatOptimizationService();
    this.simulationService = new SystemSimulationService();
    this.competitorService = new CompetitorAnalysisService();
    this.verificationService = new VerificationService();
    this.recommendationService = new RecommendationService();
  }

  /**
   * Advanced Multi-Factor ATS Analysis - Main Entry Point
   * 
   * Orchestrates the complete ATS optimization workflow with parallel processing
   * and comprehensive analysis across all specialized services.
   */
  async analyzeCV(
    parsedCV: ParsedCV,
    targetRole?: string,
    targetKeywords?: string[],
    jobDescription?: string,
    industry?: string
  ): Promise<ATSOptimizationResult> {
    console.log('🎯 Starting Advanced Multi-Factor ATS Analysis...');

    const context: OptimizationContext = {
      targetRole,
      targetKeywords,
      jobDescription,
      industry
    };

    try {
      // Step 1: Parallel analysis for efficiency
      const [
        semanticAnalysis,
        systemSimulations,
        competitorBenchmark
      ] = await Promise.all([
        this.keywordService.performSemanticKeywordAnalysis({
          parsedCV,
          jobDescription,
          targetKeywords,
          industry
        }),
        this.simulationService.simulateATSSystems(parsedCV),
        this.competitorService.performCompetitorAnalysis(parsedCV, targetRole, industry)
      ]);

      // Step 2: Calculate advanced multi-factor score
      const advancedScore = this.scoringService.calculateAdvancedScore({
        parsedCV,
        semanticAnalysis,
        systemSimulations,
        competitorBenchmark
      });

      // Step 3: Generate prioritized recommendations
      const recommendations = await this.recommendationService.generatePrioritizedRecommendations({
        parsedCV,
        advancedScore,
        semanticAnalysis,
        systemSimulations,
        competitorBenchmark
      });

      // Ensure recommendations is always an array
      const safeRecommendations = Array.isArray(recommendations) ? recommendations : [];

      // Update the advanced score with recommendations
      advancedScore.recommendations = safeRecommendations;

      // Step 4: Dual-LLM verification of results
      const verifiedResults = await this.verificationService.verifyResultsWithDualLLM({
        advancedScore,
        recommendations: safeRecommendations,
        parsedCV
      });

      // Step 5: Build backward-compatible result
      const result: ATSOptimizationResult = {
        score: advancedScore.overall,
        overall: advancedScore.overall,
        overallScore: advancedScore.overall,
        passes: advancedScore.overall >= 75,
        breakdown: {
          parsing: advancedScore.breakdown.parsing,
          keywords: advancedScore.breakdown.keywords,
          formatting: advancedScore.breakdown.formatting,
          content: advancedScore.breakdown.content,
          specificity: advancedScore.breakdown.specificity
        },
        issues: [
          ...systemSimulations.flatMap((sim: any) => sim.identifiedIssues || []),
          ...safeRecommendations
            .filter(rec => rec.priority === 1 || rec.priority === 2)
            .map(rec => ({ type: 'warning' as const, description: rec.description || 'Optimization needed', severity: rec.priority === 1 ? 'critical' : 'high' }))
        ],
        suggestions: safeRecommendations.map(rec => ({
          section: rec.section || 'general',
          original: rec.currentContent || '',
          suggested: rec.suggestedContent || rec.description || 'Apply recommended improvement',
          reason: rec.description || 'Optimization needed',
          impact: rec.impact || 'medium'
        })),
        recommendations: safeRecommendations.map(rec => rec.description || 'Optimization needed'),
        keywords: {
          found: semanticAnalysis?.matchedKeywords?.map((kw: any) => kw.keyword || kw) || [],
          missing: semanticAnalysis?.missingKeywords || [],
          recommended: semanticAnalysis?.recommendations || [],
          density: semanticAnalysis?.keywordDensity || 0
        },
        advancedScore,
        semanticAnalysis,
        systemSimulations,
        competitorBenchmark: competitorBenchmark || undefined,
        verificationResults: verifiedResults,
        processingMetadata: {
          timestamp: new Date().toISOString(),
          version: '2.0.0-modular',
          processingTime: Date.now(),
          confidenceLevel: advancedScore.confidence || 0.85
        }
      };

      console.log('✅ ATS Analysis completed successfully');
      return result;

    } catch (error) {
      console.error('❌ Error in ATS analysis:', error);
      
      // Fallback to basic analysis
      return this.contentService.fallbackToBasicAnalysis(parsedCV, context);
    }
  }

  /**
   * Backward compatibility methods
   */
  
  async analyzeATSCompatibility(
    parsedCV: ParsedCV,
    targetRole?: string,
    targetKeywords?: string[]
  ): Promise<ATSOptimizationResult> {
    return this.analyzeCV(parsedCV, targetRole, targetKeywords);
  }

  async applyOptimizations(
    parsedCV: ParsedCV,
    optimizations: any[]
  ): Promise<Partial<ParsedCV>> {
    return this.contentService.generateOptimizedContent(parsedCV, optimizations);
  }

  async getATSTemplates(industry?: string, role?: string): Promise<any[]> {
    return this.formatService.getATSTemplates(industry, role);
  }

  async generateKeywords(
    jobDescription: string,
    industry?: string,
    role?: string
  ): Promise<string[]> {
    return this.keywordService.generateKeywords(jobDescription, industry, role);
  }
}