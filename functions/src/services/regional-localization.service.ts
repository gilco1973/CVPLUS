/**
 * Regional Localization Service
 * 
 * Provides CV optimization for different global regions with
 * cultural preferences, legal compliance, and local market insights.
 */

import * as admin from 'firebase-admin';
import { RegionalConfiguration } from '../types/phase2-models';
import { ParsedCV } from '../types/job';

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export interface RegionalOptimizationRequest {
  userId: string;
  cvData: ParsedCV;
  targetRegion: string;
  targetCountry?: string;
  industry?: string;
  jobRole?: string;
}

export interface RegionalOptimizationResult {
  regionScore: number;
  culturalFit: 'excellent' | 'good' | 'fair' | 'needs_improvement';
  legalCompliance: {
    compliant: boolean;
    issues: ComplianceIssue[];
    recommendations: string[];
  };
  culturalOptimization: {
    formatAdjustments: FormatAdjustment[];
    contentAdjustments: ContentAdjustment[];
    languageOptimization: LanguageOptimization[];
  };
  marketInsights: {
    popularIndustries: string[];
    averageJobSearchDuration: number;
    networkingImportance: 'low' | 'medium' | 'high';
    remoteWorkAdoption: number;
    salaryExpectations: SalaryExpectations;
  };
  localizedRecommendations: LocalizedRecommendation[];
}

export interface ComplianceIssue {
  type: 'photo' | 'age' | 'gender' | 'marital_status' | 'personal_info';
  severity: 'error' | 'warning' | 'info';
  description: string;
  solution: string;
  countries: string[];
}

export interface FormatAdjustment {
  aspect: 'photo' | 'length' | 'color' | 'font' | 'date_format' | 'address_format';
  current: string;
  recommended: string;
  reason: string;
  importance: 'high' | 'medium' | 'low';
}

export interface ContentAdjustment {
  section: string;
  type: 'add' | 'remove' | 'modify' | 'reorder';
  description: string;
  culturalReason: string;
  impact: number; // 0-1
}

export interface LanguageOptimization {
  aspect: 'formality' | 'tone' | 'terminology' | 'structure';
  suggestion: string;
  examples: {
    before: string;
    after: string;
  }[];
}

export interface SalaryExpectations {
  expectationLevel: 'conservative' | 'market_rate' | 'aggressive';
  currencyPreference: string;
  negotiationCulture: 'avoid' | 'subtle' | 'direct';
  benefitsImportance: number; // 0-1
}

export interface LocalizedRecommendation {
  category: 'cultural' | 'legal' | 'market' | 'networking' | 'format';
  priority: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  actionItems: string[];
  culturalContext: string;
  impact: number; // 0-1
}

export class RegionalLocalizationService {
  private static instance: RegionalLocalizationService;
  private regionalConfigs = new Map<string, RegionalConfiguration>();
  private initialized = false;

  public static getInstance(): RegionalLocalizationService {
    if (!RegionalLocalizationService.instance) {
      RegionalLocalizationService.instance = new RegionalLocalizationService();
    }
    return RegionalLocalizationService.instance;
  }

  /**
   * Initialize regional configurations
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadRegionalConfigurations();
      this.initialized = true;
      console.log('Regional localization service initialized');
    } catch (error) {
      console.error('Failed to initialize regional service:', error);
      throw error;
    }
  }

  /**
   * Optimize CV for specific region
   */
  async optimizeForRegion(request: RegionalOptimizationRequest): Promise<RegionalOptimizationResult> {
    await this.initialize();

    const regionConfig = this.regionalConfigs.get(request.targetRegion.toLowerCase());
    if (!regionConfig) {
      throw new Error(`Unsupported region: ${request.targetRegion}`);
    }

    // Calculate regional compatibility score
    const regionScore = await this.calculateRegionalScore(request.cvData, regionConfig);
    
    // Check legal compliance
    const legalCompliance = await this.checkLegalCompliance(request.cvData, regionConfig);
    
    // Generate cultural optimizations
    const culturalOptimization = await this.generateCulturalOptimizations(
      request.cvData, 
      regionConfig, 
      request.targetCountry
    );
    
    // Get market insights
    const marketInsights = await this.getMarketInsights(regionConfig, request.industry);
    
    // Generate localized recommendations
    const localizedRecommendations = await this.generateLocalizedRecommendations(
      request.cvData,
      regionConfig,
      legalCompliance,
      culturalOptimization
    );

    return {
      regionScore: Math.round(regionScore),
      culturalFit: this.calculateCulturalFit(regionScore),
      legalCompliance,
      culturalOptimization,
      marketInsights,
      localizedRecommendations
    };
  }

  /**
   * Get supported regions
   */
  getSupportedRegions(): string[] {
    return [
      'North America',
      'Europe', 
      'Asia-Pacific',
      'Latin America',
      'Middle East & Africa'
    ];
  }

  /**
   * Get countries for region
   */
  getCountriesForRegion(region: string): string[] {
    const config = this.regionalConfigs.get(region.toLowerCase());
    return config?.countries || [];
  }

  /**
   * Load regional configurations
   */
  private async loadRegionalConfigurations(): Promise<void> {
    const regions = [
      await this.createNorthAmericaConfig(),
      await this.createEuropeConfig(),
      await this.createAsiaPacificConfig(),
      await this.createLatinAmericaConfig(),
      await this.createMEAConfig()
    ];

    regions.forEach(config => {
      this.regionalConfigs.set(config.regionId.toLowerCase(), config);
    });
  }

  /**
   * Calculate regional compatibility score
   */
  private async calculateRegionalScore(cv: ParsedCV, config: RegionalConfiguration): Promise<number> {
    let score = 70; // Base score

    // Format compliance
    const formatScore = this.calculateFormatCompliance(cv, config);
    score += (formatScore - 0.5) * 20;

    // Cultural content appropriateness
    const culturalScore = this.calculateCulturalAppropriateContent(cv, config);
    score += (culturalScore - 0.5) * 15;

    // Legal compliance
    const legalScore = this.calculateLegalComplianceScore(cv, config);
    score += (legalScore - 0.5) * 10;

    // Professional norms alignment
    const professionalScore = this.calculateProfessionalNormsScore(cv, config);
    score += (professionalScore - 0.5) * 5;

    return Math.max(0, Math.min(100, score));
  }

  private calculateFormatCompliance(cv: ParsedCV, config: RegionalConfiguration): number {
    let compliance = 0.5; // Base score
    let factors = 0;

    // Photo requirement compliance
    factors++;
    const hasPhoto = this.cvHasPhoto(cv);
    if (config.culturalPreferences.cvFormat.photoRequired && hasPhoto) {
      compliance += 0.2;
    } else if (!config.culturalPreferences.cvFormat.photoRequired && !hasPhoto) {
      compliance += 0.2;
    }

    // Length compliance
    factors++;
    const cvLength = this.calculateCVLength(cv);
    const preferredLength = config.culturalPreferences.cvFormat.preferredPageLength;
    if (Math.abs(cvLength - preferredLength) <= 0.5) {
      compliance += 0.15;
    } else if (Math.abs(cvLength - preferredLength) <= 1) {
      compliance += 0.05;
    }

    // Personal details level
    factors++;
    const personalDetailsLevel = this.assessPersonalDetailsLevel(cv);
    if (personalDetailsLevel === config.culturalPreferences.cvFormat.personalDetailsLevel) {
      compliance += 0.15;
    }

    return compliance / factors * factors; // Normalize
  }

  private calculateCulturalAppropriateContent(cv: ParsedCV, config: RegionalConfiguration): number {
    let score = 0.5;
    const norms = config.culturalPreferences.professionalNorms;

    // Formality level assessment
    const formalityScore = this.assessFormality(cv);
    const expectedFormality = this.mapFormalityToScore(norms.formalityLevel);
    score += 0.3 * (1 - Math.abs(formalityScore - expectedFormality));

    // Achievement presentation style
    const achievementStyle = this.assessAchievementPresentation(cv);
    const expectedStyle = this.mapAchievementStyleToScore(norms.achievementBoasting);
    score += 0.2 * (1 - Math.abs(achievementStyle - expectedStyle));

    return Math.max(0, Math.min(1, score));
  }

  private calculateLegalComplianceScore(cv: ParsedCV, config: RegionalConfiguration): number {
    const issues = this.identifyComplianceIssues(cv, config);
    const errorCount = issues.filter(issue => issue.severity === 'error').length;
    const warningCount = issues.filter(issue => issue.severity === 'warning').length;
    
    // Perfect compliance = 1.0, each error -0.3, each warning -0.1
    return Math.max(0, 1.0 - (errorCount * 0.3) - (warningCount * 0.1));
  }

  private calculateProfessionalNormsScore(cv: ParsedCV, config: RegionalConfiguration): number {
    // Assess alignment with professional communication norms
    return 0.7; // Simplified for now
  }

  /**
   * Check legal compliance
   */
  private async checkLegalCompliance(
    cv: ParsedCV, 
    config: RegionalConfiguration
  ): Promise<RegionalOptimizationResult['legalCompliance']> {
    const issues = this.identifyComplianceIssues(cv, config);
    const compliant = !issues.some(issue => issue.severity === 'error');
    
    const recommendations = this.generateComplianceRecommendations(issues);

    return {
      compliant,
      issues,
      recommendations
    };
  }

  private identifyComplianceIssues(cv: ParsedCV, config: RegionalConfiguration): ComplianceIssue[] {
    const issues: ComplianceIssue[] = [];
    const antiDiscrimination = config.legalCompliance.antiDiscrimination;

    // Photo compliance
    if (antiDiscrimination.photoRequirementBanned && this.cvHasPhoto(cv)) {
      issues.push({
        type: 'photo',
        severity: 'error',
        description: 'CV contains photo in region where photos are prohibited',
        solution: 'Remove photo from CV',
        countries: config.countries.filter(c => this.isPhotoProhibited(c))
      });
    }

    // Age disclosure
    if (antiDiscrimination.ageDisclosureBanned && this.cvContainsAge(cv)) {
      issues.push({
        type: 'age',
        severity: 'error',
        description: 'CV contains age information where prohibited',
        solution: 'Remove birth date, age, or graduation years that reveal age',
        countries: config.countries
      });
    }

    // Gender/marital status
    if (antiDiscrimination.genderDisclosureBanned && this.cvContainsGender(cv)) {
      issues.push({
        type: 'gender',
        severity: 'warning',
        description: 'CV may contain gender-indicating information',
        solution: 'Use gender-neutral language and avoid personal pronouns',
        countries: config.countries
      });
    }

    return issues;
  }

  /**
   * Generate cultural optimizations
   */
  private async generateCulturalOptimizations(
    cv: ParsedCV, 
    config: RegionalConfiguration, 
    targetCountry?: string
  ): Promise<RegionalOptimizationResult['culturalOptimization']> {
    const formatAdjustments = this.generateFormatAdjustments(cv, config);
    const contentAdjustments = this.generateContentAdjustments(cv, config);
    const languageOptimization = this.generateLanguageOptimizations(cv, config);

    return {
      formatAdjustments,
      contentAdjustments,
      languageOptimization
    };
  }

  private generateFormatAdjustments(cv: ParsedCV, config: RegionalConfiguration): FormatAdjustment[] {
    const adjustments: FormatAdjustment[] = [];
    const format = config.culturalPreferences.cvFormat;

    // Photo adjustment
    const hasPhoto = this.cvHasPhoto(cv);
    if (format.photoRequired && !hasPhoto) {
      adjustments.push({
        aspect: 'photo',
        current: 'No photo',
        recommended: 'Professional headshot',
        reason: 'Photos are expected in this region\'s professional culture',
        importance: 'high'
      });
    } else if (!format.photoRequired && hasPhoto) {
      adjustments.push({
        aspect: 'photo',
        current: 'Includes photo',
        recommended: 'Remove photo',
        reason: 'Photos may lead to bias and are not expected in this region',
        importance: 'high'
      });
    }

    // Length adjustment
    const currentLength = this.calculateCVLength(cv);
    if (Math.abs(currentLength - format.preferredPageLength) > 0.5) {
      adjustments.push({
        aspect: 'length',
        current: `${currentLength} pages`,
        recommended: `${format.preferredPageLength} pages`,
        reason: `Regional preference for ${format.preferredPageLength}-page CVs`,
        importance: 'medium'
      });
    }

    // Date format
    const primaryLanguage = config.languagePreferences.primaryLanguage;
    const langConfig = config.languagePreferences.languageSpecific[primaryLanguage];
    if (langConfig && this.needsDateFormatAdjustment(cv, langConfig.dateFormat)) {
      adjustments.push({
        aspect: 'date_format',
        current: 'MM/DD/YYYY',
        recommended: langConfig.dateFormat,
        reason: `Local date format convention`,
        importance: 'low'
      });
    }

    return adjustments;
  }

  private generateContentAdjustments(cv: ParsedCV, config: RegionalConfiguration): ContentAdjustment[] {
    const adjustments: ContentAdjustment[] = [];

    // Personal details adjustment
    const currentLevel = this.assessPersonalDetailsLevel(cv);
    const expectedLevel = config.culturalPreferences.cvFormat.personalDetailsLevel;
    
    if (currentLevel !== expectedLevel) {
      if (expectedLevel === 'comprehensive' && currentLevel === 'minimal') {
        adjustments.push({
          section: 'Personal Information',
          type: 'add',
          description: 'Include address, nationality, and language skills',
          culturalReason: 'Comprehensive personal details expected in this region',
          impact: 0.15
        });
      } else if (expectedLevel === 'minimal' && currentLevel === 'comprehensive') {
        adjustments.push({
          section: 'Personal Information',
          type: 'remove',
          description: 'Reduce personal information to contact details only',
          culturalReason: 'Minimal personal information preferred for privacy',
          impact: 0.1
        });
      }
    }

    return adjustments;
  }

  private generateLanguageOptimizations(cv: ParsedCV, config: RegionalConfiguration): LanguageOptimization[] {
    const optimizations: LanguageOptimization[] = [];
    const norms = config.culturalPreferences.professionalNorms;

    // Formality optimization
    if (norms.formalityLevel === 'formal') {
      optimizations.push({
        aspect: 'formality',
        suggestion: 'Use formal business language throughout',
        examples: [
          { before: "I've worked on...", after: "I have experience in..." },
          { before: "Got great results", after: "Achieved significant results" }
        ]
      });
    } else if (norms.formalityLevel === 'casual') {
      optimizations.push({
        aspect: 'formality',
        suggestion: 'Use more conversational, approachable language',
        examples: [
          { before: "Facilitated the implementation", after: "Led the setup" },
          { before: "Demonstrated proficiency", after: "Skilled in" }
        ]
      });
    }

    // Achievement presentation
    if (norms.achievementBoasting === 'moderate') {
      optimizations.push({
        aspect: 'tone',
        suggestion: 'Present achievements confidently but modestly',
        examples: [
          { before: "Single-handedly transformed", after: "Contributed to transforming" },
          { before: "Revolutionary approach", after: "Innovative approach" }
        ]
      });
    }

    return optimizations;
  }

  // Regional configuration factories
  private async createNorthAmericaConfig(): Promise<RegionalConfiguration> {
    return {
      regionId: 'north_america',
      regionName: 'North America',
      countries: ['US', 'CA'],
      languages: ['en', 'fr'],
      currencies: ['USD', 'CAD'],
      timezones: ['America/New_York', 'America/Los_Angeles', 'America/Toronto'],
      
      culturalPreferences: {
        cvFormat: {
          photoRequired: false,
          personalDetailsLevel: 'minimal',
          preferredPageLength: 2,
          colorSchemePreference: 'conservative',
          fontPreferences: ['Arial', 'Calibri', 'Times New Roman']
        },
        professionalNorms: {
          formalityLevel: 'business_casual',
          hierarchyRespect: 'medium',
          directCommunication: true,
          achievementBoasting: 'encouraged'
        },
        applicationEtiquette: {
          coverLetterRequired: true,
          followUpExpected: true,
          referenceContactPermission: false,
          salaryDiscussion: 'late'
        }
      },
      
      legalCompliance: {
        dataPrivacy: {
          gdprRequired: false,
          consentManagement: false,
          rightToErasure: false,
          dataPortability: false
        },
        antiDiscrimination: {
          ageDisclosureBanned: true,
          genderDisclosureBanned: false,
          maritalStatusBanned: true,
          photoRequirementBanned: true,
          disabilityDisclosureBanned: false
        },
        employmentLaw: {
          workPermitMentionRequired: false,
          backgroundCheckConsent: false,
          salaryTransparencyRequired: false
        }
      },
      
      marketData: {
        economicIndicators: {
          unemploymentRate: 3.5,
          gdpGrowth: 2.1,
          inflationRate: 2.5,
          currencyStrength: 1.0
        },
        jobMarket: {
          averageJobSearchDuration: 28,
          competitionLevel: 'medium',
          networkingImportance: 0.7,
          referralHireRate: 0.3,
          remoteWorkAdoption: 0.4
        },
        industries: {
          dominant: ['Technology', 'Finance', 'Healthcare'],
          growing: ['Renewable Energy', 'E-commerce', 'AI/ML'],
          declining: ['Traditional Retail', 'Coal'],
          emerging: ['Space Tech', 'Biotech', 'Clean Tech']
        }
      },
      
      languagePreferences: {
        primaryLanguage: 'en',
        businessLanguages: ['en', 'fr'],
        languageSpecific: {
          'en': {
            dateFormat: 'MM/DD/YYYY',
            numberFormat: '1,234.56',
            addressFormat: 'Street, City, State ZIP',
            nameOrder: 'first_last',
            titleUsage: 'common'
          }
        }
      },
      
      regionalATSPreferences: {
        popularSystems: {
          'Workday': { marketShare: 0.3, preferences: { keywordSensitivity: 'high', formatStrictness: 'strict', sectionOrdering: 'preferred' } },
          'Taleo': { marketShare: 0.25, preferences: { keywordSensitivity: 'medium', formatStrictness: 'standard', sectionOrdering: 'flexible' } },
          'Greenhouse': { marketShare: 0.2, preferences: { keywordSensitivity: 'medium', formatStrictness: 'flexible', sectionOrdering: 'flexible' } }
        }
      }
    };
  }

  private async createEuropeConfig(): Promise<RegionalConfiguration> {
    return {
      regionId: 'europe',
      regionName: 'Europe',
      countries: ['UK', 'DE', 'FR', 'NL', 'SE', 'IT', 'ES'],
      languages: ['en', 'de', 'fr', 'nl', 'sv', 'it', 'es'],
      currencies: ['EUR', 'GBP', 'SEK'],
      timezones: ['Europe/London', 'Europe/Berlin', 'Europe/Paris'],
      
      culturalPreferences: {
        cvFormat: {
          photoRequired: true, // varies by country
          personalDetailsLevel: 'comprehensive',
          preferredPageLength: 2,
          colorSchemePreference: 'conservative',
          fontPreferences: ['Arial', 'Times New Roman', 'Helvetica']
        },
        professionalNorms: {
          formalityLevel: 'formal',
          hierarchyRespect: 'high',
          directCommunication: false,
          achievementBoasting: 'moderate'
        },
        applicationEtiquette: {
          coverLetterRequired: true,
          followUpExpected: false,
          referenceContactPermission: true,
          salaryDiscussion: 'never_first'
        }
      },
      
      legalCompliance: {
        dataPrivacy: {
          gdprRequired: true,
          consentManagement: true,
          rightToErasure: true,
          dataPortability: true
        },
        antiDiscrimination: {
          ageDisclosureBanned: false, // varies by country
          genderDisclosureBanned: false,
          maritalStatusBanned: false,
          photoRequirementBanned: false,
          disabilityDisclosureBanned: false
        },
        employmentLaw: {
          workPermitMentionRequired: true,
          backgroundCheckConsent: true,
          salaryTransparencyRequired: false
        }
      },
      
      marketData: {
        economicIndicators: {
          unemploymentRate: 6.2,
          gdpGrowth: 1.3,
          inflationRate: 3.1,
          currencyStrength: 1.1
        },
        jobMarket: {
          averageJobSearchDuration: 42,
          competitionLevel: 'high',
          networkingImportance: 0.8,
          referralHireRate: 0.4,
          remoteWorkAdoption: 0.3
        },
        industries: {
          dominant: ['Manufacturing', 'Finance', 'Tourism'],
          growing: ['Green Energy', 'Digital Services', 'Healthcare'],
          declining: ['Traditional Manufacturing', 'Coal'],
          emerging: ['Fintech', 'Cleantech', 'Digital Health']
        }
      },
      
      languagePreferences: {
        primaryLanguage: 'en',
        businessLanguages: ['en', 'de', 'fr'],
        languageSpecific: {
          'en': {
            dateFormat: 'DD/MM/YYYY',
            numberFormat: '1.234,56',
            addressFormat: 'Street, City, Postal Code, Country',
            nameOrder: 'first_last',
            titleUsage: 'formal'
          }
        }
      },
      
      regionalATSPreferences: {
        popularSystems: {
          'SAP SuccessFactors': { marketShare: 0.35, preferences: { keywordSensitivity: 'medium', formatStrictness: 'strict', sectionOrdering: 'strict' } },
          'Workday': { marketShare: 0.25, preferences: { keywordSensitivity: 'high', formatStrictness: 'strict', sectionOrdering: 'preferred' } }
        }
      }
    };
  }

  // Additional regional configs would be implemented similarly...
  private async createAsiaPacificConfig(): Promise<RegionalConfiguration> {
    return this.createGenericRegionConfig('asia_pacific', 'Asia-Pacific', ['AU', 'SG', 'JP', 'HK']);
  }

  private async createLatinAmericaConfig(): Promise<RegionalConfiguration> {
    return this.createGenericRegionConfig('latin_america', 'Latin America', ['BR', 'MX', 'AR', 'CL']);
  }

  private async createMEAConfig(): Promise<RegionalConfiguration> {
    return this.createGenericRegionConfig('mea', 'Middle East & Africa', ['AE', 'SA', 'ZA', 'KE']);
  }

  private createGenericRegionConfig(id: string, name: string, countries: string[]): RegionalConfiguration {
    // Simplified generic configuration
    return {
      regionId: id,
      regionName: name,
      countries,
      languages: ['en'],
      currencies: ['USD'],
      timezones: ['UTC'],
      culturalPreferences: {
        cvFormat: {
          photoRequired: false,
          personalDetailsLevel: 'standard',
          preferredPageLength: 2,
          colorSchemePreference: 'conservative',
          fontPreferences: ['Arial']
        },
        professionalNorms: {
          formalityLevel: 'business_casual',
          hierarchyRespect: 'medium',
          directCommunication: true,
          achievementBoasting: 'moderate'
        },
        applicationEtiquette: {
          coverLetterRequired: false,
          followUpExpected: true,
          referenceContactPermission: false,
          salaryDiscussion: 'late'
        }
      },
      legalCompliance: {
        dataPrivacy: { gdprRequired: false, consentManagement: false, rightToErasure: false, dataPortability: false },
        antiDiscrimination: {
          ageDisclosureBanned: false,
          genderDisclosureBanned: false,
          maritalStatusBanned: false,
          photoRequirementBanned: false,
          disabilityDisclosureBanned: false
        },
        employmentLaw: { workPermitMentionRequired: false, backgroundCheckConsent: false, salaryTransparencyRequired: false }
      },
      marketData: {
        economicIndicators: { unemploymentRate: 5.0, gdpGrowth: 2.0, inflationRate: 2.0, currencyStrength: 1.0 },
        jobMarket: {
          averageJobSearchDuration: 35,
          competitionLevel: 'medium',
          networkingImportance: 0.6,
          referralHireRate: 0.25,
          remoteWorkAdoption: 0.3
        },
        industries: { dominant: [], growing: [], declining: [], emerging: [] }
      },
      languagePreferences: {
        primaryLanguage: 'en',
        businessLanguages: ['en'],
        languageSpecific: {
          'en': {
            dateFormat: 'DD/MM/YYYY',
            numberFormat: '1,234.56',
            addressFormat: 'Standard',
            nameOrder: 'first_last',
            titleUsage: 'common'
          }
        }
      },
      regionalATSPreferences: { popularSystems: {} }
    };
  }

  // Helper methods
  private calculateCulturalFit(score: number): 'excellent' | 'good' | 'fair' | 'needs_improvement' {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 55) return 'fair';
    return 'needs_improvement';
  }

  private cvHasPhoto(cv: ParsedCV): boolean {
    return !!(cv.personalInfo as any)?.photo || !!(cv as any).photo;
  }

  private calculateCVLength(cv: ParsedCV): number {
    // Estimate page length based on content
    const contentLength = JSON.stringify(cv).length;
    return Math.ceil(contentLength / 3000); // Rough estimate: 3000 chars per page
  }

  private assessPersonalDetailsLevel(cv: ParsedCV): 'minimal' | 'standard' | 'comprehensive' {
    const personalInfo = cv.personalInfo;
    if (!personalInfo) return 'minimal';
    
    let detailCount = 0;
    if (personalInfo.email) detailCount++;
    if (personalInfo.phone) detailCount++;
    if ((personalInfo as any).address) detailCount++;
    if ((personalInfo as any).nationality) detailCount++;
    if ((personalInfo as any).languages) detailCount++;
    
    if (detailCount <= 2) return 'minimal';
    if (detailCount <= 4) return 'standard';
    return 'comprehensive';
  }

  private assessFormality(cv: ParsedCV): number {
    // Analyze language formality (0-1 scale)
    return 0.6; // Simplified
  }

  private mapFormalityToScore(level: string): number {
    const mapping = { 'casual': 0.3, 'business_casual': 0.6, 'formal': 0.9 };
    return mapping[level as keyof typeof mapping] || 0.6;
  }

  private assessAchievementPresentation(cv: ParsedCV): number {
    // Analyze how achievements are presented (0-1 scale)
    return 0.7; // Simplified
  }

  private mapAchievementStyleToScore(style: string): number {
    const mapping = { 'discouraged': 0.2, 'moderate': 0.6, 'encouraged': 0.9 };
    return mapping[style as keyof typeof mapping] || 0.6;
  }

  private cvContainsAge(cv: ParsedCV): boolean {
    const cvText = JSON.stringify(cv).toLowerCase();
    return /\b(age|born|birth|years old|\d{4}\/\d{2}\/\d{2})\b/.test(cvText);
  }

  private cvContainsGender(cv: ParsedCV): boolean {
    const cvText = JSON.stringify(cv).toLowerCase();
    return /\b(male|female|gender|he\/him|she\/her)\b/.test(cvText);
  }

  private isPhotoProhibited(country: string): boolean {
    const prohibited = ['US', 'CA', 'UK']; // Simplified list
    return prohibited.includes(country);
  }

  private generateComplianceRecommendations(issues: ComplianceIssue[]): string[] {
    return issues.map(issue => issue.solution);
  }

  private needsDateFormatAdjustment(cv: ParsedCV, targetFormat: string): boolean {
    // Simplified check
    return true;
  }

  private async getMarketInsights(
    config: RegionalConfiguration, 
    industry?: string
  ): Promise<RegionalOptimizationResult['marketInsights']> {
    return {
      popularIndustries: config.marketData.industries.dominant,
      averageJobSearchDuration: config.marketData.jobMarket.averageJobSearchDuration,
      networkingImportance: config.marketData.jobMarket.networkingImportance > 0.6 ? 'high' : 
                           config.marketData.jobMarket.networkingImportance > 0.4 ? 'medium' : 'low',
      remoteWorkAdoption: config.marketData.jobMarket.remoteWorkAdoption,
      salaryExpectations: {
        expectationLevel: 'market_rate',
        currencyPreference: config.currencies[0],
        negotiationCulture: config.culturalPreferences.applicationEtiquette.salaryDiscussion === 'never_first' ? 'avoid' :
                           config.culturalPreferences.professionalNorms.directCommunication ? 'direct' : 'subtle',
        benefitsImportance: 0.7
      }
    };
  }

  private async generateLocalizedRecommendations(
    cv: ParsedCV,
    config: RegionalConfiguration,
    legalCompliance: any,
    culturalOptimization: any
  ): Promise<LocalizedRecommendation[]> {
    const recommendations: LocalizedRecommendation[] = [];

    // Legal compliance recommendations
    if (!legalCompliance.compliant) {
      recommendations.push({
        category: 'legal',
        priority: 1,
        title: 'Ensure Legal Compliance',
        description: 'Address legal compliance issues to avoid discrimination concerns',
        actionItems: legalCompliance.recommendations,
        culturalContext: `${config.regionName} has strict employment laws`,
        impact: 0.3
      });
    }

    // Cultural format recommendations
    if (culturalOptimization.formatAdjustments.length > 0) {
      recommendations.push({
        category: 'cultural',
        priority: 2,
        title: 'Adapt CV Format',
        description: 'Align CV format with regional expectations',
        actionItems: culturalOptimization.formatAdjustments.map((adj: FormatAdjustment) => adj.reason),
        culturalContext: 'Format preferences vary significantly by region',
        impact: 0.2
      });
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }
}