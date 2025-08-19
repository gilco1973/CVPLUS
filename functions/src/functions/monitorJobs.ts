import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall } from 'firebase-functions/v2/https';
import { JobMonitoringService } from '../services/job-monitoring.service';
import { corsOptions } from '../config/cors';

/**
 * Scheduled function to monitor and recover stuck CV generation jobs
 * Runs every 10 minutes to check for stuck jobs
 */
export const monitorStuckJobs = onSchedule({
  schedule: 'every 10 minutes',
  timeZone: 'UTC',
  memory: '1GiB',
  timeoutSeconds: 300
}, async (event) => {
  console.log('🔍 Scheduled job monitoring triggered');
  
  try {
    await JobMonitoringService.monitorStuckJobs();
    console.log('✅ Scheduled job monitoring completed successfully');
  } catch (error) {
    console.error('❌ Scheduled job monitoring failed:', error);
  }
});

/**
 * Manual job monitoring trigger for admin use
 */
export const triggerJobMonitoring = onCall({
  memory: '1GiB',
  timeoutSeconds: 300,
  ...corsOptions
}, async (request) => {
  // Verify admin access (you might want to add proper admin check)
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  console.log('🔍 Manual job monitoring triggered by user:', request.auth.uid);
  
  try {
    // Run monitoring
    await JobMonitoringService.monitorStuckJobs();
    
    // Get current stats
    const stats = await JobMonitoringService.getJobProcessingStats();
    
    return {
      success: true,
      message: 'Job monitoring completed successfully',
      stats: stats,
      timestamp: new Date().toISOString()
    };
    
  } catch (error: any) {
    console.error('❌ Manual job monitoring failed:', error);
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
});

/**
 * Get detailed information about a specific job for debugging
 */
export const getJobDetails = onCall({
  memory: '512MiB',
  timeoutSeconds: 30,
  ...corsOptions
}, async (request) => {
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  const { jobId } = request.data;
  
  if (!jobId) {
    throw new Error('jobId is required');
  }
  
  console.log('🔍 Getting job details for:', jobId);
  
  try {
    await JobMonitoringService.logJobDetails(jobId);
    
    return {
      success: true,
      message: `Job details logged for ${jobId}`,
      jobId: jobId,
      timestamp: new Date().toISOString()
    };
    
  } catch (error: any) {
    console.error('❌ Failed to get job details:', error);
    
    return {
      success: false,
      error: error.message,
      jobId: jobId,
      timestamp: new Date().toISOString()
    };
  }
});

/**
 * Get job processing statistics
 */
export const getJobStats = onCall({
  memory: '512MiB',
  timeoutSeconds: 30,
  ...corsOptions
}, async (request) => {
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  console.log('📊 Getting job processing statistics');
  
  try {
    const stats = await JobMonitoringService.getJobProcessingStats();
    
    return {
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    };
    
  } catch (error: any) {
    console.error('❌ Failed to get job stats:', error);
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
});