#!/bin/bash
# CVPlus Context Indexing Setup Script
# Author: Gil Klainert
# Date: 2025-08-26

set -e

echo "🚀 Setting up CVPlus Context Optimization System..."

# Create context optimization directories
mkdir -p /Users/gklainert/Documents/cvplus/context-system/{indexes,memory,configs,logs}

# Set up environment variables for context indexing
export MCP_SERVER_NAME="cvplus-context"
export MCP_SERVER_VERSION="1.0.0"
export EMBEDDING_PROVIDER="OpenAI"
export EMBEDDING_MODEL="text-embedding-3-small"

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY not set. Please set it for embedding functionality."
    echo "   export OPENAI_API_KEY=your_api_key_here"
fi

# Create context classification configuration
cat > /Users/gklainert/Documents/cvplus/context-system/configs/classification-rules.json << 'EOF'
{
  "tier1_critical": {
    "patterns": [
      "frontend/src/**/*.{ts,tsx}",
      "functions/src/**/*.ts",
      "*.{js,ts,tsx,jsx}",
      "package.json",
      "tsconfig.json",
      "firebase.json",
      "CLAUDE.md"
    ],
    "recent_changes": true,
    "error_logs": true,
    "max_age_days": 7
  },
  "tier2_contextual": {
    "patterns": [
      "docs/architecture/**/*.md",
      "docs/plans/**/*.md",
      "docs/diagrams/**/*.mermaid",
      "docs/implementation/**/*.md",
      "scripts/**/*.{sh,js}",
      "test/**/*.{js,ts}"
    ],
    "max_age_days": 30
  },
  "tier3_archive": {
    "patterns": [
      "docs/reports/**/*.md",
      "docs/refactoring/**/*.md",
      "logs/**/*",
      "temp-disabled/**/*",
      "node_modules/**/*"
    ],
    "exclude_from_active": true
  },
  "noise_filters": {
    "exclude_patterns": [
      "node_modules/**/*",
      "dist/**/*",
      "build/**/*",
      "*.log",
      "*.gz",
      ".git/**/*",
      "firebase-debug.log",
      "firestore-debug.log"
    ],
    "duplicate_content_threshold": 0.85,
    "min_file_size": 10,
    "max_file_size": 1048576
  }
}
EOF

# Create context indexing script
cat > /Users/gklainert/Documents/cvplus/context-system/index-project.js << 'EOF'
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
EOF

# Make scripts executable
chmod +x /Users/gklainert/Documents/cvplus/scripts/context-optimization/setup-context-indexing.sh

echo "✅ Context indexing setup complete!"
echo ""
echo "Next steps:"
echo "1. Set your OpenAI API key: export OPENAI_API_KEY=your_key_here"
echo "2. Run the indexing: node /Users/gklainert/Documents/cvplus/context-system/index-project.js"
echo "3. The system will create optimized indexes for 3-tier context architecture"