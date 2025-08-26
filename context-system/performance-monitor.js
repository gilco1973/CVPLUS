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

    generatePerformanceReport() {
        const now = Date.now();
        const sessionDuration = now - this.startTime;
        
        const report = {
            timestamp: new Date().toISOString(),
            sessionDuration,
            summary: this.calculateSummaryMetrics(),
            contextOperations: this.analyzeContextOperations(),
            cachePerformance: this.analyzeCachePerformance(),
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

        return {
            operationsByType: byType,
            totalOperations: operations.length,
            performanceTrend: 'Stable'
        };
    }

    analyzeCachePerformance() {
        const cacheOps = this.metrics.cachePerformance;
        
        if (cacheOps.length === 0) {
            return { message: 'No cache operations recorded' };
        }

        const hits = cacheOps.filter(c => c.hit).length;
        const misses = cacheOps.length - hits;
        const hitRate = (hits / cacheOps.length) * 100;

        return {
            totalOperations: cacheOps.length,
            hits,
            misses,
            hitRate: Math.round(hitRate * 100) / 100,
            efficiency: hitRate > 80 ? 'Excellent' : hitRate > 60 ? 'Good' : 'Needs Improvement'
        };
    }

    generateRecommendations() {
        const recommendations = [];
        const summary = this.calculateSummaryMetrics();
        
        // Performance recommendations
        if (summary.averageOperationDuration > 5000) {
            recommendations.push({
                type: 'Performance',
                priority: 'High',
                message: 'Average operation duration is high (>5s). Consider optimizing context indexing.',
                action: 'Review and optimize slow operations'
            });
        }

        return recommendations;
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