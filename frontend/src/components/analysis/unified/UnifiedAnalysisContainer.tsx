import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleDetectionSection } from '../role-detection/RoleDetectionSection';
import { RoleDetectionPremiumGate } from '../../role-profiles/premium/RoleDetectionPremiumGate';
import { CVAnalysisResults } from '../../CVAnalysisResults';
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

const UnifiedAnalysisContent: React.FC<{
  jobData: Job;
  jobId: string;
  onNavigateToFeatures?: (data: any) => void;
  className?: string;
}> = ({ jobData, jobId, onNavigateToFeatures, className = '' }) => {
  const { 
    state, 
    dispatch,
    initializeAnalysis,
    completeAnalysis,
    selectRole,
    proceedToNext,
    goBack,
    currentStepIndex,
    totalSteps,
    progressPercentage
  } = useUnifiedAnalysis();
  
  const navigate = useNavigate();
  
  useEffect(() => {
    initializeAnalysis(jobData);
    
    // Analysis completion is handled by the actual CV analysis
    // which is triggered automatically when jobData is loaded
  }, [jobData, initializeAnalysis]);
  
  // Watch for job status changes to detect when analysis is complete
  useEffect(() => {
    console.log('[UnifiedAnalysisContainer] Status check:', {
      jobStatus: jobData?.status,
      currentStep: state.currentStep,
      hasParsedData: !!jobData?.parsedData,
      canProceedToRoleDetection: state.canProceedToRoleDetection,
      analysisComplete: state.analysisResults?.analysisComplete,
      jobData: jobData
    });
    
    // Handle multiple statuses that indicate CV is ready for role detection
    // 'parsed' - initial parsing complete
    // 'analyzed' - analysis complete  
    // 'completed' - all processing done (but still might need role detection)
    // 'generating' - sometimes set after parsing before generation
    const validStatuses = ['analyzed', 'parsed', 'completed', 'generating'];
    const isValidStatus = jobData?.status && validStatuses.includes(jobData.status);
    
    if (isValidStatus && 
        state.currentStep === 'analysis' && 
        jobData?.parsedData &&
        !state.analysisResults?.analysisComplete) {
      console.log('[UnifiedAnalysisContainer] Triggering completeAnalysis for status:', jobData.status);
      // Analysis is complete, trigger transition to role-detection
      const analysisResults = {
        analysisComplete: true,
        processedAt: new Date().toISOString(),
        // Include any available analysis data from jobData
        ...(jobData.parsedData && { analysisData: jobData.parsedData })
      };
      
      completeAnalysis(analysisResults);
    }
  }, [jobData?.status, state.currentStep, state.analysisResults?.analysisComplete, completeAnalysis]);
  
  const handleRoleSelected = (role: DetectedRole) => {
    selectRole(role);
    toast.success(`Role "${role.roleName}" selected successfully!`);
    
    // Proceed immediately to next step
    proceedToNext();
  };
  
  const handleManualSelection = () => {
    console.log('Manual role selection requested - skipping to next step');
    proceedToNext();
  };
  
  const handleNavigateToFeatures = (data: any) => {
    if (onNavigateToFeatures) {
      onNavigateToFeatures(data);
    } else {
      navigate(`/customize/${jobId}`, {
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
      <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-100">CV Analysis</h1>
              <div className="text-sm text-gray-400">Step {currentStepIndex + 1} of {totalSteps}</div>
            </div>
            <div className="text-sm text-gray-300">{Math.round(progressPercentage)}% Complete</div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {state.currentStep === 'analysis' && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-full border border-green-500/30">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-300 font-medium">Analyzing CV...</span>
            </div>
            <div className="text-2xl font-bold text-gray-100">Processing Your CV</div>
            <p className="text-gray-400">
              Please wait while we analyze your CV and prepare role detection.
            </p>
          </div>
        )}
        
        {state.currentStep === 'role-detection' && (
          <RoleDetectionPremiumGate onSkip={handleManualSelection}>
            <RoleDetectionSection
              jobData={jobData}
              onRoleSelected={handleRoleSelected}
              onManualSelection={handleManualSelection}
            />
          </RoleDetectionPremiumGate>
        )}
        
        {/* Step 3: Improvements */}
        {state.currentStep === 'improvements' && (
          <div className="space-y-6">
            {/* Header showing context based on role selection */}
            <div className="text-center space-y-4 mb-8">
              {state.selectedRole ? (
                <>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-full border border-purple-500/30">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-purple-300 font-medium">Role-Based Analysis</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-100">
                    Enhanced Recommendations for {state.selectedRole.roleName}
                  </div>
                  <p className="text-gray-400">
                    Personalized CV improvements tailored to your selected role
                  </p>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-full border border-blue-500/30">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-blue-300 font-medium">General Analysis</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-100">
                    CV Improvement Recommendations
                  </div>
                  <p className="text-gray-400">
                    AI-powered suggestions to enhance your CV's impact
                  </p>
                </>
              )}
            </div>
            
            {/* CVAnalysisResults Component */}
            <CVAnalysisResults
              job={jobData}
              onContinue={(selectedRecommendations: string[]) => {
                // Navigate to features with the selected recommendations
                handleNavigateToFeatures({
                  jobData,
                  selectedRole: state.selectedRole,
                  selectedRecommendations,
                  roleAnalysis: state.roleAnalysis
                });
              }}
              onBack={() => {
                // Use the goBack helper method which handles step navigation logic
                goBack();
              }}
              className="w-full"
            />
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
              })}
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