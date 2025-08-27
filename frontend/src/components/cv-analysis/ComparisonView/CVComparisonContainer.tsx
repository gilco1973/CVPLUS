import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useCVAnalysisState } from '../../../hooks/useCVAnalysisState';
import { CVComparisonView } from '../../cv-comparison/CVComparisonView';

/**
 * Container component for CV comparison functionality
 * Handles the display of original vs improved CV data with comparison controls
 * Part of Phase 4 modularization - keeps component under 200 lines
 */
export function CVComparisonContainer() {
  const {
    job,
    originalCVData,
    improvedCVData,
    comparisonReport,
    showComparison,
    toggleComparison,
    onContinue
  } = useCVAnalysisState();

  // Don't render if not in comparison mode or no data
  if (!showComparison || !originalCVData) {
    return null;
  }

  const handleContinueToTemplates = () => {
    // Store the improved data for template generation
    if (improvedCVData) {
      sessionStorage.setItem(`improvements-${job.id}`, JSON.stringify(improvedCVData));
    }
    
    // Navigate to template selection or continue with the workflow
    onContinue([]);
  };

  return (
    <div className="space-y-6">
      {/* Back to Recommendations Button */}
      <div className="bg-gray-800 rounded-lg shadow-xl p-4 border border-gray-700">
        <button
          onClick={() => toggleComparison(false)}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800 rounded-lg p-2 -m-2"
          aria-label="Back to recommendations"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Recommendations</span>
        </button>
      </div>
      
      {/* Comparison View */}
      <CVComparisonView
        originalData={originalCVData}
        improvedData={improvedCVData}
        comparisonReport={comparisonReport}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
        jobId={job.id}
      >
        {/* CV Comparison Content */}
        <div className="p-6 text-center text-gray-600 dark:text-gray-400">
          {comparisonReport || improvedCVData ? (
            <div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                CV Improvements Applied
              </h3>
              <p className="text-sm">
                Use the comparison controls above to view your CV improvements
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-2 rounded-lg text-sm">
                  ✓ Original CV data preserved
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg text-sm">
                  ✨ Enhanced version created
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                CV Preview
              </h3>
              <p className="text-sm">
                Your improved CV will appear here after applying recommendations
              </p>
              <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-4 py-2 rounded-lg text-sm">
                ℹ️ Select and apply recommendations to see improvements
              </div>
            </div>
          )}
        </div>
      </CVComparisonView>
      
      {/* Continue to Templates Section */}
      {(improvedCVData || comparisonReport) && (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
          <div className="text-center space-y-4">
            {/* Success Message */}
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 text-green-300 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="font-medium">Improvements Successfully Applied!</span>
              </div>
              <p className="text-sm text-green-200">
                Your CV has been enhanced with the selected improvements. 
                Ready to choose a professional template?
              </p>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleContinueToTemplates}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              Continue to Template Selection
            </button>
            
            <p className="text-xs text-gray-500">
              Your improved CV data has been saved and will be used for template generation
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CVComparisonContainer;