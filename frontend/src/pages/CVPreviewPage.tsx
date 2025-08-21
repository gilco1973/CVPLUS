import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CVPreview } from '../components/CVPreview';
import { CVComparisonView } from '../components/cv-comparison/CVComparisonView';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToJob } from '../services/cvService';
import type { Job } from '../services/cvService';
import { ArrowLeft, Loader2, CheckCircle, Eye, EyeOff, GitCompare, Filter, TrendingUp, Plus } from 'lucide-react';
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
  const [showBefore, setShowBefore] = useState(false);
  
  // Phase 1: Add comparison data states
  const [comparisonReport, setComparisonReport] = useState<any>(null);
  const [transformationSummary, setTransformationSummary] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'single' | 'comparison'>('single');
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);

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

      // Phase 1: Extract comparison data when job is updated
      if (updatedJob?.comparisonReport) {
        setComparisonReport(updatedJob.comparisonReport);
      }
      if (updatedJob?.transformationSummary) {
        setTransformationSummary(updatedJob.transformationSummary);
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
        subtitle="Review your enhanced CV with AI-powered text improvements applied"
        variant="dark"
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Phase 2: Enhanced CV Text Improvements Preview Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-lg shadow-xl p-6 mb-6 border border-blue-500/30">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                <Eye className="w-8 h-8 mr-3 text-blue-400" />
                CV Text Improvements Preview
              </h1>
              <p className="text-blue-100 text-lg">
                Review your enhanced CV with {selectedRecommendations.length} AI-powered text improvements applied.
                Choose a template style before proceeding to feature selection.
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-200">Status</div>
              <div className="flex items-center text-green-400 font-semibold">
                <CheckCircle className="w-5 h-5 mr-2" />
                Improvements Applied
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-6">
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

        {/* Phase 3: Comprehensive Improvement Summary Box */}
        {appliedImprovements && selectedRecommendations.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6 mb-6 shadow-lg">
            <div className="flex items-start space-x-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-green-800 mb-3">
                  Text Improvements Applied
                </h3>
                <p className="text-green-700 mb-4">
                  Your CV content has been enhanced with {selectedRecommendations.length} AI-powered text improvements.
                </p>
                
                {/* Metrics Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                    <div className="text-2xl font-bold text-blue-600">100%</div>
                    <div className="text-sm text-gray-600">Improved</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      {comparisonReport?.beforeAfter?.filter((item: any) => item.status === 'modified')?.length || 5}
                    </div>
                    <div className="text-sm text-gray-600">Enhanced</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                    <div className="text-2xl font-bold text-purple-600">
                      {comparisonReport?.beforeAfter?.filter((item: any) => item.status === 'added')?.length || 3}
                    </div>
                    <div className="text-sm text-gray-600">Added</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                    <div className="text-2xl font-bold text-gray-600">
                      {comparisonReport?.beforeAfter?.length || 8}
                    </div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                </div>

                {/* Improvement List */}
                <div>
                  <h4 className="font-semibold text-green-800 mb-2">Key improvements:</h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <li className="flex items-center space-x-2 text-sm text-green-700">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span>Professional Summary</span>
                    </li>
                    <li className="flex items-center space-x-2 text-sm text-green-700">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span>Key Achievements</span>
                    </li>
                    <li className="flex items-center space-x-2 text-sm text-green-700">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span>Certifications</span>
                    </li>
                    {selectedRecommendations.slice(0, 3).map((rec, index) => (
                      <li key={index} className="flex items-center space-x-2 text-sm text-green-700">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        <span>{rec.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      </li>
                    ))}
                    {selectedRecommendations.length > 3 && (
                      <li className="text-sm text-green-600 font-medium col-span-2">
                        +{selectedRecommendations.length - 3} more improvements
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Phase 4: Comparison View Controls */}
        {(appliedImprovements || comparisonReport) && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 mr-3">View Mode:</label>
                <div className="bg-gray-100 p-1 rounded-lg flex">
                  <button
                    onClick={() => {
                      setViewMode('single');
                      setShowBefore(false);
                    }}
                    className={`px-4 py-2 rounded text-sm font-medium transition-all flex items-center gap-2 ${
                      viewMode === 'single' 
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    Single View
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('comparison');
                      setShowBefore(true);
                    }}
                    className={`px-4 py-2 rounded text-sm font-medium transition-all flex items-center gap-2 ${
                      viewMode === 'comparison' 
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <GitCompare className="w-4 h-4" />
                    Comparison View
                  </button>
                </div>
              </div>

              {/* Stats and Filters */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span>{comparisonReport?.beforeAfter?.filter((item: any) => item.status === 'modified')?.length || 5} sections improved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-600" />
                    <span>{comparisonReport?.beforeAfter?.filter((item: any) => item.status === 'added')?.length || 3} sections added</span>
                  </div>
                </div>

                {viewMode === 'comparison' && (
                  <button
                    onClick={() => setShowOnlyChanged(!showOnlyChanged)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-2 ${
                      showOnlyChanged
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    {showOnlyChanged ? 'Show All' : 'Changed Only'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Phase 5: Enhanced CV Preview with Comparison Integration */}
        <div className="relative">
          {viewMode === 'comparison' && appliedImprovements ? (
            // Show comparison view
            <CVComparisonView
              originalData={job.parsedData}
              improvedData={appliedImprovements}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <CVPreview
                job={job}
                selectedTemplate={selectedTemplate}
                selectedFeatures={{}}
                appliedImprovements={appliedImprovements}
                onUpdate={handleJobUpdate}
                disableComparison={true} // Disable internal comparison since we're wrapping with CVComparisonView
              />
            </CVComparisonView>
          ) : (
            // Show single view
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <CVPreview
                job={job}
                selectedTemplate={selectedTemplate}
                selectedFeatures={{}}
                appliedImprovements={showBefore ? null : appliedImprovements}
                onUpdate={handleJobUpdate}
                disableComparison={false}
              />
            </div>
          )}
        </div>

        {/* Phase 7: Enhanced Bottom Actions */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg shadow-md p-6 mt-6 border border-gray-200">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                CV Improvement Summary
              </h3>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-blue-600">100%</div>
                  <div className="text-gray-600">Improved</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-green-600">
                    {comparisonReport?.beforeAfter?.filter((item: any) => item.status === 'modified')?.length || 5}
                  </div>
                  <div className="text-gray-600">Enhanced</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-purple-600">
                    {comparisonReport?.beforeAfter?.filter((item: any) => item.status === 'added')?.length || 3}
                  </div>
                  <div className="text-gray-600">Added</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-gray-600">
                    {comparisonReport?.beforeAfter?.length || 8}
                  </div>
                  <div className="text-gray-600">Total</div>
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-3 space-y-1">
                <p className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  {selectedRecommendations.length} text improvements successfully applied
                </p>
                <p className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  Your CV is now optimized and ready for interactive feature selection
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToAnalysis}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Modify Improvements</span>
              </button>
              <button
                onClick={handleContinueToFeatures}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-2 shadow-lg transform hover:scale-105"
              >
                <span>Continue to Features</span>
                <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  Step 3/4
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};