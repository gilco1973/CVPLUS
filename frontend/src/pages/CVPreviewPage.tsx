import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CVPreview } from '../components/CVPreview';
import { Logo } from '../components/Logo';
import { UserMenu } from '../components/UserMenu';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToJob } from '../services/cvService';
import type { Job } from '../services/cvService';
import { ArrowLeft, Loader2 } from 'lucide-react';

export const CVPreviewPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, boolean>>({
    atsOptimization: true,
    keywordOptimization: true,
    achievementsShowcase: true,
    languageProficiency: false,
    certificationBadges: false,
    socialMediaLinks: false,
    qrCode: true
  });
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);

  useEffect(() => {
    if (!jobId) {
      setError('Job ID is required');
      setIsLoading(false);
      return;
    }

    // Load selected recommendations from session storage
    const storedRecommendations = sessionStorage.getItem(`recommendations-${jobId}`);
    if (storedRecommendations) {
      try {
        setSelectedRecommendations(JSON.parse(storedRecommendations));
      } catch (e) {
        console.warn('Failed to parse stored recommendations');
      }
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

      // Only show preview if CV has been analyzed
      if (updatedJob.status !== 'analyzed' && updatedJob.status !== 'completed') {
        // If job is still processing, redirect to processing page
        if (updatedJob.status === 'processing' || updatedJob.status === 'pending') {
          navigate(`/process/${jobId}`);
          return;
        }

        // If analysis not done, redirect to analysis page
        if (updatedJob.parsedData) {
          navigate(`/analysis/${jobId}`);
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

  const handleFeatureToggle = (feature: string, enabled: boolean) => {
    setSelectedFeatures(prev => ({
      ...prev,
      [feature]: enabled
    }));
  };

  const handleJobUpdate = (updates: Partial<Job['parsedData']>) => {
    if (job) {
      setJob(prev => prev ? {
        ...prev,
        parsedData: { ...prev.parsedData, ...updates }
      } : prev);
    }
  };

  const handleContinueToGeneration = () => {
    if (!jobId) return;

    // Store selected options for the generation process
    const generationConfig = {
      template: selectedTemplate,
      features: selectedFeatures,
      recommendations: selectedRecommendations
    };
    
    sessionStorage.setItem(`generation-config-${jobId}`, JSON.stringify(generationConfig));
    
    // Navigate to results/generation page
    navigate(`/results/${jobId}`);
  };

  const handleBackToAnalysis = () => {
    if (jobId) {
      navigate(`/analysis/${jobId}`);
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
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading CV Preview</h2>
              <p className="text-gray-600">Preparing your enhanced CV preview...</p>
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
              <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Preview</h2>
              <p className="text-red-700 mb-6">{error}</p>
              <button
                onClick={() => navigate(`/analysis/${jobId}`)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Analysis</span>
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
            <p className="text-gray-600 mb-6">The requested CV preview could not be found.</p>
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
                <span>Step 3 of 4:</span>
                <span className="font-medium text-blue-600">Preview & Customize</span>
              </div>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
          <button
            onClick={() => navigate(`/analysis/${jobId}`)}
            className="hover:text-blue-600 transition-colors"
          >
            Analysis Results
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium">Preview & Customize</span>
        </nav>

        {/* Preview Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">CV Preview</h1>
              <p className="text-gray-600">
                Review your enhanced CV with {selectedRecommendations.length} applied improvements. 
                Make final adjustments before generation.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToAnalysis}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Back to Analysis
              </button>
              <button
                onClick={handleContinueToGeneration}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <span>Generate Final CV</span>
              </button>
            </div>
          </div>

          {/* Template and Feature Selection */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Style
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="modern">Modern Professional</option>
                <option value="classic">Classic</option>
                <option value="creative">Creative</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>

            {/* Quick Feature Toggles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Features
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries({
                  atsOptimization: 'ATS Optimized',
                  keywordOptimization: 'Keywords',
                  achievementsShowcase: 'Achievements',
                  qrCode: 'QR Code'
                }).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => handleFeatureToggle(key, !selectedFeatures[key])}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedFeatures[key]
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CV Preview Component */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <CVPreview
            job={job}
            selectedTemplate={selectedTemplate}
            selectedFeatures={selectedFeatures}
            onUpdate={handleJobUpdate}
            onFeatureToggle={handleFeatureToggle}
          />
        </div>

        {/* Bottom Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>
                Your CV preview shows {selectedRecommendations.length} applied improvements.
              </p>
              <p className="mt-1">Ready to generate the final version?</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToAnalysis}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Modify Improvements
              </button>
              <button
                onClick={handleContinueToGeneration}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <span>Generate Final CV</span>
                <span className="text-xs bg-green-500 px-2 py-1 rounded-full">
                  Step 4
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};