/**
 * ML Pipeline Service - Refactored with Modular Architecture
 * 
 * This service maintains backward compatibility while delegating to the new
 * modular architecture for improved maintainability and scalability.
 */

import * as admin from 'firebase-admin';
// @ts-ignore - Firebase functions import removed as unused
// import { httpsCallable } from 'firebase/functions';
import { 
  SuccessPrediction, 
  SalaryPrediction, 
  TimeToHirePrediction,
  PredictiveRecommendation,
  FeatureVector,
  MLModelMetadata,
  UserOutcome,
  MLTrainingConfig
} from '../types/phase2-models';
// @ts-ignore - Imports preserved for future use
import { ParsedCV } from '../types/job';
// @ts-ignore - Enhanced job import preserved for future use
import { EnhancedJob } from '../types/enhanced-models';

// Import the new modular architecture
import { 
  MLPipelineOrchestrator, 
  PredictionRequest as OrchestratorRequest
} from './ml-pipeline';

// MLTrainingConfig now imported from types/phase2-models

export interface PredictionRequest {
  userId: string;
  jobId: string;
  cv: ParsedCV;
  jobDescription: string;
  targetRole?: string;
  industry?: string;
  location?: string;
  marketContext?: {
    competitionLevel?: 'low' | 'medium' | 'high';
    urgency?: 'low' | 'medium' | 'high';
    seasonality?: number;
  };
}

export class MLPipelineService {
  private orchestrator: MLPipelineOrchestrator;
  
  // Legacy properties for backward compatibility (deprecated)
  private models: Map<string, MLModelMetadata> = new Map();
  private featureCache: Map<string, FeatureVector> = new Map();
  // @ts-ignore - Prediction cache preserved for future use
  private predictionCache: Map<string, SuccessPrediction> = new Map();
  
  // External ML service configuration
  private readonly ML_API_ENDPOINT = process.env.ML_API_ENDPOINT || 'https://ml-api.cvplus.com/v1';
  private readonly ML_API_KEY = process.env.ML_API_KEY || '';
  // @ts-ignore - Caching configuration preserved for future use
  private readonly ENABLE_CACHING = true;
  // @ts-ignore - Cache TTL configuration preserved for future use
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  
  constructor() {
    console.log('[ML-PIPELINE] Initializing with new modular architecture');
    this.orchestrator = new MLPipelineOrchestrator();
    
    // Legacy initialization for backward compatibility
    this.initializeModels();
    this.setupModelMonitoring();
  }

  /**
   * Generate comprehensive success prediction for a job application
   * Delegates to new modular architecture while maintaining backward compatibility
   */
  async predictSuccess(request: PredictionRequest): Promise<SuccessPrediction> {
    try {
      console.log(`[ML-PIPELINE] Delegating prediction to modular architecture for user ${request.userId}, job ${request.jobId}`);
      
      // Convert legacy request format to orchestrator format
      const orchestratorRequest: OrchestratorRequest = {
        userId: request.userId,
        jobId: request.jobId,
        cv: request.cv,
        jobDescription: request.jobDescription,
        targetRole: request.targetRole,
        industry: request.industry,
        location: request.location,
        marketContext: request.marketContext
      };
      
      // Delegate to new orchestrator
      const prediction = await this.orchestrator.predictSuccess(orchestratorRequest);
      
      console.log(`[ML-PIPELINE] Modular architecture generated prediction with ${Math.round(prediction.interviewProbability * 100)}% interview probability`);
      return prediction;
      
    } catch (error) {
      console.error('[ML-PIPELINE] Modular prediction failed, falling back to legacy logic:', error);
      
      // Fallback to legacy logic if modular architecture fails
      return this.generateFallbackPrediction(request);
    }
  }

  /**
   * Extract comprehensive features from CV and job context
   */
  async extractFeatures(request: PredictionRequest): Promise<FeatureVector> {
    const { cv, jobDescription, industry, location } = request;
    // @ts-ignore - targetRole preserved for future feature extraction use
    const { targetRole } = request;
    
    // Check feature cache
    const featureCacheKey = `features_${request.jobId}_${this.hashCV(cv)}`;
    if (this.featureCache.has(featureCacheKey)) {
      return this.featureCache.get(featureCacheKey)!;
    }
    
    console.log('[ML-PIPELINE] Extracting features...');
    
    const features: FeatureVector = {
      userId: request.userId,
      jobId: request.jobId,
      extractionDate: new Date(),
      
      cvFeatures: await this.extractCVFeatures(cv),
      matchingFeatures: await this.extractMatchingFeatures(cv, jobDescription),
      marketFeatures: await this.extractMarketFeatures(industry, location),
      behaviorFeatures: await this.extractBehaviorFeatures(request.userId),
      derivedFeatures: await this.extractDerivedFeatures(cv, jobDescription)
    };
    
    // Cache features
    this.featureCache.set(featureCacheKey, features);
    
    return features;
  }

  /**
   * Train or retrain ML models with new data
   */
  async trainModel(config: MLTrainingConfig): Promise<{ success: boolean; modelId: string; metrics: any }> {
    try {
      console.log('[ML-PIPELINE] Starting model training...');
      
      // Prepare training data
      const trainingData = await this.prepareTrainingData(config);
      console.log(`[ML-PIPELINE] Prepared ${trainingData.length} training samples`);
      
      // Call external ML training service
      const trainingRequest = {
        model_type: config.modelType,
        hyperparameters: config.hyperparameters,
        validation_config: config.validation,
        features: config.features,
        training_data: trainingData
      };
      
      const response = await this.callMLService('train', trainingRequest);
      
      if (response.success) {
        // Register new model
        const modelMetadata: MLModelMetadata = {
          modelId: response.model_id,
          modelName: `${config.modelType}_${Date.now()}`,
          modelType: config.modelType === 'ensemble' ? 'ensemble' : 'classification',
          version: response.version,
          
          training: {
            trainingDate: new Date(),
            datasetSize: trainingData.length,
            features: config.features.include,
            hyperparameters: config.hyperparameters,
            trainingDuration: response.training_duration_minutes
          },
          
          performance: response.metrics,
          
          deployment: {
            deploymentDate: new Date(),
            environment: 'staging',
            endpoint: `${this.ML_API_ENDPOINT}/models/${response.model_id}`,
            status: 'testing'
          },
          
          monitoring: {
            predictionCount: 0,
            averageLatency: 0,
            errorRate: 0,
            driftScore: 0,
            lastHealthCheck: new Date()
          }
        };
        
        this.models.set(response.model_id, modelMetadata);
        
        // Save to Firestore
        await admin.firestore()
          .collection('ml_models')
          .doc(response.model_id)
          .set(modelMetadata);
        
        console.log(`[ML-PIPELINE] Model training completed: ${response.model_id}`);
        return {
          success: true,
          modelId: response.model_id,
          metrics: response.metrics
        };
      } else {
        throw new Error(`Training failed: ${response.error}`);
      }
      
    } catch (error) {
      console.error('[ML-PIPELINE] Model training failed:', error);
      return {
        success: false,
        modelId: '',
        metrics: { error: (error as Error).message }
      };
    }
  }

  /**
   * Record user outcome for model improvement
   * Delegates to new modular architecture
   */
  async recordOutcome(outcome: UserOutcome): Promise<void> {
    try {
      console.log(`[ML-PIPELINE] Delegating outcome recording to modular architecture for job ${outcome.jobId}`);
      
      // Delegate to new orchestrator
      await this.orchestrator.recordOutcome(outcome);
      
      console.log(`[ML-PIPELINE] Outcome recorded successfully through modular architecture`);
      
    } catch (error) {
      console.error('[ML-PIPELINE] Modular outcome recording failed, falling back to legacy logic:', error as Error);
      
      // Fallback to legacy logic
      await admin.firestore()
        .collection('user_outcomes')
        .doc(outcome.outcomeId)
        .set({
          ...outcome,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          dataVersion: '2.0'
        });
      
      console.log(`[ML-PIPELINE] Outcome recorded through legacy fallback`);
    }
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  private async extractCVFeatures(cv: ParsedCV): Promise<FeatureVector['cvFeatures']> {
    const features = {
      wordCount: 0,
      sectionsCount: 0,
      skillsCount: 0,
      experienceYears: 0,
      educationLevel: 0,
      certificationsCount: 0,
      projectsCount: 0,
      achievementsCount: 0,
      keywordDensity: 0,
      readabilityScore: 0,
      formattingScore: 0
    };

    // Word count
    if (cv.personalInfo?.summary) {
      features.wordCount += cv.personalInfo.summary.split(' ').length;
    }
    if (cv.experience) {
      features.wordCount += cv.experience.reduce((total, exp) => 
        total + (exp.description?.split(' ').length || 0), 0);
    }

    // Sections count
    features.sectionsCount = this.countCVSections(cv);

    // Skills count
    features.skillsCount = this.countSkills(cv.skills);

    // Experience years
    features.experienceYears = this.calculateTotalExperience(cv.experience);

    // Education level
    features.educationLevel = this.getEducationLevel(cv.education);

    // Other features would be calculated here...
    features.readabilityScore = this.calculateReadabilityScore(cv);
    features.formattingScore = this.calculateFormattingScore(cv);

    return features;
  }

  private async extractMatchingFeatures(cv: ParsedCV, jobDescription: string): Promise<FeatureVector['matchingFeatures']> {
    const jobKeywords = await this.extractJobKeywords(jobDescription);
    const cvSkills = this.extractCVSkills(cv);
    
    return {
      skillMatchPercentage: this.calculateSkillMatch(cvSkills, jobKeywords),
      experienceRelevance: this.calculateExperienceRelevance(cv.experience || [], jobDescription),
      educationMatch: this.calculateEducationMatch(cv.education || [], jobDescription),
      industryExperience: this.calculateIndustryExperience(cv.experience || [], jobDescription),
      locationMatch: 0.8, // Placeholder - would be calculated based on location
      salaryAlignment: 0.9, // Placeholder - would be calculated based on salary expectations
      titleSimilarity: this.calculateTitleSimilarity(cv.experience || [], jobDescription),
      companyFit: 0.7 // Placeholder - would be calculated based on company analysis
    };
  }

  private async extractMarketFeatures(industry?: string, location?: string): Promise<FeatureVector['marketFeatures']> {
    // In a real implementation, this would fetch live market data
    return {
      industryGrowth: 0.15, // 15% growth rate
      locationCompetitiveness: 0.7, // Medium competitiveness
      salaryCompetitiveness: 0.8,
      demandSupplyRatio: 1.2, // More demand than supply
      seasonality: this.calculateSeasonality(),
      economicIndicators: 0.8 // Good economic conditions
    };
  }

  private async extractBehaviorFeatures(userId: string): Promise<FeatureVector['behaviorFeatures']> {
    // Would fetch user behavior data from analytics
    return {
      applicationTiming: 3, // 3 days since job posted
      weekdayApplication: true,
      timeOfDay: 14, // 2 PM
      applicationMethod: 1, // Direct application
      cvOptimizationLevel: 0.8,
      platformEngagement: 0.9,
      previousApplications: 5
    };
  }

  private async extractDerivedFeatures(cv: ParsedCV, jobDescription: string): Promise<FeatureVector['derivedFeatures']> {
    return {
      overqualificationScore: this.calculateOverqualification(cv, jobDescription),
      underqualificationScore: this.calculateUnderqualification(cv, jobDescription),
      careerProgressionScore: this.calculateCareerProgression(cv.experience),
      stabilityScore: this.calculateStabilityScore(cv.experience),
      adaptabilityScore: this.calculateAdaptabilityScore(cv),
      leadershipPotential: this.calculateLeadershipPotential(cv),
      innovationIndicator: this.calculateInnovationIndicator(cv)
    };
  }

  // @ts-ignore - Method preserved for future use
  private async predictInterviewProbability(features: FeatureVector): Promise<number> {
    try {
      const response = await this.callMLService('predict/interview', { features });
      return Math.max(0, Math.min(1, response.probability));
    } catch (error) {
      console.error('[ML-PIPELINE] Interview prediction failed:', error);
      // Fallback heuristic
      return this.calculateHeuristicInterviewProbability(features);
    }
  }

  // @ts-ignore - Method preserved for future use
  private async predictOfferProbability(features: FeatureVector): Promise<number> {
    try {
      const response = await this.callMLService('predict/offer', { features });
      return Math.max(0, Math.min(1, response.probability));
    } catch (error) {
      console.error('[ML-PIPELINE] Offer prediction failed:', error);
      // Fallback heuristic
      return this.calculateHeuristicOfferProbability(features);
    }
  }

  // @ts-ignore - Method preserved for future use
  private async predictSalary(features: FeatureVector, request: PredictionRequest): Promise<SalaryPrediction> {
    try {
      const response = await this.callMLService('predict/salary', { features, context: request });
      
      return {
        predictedRange: {
          min: response.salary_range.min,
          max: response.salary_range.max,
          median: response.salary_range.median,
          currency: response.currency || 'USD'
        },
        locationAdjustment: response.location_adjustment || 1.0,
        industryPremium: response.industry_premium || 0,
        experiencePremium: response.experience_premium || 0,
        skillsPremium: response.skills_premium || 0,
        industryMedian: response.industry_median || 75000,
        marketPercentile: response.market_percentile || 50,
        negotiationPotential: response.negotiation_potential || 0.3,
        marketDemand: response.market_demand || 'medium'
      };
    } catch (error) {
      console.error('[ML-PIPELINE] Salary prediction failed:', error);
      return this.generateFallbackSalaryPrediction(features, request);
    }
  }

  // @ts-ignore - Method preserved for future use
  private async predictTimeToHire(features: FeatureVector, request: PredictionRequest): Promise<TimeToHirePrediction> {
    try {
      const response = await this.callMLService('predict/time_to_hire', { features, context: request });
      
      return {
        estimatedDays: response.estimated_days,
        confidence: response.confidence,
        stageBreakdown: response.stage_breakdown,
        factors: response.factors
      };
    } catch (error) {
      console.error('[ML-PIPELINE] Time-to-hire prediction failed:', error);
      return this.generateFallbackTimeToHire(features);
    }
  }

  // @ts-ignore - Method preserved for future use
  private async generatePredictiveRecommendations(
    features: FeatureVector, 
    predictions: { interviewProb: number; offerProb: number },
    request: PredictionRequest
  ): Promise<PredictiveRecommendation[]> {
    const recommendations: PredictiveRecommendation[] = [];
    
    // Skill-based recommendations
    if (features.matchingFeatures.skillMatchPercentage < 0.7) {
      recommendations.push({
        id: 'skill_improvement',
        type: 'skill',
        priority: 1,
        impactOnSuccess: {
          interviewBoost: 15,
          offerBoost: 10,
          salaryBoost: 8,
          timeReduction: 3
        },
        title: 'Improve key skill matching',
        description: 'Adding relevant technical skills could significantly boost your interview chances',
        actionItems: [
          'Complete online certification in required technologies',
          'Add practical projects demonstrating these skills',
          'Update CV with specific skill achievements'
        ],
        timeToImplement: 30,
        difficulty: 'medium',
        cost: 200,
        marketRelevance: 0.9,
        competitorAdoption: 0.6,
        emergingTrend: true,
        evidenceScore: 0.85,
        similarProfilesData: {
          sampleSize: 1250,
          successRate: 0.73,
          averageImprovement: 18
        }
      });
    }

    // Experience-based recommendations
    if (features.matchingFeatures.experienceRelevance < 0.6) {
      recommendations.push({
        id: 'experience_relevance',
        type: 'experience',
        priority: 2,
        impactOnSuccess: {
          interviewBoost: 12,
          offerBoost: 15,
          salaryBoost: 12,
          timeReduction: 2
        },
        title: 'Highlight relevant experience',
        description: 'Better showcase experience that directly relates to the target role',
        actionItems: [
          'Rewrite experience descriptions to match job requirements',
          'Quantify achievements with specific metrics',
          'Emphasize transferable skills'
        ],
        timeToImplement: 5,
        difficulty: 'easy',
        cost: 0,
        marketRelevance: 0.95,
        competitorAdoption: 0.4,
        emergingTrend: false,
        evidenceScore: 0.92,
        similarProfilesData: {
          sampleSize: 2100,
          successRate: 0.68,
          averageImprovement: 14
        }
      });
    }

    return recommendations.slice(0, 10); // Return top 10 recommendations
  }

  // @ts-ignore - Method preserved for future use
  private calculatePredictionConfidence(
    features: FeatureVector, 
    predictions: any
  ): SuccessPrediction['confidence'] {
    // Calculate confidence based on feature quality and model certainty
    const featureQuality = this.assessFeatureQuality(features);
    const predictionCertainty = this.assessPredictionCertainty(predictions);
    
    const overall = (featureQuality + predictionCertainty) / 2;
    
    return {
      overall,
      interviewConfidence: Math.min(overall + 0.1, 1.0),
      offerConfidence: Math.max(overall - 0.1, 0.0),
      salaryConfidence: overall * 0.9 // Salary predictions are typically less certain
    };
  }

  private async callMLService(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`${this.ML_API_ENDPOINT}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.ML_API_KEY}`,
        'X-Service': 'cvplus-phase2'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`ML service call failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  // Helper methods (simplified implementations)
  private countCVSections(cv: ParsedCV): number {
    let count = 0;
    if (cv.personalInfo) count++;
    if (cv.experience && cv.experience.length > 0) count++;
    if (cv.skills) count++;
    if (cv.education && cv.education.length > 0) count++;
    return count;
  }

  private countSkills(skills: any): number {
    if (Array.isArray(skills)) {
      return skills.length;
    } else if (skills && typeof skills === 'object') {
      return (skills.technical?.length || 0) + (skills.soft?.length || 0);
    }
    return 0;
  }

  private calculateTotalExperience(experience?: any[]): number {
    if (!experience) return 0;
    
    let totalMonths = 0;
    experience.forEach(exp => {
      if (exp.startDate && exp.endDate) {
        const start = new Date(exp.startDate);
        const end = exp.endDate === 'Present' ? new Date() : new Date(exp.endDate);
        totalMonths += (end.getFullYear() - start.getFullYear()) * 12 + 
                      (end.getMonth() - start.getMonth());
      }
    });
    
    return Math.round(totalMonths / 12 * 10) / 10; // Years with 1 decimal
  }

  private getEducationLevel(education?: any[]): number {
    if (!education || education.length === 0) return 1;
    
    const degrees = education.map(edu => edu.degree?.toLowerCase() || '');
    
    if (degrees.some(d => d.includes('phd') || d.includes('doctorate'))) return 5;
    if (degrees.some(d => d.includes('master') || d.includes('mba'))) return 4;
    if (degrees.some(d => d.includes('bachelor'))) return 3;
    if (degrees.some(d => d.includes('associate'))) return 2;
    
    return 1;
  }

  private calculateReadabilityScore(cv: ParsedCV): number {
    // Simplified readability calculation
    let totalWords = 0;
    let totalSentences = 0;
    
    if (cv.personalInfo?.summary) {
      const text = cv.personalInfo.summary;
      totalWords += text.split(' ').length;
      totalSentences += (text.match(/[.!?]+/g) || []).length;
    }
    
    const averageWordsPerSentence = totalWords / Math.max(totalSentences, 1);
    
    // Ideal range is 15-20 words per sentence for professional documents
    if (averageWordsPerSentence >= 15 && averageWordsPerSentence <= 20) {
      return 0.9;
    } else if (averageWordsPerSentence >= 10 && averageWordsPerSentence <= 25) {
      return 0.7;
    } else {
      return 0.5;
    }
  }

  private calculateFormattingScore(cv: ParsedCV): number {
    let score = 0.5; // Base score
    
    // Check for consistent date formats
    if (cv.experience && cv.experience.length > 0) {
      const hasConsistentDates = cv.experience.every(exp => 
        exp.startDate && exp.endDate && 
        this.isValidDateFormat(exp.startDate) && 
        (exp.endDate === 'Present' || this.isValidDateFormat(exp.endDate))
      );
      if (hasConsistentDates) score += 0.2;
    }
    
    // Check for structured sections
    if (cv.personalInfo && cv.experience && cv.skills && cv.education) {
      score += 0.2;
    }
    
    // Check for quantified achievements
    if (cv.experience && cv.experience.some(exp => 
      exp.description && /\d+%|\d+\+|\$\d+/g.test(exp.description))) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  private isValidDateFormat(date: string): boolean {
    // Simple date validation
    return /^\d{4}-\d{2}$|^\d{4}-\d{2}-\d{2}$/.test(date);
  }

  // Additional helper methods would be implemented here...
  // @ts-ignore - Method preserved for future use
  private generateCacheKey(request: PredictionRequest): string {
    return `prediction_${request.userId}_${request.jobId}_${this.hashCV(request.cv)}`;
  }

  private hashCV(cv: ParsedCV): string {
    return Buffer.from(JSON.stringify(cv)).toString('base64').slice(0, 16);
  }

  // @ts-ignore - Method preserved for future use
  private async getTrainingDataSize(): Promise<number> {
    const snapshot = await admin.firestore().collection('user_outcomes').count().get();
    return snapshot.data().count;
  }

  // @ts-ignore - Method preserved for future use
  private async logPrediction(prediction: SuccessPrediction, features: FeatureVector): Promise<void> {
    await admin.firestore()
      .collection('ml_predictions')
      .doc(prediction.predictionId)
      .set({
        ...prediction,
        features: features,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }

  private generateFallbackPrediction(request: PredictionRequest): SuccessPrediction {
    // Simplified fallback prediction logic
    const baseProb = 0.15; // Base 15% interview probability
    const experienceBoost = this.calculateTotalExperience(request.cv.experience) * 0.05;
    const skillsBoost = this.countSkills(request.cv.skills) * 0.01;
    
    const interviewProb = Math.min(0.85, baseProb + experienceBoost + skillsBoost);
    const offerProb = interviewProb * 0.4; // Rough conversion rate
    
    return {
      predictionId: `fallback_${Date.now()}`,
      userId: request.userId,
      jobId: request.jobId,
      timestamp: new Date(),
      interviewProbability: interviewProb,
      offerProbability: offerProb,
      hireProbability: offerProb * 0.8,
      salaryPrediction: this.generateFallbackSalaryPrediction(
        {} as FeatureVector, 
        request
      ),
      timeToHire: this.generateFallbackTimeToHire({} as FeatureVector),
      competitivenessScore: Math.round(interviewProb * 100),
      confidence: {
        overall: 0.6,
        interviewConfidence: 0.6,
        offerConfidence: 0.5,
        salaryConfidence: 0.4
      },
      recommendations: [],
      modelMetadata: {
        modelVersion: 'fallback-1.0',
        featuresUsed: ['experience', 'skills'],
        trainingDataSize: 0,
        lastTrainingDate: new Date()
      }
    };
  }

  private generateFallbackSalaryPrediction(features: FeatureVector, request: PredictionRequest): SalaryPrediction {
    const baseSalary = 60000; // Base salary
    const experienceBonus = this.calculateTotalExperience(request.cv.experience) * 5000;
    const median = baseSalary + experienceBonus;
    
    return {
      predictedRange: {
        min: Math.round(median * 0.8),
        max: Math.round(median * 1.3),
        median: Math.round(median),
        currency: 'USD'
      },
      locationAdjustment: 1.0,
      industryPremium: 0,
      experiencePremium: Math.round(experienceBonus / median * 100),
      skillsPremium: 0,
      industryMedian: 70000,
      marketPercentile: 50,
      negotiationPotential: 0.3,
      marketDemand: 'medium'
    };
  }

  private generateFallbackTimeToHire(features: FeatureVector): TimeToHirePrediction {
    return {
      estimatedDays: 21,
      confidence: 0.5,
      stageBreakdown: {
        applicationReview: 3,
        initialScreening: 5,
        interviews: 7,
        decisionMaking: 4,
        offerNegotiation: 2
      },
      factors: {
        companySize: 'medium',
        industrySpeed: 'medium',
        roleComplexity: 'medium',
        marketConditions: 'balanced'
      }
    };
  }

  // Placeholder implementations for various calculation methods
  private calculateHeuristicInterviewProbability(features: FeatureVector): number {
    return Math.max(0.1, Math.min(0.9, 
      features.matchingFeatures.skillMatchPercentage * 0.4 +
      features.matchingFeatures.experienceRelevance * 0.3 +
      features.matchingFeatures.educationMatch * 0.2 +
      features.behaviorFeatures.platformEngagement * 0.1
    ));
  }

  private calculateHeuristicOfferProbability(features: FeatureVector): number {
    const interviewProb = this.calculateHeuristicInterviewProbability(features);
    return interviewProb * 0.35; // Rough conversion rate from interview to offer
  }

  private async extractJobKeywords(jobDescription: string): Promise<string[]> {
    // Simplified keyword extraction - in reality would use NLP
    const commonKeywords = jobDescription.toLowerCase()
      .split(/[^a-zA-Z]+/)
      .filter(word => word.length > 3)
      .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word))
      .slice(0, 20);
    
    return commonKeywords;
  }

  private extractCVSkills(cv: ParsedCV): string[] {
    if (Array.isArray(cv.skills)) {
      return cv.skills;
    } else if (cv.skills && typeof cv.skills === 'object') {
      return [...(cv.skills.technical || []), ...(cv.skills.soft || [])];
    }
    return [];
  }

  private calculateSkillMatch(cvSkills: string[], jobKeywords: string[]): number {
    if (cvSkills.length === 0 || jobKeywords.length === 0) return 0;
    
    const matches = cvSkills.filter(skill => 
      jobKeywords.some(keyword => 
        skill.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(skill.toLowerCase())
      )
    ).length;
    
    return matches / Math.max(cvSkills.length, jobKeywords.length);
  }

  // More placeholder methods...
  private calculateExperienceRelevance(experience: any[], jobDescription: string): number {
    if (!experience || experience.length === 0) return 0;
    
    const jobKeywords = jobDescription.toLowerCase();
    let relevanceScore = 0;
    
    experience.forEach(exp => {
      if (exp.description && jobKeywords.includes(exp.description.toLowerCase().slice(0, 100))) {
        relevanceScore += 0.3;
      }
      if (exp.position && jobKeywords.includes(exp.position.toLowerCase())) {
        relevanceScore += 0.2;
      }
    });
    
    return Math.min(1.0, relevanceScore);
  }

  private calculateEducationMatch(education: any[], jobDescription: string): number {
    if (!education || education.length === 0) return 0.5; // Neutral if no education
    
    const jobLower = jobDescription.toLowerCase();
    let match = 0.5; // Base match
    
    education.forEach(edu => {
      if (edu.field && jobLower.includes(edu.field.toLowerCase())) {
        match += 0.3;
      }
      if (edu.degree && (jobLower.includes('bachelor') || jobLower.includes('master'))) {
        match += 0.2;
      }
    });
    
    return Math.min(1.0, match);
  }

  private calculateIndustryExperience(experience: any[], jobDescription: string): number {
    // Simplified - would need industry classification in reality
    return 0.7; // Placeholder
  }

  private calculateTitleSimilarity(experience: any[], jobDescription: string): number {
    if (!experience || experience.length === 0) return 0;
    
    const jobTitle = jobDescription.split('\n')[0] || ''; // Assume first line is title
    let bestMatch = 0;
    
    experience.forEach(exp => {
      if (exp.position) {
        const similarity = this.stringSimilarity(exp.position.toLowerCase(), jobTitle.toLowerCase());
        bestMatch = Math.max(bestMatch, similarity);
      }
    });
    
    return bestMatch;
  }

  private stringSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation
    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    
    let matches = 0;
    words1.forEach(word1 => {
      if (words2.some(word2 => word1.includes(word2) || word2.includes(word1))) {
        matches++;
      }
    });
    
    return matches / Math.max(words1.length, words2.length);
  }

  private calculateSeasonality(): number {
    const month = new Date().getMonth();
    // Q1 and Q4 typically slower for hiring
    if (month <= 2 || month >= 10) return 0.8;
    return 1.0;
  }

  private calculateOverqualification(cv: ParsedCV, jobDescription: string): number {
    const experienceYears = this.calculateTotalExperience(cv.experience);
    const educationLevel = this.getEducationLevel(cv.education);
    
    // Simple heuristic - would be more sophisticated in reality
    if (experienceYears > 10 && educationLevel >= 4) return 0.7;
    if (experienceYears > 15) return 0.9;
    return 0.3;
  }

  private calculateUnderqualification(cv: ParsedCV, jobDescription: string): number {
    const experienceYears = this.calculateTotalExperience(cv.experience);
    const educationLevel = this.getEducationLevel(cv.education);
    
    // Look for minimum requirements in job description
    const requiresExperience = /(\d+)\+?\s*years?\s*(of\s*)?experience/i.exec(jobDescription);
    const requiredYears = requiresExperience ? parseInt(requiresExperience[1]) : 2;
    
    if (experienceYears < requiredYears * 0.7) return 0.8;
    if (educationLevel < 3 && jobDescription.toLowerCase().includes('degree')) return 0.6;
    
    return 0.2;
  }

  private calculateCareerProgression(experience?: any[]): number {
    if (!experience || experience.length < 2) return 0.5;
    
    // Look for progression in titles/responsibilities
    let progressionScore = 0.5;
    
    for (let i = 1; i < experience.length; i++) {
      const current = experience[i-1]; // More recent
      const previous = experience[i]; // Older
      
      if (current.position && previous.position) {
        if (current.position.toLowerCase().includes('senior') && 
            !previous.position.toLowerCase().includes('senior')) {
          progressionScore += 0.2;
        }
        if (current.position.toLowerCase().includes('lead') || 
            current.position.toLowerCase().includes('manager')) {
          progressionScore += 0.1;
        }
      }
    }
    
    return Math.min(1.0, progressionScore);
  }

  private calculateStabilityScore(experience?: any[]): number {
    if (!experience || experience.length === 0) return 0.5;
    
    const tenures = experience.map(exp => {
      if (exp.startDate && exp.endDate) {
        const start = new Date(exp.startDate);
        const end = exp.endDate === 'Present' ? new Date() : new Date(exp.endDate);
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365); // Years
      }
      return 2; // Default 2 years if dates unavailable
    });
    
    const averageTenure = tenures.reduce((sum, tenure) => sum + tenure, 0) / tenures.length;
    
    // Score based on average tenure
    if (averageTenure >= 3) return 0.9;
    if (averageTenure >= 2) return 0.7;
    if (averageTenure >= 1) return 0.5;
    return 0.3;
  }

  private calculateAdaptabilityScore(cv: ParsedCV): number {
    let adaptabilityScore = 0.5;
    
    // Look for diverse experience
    if (cv.experience && cv.experience.length > 0) {
      const companies = new Set(cv.experience.map(exp => exp.company));
      if (companies.size >= 3) adaptabilityScore += 0.2;
      
      // Look for different industries/roles
      const positions = cv.experience.map(exp => exp.position?.toLowerCase() || '');
      const hasVariety = positions.some(pos => pos.includes('software')) && 
                        positions.some(pos => pos.includes('analyst') || pos.includes('consultant'));
      if (hasVariety) adaptabilityScore += 0.2;
    }
    
    // Look for continuous learning (certifications, education)
    if (cv.education && cv.education.length > 1) adaptabilityScore += 0.1;
    
    return Math.min(1.0, adaptabilityScore);
  }

  private calculateLeadershipPotential(cv: ParsedCV): number {
    let leadershipScore = 0.3; // Base score
    
    if (cv.experience) {
      cv.experience.forEach(exp => {
        const position = exp.position?.toLowerCase() || '';
        const description = exp.description?.toLowerCase() || '';
        
        if (position.includes('lead') || position.includes('manager') || 
            position.includes('director') || position.includes('head')) {
          leadershipScore += 0.3;
        }
        
        if (description.includes('team') || description.includes('led') || 
            description.includes('managed') || description.includes('mentored')) {
          leadershipScore += 0.1;
        }
        
        if (description.includes('project') && description.includes('lead')) {
          leadershipScore += 0.1;
        }
      });
    }
    
    return Math.min(1.0, leadershipScore);
  }

  private calculateInnovationIndicator(cv: ParsedCV): number {
    let innovationScore = 0.3;
    
    if (cv.experience) {
      cv.experience.forEach(exp => {
        const description = exp.description?.toLowerCase() || '';
        
        if (description.includes('innovation') || description.includes('created') ||
            description.includes('developed') || description.includes('designed')) {
          innovationScore += 0.1;
        }
        
        if (description.includes('patent') || description.includes('research') ||
            description.includes('algorithm') || description.includes('ai')) {
          innovationScore += 0.2;
        }
        
        // Look for quantified improvements
        if (/improved.*\d+%|increased.*\d+%|reduced.*\d+%/.test(description)) {
          innovationScore += 0.1;
        }
      });
    }
    
    return Math.min(1.0, innovationScore);
  }

  // @ts-ignore - Method preserved for future use
  private calculateCompetitivenessScore(features: FeatureVector, request: PredictionRequest): Promise<number> {
    // Combine various factors to determine competitiveness
    const skillMatch = features.matchingFeatures.skillMatchPercentage * 30;
    const experience = Math.min(features.cvFeatures.experienceYears / 10, 1) * 25;
    const education = (features.cvFeatures.educationLevel / 5) * 20;
    const marketPosition = features.marketFeatures.demandSupplyRatio * 15;
    const careerProgression = features.derivedFeatures.careerProgressionScore * 10;
    
    return Promise.resolve(Math.round(skillMatch + experience + education + marketPosition + careerProgression));
  }

  private assessFeatureQuality(features: FeatureVector): number {
    // Assess the quality/completeness of extracted features
    let quality = 0.5;
    
    if (features.cvFeatures.wordCount > 200) quality += 0.1;
    if (features.cvFeatures.experienceYears > 0) quality += 0.1;
    if (features.cvFeatures.skillsCount > 5) quality += 0.1;
    if (features.matchingFeatures.skillMatchPercentage > 0.3) quality += 0.1;
    if (features.cvFeatures.educationLevel > 2) quality += 0.1;
    
    return Math.min(1.0, quality);
  }

  private assessPredictionCertainty(predictions: any): number {
    // Assess how certain we are about the predictions
    // This would typically be based on model confidence intervals
    return 0.8; // Placeholder
  }

  private async prepareTrainingData(config: MLTrainingConfig): Promise<any[]> {
    // Fetch user outcomes from Firestore
    const outcomes = await admin.firestore()
      .collection('user_outcomes')
      .where('finalResult.status', '!=', 'pending')
      .limit(10000)
      .get();
    
    const trainingData = [];
    
    for (const doc of outcomes.docs) {
      const outcome = doc.data() as UserOutcome;
      
      // Extract features for this outcome
      // This is a simplified version - real implementation would be more complex
      const features = {
        // CV features
        experience_years: this.calculateTotalExperience(outcome.cvData as any),
        skills_count: 10, // Placeholder
        education_level: 3, // Placeholder
        
        // Outcome (label)
        got_interview: outcome.timeline.some(event => event.eventType.includes('interview')),
        got_offer: outcome.finalResult.status === 'hired',
        time_to_result: outcome.finalResult.timeToResult || 0
      };
      
      trainingData.push(features);
    }
    
    return trainingData;
  }

  // @ts-ignore - Method preserved for future use
  private async updateModelPerformance(outcome: UserOutcome): Promise<void> {
    // Update model performance metrics based on actual outcomes
    // This would compare predictions with actual results
    console.log(`[ML-PIPELINE] Updating model performance for outcome ${outcome.outcomeId}`);
  }

  // @ts-ignore - Method preserved for future use
  private async getOutcomeCount(): Promise<number> {
    const snapshot = await admin.firestore().collection('user_outcomes').count().get();
    return snapshot.data().count;
  }

  // @ts-ignore - Method preserved for future use
  private async scheduleModelRetraining(): Promise<void> {
    // Schedule background job for model retraining
    // In a real implementation, this would trigger a Cloud Task or similar
    console.log('[ML-PIPELINE] Model retraining scheduled');
  }

  private async initializeModels(): Promise<void> {
    // Load existing models from Firestore
    const models = await admin.firestore().collection('ml_models').get();
    
    models.docs.forEach(doc => {
      const model = doc.data() as MLModelMetadata;
      this.models.set(doc.id, model);
    });
    
    console.log(`[ML-PIPELINE] Initialized with ${this.models.size} models`);
  }

  private setupModelMonitoring(): void {
    // Set up periodic model health checks
    setInterval(async () => {
      await this.runModelHealthCheck();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private async runModelHealthCheck(): Promise<void> {
    // Check model health, performance, and drift
    for (const [modelId, model] of this.models) {
      try {
        // Check if model is responding
        const healthResponse = await this.callMLService(`models/${modelId}/health`, {});
        
        if (healthResponse.status === 'healthy') {
          // Update monitoring data
          model.monitoring.lastHealthCheck = new Date();
          model.monitoring.averageLatency = healthResponse.latency;
          model.monitoring.errorRate = healthResponse.error_rate;
          
          // Update in Firestore
          await admin.firestore()
            .collection('ml_models')
            .doc(modelId)
            .update({
              'monitoring.lastHealthCheck': admin.firestore.FieldValue.serverTimestamp(),
              'monitoring.averageLatency': healthResponse.latency,
              'monitoring.errorRate': healthResponse.error_rate
            });
        }
      } catch (error) {
        console.error(`[ML-PIPELINE] Health check failed for model ${modelId}:`, error);
      }
    }
  }
}

// Export singleton instance
export const mlPipelineService = new MLPipelineService();