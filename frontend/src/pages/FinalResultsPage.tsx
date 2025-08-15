import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Sparkles, Loader2 } from 'lucide-react';
import { getJob, generateCV, generateEnhancedPodcast } from '../services/cvService';
import type { Job } from '../types/cv';
import { GeneratedCVDisplay } from '../components/GeneratedCVDisplay';
import { Header } from '../components/Header';
import { CVMetadata } from '../components/final-results/CVMetadata';
import { DownloadActions } from '../components/final-results/DownloadActions';
import { PodcastPlayer } from '../components/PodcastPlayer';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const FinalResultsPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationConfig, setGenerationConfig] = useState<any>(null);
  const isMountedRef = useRef(true);
  const hasTriggeredGeneration = useRef(false);

  useEffect(() => {
    // Ensure mounted state is true when component mounts
    isMountedRef.current = true;
    console.log('🏗️ [DEBUG] FinalResultsPage component mounted, isMountedRef.current set to:', isMountedRef.current);
    
    // Cleanup function to prevent memory leaks
    return () => {
      console.log('🧹 [DEBUG] FinalResultsPage component unmounting, setting isMountedRef.current to false');
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const loadJob = async () => {
      if (!jobId || !isMountedRef.current) {
        return;
      }

      if (!jobId) {
        setError('Job ID is required');
        setLoading(false);
        return;
      }

      try {
        // Load generation config from session storage
        const storedConfig = sessionStorage.getItem(`generation-config-${jobId}`);
        if (storedConfig) {
          const config = JSON.parse(storedConfig);
          setGenerationConfig(config);
        }

        const jobData = await getJob(jobId);
        
        if (!jobData) {
          setError('Job not found');
          setLoading(false);
          return;
        }

        // Check if job belongs to current user
        if (user && jobData.userId !== user.uid) {
          setError('Unauthorized access');
          setLoading(false);
          return;
        }

        // Debug: Check the state of generatedCV
        console.log('🔍 [DEBUG] FinalResultsPage - Job data check:', {
          hasGeneratedCV: !!jobData.generatedCV,
          hasHtml: !!(jobData.generatedCV?.html),
          generatedCVKeys: jobData.generatedCV ? Object.keys(jobData.generatedCV) : null,
          generatedCV: jobData.generatedCV,
          hasTriggeredGeneration: hasTriggeredGeneration.current
        });

        // Check if CV has been generated, if not trigger generation
        if (!jobData.generatedCV || !jobData.generatedCV.html) {
          console.log('🚀 [DEBUG] FinalResultsPage - Triggering CV generation');
          console.log('⏰ [DEBUG] About to trigger generation - isMountedRef.current:', isMountedRef.current);
          // Only trigger generation once
          if (!hasTriggeredGeneration.current) {
            hasTriggeredGeneration.current = true;
            
            // Small delay to ensure component is fully mounted
            setTimeout(async () => {
              console.log('⏰ [DEBUG] After timeout - isMountedRef.current:', isMountedRef.current);
              await triggerCVGeneration(jobData);
            }, 100);
          }
          return;
        }

        console.log('✅ [DEBUG] FinalResultsPage - CV already generated, displaying results');

        if (isMountedRef.current) {
          setJob(jobData);
        }
      } catch (err: any) {
        console.error('Error loading job:', err);
        if (isMountedRef.current) {
          setError(err.message || 'Failed to load job data');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadJob();
  }, [jobId, user]);

  const triggerCVGeneration = async (jobData: Job) => {
    console.log('🎯 [DEBUG] triggerCVGeneration started - isMounted:', isMountedRef.current, 'jobData:', jobData?.id, 'generationConfig:', generationConfig);
    
    if (!isMountedRef.current) {
      console.log('❌ [DEBUG] Component not mounted, returning early');
      return;
    }
    
    try {
      if (isMountedRef.current) {
        setIsGenerating(true);
        setLoading(false); // Stop general loading, show generation state
      }
      
      // Use stored config or defaults
      let selectedTemplate = 'modern';
      let selectedFeatures: string[] = [];
      let privacyModeEnabled = false;
      let podcastGeneration = false;
      
      console.log('⚙️ [DEBUG] Setting up generation config - has generationConfig:', !!generationConfig);
      
      if (generationConfig) {
        selectedTemplate = generationConfig.template || 'modern';
        selectedFeatures = Object.keys(generationConfig.features || {}).filter(key => generationConfig.features[key]);
        privacyModeEnabled = generationConfig.features?.privacyMode || false;
        podcastGeneration = generationConfig.features?.generatePodcast || false;
        console.log('✅ [DEBUG] Using stored config');
      } else {
        console.log('⚠️ [DEBUG] No generationConfig found, using defaults');
      }

      console.log('🎨 [DEBUG] FinalResultsPage - Generating CV with config:', {
        jobId: jobData.id,
        template: selectedTemplate,
        features: selectedFeatures,
        privacyMode: privacyModeEnabled,
        podcast: podcastGeneration
      });

      // Generate CV with privacy mode handling
      if (privacyModeEnabled) {
        selectedFeatures.push('privacy-mode');
      }

      console.log('🔥 [DEBUG] FinalResultsPage - Calling generateCV service');
      const result = await generateCV(jobData.id, selectedTemplate, selectedFeatures);
      console.log('✅ [DEBUG] FinalResultsPage - generateCV service returned:', result);
      
      // Generate podcast separately if selected
      if (podcastGeneration && isMountedRef.current) {
        try {
          console.log('Generating podcast for job:', jobData.id);
          await generateEnhancedPodcast(jobData.id, 'professional');
          toast.success('Podcast generation started!');
        } catch (podcastError) {
          console.error('Podcast generation failed:', podcastError);
          toast.error('Podcast generation failed, but CV was created successfully');
        }
      }
      
      if (!isMountedRef.current) return;

      // Update job with generated CV
      const updatedJob = { 
        ...jobData, 
        generatedCV: {
          html: result.html,
          htmlUrl: result.htmlUrl,
          pdfUrl: result.pdfUrl,
          docxUrl: result.docxUrl,
          template: selectedTemplate,
          features: selectedFeatures
        }
      };
      
      setJob(updatedJob);
      console.log('✅ CV generation completed successfully');
      toast.success('CV generated successfully!');
    } catch (error: any) {
      console.error('❌ [DEBUG] Error in triggerCVGeneration:', error);
      console.error('❌ [DEBUG] Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        name: error?.name
      });
      if (isMountedRef.current) {
        setError('Failed to generate CV. Please try again.');
        toast.error(error?.message || 'Failed to generate CV');
      }
    } finally {
      console.log('🏁 [DEBUG] Generation process finished, cleaning up...');
      if (isMountedRef.current) {
        setIsGenerating(false);
      }
    }
  };

  const handleGenerateAnother = () => {
    navigate('/');
  };


  if (loading || isGenerating) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header 
          currentPage="final-results" 
          jobId={jobId}
          title="Your Enhanced CV"
          subtitle={loading ? 'Loading your CV...' : 'Generating your enhanced CV...'}
          variant="dark"
        />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-gray-300">
              {loading ? 'Loading your CV...' : 'Generating your enhanced CV...'}
            </p>
            {isGenerating && (
              <p className="text-sm text-gray-400 mt-2">
                This usually takes 30-60 seconds
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header 
          currentPage="final-results" 
          jobId={jobId}
          title="Your Enhanced CV"
          subtitle="Error loading CV"
          variant="dark"
        />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-gray-800 rounded-lg shadow-lg p-8 text-center border border-gray-700">
            <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Error Loading CV</h1>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go Back Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header 
        currentPage="final-results" 
        jobId={jobId}
        title="Your Enhanced CV"
        subtitle="Download your professionally enhanced CV in multiple formats"
        variant="dark"
      />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Content Section */}
        <div className="mb-8">

          {/* CV Metadata */}
          <CVMetadata job={job} />

          {/* Download Actions */}
          <DownloadActions job={job} />
        </div>

        {/* Podcast Player */}
        {generationConfig?.features?.generatePodcast && (
          <div className="mb-8">
            <PodcastPlayer jobId={jobId!} />
          </div>
        )}

        {/* CV Display */}
        <div className="mb-8">
          <GeneratedCVDisplay 
            job={job}
            className="rounded-lg shadow-lg overflow-hidden"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleGenerateAnother}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Generate Another CV
          </button>
          
          <button
            onClick={() => navigate(`/results/${jobId}`)}
            className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Back to Feature Selection
          </button>
        </div>
      </div>
    </div>
  );
};