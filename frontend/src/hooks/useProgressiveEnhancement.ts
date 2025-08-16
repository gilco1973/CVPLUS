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
import { performanceMonitorService } from '../services/enhancement/performance-monitor.service';
import { cssOptimizerService } from '../services/enhancement/css-optimizer.service';
import { htmlValidatorService } from '../services/enhancement/html-validator.service';
import { errorRecoveryService } from '../services/enhancement/error-recovery.service';
import { featurePriorityService } from '../services/enhancement/feature-priority.service';

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
  'calendar-integration': 'generateCalendarEvents',
  'interactive-timeline': 'generateTimeline',
  'language-proficiency': 'generateLanguageVisualization',
  'portfolio-gallery': 'generatePortfolioGallery',
  'video-introduction': 'generateVideoIntroduction',
  'generate-podcast': 'generatePodcast'
};

// Feature display names
const FEATURE_NAMES: Record<string, string> = {
  'skills-visualization': 'Skills Visualization',
  'certification-badges': 'Certification Badges',
  'calendar-integration': 'Calendar Integration',
  'interactive-timeline': 'Interactive Timeline',
  'language-proficiency': 'Language Proficiency',
  'portfolio-gallery': 'Portfolio Gallery',
  'video-introduction': 'Video Introduction',
  'generate-podcast': 'Career Podcast'
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

  // Advanced HTML merging with feature-specific strategies
  const mergeFeatureHtml = useCallback((baseHtml: string, featureHtml: string, featureId: string): string => {
    try {
      if (!featureHtml.trim()) {
        return baseHtml;
      }

      // Feature-specific merge strategies
      const mergeStrategy = getMergeStrategy(featureId);
      
      switch (mergeStrategy.type) {
        case 'replace-section':
          return replaceSectionMerge(baseHtml, featureHtml, featureId, mergeStrategy);
        case 'insert-after':
          return insertAfterMerge(baseHtml, featureHtml, featureId, mergeStrategy);
        case 'insert-before':
          return insertBeforeMerge(baseHtml, featureHtml, featureId, mergeStrategy);
        case 'append-body':
        default:
          return appendToBodyMerge(baseHtml, featureHtml, featureId);
      }
    } catch (error) {
      console.error(`❌ Error merging feature HTML for ${featureId}:`, error);
      return baseHtml; // Return base HTML if merge fails
    }
  }, []);

  // Get merge strategy for specific feature
  const getMergeStrategy = (featureId: string) => {
    const strategies: Record<string, any> = {
      'skills-visualization': {
        type: 'insert-after',
        target: '<section class="summary"',
        fallback: 'append-body'
      },
      'certification-badges': {
        type: 'insert-after',
        target: '<section class="education"',
        fallback: 'append-body'
      },
      'calendar-integration': {
        type: 'insert-after',
        target: '<section class="experience"',
        fallback: 'append-body'
      },
      'interactive-timeline': {
        type: 'replace-section',
        target: '<section class="experience"',
        endTarget: '</section>',
        fallback: 'append-body'
      },
      'language-proficiency': {
        type: 'insert-after',
        target: '<section class="skills"',
        fallback: 'append-body'
      },
      'portfolio-gallery': {
        type: 'insert-before',
        target: '<footer',
        fallback: 'append-body'
      },
      'video-introduction': {
        type: 'insert-after',
        target: '<header',
        fallback: 'append-body'
      },
      'generate-podcast': {
        type: 'insert-before',
        target: '<footer',
        fallback: 'append-body'
      }
    };

    return strategies[featureId] || { type: 'append-body' };
  };

  // Replace section merge strategy
  const replaceSectionMerge = (baseHtml: string, featureHtml: string, featureId: string, strategy: any): string => {
    const startIndex = baseHtml.indexOf(strategy.target);
    if (startIndex === -1) {
      return appendToBodyMerge(baseHtml, featureHtml, featureId);
    }

    const endIndex = baseHtml.indexOf(strategy.endTarget, startIndex);
    if (endIndex === -1) {
      return appendToBodyMerge(baseHtml, featureHtml, featureId);
    }

    const beforeSection = baseHtml.substring(0, startIndex);
    const afterSection = baseHtml.substring(endIndex + strategy.endTarget.length);

    const wrappedFeatureHtml = `
      <div class="progressive-feature progressive-replacement" data-feature="${featureId}" data-replaced-section="true">
        ${featureHtml}
      </div>
    `;

    return beforeSection + wrappedFeatureHtml + afterSection;
  };

  // Insert after target merge strategy
  const insertAfterMerge = (baseHtml: string, featureHtml: string, featureId: string, strategy: any): string => {
    const targetIndex = baseHtml.indexOf(strategy.target);
    if (targetIndex === -1) {
      return appendToBodyMerge(baseHtml, featureHtml, featureId);
    }

    // Find the end of the target section
    const sectionStart = targetIndex;
    let sectionEnd = baseHtml.indexOf('</section>', sectionStart);
    if (sectionEnd === -1) {
      sectionEnd = baseHtml.indexOf('<section', sectionStart + 1);
      if (sectionEnd === -1) {
        sectionEnd = baseHtml.indexOf('</main>', sectionStart);
        if (sectionEnd === -1) {
          return appendToBodyMerge(baseHtml, featureHtml, featureId);
        }
      }
    } else {
      sectionEnd += '</section>'.length;
    }

    const beforeTarget = baseHtml.substring(0, sectionEnd);
    const afterTarget = baseHtml.substring(sectionEnd);

    const wrappedFeatureHtml = `
      <div class="progressive-feature progressive-insert-after" data-feature="${featureId}">
        ${featureHtml}
      </div>
    `;

    return beforeTarget + '\n' + wrappedFeatureHtml + afterTarget;
  };

  // Insert before target merge strategy
  const insertBeforeMerge = (baseHtml: string, featureHtml: string, featureId: string, strategy: any): string => {
    const targetIndex = baseHtml.indexOf(strategy.target);
    if (targetIndex === -1) {
      return appendToBodyMerge(baseHtml, featureHtml, featureId);
    }

    const beforeTarget = baseHtml.substring(0, targetIndex);
    const afterTarget = baseHtml.substring(targetIndex);

    const wrappedFeatureHtml = `
      <div class="progressive-feature progressive-insert-before" data-feature="${featureId}">
        ${featureHtml}
      </div>
    `;

    return beforeTarget + wrappedFeatureHtml + '\n' + afterTarget;
  };

  // Default append to body merge strategy
  const appendToBodyMerge = (baseHtml: string, featureHtml: string, featureId: string): string => {
    const bodyCloseIndex = baseHtml.lastIndexOf('</body>');
    if (bodyCloseIndex === -1) {
      // Fallback: append to end
      return baseHtml + '\n' + `<div class="progressive-feature progressive-append" data-feature="${featureId}">${featureHtml}</div>`;
    }

    const beforeBody = baseHtml.substring(0, bodyCloseIndex);
    const afterBody = baseHtml.substring(bodyCloseIndex);

    // Wrap feature HTML in a container
    const wrappedFeatureHtml = `
      <div class="progressive-feature progressive-append" data-feature="${featureId}">
        ${featureHtml}
      </div>
    `;

    return beforeBody + wrappedFeatureHtml + '\n' + afterBody;
  };

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

  // Process single feature with enhanced error recovery and performance monitoring
  const processFeature = useCallback(async (featureId: string) => {
    const retryKey = featureId;
    retryCountRef.current[retryKey] = retryCountRef.current[retryKey] || 0;
    const featureName = FEATURE_NAMES[featureId] || featureId;
    const currentAttempt = retryCountRef.current[retryKey] + 1;

    try {
      // Start performance monitoring
      if (user) {
        performanceMonitorService.startFeatureMonitoring(featureId, featureName, user.uid, jobId);
      }

      updateFeatureProgress(featureId, { status: 'processing', progress: 25 });

      const featureHtml = await callLegacyFunction(featureId);
      updateFeatureProgress(featureId, { progress: 75 });

      // Optimize CSS in the feature HTML
      const optimizedFeatureHtml = cssOptimizerService.optimizeHTMLFragment(
        featureHtml, 
        featureId, 
        {
          minify: true,
          removeDuplicates: true,
          optimizeColors: true,
          optimizeUnits: true,
          mergeMediaQueries: true
        }
      );

      updateFeatureProgress(featureId, { progress: 80 });

      // Validate the optimized HTML fragment
      const validationResult = htmlValidatorService.validateHTML(
        optimizedFeatureHtml,
        featureId,
        {
          checkAccessibility: true,
          checkPerformance: true,
          checkSemantics: true,
          wcagLevel: 'AA',
          strictMode: false
        }
      );

      // Log validation results
      console.log(`🔍 HTML validation for ${featureName}: ${validationResult.score}/100`);
      
      // Store validation results in performance monitoring
      if (user) {
        const validationMetrics = {
          validationScore: validationResult.score,
          isValid: validationResult.isValid,
          errorCount: validationResult.errors.length,
          warningCount: validationResult.warnings.length,
          accessibility: {
            wcagLevel: validationResult.accessibility.wcagLevel,
            score: validationResult.accessibility.score
          },
          performance: {
            score: validationResult.performance.score,
            domComplexity: validationResult.performance.metrics.domComplexity
          },
          semantics: {
            score: validationResult.semantics.score,
            semanticElements: validationResult.semantics.structure.semanticElements
          }
        };
        
        // Add validation metrics to the active monitoring
        const activeMetrics = performanceMonitorService.getActiveMonitoring();
        const currentMetric = activeMetrics.find(m => m.featureId === featureId);
        if (currentMetric) {
          (currentMetric as any).validation = validationMetrics;
        }
      }

      // If validation fails critically, reject the feature
      if (!validationResult.isValid && validationResult.errors.some(e => e.severity === 'critical')) {
        throw new Error(`HTML validation failed: ${validationResult.errors
          .filter(e => e.severity === 'critical')
          .map(e => e.message)
          .join(', ')}`);
      }

      // Show warnings for non-critical issues
      if (validationResult.warnings.length > 0) {
        console.warn(`⚠️ HTML validation warnings for ${featureName}:`, validationResult.warnings);
      }

      updateFeatureProgress(featureId, { progress: 90 });

      // Merge with current HTML
      setState(prev => {
        const newHtml = mergeFeatureHtml(prev.currentHtml || prev.baseHtml || '', optimizedFeatureHtml, featureId);
        return {
          ...prev,
          currentHtml: newHtml
        };
      });

      updateFeatureProgress(featureId, { 
        status: 'completed', 
        progress: 100, 
        html: optimizedFeatureHtml 
      });

      // Complete performance monitoring
      if (user) {
        performanceMonitorService.completeFeatureMonitoring(featureId, optimizedFeatureHtml);
      }

      // Reset retry count on success
      delete retryCountRef.current[retryKey];

      toast.success(`${featureName} added successfully!`);
    } catch (error: any) {
      console.error(`❌ Error processing feature ${featureId}:`, error);

      // Analyze error with enhanced error recovery service
      const errorContext = errorRecoveryService.analyzeError(
        error,
        featureId,
        featureName,
        jobId,
        user?.uid || 'anonymous',
        currentAttempt
      );

      // Calculate recovery strategy
      const recoveryResult = errorRecoveryService.calculateRecovery(errorContext);

      // Record retry attempt in performance monitoring
      if (user) {
        performanceMonitorService.recordRetryAttempt(featureId);
      }

      // Record retry attempt in error recovery service
      errorRecoveryService.recordRetryAttempt(
        featureId,
        currentAttempt,
        error.message,
        performance.now(),
        recoveryResult.strategy
      );

      // Check if we should retry based on enhanced analysis
      if (recoveryResult.shouldRetry && retryCountRef.current[retryKey] < retryAttempts) {
        retryCountRef.current[retryKey] = currentAttempt;
        
        console.log(`🔄 Enhanced retry for ${featureName} (attempt ${currentAttempt}/${retryAttempts})`);
        console.log(`📊 Recovery strategy: ${recoveryResult.strategy}`);
        console.log(`🎯 Success probability: ${(recoveryResult.estimatedSuccessProbability * 100).toFixed(1)}%`);
        console.log(`⚡ Recovery actions: ${recoveryResult.recoveryActions.join(', ')}`);
        
        if (recoveryResult.alternativeApproach) {
          console.log(`🔀 Alternative approach available: ${recoveryResult.alternativeApproach}`);
        }

        // Show user-friendly retry message with strategy info
        toast.loading(`Retrying ${featureName} with ${recoveryResult.strategy} strategy...`, {
          duration: Math.min(recoveryResult.delayMs, 5000)
        });
        
        // Use enhanced delay calculation instead of simple exponential backoff
        setTimeout(() => {
          processFeature(featureId);
        }, recoveryResult.delayMs);
      } else {
        // Complete performance monitoring with error
        if (user) {
          performanceMonitorService.completeFeatureMonitoring(featureId, undefined, error.message);
        }

        updateFeatureProgress(featureId, { 
          status: 'failed', 
          error: error.message 
        });

        // Clear retry history for this feature
        errorRecoveryService.clearRetryHistory(featureId);

        // Show enhanced error message with recovery suggestions
        const errorStats = errorRecoveryService.getErrorStatistics();
        let errorMessage = `Failed to generate ${featureName}`;
        
        if (recoveryResult.alternativeApproach) {
          errorMessage += `. Try: ${recoveryResult.alternativeApproach}`;
        }
        
        toast.error(errorMessage, { duration: 6000 });
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
      
      // Start system performance monitoring
      performanceMonitorService.startSystemMonitoring();
      
      // Calculate optimal feature priorities using intelligent ordering
      console.log('🧠 Calculating optimal feature priorities...');
      const priorityContext = {
        userId: user.uid,
        jobId,
        selectedFeatures,
        totalTimeEstimate: selectedFeatures.length * 5, // rough estimate
        currentSystemLoad: 0.5, // would get from performance monitoring
        previousSuccessRates: {}, // would load from historical data
        userPreferences: await featurePriorityService['getUserPreferences'](user.uid)
      };

      const prioritizedFeatures = await featurePriorityService.calculatePriorities(priorityContext);
      
      // Log priority analysis
      const analysis = featurePriorityService.getPriorityAnalysis(prioritizedFeatures);
      console.log('📊 Priority Analysis:', analysis);
      console.log('🎯 Recommendations:', analysis.recommendations);
      
      // Show priority recommendations to user
      if (analysis.recommendations.length > 0) {
        toast.success(`Smart ordering applied: ${analysis.recommendations[0]}`, { duration: 4000 });
      }
      
      // Initialize features with prioritized order
      const features = initializeFeatures();
      
      // Fetch base HTML
      const baseHtml = await fetchBaseHtml();
      setState(prev => ({
        ...prev,
        baseHtml,
        currentHtml: baseHtml,
        isLoading: false
      }));

      // Process features in optimized priority order
      const orderedFeatureIds = prioritizedFeatures.map(p => p.featureId);
      console.log('🚀 Processing features in optimized order:', orderedFeatureIds.map(id => FEATURE_NAMES[id] || id));
      
      for (const featureId of orderedFeatureIds) {
        await processFeature(featureId);
        // Intelligent delay based on system load and next feature complexity
        const nextFeatureIndex = orderedFeatureIds.indexOf(featureId) + 1;
        if (nextFeatureIndex < orderedFeatureIds.length) {
          const nextFeature = prioritizedFeatures.find(p => p.featureId === orderedFeatureIds[nextFeatureIndex]);
          const delay = nextFeature?.technicalComplexity ? Math.min(1000, nextFeature.technicalComplexity * 100) : 500;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // Generate performance report when all features are complete
      if (user) {
        try {
          await performanceMonitorService.generatePerformanceReport(jobId, user.uid);
          console.log('📊 Performance report generated successfully');
        } catch (reportError) {
          console.error('❌ Error generating performance report:', reportError);
        }

        // Update user preferences based on completed and failed features
        try {
          const completedFeatures = state.features.filter(f => f.status === 'completed').map(f => f.id);
          const failedFeatures = state.features.filter(f => f.status === 'failed').map(f => f.id);
          
          await featurePriorityService.updateUserPreferences(user.uid, completedFeatures, failedFeatures);
          console.log('👤 User preferences updated based on session results');
        } catch (prefsError) {
          console.error('❌ Error updating user preferences:', prefsError);
        }
      }

      // Stop system monitoring
      performanceMonitorService.stopSystemMonitoring();

    } catch (error: any) {
      console.error('❌ Error starting progressive enhancement:', error);
      
      // Stop monitoring on error
      performanceMonitorService.stopSystemMonitoring();
      
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