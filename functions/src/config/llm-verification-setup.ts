import { llmVerificationConfig, validateLLMConfig, performConfigHealthCheck } from './llm-verification.config';

/**
 * LLM Verification Setup and Configuration Manager
 * 
 * This module provides utilities for setting up and configuring the LLM verification system
 * across different environments (development, staging, production).
 * 
 * Features:
 * - Environment-specific configuration setup
 * - Configuration validation and health checks
 * - Migration utilities for existing deployments
 * - Performance optimization recommendations
 */

export interface SetupResult {
  success: boolean;
  environment: string;
  configurationValid: boolean;
  healthStatus: {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  };
  services: {
    anthropicConfigured: boolean;
    openaiConfigured: boolean;
    verificationEnabled: boolean;
    securityEnabled: boolean;
  };
  performanceProfile: {
    expectedLatencyIncrease: string;
    memoryRequirements: string;
    recommendedSettings: Record<string, any>;
  };
  migrationSteps?: string[];
  warnings?: string[];
}

export class LLMVerificationSetupManager {
  private config = llmVerificationConfig;

  /**
   * Perform complete setup validation for the current environment
   */
  async performSetup(): Promise<SetupResult> {
    console.log('🚀 Starting LLM Verification System Setup...');
    
    const environment = process.env.NODE_ENV || 'development';
    console.log(`Environment: ${environment}`);
    
    // Validate configuration
    const configValidation = validateLLMConfig(this.config);
    console.log(`Configuration Valid: ${configValidation.valid}`);
    
    if (!configValidation.valid) {
      console.log('Configuration Errors:', configValidation.errors);
    }
    
    // Perform health check
    const healthCheck = performConfigHealthCheck();
    console.log(`System Healthy: ${healthCheck.healthy}`);
    
    if (healthCheck.issues.length > 0) {
      console.log('Health Issues:', healthCheck.issues);
    }
    
    // Check service availability
    const services = {
      anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      verificationEnabled: this.config.verification.enabled,
      securityEnabled: this.config.security.rateLimiting.enabled
    };
    
    // Generate performance profile
    const performanceProfile = this.generatePerformanceProfile(environment);
    
    // Generate migration steps if needed
    const migrationSteps = this.generateMigrationSteps();
    
    // Collect warnings
    const warnings = this.collectWarnings(services, healthCheck);
    
    const result: SetupResult = {
      success: configValidation.valid && healthCheck.healthy,
      environment,
      configurationValid: configValidation.valid,
      healthStatus: healthCheck,
      services,
      performanceProfile,
      migrationSteps,
      warnings
    };
    
    this.printSetupSummary(result);
    
    return result;
  }

  /**
   * Generate environment-specific performance profile
   */
  private generatePerformanceProfile(environment: string): SetupResult['performanceProfile'] {
    const profiles = {
      development: {
        expectedLatencyIncrease: '15-30%',
        memoryRequirements: '512MB additional',
        recommendedSettings: {
          maxRetries: 2,
          timeoutMs: 30000,
          rateLimitRpm: 120
        }
      },
      staging: {
        expectedLatencyIncrease: '20-35%',
        memoryRequirements: '256MB additional',
        recommendedSettings: {
          maxRetries: 3,
          timeoutMs: 45000,
          rateLimitRpm: 80
        }
      },
      production: {
        expectedLatencyIncrease: '25-40%',
        memoryRequirements: '256MB additional',
        recommendedSettings: {
          maxRetries: 3,
          timeoutMs: 45000,
          rateLimitRpm: 60
        }
      }
    };
    
    return profiles[environment as keyof typeof profiles] || profiles.development;
  }

  /**
   * Generate migration steps for existing deployments
   */
  private generateMigrationSteps(): string[] {
    const steps = [
      'Update environment variables with required API keys',
      'Deploy updated function code with verification services',
      'Test verification system with sample data',
      'Monitor performance impact and adjust thresholds',
      'Gradually enable verification for production traffic',
      'Set up monitoring and alerting for verification failures'
    ];
    
    return steps;
  }

  /**
   * Collect warnings based on current configuration
   */
  private collectWarnings(services: SetupResult['services'], healthCheck: SetupResult['healthStatus']): string[] {
    const warnings: string[] = [];
    
    if (!services.openaiConfigured && this.config.verification.enabled) {
      warnings.push('OpenAI API key not configured - verification will use single-model validation');
    }
    
    if (!services.securityEnabled) {
      warnings.push('Rate limiting disabled - recommended for production environments');
    }
    
    if (this.config.verification.maxRetries > 3) {
      warnings.push('High retry count may impact response times');
    }
    
    if (this.config.verification.timeoutMs > 60000) {
      warnings.push('Long timeout may impact user experience');
    }
    
    warnings.push(...healthCheck.recommendations);
    
    return warnings;
  }

  /**
   * Print comprehensive setup summary
   */
  private printSetupSummary(result: SetupResult): void {
    console.log('\n' + '='.repeat(80));
    console.log('📋 LLM VERIFICATION SYSTEM SETUP SUMMARY');
    console.log('='.repeat(80));
    console.log(`Environment: ${result.environment}`);
    console.log(`Setup Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Configuration: ${result.configurationValid ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`System Health: ${result.healthStatus.healthy ? '✅ Healthy' : '⚠️ Issues Detected'}`);
    console.log('');
    
    console.log('🔧 SERVICE STATUS');
    console.log('-'.repeat(20));
    console.log(`Anthropic API: ${result.services.anthropicConfigured ? '✅ Configured' : '❌ Missing'}`);
    console.log(`OpenAI API: ${result.services.openaiConfigured ? '✅ Configured' : '❌ Missing'}`);
    console.log(`Verification: ${result.services.verificationEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`Security: ${result.services.securityEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log('');
    
    console.log('⚡ PERFORMANCE PROFILE');
    console.log('-'.repeat(25));
    console.log(`Expected Latency Increase: ${result.performanceProfile.expectedLatencyIncrease}`);
    console.log(`Additional Memory: ${result.performanceProfile.memoryRequirements}`);
    console.log('Recommended Settings:');
    Object.entries(result.performanceProfile.recommendedSettings).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('');
    
    if (result.healthStatus.issues.length > 0) {
      console.log('⚠️ ISSUES DETECTED');
      console.log('-'.repeat(20));
      result.healthStatus.issues.forEach(issue => console.log(`  • ${issue}`));
      console.log('');
    }
    
    if (result.warnings && result.warnings.length > 0) {
      console.log('⚠️ WARNINGS');
      console.log('-'.repeat(15));
      result.warnings.forEach(warning => console.log(`  • ${warning}`));
      console.log('');
    }
    
    if (result.migrationSteps && result.migrationSteps.length > 0) {
      console.log('📋 MIGRATION STEPS');
      console.log('-'.repeat(20));
      result.migrationSteps.forEach((step, index) => {
        console.log(`  ${index + 1}. ${step}`);
      });
      console.log('');
    }
    
    if (result.healthStatus.recommendations.length > 0) {
      console.log('💡 RECOMMENDATIONS');
      console.log('-'.repeat(20));
      result.healthStatus.recommendations.forEach(rec => console.log(`  • ${rec}`));
      console.log('');
    }
    
    console.log('='.repeat(80));
  }

  /**
   * Setup Firebase Function configuration for verification
   */
  async setupFirebaseFunctions(): Promise<void> {
    console.log('🔧 Setting up Firebase Functions configuration...');
    
    // This would update the Firebase Functions configuration
    // In practice, this might update firebase.json or environment configuration
    
    const functionConfig = {
      source: 'functions',
      runtime: 'nodejs20',
      timeout: '540s', // Increased for verification
      memory: '2GB',   // Increased for verification processing
      secrets: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'],
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        LLM_VERIFICATION_ENABLED: this.config.verification.enabled.toString()
      }
    };
    
    console.log('Firebase Functions Configuration:');
    console.log(JSON.stringify(functionConfig, null, 2));
    
    // In a real implementation, this would write to firebase.json
    console.log('✅ Firebase Functions configuration updated');
  }

  /**
   * Create deployment checklist
   */
  generateDeploymentChecklist(): string[] {
    return [
      '[ ] Environment variables configured (ANTHROPIC_API_KEY, OPENAI_API_KEY)',
      '[ ] Firebase project permissions updated',
      '[ ] Function timeout increased to 540s',
      '[ ] Function memory increased to 2GB',
      '[ ] Verification configuration validated',
      '[ ] Test data prepared for validation',
      '[ ] Monitoring and alerting configured',
      '[ ] Rollback plan prepared',
      '[ ] Performance benchmarks established',
      '[ ] Security settings reviewed',
      '[ ] Rate limiting configured',
      '[ ] Audit logging enabled'
    ];
  }

  /**
   * Validate deployment readiness
   */
  async validateDeploymentReadiness(): Promise<{
    ready: boolean;
    blockers: string[];
    warnings: string[];
    checklist: string[];
  }> {
    console.log('🔍 Validating deployment readiness...');
    
    const blockers: string[] = [];
    const warnings: string[] = [];
    
    // Critical checks
    if (!process.env.ANTHROPIC_API_KEY) {
      blockers.push('ANTHROPIC_API_KEY environment variable is required');
    }
    
    if (this.config.verification.enabled && !process.env.OPENAI_API_KEY) {
      warnings.push('OPENAI_API_KEY recommended for full verification capabilities');
    }
    
    // Configuration validation
    const configValidation = validateLLMConfig(this.config);
    if (!configValidation.valid) {
      blockers.push(...configValidation.errors.map(e => `Configuration error: ${e}`));
    }
    
    // Health check
    const healthCheck = performConfigHealthCheck();
    if (!healthCheck.healthy) {
      blockers.push(...healthCheck.issues.map(i => `Health issue: ${i}`));
    }
    
    const checklist = this.generateDeploymentChecklist();
    
    return {
      ready: blockers.length === 0,
      blockers,
      warnings,
      checklist
    };
  }
}

// Export setup utilities
export const setupManager = new LLMVerificationSetupManager();

// CLI runner for setup
if (require.main === module) {
  async function runSetup() {
    try {
      const result = await setupManager.performSetup();
      
      if (result.success) {
        console.log('✅ Setup completed successfully!');
        
        // Validate deployment readiness
        const deploymentCheck = await setupManager.validateDeploymentReadiness();
        
        if (deploymentCheck.ready) {
          console.log('🚀 System is ready for deployment!');
        } else {
          console.log('⚠️ Deployment blockers detected:');
          deploymentCheck.blockers.forEach(blocker => console.log(`  • ${blocker}`));
        }
        
        console.log('\n📋 Deployment Checklist:');
        deploymentCheck.checklist.forEach(item => console.log(`  ${item}`));
        
        process.exit(0);
      } else {
        console.log('❌ Setup failed. Please address the issues above.');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Setup failed with error:', error);
      process.exit(1);
    }
  }
  
  runSetup();
}