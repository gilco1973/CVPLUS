import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CVAnalysisResults } from '../components/CVAnalysisResults';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToJob } from '../services/cvService';
import type { Job } from '../services/cvService';
import { ArrowLeft, Loader2 } from 'lucide-react';
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
    console.log('🚀 [DEBUG] handleContinueToPreview called with:', selectedRecommendations);
    console.log('🚀 [DEBUG] Current jobId:', jobId);
    
    if (!jobId) {
      console.error('❌ [DEBUG] No jobId available, cannot navigate');
      return;
    }

    try {
      // Store selected recommendations in session storage for now
      // In a real app, you might want to save this to the job document
      sessionStorage.setItem(`recommendations-${jobId}`, JSON.stringify(selectedRecommendations));
      console.log('💾 [DEBUG] Stored recommendations in sessionStorage');
      
      // Navigate to preview page for feature selection and customization
      const targetPath = `/preview/${jobId}`;
      console.log('🚀 [DEBUG] Attempting navigation to:', targetPath);
      navigate(targetPath);
      console.log('✅ [DEBUG] Navigation call completed');
      
    } catch (error: any) {
      console.error('💥 [DEBUG] Error in handleContinueToPreview:', error);
      toast.error('Failed to navigate to preview. Please try again.');
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
      <div className="min-h-screen bg-gray-900">
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
              <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-100 mb-2">Loading Analysis Results</h2>
              <p className="text-gray-400">Please wait while we prepare your CV analysis...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header 
          currentPage="analysis" 
          jobId={jobId}
          title="Analysis Results"
          subtitle="Error loading analysis"
          variant="dark"
          showBreadcrumbs={true}
        />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
            <div className="text-center">
              <div className="text-red-400 text-xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-red-100 mb-2">Error Loading Analysis</h2>
              <p className="text-red-300 mb-6">{error}</p>
              <button
                onClick={handleBack}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
      <div className="min-h-screen bg-gray-900">
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
            <h2 className="text-xl font-semibold text-gray-100 mb-2">Job Not Found</h2>
            <p className="text-gray-400 mb-6">The requested CV analysis could not be found.</p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
    <div className="min-h-screen bg-gray-900">
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