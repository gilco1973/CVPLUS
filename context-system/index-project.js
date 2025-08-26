const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class CVPlusContextIndexer {
    constructor() {
        this.projectRoot = '/Users/gklainert/Documents/cvplus';
        this.configPath = path.join(this.projectRoot, 'context-system/configs/classification-rules.json');
        this.indexPath = path.join(this.projectRoot, 'context-system/indexes');
        
        // Ensure directories exist
        if (!fs.existsSync(this.indexPath)) {
            fs.mkdirSync(this.indexPath, { recursive: true });
        }
        
        // Load config or use defaults
        this.config = this.loadConfig();
        this.fileIndex = new Map();
        this.contentHashes = new Map();
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            }
        } catch (error) {
            console.log('⚠️  Using default configuration');
        }
        
        // Default configuration
        return {
            tier1_critical: {
                patterns: [
                    "frontend/src/**/*.{ts,tsx}",
                    "functions/src/**/*.ts",
                    "*.{js,ts,tsx,jsx}",
                    "package.json",
                    "tsconfig.json",
                    "firebase.json",
                    "CLAUDE.md"
                ],
                recent_changes: true,
                error_logs: true,
                max_age_days: 7
            },
            tier2_contextual: {
                patterns: [
                    "docs/architecture/**/*.md",
                    "docs/plans/**/*.md",
                    "docs/diagrams/**/*.mermaid",
                    "docs/implementation/**/*.md",
                    "scripts/**/*.{sh,js}",
                    "test/**/*.{js,ts}"
                ],
                max_age_days: 30
            },
            tier3_archive: {
                patterns: [
                    "docs/reports/**/*.md",
                    "docs/refactoring/**/*.md",
                    "logs/**/*",
                    "temp-disabled/**/*",
                    "node_modules/**/*"
                ],
                exclude_from_active: true
            },
            noise_filters: {
                exclude_patterns: [
                    "node_modules/**/*",
                    "dist/**/*",
                    "build/**/*",
                    "*.log",
                    "*.gz",
                    ".git/**/*",
                    "firebase-debug.log",
                    "firestore-debug.log"
                ],
                duplicate_content_threshold: 0.85,
                min_file_size: 10,
                max_file_size: 1048576
            }
        };
    }

    async indexProject() {
        console.log('🔍 Starting CVPlus project indexing...');
        
        const startTime = Date.now();
        let totalFiles = 0;
        let indexedFiles = 0;
        let filteredFiles = 0;

        // Index each tier
        for (const [tier, config] of Object.entries(this.config)) {
            if (tier === 'noise_filters') continue;
            
            console.log(`📂 Indexing ${tier}...`);
            const files = await this.findFiles(config.patterns, config.exclude_from_active);
            
            for (const file of files) {
                totalFiles++;
                
                if (this.shouldFilter(file)) {
                    filteredFiles++;
                    continue;
                }
                
                const metadata = await this.extractMetadata(file, tier);
                this.fileIndex.set(file, metadata);
                indexedFiles++;
                
                if (indexedFiles % 100 === 0) {
                    console.log(`   Processed ${indexedFiles} files...`);
                }
            }
        }

        // Save indexes
        await this.saveIndexes();
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        console.log(`✅ Indexing complete!`);
        console.log(`   Total files scanned: ${totalFiles}`);
        console.log(`   Files indexed: ${indexedFiles}`);
        console.log(`   Files filtered: ${filteredFiles}`);
        console.log(`   Noise reduction: ${((filteredFiles / totalFiles) * 100).toFixed(1)}%`);
        console.log(`   Duration: ${duration.toFixed(2)} seconds`);
        
        return {
            totalFiles,
            indexedFiles,
            filteredFiles,
            noiseReduction: (filteredFiles / totalFiles) * 100,
            duration
        };
    }

    async findFiles(patterns, excludeFromActive = false) {
        const allFiles = new Set();
        
        for (const pattern of patterns) {
            try {
                // Simple glob implementation using find
                const findCommand = this.patternToFind(pattern);
                const matches = execSync(findCommand, { 
                    cwd: this.projectRoot,
                    encoding: 'utf8',
                    timeout: 30000
                }).split('\n').filter(line => line.trim());
                
                matches.forEach(file => {
                    if (file.trim()) {
                        allFiles.add(path.resolve(this.projectRoot, file.trim()));
                    }
                });
            } catch (error) {
                console.log(`⚠️  Error processing pattern ${pattern}: ${error.message}`);
            }
        }
        
        return Array.from(allFiles).filter(file => !this.matchesExcludePatterns(file));
    }

    patternToFind(pattern) {
        // Convert glob-like patterns to find commands
        if (pattern.includes('**')) {
            const parts = pattern.split('**');
            const basePath = parts[0] || '.';
            const extension = parts[1] || '';
            
            if (extension.includes('{') && extension.includes('}')) {
                // Handle multiple extensions like {ts,tsx}
                const exts = extension.match(/\{([^}]+)\}/)[1].split(',');
                const findParts = exts.map(ext => `-name "*.${ext.trim()}"`).join(' -o ');
                return `find "${basePath}" -type f \\( ${findParts} \\) 2>/dev/null || true`;
            } else if (extension) {
                return `find "${basePath}" -type f -name "*${extension}" 2>/dev/null || true`;
            } else {
                return `find "${basePath}" -type f 2>/dev/null || true`;
            }
        } else {
            return `find . -name "${pattern}" -type f 2>/dev/null || true`;
        }
    }

    matchesExcludePatterns(filePath) {
        const relativePath = path.relative(this.projectRoot, filePath);
        
        for (const excludePattern of this.config.noise_filters.exclude_patterns) {
            if (excludePattern.endsWith('/**/*')) {
                const dir = excludePattern.replace('/**/*', '');
                if (relativePath.startsWith(dir + '/') || relativePath === dir) {
                    return true;
                }
            } else if (excludePattern.includes('*')) {
                // Simple wildcard matching
                const regex = new RegExp(excludePattern.replace(/\*/g, '.*'));
                if (regex.test(relativePath)) {
                    return true;
                }
            } else if (relativePath.includes(excludePattern)) {
                return true;
            }
        }
        
        return false;
    }

    shouldFilter(filePath) {
        try {
            const stats = fs.statSync(filePath);
            
            // Size filters
            if (stats.size < this.config.noise_filters.min_file_size ||
                stats.size > this.config.noise_filters.max_file_size) {
                return true;
            }
            
            // Extension filters for binary files
            const ext = path.extname(filePath).toLowerCase();
            const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip', '.tar', '.gz'];
            if (binaryExts.includes(ext)) {
                return true;
            }
            
            // Content-based deduplication (for text files)
            if (['.md', '.txt', '.json', '.js', '.ts', '.tsx', '.jsx'].includes(ext)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const hash = crypto.createHash('md5').update(content).digest('hex');
                    
                    if (this.contentHashes.has(hash)) {
                        return true; // Duplicate content
                    }
                    
                    this.contentHashes.set(hash, filePath);
                } catch (error) {
                    // If we can't read the file, filter it out
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            return true; // Filter out files we can't access
        }
    }

    async extractMetadata(filePath, tier) {
        try {
            const stats = fs.statSync(filePath);
            const relativePath = path.relative(this.projectRoot, filePath);
            const ext = path.extname(filePath).toLowerCase();
            
            let contentPreview = '';
            let lineCount = 0;
            
            try {
                if (['.md', '.txt', '.json', '.js', '.ts', '.tsx', '.jsx', '.sh'].includes(ext)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    lineCount = content.split('\n').length;
                    contentPreview = content.substring(0, 200);
                }
            } catch (error) {
                contentPreview = '[Binary or unreadable file]';
            }
            
            return {
                tier,
                relativePath,
                absolutePath: filePath,
                extension: ext,
                size: stats.size,
                lastModified: stats.mtime.toISOString(),
                lineCount,
                contentPreview,
                relevanceScore: this.calculateRelevanceScore(filePath, tier, stats)
            };
        } catch (error) {
            return null;
        }
    }

    calculateRelevanceScore(filePath, tier, stats) {
        let score = 0;
        
        // Base tier score
        if (tier === 'tier1_critical') score += 100;
        else if (tier === 'tier2_contextual') score += 50;
        else if (tier === 'tier3_archive') score += 10;
        
        // Recency bonus
        const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceModified < 7) score += 20;
        else if (daysSinceModified < 30) score += 10;
        
        // File type bonus
        const ext = path.extname(filePath).toLowerCase();
        if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) score += 15;
        else if (ext === '.md') score += 10;
        else if (ext === '.json') score += 5;
        
        // Path-based scoring
        if (filePath.includes('/src/')) score += 10;
        if (filePath.includes('/docs/plans/')) score += 8;
        if (filePath.includes('/docs/architecture/')) score += 8;
        if (filePath.includes('/scripts/')) score += 5;
        
        return Math.min(score, 150); // Cap at 150
    }

    async saveIndexes() {
        // Save main index
        const indexData = {
            timestamp: new Date().toISOString(),
            projectRoot: this.projectRoot,
            totalFiles: this.fileIndex.size,
            files: Object.fromEntries(this.fileIndex)
        };
        
        const indexFilePath = path.join(this.indexPath, 'project-index.json');
        fs.writeFileSync(indexFilePath, JSON.stringify(indexData, null, 2));
        
        // Save tier-specific indexes
        const tiers = {
            tier1_critical: [],
            tier2_contextual: [],
            tier3_archive: []
        };
        
        for (const [filePath, metadata] of this.fileIndex) {
            if (metadata && tiers[metadata.tier]) {
                tiers[metadata.tier].push(metadata);
            }
        }
        
        // Sort by relevance score
        for (const tier of Object.keys(tiers)) {
            tiers[tier].sort((a, b) => b.relevanceScore - a.relevanceScore);
            
            const tierFilePath = path.join(this.indexPath, `${tier}.json`);
            fs.writeFileSync(tierFilePath, JSON.stringify({
                tier,
                timestamp: new Date().toISOString(),
                fileCount: tiers[tier].length,
                files: tiers[tier]
            }, null, 2));
        }
        
        console.log(`💾 Indexes saved to ${this.indexPath}`);
    }
}

// Create and export instance for use by other modules
const indexer = new CVPlusContextIndexer();

// Run indexing if called directly
if (require.main === module) {
    indexer.indexProject().catch(console.error);
}

module.exports = {
    CVPlusContextIndexer,
    indexProject: () => indexer.indexProject()
};