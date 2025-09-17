/**
 * Performance Types
 *
 * Types for performance analysis and optimization
 */

export interface PerformanceProfile {
  /** Module identifier */
  moduleId: string;
  /** Analysis timestamp */
  timestamp: Date;
  /** Performance metrics */
  metrics: PerformanceMetrics;
  /** Identified bottlenecks */
  bottlenecks: PerformanceBottleneck[];
  /** Optimization recommendations */
  optimizations: PerformanceOptimization[];
  /** Overall performance score (0-100) */
  performanceScore: number;
  /** Performance analysis metadata */
  metadata: {
    analysisVersion: string;
    duration: number;
    options: OptimizationOptions;
  };
}

export interface PerformanceMetrics {
  /** File system metrics */
  fileSystem: FileSystemMetrics;
  /** Memory usage metrics */
  memory: MemoryMetrics;
  /** CPU usage metrics */
  cpu: CpuMetrics;
  /** Network metrics */
  network: NetworkMetrics;
  /** Bundle size metrics */
  bundleSize: BundleSizeMetrics;
  /** Dependency metrics */
  dependencies: DependencyMetrics;
}

export interface FileSystemMetrics {
  /** Total number of files */
  totalFiles: number;
  /** Total size in bytes */
  totalSizeBytes: number;
  /** Average file size */
  averageFileSize: number;
  /** Largest file size */
  largestFileSize: number;
  /** File type distribution */
  fileTypes: Record<string, number>;
}

export interface MemoryMetrics {
  /** Memory usage patterns found */
  patterns: string[];
  /** Potential memory leaks detected */
  potentialLeaks: number;
  /** Memory allocation patterns */
  allocations: MemoryAllocation[];
}

export interface MemoryAllocation {
  /** Allocation type */
  type: string;
  /** Allocation size estimate */
  size: number;
  /** File location */
  location: string;
}

export interface CpuMetrics {
  /** CPU intensive patterns found */
  patterns: string[];
  /** Blocking operations detected */
  blockingOperations: number;
  /** Computational complexity indicators */
  complexity: ComplexityIndicator[];
}

export interface ComplexityIndicator {
  /** Complexity type */
  type: string;
  /** Complexity score */
  score: number;
  /** File location */
  location: string;
}

export interface NetworkMetrics {
  /** Total network requests detected */
  requestCount: number;
  /** Unique endpoints */
  uniqueEndpoints: number;
  /** Network patterns */
  patterns: string[];
}

export interface BundleSizeMetrics {
  /** Import statements found */
  imports: Import[];
  /** Heavy imports identified */
  heavyImports: HeavyImport[];
  /** Estimated bundle impact */
  bundleImpact: number;
}

export interface Import {
  /** Import statement */
  statement: string;
  /** Imported module */
  module: string;
  /** File location */
  file: string;
}

export interface HeavyImport {
  /** Module name */
  module: string;
  /** Estimated size impact */
  estimatedSize: number;
  /** Usage pattern */
  usage: string;
}

export interface DependencyMetrics {
  /** Total dependencies */
  totalDependencies: number;
  /** Heavy dependencies */
  heavyDependencies: HeavyDependency[];
  /** Outdated dependencies */
  outdatedDependencies: OutdatedDependency[];
  /** Dependency tree depth */
  treeDepth: number;
}

export interface HeavyDependency {
  /** Package name */
  name: string;
  /** Package size */
  size: number;
  /** Usage frequency */
  usage: number;
}

export interface OutdatedDependency {
  /** Package name */
  name: string;
  /** Current version */
  currentVersion: string;
  /** Latest version */
  latestVersion: string;
  /** Security vulnerabilities */
  vulnerabilities: number;
}

export interface PerformanceBottleneck {
  /** Bottleneck identifier */
  id: string;
  /** Bottleneck type */
  type: string;
  /** Bottleneck description */
  description: string;
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Impact percentage */
  impact: number;
  /** File location */
  file?: string;
  /** Line number */
  line?: number;
  /** Metrics associated */
  metrics: Record<string, number>;
}

export interface PerformanceOptimization {
  /** Optimization identifier */
  id: string;
  /** Optimization category */
  category: string;
  /** Optimization title */
  title: string;
  /** Optimization description */
  description: string;
  /** Impact level */
  impact: 'low' | 'medium' | 'high';
  /** Implementation effort */
  effort: 'low' | 'medium' | 'high';
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high';
  /** Can be auto-applied */
  autoApplicable: boolean;
  /** Estimated savings */
  estimatedSavings: {
    fileSizeReduction?: string;
    performanceGain?: string;
    memoryReduction?: string;
  };
  /** Implementation details */
  implementation: {
    strategy: string;
    targetFiles: string[];
    changes: string[];
  };
}

export interface OptimizationOptions {
  /** Optimization level */
  level?: OptimizationLevel;
  /** Categories to analyze */
  categories?: string[];
  /** Include external dependencies */
  includeExternal?: boolean;
  /** Maximum file size to analyze */
  maxFileSize?: number;
  /** Patterns to exclude */
  excludePatterns?: string[];
}

export type OptimizationLevel = 'conservative' | 'balanced' | 'aggressive';

export interface OptimizationResult {
  /** Optimization that was applied */
  optimization: PerformanceOptimization;
  /** Application status */
  status: 'success' | 'failed' | 'partial';
  /** Result details */
  details: string;
}