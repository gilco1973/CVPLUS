#!/usr/bin/env node

/**
 * Pre-Deployment Validation System
 * Comprehensive validation before deployment starts
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class PreDeploymentValidator {
  constructor(projectRoot, configDir) {
    this.projectRoot = projectRoot;
    this.configDir = configDir;
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  async validate() {
    console.log('🔍 Starting pre-deployment validation...');
    
    try {
      await this.validateEnvironment();
      await this.validateAuthentication();
      await this.validateCodeQuality();
      await this.validateDependencies();
      await this.validateFirebaseConfig();
      await this.validateQuotaUsage();
      await this.validateSecurityRules();
      await this.validateEnvironmentVariables();
      
      return this.generateReport();
    } catch (error) {
      this.errors.push(`Validation failed: ${error.message}`);
      return this.generateReport();
    }
  }

  async validateEnvironment() {
    console.log('  ✓ Validating environment...');
    
    // Check Node.js version
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion < 18) {
        this.errors.push(`Node.js version ${nodeVersion} is not supported. Minimum: v18.0.0`);
      } else {
        this.info.push(`Node.js version: ${nodeVersion} ✓`);
      }
    } catch (error) {
      this.errors.push('Node.js not found in PATH');
    }

    // Check Firebase CLI
    try {
      const firebaseVersion = execSync('firebase --version', { encoding: 'utf8' }).trim();
      this.info.push(`Firebase CLI: ${firebaseVersion} ✓`);
    } catch (error) {
      this.errors.push('Firebase CLI not found. Run: npm install -g firebase-tools');
    }

    // Check Git
    try {
      const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
      this.info.push(`${gitVersion} ✓`);
    } catch (error) {
      this.warnings.push('Git not found in PATH');
    }

    // Check available disk space
    try {
      const df = execSync('df -h .', { encoding: 'utf8' });
      const lines = df.split('\n');
      const diskInfo = lines[1].split(/\s+/);
      const availableSpace = diskInfo[3];
      
      this.info.push(`Available disk space: ${availableSpace}`);
      
      // Warn if less than 1GB available
      const availableBytes = this.parseSize(availableSpace);
      if (availableBytes < 1073741824) { // 1GB
        this.warnings.push(`Low disk space: ${availableSpace}. Consider freeing up space.`);
      }
    } catch (error) {
      this.warnings.push('Could not check disk space');
    }
  }

  async validateAuthentication() {
    console.log('  ✓ Validating authentication...');
    
    try {
      // Check Firebase authentication
      const whoami = execSync('firebase whoami', { encoding: 'utf8' }).trim();
      if (whoami.includes('not logged in')) {
        this.errors.push('Not logged into Firebase. Run: firebase login');
      } else {
        this.info.push(`Firebase user: ${whoami} ✓`);
      }

      // Check current project
      const project = execSync('firebase use', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      }).trim();
      
      if (project.includes('No active project')) {
        this.errors.push('No active Firebase project. Run: firebase use <project-id>');
      } else {
        this.info.push(`Active project: ${project} ✓`);
      }
    } catch (error) {
      this.errors.push(`Firebase authentication check failed: ${error.message}`);
    }
  }

  async validateCodeQuality() {
    console.log('  ✓ Validating code quality...');
    
    // Check TypeScript compilation for frontend
    try {
      const frontendPath = path.join(this.projectRoot, 'frontend');
      execSync('npm run build', { 
        cwd: frontendPath, 
        stdio: 'pipe' 
      });
      this.info.push('Frontend TypeScript compilation: ✓');
    } catch (error) {
      this.errors.push('Frontend TypeScript compilation failed. Fix errors before deployment.');
    }

    // Check TypeScript compilation for functions
    try {
      const functionsPath = path.join(this.projectRoot, 'functions');
      execSync('npm run build', { 
        cwd: functionsPath, 
        stdio: 'pipe' 
      });
      this.info.push('Functions TypeScript compilation: ✓');
    } catch (error) {
      this.errors.push('Functions TypeScript compilation failed. Fix errors before deployment.');
    }

    // Check for common issues
    await this.checkCommonIssues();
  }

  async checkCommonIssues() {
    const functionsPath = path.join(this.projectRoot, 'functions', 'src');
    
    try {
      const files = await this.getAllTsFiles(functionsPath);
      
      for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        
        // Check for hardcoded secrets
        if (this.containsHardcodedSecrets(content)) {
          this.warnings.push(`Potential hardcoded secrets in ${path.relative(this.projectRoot, file)}`);
        }
        
        // Check for console.log statements
        if (content.includes('console.log(') && !file.includes('test')) {
          this.warnings.push(`Console.log statements found in ${path.relative(this.projectRoot, file)}`);
        }
        
        // Check file length
        const lines = content.split('\n').length;
        if (lines > 200) {
          this.warnings.push(`File ${path.relative(this.projectRoot, file)} has ${lines} lines (limit: 200)`);
        }
      }
    } catch (error) {
      this.warnings.push(`Code quality check partially failed: ${error.message}`);
    }
  }

  async validateDependencies() {
    console.log('  ✓ Validating dependencies...');
    
    // Check frontend dependencies
    await this.checkDependencies(path.join(this.projectRoot, 'frontend'));
    
    // Check functions dependencies
    await this.checkDependencies(path.join(this.projectRoot, 'functions'));
  }

  async checkDependencies(projectPath) {
    try {
      const packagePath = path.join(projectPath, 'package.json');
      const lockPath = path.join(projectPath, 'package-lock.json');
      
      const packageExists = await fs.access(packagePath).then(() => true).catch(() => false);
      const lockExists = await fs.access(lockPath).then(() => true).catch(() => false);
      
      if (!packageExists) {
        this.errors.push(`package.json not found in ${path.relative(this.projectRoot, projectPath)}`);
        return;
      }
      
      if (!lockExists) {
        this.warnings.push(`package-lock.json not found in ${path.relative(this.projectRoot, projectPath)}`);
      }
      
      // Check for vulnerabilities
      try {
        execSync('npm audit --audit-level moderate', { 
          cwd: projectPath, 
          stdio: 'pipe' 
        });
        this.info.push(`Dependencies in ${path.relative(this.projectRoot, projectPath)}: No security issues ✓`);
      } catch (error) {
        this.warnings.push(`Security vulnerabilities found in ${path.relative(this.projectRoot, projectPath)}`);
      }
      
    } catch (error) {
      this.errors.push(`Dependency check failed for ${path.relative(this.projectRoot, projectPath)}: ${error.message}`);
    }
  }

  async validateFirebaseConfig() {
    console.log('  ✓ Validating Firebase configuration...');
    
    const firebaseJson = path.join(this.projectRoot, 'firebase.json');
    
    try {
      const config = JSON.parse(await fs.readFile(firebaseJson, 'utf8'));
      
      // Validate configuration structure
      const requiredSections = ['hosting', 'functions', 'firestore', 'storage'];
      const missingSections = requiredSections.filter(section => !config[section]);
      
      if (missingSections.length > 0) {
        this.warnings.push(`Missing Firebase config sections: ${missingSections.join(', ')}`);
      }
      
      // Validate specific configurations
      if (config.functions && config.functions.runtime !== 'nodejs20') {
        this.warnings.push(`Functions runtime: ${config.functions.runtime} (recommended: nodejs20)`);
      }
      
      if (config.hosting && config.hosting.public !== 'frontend/dist') {
        this.warnings.push(`Hosting public directory: ${config.hosting.public} (expected: frontend/dist)`);
      }
      
      this.info.push('Firebase configuration: ✓');
    } catch (error) {
      this.errors.push(`Firebase configuration validation failed: ${error.message}`);
    }
  }

  async validateQuotaUsage() {
    console.log('  ✓ Validating quota usage...');
    
    try {
      // This would typically check Firebase quotas via API
      // For now, we'll do basic checks
      
      const functionsDir = path.join(this.projectRoot, 'functions', 'src');
      const functionFiles = await this.getAllTsFiles(functionsDir);
      
      const functionCount = functionFiles.filter(file => 
        file.includes('/functions/') && !file.includes('test')
      ).length;
      
      if (functionCount > 50) {
        this.warnings.push(`Large number of functions (${functionCount}). Consider batching deployment.`);
      }
      
      this.info.push(`Estimated functions to deploy: ${functionCount}`);
    } catch (error) {
      this.warnings.push(`Quota validation failed: ${error.message}`);
    }
  }

  async validateSecurityRules() {
    console.log('  ✓ Validating security rules...');
    
    const firestoreRules = path.join(this.projectRoot, 'firestore.rules');
    const storageRules = path.join(this.projectRoot, 'storage.rules');
    
    // Validate Firestore rules
    try {
      await fs.access(firestoreRules);
      const rulesContent = await fs.readFile(firestoreRules, 'utf8');
      
      if (rulesContent.includes('allow read, write: if true;')) {
        this.warnings.push('Firestore rules allow unrestricted access. Review security rules.');
      }
      
      this.info.push('Firestore rules: ✓');
    } catch (error) {
      this.errors.push('Firestore rules file not found');
    }
    
    // Validate Storage rules
    try {
      await fs.access(storageRules);
      const rulesContent = await fs.readFile(storageRules, 'utf8');
      
      if (rulesContent.includes('allow read, write: if true;')) {
        this.warnings.push('Storage rules allow unrestricted access. Review security rules.');
      }
      
      this.info.push('Storage rules: ✓');
    } catch (error) {
      this.errors.push('Storage rules file not found');
    }
  }

  async validateEnvironmentVariables() {
    console.log('  ✓ Validating environment variables...');
    
    const envFile = path.join(this.projectRoot, 'functions', '.env');
    
    try {
      await fs.access(envFile);
      const envContent = await fs.readFile(envFile, 'utf8');
      
      const requiredVars = [
        'ANTHROPIC_API_KEY',
        'OPENAI_API_KEY',
        'ELEVENLABS_API_KEY'
      ];
      
      const missingVars = requiredVars.filter(varName => 
        !envContent.includes(`${varName}=`)
      );
      
      if (missingVars.length > 0) {
        this.errors.push(`Missing environment variables: ${missingVars.join(', ')}`);
      } else {
        this.info.push('Environment variables: ✓');
      }
      
      // Check for empty values
      const emptyVars = requiredVars.filter(varName => {
        const match = envContent.match(new RegExp(`${varName}=(.*)$`, 'm'));
        return match && (!match[1] || match[1].trim() === '');
      });
      
      if (emptyVars.length > 0) {
        this.warnings.push(`Empty environment variables: ${emptyVars.join(', ')}`);
      }
      
    } catch (error) {
      this.errors.push('Environment file (.env) not found in functions directory');
    }
  }

  generateReport() {
    const hasErrors = this.errors.length > 0;
    const hasWarnings = this.warnings.length > 0;
    
    console.log('\n📋 Pre-deployment Validation Report:');
    console.log('═══════════════════════════════════════\n');
    
    if (this.info.length > 0) {
      console.log('✅ Information:');
      this.info.forEach(item => console.log(`   ${item}`));
      console.log();
    }
    
    if (hasWarnings) {
      console.log('⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`   ${warning}`));
      console.log();
    }
    
    if (hasErrors) {
      console.log('❌ Errors:');
      this.errors.forEach(error => console.log(`   ${error}`));
      console.log();
    }
    
    if (hasErrors) {
      console.log('🚫 VALIDATION FAILED - Please fix errors before deployment');
      process.exit(1);
    } else if (hasWarnings) {
      console.log('⚠️  VALIDATION PASSED WITH WARNINGS - Review warnings before deployment');
      process.exit(0);
    } else {
      console.log('✅ VALIDATION PASSED - Ready for deployment');
      process.exit(0);
    }
  }

  // Helper methods
  async getAllTsFiles(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          files.push(...await this.getAllTsFiles(fullPath));
        } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  containsHardcodedSecrets(content) {
    const secretPatterns = [
      /sk-[a-zA-Z0-9]{20,}/,  // OpenAI API key pattern
      /sk_[a-zA-Z0-9]{32,}/,  // ElevenLabs API key pattern
      /"[A-Z0-9]{32,}"/,      // Generic API key pattern
      /password\s*[:=]\s*["'][^"']+["']/i,
      /secret\s*[:=]\s*["'][^"']+["']/i,
    ];
    
    return secretPatterns.some(pattern => pattern.test(content));
  }

  parseSize(sizeStr) {
    const units = { K: 1024, M: 1024**2, G: 1024**3, T: 1024**4 };
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)([KMGT]?)/);
    if (!match) return 0;
    
    const [, size, unit] = match;
    return parseFloat(size) * (units[unit] || 1);
  }
}

// Main execution
if (require.main === module) {
  const [,, projectRoot, configDir] = process.argv;
  
  if (!projectRoot) {
    console.error('Usage: node pre-deployment-validator.js <project-root> [config-dir]');
    process.exit(1);
  }
  
  const validator = new PreDeploymentValidator(
    projectRoot, 
    configDir || path.join(projectRoot, 'scripts', 'deployment', 'config')
  );
  
  validator.validate().catch(error => {
    console.error('Validation failed with error:', error);
    process.exit(1);
  });
}

module.exports = PreDeploymentValidator;