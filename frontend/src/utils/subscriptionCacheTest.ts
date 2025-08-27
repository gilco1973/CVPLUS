/**
 * Test utility to demonstrate subscription caching functionality
 * This file can be used for manual testing in browser console
 */

import { getUserSubscription, clearSubscriptionCache } from '../services/paymentService';

/**
 * Test function to demonstrate caching behavior
 * Open browser console and run: window.testSubscriptionCache()
 */
export const testSubscriptionCache = async (userId: string) => {
  console.log('🧪 Testing subscription cache...');
  
  // Clear any existing cache
  clearSubscriptionCache();
  console.log('✅ Cache cleared');
  
  // First call - should hit API and cache result
  console.time('First call (API + Cache)');
  const result1 = await getUserSubscription({ userId });
  console.timeEnd('First call (API + Cache)');
  console.log('📡 First call result:', result1);
  
  // Second call - should return from cache
  console.time('Second call (Cached)');
  const result2 = await getUserSubscription({ userId });
  console.timeEnd('Second call (Cached)');
  console.log('⚡ Second call result (cached):', result2);
  
  // Verify results are the same
  const areEqual = JSON.stringify(result1) === JSON.stringify(result2);
  console.log(`🔍 Results match: ${areEqual}`);
  
  // Check cache expiry simulation
  console.log('⏰ Cache expires after 5 minutes');
  console.log('🗄️ Cache stored in sessionStorage key: cvplus_user_subscription');
  
  return { result1, result2, areEqual };
};

// Expose function globally for browser console testing
declare global {
  interface Window {
    testSubscriptionCache: typeof testSubscriptionCache;
  }
}

if (typeof window !== 'undefined') {
  window.testSubscriptionCache = testSubscriptionCache;
}