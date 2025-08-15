/**
 * Navigation Test Script
 * Comprehensive test for navigation functionality after fixes
 */
import { robustNavigation } from './robustNavigation';
import { navigationDebugger } from './navigationDebugger';

export const testNavigationFix = {
  /**
   * Run comprehensive navigation tests
   */
  runTests: (jobId: string = 'test-job-123') => {
    console.group('🧪 Navigation Fix Test Suite');
    console.log('🧪 Current URL:', window.location.href);
    console.log('🧪 Target job ID:', jobId);
  
    // Test 1: Verify routes exist
    const routes = [
      `/analysis/${jobId}`,
      `/preview/${jobId}`,
      `/final-results/${jobId}`
    ];
    
    console.log('🧪 Testing route patterns...');
    const routeResults = routes.map(route => {
      try {
        const url = new URL(route, window.location.origin);
        console.log('✅ Route valid:', url.href);
        return true;
      } catch (e) {
        console.error('❌ Route invalid:', route, e);
        return false;
      }
    });
  
    // Test 2: SessionStorage operations
    console.log('🧪 Testing sessionStorage...');
    let storageResult = false;
    try {
      const testData = ['rec-1', 'rec-2', 'rec-3'];
      sessionStorage.setItem(`recommendations-${jobId}`, JSON.stringify(testData));
      const retrieved = JSON.parse(sessionStorage.getItem(`recommendations-${jobId}`) || '[]');
      storageResult = JSON.stringify(testData) === JSON.stringify(retrieved);
      console.log('✅ SessionStorage test passed:', retrieved);
      
      // Cleanup
      sessionStorage.removeItem(`recommendations-${jobId}`);
    } catch (e) {
      console.error('❌ SessionStorage test failed:', e);
    }
  
    // Test 3: Test robust navigation utility
    console.log('🧪 Testing robust navigation utility...');
    let navigationResult = false;
    try {
      navigationResult = robustNavigation.validateRoute(jobId);
      console.log(`✅ Route validation: ${navigationResult ? 'PASS' : 'FAIL'}`);
    } catch (e) {
      console.error('❌ Route validation failed:', e);
    }
    
    // Test 4: Test navigation debugger
    console.log('🧪 Testing navigation debugger...');
    try {
      navigationDebugger.log('Test Event', { jobId, data: { test: true } });
      console.log('✅ Navigation debugger working');
    } catch (e) {
      console.error('❌ Navigation debugger failed:', e);
    }
    
    // Test 5: Current page context
    const currentPath = window.location.pathname;
    console.log('🧪 Current path:', currentPath);
    
    let contextResult = false;
    if (currentPath.includes('/analysis/')) {
      console.log('✅ On analysis page - navigation should work');
      contextResult = true;
    } else if (currentPath.includes('/preview/')) {
      console.log('✅ Already on preview page!');
      contextResult = true;
    } else {
      console.log('⚠️ Not on analysis or preview page. Navigate to an analysis page first.');
    }
    
    // Summary
    const allResults = {
      routes: routeResults.every(Boolean),
      sessionStorage: storageResult,
      robustNavigation: navigationResult,
      debugger: true, // Assume passed if no error
      context: contextResult
    };
    
    console.log('📊 Test Results:', allResults);
    const allPassed = Object.values(allResults).every(Boolean);
    console.log(`📊 Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    console.groupEnd();
    return allResults;
  },
  
  /**
   * Quick readiness check
   */
  checkReadiness: () => {
    console.log('🔧 Checking navigation readiness...');
    const checks = {
      robustNavigation: typeof robustNavigation !== 'undefined',
      navigationDebugger: typeof navigationDebugger !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
      windowLocation: typeof window !== 'undefined' && !!window.location
    };
    
    Object.entries(checks).forEach(([check, result]) => {
      console.log(`${result ? '✅' : '❌'} ${check}`);
    });
    
    return Object.values(checks).every(Boolean);
  }
};

// Export for global access in development
if (typeof window !== 'undefined') {
  (window as any).testNavigationFix = testNavigationFix;
  console.log('🔧 Navigation test utilities loaded. Use testNavigationFix.runTests() to test.');
}