/**
 * Progressive Enhancement Manager Hook
 * 
 * Manages the progressive enhancement of CV features by:
 * - Fetching base HTML content from Firebase Storage
 * - Calling legacy Firebase Functions progressively
 * - Tracking progress of each feature generation
 * - Merging completed feature HTML into base HTML
 * - Providing real-time status updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { ref, getDownloadURL } from 'firebase/storage';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { functions, storage, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export interface FeatureProgress {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  html?: string;
  timestamp?: number;
}

export interface ProgressiveEnhancementState {
  baseHtml: string | null;
  currentHtml: string | null;
  features: FeatureProgress[];
  overallProgress: number;
  isLoading: boolean;
  isComplete: boolean;
  error: string | null;
}

export interface UseProgressiveEnhancementOptions {
  jobId: string;
  selectedFeatures: string[];
  autoStart?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

// Legacy Firebase Functions mapping
const LEGACY_FUNCTIONS: Record<string, string> = {
  'skills-visualization': 'generateSkillsVisualization',
  'certification-badges': 'generateCertificationBadges',
  'calendar-events': 'generateCalendarEvents',
  'timeline': 'generateTimeline',
  'language-visualization': 'generateLanguageVisualization',
  'portfolio-gallery': 'generatePortfolioGallery',
  'video-introduction': 'generateVideoIntroduction'
};

// Feature display names
const FEATURE_NAMES: Record<string, string> = {
  'skills-visualization': 'Skills Visualization',
  'certification-badges': 'Certification Badges',
  'calendar-events': 'Calendar Integration',
  'timeline': 'Interactive Timeline',
  'language-visualization': 'Language Proficiency',
  'portfolio-gallery': 'Portfolio Gallery',
  'video-introduction': 'Video Introduction'
};

export function useProgressiveEnhancement({
  jobId,
  selectedFeatures,
  autoStart = true,
  retryAttempts = 3,
  retryDelay = 2000
}: UseProgressiveEnhancementOptions) {
  const { user } = useAuth();
  const [state, setState] = useState<ProgressiveEnhancementState>({
    baseHtml: null,
    currentHtml: null,
    features: [],
    overallProgress: 0,
    isLoading: false,
    isComplete: false,
    error: null
  });

  const retryCountRef = useRef<Record<string, number>>({});
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize feature progress tracking
  const initializeFeatures = useCallback(() => {
    const features: FeatureProgress[] = selectedFeatures.map(featureId => ({
      id: featureId,
      name: FEATURE_NAMES[featureId] || featureId,
      status: 'pending',
      progress: 0
    }));

    setState(prev => ({
      ...prev,
      features,
      overallProgress: 0,
      isComplete: false
    }));

    return features;
  }, [selectedFeatures]);

  // Fetch base HTML content from Firebase Storage
  const fetchBaseHtml = useCallback(async (): Promise<string> => {
    try {
      const storageRef = ref(storage, `users/${user?.uid}/generated/${jobId}/cv.html`);
      const downloadUrl = await getDownloadURL(storageRef);
      
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch HTML: ${response.status} ${response.statusText}`);
      }
      
      const html = await response.text();
      console.log('✅ Base HTML fetched successfully');
      
      return html;
    } catch (error) {
      console.error('❌ Error fetching base HTML:', error);
      throw new Error('Failed to load base CV content');
    }
  }, [jobId, user?.uid]);

  // Call legacy Firebase Function for specific feature
  const callLegacyFunction = useCallback(async (featureId: string): Promise<string> => {
    const functionName = LEGACY_FUNCTIONS[featureId];
    if (!functionName) {
      throw new Error(`Unknown feature: ${featureId}`);
    }

    try {
      console.log(`🚀 Calling ${functionName} for feature: ${featureId}`);
      
      const callable = httpsCallable(functions, functionName);
      const result = await callable({ jobId, featureId });
      
      const data = result.data as any;
      if (!data.success) {
        throw new Error(data.error || `${functionName} failed`);
      }

      console.log(`✅ ${functionName} completed successfully`);
      return data.html || '';
    } catch (error: any) {
      console.error(`❌ Error calling ${functionName}:`, error);
      throw new Error(error.message || `Failed to generate ${featureId}`);
    }
  }, [jobId]);

  // Merge feature HTML into base HTML
  const mergeFeatureHtml = useCallback((baseHtml: string, featureHtml: string, featureId: string): string => {
    try {
      if (!featureHtml.trim()) {
        return baseHtml;
      }

      // Simple merge strategy - append feature HTML before closing body tag
      const bodyCloseIndex = baseHtml.lastIndexOf('</body>');
      if (bodyCloseIndex === -1) {
        // Fallback: append to end
        return baseHtml + '\n' + featureHtml;
      }

      const beforeBody = baseHtml.substring(0, bodyCloseIndex);
      const afterBody = baseHtml.substring(bodyCloseIndex);

      // Wrap feature HTML in a container
      const wrappedFeatureHtml = `
        <div class="progressive-feature" data-feature="${featureId}">
          ${featureHtml}
        </div>
      `;

      return beforeBody + wrappedFeatureHtml + '\n' + afterBody;
    } catch (error) {
      console.error(`❌ Error merging feature HTML for ${featureId}:`, error);
      return baseHtml; // Return base HTML if merge fails
    }
  }, []);

  // Update feature progress
  const updateFeatureProgress = useCallback((featureId: string, updates: Partial<FeatureProgress>) => {
    setState(prev => {
      const features = prev.features.map(feature =>
        feature.id === featureId ? { ...feature, ...updates, timestamp: Date.now() } : feature
      );

      // Calculate overall progress
      const totalFeatures = features.length;
      const completedFeatures = features.filter(f => f.status === 'completed').length;
      const overallProgress = totalFeatures > 0 ? (completedFeatures / totalFeatures) * 100 : 0;
      const isComplete = completedFeatures === totalFeatures;

      return {
        ...prev,
        features,
        overallProgress,
        isComplete
      };
    });
  }, []);

  // Process single feature with retry logic
  const processFeature = useCallback(async (featureId: string) => {
    const retryKey = featureId;
    retryCountRef.current[retryKey] = retryCountRef.current[retryKey] || 0;

    try {
      updateFeatureProgress(featureId, { status: 'processing', progress: 25 });

      const featureHtml = await callLegacyFunction(featureId);
      updateFeatureProgress(featureId, { progress: 75 });

      // Merge with current HTML
      setState(prev => {
        const newHtml = mergeFeatureHtml(prev.currentHtml || prev.baseHtml || '', featureHtml, featureId);
        return {
          ...prev,
          currentHtml: newHtml
        };
      });

      updateFeatureProgress(featureId, { 
        status: 'completed', 
        progress: 100, 
        html: featureHtml 
      });

      // Reset retry count on success
      delete retryCountRef.current[retryKey];

      toast.success(`${FEATURE_NAMES[featureId]} added successfully!`);
    } catch (error: any) {
      console.error(`❌ Error processing feature ${featureId}:`, error);

      const currentRetries = retryCountRef.current[retryKey];
      if (currentRetries < retryAttempts) {
        retryCountRef.current[retryKey] = currentRetries + 1;
        console.log(`🔄 Retrying ${featureId} (attempt ${currentRetries + 1}/${retryAttempts})`);
        
        setTimeout(() => {
          processFeature(featureId);
        }, retryDelay * (currentRetries + 1)); // Exponential backoff
      } else {
        updateFeatureProgress(featureId, { 
          status: 'failed', 
          error: error.message 
        });
        toast.error(`Failed to generate ${FEATURE_NAMES[featureId]}`);
        delete retryCountRef.current[retryKey];
      }
    }
  }, [callLegacyFunction, mergeFeatureHtml, updateFeatureProgress, retryAttempts, retryDelay]);

  // Start progressive enhancement process
  const startEnhancement = useCallback(async () => {
    if (!user || !jobId || selectedFeatures.length === 0) {
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Initialize features
      const features = initializeFeatures();
      
      // Fetch base HTML
      const baseHtml = await fetchBaseHtml();
      setState(prev => ({
        ...prev,
        baseHtml,
        currentHtml: baseHtml,
        isLoading: false
      }));

      // Process features sequentially to avoid overwhelming the backend
      for (const featureId of selectedFeatures) {
        await processFeature(featureId);
        // Small delay between features
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error: any) {
      console.error('❌ Error starting progressive enhancement:', error);
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
      toast.error('Failed to start CV enhancement');
    }
  }, [user, jobId, selectedFeatures, initializeFeatures, fetchBaseHtml, processFeature]);

  // Set up Firestore real-time subscription for progress tracking
  useEffect(() => {
    if (!user || !jobId) {
      return;
    }

    const progressDocRef = doc(db, 'jobs', jobId, 'progress', 'enhancement');
    
    const unsubscribe = onSnapshot(progressDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        console.log('📊 Progress update from Firestore:', data);
        
        // Update progress based on Firestore data
        if (data.features) {
          setState(prev => ({
            ...prev,
            features: prev.features.map(feature => {
              const firestoreFeature = data.features[feature.id];
              return firestoreFeature ? { ...feature, ...firestoreFeature } : feature;
            })
          }));
        }
      }
    }, (error) => {
      console.error('❌ Error listening to progress updates:', error);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
    };
  }, [user, jobId]);

  // Auto-start enhancement if enabled
  useEffect(() => {
    if (autoStart && selectedFeatures.length > 0) {
      startEnhancement();
    }
  }, [autoStart, selectedFeatures, startEnhancement]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Public API
  return {
    ...state,
    startEnhancement,
    retryFeature: processFeature,
    isProcessing: state.features.some(f => f.status === 'processing'),
    completedFeatures: state.features.filter(f => f.status === 'completed'),
    failedFeatures: state.features.filter(f => f.status === 'failed'),
    pendingFeatures: state.features.filter(f => f.status === 'pending')
  };
}