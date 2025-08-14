#!/usr/bin/env node

/**
 * Deployment Reporter and Summary System
 * Comprehensive reporting and metrics collection for deployments
 */

const fs = require('fs').promises;
const path = require('path');

class DeploymentReporter {
  constructor(projectRoot, logFile, reportFile) {
    this.projectRoot = projectRoot;
    this.logFile = logFile;
    this.reportFile = reportFile;
    this.deploymentData = {};
    this.metrics = {};
    this.recommendations = [];
  }

  async generateReport() {
    console.log('📊 Generating comprehensive deployment report...');
    
    try {
      await this.collectDeploymentData();
      await this.analyzeMetrics();
      await this.generateRecommendations();
      await this.createDetailedReport();
      await this.createSummaryReport();
      
      console.log('✅ Deployment report generated successfully');
      return {
        status: 'success',
        reportFile: this.reportFile,
        summaryFile: this.reportFile.replace('.json', '-summary.json')
      };
    } catch (error) {
      console.log(`❌ Report generation failed: ${error.message}`);
      throw error;
    }
  }

  async collectDeploymentData() {
    console.log('  📊 Collecting deployment data...');
    
    // Parse log file for deployment information
    this.deploymentData = await this.parseDeploymentLog();
    
    // Collect project information
    this.deploymentData.project = await this.getProjectInfo();
    
    // Collect component information
    this.deploymentData.components = await this.getComponentInfo();
    
    // Collect performance data
    this.deploymentData.performance = await this.getPerformanceData();
    
    console.log('    ✅ Deployment data collected');
  }

  async parseDeploymentLog() {
    try {
      const logContent = await fs.readFile(this.logFile, 'utf8');
      const logLines = logContent.split('\n');
      
      const deploymentData = {
        timestamp: new Date().toISOString(),
        events: [],
        errors: [],
        warnings: [],
        phases: {},
        duration: null
      };
      
      let startTime = null;
      let endTime = null;
      let currentPhase = null;
      
      for (const line of logLines) {
        if (!line.trim()) continue;
        
        // Parse timestamp and log level
        const match = line.match(/^\[(.+?)\] \[(.+?)\] (.+)$/);
        if (!match) continue;
        
        const [, timestamp, level, message] = match;
        const logEntry = { timestamp, level, message };
        
        // Track start/end times
        if (message.includes('Starting intelligent Firebase deployment')) {
          startTime = new Date(timestamp);
        }
        if (message.includes('Deployment completed successfully') || 
            message.includes('Deployment failed')) {
          endTime = new Date(timestamp);
        }
        
        // Track phases
        if (message.includes('Starting pre-deployment validation')) {
          currentPhase = 'validation';
          deploymentData.phases.validation = { start: timestamp, events: [] };
        } else if (message.includes('Starting build phase')) {
          currentPhase = 'build';
          deploymentData.phases.build = { start: timestamp, events: [] };
        } else if (message.includes('Starting deployment phase')) {
          currentPhase = 'deployment';
          deploymentData.phases.deployment = { start: timestamp, events: [] };
        } else if (message.includes('Running post-deployment health checks')) {
          currentPhase = 'health_checks';
          deploymentData.phases.health_checks = { start: timestamp, events: [] };
        }
        
        // Add to current phase
        if (currentPhase && deploymentData.phases[currentPhase]) {
          deploymentData.phases[currentPhase].events.push(logEntry);
        }
        
        // Categorize by level
        if (level === 'ERROR') {
          deploymentData.errors.push(logEntry);
        } else if (level === 'WARNING') {
          deploymentData.warnings.push(logEntry);
        }
        
        deploymentData.events.push(logEntry);
      }
      
      // Calculate duration
      if (startTime && endTime) {
        deploymentData.duration = Math.round((endTime - startTime) / 1000); // seconds
      }
      
      return deploymentData;
    } catch (error) {
      console.log(`    ⚠️  Could not parse log file: ${error.message}`);
      return {
        timestamp: new Date().toISOString(),
        events: [],
        errors: [],
        warnings: [],
        phases: {},
        duration: null,
        parseError: error.message
      };
    }
  }

  async getProjectInfo() {
    try {
      // Get Firebase project info
      const firebaserc = path.join(this.projectRoot, '.firebaserc');
      let projectId = null;
      
      try {
        const config = JSON.parse(await fs.readFile(firebaserc, 'utf8'));
        projectId = config.projects?.default || Object.values(config.projects || {})[0];
      } catch (error) {
        // .firebaserc might not exist
      }
      
      // Get package.json info for functions
      const functionsPackage = path.join(this.projectRoot, 'functions', 'package.json');
      let functionsInfo = {};
      
      try {
        const pkg = JSON.parse(await fs.readFile(functionsPackage, 'utf8'));
        functionsInfo = {
          name: pkg.name,
          version: pkg.version,
          nodeVersion: pkg.engines?.node,
          dependencies: Object.keys(pkg.dependencies || {}).length,
          devDependencies: Object.keys(pkg.devDependencies || {}).length
        };
      } catch (error) {
        // functions package.json might not exist
      }
      
      // Get frontend package.json info
      const frontendPackage = path.join(this.projectRoot, 'frontend', 'package.json');
      let frontendInfo = {};
      
      try {
        const pkg = JSON.parse(await fs.readFile(frontendPackage, 'utf8'));
        frontendInfo = {
          name: pkg.name,
          version: pkg.version,
          dependencies: Object.keys(pkg.dependencies || {}).length,
          devDependencies: Object.keys(pkg.devDependencies || {}).length
        };
      } catch (error) {
        // frontend package.json might not exist
      }
      
      return {
        projectId: projectId,
        projectRoot: this.projectRoot,
        functions: functionsInfo,
        frontend: frontendInfo,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getComponentInfo() {
    const components = {};
    
    try {
      // Functions information
      const functionsDir = path.join(this.projectRoot, 'functions', 'src', 'functions');
      const functionFiles = await this.getFunctionFiles(functionsDir);
      
      components.functions = {
        count: functionFiles.length,
        files: functionFiles.map(f => ({
          name: path.basename(f, '.ts'),
          path: path.relative(this.projectRoot, f),
          size: await this.getFileSize(f)
        })),
        totalSize: await this.getTotalSize(functionFiles)
      };
    } catch (error) {
      components.functions = { error: error.message };
    }
    
    try {
      // Frontend build information
      const distDir = path.join(this.projectRoot, 'frontend', 'dist');
      const distExists = await fs.access(distDir).then(() => true).catch(() => false);
      
      if (distExists) {
        const buildFiles = await this.getAllFiles(distDir);
        components.frontend = {
          buildExists: true,
          fileCount: buildFiles.length,
          totalSize: await this.getTotalSize(buildFiles),
          files: buildFiles.slice(0, 10).map(f => ({
            path: path.relative(distDir, f),
            size: await this.getFileSize(f)
          }))
        };
      } else {
        components.frontend = {
          buildExists: false,
          message: 'Build directory not found'
        };
      }
    } catch (error) {
      components.frontend = { error: error.message };
    }
    
    try {
      // Configuration files
      const configFiles = [
        'firebase.json',
        'firestore.rules',
        'storage.rules',
        'firestore.indexes.json',
        'cors.json'
      ];
      
      components.configuration = {};
      
      for (const configFile of configFiles) {
        const configPath = path.join(this.projectRoot, configFile);
        const exists = await fs.access(configPath).then(() => true).catch(() => false);
        
        if (exists) {
          components.configuration[configFile] = {
            exists: true,
            size: await this.getFileSize(configPath),
            lastModified: (await fs.stat(configPath)).mtime.toISOString()
          };
        } else {
          components.configuration[configFile] = { exists: false };
        }
      }
    } catch (error) {
      components.configuration = { error: error.message };
    }
    
    return components;
  }

  async getPerformanceData() {
    const performance = {
      timestamp: new Date().toISOString()
    };
    
    // Analyze deployment phases timing
    if (this.deploymentData.phases) {
      performance.phases = {};
      
      for (const [phaseName, phaseData] of Object.entries(this.deploymentData.phases)) {
        const events = phaseData.events || [];
        const startTime = new Date(phaseData.start);
        
        // Find completion event
        const completionEvents = events.filter(e => 
          e.message.includes('completed') || 
          e.message.includes('passed') || 
          e.message.includes('finished')
        );
        
        let duration = null;
        if (completionEvents.length > 0) {
          const endTime = new Date(completionEvents[completionEvents.length - 1].timestamp);
          duration = Math.round((endTime - startTime) / 1000); // seconds
        }
        
        performance.phases[phaseName] = {
          duration: duration,
          eventCount: events.length,
          errorCount: events.filter(e => e.level === 'ERROR').length,
          warningCount: events.filter(e => e.level === 'WARNING').length
        };
      }
    }
    
    // Overall performance metrics
    performance.overall = {
      totalDuration: this.deploymentData.duration,
      totalErrors: this.deploymentData.errors?.length || 0,
      totalWarnings: this.deploymentData.warnings?.length || 0,
      totalEvents: this.deploymentData.events?.length || 0,
      successRate: this.calculateSuccessRate()
    };
    
    return performance;
  }

  calculateSuccessRate() {
    const totalEvents = this.deploymentData.events?.length || 0;
    const errorEvents = this.deploymentData.errors?.length || 0;
    
    if (totalEvents === 0) return 100;
    
    return Math.round(((totalEvents - errorEvents) / totalEvents) * 100);
  }

  async analyzeMetrics() {
    console.log('  📈 Analyzing deployment metrics...');
    
    this.metrics = {
      deployment: this.analyzeDeploymentMetrics(),
      performance: this.analyzePerformanceMetrics(),
      quality: this.analyzeQualityMetrics(),
      resource: this.analyzeResourceMetrics()
    };
    
    console.log('    ✅ Metrics analyzed');
  }

  analyzeDeploymentMetrics() {
    const phases = this.deploymentData.phases || {};
    const errors = this.deploymentData.errors || [];
    const warnings = this.deploymentData.warnings || [];
    
    return {
      phasesCompleted: Object.keys(phases).length,
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      duration: this.deploymentData.duration,
      status: errors.length === 0 ? 'success' : 'failure',
      reliability: this.calculateReliabilityScore()
    };
  }

  analyzePerformanceMetrics() {
    const phases = this.deploymentData.phases || {};
    
    const phaseDurations = {};
    for (const [phaseName, phaseData] of Object.entries(phases)) {
      if (this.deploymentData.performance?.phases?.[phaseName]?.duration) {
        phaseDurations[phaseName] = this.deploymentData.performance.phases[phaseName].duration;
      }
    }
    
    const totalDuration = Object.values(phaseDurations).reduce((sum, duration) => sum + duration, 0);
    
    return {
      phaseDurations: phaseDurations,
      totalDuration: totalDuration,
      averagePhaseTime: totalDuration / Object.keys(phaseDurations).length || 0,
      performanceGrade: this.calculatePerformanceGrade(totalDuration)
    };
  }

  analyzeQualityMetrics() {
    const components = this.deploymentData.components || {};
    
    return {
      functionCount: components.functions?.count || 0,
      functionTotalSize: components.functions?.totalSize || 0,
      frontendBuildExists: components.frontend?.buildExists || false,
      frontendFileCount: components.frontend?.fileCount || 0,
      configurationComplete: this.calculateConfigurationCompleteness(),
      qualityScore: this.calculateQualityScore()
    };
  }

  analyzeResourceMetrics() {
    const components = this.deploymentData.components || {};
    
    const functionSize = components.functions?.totalSize || 0;
    const frontendSize = components.frontend?.totalSize || 0;
    
    return {
      totalDeploymentSize: functionSize + frontendSize,
      functionSize: functionSize,
      frontendSize: frontendSize,
      resourceEfficiency: this.calculateResourceEfficiency(functionSize + frontendSize)
    };
  }

  calculateReliabilityScore() {
    const errors = this.deploymentData.errors?.length || 0;
    const warnings = this.deploymentData.warnings?.length || 0;
    const totalEvents = this.deploymentData.events?.length || 0;
    
    if (totalEvents === 0) return 100;
    
    const errorWeight = 10;
    const warningWeight = 2;
    const penalty = (errors * errorWeight) + (warnings * warningWeight);
    
    return Math.max(0, 100 - Math.round((penalty / totalEvents) * 100));
  }

  calculatePerformanceGrade(duration) {
    if (!duration) return 'Unknown';
    
    if (duration < 300) return 'Excellent'; // < 5 minutes
    if (duration < 600) return 'Good';      // < 10 minutes
    if (duration < 1200) return 'Fair';     // < 20 minutes
    if (duration < 1800) return 'Poor';     // < 30 minutes
    return 'Very Poor';
  }

  calculateConfigurationCompleteness() {
    const config = this.deploymentData.components?.configuration || {};
    const requiredConfigs = ['firebase.json', 'firestore.rules', 'storage.rules'];
    
    const existingConfigs = requiredConfigs.filter(conf => config[conf]?.exists);
    
    return Math.round((existingConfigs.length / requiredConfigs.length) * 100);
  }

  calculateQualityScore() {
    let score = 100;
    
    // Deduct for errors and warnings
    const errors = this.deploymentData.errors?.length || 0;
    const warnings = this.deploymentData.warnings?.length || 0;
    
    score -= (errors * 15); // 15 points per error
    score -= (warnings * 5); // 5 points per warning
    
    // Deduct for missing configurations
    const configCompleteness = this.calculateConfigurationCompleteness();
    score -= (100 - configCompleteness) * 0.2;
    
    return Math.max(0, Math.round(score));
  }

  calculateResourceEfficiency(totalSize) {
    if (!totalSize) return 'Unknown';
    
    const sizeInMB = totalSize / (1024 * 1024);
    
    if (sizeInMB < 50) return 'Excellent';
    if (sizeInMB < 100) return 'Good';
    if (sizeInMB < 200) return 'Fair';
    if (sizeInMB < 500) return 'Poor';
    return 'Very Poor';
  }

  async generateRecommendations() {
    console.log('  💡 Generating recommendations...');
    
    this.recommendations = [];
    
    // Performance recommendations
    if (this.metrics.performance.totalDuration > 600) {
      this.recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Reduce Deployment Time',
        description: 'Deployment took longer than 10 minutes. Consider batching functions or optimizing build process.',
        actions: [
          'Implement batch deployment for functions',
          'Optimize build processes',
          'Review function sizes and dependencies'
        ]
      });
    }
    
    // Quality recommendations
    if (this.metrics.quality.qualityScore < 80) {
      this.recommendations.push({
        category: 'quality',
        priority: 'medium',
        title: 'Improve Deployment Quality',
        description: `Quality score is ${this.metrics.quality.qualityScore}%. Address errors and warnings.`,
        actions: [
          'Fix deployment errors',
          'Address warning messages',
          'Complete missing configurations'
        ]
      });
    }
    
    // Resource recommendations
    if (this.metrics.resource.resourceEfficiency === 'Poor' || 
        this.metrics.resource.resourceEfficiency === 'Very Poor') {
      this.recommendations.push({
        category: 'resource',
        priority: 'medium',
        title: 'Optimize Resource Usage',
        description: 'Deployment size is large. Consider optimization strategies.',
        actions: [
          'Enable tree shaking for frontend',
          'Remove unused dependencies',
          'Optimize function bundle sizes',
          'Compress static assets'
        ]
      });
    }
    
    // Error-specific recommendations
    const errors = this.deploymentData.errors || [];
    if (errors.some(e => e.message.toLowerCase().includes('quota'))) {
      this.recommendations.push({
        category: 'quota',
        priority: 'high',
        title: 'Address Quota Issues',
        description: 'Quota-related errors detected during deployment.',
        actions: [
          'Implement intelligent batching',
          'Monitor quota usage',
          'Consider quota limit increases',
          'Optimize deployment timing'
        ]
      });
    }
    
    console.log(`    ✅ Generated ${this.recommendations.length} recommendations`);
  }

  async createDetailedReport() {
    console.log('  📋 Creating detailed report...');
    
    const detailedReport = {
      metadata: {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        reportType: 'detailed',
        projectRoot: this.projectRoot
      },
      deployment: this.deploymentData,
      metrics: this.metrics,
      recommendations: this.recommendations,
      summary: this.createExecutiveSummary()
    };
    
    await fs.writeFile(this.reportFile, JSON.stringify(detailedReport, null, 2));
    
    console.log(`    ✅ Detailed report saved to: ${this.reportFile}`);
  }

  async createSummaryReport() {
    console.log('  📄 Creating summary report...');
    
    const summaryFile = this.reportFile.replace('.json', '-summary.json');
    
    const summaryReport = {
      metadata: {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        reportType: 'summary',
        projectRoot: this.projectRoot
      },
      summary: this.createExecutiveSummary(),
      keyMetrics: {
        duration: this.deploymentData.duration,
        errors: this.deploymentData.errors?.length || 0,
        warnings: this.deploymentData.warnings?.length || 0,
        qualityScore: this.metrics.quality?.qualityScore || 0,
        performanceGrade: this.metrics.performance?.performanceGrade || 'Unknown'
      },
      topRecommendations: this.recommendations
        .filter(r => r.priority === 'high')
        .slice(0, 3),
      status: this.metrics.deployment?.status || 'unknown'
    };
    
    await fs.writeFile(summaryFile, JSON.stringify(summaryReport, null, 2));
    
    console.log(`    ✅ Summary report saved to: ${summaryFile}`);
    
    // Also create a human-readable text summary
    await this.createTextSummary(summaryFile.replace('.json', '.txt'));
  }

  async createTextSummary(textFile) {
    const duration = this.formatDuration(this.deploymentData.duration);
    const errors = this.deploymentData.errors?.length || 0;
    const warnings = this.deploymentData.warnings?.length || 0;
    const status = errors === 0 ? 'SUCCESS' : 'FAILED';
    
    const textSummary = `
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║                    DEPLOYMENT SUMMARY REPORT                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

📊 EXECUTIVE SUMMARY
═══════════════════════════════════════════════════════════════
Status: ${status}
Duration: ${duration}
Quality Score: ${this.metrics.quality?.qualityScore || 0}/100
Performance Grade: ${this.metrics.performance?.performanceGrade || 'Unknown'}

📈 KEY METRICS
═══════════════════════════════════════════════════════════════
• Errors: ${errors}
• Warnings: ${warnings}
• Functions Deployed: ${this.metrics.quality?.functionCount || 0}
• Total Deployment Size: ${this.formatSize(this.metrics.resource?.totalDeploymentSize || 0)}
• Resource Efficiency: ${this.metrics.resource?.resourceEfficiency || 'Unknown'}

${this.recommendations.length > 0 ? `💡 TOP RECOMMENDATIONS
═══════════════════════════════════════════════════════════════
${this.recommendations
  .filter(r => r.priority === 'high')
  .slice(0, 3)
  .map((r, i) => `${i + 1}. ${r.title}\n   ${r.description}`)
  .join('\n\n')}` : ''}

📋 DETAILED RESULTS
═══════════════════════════════════════════════════════════════
Report Files:
• Detailed Report: ${this.reportFile}
• Summary Report: ${this.reportFile.replace('.json', '-summary.json')}
• Log File: ${this.logFile}

Generated: ${new Date().toLocaleString()}
Project: ${this.deploymentData.project?.projectId || 'Unknown'}
`;
    
    await fs.writeFile(textFile, textSummary);
    console.log(`    ✅ Text summary saved to: ${textFile}`);
  }

  createExecutiveSummary() {
    const duration = this.deploymentData.duration;
    const errors = this.deploymentData.errors?.length || 0;
    const warnings = this.deploymentData.warnings?.length || 0;
    const status = errors === 0 ? 'SUCCESS' : 'FAILED';
    
    return {
      status: status,
      duration: duration,
      durationFormatted: this.formatDuration(duration),
      errors: errors,
      warnings: warnings,
      qualityScore: this.metrics.quality?.qualityScore || 0,
      performanceGrade: this.metrics.performance?.performanceGrade || 'Unknown',
      reliability: this.metrics.deployment?.reliability || 0,
      resourceEfficiency: this.metrics.resource?.resourceEfficiency || 'Unknown',
      keyAchievements: this.getKeyAchievements(),
      criticalIssues: this.getCriticalIssues(),
      nextSteps: this.getNextSteps()
    };
  }

  getKeyAchievements() {
    const achievements = [];
    
    if (this.deploymentData.errors?.length === 0) {
      achievements.push('Zero deployment errors');
    }
    
    if (this.metrics.quality?.qualityScore >= 90) {
      achievements.push('High quality score achieved');
    }
    
    if (this.metrics.performance?.performanceGrade === 'Excellent') {
      achievements.push('Excellent deployment performance');
    }
    
    if (this.metrics.quality?.functionCount > 0) {
      achievements.push(`Successfully deployed ${this.metrics.quality.functionCount} functions`);
    }
    
    return achievements;
  }

  getCriticalIssues() {
    const issues = [];
    
    if (this.deploymentData.errors?.length > 0) {
      issues.push(`${this.deploymentData.errors.length} deployment errors occurred`);
    }
    
    if (this.metrics.quality?.qualityScore < 50) {
      issues.push('Low quality score indicates serious issues');
    }
    
    if (this.metrics.performance?.performanceGrade === 'Very Poor') {
      issues.push('Very poor deployment performance');
    }
    
    return issues;
  }

  getNextSteps() {
    const steps = [];
    
    if (this.deploymentData.errors?.length > 0) {
      steps.push('Review and fix deployment errors');
    }
    
    if (this.recommendations.filter(r => r.priority === 'high').length > 0) {
      steps.push('Address high-priority recommendations');
    }
    
    if (this.deploymentData.warnings?.length > 0) {
      steps.push('Review and resolve deployment warnings');
    }
    
    if (steps.length === 0) {
      steps.push('Monitor deployment health');
      steps.push('Plan for future optimizations');
    }
    
    return steps;
  }

  // Helper methods
  async getFunctionFiles(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isFile() && item.endsWith('.ts') && !item.endsWith('.test.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    
    return files;
  }

  async getAllFiles(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...await this.getAllFiles(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    
    return files;
  }

  async getFileSize(filePath) {
    try {
      const stat = await fs.stat(filePath);
      return stat.size;
    } catch (error) {
      return 0;
    }
  }

  async getTotalSize(files) {
    let totalSize = 0;
    
    for (const file of files) {
      totalSize += await this.getFileSize(file);
    }
    
    return totalSize;
  }

  formatDuration(seconds) {
    if (!seconds) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  formatSize(bytes) {
    if (!bytes) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

// Main execution
if (require.main === module) {
  const [,, projectRoot, logFile, reportFile] = process.argv;
  
  if (!projectRoot || !logFile || !reportFile) {
    console.error('Usage: node deployment-reporter.js <project-root> <log-file> <report-file>');
    process.exit(1);
  }
  
  const reporter = new DeploymentReporter(projectRoot, logFile, reportFile);
  
  reporter.generateReport().then(result => {
    console.log('\n📊 Report generation completed');
    console.log(`📄 Detailed report: ${result.reportFile}`);
    console.log(`📋 Summary report: ${result.summaryFile}`);
    process.exit(0);
  }).catch(error => {
    console.error('❌ Report generation failed:', error);
    process.exit(1);
  });
}

module.exports = DeploymentReporter;