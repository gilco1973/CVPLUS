import React from 'react';
import { Download, Eye, GitCompare, Share2, FileText, ArrowRight } from 'lucide-react';
import { useCVAnalysisState } from '../../../hooks/useCVAnalysisState';
import toast from 'react-hot-toast';

/**
 * Action buttons component for CV comparison view
 * Provides options to download, share, and navigate from the comparison
 * Part of Phase 4 modularization - keeps component under 200 lines
 */
export function ComparisonActions() {
  const {
    job,
    improvedCVData,
    comparisonReport,
    originalCVData,
    onContinue
  } = useCVAnalysisState();

  // Don't render if no comparison data
  if (!improvedCVData && !comparisonReport) {
    return null;
  }

  const handleDownloadOriginal = async () => {
    try {
      if (!originalCVData) {
        toast.error('Original CV data not available');
        return;
      }

      // Create downloadable content
      const content = JSON.stringify(originalCVData, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${job.id}-original-cv.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success('Original CV downloaded');
    } catch (error) {
      toast.error('Failed to download original CV');
      console.error('Download error:', error);
    }
  };

  const handleDownloadImproved = async () => {
    try {
      if (!improvedCVData) {
        toast.error('Improved CV data not available');
        return;
      }

      // Create downloadable content
      const content = JSON.stringify(improvedCVData, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${job.id}-improved-cv.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success('Improved CV downloaded');
    } catch (error) {
      toast.error('Failed to download improved CV');
      console.error('Download error:', error);
    }
  };

  const handleDownloadComparison = async () => {
    try {
      if (!comparisonReport) {
        toast.error('Comparison report not available');
        return;
      }

      // Create comparison report document
      const reportContent = {
        jobId: job.id,
        timestamp: new Date().toISOString(),
        improvements: comparisonReport.beforeAfter || [],
        summary: `${comparisonReport.beforeAfter?.length || 0} improvements applied`
      };

      const content = JSON.stringify(reportContent, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${job.id}-comparison-report.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success('Comparison report downloaded');
    } catch (error) {
      toast.error('Failed to download comparison report');
      console.error('Download error:', error);
    }
  };

  const handleShareComparison = async () => {
    try {
      const shareData = {
        title: 'CV Improvement Results',
        text: `Check out my CV improvements! ${comparisonReport?.beforeAfter?.length || 0} enhancements applied.`,
        url: window.location.href
      };

      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success('Shared successfully');
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard');
      }
    } catch (error) {
      toast.error('Failed to share');
      console.error('Share error:', error);
    }
  };

  const handleContinueToTemplates = () => {
    // Store improved data and continue
    if (improvedCVData) {
      sessionStorage.setItem(`improvements-${job.id}`, JSON.stringify(improvedCVData));
    }
    onContinue([]);
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-100">
          Actions
        </h3>
        <p className="text-sm text-gray-400">
          Download, share, or continue with your improved CV
        </p>
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {/* Download Original */}
        <button
          onClick={handleDownloadOriginal}
          disabled={!originalCVData}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm">Original CV</span>
        </button>

        {/* Download Improved */}
        <button
          onClick={handleDownloadImproved}
          disabled={!improvedCVData}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-green-700 text-green-100 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm">Improved CV</span>
        </button>

        {/* Download Report */}
        <button
          onClick={handleDownloadComparison}
          disabled={!comparisonReport}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-700 text-blue-100 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <FileText className="w-4 h-4" />
          <span className="text-sm">Report</span>
        </button>
      </div>

      {/* Secondary Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Share Button */}
        <button
          onClick={handleShareComparison}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-sm">Share Results</span>
        </button>

        {/* View Details */}
        <button
          onClick={() => {
            // Could open a detailed view modal
            toast.info('Detailed view coming soon');
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          <Eye className="w-4 h-4" />
          <span className="text-sm">View Details</span>
        </button>
      </div>

      {/* Primary CTA */}
      {improvedCVData && (
        <div className="border-t border-gray-700 pt-6">
          <button
            onClick={handleContinueToTemplates}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            <span>Continue to Templates</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <p className="text-xs text-gray-500 text-center mt-2">
            Your improved CV is ready for professional template selection
          </p>
        </div>
      )}
    </div>
  );
}

export default ComparisonActions;