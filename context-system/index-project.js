const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const glob = require('glob');

class CVPlusContextIndexer {
    constructor() {
        this.projectRoot = '/Users/gklainert/Documents/cvplus';
        this.configPath = path.join(this.projectRoot, 'context-system/configs/classification-rules.json');
        this.indexPath = path.join(this.projectRoot, 'context-system/indexes');
        this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        this.fileIndex = new Map();
        this.contentHashes = new Map();
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
            const fullPattern = path.join(this.projectRoot, pattern);
            const matches = glob.sync(fullPattern, { 
                ignore: this.config.noise_filters.exclude_patterns.map(p => 
                    path.join(this.projectRoot, p)
                )
            });
            matches.forEach(file => allFiles.add(file));
        }
        
        return Array.from(allFiles);
    }

    shouldFilter(filePath) {
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
        if (ext === '.md' || ext === '.txt' || ext === '.json') {
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
    }

    async extractMetadata(filePath, tier) {
        const stats = fs.statSync(filePath);
        const relativePath = path.relative(this.projectRoot, filePath);
        const ext = path.extname(filePath).toLowerCase();
        
        let contentPreview = '';
        let lineCount = 0;
        
        try {
            if (['.md', '.txt', '.json', '.js', '.ts', '.tsx', '.jsx'].includes(ext)) {
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
            tiers[metadata.tier].push(metadata);
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

// Run indexing if called directly
if (require.main === module) {
    const indexer = new CVPlusContextIndexer();
    indexer.indexProject().catch(console.error);
}

module.exports = CVPlusContextIndexer;
