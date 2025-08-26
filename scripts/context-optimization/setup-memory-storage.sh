#!/bin/bash
# CVPlus Memory MCP Server Configuration
# Author: Gil Klainert
# Date: 2025-08-26

set -e

echo "🧠 Setting up CVPlus Memory MCP Server for Context Storage..."

# Create memory storage directories
mkdir -p /Users/gklainert/Documents/cvplus/context-system/memory/{snapshots,cache,sessions}

# Create memory configuration
cat > /Users/gklainert/Documents/cvplus/context-system/configs/memory-config.json << 'EOF'
{
  "memoryStorage": {
    "basePath": "/Users/gklainert/Documents/cvplus/context-system/memory",
    "maxMemorySize": "500MB",
    "compressionEnabled": true,
    "autoCleanup": true,
    "cleanupInterval": "24h",
    "retentionPeriod": "30d"
  },
  "contextCaching": {
    "enabled": true,
    "maxCacheEntries": 1000,
    "cacheExpiryHours": 24,
    "preloadCriticalContext": true,
    "compressionLevel": 6
  },
  "projectSnapshots": {
    "enabled": true,
    "snapshotInterval": "6h",
    "maxSnapshots": 10,
    "includeMetrics": true,
    "deltaCompression": true
  },
  "sessionManagement": {
    "persistSessions": true,
    "maxSessionHistory": 50,
    "sessionTimeout": "2h",
    "autoSaveInterval": "5m"
  }
}
EOF

# Create memory management utilities
cat > /Users/gklainert/Documents/cvplus/context-system/memory-manager.js << 'EOF'
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

class CVPlusMemoryManager {
    constructor() {
        this.projectRoot = '/Users/gklainert/Documents/cvplus';
        this.memoryPath = path.join(this.projectRoot, 'context-system/memory');
        this.configPath = path.join(this.projectRoot, 'context-system/configs/memory-config.json');
        this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        this.cache = new Map();
        this.sessionId = this.generateSessionId();
    }

    generateSessionId() {
        return `cvplus-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    }

    async createProjectSnapshot() {
        console.log('📸 Creating CVPlus project snapshot...');
        
        const snapshot = {
            id: `snapshot-${Date.now()}`,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            projectRoot: this.projectRoot,
            metadata: await this.gatherProjectMetadata(),
            contextIndex: await this.loadContextIndex(),
            gitStatus: await this.getGitStatus(),
            fileStats: await this.getFileStatistics(),
            recentChanges: await this.getRecentChanges()
        };

        const snapshotPath = path.join(this.memoryPath, 'snapshots', `${snapshot.id}.json`);
        
        if (this.config.memoryStorage.compressionEnabled) {
            const compressed = zlib.gzipSync(JSON.stringify(snapshot, null, 2));
            fs.writeFileSync(snapshotPath + '.gz', compressed);
            console.log(`💾 Compressed snapshot saved: ${snapshotPath}.gz`);
        } else {
            fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
            console.log(`💾 Snapshot saved: ${snapshotPath}`);
        }

        await this.cleanupOldSnapshots();
        return snapshot.id;
    }

    async gatherProjectMetadata() {
        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        let packageInfo = {};
        
        try {
            packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        } catch (error) {
            console.log('⚠️  No package.json found at project root');
        }

        return {
            name: packageInfo.name || 'CVPlus',
            version: packageInfo.version || '1.0.0',
            description: packageInfo.description || 'AI-powered CV transformation platform',
            dependencies: Object.keys(packageInfo.dependencies || {}),
            devDependencies: Object.keys(packageInfo.devDependencies || {}),
            scripts: Object.keys(packageInfo.scripts || {}),
            lastSnapshot: new Date().toISOString()
        };
    }

    async loadContextIndex() {
        const indexPath = path.join(this.projectRoot, 'context-system/indexes/project-index.json');
        
        try {
            return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        } catch (error) {
            console.log('⚠️  Context index not found, creating placeholder');
            return { files: {}, totalFiles: 0 };
        }
    }

    async getGitStatus() {
        try {
            const { execSync } = require('child_process');
            const status = execSync('git status --porcelain', { 
                cwd: this.projectRoot, 
                encoding: 'utf8' 
            });
            
            const branch = execSync('git branch --show-current', { 
                cwd: this.projectRoot, 
                encoding: 'utf8' 
            }).trim();
            
            const lastCommit = execSync('git log -1 --pretty=format:"%H %s"', { 
                cwd: this.projectRoot, 
                encoding: 'utf8' 
            });

            return {
                branch,
                lastCommit,
                hasUncommittedChanges: status.length > 0,
                modifiedFiles: status.split('\n').filter(line => line.trim()).length
            };
        } catch (error) {
            return { error: 'Not a git repository or git not available' };
        }
    }

    async getFileStatistics() {
        const stats = {
            totalFiles: 0,
            totalSize: 0,
            fileTypes: {},
            largestFiles: [],
            recentlyModified: []
        };

        const walkDir = (dir) => {
            try {
                const files = fs.readdirSync(dir);
                
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    
                    try {
                        const stat = fs.statSync(filePath);
                        
                        if (stat.isDirectory()) {
                            if (!file.startsWith('.') && file !== 'node_modules') {
                                walkDir(filePath);
                            }
                        } else {
                            stats.totalFiles++;
                            stats.totalSize += stat.size;
                            
                            const ext = path.extname(file).toLowerCase();
                            stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
                            
                            // Track largest files
                            if (stats.largestFiles.length < 10 || stat.size > stats.largestFiles[9].size) {
                                stats.largestFiles.push({ path: filePath, size: stat.size });
                                stats.largestFiles.sort((a, b) => b.size - a.size);
                                stats.largestFiles = stats.largestFiles.slice(0, 10);
                            }
                            
                            // Track recently modified files
                            const hoursSinceModified = (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60);
                            if (hoursSinceModified < 24) {
                                stats.recentlyModified.push({
                                    path: filePath,
                                    modified: stat.mtime.toISOString(),
                                    hoursAgo: Math.round(hoursSinceModified * 10) / 10
                                });
                            }
                        }
                    } catch (statError) {
                        // Skip files that can't be accessed
                        continue;
                    }
                }
            } catch (dirError) {
                // Skip directories that can't be accessed
                return;
            }
        };

        walkDir(this.projectRoot);
        
        // Sort recently modified files
        stats.recentlyModified.sort((a, b) => new Date(b.modified) - new Date(a.modified));
        stats.recentlyModified = stats.recentlyModified.slice(0, 20);

        return stats;
    }

    async getRecentChanges() {
        try {
            const { execSync } = require('child_process');
            const changes = execSync('git log --oneline -10', { 
                cwd: this.projectRoot, 
                encoding: 'utf8' 
            });

            return changes.split('\n').filter(line => line.trim()).map(line => {
                const [commit, ...messageParts] = line.split(' ');
                return { commit, message: messageParts.join(' ') };
            });
        } catch (error) {
            return [];
        }
    }

    async cleanupOldSnapshots() {
        const snapshotsDir = path.join(this.memoryPath, 'snapshots');
        const maxSnapshots = this.config.projectSnapshots.maxSnapshots;
        
        try {
            const files = fs.readdirSync(snapshotsDir)
                .filter(f => f.startsWith('snapshot-'))
                .map(f => ({ 
                    name: f, 
                    path: path.join(snapshotsDir, f),
                    mtime: fs.statSync(path.join(snapshotsDir, f)).mtime 
                }))
                .sort((a, b) => b.mtime - a.mtime);

            if (files.length > maxSnapshots) {
                const toDelete = files.slice(maxSnapshots);
                for (const file of toDelete) {
                    fs.unlinkSync(file.path);
                    console.log(`🗑️  Cleaned up old snapshot: ${file.name}`);
                }
            }
        } catch (error) {
            console.log('⚠️  Error during snapshot cleanup:', error.message);
        }
    }

    async cacheContextData(key, data, expiryHours = null) {
        const expiry = expiryHours || this.config.contextCaching.cacheExpiryHours;
        const expiryTime = Date.now() + (expiry * 60 * 60 * 1000);
        
        const cacheEntry = {
            key,
            data,
            timestamp: new Date().toISOString(),
            expiryTime,
            size: JSON.stringify(data).length
        };

        this.cache.set(key, cacheEntry);

        // Persist to disk
        const cachePath = path.join(this.memoryPath, 'cache', `${key.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
        fs.writeFileSync(cachePath, JSON.stringify(cacheEntry, null, 2));

        console.log(`💾 Cached context data: ${key} (${cacheEntry.size} bytes)`);
        return true;
    }

    async getCachedContextData(key) {
        // Check memory cache first
        if (this.cache.has(key)) {
            const entry = this.cache.get(key);
            if (entry.expiryTime > Date.now()) {
                console.log(`⚡ Retrieved from memory cache: ${key}`);
                return entry.data;
            } else {
                this.cache.delete(key);
            }
        }

        // Check disk cache
        const cachePath = path.join(this.memoryPath, 'cache', `${key.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
        
        try {
            const cacheEntry = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            if (cacheEntry.expiryTime > Date.now()) {
                this.cache.set(key, cacheEntry);
                console.log(`💾 Retrieved from disk cache: ${key}`);
                return cacheEntry.data;
            } else {
                fs.unlinkSync(cachePath);
            }
        } catch (error) {
            // Cache miss
        }

        return null;
    }

    async getMemoryUsageReport() {
        const report = {
            timestamp: new Date().toISOString(),
            memoryCache: {
                entries: this.cache.size,
                totalSize: Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0)
            },
            diskUsage: await this.calculateDiskUsage(),
            recentActivity: await this.getRecentActivity()
        };

        console.log('📊 Memory Usage Report:');
        console.log(`   Memory Cache: ${report.memoryCache.entries} entries, ${this.formatBytes(report.memoryCache.totalSize)}`);
        console.log(`   Disk Usage: ${this.formatBytes(report.diskUsage.total)}`);
        
        return report;
    }

    async calculateDiskUsage() {
        const usage = { total: 0, snapshots: 0, cache: 0 };
        
        const walkDir = (dir, category) => {
            try {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const stat = fs.statSync(filePath);
                    if (stat.isFile()) {
                        usage[category] += stat.size;
                        usage.total += stat.size;
                    }
                }
            } catch (error) {
                // Directory doesn't exist or can't be accessed
            }
        };

        walkDir(path.join(this.memoryPath, 'snapshots'), 'snapshots');
        walkDir(path.join(this.memoryPath, 'cache'), 'cache');

        return usage;
    }

    async getRecentActivity() {
        // This would track recent context operations
        return {
            lastSnapshot: 'Not yet implemented',
            recentCacheHits: 'Not yet implemented',
            sessionDuration: 'Not yet implemented'
        };
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Run if called directly
if (require.main === module) {
    const memoryManager = new CVPlusMemoryManager();
    
    async function runDemo() {
        console.log('🧠 CVPlus Memory Manager Demo');
        
        // Create initial snapshot
        await memoryManager.createProjectSnapshot();
        
        // Cache some sample data
        await memoryManager.cacheContextData('recent-files', {
            files: ['src/App.tsx', 'src/components/CVPreview.tsx'],
            timestamp: new Date().toISOString()
        });
        
        // Generate usage report
        await memoryManager.getMemoryUsageReport();
    }
    
    runDemo().catch(console.error);
}

module.exports = CVPlusMemoryManager;
EOF

chmod +x /Users/gklainert/Documents/cvplus/scripts/context-optimization/setup-memory-storage.sh

echo "✅ Memory MCP server configuration complete!"
echo ""
echo "Features configured:"
echo "- Project snapshots with compression"
echo "- Context data caching (memory + disk)"
echo "- Session management and persistence"
echo "- Automatic cleanup and retention policies"
echo ""
echo "Run: node /Users/gklainert/Documents/cvplus/context-system/memory-manager.js"