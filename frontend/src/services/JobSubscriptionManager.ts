/**
 * Centralized Job Subscription Manager
 * 
 * Prevents excessive Firestore calls by managing a single subscription per jobId
 * and allowing multiple components to subscribe to the same job data.
 */

import { onSnapshot, doc, Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscriptionRateLimiter } from '../utils/rateLimiter';
import type { Job } from './cvService';

interface JobSubscription {
  jobId: string;
  job: Job | null;
  unsubscribe: Unsubscribe;
  callbacks: Set<(job: Job | null) => void>;
  lastUpdate: number;
  errorCount: number;
  isActive: boolean;
}

interface SubscriptionOptions {
  debounceMs?: number;
  maxRetries?: number;
  enableLogging?: boolean;
}

export class JobSubscriptionManager {
  private static instance: JobSubscriptionManager;
  private subscriptions = new Map<string, JobSubscription>();
  private pendingCallbacks = new Map<string, Set<(job: Job | null) => void>>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private readonly defaultOptions: Required<SubscriptionOptions> = {
    debounceMs: 100,
    maxRetries: 3,
    enableLogging: true
  };

  private constructor() {
    // Cleanup inactive subscriptions every 5 minutes
    setInterval(() => this.cleanupInactiveSubscriptions(), 5 * 60 * 1000);
    
    // Log subscription stats every 30 seconds in development
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => this.logSubscriptionStats(), 30 * 1000);
    }
  }

  public static getInstance(): JobSubscriptionManager {
    if (!JobSubscriptionManager.instance) {
      JobSubscriptionManager.instance = new JobSubscriptionManager();
    }
    return JobSubscriptionManager.instance;
  }

  /**
   * Subscribe to job updates with centralized management
   */
  public subscribeToJob(
    jobId: string, 
    callback: (job: Job | null) => void,
    options: SubscriptionOptions = {}
  ): () => void {
    const opts = { ...this.defaultOptions, ...options };
    
    // Check rate limiting
    if (!subscriptionRateLimiter.isAllowed(jobId)) {
      const timeUntilReset = subscriptionRateLimiter.getTimeUntilReset(jobId);
      console.warn(`[JobSubscriptionManager] Rate limit exceeded for job ${jobId}. Try again in ${timeUntilReset}ms`);
      
      // Return a no-op unsubscribe function
      return () => {};
    }
    
    if (opts.enableLogging) {
      console.log(`[JobSubscriptionManager] Subscribing to job: ${jobId}`);
    }
    
    // Record subscription attempt
    subscriptionRateLimiter.recordRequest(jobId, true);

    // Get existing subscription or create new one
    let subscription = this.subscriptions.get(jobId);
    
    if (!subscription) {
      // Create new Firestore subscription
      subscription = this.createNewSubscription(jobId, opts);
      this.subscriptions.set(jobId, subscription);
    }

    // Add callback to subscription
    subscription.callbacks.add(callback);

    // If job data already exists, call callback immediately
    if (subscription.job !== null) {
      this.debouncedCallback(jobId, callback, subscription.job, opts.debounceMs);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribeCallback(jobId, callback, opts.enableLogging);
    };
  }

  /**
   * Get current job data if available (synchronous)
   */
  public getCurrentJob(jobId: string): Job | null {
    const subscription = this.subscriptions.get(jobId);
    return subscription?.job || null;
  }

  /**
   * Check if a job has active subscribers
   */
  public hasActiveSubscribers(jobId: string): boolean {
    const subscription = this.subscriptions.get(jobId);
    return subscription ? subscription.callbacks.size > 0 : false;
  }

  /**
   * Force refresh a job subscription (useful for error recovery)
   */
  public forceRefresh(jobId: string): void {
    const subscription = this.subscriptions.get(jobId);
    if (subscription) {
      console.log(`[JobSubscriptionManager] Force refreshing job: ${jobId}`);
      subscription.errorCount = 0;
      // The onSnapshot listener will automatically fetch latest data
    }
  }

  /**
   * Get subscription statistics (for debugging)
   */
  public getStats(): {
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalCallbacks: number;
    subscriptionsByJob: Record<string, { callbackCount: number; isActive: boolean; errorCount: number }>;
    rateLimitStats: {
      totalKeys: number;
      totalRequests: number;
      activeKeys: string[];
    };
  } {
    const stats = {
      totalSubscriptions: this.subscriptions.size,
      activeSubscriptions: 0,
      totalCallbacks: 0,
      subscriptionsByJob: {} as Record<string, { callbackCount: number; isActive: boolean; errorCount: number }>,
      rateLimitStats: subscriptionRateLimiter.getStats()
    };

    for (const [jobId, subscription] of this.subscriptions) {
      const callbackCount = subscription.callbacks.size;
      const isActive = callbackCount > 0 && subscription.isActive;
      
      if (isActive) {
        stats.activeSubscriptions++;
      }
      
      stats.totalCallbacks += callbackCount;
      stats.subscriptionsByJob[jobId] = {
        callbackCount,
        isActive,
        errorCount: subscription.errorCount
      };
    }

    return stats;
  }

  /**
   * Cleanup all subscriptions (useful for app shutdown)
   */
  public cleanup(): void {
    console.log(`[JobSubscriptionManager] Cleaning up ${this.subscriptions.size} subscriptions`);
    
    for (const subscription of this.subscriptions.values()) {
      subscription.unsubscribe();
    }
    
    this.subscriptions.clear();
    this.pendingCallbacks.clear();
    
    // Clear debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  private createNewSubscription(jobId: string, options: Required<SubscriptionOptions>): JobSubscription {
    if (options.enableLogging) {
      console.log(`[JobSubscriptionManager] Creating new Firestore subscription for job: ${jobId}`);
    }

    const subscription: JobSubscription = {
      jobId,
      job: null,
      unsubscribe: () => {}, // Will be set below
      callbacks: new Set(),
      lastUpdate: Date.now(),
      errorCount: 0,
      isActive: true
    };

    // Create Firestore listener
    const unsubscribe = onSnapshot(
      doc(db, 'jobs', jobId),
      (docSnapshot) => {
        try {
          const jobData = docSnapshot.exists() 
            ? { id: docSnapshot.id, ...docSnapshot.data() } as Job
            : null;

          // Update subscription data
          subscription.job = jobData;
          subscription.lastUpdate = Date.now();
          subscription.errorCount = 0; // Reset error count on success

          if (options.enableLogging && docSnapshot.exists()) {
            console.log(`[JobSubscriptionManager] Job update for ${jobId}:`, docSnapshot.data()?.status);
          }

          // Notify all callbacks with debouncing
          for (const callback of subscription.callbacks) {
            this.debouncedCallback(jobId, callback, jobData, options.debounceMs);
          }
        } catch (error) {
          console.error(`[JobSubscriptionManager] Error processing job update for ${jobId}:`, error);
          subscription.errorCount++;
          
          // If too many errors, mark as inactive
          if (subscription.errorCount >= options.maxRetries) {
            console.warn(`[JobSubscriptionManager] Max errors reached for job ${jobId}, marking as inactive`);
            subscription.isActive = false;
          }
        }
      },
      (error) => {
        console.error(`[JobSubscriptionManager] Firestore error for job ${jobId}:`, error);
        subscription.errorCount++;
        
        if (subscription.errorCount >= options.maxRetries) {
          console.warn(`[JobSubscriptionManager] Max errors reached for job ${jobId}, marking as inactive`);
          subscription.isActive = false;
        }

        // Notify callbacks about the error (pass null)
        for (const callback of subscription.callbacks) {
          try {
            callback(null);
          } catch (callbackError) {
            console.error(`[JobSubscriptionManager] Callback error for job ${jobId}:`, callbackError);
          }
        }
      }
    );

    subscription.unsubscribe = unsubscribe;
    return subscription;
  }

  private unsubscribeCallback(jobId: string, callback: (job: Job | null) => void, enableLogging?: boolean): void {
    const subscription = this.subscriptions.get(jobId);
    
    if (!subscription) {
      return;
    }

    // Remove callback
    subscription.callbacks.delete(callback);

    if (enableLogging) {
      console.log(`[JobSubscriptionManager] Unsubscribed from job: ${jobId}, remaining callbacks: ${subscription.callbacks.size}`);
    }

    // If no more callbacks, cleanup the subscription after a delay
    if (subscription.callbacks.size === 0) {
      // Wait 30 seconds before cleaning up in case component remounts quickly
      setTimeout(() => {
        const currentSubscription = this.subscriptions.get(jobId);
        if (currentSubscription && currentSubscription.callbacks.size === 0) {
          if (enableLogging) {
            console.log(`[JobSubscriptionManager] Cleaning up unused subscription for job: ${jobId}`);
          }
          currentSubscription.unsubscribe();
          this.subscriptions.delete(jobId);
        }
      }, 30000);
    }
  }

  private debouncedCallback(
    jobId: string,
    callback: (job: Job | null) => void,
    jobData: Job | null,
    debounceMs: number
  ): void {
    const key = `${jobId}-${callback.toString()}`;
    
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      try {
        callback(jobData);
      } catch (error) {
        console.error(`[JobSubscriptionManager] Callback execution error for job ${jobId}:`, error);
      } finally {
        this.debounceTimers.delete(key);
      }
    }, debounceMs);

    this.debounceTimers.set(key, timer);
  }

  private cleanupInactiveSubscriptions(): void {
    const now = Date.now();
    const inactivityThreshold = 10 * 60 * 1000; // 10 minutes
    let cleanedCount = 0;

    for (const [jobId, subscription] of this.subscriptions) {
      const isInactive = (
        subscription.callbacks.size === 0 || 
        !subscription.isActive ||
        (now - subscription.lastUpdate) > inactivityThreshold
      );

      if (isInactive) {
        console.log(`[JobSubscriptionManager] Cleaning up inactive subscription for job: ${jobId}`);
        subscription.unsubscribe();
        this.subscriptions.delete(jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[JobSubscriptionManager] Cleaned up ${cleanedCount} inactive subscriptions`);
    }
  }

  private logSubscriptionStats(): void {
    const stats = this.getStats();
    console.log('[JobSubscriptionManager] Stats:', {
      total: stats.totalSubscriptions,
      active: stats.activeSubscriptions,
      callbacks: stats.totalCallbacks,
      details: stats.subscriptionsByJob
    });
  }
}

// Export singleton instance
export const jobSubscriptionManager = JobSubscriptionManager.getInstance();

// Export convenience function for compatibility
export const subscribeToJobCentralized = (
  jobId: string, 
  callback: (job: Job | null) => void,
  options?: SubscriptionOptions
): (() => void) => {
  return jobSubscriptionManager.subscribeToJob(jobId, callback, options);
};

export default JobSubscriptionManager;