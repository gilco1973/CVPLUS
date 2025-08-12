#!/usr/bin/env node

/**
 * Firebase Functions Batch Deployment Script
 * 
 * This script handles:
 * 1. Environment variable conflict resolution
 * 2. Quota management through batched deployments
 * 3. Retry logic for failed deployments
 * 4. Deployment verification
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BATCH_SIZE = 10; // Deploy functions in batches of 10
const RETRY_ATTEMPTS = 3;
const BATCH_DELAY = 30000; // 30 seconds between batches

// List of all functions - extracted from actual function definitions
const ALL_FUNCTIONS = [
  // Core CV processing
  'processCV',
  'analyzeCV',
  'generateCV',
  
  // Enhanced LLM verification  
  'processCV-enhanced',
  'llmVerificationStatus',
  
  // Media generation
  'generatePodcast',
  'generateVideoIntroduction',
  'generateAudioFromText',
  
  // CV features
  'generatePortfolioGallery',
  'generateLanguageVisualization', 
  'generateTestimonialsCarousel',
  'generateCertificationBadges',
  'generateSkillsVisualization',
  'generatePersonalityInsights',
  'generateTimeline',
  'generateATSOptimization',
  
  // Social and profiles
  'publicProfile',
  'generateSocialMediaIntegration',
  'updateQRCode',
  'removeSocialProfile',
  
  // Calendar integration
  'getGoogleCalendarAuthUrl',
  'getMicrosoftCalendarAuthUrl', 
  'handleCalendarCallback',
  
  // Status and utilities
  'podcastStatus',
  'podcastStatusPublic',
  'ragChat',
  'getTemplates',
  'cleanupTempFiles',
  'testConfiguration'
];

class BatchDeployer {
  constructor() {
    this.successfulFunctions = [];
    this.failedFunctions = [];
    this.skippedFunctions = [];
  }

  /**
   * Validate environment configuration before deployment
   */
  validateEnvironment() {
    console.log('🔍 Validating environment configuration...');
    
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check for API key conflicts
    const hasAnthropicKey = envContent.includes('ANTHROPIC_API_KEY=sk-');
    const hasOpenAIKey = envContent.includes('OPENAI_API_KEY=sk-');
    const hasElevenLabsKey = envContent.includes('ELEVENLABS_API_KEY=sk_');
    
    if (hasAnthropicKey || hasOpenAIKey || hasElevenLabsKey) {
      console.log('❌ Environment variable conflicts detected!');
      console.log('API keys found in .env file will conflict with Firebase Secrets.');
      console.log('Please remove the following from .env:');
      if (hasAnthropicKey) console.log('  - ANTHROPIC_API_KEY');
      if (hasOpenAIKey) console.log('  - OPENAI_API_KEY'); 
      if (hasElevenLabsKey) console.log('  - ELEVENLABS_API_KEY');
      console.log('These should only be configured as Firebase Secrets.');
      process.exit(1);
    }
    
    // Check Firebase Secrets
    try {
      console.log('🔐 Checking Firebase Secrets...');
      const secrets = execSync('firebase functions:secrets:get --json', { encoding: 'utf8' });
      const secretsData = JSON.parse(secrets);
      
      const requiredSecrets = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'ELEVENLABS_API_KEY'];
      const missingSecrets = [];
      
      for (const secret of requiredSecrets) {
        if (!secretsData[secret] || secretsData[secret].length === 0) {
          missingSecrets.push(secret);
        }
      }
      
      if (missingSecrets.length > 0) {
        console.log('⚠️  Missing Firebase Secrets:', missingSecrets.join(', '));
        console.log('Set them using: firebase functions:secrets:set <SECRET_NAME>');
      }
      
    } catch (error) {
      console.log('⚠️  Could not verify Firebase Secrets:', error.message);
    }
    
    console.log('✅ Environment validation completed');
  }

  /**
   * Build functions before deployment
   */
  buildFunctions() {
    console.log('🏗️  Building functions...');
    try {
      execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
      console.log('✅ Functions built successfully');
    } catch (error) {
      console.log('❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Deploy a batch of functions with retry logic
   */
  async deployBatch(functions, batchNumber, totalBatches) {
    console.log(`\n🚀 Deploying batch ${batchNumber}/${totalBatches} (${functions.length} functions)`);
    console.log(`Functions: ${functions.join(', ')}`);
    
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        const functionsList = functions.map(fn => `functions:${fn}`).join(',');
        
        const deployCmd = `firebase deploy --only ${functionsList}`;
        console.log(`Attempt ${attempt}/${RETRY_ATTEMPTS}: ${deployCmd}`);
        
        execSync(deployCmd, { 
          stdio: 'inherit', 
          cwd: path.dirname(__dirname),
          timeout: 600000 // 10 minute timeout per batch
        });
        
        console.log(`✅ Batch ${batchNumber} deployed successfully`);
        this.successfulFunctions.push(...functions);
        return;
        
      } catch (error) {
        console.log(`❌ Batch ${batchNumber} attempt ${attempt} failed:`, error.message);
        
        if (attempt === RETRY_ATTEMPTS) {
          console.log(`💥 Batch ${batchNumber} failed after ${RETRY_ATTEMPTS} attempts`);
          this.failedFunctions.push(...functions);
        } else {
          console.log(`⏳ Retrying batch ${batchNumber} in 10 seconds...`);
          await this.sleep(10000);
        }
      }
    }
  }

  /**
   * Deploy all functions in batches
   */
  async deployAll() {
    console.log(`\n📦 Starting batch deployment of ${ALL_FUNCTIONS.length} functions`);
    console.log(`Batch size: ${BATCH_SIZE}, Delay between batches: ${BATCH_DELAY/1000}s`);
    
    const batches = [];
    for (let i = 0; i < ALL_FUNCTIONS.length; i += BATCH_SIZE) {
      batches.push(ALL_FUNCTIONS.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Total batches: ${batches.length}`);
    
    for (let i = 0; i < batches.length; i++) {
      await this.deployBatch(batches[i], i + 1, batches.length);
      
      // Add delay between batches to avoid quota limits
      if (i < batches.length - 1) {
        console.log(`⏳ Waiting ${BATCH_DELAY/1000}s before next batch...`);
        await this.sleep(BATCH_DELAY);
      }
    }
  }

  /**
   * Verify deployment status
   */
  verifyDeployment() {
    console.log('\n📊 Deployment Summary');
    console.log('===================');
    console.log(`✅ Successful: ${this.successfulFunctions.length} functions`);
    console.log(`❌ Failed: ${this.failedFunctions.length} functions`);
    console.log(`⏭️  Skipped: ${this.skippedFunctions.length} functions`);
    
    if (this.failedFunctions.length > 0) {
      console.log('\n❌ Failed functions:');
      this.failedFunctions.forEach(fn => console.log(`  - ${fn}`));
      
      console.log('\n🔄 To retry failed functions:');
      const retryCmd = this.failedFunctions.map(fn => `functions:${fn}`).join(',');
      console.log(`firebase deploy --only ${retryCmd}`);
    }
    
    if (this.successfulFunctions.length === ALL_FUNCTIONS.length) {
      console.log('\n🎉 All functions deployed successfully!');
      return true;
    } else {
      console.log('\n⚠️  Deployment completed with some failures');
      return false;
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Main deployment process
   */
  async run() {
    console.log('🚀 CVPlus Firebase Functions Batch Deployment');
    console.log('=============================================');
    
    try {
      // Step 1: Validate environment
      this.validateEnvironment();
      
      // Step 2: Build functions
      this.buildFunctions();
      
      // Step 3: Deploy in batches
      await this.deployAll();
      
      // Step 4: Verify and report
      const success = this.verifyDeployment();
      
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      console.error('💥 Deployment failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the deployment if this script is executed directly
if (require.main === module) {
  const deployer = new BatchDeployer();
  deployer.run();
}

module.exports = BatchDeployer;