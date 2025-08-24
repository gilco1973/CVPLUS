/**
 * Unified Analysis Container Component
 * Main orchestrator for the unified analysis experience with progressive disclosure
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleDetectionSection } from '../role-detection/RoleDetectionSection';
import { UnifiedAnalysisProvider, useUnifiedAnalysis } from '../context/UnifiedAnalysisContext';
import type { Job } from '../../../services/cvService';
import type { DetectedRole } from '../../../types/role-profiles';
import toast from 'react-hot-toast';

interface UnifiedAnalysisContainerProps {
  jobId: string;
  jobData: Job;
  onNavigateToFeatures?: (data: any) => void;
  className?: string;
}

// Inner component that uses the context
const UnifiedAnalysisContent: React.FC<{
  jobData: Job;
  jobId: string;
  onNavigateToFeatures?: (data: any) => void;
  className?: string;
}> = ({ jobData, jobId, onNavigateToFeatures, className = '' }) => {
  const { 
    state, 
    initializeAnalysis,
    completeAnalysis,
    selectRole,
    proceedToNext,
    currentStepIndex,
    totalSteps,
    progressPercentage
  } = useUnifiedAnalysis();
  
  const navigate = useNavigate();
  
  // Initialize analysis on mount
  useEffect(() => {
    initializeAnalysis(jobData);
    
    // Simulate analysis completion for demo
    // In real implementation, this would be triggered by actual analysis completion
    setTimeout(() => {
      completeAnalysis({
        atsScore: 85,
        analysisComplete: true,
        processedAt: new Date().toISOString()
      });
    }, 1000);
  }, [jobData, initializeAnalysis, completeAnalysis]);
  
  const handleRoleSelected = (role: DetectedRole) => {
    selectRole(role);
    toast.success(`Role "${role.roleName}" selected successfully!`);
    
    // Auto-proceed to next step after a short delay
    setTimeout(() => {
      proceedToNext();
    }, 1500);
  };
  
  const handleManualSelection = () => {
    console.log('Manual role selection requested');
  };
  
  const handleNavigateToFeatures = (data: any) => {
    if (onNavigateToFeatures) {
      onNavigateToFeatures(data);
    } else {
      // Default navigation to features page
      navigate(`/select-features/${jobId}`, {
        state: {
          jobData: data.jobData,
          roleContext: {
            selectedRole: data.selectedRole,
            selectedRecommendations: data.selectedRecommendations,
            roleAnalysis: data.roleAnalysis
          }
        }
      });
    }
  };
  
  return (
    <div className={`min-h-screen bg-neutral-900 ${className}`}>
      {/* Progress Indicator */}
      <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-100">CV Analysis</h1>
              <div className="text-sm text-gray-400">
                Step {currentStepIndex + 1} of {totalSteps}
              </div>
            </div>
            <div className="text-sm text-gray-300">
              {Math.round(progressPercentage)}% Complete
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Step 1: Analysis Results - Placeholder for existing analysis display */}
        {state.currentStep === 'analysis' && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-full border border-green-500/30">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-300 font-medium">Analyzing CV...</span>
            </div>
            <div className="text-2xl font-bold text-gray-100">
              Processing Your CV
            </div>
            <p className="text-gray-400">
              Please wait while we analyze your CV and prepare role detection.
            </p>
          </div>
        )}
        
        {/* Step 2: Role Detection */}
        {state.currentStep === 'role-detection' && (
          <RoleDetectionSection
            jobData={jobData}
            onRoleSelected={handleRoleSelected}
            onManualSelection={handleManualSelection}
          />
        )}
        
        {/* Step 3: Improvements - Placeholder for future implementation */}
        {state.currentStep === 'improvements' && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-full border border-purple-500/30">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-purple-300 font-medium">Loading Improvements...</span>
            </div>
            <div className="text-2xl font-bold text-gray-100">
              Role-Based Improvements
            </div>
            <p className="text-gray-400">
              Generating personalized recommendations based on your selected role: {state.selectedRole?.roleName}
            </p>
            {/* This will be replaced with actual improvements components */}
            <button
              onClick={() => handleNavigateToFeatures({
                jobData,
                selectedRole: state.selectedRole,
                selectedRecommendations: [],
                roleAnalysis: state.roleAnalysis
              })}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
            >
              Continue to Features
            </button>
          </div>
        )}
        
        {/* Step 4: Actions - Placeholder for future implementation */}
        {state.currentStep === 'actions' && (
          <div className="text-center space-y-6">
            <div className="text-2xl font-bold text-gray-100">
              Ready to Transform Your CV
            </div>
            <p className="text-gray-400">
              All analysis complete. Choose your next action.
            </p>
            <button
              onClick={() => handleNavigateToFeatures({
                jobData,
                selectedRole: state.selectedRole,
                selectedRecommendations: state.selectedRecommendations,
                roleAnalysis: state.roleAnalysis
              }))
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
            >
              Proceed to Feature Selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Main container component with provider
export const UnifiedAnalysisContainer: React.FC<UnifiedAnalysisContainerProps> = ({
  jobId,
  jobData,
  onNavigateToFeatures,
  className
}) => {
  return (
    <UnifiedAnalysisProvider
      initialJobData={jobData}
      onNavigateToFeatures={onNavigateToFeatures}
    >
      <UnifiedAnalysisContent
        jobData={jobData}
        jobId={jobId}
        onNavigateToFeatures={onNavigateToFeatures}
        className={className}
      />
    </UnifiedAnalysisProvider>
  );
};