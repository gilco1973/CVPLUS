const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

class CVPlusMemoryManager {
    constructor() {
        this.projectRoot = '/Users/gklainert/Documents/cvplus';
        this.memoryPath = path.join(this.projectRoot, 'context-system/memory');
        this.configPath = path.join(this.projectRoot, 'context-system/configs/memory-config.json');
        
        // Ensure directories exist
        this.ensureDirectories();
        
        this.config = this.loadConfig();
        this.cache = new Map();
        this.sessionId = this.generateSessionId();
    }

    ensureDirectories() {
        const dirs = ['snapshots', 'cache', 'sessions'];
        dirs.forEach(dir => {
            const dirPath = path.join(this.memoryPath, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            }
        } catch (error) {
            console.log('⚠️  Using default memory configuration');
        }
        
        // Default config
        return {
            memoryStorage: {
                compressionEnabled: true,
                autoCleanup: true
            },
            projectSnapshots: {
                maxSnapshots: 10
            },
            contextCaching: {
                cacheExpiryHours: 24
            }
        };
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
            fileStats: await this.getFileStatistics()
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
            if (fs.existsSync(packageJsonPath)) {
                packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            }
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
            if (fs.existsSync(indexPath)) {
                return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
            }
        } catch (error) {
            console.log('⚠️  Context index not found, creating placeholder');
        }
        
        return { files: {}, totalFiles: 0 };
    }

    async getGitStatus() {
        try {
            const { execSync } = require('child_process');
            const status = execSync('git status --porcelain', { 
                cwd: this.projectRoot, 
                encoding: 'utf8',
                timeout: 10000
            });
            
            const branch = execSync('git branch --show-current', { 
                cwd: this.projectRoot, 
                encoding: 'utf8',
                timeout: 10000
            }).trim();
            
            const lastCommit = execSync('git log -1 --pretty=format:"%H %s"', { 
                cwd: this.projectRoot, 
                encoding: 'utf8',
                timeout: 10000
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

        try {
            const walkDir = (dir) => {
                try {
                    const files = fs.readdirSync(dir);
                    
                    for (const file of files) {
                        if (file.startsWith('.')) continue;
                        
                        const filePath = path.join(dir, file);
                        
                        try {
                            const stat = fs.statSync(filePath);
                            
                            if (stat.isDirectory()) {
                                if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
                                    walkDir(filePath);
                                }
                            } else {
                                stats.totalFiles++;
                                stats.totalSize += stat.size;
                                
                                const ext = path.extname(file).toLowerCase();
                                stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
                                
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
                            continue;
                        }
                    }
                } catch (dirError) {
                    return;
                }
            };

            walkDir(this.projectRoot);
        } catch (error) {
            console.log('⚠️  Error gathering file statistics:', error.message);
        }
        
        // Sort recently modified files
        stats.recentlyModified.sort((a, b) => new Date(b.modified) - new Date(a.modified));
        stats.recentlyModified = stats.recentlyModified.slice(0, 20);

        return stats;
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
        try {
            const cachePath = path.join(this.memoryPath, 'cache', `${key.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
            fs.writeFileSync(cachePath, JSON.stringify(cacheEntry, null, 2));
            console.log(`💾 Cached context data: ${key} (${cacheEntry.size} bytes)`);
        } catch (error) {
            console.log(`⚠️  Error caching to disk: ${error.message}`);
        }

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
            if (fs.existsSync(cachePath)) {
                const cacheEntry = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
                if (cacheEntry.expiryTime > Date.now()) {
                    this.cache.set(key, cacheEntry);
                    console.log(`💾 Retrieved from disk cache: ${key}`);
                    return cacheEntry.data;
                } else {
                    fs.unlinkSync(cachePath);
                }
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
            diskUsage: await this.calculateDiskUsage()
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
                if (!fs.existsSync(dir)) return;
                
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    try {
                        const stat = fs.statSync(filePath);
                        if (stat.isFile()) {
                            usage[category] += stat.size;
                            usage.total += stat.size;
                        }
                    } catch (error) {
                        continue;
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

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

module.exports = CVPlusMemoryManager;

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