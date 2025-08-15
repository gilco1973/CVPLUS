/**
 * Test script to verify the duplicate request blocking system
 * This can be used in browser console to test the blocking effectiveness
 */

import { CVAnalyzer } from '../services/cv/CVAnalyzer';
import { recommendationsDebugger } from './debugRecommendations';

export async function testDuplicateBlocking(jobId: string = 'test-job-123') {
  console.log('🧪 Starting duplicate request blocking test...');
  console.log('📝 This test will make multiple simultaneous calls to getRecommendations');
  
  // Clear any existing tracking
  CVAnalyzer.clearRequestTracking();
  recommendationsDebugger.clearHistory();
  
  // Create multiple simultaneous requests
  const promises = [];
  const numRequests = 5;
  
  console.log(`🚀 Making ${numRequests} simultaneous requests...`);
  
  for (let i = 0; i < numRequests; i++) {
    const promise = CVAnalyzer.getRecommendations(jobId, 'Software Engineer', ['JavaScript', 'React'])
      .then(result => ({
        requestIndex: i,
        success: true,
        result: result ? 'Got data' : 'No data',
        timestamp: Date.now()
      }))
      .catch(error => ({
        requestIndex: i,
        success: false,
        error: error.message,
        timestamp: Date.now()
      }));
    
    promises.push(promise);
  }
  
  // Wait for all requests to complete
  console.log('⏳ Waiting for all requests to complete...');
  const results = await Promise.all(promises);
  
  // Get statistics
  const stats = recommendationsDebugger.getStats(jobId);
  const debugInfo = CVAnalyzer.getRequestDebugInfo();
  
  console.log('📊 Test Results:');
  console.log('================');
  console.log(`Total calls made: ${stats.totalCalls}`);
  console.log(`Actual Firebase requests: ${stats.actualCalls}`);
  console.log(`Blocked requests: ${stats.blockedCalls}`);
  console.log(`Blocking effectiveness: ${stats.blockingEffectiveness.toFixed(1)}%`);
  console.log(`Expected result: Only 1 actual request, ${numRequests - 1} blocked`);
  
  console.log('\n🔍 Detailed Results:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    if (result.success && 'result' in result) {
      console.log(`${status} Request ${index + 1}: ${result.result}`);
    } else if (!result.success && 'error' in result) {
      console.log(`${status} Request ${index + 1}: ${result.error}`);
    }
  });
  
  console.log('\n🛠️ Debug Info:');
  console.log('Active requests:', debugInfo.activeRequests);
  console.log('Cached promises:', debugInfo.cachedPromises);
  console.log('Request counts:', debugInfo.requestCounts);
  
  console.log('\n📈 Statistics:');
  console.log(stats);
  
  // Verify the blocking worked
  const success = stats.actualCalls === 1 && stats.blockedCalls === numRequests - 1;
  
  if (success) {
    console.log('\n🎉 SUCCESS! Duplicate request blocking is working correctly!');
    console.log(`   ✅ Only ${stats.actualCalls} actual Firebase request made`);
    console.log(`   ✅ ${stats.blockedCalls} duplicate requests were blocked`);
  } else {
    console.log('\n❌ FAILURE! Duplicate request blocking is not working as expected!');
    console.log(`   Expected: 1 actual request, ${numRequests - 1} blocked`);
    console.log(`   Got: ${stats.actualCalls} actual requests, ${stats.blockedCalls} blocked`);
  }
  
  return {
    success,
    stats,
    results,
    debugInfo
  };
}

// Make test function available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testDuplicateBlocking = testDuplicateBlocking;
  
  console.log('🧪 Test function available: window.testDuplicateBlocking()');
  console.log('📝 Usage: testDuplicateBlocking("your-job-id")');
}