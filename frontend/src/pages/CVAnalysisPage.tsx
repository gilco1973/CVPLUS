import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CVAnalysisResults } from '../components/CVAnalysisResults';
import { Logo } from '../components/Logo';
import { UserMenu } from '../components/UserMenu';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToJob } from '../services/cvService';
import type { Job } from '../services/cvService';
import { ArrowLeft, Loader2 } from 'lucide-react';

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
    if (!jobId) return;

    // Store selected recommendations in session storage for now
    // In a real app, you might want to save this to the job document
    sessionStorage.setItem(`recommendations-${jobId}`, JSON.stringify(selectedRecommendations));
    
    // Navigate to preview with recommendations
    navigate(`/preview/${jobId}`);
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
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Logo />
              <UserMenu />
            </div>
          </div>
        </header>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Analysis Results</h2>
              <p className="text-gray-600">Please wait while we prepare your CV analysis...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Logo />
              <UserMenu />
            </div>
          </div>
        </header>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-center">
              <div className="text-red-600 text-xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Analysis</h2>
              <p className="text-red-700 mb-6">{error}</p>
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
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Logo />
              <UserMenu />
            </div>
          </div>
        </header>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Job Not Found</h2>
            <p className="text-gray-600 mb-6">The requested CV analysis could not be found.</p>
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo />
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
                <span>Step 2 of 4:</span>
                <span className="font-medium text-blue-600">Review Analysis</span>
              </div>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
          <button
            onClick={handleBack}
            className="hover:text-blue-600 transition-colors"
          >
            Processing
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium">Analysis Results</span>
        </nav>

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