import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CVPreview } from '../components/CVPreview';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToJob } from '../services/cvService';
import type { Job } from '../services/cvService';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const CVPreviewPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Show success toast when preview page loads from analysis
  useEffect(() => {
    const referrer = document.referrer;
    if (referrer.includes('/analysis/')) {
      toast.success('Successfully loaded CV preview!', { icon: '🎉', duration: 3000 });
    }
  }, []);
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);
  const [appliedImprovements, setAppliedImprovements] = useState<object | null>(null);

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
      } catch {
        console.warn('Failed to parse stored recommendations');
      }
    }

    // Load applied improvements if they exist
    const storedImprovements = sessionStorage.getItem(`improvements-${jobId}`);
    if (storedImprovements) {
      try {
        setAppliedImprovements(JSON.parse(storedImprovements));
      } catch {
        console.warn('Failed to parse stored improvements');
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
        if (!updatedJob.parsedData) {
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

  const handleJobUpdate = (updates: Partial<Job['parsedData']>) => {
    if (job) {
      setJob(prev => prev ? {
        ...prev,
        parsedData: { ...prev.parsedData, ...updates }
      } : prev);
    }
  };

  const handleContinueToFeatures = () => {
    if (!jobId) return;

    // Store selected template for the next step
    const previewConfig = {
      template: selectedTemplate,
      recommendations: selectedRecommendations
    };
    
    sessionStorage.setItem(`preview-config-${jobId}`, JSON.stringify(previewConfig));
    
    // Navigate to feature selection page (ResultsPage) for feature selection
    navigate(`/results/${jobId}`);
  };

  const handleBackToAnalysis = () => {
    if (jobId) {
      navigate(`/analysis/${jobId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header 
          currentPage="preview" 
          jobId={jobId}
          title="CV Preview"
          subtitle="Loading your enhanced CV preview..."
          variant="dark"
        />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-100 mb-2">Loading CV Preview</h2>
              <p className="text-gray-400">Preparing your enhanced CV preview...</p>
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
          currentPage="preview" 
          jobId={jobId}
          title="CV Preview"
          subtitle="Error loading preview"
          variant="dark"
        />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
            <div className="text-center">
              <div className="text-red-400 text-xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-red-100 mb-2">Error Loading Preview</h2>
              <p className="text-red-300 mb-6">{error}</p>
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
      <div className="min-h-screen bg-gray-900">
        <Header 
          currentPage="preview" 
          jobId={jobId}
          title="CV Preview"
          subtitle="Job not found"
          variant="dark"
        />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-100 mb-2">Job Not Found</h2>
            <p className="text-gray-400 mb-6">The requested CV preview could not be found.</p>
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
        currentPage="preview" 
        jobId={jobId}
        title="CV Text Improvements Preview"
        subtitle="Review your enhanced CV content before selecting features"
        variant="dark"
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Preview Controls */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-100 mb-2">CV Text Improvements Preview</h1>
              <p className="text-gray-400">
                {appliedImprovements ? 
                  `Review your enhanced CV with ${selectedRecommendations.length} applied text improvements. ` :
                  'Preview your enhanced CV content with applied text improvements. '
                }
                Choose a template style before proceeding to feature selection.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToAnalysis}
                className="px-4 py-2 text-gray-300 border border-gray-600 rounded-md hover:bg-gray-700 transition-colors"
              >
                Back to Analysis
              </button>
              <button
                onClick={handleContinueToFeatures}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors flex items-center space-x-2 shadow-lg"
              >
                <span>Continue to Features</span>
              </button>
            </div>
          </div>

          {/* Template Selection */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Template Style
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'modern', name: 'Modern Professional', emoji: '💼' },
                { value: 'classic', name: 'Classic', emoji: '📄' },
                { value: 'creative', name: 'Creative', emoji: '🎨' },
                { value: 'minimal', name: 'Minimal', emoji: '✨' }
              ].map((template) => (
                <button
                  key={template.value}
                  onClick={() => setSelectedTemplate(template.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedTemplate === template.value
                      ? 'border-blue-400 bg-blue-900/30 text-blue-300'
                      : 'border-gray-600 hover:border-gray-500 text-gray-300 bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{template.emoji}</span>
                    <div>
                      <div className="font-medium text-sm">{template.name}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Applied Improvements Notice */}
        {appliedImprovements && selectedRecommendations.length > 0 && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-green-200">Text Improvements Applied</h4>
                <p className="text-xs text-green-300 mt-1">
                  Your CV content has been enhanced with {selectedRecommendations.length} AI-powered text improvements.
                </p>
                <ul className="text-xs text-green-300 mt-2 space-y-1">
                  {selectedRecommendations.slice(0, 3).map((rec, index) => (
                    <li key={index} className="flex items-center space-x-1">
                      <span className="w-1 h-1 bg-green-400 rounded-full"></span>
                      <span>{rec.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </li>
                  ))}
                  {selectedRecommendations.length > 3 && (
                    <li className="text-green-400">...and {selectedRecommendations.length - 3} more</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* CV Preview */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <CVPreview
            job={job}
            selectedTemplate={selectedTemplate}
            selectedFeatures={{}}
            appliedImprovements={appliedImprovements}
            onUpdate={handleJobUpdate}
          />
        </div>

        {/* Bottom Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>
                Your CV preview shows enhanced content with {selectedRecommendations.length} applied text improvements.
              </p>
              <p className="mt-1">Ready to select interactive features for your final CV?</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToAnalysis}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Modify Text Improvements
              </button>
              <button
                onClick={handleContinueToFeatures}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <span>Continue to Features</span>
                <span className="text-xs bg-blue-500 px-2 py-1 rounded-full">
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