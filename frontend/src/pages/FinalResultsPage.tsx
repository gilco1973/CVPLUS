import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Sparkles, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { getJob, generateCV, generateEnhancedPodcast } from '../services/cvService';
import { db, storage } from '../lib/firebase';
import type { Job } from '../types/cv';
import { GeneratedCVDisplay } from '../components/GeneratedCVDisplay';
import { Header } from '../components/Header';
import { CVMetadata } from '../components/final-results/CVMetadata';
import { DownloadActions } from '../components/final-results/DownloadActions';
import { PodcastPlayer } from '../components/PodcastPlayer';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// Progressive Enhancement Types
interface FeatureProgress {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep?: string;
  error?: string;
  htmlFragment?: string;
  processedAt?: any;
}

interface ProgressState {
  [featureId: string]: FeatureProgress;
}

interface FeatureConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
}

// Feature Configuration
const FEATURE_CONFIGS: Record<string, FeatureConfig> = {
  'skills-visualization': {
    id: 'skills-visualization',
    name: 'Skills Visualization',
    icon: '📊',
    description: 'Interactive charts and skill assessments'
  },
  'certification-badges': {
    id: 'certification-badges',
    name: 'Certification Badges',
    icon: '🏆',
    description: 'Professional certification displays'
  },
  'calendar-integration': {
    id: 'calendar-integration',
    name: 'Calendar Integration',
    icon: '📅',
    description: 'Availability and scheduling'
  },
  'interactive-timeline': {
    id: 'interactive-timeline',
    name: 'Interactive Timeline',
    icon: '⏰',
    description: 'Professional journey visualization'
  },
  'language-proficiency': {
    id: 'language-proficiency',
    name: 'Language Proficiency',
    icon: '🌍',
    description: 'Language skills assessment'
  },
  'portfolio-gallery': {
    id: 'portfolio-gallery',
    name: 'Portfolio Gallery',
    icon: '🖼️',
    description: 'Project showcase gallery'
  },
  'video-introduction': {
    id: 'video-introduction',
    name: 'Video Introduction',
    icon: '🎥',
    description: 'Personal video introduction'
  },
  'generate-podcast': {
    id: 'generate-podcast',
    name: 'Career Podcast',
    icon: '🎙️',
    description: 'AI-generated career story'
  }
};

// Feature Progress Card Component
const FeatureProgressCard: React.FC<{
  feature: FeatureConfig;
  progress: FeatureProgress;
}> = ({ feature, progress }) => {
  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'border-green-500 bg-green-500/10';
      case 'processing':
        return 'border-blue-500 bg-blue-500/10';
      case 'failed':
        return 'border-red-500 bg-red-500/10';
      default:
        return 'border-gray-600 bg-gray-800/50';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{feature.icon}</span>
          <h3 className="font-medium text-gray-100">{feature.name}</h3>
        </div>
        {getStatusIcon()}
      </div>
      
      <p className="text-sm text-gray-400 mb-3">{feature.description}</p>
      
      {progress.status === 'processing' && (
        <div className="space-y-2">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress || 0}%` }}
            />
          </div>
          {progress.currentStep && (
            <p className="text-xs text-gray-400">{progress.currentStep}</p>
          )}
        </div>
      )}
      
      {progress.status === 'failed' && progress.error && (
        <p className="text-sm text-red-400">{progress.error}</p>
      )}
      
      {progress.status === 'completed' && (
        <p className="text-sm text-green-400">Enhancement complete!</p>
      )}
    </div>
  );
};

export const FinalResultsPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Original states
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationConfig, setGenerationConfig] = useState<any>(null);
  const isMountedRef = useRef(true);
  const hasTriggeredGeneration = useRef(false);
  
  // Progressive Enhancement states
  const [baseHTML, setBaseHTML] = useState<string>('');
  const [enhancedHTML, setEnhancedHTML] = useState<string>('');
  const [progressState, setProgressState] = useState<ProgressState>({});
  const [featureQueue, setFeatureQueue] = useState<FeatureConfig[]>([]);
  const [isProcessingFeatures, setIsProcessingFeatures] = useState(false);
  const [progressUnsubscribe, setProgressUnsubscribe] = useState<(() => void) | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    console.log('🏗️ [DEBUG] Progressive FinalResultsPage mounted');
    
    return () => {
      console.log('🧹 [DEBUG] Progressive FinalResultsPage unmounting');
      isMountedRef.current = false;
      if (progressUnsubscribe) {
        progressUnsubscribe();
      }
    };
  }, []);

  // Load base HTML from Firebase Storage
  const loadBaseHTML = async (job: Job) => {
    try {
      if (job.generatedCV?.htmlUrl) {
        console.log('📄 [DEBUG] Loading base HTML from Storage URL:', job.generatedCV.htmlUrl);
        
        // For Firebase Storage URLs, we need to fetch the content
        if (job.generatedCV.htmlUrl.includes('firebasestorage') || job.generatedCV.htmlUrl.includes('localhost:9199')) {
          const response = await fetch(job.generatedCV.htmlUrl);
          if (response.ok) {
            const htmlContent = await response.text();
            setBaseHTML(htmlContent);
            setEnhancedHTML(htmlContent);
            console.log('✅ [DEBUG] Base HTML loaded successfully');
            return;
          }
        }
      }
      
      // Fallback to inline HTML if available
      if (job.generatedCV?.html) {
        console.log('📄 [DEBUG] Using inline HTML content');
        setBaseHTML(job.generatedCV.html);
        setEnhancedHTML(job.generatedCV.html);
      }
    } catch (error) {
      console.error('❌ [DEBUG] Error loading base HTML:', error);
      // Use inline HTML as fallback
      if (job.generatedCV?.html) {
        setBaseHTML(job.generatedCV.html);
        setEnhancedHTML(job.generatedCV.html);
      }
    }
  };

  // Set up feature queue based on selected features
  const setupFeatureQueue = (selectedFeatures: string[]) => {
    const queue = selectedFeatures
      .filter(featureId => FEATURE_CONFIGS[featureId])
      .map(featureId => FEATURE_CONFIGS[featureId]);
    
    setFeatureQueue(queue);
    console.log('🎯 [DEBUG] Feature queue set up:', queue.map(f => f.name));
    
    // Initialize progress state
    const initialProgress: ProgressState = {};
    queue.forEach(feature => {
      initialProgress[feature.id] = {
        status: 'pending',
        progress: 0
      };
    });
    setProgressState(initialProgress);
  };

  // Set up real-time progress tracking
  const setupProgressTracking = (jobId: string) => {
    console.log('📡 [DEBUG] Setting up progress tracking for job:', jobId);
    
    const jobRef = doc(db, 'jobs', jobId);
    const unsubscribe = onSnapshot(jobRef, (doc) => {
      if (!doc.exists() || !isMountedRef.current) return;
      
      const data = doc.data();
      const enhancedFeatures = data.enhancedFeatures || {};
      
      console.log('📡 [DEBUG] Progress update received:', enhancedFeatures);
      
      // Update progress state
      const newProgressState: ProgressState = {};
      featureQueue.forEach(feature => {
        const featureData = enhancedFeatures[feature.id];
        if (featureData) {
          newProgressState[feature.id] = {
            status: featureData.status || 'pending',
            progress: featureData.progress || 0,
            currentStep: featureData.currentStep,
            error: featureData.error,
            htmlFragment: featureData.htmlFragment,
            processedAt: featureData.processedAt
          };
        } else {
          newProgressState[feature.id] = {
            status: 'pending',
            progress: 0
          };
        }
      });
      
      setProgressState(newProgressState);
      
      // Update HTML if new fragments are available
      // This would be implemented in Phase 2 with HTML merging
      
    }, (error) => {
      console.error('❌ [DEBUG] Progress tracking error:', error);
    });
    
    setProgressUnsubscribe(() => unsubscribe);
  };

  useEffect(() => {
    const loadJob = async () => {
      if (!jobId || !isMountedRef.current) {
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

        console.log('🔍 [DEBUG] Progressive FinalResultsPage - Job data check:', {
          hasGeneratedCV: !!jobData.generatedCV,
          hasHtml: !!(jobData.generatedCV?.html),
          hasHtmlUrl: !!(jobData.generatedCV?.htmlUrl),
          generatedCVKeys: jobData.generatedCV ? Object.keys(jobData.generatedCV) : null
        });

        // Check if CV has been generated, if not trigger generation
        if (!jobData.generatedCV || (!jobData.generatedCV.html && !jobData.generatedCV.htmlUrl)) {
          console.log('🚀 [DEBUG] Triggering CV generation');
          if (!hasTriggeredGeneration.current) {
            hasTriggeredGeneration.current = true;
            setTimeout(async () => {
              await triggerCVGeneration(jobData);
            }, 100);
          }
          return;
        }

        // Check if this is a quickCreate job that needs full workflow
        if (jobData.quickCreateReady && !hasTriggeredGeneration.current) {
          console.log('🚀 [DEBUG] Quick Create detected - triggering full workflow with all features');
          hasTriggeredGeneration.current = true;
          setTimeout(async () => {
            await triggerQuickCreateWorkflow(jobData);
          }, 100);
          return;
        }

        console.log('✅ [DEBUG] CV already generated, setting up progressive enhancement');

        if (isMountedRef.current) {
          setJob(jobData);
          
          // Load base HTML immediately
          await loadBaseHTML(jobData);
          
          // Set up feature queue if features are selected
          if (jobData.generatedCV?.features && jobData.generatedCV.features.length > 0) {
            setupFeatureQueue(jobData.generatedCV.features);
            setIsProcessingFeatures(true);
            setupProgressTracking(jobId);
          }
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

  const triggerQuickCreateWorkflow = async (jobData: Job) => {
    console.log('🎯 [DEBUG] triggerQuickCreateWorkflow started - generating with ALL features');
    
    if (!isMountedRef.current) {
      return;
    }
    
    try {
      if (isMountedRef.current) {
        setIsGenerating(true);
        setLoading(false);
      }
      
      // Define all available features for quick create
      const allFeatures = [
        'generate-podcast',
        'video-introduction',
        'skills-visualization', 
        'interactive-timeline',
        'portfolio-gallery',
        'calendar-integration',
        'certification-badges',
        'language-proficiency'
      ];
      
      console.log('🔥 [DEBUG] Quick Create: Calling generateCV with ALL features:', allFeatures);
      const result = await generateCV(jobData.id, 'modern', allFeatures);
      console.log('✅ [DEBUG] Quick Create: generateCV service returned:', result);
      
      // Generate podcast for quick create
      if (isMountedRef.current) {
        try {
          console.log('🎙️ Quick Create: Generating podcast');
          await generateEnhancedPodcast(jobData.id, 'professional');
          toast.success('Full CV with podcast generation completed!');
        } catch (podcastError) {
          console.error('Podcast generation failed:', podcastError);
          toast.success('CV generated successfully! Podcast generation in progress...');
        }
      }
      
      if (!isMountedRef.current) return;

      // Update job with generated CV including all features
      const updatedJob = { 
        ...jobData, 
        generatedCV: {
          html: result.generatedCV.html,
          htmlUrl: result.generatedCV.htmlUrl,
          pdfUrl: result.generatedCV.pdfUrl,
          docxUrl: result.generatedCV.docxUrl,
          template: 'modern',
          features: allFeatures
        },
        quickCreateReady: false // Mark as completed
      };
      
      setJob(updatedJob);
      
      // Load base HTML and set up progressive enhancement
      await loadBaseHTML(updatedJob);
      
      if (allFeatures.length > 0) {
        setupFeatureQueue(allFeatures);
        setIsProcessingFeatures(true);
        setupProgressTracking(jobData.id);
      }
      
      console.log('✅ Quick Create: Full workflow completed successfully');
      toast.success('Complete CV with all enhancements ready!');
    } catch (error: any) {
      console.error('❌ [DEBUG] Error in triggerQuickCreateWorkflow:', error);
      if (isMountedRef.current) {
        setError('Failed to generate enhanced CV. Please try again.');
        toast.error(error?.message || 'Failed to generate enhanced CV');
      }
    } finally {
      if (isMountedRef.current) {
        setIsGenerating(false);
      }
    }
  };

  const triggerCVGeneration = async (jobData: Job) => {
    console.log('🎯 [DEBUG] triggerCVGeneration started');
    
    if (!isMountedRef.current) {
      return;
    }
    
    try {
      if (isMountedRef.current) {
        setIsGenerating(true);
        setLoading(false);
      }
      
      // Use stored config or defaults
      let selectedTemplate = 'modern';
      let selectedFeatures: string[] = [];
      let privacyModeEnabled = false;
      let podcastGeneration = false;
      
      if (generationConfig) {
        selectedTemplate = generationConfig.template || 'modern';
        selectedFeatures = Object.keys(generationConfig.features || {}).filter(key => generationConfig.features[key]);
        privacyModeEnabled = generationConfig.features?.privacyMode || false;
        podcastGeneration = generationConfig.features?.generatePodcast || false;
      }

      // Generate CV with privacy mode handling
      if (privacyModeEnabled) {
        selectedFeatures.push('privacy-mode');
      }

      console.log('🔥 [DEBUG] Calling generateCV service with features:', selectedFeatures);
      const result = await generateCV(jobData.id, selectedTemplate, selectedFeatures);
      console.log('✅ [DEBUG] generateCV service returned:', result);
      
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
          html: result.generatedCV.html,
          htmlUrl: result.generatedCV.htmlUrl,
          pdfUrl: result.generatedCV.pdfUrl,
          docxUrl: result.generatedCV.docxUrl,
          template: selectedTemplate,
          features: selectedFeatures
        }
      };
      
      setJob(updatedJob);
      
      // Load base HTML and set up progressive enhancement
      await loadBaseHTML(updatedJob);
      
      if (selectedFeatures.length > 0) {
        setupFeatureQueue(selectedFeatures);
        setIsProcessingFeatures(true);
        setupProgressTracking(jobData.id);
      }
      
      console.log('✅ CV generation completed successfully');
      toast.success('CV generated successfully! Adding enhanced features...');
    } catch (error: any) {
      console.error('❌ [DEBUG] Error in triggerCVGeneration:', error);
      if (isMountedRef.current) {
        setError('Failed to generate CV. Please try again.');
        toast.error(error?.message || 'Failed to generate CV');
      }
    } finally {
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
        subtitle={isProcessingFeatures ? 
          "Your CV is ready! We're adding enhanced features..." : 
          "Download your professionally enhanced CV in multiple formats"
        }
        variant="dark"
      />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Progressive Enhancement Status */}
        {featureQueue.length > 0 && (
          <div className="mb-8">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-gray-100">
                  {isProcessingFeatures ? 'Adding Enhanced Features' : 'Enhanced Features Complete'}
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featureQueue.map(feature => (
                  <FeatureProgressCard
                    key={feature.id}
                    feature={feature}
                    progress={progressState[feature.id] || { status: 'pending', progress: 0 }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

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

        {/* CV Display - Show base HTML immediately, then enhanced */}
        <div className="mb-8">
          {baseHTML ? (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-100">Your CV</h2>
                {isProcessingFeatures && (
                  <div className="flex items-center gap-2 text-sm text-cyan-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding enhancements...
                  </div>
                )}
              </div>
              
              {/* HTML Content Display */}
              <div className="bg-white rounded-lg p-6 overflow-auto max-h-[600px]">
                <div dangerouslySetInnerHTML={{ __html: enhancedHTML }} />
              </div>
            </div>
          ) : (
            <GeneratedCVDisplay 
              job={job}
              className="rounded-lg shadow-lg overflow-hidden"
            />
          )}
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