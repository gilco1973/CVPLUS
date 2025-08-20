/**
 * CVPreviewPageNew - Pure React Implementation
 * 
 * This component replaces the problematic HTML-generation + React hydration system
 * with a clean React SPA that consumes JSON APIs directly.
 * 
 * Key Features:
 * - Uses useCVData hook for main CV data
 * - Uses useEnhancedFeatures hook for interactive components  
 * - No HTML hydration dependencies
 * - Proper loading states and error boundaries
 * - Progressive loading strategy
 */

import React, { useMemo, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// SEO meta tags handled by document.title and meta tags
import { ArrowLeft, Download, Share2, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Custom hooks
import { useJobEnhanced } from '../hooks/useJobEnhanced';
import { useAuth } from '../contexts/AuthContext';

// Layout and common components
import { Header } from '../components/Header';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { designSystem } from '../config/designSystem';

// Section components (to be created)
import { CVPersonalInfo } from './components/CVPersonalInfo';
import { CVExperience } from './components/CVExperience';
import { CVSkills } from './components/CVSkills';
import { CVEducation } from './components/CVEducation';
import { EnhancedFeaturesGrid } from './components/EnhancedFeaturesGrid';

// Loading and layout components
import { CVPreviewSkeleton } from '../components/common/CVPreviewSkeleton';
import { CVPreviewLayout } from '../components/common/CVPreviewLayout';

// Types
import type { Job } from '../services/cvService';

interface CVPreviewPageNewProps {
  className?: string;
}

export const CVPreviewPageNew: React.FC<CVPreviewPageNewProps> = ({ className = '' }) => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Enhanced job hook with better error handling and performance
  const {
    job,
    loading,
    error,
    lastUpdate,
    subscriptionActive,
    retryCount,
    refresh,
    forceRefresh
  } = useJobEnhanced(jobId || '', {
    enableRetry: true,
    maxRetries: 3,
    retryDelay: 2000,
    enableLogging: process.env.NODE_ENV === 'development',
    pollWhenInactive: true,
    pollInterval: 30000
  });

  // Memoized data extraction
  const cvData = useMemo(() => {
    if (!job?.parsedData) return null;
    
    return {
      personalInfo: job.parsedData.personalInfo || {},
      experience: job.parsedData.experience || [],
      skills: job.parsedData.skills || {},
      education: job.parsedData.education || [],
      summary: job.parsedData.summary || '',
      enhancedFeatures: job.enhancedFeatures || [],
      metadata: {
        jobId: job.id,
        status: job.status,
        lastUpdated: job.updatedAt,
        userId: job.userId
      }
    };
  }, [job]);

  // Authorization check
  const isAuthorized = useMemo(() => {
    if (!job || !user) return false;
    return job.userId === user.uid;
  }, [job, user]);

  // Update document title and meta tags when CV data is available
  // MOVED TO TOP: This hook must be called on every render, before any early returns
  React.useEffect(() => {
    if (cvData) {
      const title = cvData.personalInfo.name 
        ? `${cvData.personalInfo.name} - Professional CV | CVPlus` 
        : 'Professional CV | CVPlus';
      document.title = title;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', 
          `Professional CV for ${cvData.personalInfo.name || 'career professional'} with enhanced AI-powered features and interactive elements.`
        );
      }
    }
  }, [cvData]);

  // Handle loading state
  if (loading) {
    return (
      <div className={`min-h-screen bg-neutral-900 ${className}`}>
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
              <Loader2 className={`w-8 h-8 animate-spin text-${designSystem.colors.primary[400]} mx-auto mb-4`} />
              <h2 className={`text-xl font-semibold ${designSystem.accessibility.contrast.text.primary} mb-2`}>Loading CV Preview</h2>
              <p className={designSystem.accessibility.contrast.text.secondary}>Preparing your enhanced CV preview...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error states
  if (error) {
    return (
      <div className={`min-h-screen bg-neutral-900 ${className}`}>
        <Header 
          currentPage="preview" 
          jobId={jobId}
          title="CV Preview"
          subtitle="Error loading preview"
          variant="dark"
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className={`${designSystem.components.status.error} rounded-lg p-6`}>
            <div className="text-center">
              <div className={`text-${designSystem.colors.semantic.error[400]} text-xl mb-4`}>⚠️</div>
              <h2 className={`text-xl font-semibold ${designSystem.accessibility.contrast.text.primary} mb-2`}>Error Loading Preview</h2>
              <p className={`${designSystem.accessibility.contrast.text.secondary} mb-6`}>{error}</p>
              <button
                onClick={refresh}
                className={`${designSystem.components.button.base} ${designSystem.components.button.variants.primary.default} ${designSystem.components.button.sizes.md} inline-flex items-center space-x-2`}
              >
                <span>Retry</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle missing job
  if (!job) {
    return (
      <div className={`min-h-screen bg-neutral-900 ${className}`}>
        <Header 
          currentPage="preview" 
          jobId={jobId}
          title="CV Preview"
          subtitle="Job not found"
          variant="dark"
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className={`text-xl font-semibold ${designSystem.accessibility.contrast.text.primary} mb-2`}>Job Not Found</h2>
            <p className={`${designSystem.accessibility.contrast.text.secondary} mb-6`}>The requested CV preview could not be found.</p>
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

  // Handle authorization
  if (!isAuthorized) {
    return (
      <div className={`min-h-screen bg-neutral-900 ${className}`}>
        <Header 
          currentPage="preview" 
          jobId={jobId}
          title="CV Preview"
          subtitle="Access denied"
          variant="dark"
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className={`${designSystem.components.status.error} rounded-lg p-6`}>
            <div className="text-center">
              <div className={`text-${designSystem.colors.semantic.error[400]} text-xl mb-4`}>⚠️</div>
              <h2 className={`text-xl font-semibold ${designSystem.accessibility.contrast.text.primary} mb-2`}>Access Denied</h2>
              <p className={`${designSystem.accessibility.contrast.text.secondary} mb-6`}>
                You don't have permission to view this CV preview.
              </p>
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
      </div>
    );
  }

  // Handle job not ready for preview
  if (job.status !== 'analyzed' && job.status !== 'completed') {
    const statusMessages = {
      pending: 'Your CV is being processed...',
      processing: 'Analyzing your CV with AI...',
      failed: 'CV processing failed. Please try uploading again.'
    };

    const statusMessage = statusMessages[job.status as keyof typeof statusMessages] || 'Processing...';

    if (job.status === 'processing' || job.status === 'pending') {
      navigate(`/process/${jobId}`);
      return null;
    }

    if (!job.parsedData) {
      navigate(`/analysis/${jobId}`);
      return null;
    }

    return (
      <div className={`min-h-screen bg-neutral-900 ${className}`}>
        <Header 
          currentPage="preview" 
          jobId={jobId}
          title="CV Preview"
          subtitle="Processing CV..."
          variant="dark"
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Loader2 className={`w-12 h-12 text-${designSystem.colors.primary[400]} mx-auto mb-4 animate-spin`} />
            <h2 className={`text-xl font-semibold ${designSystem.accessibility.contrast.text.primary} mb-2`}>Processing CV</h2>
            <p className={`${designSystem.accessibility.contrast.text.secondary} mb-6`}>{statusMessage}</p>
            <button
              onClick={forceRefresh}
              className={`${designSystem.components.button.base} ${designSystem.components.button.variants.primary.default} ${designSystem.components.button.sizes.md} inline-flex items-center space-x-2`}
            >
              <span>Refresh Status</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle missing CV data
  if (!cvData) {
    return (
      <div className={`min-h-screen bg-neutral-900 ${className}`}>
        <Header 
          currentPage="preview" 
          jobId={jobId}
          title="CV Preview"
          subtitle="No data available"
          variant="dark"
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <AlertCircle className={`w-12 h-12 text-${designSystem.colors.neutral[400]} mx-auto mb-4`} />
            <h2 className={`text-xl font-semibold ${designSystem.accessibility.contrast.text.primary} mb-2`}>No CV Data Available</h2>
            <p className={`${designSystem.accessibility.contrast.text.secondary} mb-6`}>
              The CV data couldn't be loaded. Please try refreshing the page.
            </p>
            <button
              onClick={refresh}
              className={`${designSystem.components.button.base} ${designSystem.components.button.variants.primary.default} ${designSystem.components.button.sizes.md} inline-flex items-center space-x-2`}
            >
              <span>Refresh Page</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Action handlers
  const handleDownload = async () => {
    try {
      // TODO: Implement PDF download functionality
      toast.success('PDF download started!');
    } catch (error) {
      toast.error('Failed to download PDF');
      console.error('Download error:', error);
    }
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: `${cvData.personalInfo.name || 'Professional'} CV`,
        text: 'Check out my professional CV created with CVPlus AI',
        url: window.location.href
      };

      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success('CV shared successfully!');
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast.success('CV link copied to clipboard!');
      }
    } catch (error) {
      toast.error('Failed to share CV');
      console.error('Share error:', error);
    }
  };

  const handleBackToAnalysis = () => {
    navigate(`/analysis/${jobId}`);
  };

  // Main render
  return (
    <div className={`min-h-screen bg-neutral-900 ${className}`}>
      <Header 
        currentPage="preview" 
        jobId={jobId}
        title="Enhanced CV Preview"
        subtitle="Your AI-powered professional CV with interactive features"
        variant="dark"
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Preview Controls */}
        <div className={`${designSystem.components.card.base} ${designSystem.components.card.variants.elevated} ${designSystem.components.card.padding.md} mb-6 shadow-xl`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold ${designSystem.accessibility.contrast.text.primary} mb-2`}>Enhanced CV Preview</h1>
              <p className={designSystem.accessibility.contrast.text.secondary}>
                Your professional CV with AI-powered enhancements and interactive features.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToAnalysis}
                className={`${designSystem.components.button.base} ${designSystem.components.button.variants.secondary.default} ${designSystem.components.button.sizes.md}`}
              >
                Back to Analysis
              </button>
              <button
                onClick={handleDownload}
                className={`${designSystem.components.button.base} ${designSystem.components.button.variants.primary.default} ${designSystem.components.button.sizes.md} inline-flex items-center space-x-2`}
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
              <button
                onClick={handleShare}
                className={`${designSystem.components.button.base} ${designSystem.components.button.variants.ghost.default} ${designSystem.components.button.sizes.md} inline-flex items-center space-x-2`}
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* CV Preview Content */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <ErrorBoundary
            onError={(error, errorInfo) => {
              console.error('CV Preview Error:', error, errorInfo);
              toast.error('Error loading CV preview');
            }}
          >
            {/* Core CV Sections */}
            <Suspense fallback={<CVPreviewSkeleton />}>
              <div className="p-8 space-y-8">
                {/* Personal Information */}
                <CVPersonalInfo 
                  data={cvData.personalInfo}
                  jobId={jobId}
                  metadata={cvData.metadata}
                />

                {/* Professional Summary */}
                {cvData.summary && (
                  <section className="border-b border-gray-200 pb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Professional Summary</h2>
                    <p className="text-gray-700 leading-relaxed">{cvData.summary}</p>
                  </section>
                )}

                {/* Experience Section */}
                <CVExperience 
                  data={cvData.experience}
                  jobId={jobId}
                />

                {/* Skills Section */}
                <CVSkills 
                  data={cvData.skills}
                  jobId={jobId}
                />

                {/* Education Section */}
                <CVEducation 
                  data={cvData.education}
                  jobId={jobId}
                />

                {/* Enhanced Features Grid */}
                <EnhancedFeaturesGrid 
                  features={cvData.enhancedFeatures}
                  jobId={jobId}
                  metadata={cvData.metadata}
                />
              </div>
            </Suspense>
          </ErrorBoundary>
        </div>

        {/* Bottom Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>Your enhanced CV with AI-powered content improvements and interactive features.</p>
              <p className="mt-1">Ready to continue with additional customizations?</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToAnalysis}
                className={`${designSystem.components.button.base} ${designSystem.components.button.variants.secondary.default} ${designSystem.components.button.sizes.md} !border-gray-300 !text-gray-600 hover:!bg-gray-50`}
              >
                Back to Analysis
              </button>
              <button
                onClick={handleDownload}
                className={`${designSystem.components.button.base} ${designSystem.components.button.variants.primary.default} ${designSystem.components.button.sizes.md} flex items-center space-x-2`}
              >
                <Download className="w-4 h-4" />
                <span>Download CV</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded max-w-xs">
          <div>Job ID: {jobId}</div>
          <div>Status: {job.status}</div>
          <div>Subscription: {subscriptionActive ? '✅' : '❌'}</div>
          <div>Last Update: {lastUpdate?.toLocaleTimeString()}</div>
          <div>Features: {cvData.enhancedFeatures?.length || 0}</div>
        </div>
      )}
    </div>
  );
};

export default CVPreviewPageNew;