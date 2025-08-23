/**
 * Results Page - Refactored with Modular Components
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Wand2, Clock } from 'lucide-react';
import { getJob, generateCV } from '../services/cvService';
import { CVServiceCore } from '../services/cv/CVServiceCore';
import type { Job } from '../types/cv';
import { PIIWarning } from '../components/PIIWarning';
import { PodcastPlayer } from '../components/PodcastPlayer';
import { CVPreview } from '../components/CVPreview';
import { GeneratedCVDisplay } from '../components/GeneratedCVDisplay';
import { 
  FeatureSelectionPanel,
  FormatSelectionPanel,
  TemplateSelection,
  useFeatureAvailability
} from '../components/results';
import { Header } from '../components/Header';
import type { SelectedFeatures, SelectedFormats } from '../types/results';
import { designSystem } from '../config/designSystem';
import toast from 'react-hot-toast';

export const ResultsPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  
  const [selectedFeatures, setSelectedFeatures] = useState<SelectedFeatures>({
    atsOptimization: true,
    keywordEnhancement: true,
    achievementHighlighting: true,
    skillsVisualization: false,
    generatePodcast: true,
    privacyMode: true,
    embedQRCode: true,
    interactiveTimeline: true,
    skillsChart: true,
    videoIntroduction: false,
    portfolioGallery: false,
    testimonialsCarousel: false,
    contactForm: true,
    socialMediaLinks: true,
    availabilityCalendar: false,
    languageProficiency: true,
    certificationBadges: true,
    achievementsShowcase: true,
  });

  // Save feature selection to session storage whenever it changes (but not during initial load)
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  useEffect(() => {
    if (jobId && !isInitialLoad) {
      try {
        sessionStorage.setItem(`feature-selection-${jobId}`, JSON.stringify(selectedFeatures));
        console.log('📾 [PHASE 3 PERSIST] Saved feature selection:', selectedFeatures);
      } catch (e) {
        console.warn('Failed to save feature selection:', e);
      }
    }
  }, [selectedFeatures, jobId, isInitialLoad]);

  const [selectedFormats, setSelectedFormats] = useState<SelectedFormats>({
    pdf: true,
    docx: true,
    html: true,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [asyncMode, setAsyncMode] = useState(CVServiceCore.isAsyncCVGenerationEnabled());
  const featureAvailability = useFeatureAvailability(job);
  
  // Track component mount state to prevent state updates after unmount
  const isMountedRef = useRef(true);
  // Track when CV generation is active to prevent premature unmounting
  const isGeneratingRef = useRef(false);

  useEffect(() => {
    if (jobId) {
      loadJob();
      
      // Load saved feature selection from session storage
      try {
        const savedFeatures = sessionStorage.getItem(`feature-selection-${jobId}`);
        if (savedFeatures) {
          const features = JSON.parse(savedFeatures);
          console.log('📾 [PHASE 3 INIT] Loaded saved features:', features);
          setSelectedFeatures(features);
        }
      } catch (e) {
        console.warn('Failed to load saved feature selection:', e);
      }
      
      // Mark initial load as complete after a short delay
      setTimeout(() => {
        setIsInitialLoad(false);
      }, 100);
    }
  }, [jobId]);

  // Cleanup effect to prevent state updates after unmount
  useEffect(() => {
    isMountedRef.current = true; // Explicitly set to true on mount
    console.log('🔧 [MOUNT DEBUG] ResultsPage component mounted, isMountedRef set to true');
    
    return () => {
      console.log('🔧 [MOUNT DEBUG] ResultsPage component unmounting');
      console.log('🔧 [MOUNT DEBUG] isGeneratingRef.current:', isGeneratingRef.current);
      
      // If CV generation is active, delay unmounting
      if (isGeneratingRef.current) {
        console.warn('🔧 [MOUNT DEBUG] CV generation in progress, delaying unmount');
        setTimeout(() => {
          console.log('🔧 [MOUNT DEBUG] Delayed unmount after CV generation');
          isMountedRef.current = false;
        }, 1000);
      } else {
        console.log('🔧 [MOUNT DEBUG] Setting isMountedRef to false');
        isMountedRef.current = false;
      }
    };
  }, []);

  const loadJob = async () => {
    try {
      setLoading(true);
      const jobData = await getJob(jobId!);
      if (isMountedRef.current) {
        setJob(jobData);
      }
    } catch (error) {
      console.error('Error loading job:', error);
      if (isMountedRef.current) {
        toast.error('Failed to load job data');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleGenerateCV = async () => {
    if (!job) return;

    // Prevent multiple simultaneous generation attempts
    if (isGenerating) {
      console.warn('CV generation already in progress');
      return;
    }

    // Enhanced component mounting check with debugging
    if (!isMountedRef.current) {
      console.warn('Component unmounted before CV generation started - this should not happen during normal user interaction');
      console.warn('Debug info:', {
        jobId: job?.id,
        isGenerating,
        selectedFeatureCount: Object.keys(selectedFeatures).filter(key => selectedFeatures[key as keyof SelectedFeatures]).length,
        timestamp: new Date().toISOString()
      });
      // Don't return early - this might be a false positive
      // Instead, set the ref back to true and continue
      isMountedRef.current = true;
      console.log('Resetting isMountedRef to true and continuing with CV generation');
    }

    try {
      // Enhanced Debug: Check what features are selected
      const selectedFeatureKeys = Object.keys(selectedFeatures).filter(key => selectedFeatures[key as keyof SelectedFeatures]);
      const selectedFeatureCount = selectedFeatureKeys.length;
      
      // Convert camelCase feature keys to kebab-case for backend compatibility
      const featureMapping: Record<string, string> = {
        'atsOptimization': 'ats-optimization',
        'keywordEnhancement': 'keyword-enhancement',
        'achievementHighlighting': 'achievement-highlighting',
        'skillsVisualization': 'skills-visualization',
        'generatePodcast': 'generate-podcast',
        'privacyMode': 'privacy-mode',
        'embedQRCode': 'embed-qr-code',
        'interactiveTimeline': 'interactive-timeline',
        'skillsChart': 'skills-chart',
        'videoIntroduction': 'video-introduction',
        'portfolioGallery': 'portfolio-gallery',
        'testimonialsCarousel': 'testimonials-carousel',
        'contactForm': 'contact-form',
        'socialMediaLinks': 'social-media-links',
        'availabilityCalendar': 'availability-calendar',
        'languageProficiency': 'language-proficiency',
        'certificationBadges': 'certification-badges',
        'achievementsShowcase': 'achievements-showcase'
      };
      
      const backendFeatureKeys = selectedFeatureKeys.map(camelCaseKey => {
        return featureMapping[camelCaseKey] || camelCaseKey.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
      });
      
      console.log('🔍 [FEATURE DEBUG] Full selectedFeatures state:', selectedFeatures);
      console.log('🔍 [FEATURE DEBUG] CamelCase keys that are true:', selectedFeatureKeys);
      console.log('🔍 [FEATURE DEBUG] Backend kebab-case keys:', backendFeatureKeys);
      console.log('🔍 [FEATURE DEBUG] Total selected count:', selectedFeatureCount);
      console.log('🔍 [FEATURE DEBUG] Template:', selectedTemplate);
      console.log('🔍 [FEATURE DEBUG] Async mode:', asyncMode);
      
      // Store generation config in session storage for FinalResultsPage
      const generationConfig = {
        jobId: job.id,
        templateId: selectedTemplate,
        features: backendFeatureKeys, // Use kebab-case keys for backend
        featureCount: selectedFeatureCount,
        asyncMode,
        timestamp: new Date().toISOString()
      };
      
      try {
        sessionStorage.setItem(`generation-config-${job.id}`, JSON.stringify(generationConfig));
        console.log('💾 [SESSION] Stored generation config:', generationConfig);
      } catch (e) {
        console.warn('Failed to store generation config in session storage:', e);
      }
      
      if (asyncMode) {
        // Async mode: initiate CV generation and navigate immediately
        console.log('🚀 [ASYNC MODE] Initiating CV generation with real-time progress');
        setIsInitializing(true);
        isGeneratingRef.current = true;
        
        const initResponse = await CVServiceCore.initiateCVGeneration({
          jobId: job.id,
          templateId: selectedTemplate,
          features: backendFeatureKeys // Use kebab-case keys for backend
        });
        
        // Update config with initialization response
        generationConfig.initResponse = initResponse;
        try {
          sessionStorage.setItem(`generation-config-${job.id}`, JSON.stringify(generationConfig));
          console.log('💾 [ASYNC] Updated config with init response:', generationConfig);
        } catch (e) {
          console.warn('Failed to update generation config:', e);
        }
        
        toast.success('CV generation initiated! Redirecting to progress...');
        
        // Navigate immediately to show real-time progress
        navigate(`/final-results/${jobId}`);
        
      } else {
        // Sync mode: start generation and navigate immediately for existing progress tracking
        console.log('🚀 [SYNC MODE] Starting CV generation with immediate navigation');
        setIsGenerating(true);
        isGeneratingRef.current = true;
        
        // Navigate immediately to show real-time progress (existing behavior)
        navigate(`/final-results/${jobId}`);
        
        // Start CV generation in background (FinalResultsPage will handle the progress)
        generateCV(
          job.id, 
          selectedTemplate, 
          backendFeatureKeys // Use kebab-case keys for backend
        ).then((result) => {
          console.log('✅ [BACKGROUND] CV generation completed:', result);
          toast.success('CV generated successfully!');
        }).catch((error) => {
          console.error('❌ [BACKGROUND] CV generation error:', error);
          // Error will be handled by FinalResultsPage
        });
      }

    } catch (error: unknown) {
      console.error('Error starting CV generation:', error);
      
      // Enhanced check if component is still mounted before showing error
      if (!isMountedRef.current) {
        console.warn('Component unmounted during CV generation error, but showing error anyway');
        // Reset the ref to true to allow error display
        isMountedRef.current = true;
      }

      // Show user-friendly error message based on error type
      const errorMessage = error?.message || 'Failed to start CV generation';
      toast.error(errorMessage);
    } finally {
      // Always reset loading state, regardless of mount status
      // This prevents the button from staying in loading state
      setIsInitializing(false);
      setIsGenerating(false);
      isGeneratingRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className={`w-8 h-8 animate-spin text-${designSystem.colors.primary[400]} mx-auto mb-4`} />
          <p className={designSystem.accessibility.contrast.text.secondary}>Loading your results...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <p className={designSystem.accessibility.contrast.text.secondary}>Job not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header 
        currentPage="feature-selection"
        jobId={jobId}
        title="Feature Selection" 
        subtitle="Choose templates and features to enhance your CV"
        variant="dark"
        showBreadcrumbs={true}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* PII Warning */}
        {job.piiDetection && (
          <PIIWarning
            hasPII={job.piiDetection.hasPII}
            detectedTypes={job.piiDetection.detectedTypes}
            recommendations={job.piiDetection.recommendations}
            onTogglePrivacyMode={() => setPrivacyMode(!privacyMode)}
            privacyModeEnabled={privacyMode}
          />
        )}

        {/* Quick Create Success Banner */}
        {job.quickCreate && (
          <div className={`${designSystem.components.card.base} ${designSystem.components.card.variants.glass} ${designSystem.components.card.padding.sm} mb-6`} style={{
            background: 'linear-gradient(to right, rgba(147, 51, 234, 0.2), rgba(6, 182, 212, 0.2))',
            borderColor: 'rgba(147, 51, 234, 0.5)'
          }}>
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <div>
                <h4 className="font-semibold text-purple-300">Quick Create Mode Activated!</h4>
                <p className="text-sm text-purple-200/80">
                  We've pre-selected optimal settings for maximum interview success.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Feature Selection Guide */}
        <div className={`${designSystem.components.card.base} ${designSystem.components.card.variants.elevated} ${designSystem.components.card.padding.md} mb-6 shadow-xl`}>
          <div className="flex items-center gap-3">
            <Wand2 className={`w-5 h-5 text-${designSystem.colors.primary[400]}`} />
            <div>
              <h1 className={`text-2xl font-bold ${designSystem.accessibility.contrast.text.primary} mb-2`}>Select Interactive Features</h1>
              <p className={designSystem.accessibility.contrast.text.secondary}>
                Choose the interactive features to enhance your CV. Currently selected: {Object.keys(selectedFeatures).filter(key => selectedFeatures[key as keyof SelectedFeatures]).length} features
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            <TemplateSelection 
              selectedTemplate={selectedTemplate}
              setSelectedTemplate={setSelectedTemplate}
            />
            
            <FeatureSelectionPanel
              selectedFeatures={selectedFeatures}
              setSelectedFeatures={setSelectedFeatures}
              featureAvailability={featureAvailability}
            />
            
            <FormatSelectionPanel
              selectedFormats={selectedFormats}
              setSelectedFormats={setSelectedFormats}
            />

            {/* Generate Button */}
            <button
              onClick={() => {
                const selectedCount = Object.keys(selectedFeatures).filter(key => selectedFeatures[key as keyof SelectedFeatures]).length;
                console.log('🚀 [BUTTON CLICK] Generate CV button clicked with', selectedCount, 'features selected');
                console.log('🔧 [MOUNT DEBUG] Button click - isMountedRef.current:', isMountedRef.current);
                handleGenerateCV();
              }}
              disabled={isGenerating || isInitializing}
              className={`w-full ${designSystem.components.button.base} ${(isGenerating || isInitializing) ? designSystem.components.button.variants.primary.disabled : designSystem.components.button.variants.primary.default} ${designSystem.components.button.sizes.xl} flex items-center justify-center gap-3 shadow-lg rounded-xl py-4`}
            >
              {isInitializing ? (
                <>
                  <Clock className="w-5 h-5 animate-pulse" />
                  Initializing CV Generation...
                </>
              ) : isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Your Enhanced CV...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Generate CV with {Object.keys(selectedFeatures).filter(key => selectedFeatures[key as keyof SelectedFeatures]).length} Features
                  {asyncMode && ' (Fast Track)'}
                </>
              )}
            </button>
            
            {/* Mode Indicator */}
            {asyncMode && (
              <div className="text-center mt-3">
                <p className={`text-sm ${designSystem.accessibility.contrast.text.secondary}`}>
                  ⚡ Fast Track Mode: Real-time progress tracking enabled
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            <PodcastPlayer jobId={job.id} />
            
            {job.generatedCV ? (
              <>
                {console.log('🖥️ [RENDER DEBUG] Showing GeneratedCVDisplay instead of CVPreview - this prevents dynamic updates')}
                <GeneratedCVDisplay job={job} />
              </>
            ) : (
              <>
                {console.log('🖥️ [RENDER DEBUG] Showing CVPreview for dynamic updates', {
                  selectedTemplate,
                  selectedFeatures,
                  featureCount: Object.keys(selectedFeatures).filter(key => selectedFeatures[key as keyof typeof selectedFeatures]).length
                })}
                <CVPreview 
                  job={job}
                  selectedTemplate={selectedTemplate}
                  selectedFeatures={selectedFeatures}
                />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};