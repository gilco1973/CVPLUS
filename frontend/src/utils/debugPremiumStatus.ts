/**
 * Debug utility to verify premium status consistency between frontend and backend
 * Use this to test the fix for usePremiumStatus hook inconsistency
 */

import { useAuth } from '../contexts/AuthContext';
import { getUserSubscription } from '../services/paymentService';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export const debugPremiumStatusConsistency = async (userId?: string) => {
  const testUserId = userId || 'debug-test-user';
  
  console.group('🔍 PREMIUM STATUS DEBUG - Frontend vs Backend Consistency');
  
  try {
    // Test 1: Frontend getUserSubscription (used by usePremiumStatus)
    console.log('1️⃣ Testing Frontend getUserSubscription...');
    const frontendResult = await getUserSubscription({ userId: testUserId });
    console.log('Frontend Result:', {
      subscriptionStatus: frontendResult.subscriptionStatus,
      lifetimeAccess: frontendResult.lifetimeAccess,
      features: frontendResult.features,
      message: frontendResult.message
    });
    
    // Test 2: Backend getUserSubscription (callable function)
    console.log('2️⃣ Testing Backend getUserSubscription...');
    const getUserSubscriptionFn = httpsCallable(functions, 'getUserSubscription');
    const backendResult = await getUserSubscriptionFn({ userId: testUserId });
    console.log('Backend Result:', {
      subscriptionStatus: backendResult.data.subscriptionStatus,
      lifetimeAccess: backendResult.data.lifetimeAccess,
      features: backendResult.data.features,
      message: backendResult.data.message
    });
    
    // Test 3: Check if results are consistent
    const isConsistent = 
      frontendResult.subscriptionStatus === backendResult.data.subscriptionStatus &&
      frontendResult.lifetimeAccess === backendResult.data.lifetimeAccess;
    
    console.log('3️⃣ Consistency Check:', {
      isConsistent,
      frontendPremium: frontendResult.subscriptionStatus === 'premium' || frontendResult.lifetimeAccess,
      backendPremium: backendResult.data.subscriptionStatus === 'premium' || backendResult.data.lifetimeAccess,
      mismatch: !isConsistent ? 'FOUND INCONSISTENCY' : 'ALL GOOD'
    });
    
    // Test 4: Test actual function that was problematic (getRecommendations)
    // Note: This requires a valid jobId, so we'll skip it in debug mode
    console.log('4️⃣ To test getRecommendations, trigger a CV analysis and check logs for:');
    console.log('   "[getRecommendations] Premium status check for user {userId}:"');
    
    return {
      frontend: frontendResult,
      backend: backendResult.data,
      isConsistent,
      expectedBehavior: isConsistent ? 'Navigation should work correctly' : 'May have navigation issues'
    };
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    throw error;
  } finally {
    console.groupEnd();
  }
};

export const debugPremiumHookBehavior = () => {
  console.group('🪝 PREMIUM HOOK DEBUG - usePremiumStatus Behavior');
  
  console.log('To debug usePremiumStatus hook:');
  console.log('1. Check browser console for hook state updates');
  console.log('2. Look for caching behavior (5-minute cache)');
  console.log('3. Verify refreshStatus() and refreshUsage() work correctly');
  console.log('4. Check if isPremium value changes correctly');
  
  console.log('Expected behavior after fix:');
  console.log('✅ isPremium should be true in development');
  console.log('✅ subscriptionStatus should be "premium"');
  console.log('✅ lifetimeAccess should be true');
  console.log('✅ features should all be true');
  console.log('✅ Navigation should go to role selection, not analysis page');
  
  console.groupEnd();
};

// React hook for debugging in components
export const usePremiumStatusDebugger = () => {
  const { user } = useAuth();
  
  const runDebugTests = async () => {
    if (!user) {
      console.warn('No user logged in for debug tests');
      return;
    }
    
    debugPremiumHookBehavior();
    return await debugPremiumStatusConsistency(user.uid);
  };
  
  return { runDebugTests };
};

// Console helper - call this in browser console to test
(window as any).debugPremiumStatus = debugPremiumStatusConsistency;
(window as any).debugPremiumHook = debugPremiumHookBehavior;

console.log('🛠️ Premium Status Debug Tools Loaded');
console.log('Usage: debugPremiumStatus("userId") or debugPremiumHook()');