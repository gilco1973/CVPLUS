/**
 * Environment Configuration
 * Provides environment-specific settings and variables
 */

export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  FIREBASE_PROJECT_ID: string;
  REGION: string;
  API_BASE_URL: string;
  CORS_ORIGINS: string[];
}

export const environment: EnvironmentConfig = {
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'getmycv-ai',
  REGION: process.env.FIREBASE_REGION || 'us-central1',
  API_BASE_URL: process.env.API_BASE_URL || 'https://api.cvplus.app',
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'https://cvplus.app']
};

export default environment;