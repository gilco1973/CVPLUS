/**
 * Environment Configuration for ATS Optimization
 */

export interface EnvironmentConfig {
  production: boolean;
  debug: boolean;
  apiTimeouts: {
    openai: number;
    claude: number;
    default: number;
  };
  modelConfigs: {
    defaultModel: string;
    maxTokens: number;
    temperature: number;
  };
  featureFlags: {
    enableAdvancedScoring: boolean;
    enableCompetitorAnalysis: boolean;
    enableSemanticKeywords: boolean;
  };
}

export const environment: EnvironmentConfig = {
  production: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV !== 'production',
  apiTimeouts: {
    openai: 30000,
    claude: 30000,
    default: 15000
  },
  modelConfigs: {
    defaultModel: 'claude-3-sonnet-20240229',
    maxTokens: 4000,
    temperature: 0.1
  },
  featureFlags: {
    enableAdvancedScoring: true,
    enableCompetitorAnalysis: true,
    enableSemanticKeywords: true
  }
};