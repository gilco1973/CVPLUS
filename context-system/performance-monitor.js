const fs = require('fs');
const path = require('path');
const os = require('os');

class CVPlusPerformanceMonitor {
    constructor() {
        this.projectRoot = '/Users/gklainert/Documents/cvplus';
        this.systemPath = path.join(this.projectRoot, 'context-system');
        this.logsPath = path.join(this.systemPath, 'logs');
        this.metricsFile = path.join(this.logsPath, 'performance-metrics.json');
        
        this.metrics = {
            contextOperations: [],
            retrievalTimes: [],
            cachePerformance: [],
            systemResources: [],
            userInteractions: []
        };
        
        this.startTime = Date.now();
        this.operationCounter = 0;
        
        this.ensureLogsDirectory();
        this.loadExistingMetrics();
    }

    ensureLogsDirectory() {
        if (!fs.existsSync(this.logsPath)) {
            fs.mkdirSync(this.logsPath, { recursive: true });
        }
    }

    loadExistingMetrics() {
        try {
            if (fs.existsSync(this.metricsFile)) {
                const data = JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));
                this.metrics = { ...this.metrics, ...data };
                console.log('📊 Loaded existing performance metrics');
            }
        } catch (error) {
            console.log('⚠️  Could not load existing metrics, starting fresh');
        }
    }

    startOperation(operationType, description = '') {
        const operationId = `op_${++this.operationCounter}_${Date.now()}`;
        
        const operation = {
            id: operationId,
            type: operationType,
            description,
            startTime: Date.now(),
            startMemory: process.memoryUsage(),
            startCpu: process.cpuUsage()
        };
        
        this.metrics.contextOperations.push(operation);
        
        console.log(`⏱️  Started operation: ${operationType} (${operationId})`);
        return operationId;
    }

    endOperation(operationId, result = null, additionalData = {}) {
        const operation = this.metrics.contextOperations.find(op => op.id === operationId);
        
        if (!operation) {
            console.log(`⚠️  Operation not found: ${operationId}`);
            return null;
        }

        const endTime = Date.now();
        const endMemory = process.memoryUsage();
        const endCpu = process.cpuUsage(operation.startCpu);
        
        operation.endTime = endTime;
        operation.duration = endTime - operation.startTime;
        operation.memoryDelta = {
            rss: endMemory.rss - operation.startMemory.rss,
            heapUsed: endMemory.heapUsed - operation.startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - operation.startMemory.heapTotal
        };
        operation.cpuUsage = endCpu;
        operation.result = result;
        operation.additionalData = additionalData;
        operation.completed = true;

        console.log(`✅ Completed operation: ${operation.type} in ${operation.duration}ms`);
        
        // Update retrieval times for context operations
        if (operation.type.includes('context') || operation.type.includes('retrieval')) {
            this.metrics.retrievalTimes.push({
                timestamp: endTime,
                duration: operation.duration,
                operation: operation.type,
                filesProcessed: additionalData.filesProcessed || 0
            });
        }

        return operation;
    }

    recordCacheOperation(operation, hit, duration, dataSize = 0) {
        const cacheMetric = {
            timestamp: Date.now(),
            operation, // 'get', 'set', 'miss', 'hit'
            hit,
            duration,
            dataSize,
            memoryUsage: process.memoryUsage().heapUsed
        };

        this.metrics.cachePerformance.push(cacheMetric);
        
        // Keep only recent cache metrics (last 1000)
        if (this.metrics.cachePerformance.length > 1000) {
            this.metrics.cachePerformance = this.metrics.cachePerformance.slice(-1000);
        }
    }

    recordSystemResources() {
        const resources = {
            timestamp: Date.now(),
            memory: {
                process: process.memoryUsage(),
                system: {
                    total: os.totalmem(),
                    free: os.freemem(),
                    used: os.totalmem() - os.freemem()
                }
            },
            cpu: {
                usage: process.cpuUsage(),
                loadAverage: os.loadavg()
            },
            disk: this.getDiskUsage()
        };

        this.metrics.systemResources.push(resources);
        
        // Keep only recent system metrics (last 100)
        if (this.metrics.systemResources.length > 100) {
            this.metrics.systemResources = this.metrics.systemResources.slice(-100);
        }

        return resources;
    }

    getDiskUsage() {
        try {
            const contextSystemStats = fs.statSync(this.systemPath);
            return {
                contextSystem: this.calculateDirectorySize(this.systemPath),
                available: 'Not implemented', // Would need platform-specific implementation
                timestamp: Date.now()
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    calculateDirectorySize(dirPath) {
        let totalSize = 0;
        
        try {
            const walkDir = (dir) => {
                const files = fs.readdirSync(dir);
                
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const stats = fs.statSync(filePath);
                    
                    if (stats.isDirectory()) {
                        walkDir(filePath);
                    } else {
                        totalSize += stats.size;
                    }
                }
            };
            
            walkDir(dirPath);
        } catch (error) {
            console.log(`⚠️  Error calculating directory size: ${error.message}`);
        }
        
        return totalSize;
    }

    recordUserInteraction(interactionType, context, duration = null) {
        const interaction = {
            timestamp: Date.now(),
            type: interactionType,
            context,
            duration,
            sessionId: this.getSessionId()
        };

        this.metrics.userInteractions.push(interaction);
        
        // Keep only recent interactions (last 500)
        if (this.metrics.userInteractions.length > 500) {
            this.metrics.userInteractions = this.metrics.userInteractions.slice(-500);
        }
    }

    getSessionId() {
        // Simple session ID based on start time
        return `session_${this.startTime}`;
    }

    generatePerformanceReport() {
        const now = Date.now();
        const sessionDuration = now - this.startTime;
        
        const report = {
            timestamp: new Date().toISOString(),
            sessionDuration,
            summary: this.calculateSummaryMetrics(),
            contextOperations: this.analyzeContextOperations(),
            cachePerformance: this.analyzeCachePerformance(),
            systemHealth: this.analyzeSystemHealth(),
            recommendations: this.generateRecommendations()
        };

        return report;
    }

    calculateSummaryMetrics() {
        const completedOps = this.metrics.contextOperations.filter(op => op.completed);
        const totalDuration = completedOps.reduce((sum, op) => sum + op.duration, 0);
        const avgDuration = completedOps.length > 0 ? totalDuration / completedOps.length : 0;
        
        const cacheHits = this.metrics.cachePerformance.filter(c => c.hit).length;
        const totalCacheOps = this.metrics.cachePerformance.length;
        const cacheHitRate = totalCacheOps > 0 ? (cacheHits / totalCacheOps) * 100 : 0;

        return {
            totalOperations: this.metrics.contextOperations.length,
            completedOperations: completedOps.length,
            averageOperationDuration: Math.round(avgDuration),
            cacheHitRate: Math.round(cacheHitRate * 100) / 100,
            totalRetrievals: this.metrics.retrievalTimes.length,
            averageRetrievalTime: this.calculateAverageRetrievalTime()
        };
    }

    calculateAverageRetrievalTime() {
        if (this.metrics.retrievalTimes.length === 0) return 0;
        
        const recentRetrievals = this.metrics.retrievalTimes.slice(-50); // Last 50 retrievals
        const totalTime = recentRetrievals.reduce((sum, r) => sum + r.duration, 0);
        return Math.round(totalTime / recentRetrievals.length);
    }

    analyzeContextOperations() {
        const operations = this.metrics.contextOperations.filter(op => op.completed);
        
        const byType = {};
        for (const op of operations) {
            if (!byType[op.type]) {
                byType[op.type] = { count: 0, totalDuration: 0, avgDuration: 0 };
            }
            byType[op.type].count++;
            byType[op.type].totalDuration += op.duration;
            byType[op.type].avgDuration = byType[op.type].totalDuration / byType[op.type].count;
        }

        const slowestOperations = operations
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 5)
            .map(op => ({
                type: op.type,
                duration: op.duration,
                timestamp: new Date(op.startTime).toISOString(),
                description: op.description
            }));

        return {
            operationsByType: byType,
            slowestOperations,
            totalOperations: operations.length,
            performanceTrend: this.calculatePerformanceTrend(operations)
        };
    }

    calculatePerformanceTrend(operations) {
        if (operations.length < 10) return 'Insufficient data';
        
        const recent = operations.slice(-10).reduce((sum, op) => sum + op.duration, 0) / 10;
        const earlier = operations.slice(-20, -10).reduce((sum, op) => sum + op.duration, 0) / 10;
        
        if (recent < earlier * 0.9) return 'Improving';
        if (recent > earlier * 1.1) return 'Degrading';
        return 'Stable';
    }

    analyzeCachePerformance() {
        const cacheOps = this.metrics.cachePerformance;
        
        if (cacheOps.length === 0) {
            return { message: 'No cache operations recorded' };
        }

        const hits = cacheOps.filter(c => c.hit).length;
        const misses = cacheOps.length - hits;
        const hitRate = (hits / cacheOps.length) * 100;

        const avgDuration = {
            hit: this.calculateAverageForCondition(cacheOps, c => c.hit, 'duration'),
            miss: this.calculateAverageForCondition(cacheOps, c => !c.hit, 'duration')
        };

        return {
            totalOperations: cacheOps.length,
            hits,
            misses,
            hitRate: Math.round(hitRate * 100) / 100,
            averageDuration: avgDuration,
            efficiency: hitRate > 80 ? 'Excellent' : hitRate > 60 ? 'Good' : 'Needs Improvement'
        };
    }

    calculateAverageForCondition(array, condition, property) {
        const filtered = array.filter(condition);
        if (filtered.length === 0) return 0;
        
        const sum = filtered.reduce((total, item) => total + item[property], 0);
        return Math.round(sum / filtered.length);
    }

    analyzeSystemHealth() {
        const recentResources = this.metrics.systemResources.slice(-10);
        
        if (recentResources.length === 0) {
            this.recordSystemResources(); // Record current state
            return { message: 'No system metrics available' };
        }

        const avgMemoryUsage = recentResources.reduce((sum, r) => 
            sum + r.memory.process.heapUsed, 0) / recentResources.length;
        
        const memoryTrend = this.calculateResourceTrend(recentResources, 'memory.process.heapUsed');
        
        return {
            averageMemoryUsage: this.formatBytes(avgMemoryUsage),
            memoryTrend,
            systemLoad: recentResources[recentResources.length - 1]?.cpu.loadAverage || 'Unknown',
            diskUsage: this.formatBytes(recentResources[recentResources.length - 1]?.disk.contextSystem || 0),
            healthStatus: this.determineHealthStatus(avgMemoryUsage, memoryTrend)
        };
    }

    calculateResourceTrend(resources, path) {
        if (resources.length < 5) return 'Insufficient data';
        
        const getValue = (obj, path) => path.split('.').reduce((o, p) => o && o[p], obj);
        
        const recent = resources.slice(-3).map(r => getValue(r, path));
        const earlier = resources.slice(-6, -3).map(r => getValue(r, path));
        
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
        
        if (recentAvg > earlierAvg * 1.2) return 'Increasing';
        if (recentAvg < earlierAvg * 0.8) return 'Decreasing';
        return 'Stable';
    }

    determineHealthStatus(avgMemoryUsage, memoryTrend) {
        const memoryMB = avgMemoryUsage / (1024 * 1024);
        
        if (memoryMB > 500 && memoryTrend === 'Increasing') return 'Warning';
        if (memoryMB > 1000) return 'Critical';
        if (memoryMB < 100 && memoryTrend === 'Stable') return 'Excellent';
        return 'Good';
    }

    generateRecommendations() {
        const recommendations = [];
        const summary = this.calculateSummaryMetrics();
        const cacheAnalysis = this.analyzeCachePerformance();
        
        // Performance recommendations
        if (summary.averageOperationDuration > 5000) {
            recommendations.push({
                type: 'Performance',
                priority: 'High',
                message: 'Average operation duration is high (>5s). Consider optimizing context indexing.',
                action: 'Review and optimize slow operations'
            });
        }

        // Cache recommendations
        if (cacheAnalysis.hitRate < 70) {
            recommendations.push({
                type: 'Cache',
                priority: 'Medium',
                message: `Cache hit rate is ${cacheAnalysis.hitRate}%. Increase cache retention or preload critical context.`,
                action: 'Optimize cache strategy'
            });
        }

        // Memory recommendations
        const systemHealth = this.analyzeSystemHealth();
        if (systemHealth.healthStatus === 'Warning' || systemHealth.healthStatus === 'Critical') {
            recommendations.push({
                type: 'Memory',
                priority: systemHealth.healthStatus === 'Critical' ? 'High' : 'Medium',
                message: `System memory usage is ${systemHealth.healthStatus.toLowerCase()}. Consider cleanup or optimization.`,
                action: 'Implement memory optimization'
            });
        }

        // Context recommendations
        if (summary.averageRetrievalTime > 2000) {
            recommendations.push({
                type: 'Context',
                priority: 'Medium',
                message: 'Context retrieval is slow. Consider pre-indexing frequently accessed files.',
                action: 'Implement context pre-loading'
            });
        }

        return recommendations;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async saveMetrics() {
        try {
            fs.writeFileSync(this.metricsFile, JSON.stringify(this.metrics, null, 2));
            console.log(`💾 Performance metrics saved to ${this.metricsFile}`);
        } catch (error) {
            console.error('❌ Error saving metrics:', error.message);
        }
    }

    async saveReport() {
        const report = this.generatePerformanceReport();
        const reportFile = path.join(this.logsPath, `performance-report-${Date.now()}.json`);
        
        try {
            fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
            console.log(`📊 Performance report saved to ${reportFile}`);
            return reportFile;
        } catch (error) {
            console.error('❌ Error saving report:', error.message);
            return null;
        }
    }
}

module.exports = CVPlusPerformanceMonitor;

// Demo if run directly
if (require.main === module) {
    const monitor = new CVPlusPerformanceMonitor();
    
    async function runDemo() {
        console.log('📊 CVPlus Performance Monitor Demo\n');
        
        // Simulate some operations
        const op1 = monitor.startOperation('context-indexing', 'Initial project indexing');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate work
        monitor.endOperation(op1, 'success', { filesProcessed: 150 });
        
        const op2 = monitor.startOperation('context-retrieval', 'Getting optimized context');
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate work
        monitor.endOperation(op2, 'success', { filesProcessed: 25 });
        
        // Simulate cache operations
        monitor.recordCacheOperation('get', true, 50, 1024);
        monitor.recordCacheOperation('get', false, 1200, 2048);
        monitor.recordCacheOperation('set', true, 200, 1024);
        
        // Record system resources
        monitor.recordSystemResources();
        
        // Generate and display report
        const report = monitor.generatePerformanceReport();
        
        console.log('📊 Performance Report:');
        console.log('='.repeat(50));
        console.log(`Total Operations: ${report.summary.totalOperations}`);
        console.log(`Avg Duration: ${report.summary.averageOperationDuration}ms`);
        console.log(`Cache Hit Rate: ${report.summary.cacheHitRate}%`);
        console.log(`System Health: ${report.systemHealth.healthStatus}`);
        
        if (report.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            report.recommendations.forEach((rec, i) => {
                console.log(`   ${i+1}. [${rec.priority}] ${rec.message}`);
            });
        }
        
        // Save report
        await monitor.saveReport();
        await monitor.saveMetrics();
    }
    
    runDemo().catch(console.error);
}