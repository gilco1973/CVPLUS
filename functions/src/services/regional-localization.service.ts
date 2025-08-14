/**
 * Regional Localization Service - Refactored
 * 
 * Provides CV optimization for different global regions with
 * cultural preferences, legal compliance, and local market insights.
 */

import * as admin from 'firebase-admin';
import { RegionalConfiguration } from '../types/phase2-models';
import { RegionalScoreCalculator } from './regional-localization/RegionalScoreCalculator';
import { ComplianceChecker } from './regional-localization/ComplianceChecker';
import { CulturalOptimizer } from './regional-localization/CulturalOptimizer';
import type { 
  RegionalOptimizationRequest, 
  RegionalOptimizationResult,
  LocalizedRecommendation 
} from './regional-localization/types';

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export class RegionalLocalizationService {
  private static instance: RegionalLocalizationService;
  private regionalConfigs = new Map<string, RegionalConfiguration>();
  private initialized = false;
  
  // Modular services
  private scoreCalculator = new RegionalScoreCalculator();
  private complianceChecker = new ComplianceChecker();
  private culturalOptimizer = new CulturalOptimizer();

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
    const regionScore = await this.scoreCalculator.calculateRegionalScore(request.cvData, regionConfig);
    
    // Check legal compliance
    const legalCompliance = await this.complianceChecker.checkLegalCompliance(request.cvData, regionConfig);
    
    // Generate cultural optimizations
    const culturalOptimization = await this.culturalOptimizer.generateCulturalOptimizations(
      request.cvData, 
      regionConfig
    );
    
    // Get market insights
    const marketInsights = this.getMarketInsights(regionConfig);
    
    // Generate localized recommendations
    const localizedRecommendations = this.generateRecommendations(
      regionScore,
      legalCompliance,
      culturalOptimization,
      regionConfig
    );

    // Determine cultural fit
    const culturalFit = this.determineCulturalFit(regionScore);

    return {
      regionScore,
      culturalFit,
      legalCompliance,
      culturalOptimization,
      marketInsights,
      localizedRecommendations
    };
  }

  /**
   * Get list of supported regions
   */
  getSupportedRegions(): string[] {
    return Array.from(this.regionalConfigs.keys());
  }

  /**
   * Load regional configurations from database
   */
  private async loadRegionalConfigurations(): Promise<void> {
    try {
      const configsSnapshot = await db.collection('regional_configurations').get();
      
      configsSnapshot.docs.forEach(doc => {
        const config = doc.data() as RegionalConfiguration;
        this.regionalConfigs.set(doc.id.toLowerCase(), config);
      });

      // Add default configurations if none exist
      if (this.regionalConfigs.size === 0) {
        this.addDefaultConfigurations();
      }
      
      console.log(`Loaded ${this.regionalConfigs.size} regional configurations`);
    } catch (error) {
      console.error('Failed to load regional configurations:', error);
      this.addDefaultConfigurations(); // Fallback to defaults
    }
  }

  private getMarketInsights(regionConfig: RegionalConfiguration) {
    return {
      popularIndustries: regionConfig.marketInsights?.popularIndustries || [],
      averageJobSearchDuration: regionConfig.marketInsights?.averageJobSearchDuration || 90,
      networkingImportance: regionConfig.marketInsights?.networkingImportance || 'medium' as const,
      remoteWorkAdoption: regionConfig.marketInsights?.remoteWorkAdoption || 0.5,
      salaryExpectations: regionConfig.marketInsights?.salaryExpectations || {
        expectationLevel: 'market_rate' as const,
        currencyPreference: 'USD',
        negotiationCulture: 'subtle' as const,
        benefitsImportance: 0.7
      }
    };
  }

  private generateRecommendations(
    regionScore: number,
    legalCompliance: any,
    culturalOptimization: any,
    regionConfig: RegionalConfiguration
  ): LocalizedRecommendation[] {
    const recommendations: LocalizedRecommendation[] = [];

    // Add compliance recommendations
    for (const issue of legalCompliance.issues) {
      recommendations.push({
        category: 'legal',
        priority: issue.severity === 'error' ? 1 : 2,
        title: 'Legal Compliance Issue',
        description: issue.description,
        actionItems: [issue.solution],
        culturalContext: `Required for compliance in ${regionConfig.region}`,
        impact: issue.severity === 'error' ? 0.9 : 0.5
      });
    }

    // Add format recommendations
    for (const adjustment of culturalOptimization.formatAdjustments) {
      recommendations.push({
        category: 'format',
        priority: adjustment.importance === 'high' ? 2 : 3,
        title: `${adjustment.aspect} Adjustment`,
        description: adjustment.reason,
        actionItems: [`Change from "${adjustment.current}" to "${adjustment.recommended}"`],
        culturalContext: adjustment.reason,
        impact: 0.6
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private determineCulturalFit(regionScore: number): 'excellent' | 'good' | 'fair' | 'needs_improvement' {
    if (regionScore >= 0.9) return 'excellent';
    if (regionScore >= 0.75) return 'good';
    if (regionScore >= 0.6) return 'fair';
    return 'needs_improvement';
  }

  private addDefaultConfigurations(): void {
    // Add basic default configurations for common regions
    const defaultRegions = ['us', 'uk', 'eu', 'canada', 'australia'];
    
    defaultRegions.forEach(region => {
      if (!this.regionalConfigs.has(region)) {
        this.regionalConfigs.set(region, this.createDefaultConfig(region));
      }
    });
  }

  private createDefaultConfig(region: string): RegionalConfiguration {
    return {
      region,
      formatPreferences: {
        photoRequired: region === 'eu',
        preferredLength: region === 'us' ? 1 : 2,
        dateFormat: region === 'us' ? 'MM/DD/YYYY' : 'DD/MM/YYYY'
      },
      contentGuidelines: {
        requiredSections: ['personal_info', 'experience', 'education'],
        discouragedSections: region === 'us' ? ['photo', 'age'] : []
      },
      languageGuidelines: {
        formalityLevel: 'formal',
        preferredTerminology: [],
        cvTerminology: region === 'us' ? 'Resume' : 'CV'
      },
      legalRestrictions: {
        prohibitedInfo: region === 'us' ? ['age', 'marital_status', 'photo'] : [],
        photoRequired: false
      }
    };
  }
}

// Export singleton instance
export const regionalLocalizationService = RegionalLocalizationService.getInstance();

// Export types for external use
export type { 
  RegionalOptimizationRequest, 
  RegionalOptimizationResult 
} from './regional-localization/types';