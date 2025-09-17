import { ValidationResult } from '../models/ValidationReport.js';
import { PerformanceMetrics } from '../models/types.js';
import {
  PerformanceOptimization,
  FileSystemMetrics,
  MemoryMetrics,
  CpuMetrics,
  NetworkMetrics,
  BundleSizeMetrics,
  DependencyMetrics,
  PerformanceBottleneck,
  PerformanceProfile
} from '../types/performance.js';
import { RuleSeverity } from '../models/ComplianceRule.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';










export interface OptimizationOptions {
  analyzeFileSystem?: boolean;
  analyzeMemory?: boolean;
  analyzeCpu?: boolean;
  analyzeNetwork?: boolean;
  analyzeBundleSize?: boolean;
  analyzeDependencies?: boolean;
  includeTypes?: PerformanceBottleneck['type'][];
  excludeTypes?: PerformanceBottleneck['type'][];
  minSeverity?: PerformanceBottleneck['severity'];
  autoApplyOptimizations?: boolean;
  maxOptimizations?: number;
  timeout?: number;
}

export interface OptimizationResult {
  optimizationId: string;
  appliedOptimizations: Array<{
    optimization: PerformanceOptimization;
    status: 'success' | 'failed' | 'partial';
    details: string;
    metrics?: {
      before: any;
      after: any;
      improvement: string;
    };
  }>;
  summary: {
    totalOptimizations: number;
    successfulOptimizations: number;
    failedOptimizations: number;
    estimatedImprovement: string;
  };
  performanceMetrics: PerformanceMetrics;
}

export class PerformanceOptimizationService {
  private profileCache: Map<string, PerformanceProfile> = new Map();

  constructor() {}

  /**
   * Analyze module performance and identify optimization opportunities
   */
  async analyzePerformance(
    modulePath: string,
    options: OptimizationOptions = {}
  ): Promise<PerformanceProfile> {
    const startTime = Date.now();
    const profileId = `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Initialize metrics containers
      const metrics = {
        fileSystem: await this.analyzeFileSystem(modulePath, options),
        memory: await this.analyzeMemory(modulePath, options),
        cpu: await this.analyzeCpu(modulePath, options),
        network: await this.analyzeNetwork(modulePath, options),
        bundleSize: await this.analyzeBundleSize(modulePath, options),
        dependencies: await this.analyzeDependencies(modulePath, options)
      };

      // Identify bottlenecks
      const bottlenecks = this.identifyBottlenecks(metrics, options);

      // Generate optimizations
      const optimizations = this.generateOptimizations(bottlenecks, metrics);

      // Calculate performance score
      const score = this.calculatePerformanceScore(metrics, bottlenecks);

      // Note: recommendations are now embedded in the performance profile structure

      const profile: PerformanceProfile = {
        moduleId: profileId,
        timestamp: new Date(),
        metrics,
        bottlenecks,
        optimizations,
        performanceScore: score,
        metadata: {
          analysisVersion: '1.0.0',
          duration: Date.now() - startTime,
          options: options as any
        }
      };

      // Cache profile
      this.profileCache.set(profileId, profile);

      return profile;

    } catch (error) {
      throw new Error(`Performance analysis failed: ${error}`);
    }
  }

  /**
   * Apply performance optimizations
   */
  async applyOptimizations(
    profile: PerformanceProfile,
    modulePath: string,
    optimizationIds?: string[],
    options: { dryRun?: boolean; backup?: boolean } = {}
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const optimizationId = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Select optimizations to apply
      const optimizationsToApply = optimizationIds
        ? profile.optimizations.filter(opt => optimizationIds.includes(opt.id))
        : profile.optimizations.filter(opt => opt.autoApplicable);

      const appliedOptimizations = [];

      for (const optimization of optimizationsToApply) {
        const result = await this.applyOptimization(
          optimization,
          modulePath,
          options
        );
        appliedOptimizations.push(result);
      }

      // Calculate summary
      const summary = {
        totalOptimizations: optimizationsToApply.length,
        successfulOptimizations: appliedOptimizations.filter(r => r.status === 'success').length,
        failedOptimizations: appliedOptimizations.filter(r => r.status === 'failed').length,
        estimatedImprovement: this.calculateEstimatedImprovement(appliedOptimizations)
      };

      return {
        optimizationId,
        appliedOptimizations,
        summary,
        performanceMetrics: this.createPerformanceMetrics('optimization', startTime)
      };

    } catch (error) {
      throw new Error(`Failed to apply optimizations: ${error}`);
    }
  }

  /**
   * Analyze file system performance
   */
  private async analyzeFileSystem(
    modulePath: string,
    options: OptimizationOptions
  ): Promise<FileSystemMetrics> {
    if (options.analyzeFileSystem === false) {
      return this.getEmptyFileSystemMetrics();
    }

    try {
      const files = await this.getAllFiles(modulePath);
      let totalSize = 0;
      let largestFile = { path: '', size: 0 };
      const fileTypeDistribution: Record<string, { count: number; totalSize: number }> = {};
      const fileSizes: Record<string, number> = {};

      // Analyze each file
      for (const filePath of files) {
        try {
          const stats = await fs.stat(filePath);
          const size = stats.size;
          const ext = path.extname(filePath).toLowerCase() || 'no-extension';

          totalSize += size;
          fileSizes[filePath] = size;

          if (size > largestFile.size) {
            largestFile = { path: filePath, size };
          }

          if (!fileTypeDistribution[ext]) {
            fileTypeDistribution[ext] = { count: 0, totalSize: 0 };
          }
          fileTypeDistribution[ext].count++;
          fileTypeDistribution[ext].totalSize += size;

        } catch {
          // Skip files that can't be accessed
        }
      }

      // Note: duplicate and unused file analysis removed for canonical interface compliance

      return {
        totalFiles: files.length,
        totalSizeBytes: totalSize,
        averageFileSize: files.length > 0 ? totalSize / files.length : 0,
        largestFileSize: largestFile.size,
        fileTypes: Object.fromEntries(
          Object.entries(fileTypeDistribution).map(([ext, data]) => [ext, data.count])
        )
      };

    } catch (error) {
      return this.getEmptyFileSystemMetrics();
    }
  }

  /**
   * Analyze memory usage patterns
   */
  private async analyzeMemory(
    modulePath: string,
    options: OptimizationOptions
  ): Promise<MemoryMetrics> {
    if (options.analyzeMemory === false) {
      return this.getEmptyMemoryMetrics();
    }

    try {
      const codeFiles = await this.getCodeFiles(modulePath);
      let estimatedHeapUsage = 0;
      const largeObjects: Array<{ file: string; type: string; estimatedSize: number }> = [];
      const memoryLeakPatterns: Array<{ file: string; pattern: string; severity: string }> = [];
      let bufferUsage = 0;

      for (const filePath of codeFiles) {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const relativePath = path.relative(modulePath, filePath);

          // Analyze large object patterns
          const objectPatterns = this.findLargeObjectPatterns(content);
          largeObjects.push(...objectPatterns.map(p => ({
            file: relativePath,
            type: p.type,
            estimatedSize: p.estimatedSize
          })));

          // Analyze memory leak patterns
          const leakPatterns = this.findMemoryLeakPatterns(content);
          memoryLeakPatterns.push(...leakPatterns.map(p => ({
            file: relativePath,
            pattern: p.pattern,
            severity: p.severity
          })));

          // Estimate heap usage
          estimatedHeapUsage += this.estimateFileHeapUsage(content);

          // Analyze buffer usage
          bufferUsage += this.estimateBufferUsage(content);

        } catch {
          // Skip files that can't be read
        }
      }

      return {
        patterns: memoryLeakPatterns.map(p => p.pattern),
        potentialLeaks: memoryLeakPatterns.length,
        allocations: largeObjects.map(obj => ({
          type: obj.type,
          size: obj.estimatedSize,
          location: obj.file,
          frequency: 1
        }))
      };

    } catch (error) {
      return this.getEmptyMemoryMetrics();
    }
  }

  /**
   * Analyze CPU performance patterns
   */
  private async analyzeCpu(
    modulePath: string,
    options: OptimizationOptions
  ): Promise<CpuMetrics> {
    if (options.analyzeCpu === false) {
      return this.getEmptyCpuMetrics();
    }

    try {
      const codeFiles = await this.getCodeFiles(modulePath);
      let complexityScore = 0;
      const expensiveOperations: Array<{ file: string; operation: string; complexity: string }> = [];
      const syncOperations: Array<{ file: string; operation: string; recommendation: string }> = [];
      const loopComplexity: Array<{ file: string; loops: number; nestingLevel: number }> = [];

      for (const filePath of codeFiles) {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const relativePath = path.relative(modulePath, filePath);

          // Calculate cyclomatic complexity
          const fileComplexity = this.calculateCyclomaticComplexity(content);
          complexityScore += fileComplexity;

          // Find expensive operations
          const expensive = this.findExpensiveOperations(content);
          expensiveOperations.push(...expensive.map(op => ({
            file: relativePath,
            operation: op.operation,
            complexity: op.complexity
          })));

          // Find synchronous operations
          const sync = this.findSyncOperations(content);
          syncOperations.push(...sync.map(op => ({
            file: relativePath,
            operation: op.operation,
            recommendation: op.recommendation
          })));

          // Analyze loop complexity
          const loops = this.analyzeLoopComplexity(content);
          if (loops.loops > 0) {
            loopComplexity.push({
              file: relativePath,
              loops: loops.loops,
              nestingLevel: loops.nestingLevel
            });
          }

        } catch {
          // Skip files that can't be read
        }
      }

      return {
        patterns: expensiveOperations.map(op => op.operation),
        blockingOperations: syncOperations.length,
        complexity: loopComplexity.map(loop => ({
          type: 'loop',
          score: loop.nestingLevel,
          location: loop.file,
          description: `${loop.loops} loops with nesting level ${loop.nestingLevel}`
        }))
      };

    } catch (error) {
      return this.getEmptyCpuMetrics();
    }
  }

  /**
   * Analyze network performance patterns
   */
  private async analyzeNetwork(
    modulePath: string,
    options: OptimizationOptions
  ): Promise<NetworkMetrics> {
    if (options.analyzeNetwork === false) {
      return this.getEmptyNetworkMetrics();
    }

    try {
      const codeFiles = await this.getCodeFiles(modulePath);
      const httpRequests: Array<{ file: string; requests: number; concurrent: boolean }> = [];
      const databaseQueries: Array<{ file: string; queries: number; optimized: boolean }> = [];
      const apiCalls: Array<{ file: string; calls: number; cached: boolean }> = [];
      let webSocketConnections = 0;

      for (const filePath of codeFiles) {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const relativePath = path.relative(modulePath, filePath);

          // Analyze HTTP requests
          const http = this.analyzeHttpRequests(content);
          if (http.requests > 0) {
            httpRequests.push({
              file: relativePath,
              requests: http.requests,
              concurrent: http.concurrent
            });
          }

          // Analyze database queries
          const db = this.analyzeDatabaseQueries(content);
          if (db.queries > 0) {
            databaseQueries.push({
              file: relativePath,
              queries: db.queries,
              optimized: db.optimized
            });
          }

          // Analyze API calls
          const api = this.analyzeApiCalls(content);
          if (api.calls > 0) {
            apiCalls.push({
              file: relativePath,
              calls: api.calls,
              cached: api.cached
            });
          }

          // Count WebSocket connections
          webSocketConnections += this.countWebSocketConnections(content);

        } catch {
          // Skip files that can't be read
        }
      }

      return {
        requestCount: httpRequests.reduce((sum, req) => sum + req.requests, 0) + databaseQueries.reduce((sum, db) => sum + db.queries, 0),
        uniqueEndpoints: httpRequests.length + apiCalls.length,
        patterns: [
          ...httpRequests.map(req => `HTTP requests in ${req.file}`),
          ...databaseQueries.map(db => `Database queries in ${db.file}`),
          ...apiCalls.map(api => `API calls in ${api.file}`)
        ]
      };

    } catch (error) {
      return this.getEmptyNetworkMetrics();
    }
  }

  /**
   * Analyze bundle size and optimization opportunities
   */
  private async analyzeBundleSize(
    modulePath: string,
    options: OptimizationOptions
  ): Promise<BundleSizeMetrics> {
    if (options.analyzeBundleSize === false) {
      return this.getEmptyBundleSizeMetrics();
    }

    try {
      // Estimate bundle size from source files
      const sourceFiles = await this.getSourceFiles(modulePath);
      let totalBundleSize = 0;

      for (const filePath of sourceFiles) {
        try {
          const stats = await fs.stat(filePath);
          totalBundleSize += stats.size;
        } catch {
          // Skip files that can't be accessed
        }
      }

      // Estimate compression (typical 70% reduction)
      const compressedSize = Math.round(totalBundleSize * 0.3);

      // Analyze dependencies
      const largestDependencies = await this.analyzeLargestDependencies(modulePath);
      const unusedExports = await this.findUnusedExports(modulePath);
      const codeSplittingOpportunities = await this.findCodeSplittingOpportunities(modulePath);

      return {
        imports: sourceFiles.map(file => ({
          module: file,
          size: 0, // We'd need more sophisticated analysis for accurate sizes
          isDynamic: false,
          isExternal: false
        })),
        heavyImports: largestDependencies.slice(0, 5).map(dep => ({
          module: dep.name,
          size: dep.size,
          alternative: dep.treeshakeable ? `Tree-shakeable version of ${dep.name}` : 'None',
          impact: dep.size > 100000 ? 'high' : dep.size > 50000 ? 'medium' : 'low'
        })),
        bundleImpact: totalBundleSize
      };

    } catch (error) {
      return this.getEmptyBundleSizeMetrics();
    }
  }

  /**
   * Analyze dependency performance
   */
  private async analyzeDependencies(
    modulePath: string,
    options: OptimizationOptions
  ): Promise<DependencyMetrics> {
    if (options.analyzeDependencies === false) {
      return this.getEmptyDependencyMetrics();
    }

    try {
      const packageJsonPath = path.join(modulePath, 'package.json');
      const packageContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      const dependencies = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {}
      };

      const totalDependencies = Object.keys(dependencies).length;

      // Check for outdated dependencies
      const outdatedDependencies = await this.checkOutdatedDependencies(dependencies);

      // Identify heavy dependencies
      const heavyDependencies = await this.identifyHeavyDependencies(dependencies);

      // Find duplicate dependencies
      const duplicateDependencies = await this.findDuplicateDependencies(modulePath);

      // Find dev dependencies in production
      const devOnlyInProduction = this.findDevDependenciesInProduction(packageJson);

      return {
        totalDependencies,
        outdatedDependencies,
        heavyDependencies,
        duplicateDependencies,
        devOnlyInProduction
      };

    } catch (error) {
      return this.getEmptyDependencyMetrics();
    }
  }

  /**
   * Identify performance bottlenecks from metrics
   */
  private identifyBottlenecks(
    metrics: PerformanceProfile['metrics'],
    options: OptimizationOptions
  ): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];

    // File system bottlenecks
    if (metrics.fileSystem.largestFile.size > 1024 * 1024) { // > 1MB
      bottlenecks.push({
        id: `fs-large-file-${Date.now()}`,
        type: 'filesize',
        severity: 'high',
        title: 'Large File Detected',
        description: `File ${metrics.fileSystem.largestFile.path} is ${this.formatBytes(metrics.fileSystem.largestFile.size)}`,
        impact: 'Increases load time and memory usage',
        filePath: metrics.fileSystem.largestFile.path,
        metrics: { size: metrics.fileSystem.largestFile.size },
        estimatedImprovement: {
          performanceGain: '15-30%',
          sizeReduction: '50-70%'
        }
      });
    }

    // Memory bottlenecks
    if (metrics.memory.estimatedHeapUsage > 100 * 1024 * 1024) { // > 100MB
      bottlenecks.push({
        id: `mem-high-usage-${Date.now()}`,
        type: 'memory',
        severity: 'high',
        title: 'High Memory Usage',
        description: `Estimated heap usage: ${this.formatBytes(metrics.memory.estimatedHeapUsage)}`,
        impact: 'May cause memory pressure and garbage collection pauses',
        metrics: { heapUsage: metrics.memory.estimatedHeapUsage },
        estimatedImprovement: {
          performanceGain: '20-40%',
          timeReduction: '10-25%'
        }
      });
    }

    // CPU bottlenecks
    if (metrics.cpu.complexityScore > 15) {
      bottlenecks.push({
        id: `cpu-complexity-${Date.now()}`,
        type: 'complexity',
        severity: 'medium',
        title: 'High Code Complexity',
        description: `Average cyclomatic complexity: ${metrics.cpu.complexityScore}`,
        impact: 'Makes code harder to maintain and potentially slower to execute',
        metrics: { complexity: metrics.cpu.complexityScore },
        estimatedImprovement: {
          performanceGain: '10-20%',
          timeReduction: '5-15%'
        }
      });
    }

    // Bundle size bottlenecks
    if (metrics.bundleSize.totalBundleSize > 5 * 1024 * 1024) { // > 5MB
      bottlenecks.push({
        id: `bundle-large-${Date.now()}`,
        type: 'bundle',
        severity: 'high',
        title: 'Large Bundle Size',
        description: `Total bundle size: ${this.formatBytes(metrics.bundleSize.totalBundleSize)}`,
        impact: 'Increases initial load time and bandwidth usage',
        metrics: { bundleSize: metrics.bundleSize.totalBundleSize },
        estimatedImprovement: {
          performanceGain: '25-50%',
          sizeReduction: '30-60%'
        }
      });
    }

    // Dependency bottlenecks
    if (metrics.dependencies.heavyDependencies.length > 0) {
      bottlenecks.push({
        id: `dep-heavy-${Date.now()}`,
        type: 'dependency',
        severity: 'medium',
        title: 'Heavy Dependencies',
        description: `${metrics.dependencies.heavyDependencies.length} heavy dependencies found`,
        impact: 'Increases bundle size and load time',
        metrics: { heavyDeps: metrics.dependencies.heavyDependencies.length },
        estimatedImprovement: {
          performanceGain: '15-35%',
          sizeReduction: '20-40%'
        }
      });
    }

    return this.filterBottlenecks(bottlenecks, options);
  }

  /**
   * Generate performance optimizations
   */
  private generateOptimizations(
    bottlenecks: PerformanceBottleneck[],
    metrics: PerformanceProfile['metrics']
  ): PerformanceOptimization[] {
    const optimizations: PerformanceOptimization[] = [];

    bottlenecks.forEach(bottleneck => {
      switch (bottleneck.type) {
        case 'filesize':
          optimizations.push({
            id: `opt-${bottleneck.id}`,
            type: 'auto',
            priority: 'high',
            title: 'Split Large File',
            description: 'Break down large file into smaller, focused modules',
            implementation: 'Extract classes and functions into separate files',
            effort: 'medium',
            impact: 'high',
            autoApplicable: true,
            autoApplyRisk: 'medium',
            commands: ['umr auto-fix --rules=fileSize']
          });
          break;

        case 'memory':
          optimizations.push({
            id: `opt-${bottleneck.id}`,
            type: 'manual',
            priority: 'high',
            title: 'Optimize Memory Usage',
            description: 'Implement memory optimization techniques',
            implementation: 'Use object pooling, weak references, and efficient data structures',
            effort: 'high',
            impact: 'high',
            autoApplicable: false,
            autoApplyRisk: 'high'
          });
          break;

        case 'bundle':
          optimizations.push({
            id: `opt-${bottleneck.id}`,
            type: 'configuration',
            priority: 'high',
            title: 'Enable Code Splitting',
            description: 'Implement dynamic imports and lazy loading',
            implementation: 'Configure webpack code splitting and dynamic imports',
            effort: 'medium',
            impact: 'high',
            autoApplicable: true,
            autoApplyRisk: 'low',
            configChanges: {
              'webpack.config.js': {
                optimization: {
                  splitChunks: {
                    chunks: 'all',
                    cacheGroups: {
                      vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all'
                      }
                    }
                  }
                }
              }
            }
          });
          break;

        case 'dependency':
          optimizations.push({
            id: `opt-${bottleneck.id}`,
            type: 'auto',
            priority: 'medium',
            title: 'Replace Heavy Dependencies',
            description: 'Replace heavy dependencies with lighter alternatives',
            implementation: 'Replace with smaller, equivalent libraries',
            effort: 'medium',
            impact: 'medium',
            autoApplicable: false,
            autoApplyRisk: 'medium'
          });
          break;

        case 'complexity':
          optimizations.push({
            id: `opt-${bottleneck.id}`,
            type: 'manual',
            priority: 'medium',
            title: 'Reduce Code Complexity',
            description: 'Refactor complex functions and improve code structure',
            implementation: 'Break down complex functions, reduce nesting, improve readability',
            effort: 'high',
            impact: 'medium',
            autoApplicable: false,
            autoApplyRisk: 'high'
          });
          break;
      }
    });

    // Add general optimizations
    if (metrics.dependencies.outdatedDependencies.length > 0) {
      optimizations.push({
        id: `opt-update-deps-${Date.now()}`,
        type: 'auto',
        priority: 'medium',
        title: 'Update Dependencies',
        description: 'Update outdated dependencies to latest versions',
        implementation: 'Update package.json and run npm update',
        effort: 'low',
        impact: 'medium',
        autoApplicable: true,
        autoApplyRisk: 'low',
        commands: ['npm update', 'npm audit fix']
      });
    }

    return optimizations;
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(
    metrics: PerformanceProfile['metrics'],
    bottlenecks: PerformanceBottleneck[]
  ): number {
    let score = 100;

    // Deduct points for bottlenecks
    bottlenecks.forEach(bottleneck => {
      switch (bottleneck.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    });

    // Additional scoring based on metrics
    if (metrics.fileSystem.averageFileSize > 50 * 1024) score -= 5; // Large average file size
    if (metrics.cpu.complexityScore > 10) score -= 5; // High complexity
    if (metrics.dependencies.totalDependencies > 100) score -= 5; // Too many dependencies
    if (metrics.bundleSize.totalBundleSize > 2 * 1024 * 1024) score -= 10; // Large bundle

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    bottlenecks: PerformanceBottleneck[],
    optimizations: PerformanceOptimization[]
  ): string[] {
    const recommendations = new Set<string>();

    // Priority recommendations based on bottlenecks
    const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical');
    const highBottlenecks = bottlenecks.filter(b => b.severity === 'high');

    if (criticalBottlenecks.length > 0) {
      recommendations.add('Address critical performance issues immediately - they severely impact user experience');
    }

    if (highBottlenecks.length > 0) {
      recommendations.add('Focus on high-severity bottlenecks first for maximum performance improvement');
    }

    // Type-specific recommendations
    const types = new Set(bottlenecks.map(b => b.type));

    if (types.has('filesize')) {
      recommendations.add('Break down large files into smaller, focused modules for better maintainability');
    }

    if (types.has('memory')) {
      recommendations.add('Implement memory optimization techniques like object pooling and efficient data structures');
    }

    if (types.has('bundle')) {
      recommendations.add('Enable code splitting and lazy loading to reduce initial bundle size');
    }

    if (types.has('dependency')) {
      recommendations.add('Audit dependencies regularly and replace heavy ones with lighter alternatives');
    }

    if (types.has('complexity')) {
      recommendations.add('Refactor complex code to improve readability and maintainability');
    }

    // Auto-fix recommendations
    const autoFixable = optimizations.filter(o => o.autoApplicable);
    if (autoFixable.length > 0) {
      recommendations.add(`${autoFixable.length} optimizations can be applied automatically - consider using auto-fix`);
    }

    // General best practices
    if (bottlenecks.length > 5) {
      recommendations.add('Implement a performance monitoring strategy to track improvements over time');
    }

    recommendations.add('Set up performance budgets to prevent regression');
    recommendations.add('Consider implementing performance testing in your CI/CD pipeline');

    return Array.from(recommendations);
  }

  // Helper methods for analysis

  private async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    async function scan(dir: string) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory() && !shouldSkipDirectory(entry.name)) {
            await scan(fullPath);
          } else if (entry.isFile()) {
            files.push(fullPath);
          }
        }
      } catch {
        // Permission denied or other error
      }
    }

    function shouldSkipDirectory(dirName: string): boolean {
      const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage'];
      return skipDirs.includes(dirName);
    }

    await scan(dirPath);
    return files;
  }

  private async getCodeFiles(modulePath: string): Promise<string[]> {
    const allFiles = await this.getAllFiles(modulePath);
    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.php', '.rb', '.go', '.rs'];

    return allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return codeExtensions.includes(ext);
    });
  }

  private async getSourceFiles(modulePath: string): Promise<string[]> {
    const allFiles = await this.getAllFiles(modulePath);
    const sourceExtensions = ['.js', '.ts', '.jsx', '.tsx', '.css', '.scss', '.less', '.json'];

    return allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return sourceExtensions.includes(ext) && !file.includes('node_modules');
    });
  }

  // Placeholder implementations for analysis methods
  private async findDuplicateFiles(fileSizes: Record<string, number>): Promise<Array<{ paths: string[]; size: number }>> {
    // Implementation would compare file hashes to find duplicates
    return [];
  }

  private async findUnusedFiles(modulePath: string, files: string[]): Promise<string[]> {
    // Implementation would analyze import/require statements to find unused files
    return [];
  }

  private findLargeObjectPatterns(content: string): Array<{ type: string; estimatedSize: number }> {
    const patterns = [];

    // Look for large arrays
    const arrayMatches = content.match(/\[[\s\S]{1000,}\]/g);
    if (arrayMatches) {
      arrayMatches.forEach(match => {
        patterns.push({
          type: 'large-array',
          estimatedSize: match.length * 2 // Rough estimate
        });
      });
    }

    return patterns;
  }

  private findMemoryLeakPatterns(content: string): Array<{ pattern: string; severity: string }> {
    const patterns = [];

    // Check for event listeners without cleanup
    if (content.includes('addEventListener') && !content.includes('removeEventListener')) {
      patterns.push({
        pattern: 'Event listeners without cleanup',
        severity: 'medium'
      });
    }

    // Check for setInterval without clearInterval
    if (content.includes('setInterval') && !content.includes('clearInterval')) {
      patterns.push({
        pattern: 'setInterval without clearInterval',
        severity: 'high'
      });
    }

    return patterns;
  }

  private estimateFileHeapUsage(content: string): number {
    // Simple estimation based on content length and complexity
    return content.length * 2; // 2 bytes per character as rough estimate
  }

  private estimateBufferUsage(content: string): number {
    const bufferMatches = content.match(/Buffer\./g);
    return bufferMatches ? bufferMatches.length * 1024 : 0; // Estimate 1KB per buffer usage
  }

  private calculateCyclomaticComplexity(content: string): number {
    // Simple complexity calculation based on control flow statements
    const patterns = [
      /\bif\b/g,
      /\belse\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\b\?\s*:/g // ternary operator
    ];

    let complexity = 1; // Base complexity

    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  private findExpensiveOperations(content: string): Array<{ operation: string; complexity: string }> {
    const operations = [];

    // Look for nested loops
    if (content.match(/for\s*\([^}]*for\s*\(/)) {
      operations.push({
        operation: 'Nested loops',
        complexity: 'O(n²) or higher'
      });
    }

    // Look for recursive functions
    if (content.match(/function\s+(\w+)[^}]*\1\s*\(/)) {
      operations.push({
        operation: 'Recursive function',
        complexity: 'Potentially exponential'
      });
    }

    return operations;
  }

  private findSyncOperations(content: string): Array<{ operation: string; recommendation: string }> {
    const operations = [];

    if (content.includes('fs.readFileSync')) {
      operations.push({
        operation: 'Synchronous file read',
        recommendation: 'Use fs.readFile or fs.promises.readFile'
      });
    }

    if (content.includes('JSON.parse') && content.includes('JSON.stringify')) {
      operations.push({
        operation: 'Large JSON operations',
        recommendation: 'Consider streaming JSON for large datasets'
      });
    }

    return operations;
  }

  private analyzeLoopComplexity(content: string): { loops: number; nestingLevel: number } {
    const forLoops = (content.match(/\bfor\b/g) || []).length;
    const whileLoops = (content.match(/\bwhile\b/g) || []).length;
    const loops = forLoops + whileLoops;

    // Simple nesting level calculation
    let maxNesting = 0;
    let currentNesting = 0;

    for (let i = 0; i < content.length; i++) {
      if (content.substr(i, 3) === 'for' || content.substr(i, 5) === 'while') {
        currentNesting++;
        maxNesting = Math.max(maxNesting, currentNesting);
      } else if (content[i] === '}') {
        currentNesting = Math.max(0, currentNesting - 1);
      }
    }

    return { loops, nestingLevel: maxNesting };
  }

  private analyzeHttpRequests(content: string): { requests: number; concurrent: boolean } {
    const httpMatches = content.match(/(fetch|axios|http\.get|http\.post|XMLHttpRequest)/g);
    const requests = httpMatches ? httpMatches.length : 0;
    const concurrent = content.includes('Promise.all') || content.includes('Promise.allSettled');

    return { requests, concurrent };
  }

  private analyzeDatabaseQueries(content: string): { queries: number; optimized: boolean } {
    const queryMatches = content.match(/(SELECT|INSERT|UPDATE|DELETE|query|find|findOne)/gi);
    const queries = queryMatches ? queryMatches.length : 0;
    const optimized = content.includes('LIMIT') || content.includes('INDEX') || content.includes('cache');

    return { queries, optimized };
  }

  private analyzeApiCalls(content: string): { calls: number; cached: boolean } {
    const apiMatches = content.match(/(api\.|\/api\/|fetch.*api|axios.*api)/gi);
    const calls = apiMatches ? apiMatches.length : 0;
    const cached = content.includes('cache') || content.includes('localStorage') || content.includes('sessionStorage');

    return { calls, cached };
  }

  private countWebSocketConnections(content: string): number {
    const wsMatches = content.match(/(WebSocket|socket\.io|ws:\/\/|wss:\/\/)/g);
    return wsMatches ? wsMatches.length : 0;
  }

  // Empty metrics generators
  private getEmptyFileSystemMetrics(): FileSystemMetrics {
    return {
      totalFiles: 0,
      totalSizeBytes: 0,
      averageFileSize: 0,
      largestFileSize: 0,
      fileTypes: {}
    };
  }

  private getEmptyMemoryMetrics(): MemoryMetrics {
    return {
      patterns: [],
      potentialLeaks: 0,
      allocations: []
    };
  }

  private getEmptyCpuMetrics(): CpuMetrics {
    return {
      patterns: [],
      blockingOperations: 0,
      complexity: []
    };
  }

  private getEmptyNetworkMetrics(): NetworkMetrics {
    return {
      requestCount: 0,
      uniqueEndpoints: 0,
      patterns: []
    };
  }

  private getEmptyBundleSizeMetrics(): BundleSizeMetrics {
    return {
      imports: [],
      heavyImports: [],
      bundleImpact: 0
    };
  }

  private getEmptyDependencyMetrics(): DependencyMetrics {
    return {
      totalDependencies: 0,
      outdatedDependencies: [],
      heavyDependencies: [],
      duplicateDependencies: [],
      devOnlyInProduction: []
    };
  }

  // Additional helper methods
  private async analyzeLargestDependencies(modulePath: string): Promise<Array<{ name: string; size: number; treeshakeable: boolean }>> {
    // Implementation would analyze node_modules sizes
    return [];
  }

  private async findUnusedExports(modulePath: string): Promise<Array<{ file: string; exports: string[] }>> {
    // Implementation would analyze export usage
    return [];
  }

  private async findCodeSplittingOpportunities(modulePath: string): Promise<Array<{ module: string; size: number; lazy: boolean }>> {
    // Implementation would identify large modules that could be lazy-loaded
    return [];
  }

  private async checkOutdatedDependencies(dependencies: Record<string, string>): Promise<Array<{ name: string; current: string; latest: string; impact: string }>> {
    // Implementation would check npm registry for latest versions
    return [];
  }

  private async identifyHeavyDependencies(dependencies: Record<string, string>): Promise<Array<{ name: string; size: number; alternatives: string[] }>> {
    // Implementation would analyze dependency sizes
    return [];
  }

  private async findDuplicateDependencies(modulePath: string): Promise<Array<{ name: string; versions: string[] }>> {
    // Implementation would check for duplicate dependencies in node_modules
    return [];
  }

  private findDevDependenciesInProduction(packageJson: any): string[] {
    // Implementation would analyze if dev dependencies are used in production code
    return [];
  }

  private filterBottlenecks(bottlenecks: PerformanceBottleneck[], options: OptimizationOptions): PerformanceBottleneck[] {
    let filtered = bottlenecks;

    if (options.includeTypes && options.includeTypes.length > 0) {
      filtered = filtered.filter(b => options.includeTypes!.includes(b.type));
    }

    if (options.excludeTypes && options.excludeTypes.length > 0) {
      filtered = filtered.filter(b => !options.excludeTypes!.includes(b.type));
    }

    if (options.minSeverity) {
      const severityOrder = ['low', 'medium', 'high', 'critical'];
      const minIndex = severityOrder.indexOf(options.minSeverity);
      filtered = filtered.filter(b => {
        const bIndex = severityOrder.indexOf(b.severity);
        return bIndex >= minIndex;
      });
    }

    return filtered;
  }

  private async applyOptimization(
    optimization: PerformanceOptimization,
    modulePath: string,
    options: { dryRun?: boolean; backup?: boolean }
  ): Promise<{
    optimization: PerformanceOptimization;
    status: 'success' | 'failed' | 'partial';
    details: string;
  }> {
    if (options.dryRun) {
      return {
        optimization,
        status: 'success',
        details: 'Dry run - optimization would be applied'
      };
    }

    try {
      if (optimization.commands) {
        // Execute commands
        for (const command of optimization.commands) {
          await this.executeCommand(command, modulePath);
        }
      }

      if (optimization.configChanges) {
        // Apply configuration changes
        for (const [filePath, changes] of Object.entries(optimization.configChanges)) {
          await this.applyConfigChanges(path.join(modulePath, filePath), changes);
        }
      }

      return {
        optimization,
        status: 'success',
        details: 'Optimization applied successfully'
      };

    } catch (error) {
      return {
        optimization,
        status: 'failed',
        details: `Failed to apply optimization: ${error}`
      };
    }
  }

  private async executeCommand(command: string, cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], { cwd });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }

  private async applyConfigChanges(filePath: string, changes: any): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const config = JSON.parse(content);

      // Merge changes (simplified - would need more sophisticated merging)
      Object.assign(config, changes);

      await fs.writeFile(filePath, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new Error(`Failed to apply config changes to ${filePath}: ${error}`);
    }
  }

  private calculateEstimatedImprovement(appliedOptimizations: any[]): string {
    const successfulOpts = appliedOptimizations.filter(o => o.status === 'success');

    if (successfulOpts.length === 0) {
      return '0%';
    }

    // Simple estimation based on number of optimizations
    const baseImprovement = successfulOpts.length * 10; // 10% per optimization
    return `${Math.min(80, baseImprovement)}%`; // Cap at 80%
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private createPerformanceMetrics(operation: string, startTime: number): PerformanceMetrics {
    const endTime = Date.now();
    return {
      operation,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration: endTime - startTime,
      customMetrics: {}
    };
  }

  /**
   * Generate ValidationResult for integration with validation system
   */
  generateValidationResults(bottlenecks: PerformanceBottleneck[]): ValidationResult[] {
    return bottlenecks.map((bottleneck, index) => ({
      resultId: `perf-result-${Date.now()}-${index}`,
      ruleId: `performance-${bottleneck.type}`,
      ruleName: `Performance: ${bottleneck.type}`,
      status: 'FAIL' as const,
      severity: bottleneck.severity,
      message: bottleneck.title,
      details: {
        description: bottleneck.description,
        impact: bottleneck.impact,
        filePath: bottleneck.filePath,
        metrics: bottleneck.metrics,
        estimatedImprovement: bottleneck.estimatedImprovement
      },
      remediation: `Address ${bottleneck.type} performance issue to improve overall performance`,
      canAutoFix: false,
      executionTime: 0
    }));
  }
}