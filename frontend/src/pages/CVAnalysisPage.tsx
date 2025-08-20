import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CVAnalysisResults } from '../components/CVAnalysisResults';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToJob } from '../services/cvService';
import type { Job } from '../services/cvService';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { designSystem } from '../config/designSystem';
import toast from 'react-hot-toast';

export const CVAnalysisPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      if (updatedJob.status !== 'analyzed' && updatedJob.status !== 'completed') {
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

  const handleContinueToPreview = (selectedRecommendations: string[]) => {
    console.log('🚀 [PARENT] handleContinueToPreview called:', {
      selectedRecommendations: selectedRecommendations.length,
      jobId,
      currentURL: window.location.href,
      currentPath: window.location.pathname
    });
    
    if (!jobId) {
      console.error('❌ [PARENT] No jobId available, cannot navigate');
      toast.error('Missing job ID for navigation');
      return;
    }

    const targetPath = `/preview/${jobId}`;
    console.log('📍 [PARENT] Navigation target:', targetPath);

    try {
      // Store recommendations data first (critical for preview page)
      sessionStorage.setItem(`recommendations-${jobId}`, JSON.stringify(selectedRecommendations));
      console.log('💾 [PARENT] Stored recommendations in sessionStorage');
      
      // Store navigation timestamp for debugging
      sessionStorage.setItem(`nav-timestamp-${jobId}`, Date.now().toString());
      
      // Enhanced navigation with multiple strategies
      console.log('🔄 [PARENT] Starting enhanced navigation sequence...');
      
      // Strategy 1: Immediate React Router navigation
      try {
        console.log('🔄 [PARENT] Attempt 1 - React Router navigate');
        navigate(targetPath, { replace: true });
        console.log('🔄 [PARENT] React Router navigate command executed');
      } catch (navigateError) {
        console.error('❌ [PARENT] React Router navigate failed:', navigateError);
        throw navigateError;
      }
      
      // Strategy 2: Verification with progressive fallbacks
      let verificationAttempt = 0;
      const maxVerificationAttempts = 12;
      const verificationInterval = 100;
      
      const verifyNavigation = () => {
        verificationAttempt++;
        const currentPath = window.location.pathname;
        
        console.log(`🔍 [PARENT] Verification ${verificationAttempt}/${maxVerificationAttempts}:`, {
          currentPath,
          targetPath,
          matched: currentPath === targetPath
        });
        
        if (currentPath === targetPath) {
          console.log('✅ [PARENT] Navigation verification successful!');
          toast.dismiss();
          toast.success('Welcome to CV Preview!', { icon: '🎉', duration: 3000 });
          return;
        }
        
        // Progressive fallback strategy
        if (verificationAttempt === 4) {
          // First fallback: Try navigate again
          console.log('🔄 [PARENT] Fallback 1 - Retry React Router');
          try {
            navigate(targetPath, { replace: false }); // Try without replace
          } catch (retryError) {
            console.error('❌ [PARENT] Retry navigate failed:', retryError);
          }
        } else if (verificationAttempt === 8) {
          // Second fallback: window.location.replace
          console.log('🔄 [PARENT] Fallback 2 - window.location.replace');
          try {
            window.location.replace(targetPath);
          } catch (replaceError) {
            console.error('❌ [PARENT] window.location.replace failed:', replaceError);
          }
        } else if (verificationAttempt >= maxVerificationAttempts) {
          // Final fallback: window.location.href
          console.log('🚑 [PARENT] Final fallback - window.location.href');
          toast.dismiss();
          toast.loading('Redirecting to preview...', { duration: 3000 });
          
          try {
            window.location.href = targetPath;
          } catch (hrefError) {
            console.error('💥 [PARENT] All navigation methods failed:', hrefError);
            toast.error('Navigation failed. Please refresh and try again.');
          }
          return;
        }
        
        // Continue verification
        setTimeout(verifyNavigation, verificationInterval);
      };
      
      // Start verification after small delay to allow initial navigation
      setTimeout(verifyNavigation, 50);
      
      // Show user feedback
      toast.loading('Preparing CV preview...', { duration: 2000 });
      
    } catch (error: unknown) {
      console.error('💥 [PARENT] Critical error in handleContinueToPreview:', error);
      toast.error('Navigation error. Attempting recovery...');
      
      // Emergency recovery navigation
      setTimeout(() => {
        try {
          console.log('🚑 [PARENT] Emergency recovery navigation');
          window.location.href = `/preview/${jobId}`;
        } catch (recoveryError: unknown) {
          console.error('💥 [PARENT] Recovery navigation failed:', recoveryError);
          toast.error('Complete navigation failure. Please refresh the page and try again.');
        }
      }, 300);
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
        <CVAnalysisResults
          job={job}
          onContinue={handleContinueToPreview}
          onBack={handleBack}
          className="animate-fade-in-up"
        />
      </main>
      
    </div>
  );
};