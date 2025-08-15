/**
 * Test Script for Zero-Tolerance Duplicate Prevention
 * 
 * This script validates that the RequestManager completely eliminates
 * duplicate getRecommendations calls under all scenarios.
 */

import { RequestManager } from '../services/RequestManager';

interface TestResult {
  testName: string;
  passed: boolean;
  details: string;
  duration: number;
  requestCount: number;
  actualCalls: number;
}

class DuplicatePreventionTester {
  private results: TestResult[] = [];
  private mockCallCount = 0;

  /**
   * Mock Firebase function that tracks actual calls
   */
  private createMockExecutor(delay: number = 100, shouldFail: boolean = false) {
    return async () => {
      this.mockCallCount++;
      console.log(`[MockExecutor] Actual call #${this.mockCallCount}`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      if (shouldFail) {
        throw new Error(`Mock error on call #${this.mockCallCount}`);
      }
      
      return {
        data: {
          recommendations: [
            { id: '1', title: 'Test Rec 1', description: 'Test recommendation 1' }
          ]
        },
        callNumber: this.mockCallCount
      };
    };
  }

  /**
   * Test 1: Simultaneous identical requests
   */
  async testSimultaneousRequests(): Promise<TestResult> {
    const startTime = Date.now();
    const requestManager = RequestManager.getInstance();
    const key = 'test-simultaneous';
    
    this.mockCallCount = 0;
    
    // Make 5 simultaneous identical requests
    const promises = Array.from({ length: 5 }, (_, i) => 
      requestManager.executeOnce(
        key,
        this.createMockExecutor(200),
        { context: `simultaneous-${i}` }
      )
    );
    
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    // Verify only 1 actual call was made
    const actualCalls = this.mockCallCount;
    const allSameResult = results.every(r => 
      JSON.stringify(r.data) === JSON.stringify(results[0].data)
    );
    
    const passed = actualCalls === 1 && allSameResult;
    
    return {
      testName: 'Simultaneous Identical Requests',
      passed,
      details: `Expected 1 call, got ${actualCalls}. All results identical: ${allSameResult}`,
      duration,
      requestCount: 5,
      actualCalls
    };
  }

  /**
   * Test 2: Rapid sequential requests
   */
  async testRapidSequentialRequests(): Promise<TestResult> {
    const startTime = Date.now();
    const requestManager = RequestManager.getInstance();
    const key = 'test-sequential';
    
    this.mockCallCount = 0;
    
    // Make 10 rapid sequential requests
    const results = [];
    for (let i = 0; i < 10; i++) {
      const result = await requestManager.executeOnce(
        key,
        this.createMockExecutor(50),
        { context: `sequential-${i}` }
      );
      results.push(result);
    }
    
    const duration = Date.now() - startTime;
    const actualCalls = this.mockCallCount;
    
    // First call should be fresh, rest should be cached
    const freshCount = results.filter(r => !r.wasFromCache).length;
    const cachedCount = results.filter(r => r.wasFromCache).length;
    
    const passed = actualCalls === 1 && freshCount === 1 && cachedCount === 9;
    
    return {
      testName: 'Rapid Sequential Requests',
      passed,
      details: `Expected 1 call, got ${actualCalls}. Fresh: ${freshCount}, Cached: ${cachedCount}`,
      duration,
      requestCount: 10,
      actualCalls
    };
  }

  /**
   * Test 3: Different parameters (should allow multiple calls)
   */
  async testDifferentParameters(): Promise<TestResult> {
    const startTime = Date.now();
    const requestManager = RequestManager.getInstance();
    
    this.mockCallCount = 0;
    
    // Make requests with different parameters
    const requests = [\n      { key: 'test-param-1', context: 'param-1' },\n      { key: 'test-param-2', context: 'param-2' },\n      { key: 'test-param-3', context: 'param-3' }\n    ];\n    \n    const promises = requests.map(({ key, context }) =>\n      requestManager.executeOnce(\n        key,\n        this.createMockExecutor(100),\n        { context }\n      )\n    );\n    \n    const results = await Promise.all(promises);\n    const duration = Date.now() - startTime;\n    const actualCalls = this.mockCallCount;\n    \n    // Should make 3 calls (one for each different key)\n    const passed = actualCalls === 3 && results.every(r => !r.wasFromCache);\n    \n    return {\n      testName: 'Different Parameters',\n      passed,\n      details: `Expected 3 calls, got ${actualCalls}. All fresh requests: ${results.every(r => !r.wasFromCache)}`,\n      duration,\n      requestCount: 3,\n      actualCalls\n    };\n  }\n\n  /**\n   * Test 4: Force regenerate flag\n   */\n  async testForceRegenerate(): Promise<TestResult> {\n    const startTime = Date.now();\n    const requestManager = RequestManager.getInstance();\n    const key = 'test-force-regen';\n    \n    this.mockCallCount = 0;\n    \n    // First call (normal)\n    const result1 = await requestManager.executeOnce(\n      key,\n      this.createMockExecutor(100),\n      { context: 'normal' }\n    );\n    \n    // Second call (should be cached)\n    const result2 = await requestManager.executeOnce(\n      key,\n      this.createMockExecutor(100),\n      { context: 'cached' }\n    );\n    \n    // Third call (force regenerate)\n    const result3 = await requestManager.executeOnce(\n      key,\n      this.createMockExecutor(100),\n      { context: 'force-regen', forceRegenerate: true }\n    );\n    \n    const duration = Date.now() - startTime;\n    const actualCalls = this.mockCallCount;\n    \n    // Should make 2 calls (normal + force regenerate)\n    const passed = actualCalls === 2 && \n                  !result1.wasFromCache && \n                  result2.wasFromCache && \n                  !result3.wasFromCache;\n    \n    return {\n      testName: 'Force Regenerate Flag',\n      passed,\n      details: `Expected 2 calls, got ${actualCalls}. Cache pattern: fresh->cached->fresh = ${!result1.wasFromCache}->${result2.wasFromCache}->${!result3.wasFromCache}`,\n      duration,\n      requestCount: 3,\n      actualCalls\n    };\n  }\n\n  /**\n   * Test 5: Error handling\n   */\n  async testErrorHandling(): Promise<TestResult> {\n    const startTime = Date.now();\n    const requestManager = RequestManager.getInstance();\n    const key = 'test-error';\n    \n    this.mockCallCount = 0;\n    \n    let errorCaught = false;\n    let retrySucceeded = false;\n    \n    try {\n      // First call should fail\n      await requestManager.executeOnce(\n        key,\n        this.createMockExecutor(100, true), // shouldFail = true\n        { context: 'failing-call' }\n      );\n    } catch (error) {\n      errorCaught = true;\n    }\n    \n    try {\n      // Retry should work (not cached due to error)\n      const retryResult = await requestManager.executeOnce(\n        key,\n        this.createMockExecutor(100, false), // shouldFail = false\n        { context: 'retry-call' }\n      );\n      retrySucceeded = !retryResult.wasFromCache;\n    } catch (error) {\n      // Retry failed\n    }\n    \n    const duration = Date.now() - startTime;\n    const actualCalls = this.mockCallCount;\n    \n    // Should make 2 calls (failed + retry)\n    const passed = actualCalls === 2 && errorCaught && retrySucceeded;\n    \n    return {\n      testName: 'Error Handling',\n      passed,\n      details: `Expected 2 calls, got ${actualCalls}. Error caught: ${errorCaught}, Retry succeeded: ${retrySucceeded}`,\n      duration,\n      requestCount: 2,\n      actualCalls\n    };\n  }\n\n  /**\n   * Test 6: Cache expiration\n   */\n  async testCacheExpiration(): Promise<TestResult> {\n    const startTime = Date.now();\n    const requestManager = RequestManager.getInstance();\n    const key = 'test-cache-expiry';\n    \n    // Temporarily reduce cache duration for testing\n    const originalCacheDuration = (requestManager as any).CACHE_DURATION;\n    (requestManager as any).CACHE_DURATION = 200; // 200ms\n    \n    this.mockCallCount = 0;\n    \n    try {\n      // First call\n      const result1 = await requestManager.executeOnce(\n        key,\n        this.createMockExecutor(50),\n        { context: 'initial' }\n      );\n      \n      // Wait for cache to expire\n      await new Promise(resolve => setTimeout(resolve, 250));\n      \n      // Second call (cache should be expired)\n      const result2 = await requestManager.executeOnce(\n        key,\n        this.createMockExecutor(50),\n        { context: 'after-expiry' }\n      );\n      \n      const duration = Date.now() - startTime;\n      const actualCalls = this.mockCallCount;\n      \n      // Should make 2 calls due to cache expiration\n      const passed = actualCalls === 2 && \n                    !result1.wasFromCache && \n                    !result2.wasFromCache;\n      \n      return {\n        testName: 'Cache Expiration',\n        passed,\n        details: `Expected 2 calls, got ${actualCalls}. Both fresh: ${!result1.wasFromCache && !result2.wasFromCache}`,\n        duration,\n        requestCount: 2,\n        actualCalls\n      };\n    } finally {\n      // Restore original cache duration\n      (requestManager as any).CACHE_DURATION = originalCacheDuration;\n    }\n  }\n\n  /**\n   * Run all tests\n   */\n  async runAllTests(): Promise<void> {\n    console.log('🧪 Starting Zero-Tolerance Duplicate Prevention Tests\\n');\n    \n    const tests = [\n      () => this.testSimultaneousRequests(),\n      () => this.testRapidSequentialRequests(),\n      () => this.testDifferentParameters(),\n      () => this.testForceRegenerate(),\n      () => this.testErrorHandling(),\n      () => this.testCacheExpiration()\n    ];\n    \n    for (const test of tests) {\n      try {\n        const result = await test();\n        this.results.push(result);\n        \n        const status = result.passed ? '✅ PASS' : '❌ FAIL';\n        console.log(`${status} ${result.testName}`);\n        console.log(`   Details: ${result.details}`);\n        console.log(`   Duration: ${result.duration}ms`);\n        console.log(`   Requests: ${result.requestCount}, Actual calls: ${result.actualCalls}\\n`);\n      } catch (error) {\n        console.error(`❌ ERROR ${test.name}:`, error);\n        this.results.push({\n          testName: test.name || 'Unknown Test',\n          passed: false,\n          details: `Test error: ${error instanceof Error ? error.message : String(error)}`,\n          duration: 0,\n          requestCount: 0,\n          actualCalls: 0\n        });\n      }\n    }\n    \n    this.printSummary();\n  }\n\n  /**\n   * Print test summary\n   */\n  private printSummary(): void {\n    const passed = this.results.filter(r => r.passed).length;\n    const total = this.results.length;\n    const totalRequests = this.results.reduce((sum, r) => sum + r.requestCount, 0);\n    const totalActualCalls = this.results.reduce((sum, r) => sum + r.actualCalls, 0);\n    \n    console.log('📊 TEST SUMMARY');\n    console.log('================');\n    console.log(`Tests passed: ${passed}/${total}`);\n    console.log(`Total requests made: ${totalRequests}`);\n    console.log(`Total actual calls: ${totalActualCalls}`);\n    console.log(`Duplicate prevention ratio: ${((totalRequests - totalActualCalls) / totalRequests * 100).toFixed(1)}%`);\n    \n    if (passed === total) {\n      console.log('\\n🎉 ALL TESTS PASSED - Zero-tolerance duplicate prevention is working!');\n    } else {\n      console.log('\\n⚠️  Some tests failed - check the implementation');\n      \n      const failed = this.results.filter(r => !r.passed);\n      console.log('\\nFailed tests:');\n      failed.forEach(test => {\n        console.log(`- ${test.testName}: ${test.details}`);\n      });\n    }\n  }\n}\n\n// Export for use in browser console or other scripts\nexport { DuplicatePreventionTester };\n\n// Auto-run if loaded as a module\nif (typeof window !== 'undefined') {\n  // @ts-ignore\n  window.testDuplicatePrevention = async () => {\n    const tester = new DuplicatePreventionTester();\n    await tester.runAllTests();\n  };\n  \n  console.log('[DuplicatePreventionTester] Test available at window.testDuplicatePrevention()');\n}"