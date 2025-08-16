/**
 * Results Page - Refactored with Modular Components
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { getJob, generateCV } from '../services/cvService';
import type { Job } from '../types/cv';
import { PIIWarning } from '../components/PIIWarning';
import { PodcastPlayer } from '../components/PodcastPlayer';
import { CVPreview } from '../components/CVPreview';
import { GeneratedCVDisplay } from '../components/GeneratedCVDisplay';
import { 
  ResultsPageHeader,
  FeatureSelectionPanel,
  FormatSelectionPanel,
  TemplateSelection,
  useFeatureAvailability
} from '../components/results';
import type { SelectedFeatures, SelectedFormats } from '../types/results';
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

  // Save feature selection to session storage whenever it changes
  useEffect(() => {
    if (jobId) {
      try {
        sessionStorage.setItem(`feature-selection-${jobId}`, JSON.stringify(selectedFeatures));
        console.log('📾 [PHASE 3 PERSIST] Saved feature selection:', selectedFeatures);
      } catch (e) {
        console.warn('Failed to save feature selection:', e);
      }
    }
  }, [selectedFeatures, jobId]);

  const [selectedFormats, setSelectedFormats] = useState<SelectedFormats>({
    pdf: true,
    docx: true,
    html: true,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const featureAvailability = useFeatureAvailability(job);
  
  // Track component mount state to prevent state updates after unmount
  const isMountedRef = useRef(true);

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
    }
  }, [jobId]);

  // Cleanup effect to prevent state updates after unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadJob = async () => {
    try {
      setLoading(true);
      const jobData = await getJob(jobId!);
      setJob(jobData);
    } catch (error) {
      console.error('Error loading job:', error);
      toast.error('Failed to load job data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCV = async () => {
    if (!job) return;

    // Prevent multiple simultaneous generation attempts
    if (isGenerating) {
      console.warn('CV generation already in progress');
      return;
    }

    // Ensure component is still mounted before starting
    if (!isMountedRef.current) {
      console.warn('Component unmounted before CV generation started');
      return;
    }

    try {
      setIsGenerating(true);
      
      // Enhanced Debug: Check what features are selected
      const selectedFeatureKeys = Object.keys(selectedFeatures).filter(key => selectedFeatures[key as keyof SelectedFeatures]);
      const selectedFeatureCount = selectedFeatureKeys.length;
      
      console.log('🔍 [PHASE 3 FEATURE DEBUG] Full selectedFeatures state:', selectedFeatures);
      console.log('🔍 [PHASE 3 FEATURE DEBUG] Keys that are true:', selectedFeatureKeys);
      console.log('🔍 [PHASE 3 FEATURE DEBUG] Total selected count:', selectedFeatureCount);
      console.log('🔍 [PHASE 3 FEATURE DEBUG] Template:', selectedTemplate);
      
      // Store generation config in session storage for debugging
      const generationConfig = {
        jobId: job.id,
        templateId: selectedTemplate,
        features: selectedFeatureKeys,
        featureCount: selectedFeatureCount,
        timestamp: new Date().toISOString()
      };
      
      try {
        sessionStorage.setItem(`generation-config-${job.id}`, JSON.stringify(generationConfig));
        console.log('💾 [PHASE 3 SESSION] Stored generation config:', generationConfig);
      } catch (e) {
        console.warn('Failed to store generation config in session storage:', e);
      }
      
      console.log('🚀 [PHASE 3 API CALL] Calling generateCV with:', generationConfig);
      
      const result = await generateCV(
        job.id, 
        selectedTemplate, 
        selectedFeatureKeys
      );

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        console.warn('Component unmounted during CV generation, skipping state update');
        return;
      }

      setJob({ 
        ...job, 
        generatedCV: result as {
          html: string;
          htmlUrl?: string;
          pdfUrl: string;
          docxUrl: string;
          template?: string;
          features?: string[];
        }
      });
      
      toast.success('CV generated successfully!');
      
      // Navigate to final results page
      navigate(`/final-results/${jobId}`);
    } catch (error: any) {
      console.error('Error generating CV:', error);
      
      // Check if component is still mounted before showing error
      if (!isMountedRef.current) {
        console.warn('Component unmounted during CV generation error, skipping error display');
        return;
      }

      // Show user-friendly error message based on error type
      const errorMessage = error?.message || 'Failed to generate CV';
      toast.error(errorMessage);
    } finally {
      // Always reset loading state if component is still mounted
      if (isMountedRef.current) {
        setIsGenerating(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Job not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <ResultsPageHeader />

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
          <div className="bg-gradient-to-r from-purple-900/20 to-cyan-900/20 border border-purple-700/50 rounded-lg p-4 mb-6">
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
        <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-700/50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <Wand2 className="w-5 h-5 text-cyan-400" />
            <div>
              <h4 className="font-semibold text-cyan-300">Select Interactive Features</h4>
              <p className="text-sm text-cyan-200/80">
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
              onClick={handleGenerateCV}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Your Enhanced CV...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Generate CV with {Object.keys(selectedFeatures).filter(key => selectedFeatures[key as keyof SelectedFeatures]).length} Features
                </>
              )}
            </button>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            <PodcastPlayer jobId={job.id} />
            
            {job.generatedCV ? (
              <GeneratedCVDisplay job={job} />
            ) : (
              <CVPreview 
                job={job}
                selectedTemplate={selectedTemplate}
                selectedFeatures={selectedFeatures as unknown as Record<string, boolean>}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};