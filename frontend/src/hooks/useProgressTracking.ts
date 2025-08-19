import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FeatureConfig } from '../config/featureConfigs';
import { FeatureProgress } from '../components/final-results/FeatureProgressCard';

// Progress state type
export interface ProgressState {
  [featureId: string]: FeatureProgress;
}

// Progress tracking hook
export const useProgressTracking = (jobId: string, features: FeatureConfig[]) => {
  const [progressState, setProgressState] = useState<ProgressState>({});
  const [progressUnsubscribe, setProgressUnsubscribe] = useState<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (progressUnsubscribe) {
        progressUnsubscribe();
      }
    };
  }, [progressUnsubscribe]);

  const setupProgressTracking = (trackingFeatures: FeatureConfig[]) => {
    console.log('📡 [DEBUG] Setting up progress tracking for job:', jobId);
    console.log('📡 [DEBUG] Tracking features:', trackingFeatures.map(f => ({ id: f.id, name: f.name })));
    
    const jobRef = doc(db, 'jobs', jobId);
    const unsubscribe = onSnapshot(jobRef, (doc) => {
      if (!doc.exists() || !isMountedRef.current) {
        console.log('📡 [DEBUG] Document does not exist or component unmounted');
        return;
      }
      
      const data = doc.data();
      const enhancedFeatures = data.enhancedFeatures || {};
      
      // Update progress state
      const newProgressState: ProgressState = {};
      let updatedFeatures = 0;
      
      trackingFeatures.forEach(feature => {
        const featureData = enhancedFeatures[feature.id];
        
        if (featureData) {
          updatedFeatures++;
          // Safe handling of featureData
          const safeFeatureData: FeatureProgress = {
            status: featureData.status || 'pending',
            progress: featureData.progress || 0,
            currentStep: featureData.currentStep,
            error: featureData.error,
            htmlFragment: featureData.htmlFragment,
            processedAt: featureData.processedAt
          };
          
          // Ensure no arrays are mishandled as objects
          if (Array.isArray(featureData)) {
            console.warn(`⚠️ [DEBUG] Feature ${feature.id} data is unexpectedly an array:`, featureData);
            safeFeatureData.status = 'failed';
            safeFeatureData.error = 'Invalid data structure received';
          }
          
          newProgressState[feature.id] = safeFeatureData;
        } else {
          newProgressState[feature.id] = {
            status: 'pending',
            progress: 0
          };
        }
      });
      
      console.log(`📡 [DEBUG] Progress update: ${updatedFeatures}/${trackingFeatures.length} features have data`);
      setProgressState(newProgressState);
      
    }, (error) => {
      console.error('❌ [DEBUG] Progress tracking error:', error);
    });
    
    setProgressUnsubscribe(() => unsubscribe);
  };

  // Initialize progress state for features
  useEffect(() => {
    if (features.length > 0) {
      const initialProgress: ProgressState = {};
      features.forEach(feature => {
        initialProgress[feature.id] = {
          status: 'pending',
          progress: 0
        };
      });
      setProgressState(initialProgress);
      setupProgressTracking(features);
    }
  }, [jobId, features]);

  return {
    progressState,
    setupProgressTracking,
    progressUnsubscribe
  };
};