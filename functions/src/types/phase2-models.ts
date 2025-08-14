/**
 * Phase 2 Enhanced Data Models
 * 
 * Advanced types for ML pipeline, success predictions, analytics,
 * industry specialization, and regional localization.
 */

// Note: ParsedCV import removed as unused in this file

// ===============================
// SUCCESS PREDICTION MODELS
// ===============================

export interface SuccessPrediction {
  predictionId: string;
  userId: string;
  jobId: string;
  timestamp: Date;
  
  // Core predictions
  interviewProbability: number; // 0-1
  offerProbability: number; // 0-1
  hireProbability: number; // 0-1
  
  // Advanced predictions
  salaryPrediction: SalaryPrediction;
  timeToHire: TimeToHirePrediction;
  competitivenessScore: number; // 0-100
  
  // Confidence metrics
  confidence: {
    overall: number; // 0-1
    interviewConfidence: number;
    offerConfidence: number;
    salaryConfidence: number;
  };
  
  // Recommendations
  recommendations: PredictiveRecommendation[];
  
  // Model metadata
  modelMetadata: {
    modelVersion: string;
    featuresUsed: string[];
    trainingDataSize: number;
    lastTrainingDate: Date;
  };
}

export interface SalaryPrediction {
  predictedRange: {
    min: number;
    max: number;
    median: number;
    currency: string;
  };
  
  // Contextual factors
  locationAdjustment: number; // multiplier
  industryPremium: number; // percentage
  experiencePremium: number; // percentage
  skillsPremium: number; // percentage
  
  // Benchmarking
  industryMedian: number;
  marketPercentile: number; // 0-100 (where you stand vs others)
  
  // Negotiation insights
  negotiationPotential: number; // 0-1
  marketDemand: 'low' | 'medium' | 'high';
}

export interface TimeToHirePrediction {
  estimatedDays: number;
  confidence: number; // 0-1
  
  // Breakdown by stage
  stageBreakdown: {
    applicationReview: number; // days
    initialScreening: number;
    interviews: number;
    decisionMaking: number;
    offerNegotiation: number;
  };
  
  // Factors affecting timeline
  factors: {
    companySize: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
    industrySpeed: 'fast' | 'medium' | 'slow';
    roleComplexity: 'low' | 'medium' | 'high';
    marketConditions: 'candidate' | 'balanced' | 'employer';
  };
}

export interface PredictiveRecommendation {
  id: string;
  type: 'skill' | 'experience' | 'education' | 'keyword' | 'format' | 'strategy';
  priority: 1 | 2 | 3 | 4 | 5; // 1 = highest
  
  // Impact prediction
  impactOnSuccess: {
    interviewBoost: number; // percentage increase
    offerBoost: number;
    salaryBoost: number;
    timeReduction: number; // days faster
  };
  
  // Implementation details
  title: string;
  description: string;
  actionItems: string[];
  timeToImplement: number; // days
  difficulty: 'easy' | 'medium' | 'hard';
  cost: number; // USD estimate
  
  // Market insights
  marketRelevance: number; // 0-1
  competitorAdoption: number; // 0-1 (how many others have this)
  emergingTrend: boolean;
  
  // Evidence
  evidenceScore: number; // 0-1 (confidence in recommendation)
  similarProfilesData: {
    sampleSize: number;
    successRate: number;
    averageImprovement: number;
  };
}

// ===============================
// USER OUTCOME TRACKING
// ===============================

export interface UserOutcome {
  outcomeId: string;
  userId: string;
  jobId: string;
  
  // Application details
  applicationData: {
    applicationDate: Date;
    applicationMethod: 'direct' | 'job_board' | 'recruiter' | 'referral' | 'cold_outreach';
    jobTitle: string;
    company: string;
    industry: string;
    location: string;
    jobDescription?: string;
    salaryPosted?: {
      min?: number;
      max?: number;
      currency: string;
    };
  };
  
  // CV used for application
  cvData: {
    cvVersion: string; // Hash identifier
    atsScore: number;
    optimizationsApplied: string[];
    predictedSuccess?: SuccessPrediction;
  };
  
  // Timeline of events
  timeline: OutcomeEvent[];
  
  // Final outcome
  finalResult: {
    status: 'hired' | 'rejected' | 'no_response' | 'withdrawn' | 'pending';
    finalDate?: Date;
    timeToResult?: number; // days from application
    
    // Success details
    offerDetails?: {
      salaryOffered: number;
      currency: string;
      benefits: string[];
      negotiationRounds: number;
      finalAccepted: boolean;
    };
    
    // Rejection details
    rejectionDetails?: {
      stage: 'screening' | 'phone' | 'technical' | 'onsite' | 'final' | 'offer';
      reason?: string;
      feedback?: string;
    };
  };
  
  // User feedback
  userFeedback?: {
    cvHelpfulness: 1 | 2 | 3 | 4 | 5;
    recommendationQuality: 1 | 2 | 3 | 4 | 5;
    predictionAccuracy: 1 | 2 | 3 | 4 | 5;
    overallSatisfaction: 1 | 2 | 3 | 4 | 5;
    wouldRecommend: boolean;
    improvementSuggestions?: string;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  dataVersion: string;
}

export interface OutcomeEvent {
  eventId: string;
  eventType: 'application_sent' | 'application_viewed' | 'phone_screening' | 
             'technical_interview' | 'onsite_interview' | 'final_interview' |
             'reference_check' | 'background_check' | 'offer_received' | 
             'offer_accepted' | 'offer_declined' | 'rejection_received' | 'no_response';
  date: Date;
  stage: 'application' | 'screening' | 'interview' | 'decision' | 'offer' | 'closed';
  details?: string;
  
  // Event-specific data
  eventData?: {
    interviewType?: 'phone' | 'video' | 'onsite' | 'technical' | 'behavioral';
    interviewers?: number;
    duration?: number; // minutes
    feedback?: string;
    nextSteps?: string;
  };
}

// ===============================
// ANALYTICS MODELS
// ===============================

export interface AnalyticsEvent {
  eventId: string;
  userId: string;
  sessionId: string;
  timestamp: Date;
  
  // Event classification
  category: 'user_action' | 'system_event' | 'business_event' | 'ml_event';
  action: string;
  label?: string;
  value?: number;
  
  // Context
  context: {
    page?: string;
    feature?: string;
    userAgent?: string;
    device?: 'desktop' | 'mobile' | 'tablet';
    location?: {
      country: string;
      region: string;
      city: string;
    };
  };
  
  // Custom properties
  properties: { [key: string]: any };
  
  // Processing metadata
  processed: boolean;
  processingErrors?: string[];
}

export interface AnalyticsMetrics {
  period: {
    start: Date;
    end: Date;
    type: 'day' | 'week' | 'month' | 'quarter' | 'year';
  };
  
  // User metrics
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    returningUsers: number;
    
    // Engagement
    avgSessionDuration: number;
    avgPagesPerSession: number;
    bounceRate: number;
    
    // Retention
    retention: {
      day1: number;
      day7: number;
      day30: number;
      day90: number;
    };
  };
  
  // Feature metrics
  featureMetrics: {
    [featureName: string]: {
      users: number;
      sessions: number;
      adoptionRate: number;
      satisfactionScore: number;
    };
  };
  
  // Business metrics
  businessMetrics: {
    revenue: {
      total: number;
      recurring: number;
      newCustomers: number;
      upgrades: number;
    };
    
    conversion: {
      signupRate: number;
      activationRate: number;
      paidConversionRate: number;
      upgradeRate: number;
    };
    
    churn: {
      rate: number;
      reasons: { [reason: string]: number };
    };
  };
  
  // ML metrics
  mlMetrics: {
    predictions: {
      total: number;
      accuracy: number;
      latency: number;
    };
    
    models: {
      [modelName: string]: {
        accuracy: number;
        precision: number;
        recall: number;
        f1Score: number;
        lastTrained: Date;
      };
    };
  };
}

// ===============================
// INDUSTRY SPECIALIZATION
// ===============================

export interface IndustryModel {
  industry: string;
  subIndustries: string[];
  priority: 1 | 2 | 3; // 1 = highest priority
  
  // Model configuration
  modelConfig: {
    successFactorWeights: {
      skills: number;           // 0-1
      experience: number;       // 0-1
      education: number;        // 0-1
      certifications: number;   // 0-1
      projects: number;         // 0-1
      achievements: number;     // 0-1
    };
    
    // Feature importance for this industry
    featureImportance: {
      [featureName: string]: number; // 0-1
    };
  };
  
  // Knowledge base
  knowledgeBase: {
    // Skills taxonomy
    skills: {
      core: SkillDefinition[];
      preferred: SkillDefinition[];
      emerging: SkillDefinition[];
      deprecated: SkillDefinition[];
    };
    
    // Common career paths
    careerPaths: CareerPath[];
    
    // Salary benchmarks
    salaryBenchmarks: {
      currency: string;
      levels: {
        [level: string]: {
          min: number;
          max: number;
          median: number;
          percentile25: number;
          percentile75: number;
        };
      };
      locationAdjustments: {
        [location: string]: number; // multiplier
      };
    };
    
    // Companies and culture
    companies: {
      topEmployers: CompanyProfile[];
      startups: CompanyProfile[];
      remote: CompanyProfile[];
    };
  };
  
  // ATS preferences specific to industry
  atsPreferences: {
    keywordDensity: number; // optimal percentage
    preferredSections: string[];
    sectionOrder: string[];
    commonRejectionReasons: string[];
    successPatterns: string[];
  };
  
  // Market intelligence
  marketIntelligence: {
    growthRate: number; // annual percentage
    jobDemand: 'low' | 'medium' | 'high';
    competitionLevel: 'low' | 'medium' | 'high';
    automation_risk: number; // 0-1
    remote_friendliness: number; // 0-1
    
    trends: {
      emerging: string[];
      declining: string[];
      stable: string[];
    };
  };
}

export interface SkillDefinition {
  name: string;
  category: 'technical' | 'soft' | 'certification' | 'tool' | 'language';
  importance: number; // 0-1
  demandTrend: 'rising' | 'stable' | 'declining';
  alternativeNames: string[];
  relatedSkills: string[];
  learningResources?: string[];
  certifications?: string[];
}

export interface CareerPath {
  pathId: string;
  name: string;
  levels: CareerLevel[];
  averageProgression: number; // years between levels
  commonTransitions: {
    from: string;
    to: string;
    frequency: number; // 0-1
    requiredSkills: string[];
  }[];
}

export interface CareerLevel {
  levelId: string;
  title: string;
  alternativeTitles: string[];
  yearsExperience: {
    min: number;
    max: number;
    typical: number;
  };
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  salaryRange: {
    min: number;
    max: number;
    median: number;
  };
}

export interface CompanyProfile {
  name: string;
  industry: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  culture: string[];
  techStack?: string[];
  benefits: string[];
  hiringPatterns: {
    averageTimeToHire: number;
    commonInterviewStages: string[];
    successFactors: string[];
  };
}

// ===============================
// REGIONAL LOCALIZATION
// ===============================

export interface RegionalConfiguration {
  regionId: string;
  regionName: string;
  countries: string[];
  languages: string[];
  currencies: string[];
  timezones: string[];
  
  // Cultural preferences
  culturalPreferences: {
    cvFormat: {
      photoRequired: boolean;
      personalDetailsLevel: 'minimal' | 'standard' | 'comprehensive';
      preferredPageLength: number;
      colorSchemePreference: 'conservative' | 'modern' | 'creative';
      fontPreferences: string[];
    };
    
    // Professional norms
    professionalNorms: {
      formalityLevel: 'casual' | 'business_casual' | 'formal';
      hierarchyRespect: 'low' | 'medium' | 'high';
      directCommunication: boolean;
      achievementBoasting: 'discouraged' | 'moderate' | 'encouraged';
    };
    
    // Application etiquette
    applicationEtiquette: {
      coverLetterRequired: boolean;
      followUpExpected: boolean;
      referenceContactPermission: boolean;
      salaryDiscussion: 'early' | 'late' | 'never_first';
    };
  };
  
  // Legal requirements
  legalCompliance: {
    dataPrivacy: {
      gdprRequired: boolean;
      consentManagement: boolean;
      rightToErasure: boolean;
      dataPortability: boolean;
    };
    
    // Discrimination prevention
    antiDiscrimination: {
      ageDisclosureBanned: boolean;
      genderDisclosureBanned: boolean;
      maritalStatusBanned: boolean;
      photoRequirementBanned: boolean;
      disabilityDisclosureBanned: boolean;
    };
    
    // Employment law
    employmentLaw: {
      workPermitMentionRequired: boolean;
      backgroundCheckConsent: boolean;
      salaryTransparencyRequired: boolean;
    };
  };
  
  // Market characteristics
  marketData: {
    economicIndicators: {
      unemploymentRate: number;
      gdpGrowth: number;
      inflationRate: number;
      currencyStrength: number;
    };
    
    jobMarket: {
      averageJobSearchDuration: number; // days
      competitionLevel: 'low' | 'medium' | 'high';
      networkingImportance: number; // 0-1
      referralHireRate: number; // 0-1
      remoteWorkAdoption: number; // 0-1
    };
    
    industries: {
      dominant: string[];
      growing: string[];
      declining: string[];
      emerging: string[];
    };
  };
  
  // Language and communication
  languagePreferences: {
    primaryLanguage: string;
    businessLanguages: string[];
    
    // Language-specific CV preferences
    languageSpecific: {
      [language: string]: {
        dateFormat: string;
        numberFormat: string;
        addressFormat: string;
        nameOrder: 'first_last' | 'last_first';
        titleUsage: 'common' | 'formal' | 'avoided';
      };
    };
  };
  
  // ATS preferences by region
  regionalATSPreferences: {
    popularSystems: {
      [atsName: string]: {
        marketShare: number; // 0-1
        preferences: {
          keywordSensitivity: 'low' | 'medium' | 'high';
          formatStrictness: 'flexible' | 'standard' | 'strict';
          sectionOrdering: 'flexible' | 'preferred' | 'strict';
        };
      };
    };
  };
}

// ===============================
// ML PIPELINE MODELS
// ===============================

export interface MLModelMetadata {
  modelId: string;
  modelName: string;
  modelType: 'classification' | 'regression' | 'clustering' | 'ensemble';
  version: string;
  
  // Training metadata
  training: {
    trainingDate: Date;
    datasetSize: number;
    features: string[];
    hyperparameters: { [key: string]: any };
    trainingDuration: number; // minutes
  };
  
  // Performance metrics
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
    
    // Cross-validation results
    crossValidation: {
      folds: number;
      meanAccuracy: number;
      stdAccuracy: number;
    };
  };
  
  // Deployment info
  deployment: {
    deploymentDate: Date;
    environment: 'development' | 'staging' | 'production';
    endpoint: string;
    status: 'active' | 'deprecated' | 'testing';
  };
  
  // Monitoring
  monitoring: {
    predictionCount: number;
    averageLatency: number;
    errorRate: number;
    driftScore: number; // 0-1, higher = more drift
    lastHealthCheck: Date;
  };
}

export interface FeatureVector {
  userId: string;
  jobId: string;
  extractionDate: Date;
  
  // CV features
  cvFeatures: {
    wordCount: number;
    sectionsCount: number;
    skillsCount: number;
    experienceYears: number;
    educationLevel: number;
    certificationsCount: number;
    projectsCount: number;
    achievementsCount: number;
    keywordDensity: number;
    readabilityScore: number;
    formattingScore: number;
  };
  
  // Job matching features
  matchingFeatures: {
    skillMatchPercentage: number;
    experienceRelevance: number;
    educationMatch: number;
    industryExperience: number;
    locationMatch: number;
    salaryAlignment: number;
    titleSimilarity: number;
    companyFit: number;
  };
  
  // Market features
  marketFeatures: {
    industryGrowth: number;
    locationCompetitiveness: number;
    salaryCompetitiveness: number;
    demandSupplyRatio: number;
    seasonality: number;
    economicIndicators: number;
  };
  
  // Behavioral features
  behaviorFeatures: {
    applicationTiming: number; // days since job posted
    weekdayApplication: boolean;
    timeOfDay: number; // 0-23
    applicationMethod: number; // encoded
    cvOptimizationLevel: number;
    platformEngagement: number;
    previousApplications: number;
  };
  
  // Derived features
  derivedFeatures: {
    overqualificationScore: number;
    underqualificationScore: number;
    careerProgressionScore: number;
    stabilityScore: number;
    adaptabilityScore: number;
    leadershipPotential: number;
    innovationIndicator: number;
  };
}

// ===============================
// API RESPONSE INTERFACES
// ===============================

export interface Phase2APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    requestId: string;
    timestamp: Date;
    version: string;
    processingTime: number; // milliseconds
  };
}

export interface PredictionResponse extends Phase2APIResponse<SuccessPrediction> {
  data: SuccessPrediction;
}

export interface AnalyticsResponse extends Phase2APIResponse<AnalyticsMetrics> {
  data: AnalyticsMetrics;
}

export interface IndustryOptimizationResponse extends Phase2APIResponse<{
  industryScore: number;
  recommendations: PredictiveRecommendation[];
  marketInsights: any;
  careerPath: CareerPath;
}> {}

export interface RegionalOptimizationResponse extends Phase2APIResponse<{
  culturalScore: number;
  legalCompliance: boolean;
  marketFit: number;
  recommendations: PredictiveRecommendation[];
}> {}

// ===============================
// ML TRAINING CONFIGURATION
// ===============================

export interface MLTrainingConfig {
  modelType: 'gradient_boosting' | 'neural_network' | 'random_forest' | 'ensemble';
  hyperparameters: {
    learning_rate?: number;
    max_depth?: number;
    n_estimators?: number;
    batch_size?: number;
    epochs?: number;
  };
  validation: {
    testSize: number; // 0-1
    crossValidation: number; // number of folds
    stratify: boolean;
  };
  features: {
    include: string[];
    exclude?: string[];
    engineered?: boolean;
  };
}

// Export type unions for convenience
export type PredictionTypes = SuccessPrediction | SalaryPrediction | TimeToHirePrediction;
export type AnalyticsTypes = AnalyticsEvent | AnalyticsMetrics;
export type IndustryTypes = IndustryModel | SkillDefinition | CareerPath;
export type RegionalTypes = RegionalConfiguration;