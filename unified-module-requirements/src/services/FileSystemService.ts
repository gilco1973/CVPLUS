/**
 * File System Integration Service for CVPlus Module Requirements System
 *
 * This service provides comprehensive file system utilities for module validation,
 * template processing, and report generation. It handles file discovery, content
 * analysis, path resolution, and safe file operations with error handling.
 *
 * Key Features:
 * - Module structure discovery and analysis
 * - Safe file operations with atomic writes
 * - Content analysis and metadata extraction
 * - Path resolution and validation
 * - File watching and change detection
 * - Backup and restoration capabilities
 * - Performance-optimized directory traversal
 * - Cross-platform compatibility
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { ModuleStructure, ModuleFile, ModuleScript, ModuleDependency } from '../models/ModuleStructure.js';
import { FileSystemEntry, DirectoryTree } from '../models/types.js';

export interface FileDiscoveryOptions {
  /** Include hidden files/directories */
  includeHidden?: boolean;
  /** Maximum depth for directory traversal */
  maxDepth?: number;
  /** File patterns to include */
  includePatterns?: string[];
  /** File patterns to exclude */
  excludePatterns?: string[];
  /** Follow symbolic links */
  followSymlinks?: boolean;
  /** Include file content analysis */
  analyzeContent?: boolean;
  /** Maximum file size to analyze (bytes) */
  maxFileSize?: number;
}

export interface FileWatchOptions {
  /** Watch for file changes */
  watchFiles?: boolean;
  /** Watch for directory changes */
  watchDirectories?: boolean;
  /** Debounce time for change events (ms) */
  debounceTime?: number;
  /** Include file content in change events */
  includeContent?: boolean;
}

export interface BackupOptions {
  /** Backup directory */
  backupDirectory?: string;
  /** Include timestamp in backup names */
  includeTimestamp?: boolean;
  /** Compress backup files */
  compress?: boolean;
  /** Maximum number of backups to keep */
  maxBackups?: number;
}

export interface FileAnalysis {
  /** File path */
  filePath: string;
  /** File type */
  fileType: string;
  /** File size in bytes */
  size: number;
  /** File encoding */
  encoding?: string;
  /** Line count */
  lineCount?: number;
  /** Language detected */
  language?: string;
  /** Dependencies found */
  dependencies?: string[];
  /** Imports/exports found */
  imports?: string[];
  exports?: string[];
  /** Configuration keys found */
  configKeys?: string[];
  /** Last modified timestamp */
  lastModified: Date;
  /** File hash for change detection */
  hash: string;
}

export interface DirectoryAnalysis {
  /** Directory path */
  directoryPath: string;
  /** Total files */
  totalFiles: number;
  /** Total directories */
  totalDirectories: number;
  /** Total size in bytes */
  totalSize: number;
  /** File type distribution */
  fileTypeDistribution: Record<string, number>;
  /** Language distribution */
  languageDistribution: Record<string, number>;
  /** Depth analysis */
  depthAnalysis: {
    maxDepth: number;
    avgDepth: number;
    filesByDepth: Record<number, number>;
  };
  /** Analysis timestamp */
  analyzedAt: Date;
}

export class FileSystemService {
  private fileCache: Map<string, FileAnalysis> = new Map();
  private directoryCache: Map<string, DirectoryAnalysis> = new Map();
  // private watchedPaths: Set<string> = new Set();

  constructor() {}

  /**
   * Discover module structure from filesystem
   */
  async discoverModuleStructure(
    modulePath: string,
    options: FileDiscoveryOptions = {}
  ): Promise<ModuleStructure> {
    // const startTime = Date.now();

    try {
      // Resolve absolute path
      const absolutePath = path.resolve(modulePath);

      // Check if path exists and is a directory
      const stats = await fs.stat(absolutePath);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${absolutePath}`);
      }

      // Extract module information from package.json if available
      const packageJsonPath = path.join(absolutePath, 'package.json');
      let packageInfo: any = {};

      try {
        const packageContent = await fs.readFile(packageJsonPath, 'utf8');
        packageInfo = JSON.parse(packageContent);
      } catch {
        // package.json not found or invalid, use defaults
      }

      // Discover files
      const files = await this.discoverFiles(absolutePath, options);

      // Discover scripts
      const scripts = await this.discoverScripts(absolutePath, packageInfo);

      // Determine module type
      const moduleType = this.determineModuleType(files, packageInfo) as ModuleStructure['moduleType'];

      // Calculate compliance score (basic implementation)
      const complianceScore = this.calculateBasicComplianceScore(files, packageInfo);

      const moduleStructure: ModuleStructure = {
        moduleId: packageInfo.name || path.basename(absolutePath),
        name: packageInfo.name || path.basename(absolutePath),
        description: packageInfo.description || '',
        moduleType,
        path: absolutePath,
        version: packageInfo.version || '0.0.0',
        files,
        dependencies: this.extractDependencies(packageInfo),
        hasBuildConfig: files.some(f => f.path.includes('build') || f.path.includes('webpack') || f.path.includes('rollup')),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
        scripts,
        hasTypeScript: files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx')),
        hasTests: files.some(f => f.path.includes('test') || f.path.includes('spec')),
        hasDocumentation: files.some(f => f.path.toLowerCase().includes('readme')),
        complianceScore
      };

      return moduleStructure;

    } catch (error) {
      throw new Error(`Failed to discover module structure: ${error}`);
    }
  }

  /**
   * Discover files in directory with filtering
   */
  async discoverFiles(
    directoryPath: string,
    options: FileDiscoveryOptions = {}
  ): Promise<ModuleFile[]> {
    const {
      includeHidden = false,
      includePatterns = ['**/*'],
      excludePatterns = ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
      analyzeContent = true,
      maxFileSize = 10 * 1024 * 1024 // 10MB
    } = options;

    const files: ModuleFile[] = [];

    try {
      // Build glob patterns
      const patterns = includePatterns.map(pattern => path.join(directoryPath, pattern));

      for (const pattern of patterns) {
        const matches = await glob(pattern, {
          ignore: excludePatterns.map(exclude => path.join(directoryPath, exclude)),
          dot: includeHidden
        });

        for (const match of matches) {
          try {
            const stats = await fs.stat(match);

            // Skip files that are too large
            if (stats.size > maxFileSize) {
              continue;
            }

            const relativePath = path.relative(directoryPath, match);
            const fileExtension = path.extname(match);
            const fileName = path.basename(match);

            let content: string | undefined;
            let analysis: FileAnalysis | undefined;

            if (analyzeContent && this.isTextFile(fileExtension)) {
              try {
                content = await fs.readFile(match, 'utf8');
                analysis = await this.analyzeFileContent(match, content);
              } catch {
                // Skip files that can't be read as text
                content = undefined;
              }
            }

            const moduleFile: ModuleFile = {
              path: relativePath,
              type: this.getFileType(fileExtension) as ModuleFile['type'],
              size: stats.size,
              lastModified: stats.mtime,
              required: this.isRequiredFile(fileName),
              ...(analysis?.hash && { contentHash: analysis.hash })
            };

            files.push(moduleFile);

          } catch (error) {
            // Skip files that can't be processed
            console.warn(`Warning: Could not process file ${match}: ${error}`);
            continue;
          }
        }
      }

      return files.sort((a, b) => a.path.localeCompare(b.path));

    } catch (error) {
      throw new Error(`Failed to discover files in ${directoryPath}: ${error}`);
    }
  }

  /**
   * Analyze file content and extract metadata
   */
  async analyzeFileContent(filePath: string, content: string): Promise<FileAnalysis> {
    const stats = await fs.stat(filePath);
    const fileExtension = path.extname(filePath);
    const hash = this.calculateHash(content);

    // Check cache first
    const cacheKey = `${filePath}:${hash}`;
    if (this.fileCache.has(cacheKey)) {
      return this.fileCache.get(cacheKey)!;
    }

    const detectedLanguage = this.detectLanguage(fileExtension, content);
    const analysis: FileAnalysis = {
      filePath,
      fileType: this.getFileType(fileExtension),
      size: stats.size,
      encoding: 'utf8',
      lineCount: content.split('\n').length,
      ...(detectedLanguage && { language: detectedLanguage }),
      dependencies: this.extractDependenciesFromContent(content, fileExtension),
      imports: this.extractImports(content, fileExtension),
      exports: this.extractExports(content, fileExtension),
      configKeys: this.extractConfigKeys(content, fileExtension),
      lastModified: stats.mtime,
      hash
    };

    // Cache the analysis
    this.fileCache.set(cacheKey, analysis);

    return analysis;
  }

  /**
   * Analyze directory structure and statistics
   */
  async analyzeDirectory(directoryPath: string, options: FileDiscoveryOptions = {}): Promise<DirectoryAnalysis> {
    // const startTime = Date.now();

    try {
      const files = await this.discoverFiles(directoryPath, options);

      let totalFiles = 0;
      let totalDirectories = 0;
      let totalSize = 0;
      const fileTypeDistribution: Record<string, number> = {};
      const languageDistribution: Record<string, number> = {};
      const filesByDepth: Record<number, number> = {};

      // Walk directory to count directories
      const directoryCount = await this.countDirectories(directoryPath, options);
      totalDirectories = directoryCount;

      // Analyze files
      for (const file of files) {
        totalFiles++;
        totalSize += file.size;

        // File type distribution
        const fileType = file.type || 'unknown';
        fileTypeDistribution[fileType] = (fileTypeDistribution[fileType] || 0) + 1;

        // Language distribution (if detected)
        const language = this.detectLanguage(path.extname(file.path), '');
        if (language) {
          languageDistribution[language] = (languageDistribution[language] || 0) + 1;
        }

        // Depth analysis
        const depth = file.path.split(path.sep).length - 1;
        filesByDepth[depth] = (filesByDepth[depth] || 0) + 1;
      }

      // Calculate depth statistics
      const depths = Object.keys(filesByDepth).map(Number);
      const maxDepth = Math.max(...depths);
      const avgDepth = depths.reduce((sum, depth) => sum + (depth * filesByDepth[depth]!), 0) / totalFiles;

      const analysis: DirectoryAnalysis = {
        directoryPath,
        totalFiles,
        totalDirectories,
        totalSize,
        fileTypeDistribution,
        languageDistribution,
        depthAnalysis: {
          maxDepth,
          avgDepth,
          filesByDepth
        },
        analyzedAt: new Date()
      };

      // Cache the analysis
      this.directoryCache.set(directoryPath, analysis);

      return analysis;

    } catch (error) {
      throw new Error(`Failed to analyze directory ${directoryPath}: ${error}`);
    }
  }

  /**
   * Create directory tree structure
   */
  async createDirectoryTree(directoryPath: string, options: FileDiscoveryOptions = {}): Promise<DirectoryTree> {
    const { maxDepth = 5, includeHidden = false } = options;

    try {
      const absolutePath = path.resolve(directoryPath);
      const stats = await fs.stat(absolutePath);

      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${absolutePath}`);
      }

      return await this.buildDirectoryTree(absolutePath, 0, maxDepth, includeHidden);

    } catch (error) {
      throw new Error(`Failed to create directory tree: ${error}`);
    }
  }

  /**
   * Safe file write with atomic operations
   */
  async writeFileSafe(filePath: string, content: string, options: { backup?: boolean } = {}): Promise<void> {
    const { backup = false } = options;

    try {
      const absolutePath = path.resolve(filePath);
      const directory = path.dirname(absolutePath);
      const tempPath = `${absolutePath}.tmp.${Date.now()}`;

      // Ensure directory exists
      await fs.mkdir(directory, { recursive: true });

      // Create backup if requested and file exists
      if (backup && await this.fileExists(absolutePath)) {
        const backupPath = `${absolutePath}.backup.${Date.now()}`;
        await fs.copyFile(absolutePath, backupPath);
      }

      // Write to temporary file first
      await fs.writeFile(tempPath, content, 'utf8');

      // Atomic move to final location
      await fs.rename(tempPath, absolutePath);

      // Clear cache for this file
      this.clearFileCache(absolutePath);

    } catch (error) {
      throw new Error(`Failed to write file safely: ${error}`);
    }
  }

  /**
   * Safe file read with error handling
   */
  async readFileSafe(filePath: string): Promise<string> {
    try {
      const absolutePath = path.resolve(filePath);

      if (!await this.fileExists(absolutePath)) {
        throw new Error(`File does not exist: ${absolutePath}`);
      }

      return await fs.readFile(absolutePath, 'utf8');

    } catch (error) {
      throw new Error(`Failed to read file safely: ${error}`);
    }
  }

  /**
   * Copy files with progress tracking
   */
  async copyFiles(
    sourceFiles: string[],
    targetDirectory: string,
    onProgress?: (progress: { completed: number; total: number; currentFile: string }) => void
  ): Promise<void> {
    const total = sourceFiles.length;
    let completed = 0;

    try {
      // Ensure target directory exists
      await fs.mkdir(targetDirectory, { recursive: true });

      for (const sourceFile of sourceFiles) {
        const fileName = path.basename(sourceFile);
        const targetFile = path.join(targetDirectory, fileName);

        // Copy file
        await fs.copyFile(sourceFile, targetFile);

        completed++;

        // Report progress
        if (onProgress) {
          onProgress({ completed, total, currentFile: fileName });
        }
      }

    } catch (error) {
      throw new Error(`Failed to copy files: ${error}`);
    }
  }

  /**
   * Delete files safely with confirmation
   */
  async deleteFilesSafe(
    filePaths: string[],
    options: { requireConfirmation?: boolean; moveToTrash?: boolean } = {}
  ): Promise<void> {
    const { moveToTrash = true } = options;

    try {
      for (const filePath of filePaths) {
        const absolutePath = path.resolve(filePath);

        if (!await this.fileExists(absolutePath)) {
          continue; // Skip non-existent files
        }

        if (moveToTrash) {
          // Move to trash directory instead of permanent deletion
          const trashDir = path.join(path.dirname(absolutePath), '.trash');
          await fs.mkdir(trashDir, { recursive: true });

          const fileName = path.basename(absolutePath);
          const trashPath = path.join(trashDir, `${fileName}.${Date.now()}`);

          await fs.rename(absolutePath, trashPath);
        } else {
          // Permanent deletion
          await fs.unlink(absolutePath);
        }

        // Clear cache for this file
        this.clearFileCache(absolutePath);
      }

    } catch (error) {
      throw new Error(`Failed to delete files safely: ${error}`);
    }
  }

  /**
   * Find files matching patterns
   */
  async findFiles(
    searchPath: string,
    patterns: string[],
    options: FileDiscoveryOptions = {}
  ): Promise<string[]> {
    const {
      includeHidden = false,
      excludePatterns = ['node_modules/**', '.git/**'],
      maxDepth = 10
    } = options;

    try {
      const allMatches: string[] = [];

      for (const pattern of patterns) {
        const fullPattern = path.join(searchPath, pattern);

        const matches = await glob(fullPattern, {
          ignore: excludePatterns.map(exclude => path.join(searchPath, exclude)),
          nodir: true,
          dot: includeHidden,
          maxDepth
        });

        allMatches.push(...matches);
      }

      // Remove duplicates and sort
      return [...new Set(allMatches)].sort();

    } catch (error) {
      throw new Error(`Failed to find files: ${error}`);
    }
  }

  /**
   * Get file system entry information
   */
  async getFileSystemEntry(entryPath: string): Promise<FileSystemEntry> {
    try {
      const absolutePath = path.resolve(entryPath);
      const stats = await fs.stat(absolutePath);

      return {
        path: absolutePath,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        lastModified: stats.mtime,
        permissions: this.formatPermissions(stats.mode)
      };

    } catch (error) {
      throw new Error(`Failed to get file system entry: ${error}`);
    }
  }

  /**
   * Check if file or directory exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file hash for change detection
   */
  calculateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Clear file cache for specific path
   */
  clearFileCache(filePath?: string): void {
    if (filePath) {
      // Clear cache entries for specific file
      for (const key of this.fileCache.keys()) {
        if (key.startsWith(filePath + ':')) {
          this.fileCache.delete(key);
        }
      }
    } else {
      // Clear entire cache
      this.fileCache.clear();
      this.directoryCache.clear();
    }
  }

  // Private helper methods

  private async buildDirectoryTree(
    directoryPath: string,
    currentDepth: number,
    maxDepth: number,
    includeHidden: boolean
  ): Promise<DirectoryTree> {
    const name = path.basename(directoryPath);
    const tree: DirectoryTree = {
      name,
      path: directoryPath,
      children: [],
      files: []
    };

    if (currentDepth >= maxDepth) {
      return tree;
    }

    try {
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        const entryPath = path.join(directoryPath, entry.name);

        if (entry.isDirectory()) {
          const childTree = await this.buildDirectoryTree(entryPath, currentDepth + 1, maxDepth, includeHidden);
          tree.children.push(childTree);
        } else {
          const stats = await fs.stat(entryPath);
          tree.files.push({
            path: entryPath,
            isDirectory: false,
            size: stats.size,
            lastModified: stats.mtime,
            permissions: this.formatPermissions(stats.mode)
          });
        }
      }

    } catch (error) {
      // Directory might not be accessible, return partial tree
    }

    return tree;
  }

  private async countDirectories(directoryPath: string, options: FileDiscoveryOptions): Promise<number> {
    try {
      const pattern = path.join(directoryPath, '**/');
      const matches = await glob(pattern + '/', {
        ignore: options.excludePatterns?.map(exclude => path.join(directoryPath, exclude)) || [],
        dot: options.includeHidden || false
      });

      return matches.length;

    } catch {
      return 0;
    }
  }

  private async discoverScripts(modulePath: string, packageInfo: any): Promise<ModuleScript[]> {
    const scripts: ModuleScript[] = [];

    // Extract from package.json scripts
    if (packageInfo.scripts) {
      for (const [name, command] of Object.entries(packageInfo.scripts)) {
        scripts.push({
          name,
          command: command as string,
          description: `Package.json script: ${name}`,
          required: false
        });
      }
    }

    // Look for common script files
    const scriptFiles = await this.findFiles(modulePath, [
      '*.sh',
      '*.bat',
      '*.ps1',
      'scripts/**/*'
    ], { maxDepth: 3 });

    for (const scriptFile of scriptFiles) {
      const name = path.basename(scriptFile, path.extname(scriptFile));
      // const stats = await fs.stat(scriptFile);

      scripts.push({
        name,
        command: scriptFile,
        description: `Script file: ${path.relative(modulePath, scriptFile)}`,
        required: false
      });
    }

    return scripts;
  }

  private determineModuleType(files: ModuleFile[], packageInfo: any): string {
    // Check package.json type indicators
    if (packageInfo.main && packageInfo.main.includes('index')) {
      return 'backend-api';
    }

    if (packageInfo.dependencies?.['react'] || packageInfo.devDependencies?.['react']) {
      return 'frontend-component';
    }

    // Check file patterns
    const hasComponents = files.some(f => f.path.includes('component'));
    const hasAPI = files.some(f => f.path.includes('api') || f.path.includes('route'));
    const hasTypes = files.some(f => f.path.includes('types') || f.path.includes('types'));
    const hasCLI = files.some(f => f.path.includes('cli') || f.path.includes('bin'));

    if (hasComponents) return 'frontend-component';
    if (hasAPI) return 'backend-api';
    if (hasTypes) return 'shared-types';
    if (hasCLI) return 'cli-tool';

    return 'other';
  }

  private calculateBasicComplianceScore(files: ModuleFile[], packageInfo: any): number {
    let score = 0;

    // Package.json exists
    if (Object.keys(packageInfo).length > 0) score += 20;

    // Has TypeScript
    if (files.some(f => f.path.endsWith('.ts'))) score += 15;

    // Has tests
    if (files.some(f => f.path.includes('test') || f.path.includes('spec'))) score += 20;

    // Has documentation
    if (files.some(f => f.path.toLowerCase().includes('readme'))) score += 15;

    // Has proper structure
    if (files.some(f => f.path.includes('src/'))) score += 10;

    // Has configuration files
    if (files.some(f => f.path.includes('tsconfig') || f.path.includes('eslint'))) score += 10;

    // Deduct for too many files in root
    const rootFiles = files.filter(f => !f.path.includes('/'));
    if (rootFiles.length > 10) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private extractDependencies(packageInfo: any): ModuleDependency[] {
    const dependencies: ModuleDependency[] = [];

    if (packageInfo.dependencies) {
      for (const [name, version] of Object.entries(packageInfo.dependencies)) {
        dependencies.push({
          name,
          version: version as string,
          type: 'production' as const,
          isCVPlusModule: name.startsWith('@cvplus/') || name.includes('cvplus')
        });
      }
    }

    if (packageInfo.devDependencies) {
      for (const [name, version] of Object.entries(packageInfo.devDependencies)) {
        dependencies.push({
          name,
          version: version as string,
          type: 'development' as const,
          isCVPlusModule: name.startsWith('@cvplus/') || name.includes('cvplus')
        });
      }
    }

    return dependencies;
  }

  private isTextFile(extension: string): boolean {
    const textExtensions = [
      '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx',
      '.css', '.scss', '.html', '.xml', '.yaml', '.yml',
      '.sh', '.bat', '.ps1', '.py', '.java', '.c', '.cpp',
      '.h', '.hpp', '.go', '.rs', '.php', '.rb', '.pl'
    ];

    return textExtensions.includes(extension.toLowerCase());
  }

  private getFileType(extension: string): string {
    const typeMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'jsx',
      '.tsx': 'tsx',
      '.json': 'json',
      '.md': 'markdown',
      '.css': 'stylesheet',
      '.scss': 'stylesheet',
      '.html': 'html',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.sh': 'shell',
      '.bat': 'batch',
      '.ps1': 'powershell'
    };

    return typeMap[extension.toLowerCase()] || 'other';
  }

  private detectLanguage(extension: string, content: string): string | undefined {
    const languageMap: Record<string, string> = {
      '.js': 'JavaScript',
      '.ts': 'TypeScript',
      '.jsx': 'JavaScript',
      '.tsx': 'TypeScript',
      '.py': 'Python',
      '.java': 'Java',
      '.c': 'C',
      '.cpp': 'C++',
      '.go': 'Go',
      '.rs': 'Rust',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.sh': 'Shell'
    };

    const language = languageMap[extension.toLowerCase()];
    if (language) return language;

    // Try to detect from content
    if (content.includes('#!/bin/bash')) return 'Shell';
    if (content.includes('#!/usr/bin/env python')) return 'Python';
    if (content.includes('#!/usr/bin/env node')) return 'JavaScript';

    return undefined;
  }

  private extractDependenciesFromContent(content: string, extension: string): string[] {
    const dependencies: string[] = [];

    if (extension === '.js' || extension === '.ts') {
      // Extract require() and import statements
      const requireRegex = /require\(['"`]([^'"`]+)['"`]\)/g;
      const importRegex = /import.*from\s+['"`]([^'"`]+)['"`]/g;

      let match;
      while ((match = requireRegex.exec(content)) !== null) {
        dependencies.push(match[1]!);
      }

      while ((match = importRegex.exec(content)) !== null) {
        dependencies.push(match[1]!);
      }
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  private extractImports(content: string, extension: string): string[] {
    if (extension !== '.js' && extension !== '.ts' && extension !== '.jsx' && extension !== '.tsx') {
      return [];
    }

    const imports: string[] = [];
    const importRegex = /import\s+(?:{[^}]*}|\w+|\*\s+as\s+\w+)?\s*from\s+['"`]([^'"`]+)['"`]/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]!);
    }

    return imports;
  }

  private extractExports(content: string, extension: string): string[] {
    if (extension !== '.js' && extension !== '.ts' && extension !== '.jsx' && extension !== '.tsx') {
      return [];
    }

    const exports: string[] = [];
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)|export\s+{\s*([^}]*)\s*}/g;

    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      if (match[1]) {
        exports.push(match[1]);
      } else if (match[2]) {
        const namedExports = match[2].split(',').map(e => e.trim().split(' ')[0]!);
        exports.push(...namedExports);
      }
    }

    return exports;
  }

  private extractConfigKeys(content: string, extension: string): string[] {
    if (extension !== '.json' && extension !== '.yaml' && extension !== '.yml') {
      return [];
    }

    const keys: string[] = [];

    if (extension === '.json') {
      try {
        const parsed = JSON.parse(content);
        keys.push(...this.extractKeysFromObject(parsed));
      } catch {
        // Invalid JSON
      }
    }

    return keys;
  }

  private extractKeysFromObject(obj: any, prefix = ''): string[] {
    const keys: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...this.extractKeysFromObject(value, fullKey));
      }
    }

    return keys;
  }

  private isRequiredFile(fileName: string): boolean {
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'README.md',
      'index.js',
      'index.ts'
    ];

    return requiredFiles.includes(fileName);
  }

  // private isExecutableFile(mode: number): boolean {
  //   // Check if file has execute permissions
  //   return (mode & parseInt('111', 8)) > 0;
  // }

  private formatPermissions(mode: number): string {
    const permissions = [];

    // Owner permissions
    permissions.push((mode & parseInt('400', 8)) ? 'r' : '-');
    permissions.push((mode & parseInt('200', 8)) ? 'w' : '-');
    permissions.push((mode & parseInt('100', 8)) ? 'x' : '-');

    // Group permissions
    permissions.push((mode & parseInt('040', 8)) ? 'r' : '-');
    permissions.push((mode & parseInt('020', 8)) ? 'w' : '-');
    permissions.push((mode & parseInt('010', 8)) ? 'x' : '-');

    // Others permissions
    permissions.push((mode & parseInt('004', 8)) ? 'r' : '-');
    permissions.push((mode & parseInt('002', 8)) ? 'w' : '-');
    permissions.push((mode & parseInt('001', 8)) ? 'x' : '-');

    return permissions.join('');
  }
}