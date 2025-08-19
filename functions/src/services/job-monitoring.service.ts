import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Comprehensive job monitoring service for detecting and resolving stuck CV generation jobs
 */
export class JobMonitoringService {
  
  /**
   * Monitor for stuck jobs and apply recovery mechanisms
   */
  static async monitorStuckJobs(): Promise<void> {
    console.log('🔍 Starting stuck job monitoring sweep...');
    
    try {
      const cutoffTime = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
      
      // Query for jobs stuck in 'generating' status for more than 15 minutes
      const stuckJobsQuery = await admin.firestore()
        .collection('jobs')
        .where('status', '==', 'generating')
        .where('generationStartedAt', '<', cutoffTime)
        .limit(50)
        .get();
      
      if (stuckJobsQuery.empty) {
        console.log('✅ No stuck jobs found');
        return;
      }
      
      console.log(`🚨 Found ${stuckJobsQuery.docs.length} potentially stuck jobs`);
      
      // Process each stuck job
      const recoveryPromises = stuckJobsQuery.docs.map(async (doc) => {
        const jobData = doc.data();
        const jobId = doc.id;
        
        console.log(`🔧 Processing stuck job: ${jobId}`);
        
        try {
          await this.recoverStuckJob(jobId, jobData);
        } catch (error) {
          console.error(`❌ Failed to recover stuck job ${jobId}:`, error);
        }
      });
      
      await Promise.allSettled(recoveryPromises);
      console.log('✅ Stuck job monitoring sweep completed');
      
    } catch (error) {
      console.error('❌ Error during stuck job monitoring:', error);
    }
  }
  
  /**
   * Recover a specific stuck job
   */
  private static async recoverStuckJob(jobId: string, jobData: any): Promise<void> {
    const stuckDuration = Date.now() - (jobData.generationStartedAt?.toDate()?.getTime() || 0);
    const stuckMinutes = Math.floor(stuckDuration / (1000 * 60));
    
    console.log(`🔧 Recovering job ${jobId} stuck for ${stuckMinutes} minutes`);
    
    // Analyze job state
    const hasEnhancedFeatures = !!jobData.enhancedFeatures;
    const hasGeneratedCV = !!jobData.generatedCV;
    const selectedFeatures = jobData.selectedFeatures || [];
    
    // Determine recovery strategy based on job state
    if (!hasEnhancedFeatures && selectedFeatures.length > 0) {
      // Job failed before feature processing started
      await this.failJobWithMissingFeatures(jobId, selectedFeatures, stuckMinutes);
    } else if (hasEnhancedFeatures && !hasGeneratedCV) {
      // Job failed during CV generation phase
      await this.failJobWithPartialProcessing(jobId, jobData, stuckMinutes);
    } else if (hasGeneratedCV && hasEnhancedFeatures) {
      // Job appears complete but status wasn't updated
      await this.completeStuckJob(jobId, jobData, stuckMinutes);
    } else {
      // Unknown state - mark as failed
      await this.failJobWithUnknownState(jobId, stuckMinutes);
    }
  }
  
  /**
   * Fail job that never started feature processing
   */
  private static async failJobWithMissingFeatures(
    jobId: string, 
    selectedFeatures: string[], 
    stuckMinutes: number
  ): Promise<void> {
    console.log(`🔴 Failing job ${jobId} - feature processing never started`);
    
    const enhancedFeatures: Record<string, any> = {};
    for (const feature of selectedFeatures) {
      enhancedFeatures[feature] = {
        status: 'failed',
        error: `Job stuck for ${stuckMinutes} minutes - feature processing never started`,
        failureTimestamp: FieldValue.serverTimestamp(),
        retryable: true
      };
    }
    
    await admin.firestore().collection('jobs').doc(jobId).update({
      status: 'failed',
      error: `Job stuck in generating status for ${stuckMinutes} minutes - feature processing never started`,
      enhancedFeatures: enhancedFeatures,
      recoveredAt: FieldValue.serverTimestamp(),
      recoveryReason: 'missing_features_initialization',
      updatedAt: FieldValue.serverTimestamp()
    });
  }
  
  /**
   * Fail job that had partial processing
   */
  private static async failJobWithPartialProcessing(
    jobId: string, 
    jobData: any, 
    stuckMinutes: number
  ): Promise<void> {
    console.log(`🟠 Failing job ${jobId} - partial processing detected`);
    
    // Count feature processing status
    const enhancedFeatures = jobData.enhancedFeatures || {};
    let completedCount = 0;
    let failedCount = 0;
    let processingCount = 0;
    
    for (const [featureName, featureData] of Object.entries(enhancedFeatures)) {
      const feature = featureData as any;
      if (feature.status === 'completed') completedCount++;
      else if (feature.status === 'failed') failedCount++;
      else if (feature.status === 'processing') processingCount++;
    }
    
    await admin.firestore().collection('jobs').doc(jobId).update({
      status: 'failed',
      error: `Job stuck for ${stuckMinutes} minutes during CV generation phase. Features: ${completedCount} completed, ${failedCount} failed, ${processingCount} stuck`,
      recoveredAt: FieldValue.serverTimestamp(),
      recoveryReason: 'partial_processing_timeout',
      featureProcessingSummary: {
        completed: completedCount,
        failed: failedCount,
        processing: processingCount,
        recoveryTimestamp: FieldValue.serverTimestamp()
      },
      updatedAt: FieldValue.serverTimestamp()
    });
  }
  
  /**
   * Complete job that appears finished but wasn't marked complete
   */
  private static async completeStuckJob(
    jobId: string, 
    jobData: any, 
    stuckMinutes: number
  ): Promise<void> {
    console.log(`🟢 Completing job ${jobId} - appears finished but status not updated`);
    
    await admin.firestore().collection('jobs').doc(jobId).update({
      status: 'completed',
      recoveredAt: FieldValue.serverTimestamp(),
      recoveryReason: 'status_update_missed',
      recoveryNote: `Job was stuck for ${stuckMinutes} minutes but appeared complete - status updated by recovery system`,
      updatedAt: FieldValue.serverTimestamp()
    });
  }
  
  /**
   * Fail job with unknown state
   */
  private static async failJobWithUnknownState(
    jobId: string, 
    stuckMinutes: number
  ): Promise<void> {
    console.log(`🔴 Failing job ${jobId} - unknown state`);
    
    await admin.firestore().collection('jobs').doc(jobId).update({
      status: 'failed',
      error: `Job stuck for ${stuckMinutes} minutes in unknown state - unable to determine processing phase`,
      recoveredAt: FieldValue.serverTimestamp(),
      recoveryReason: 'unknown_state_timeout',
      updatedAt: FieldValue.serverTimestamp()
    });
  }
  
  /**
   * Get job processing statistics for monitoring dashboard
   */
  static async getJobProcessingStats(): Promise<any> {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Get job counts by status
      const [completed, failed, generating, pending] = await Promise.all([
        admin.firestore().collection('jobs')
          .where('status', '==', 'completed')
          .where('updatedAt', '>=', last24Hours)
          .count().get(),
        admin.firestore().collection('jobs')
          .where('status', '==', 'failed')
          .where('updatedAt', '>=', last24Hours)
          .count().get(),
        admin.firestore().collection('jobs')
          .where('status', '==', 'generating')
          .count().get(),
        admin.firestore().collection('jobs')
          .where('status', '==', 'pending')
          .count().get()
      ]);
      
      const stats = {
        last24Hours: {
          completed: completed.data().count,
          failed: failed.data().count,
          successRate: completed.data().count / (completed.data().count + failed.data().count) * 100 || 0
        },
        current: {
          generating: generating.data().count,
          pending: pending.data().count
        },
        timestamp: new Date().toISOString()
      };
      
      console.log('📊 Job Processing Stats:', JSON.stringify(stats, null, 2));
      return stats;
      
    } catch (error) {
      console.error('❌ Error getting job processing stats:', error);
      return null;
    }
  }
  
  /**
   * Log detailed information about a specific job for debugging
   */
  static async logJobDetails(jobId: string): Promise<void> {
    try {
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      
      if (!jobDoc.exists) {
        console.log(`❌ Job ${jobId} not found`);
        return;
      }
      
      const jobData = jobDoc.data();
      
      console.log(`
🔍 DETAILED JOB ANALYSIS for ${jobId}:
📊 Status: ${jobData?.status}
⏰ Created: ${jobData?.createdAt?.toDate()?.toISOString() || 'Unknown'}
🚀 Generation Started: ${jobData?.generationStartedAt?.toDate()?.toISOString() || 'Not started'}
📝 Last Updated: ${jobData?.updatedAt?.toDate()?.toISOString() || 'Unknown'}

🎯 Selected Features: ${JSON.stringify(jobData?.selectedFeatures || [])}
🏗️ Enhanced Features Status:
${jobData?.enhancedFeatures ? Object.entries(jobData.enhancedFeatures)
  .map(([name, data]: [string, any]) => `  - ${name}: ${data.status} (${data.progress || 0}%)`)
  .join('\n') : '  None'}

📄 Generated CV: ${jobData?.generatedCV ? 'Available' : 'Missing'}
📈 Processing Summary: ${JSON.stringify(jobData?.featureProcessingSummary || 'None')}
🔧 Recovery Info: ${JSON.stringify(jobData?.recoveryInfo || 'None')}
      `);
      
    } catch (error) {
      console.error(`❌ Error logging job details for ${jobId}:`, error);
    }
  }
}