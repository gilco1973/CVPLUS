/**
 * Regional Localization Types
 * Extracted from phase2-models.ts for better modularity
 * 
 * Regional configurations, market data, and localization settings.
 */

// ===============================
// REGIONAL LOCALIZATION MODELS
// ===============================

export interface RegionalConfiguration {
  regionId: string;
  regionName: string;
  countryCode: string;
  languageCode: string;
  currency: string;
  
  // Market characteristics
  marketData: {
    unemploymentRate: number;
    averageSalary: number;
    costOfLiving: number;
    economicGrowth: number;
    inflationRate: number;
  };
  
  // Job market specifics
  jobMarket: {
    competitiveness: number; // 0-1
    averageTimeToHire: number;
    topIndustries: Array<{
      industry: string;
      marketShare: number;
      growth: number;
    }>;
    skillsInDemand: Array<{
      skill: string;
      demandLevel: number;
      salaryPremium: number;
    }>;
  };
  
  // CV and application preferences
  applicationPreferences: {
    cvFormat: 'chronological' | 'functional' | 'combination' | 'creative';
    preferredLength: number; // pages
    photoRequired: boolean;
    personalInfoRequired: {
      age: boolean;
      maritalStatus: boolean;
      nationality: boolean;
      photo: boolean;
    };
    
    // Document preferences
    fileFormats: string[]; // ['pdf', 'docx', etc.]
    coverLetterRequired: boolean;
    portfolioExpected: boolean;
    
    // Application process
    applicationMethods: string[]; // ['email', 'online_form', 'ats', 'linkedin']
    followUpCulture: 'expected' | 'discouraged' | 'neutral';
    responseTime: {
      average: number; // days
      acceptable: number; // days
    };
  };
  
  // Cultural considerations
  culturalFactors: {
    workCulture: 'hierarchical' | 'flat' | 'mixed';
    communicationStyle: 'direct' | 'indirect' | 'context_dependent';
    businessFormality: 'formal' | 'casual' | 'flexible';
    
    // Interview preferences
    interviewStyle: 'behavioral' | 'technical' | 'case_study' | 'mixed';
    dresscode: 'formal' | 'business_casual' | 'casual';
    
    // Networking importance
    networkingImportance: number; // 0-1
    referralImpact: number; // 0-1
  };
  
  // Legal and compliance
  legalRequirements: {
    workPermitRequired: boolean;
    discriminationLaws: string[];
    mandatoryDisclosures: string[];
    dataPrivacyRegulations: string[];
    
    // Visa and work authorization
    visaSponsorship: {
      availability: number; // 0-1
      commonVisaTypes: string[];
      processingTime: number; // days
      cost: number;
    };
  };
  
  // Language and localization
  localizationSettings: {
    dateFormat: string;
    numberFormat: string;
    addressFormat: string;
    phoneFormat: string;
    
    // Language preferences
    businessLanguage: string;
    alternateLanguages: string[];
    proficiencyExpectations: {
      [language: string]: 'basic' | 'conversational' | 'fluent' | 'native';
    };
  };
  
  // Seasonal patterns
  seasonalPatterns: {
    hiringSeasons: Array<{
      season: string;
      months: number[];
      activity: number; // 0-1
    }>;
    holidayImpacts: Array<{
      holiday: string;
      dates: string;
      impact: 'low' | 'medium' | 'high';
    }>;
  };
  
  // Economic indicators
  economicIndicators: {
    gdpPerCapita: number;
    purchasingPower: number;
    businessEase: number; // World Bank ranking
    innovationIndex: number;
    digitalReadiness: number;
  };
  
  // Technology adoption
  technologyLandscape: {
    internetPenetration: number;
    mobilePenetration: number;
    digitalPaymentAdoption: number;
    remoteWorkAcceptance: number;
    
    // Popular platforms
    jobBoards: string[];
    professionalNetworks: string[];
    communicationTools: string[];
  };
}

// Type unions for easier handling
export type RegionalTypes = RegionalConfiguration;