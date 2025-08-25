import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UnifiedAnalysisContainer } from '../components/analysis/unified/UnifiedAnalysisContainer';
import { ExternalDataSources } from '../components/ExternalDataSources';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToJob } from '../services/cvService';
import type { Job } from '../services/cvService';
import { ArrowLeft, Loader2, Database, ChevronRight } from 'lucide-react';
import { designSystem } from '../config/designSystem';
import toast from 'react-hot-toast';

export const CVAnalysisPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showExternalData, setShowExternalData] = useState(false);
  const [externalDataCompleted, setExternalDataCompleted] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setError('Job ID is required');
      setIsLoading(false);
      return;
    }

    // Subscribe to job updates
    const unsubscribe = subscribeToJob(jobId, (updatedJob) => {
      if (!updatedJob) {
        setError('Job not found');
        setIsLoading(false);
        return;
      }

      // Check if job belongs to current user
      if (user && updatedJob.userId !== user.uid) {
        setError('Unauthorized access');
        setIsLoading(false);
        return;
      }

      // Only show analysis if CV has been processed
      // Accept 'parsed', 'analyzed', or 'completed' status as valid for analysis
      if (updatedJob.status !== 'parsed' && updatedJob.status !== 'analyzed' && updatedJob.status !== 'completed') {
        // If job is still processing, redirect to processing page
        if (updatedJob.status === 'processing' || updatedJob.status === 'pending') {
          navigate(`/process/${jobId}`);
          return;
        }
        
        if (updatedJob.status === 'failed') {
          setError(updatedJob.error || 'CV processing failed');
          setIsLoading(false);
          return;
        }
      }

      setJob(updatedJob);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [jobId, navigate, user]);

  const handleExternalDataComplete = (enrichedData?: unknown[]) => {
    console.log('External data enrichment completed:', enrichedData?.length || 0, 'items');
    
    // Data is already stored in Firestore by the enrichment service
    if (enrichedData && enrichedData.length > 0) {
      toast.success(`CV enriched with ${enrichedData.length} external data sources`);
    }
    
    setExternalDataCompleted(true);
    setShowExternalData(false);
  };
  
  const handleSkipExternalData = () => {
    console.log('External data enrichment skipped');
    setExternalDataCompleted(true);
    setShowExternalData(false);
  };
  
  const handleNavigateToFeatures = (data: any) => {
    console.log('🚀 [CVAnalysisPage] Navigate to features called:', {
      jobId,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : []
    });
    
    if (!jobId) {
      console.error('❌ [CVAnalysisPage] No jobId available, cannot navigate');
      toast.error('Missing job ID for navigation');
      return;
    }

    const targetPath = `/customize/${jobId}`;
    console.log('📍 [CVAnalysisPage] Navigation target:', targetPath);

    try {
      // All data is persisted in Firestore, no need for sessionStorage
      // Navigate directly to feature selection with state
      navigate(targetPath, {
        state: {
          jobData: data?.jobData || job,
          roleContext: data?.roleContext,
          selectedRecommendations: data?.selectedRecommendations || [],
          analysisComplete: true
        }
      });
      
      toast.success('Analysis complete! Select your desired features.', { icon: '🚀' });
      
    } catch (error: unknown) {
      console.error('💥 [CVAnalysisPage] Critical error in navigation:', error);
      toast.error('Navigation error. Please try again.');
    }
  };

  const handleBack = () => {
    if (jobId) {
      navigate(`/process/${jobId}`);
    } else {
      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <Header 
          currentPage="analysis" 
          jobId={jobId}
          title="Analysis Results"
          subtitle="Loading your CV analysis..."
          variant="dark"
          showBreadcrumbs={true}
        />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <Loader2 className={`w-8 h-8 animate-spin text-${designSystem.colors.primary[400]} mx-auto mb-4`} />
              <h2 className={`text-xl font-semibold ${designSystem.accessibility.contrast.text.primary} mb-2`}>Loading Analysis Results</h2>
              <p className={designSystem.accessibility.contrast.text.secondary}>Please wait while we prepare your CV analysis...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <Header 
          currentPage="analysis" 
          jobId={jobId}
          title="Analysis Results"
          subtitle="Error loading analysis"
          variant="dark"
          showBreadcrumbs={true}
        />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className={`${designSystem.components.status.error} rounded-lg p-6`}>
            <div className="text-center">
              <div className={`text-${designSystem.colors.semantic.error[400]} text-xl mb-4`}>⚠️</div>
              <h2 className={`text-xl font-semibold ${designSystem.accessibility.contrast.text.primary} mb-2`}>Error Loading Analysis</h2>
              <p className={`${designSystem.accessibility.contrast.text.secondary} mb-6`}>{error}</p>
              <button
                onClick={handleBack}
                className={`${designSystem.components.button.base} ${designSystem.components.button.variants.primary.default} ${designSystem.components.button.sizes.md} inline-flex items-center space-x-2`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go Back</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <Header 
          currentPage="analysis" 
          jobId={jobId}
          title="Analysis Results"
          subtitle="Job not found"
          variant="dark"
          showBreadcrumbs={true}
        />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className={`text-xl font-semibold ${designSystem.accessibility.contrast.text.primary} mb-2`}>Job Not Found</h2>
            <p className={`${designSystem.accessibility.contrast.text.secondary} mb-6`}>The requested CV analysis could not be found.</p>
            <button
              onClick={() => navigate('/')}
              className={`${designSystem.components.button.base} ${designSystem.components.button.variants.primary.default} ${designSystem.components.button.sizes.md} inline-flex items-center space-x-2`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header 
        currentPage="analysis" 
        jobId={jobId}
        title="CV Analysis Complete"
        subtitle="Review your results and select improvements"
        variant="dark"
        showBreadcrumbs={true}
      />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showExternalData ? (
          <>
            <UnifiedAnalysisContainer
              jobId={jobId!}
              jobData={job}
              onNavigateToFeatures={handleNavigateToFeatures}
              className="animate-fade-in-up"
            />
            
            {/* External Data Enhancement Option */}
            {!externalDataCompleted && (
              <div className="mt-8 space-y-4">
                <div className="text-center">
                  <div className="w-px h-8 bg-neutral-600 mx-auto mb-4"></div>
                  <p className="text-sm text-neutral-400 mb-4">
                    Want to make your CV even more comprehensive?
                  </p>
                </div>
                
                <div className={`${designSystem.components.card.base} ${designSystem.components.card.variants.default} p-6`}>
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                        <Database className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-100 mb-2">
                        Enhance with External Data
                      </h3>
                      <p className="text-neutral-400 text-sm mb-4 max-w-2xl mx-auto leading-relaxed">
                        Import additional projects, certifications, and achievements from your GitHub, 
                        LinkedIn, and other professional profiles to create a more comprehensive CV.
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={handleSkipExternalData}
                        className="px-4 py-2 text-neutral-400 hover:text-neutral-200 transition-colors text-sm"
                      >
                        Skip This Step
                      </button>
                      
                      <button
                        onClick={() => setShowExternalData(true)}
                        className={`
                          ${designSystem.components.button.base}
                          ${designSystem.components.button.variants.primary.default}
                          ${designSystem.components.button.sizes.md}
                          flex items-center gap-2
                        `}
                      >
                        <Database className="w-4 h-4" />
                        Enhance with External Data
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <ExternalDataSources
            jobId={jobId!}
            onDataEnriched={handleExternalDataComplete}
            onSkip={handleSkipExternalData}
            className="animate-fade-in-up"
          />
        )}
      </main>
      
    </div>
  );
};