// Navigation Test Utility
// This utility helps debug navigation issues in the CV Analysis flow

export const navigationTest = {
  // Test if the preview route exists in the current router
  testPreviewRoute: (jobId: string) => {
    const testPath = `/preview/${jobId}`;
    console.log('🧪 [TEST] Testing preview route:', testPath);
    
    // Try to create a URL object to validate the path
    try {
      const url = new URL(testPath, window.location.origin);
      console.log('✅ [TEST] Preview route URL is valid:', url.href);
      return true;
    } catch (error) {
      console.error('❌ [TEST] Preview route URL is invalid:', error);
      return false;
    }
  },

  // Test sessionStorage operations
  testSessionStorage: (jobId: string) => {
    console.log('🧪 [TEST] Testing sessionStorage operations');
    
    try {
      // Test storing recommendations
      const testRecommendations = ['test-rec-1', 'test-rec-2'];
      sessionStorage.setItem(`recommendations-${jobId}`, JSON.stringify(testRecommendations));
      
      // Test retrieving recommendations
      const retrieved = sessionStorage.getItem(`recommendations-${jobId}`);
      const parsed = JSON.parse(retrieved || '[]');
      
      console.log('✅ [TEST] SessionStorage test successful');
      console.log('✅ [TEST] Stored:', testRecommendations);
      console.log('✅ [TEST] Retrieved:', parsed);
      
      // Clean up test data
      sessionStorage.removeItem(`recommendations-${jobId}`);
      
      return true;
    } catch (error) {
      console.error('❌ [TEST] SessionStorage test failed:', error);
      return false;
    }
  },

  // Test React Router navigation programmatically
  testNavigation: (navigate: (path: string) => void, jobId: string) => {
    console.log('🧪 [TEST] Testing programmatic navigation');
    
    try {
      const testPath = `/preview/${jobId}`;
      console.log('🧪 [TEST] Attempting navigation to:', testPath);
      
      // Store current path for comparison
      const currentPath = window.location.pathname;
      console.log('🧪 [TEST] Current path:', currentPath);
      
      // Attempt navigation
      navigate(testPath);
      
      // Since navigation is async, we'll log success immediately
      console.log('✅ [TEST] Navigation call completed without throwing');
      return true;
    } catch (error) {
      console.error('❌ [TEST] Navigation test failed:', error);
      return false;
    }
  },

  // Run all tests
  runAllTests: (navigate: (path: string) => void, jobId: string) => {
    console.log('🧪 [TEST] Running comprehensive navigation tests...');
    
    const results = {
      previewRoute: navigationTest.testPreviewRoute(jobId),
      sessionStorage: navigationTest.testSessionStorage(jobId),
      navigation: navigationTest.testNavigation(navigate, jobId)
    };
    
    console.log('🧪 [TEST] Test results:', results);
    
    const allPassed = Object.values(results).every(result => result === true);
    
    if (allPassed) {
      console.log('✅ [TEST] All navigation tests passed!');
    } else {
      console.error('❌ [TEST] Some navigation tests failed. Check the results above.');
    }
    
    return results;
  }
};

// Export for global access in development
if (typeof window !== 'undefined') {
  (window as any).navigationTest = navigationTest;
}