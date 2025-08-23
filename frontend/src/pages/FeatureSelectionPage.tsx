import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Sparkles, Zap, AlertTriangle, Crown, Target, CheckCircle } from 'lucide-react';
import { PremiumFeatureSelectionPanel } from '../components/PremiumFeatureSelectionPanel';
import { Header } from '../components/Header';
import { Section } from '../components/layout/Section';
import { updateJobFeatures, getJob } from '../services/cvService';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureValidation, useBulkFeatureOperations } from '../hooks/useFeatureValidation';
import { usePremiumStatus } from '../hooks/usePremiumStatus';
import toast from 'react-hot-toast';
import { FEATURE_CONFIGS } from '../config/featureConfigs';
// Role profiles are now handled in the dedicated RoleSelectionPage

export const FeatureSelectionPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [jobData, setJobData] = useState<any>(null);
  const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);
  const [roleContext, setRoleContext] = useState<any>(null);

  // Feature validation hook
  const {
    isValid: isSelectionValid,
    restrictedFeatures,
    warnings,
    validateAndFilter
  } = useFeatureValidation({
    selectedFeatures,
    enforceRestrictions: true,
    onFeatureRestricted: (featureId, premiumType) => {
      toast.error(`${featureId} requires ${premiumType} access. Please upgrade to use this feature.`);
      setShowPremiumPrompt(true);
    }
  });

  // Bulk operations hook
  const { selectAllAccessible, selectOnlyFree, getAccessibleCount, getPremiumCount } = useBulkFeatureOperations();

  // Initialize default feature selections and role context
  useEffect(() => {
    // Get role context from navigation state if available
    const state = location.state;
    if (state?.roleContext) {
      setRoleContext(state.roleContext);
    }
  }, [location.state]);

  // Initialize default feature selections
  useEffect(() => {
    const initializeDefaults = async () => {
      if (!jobId) return;

      try {
        // Load job data to check if features were already selected
        const job = await getJob(jobId);
        setJobData(job);

        // Set default feature selections
        const defaults: Record<string, boolean> = {
          // Core features (always enabled by default)
          'atsOptimized': true,
          'keywordOptimization': true,
          'achievementsShowcase': true,
          
          // Enhancement features (selectable)
          'embedQRCode': true,
          'socialMediaLinks': false,
          'languageProficiency': false,
          'certificationBadges': false,
          
          // Advanced features (selectable)
          'skillsVisualization': false,
          'portfolioGallery': false,
          'careerTimeline': false,
          'personalityInsights': false
        };

        // If job already has selected features, use those instead
        if (job?.selectedFeatures && job.selectedFeatures.length > 0) {
          const existingSelections: Record<string, boolean> = {};
          
          // First set all to false
          Object.keys(defaults).forEach(key => {
            existingSelections[key] = false;
          });
          
          // Then enable the selected ones
          job.selectedFeatures.forEach((featureId: string) => {
            // Convert kebab-case to camelCase for the UI
            const camelCaseKey = Object.keys(FEATURE_CONFIGS).find(
              key => FEATURE_CONFIGS[key].id === featureId
            );
            if (camelCaseKey) {
              existingSelections[camelCaseKey] = true;
            }
          });
          
          setSelectedFeatures(existingSelections);
        } else {
          setSelectedFeatures(defaults);
        }
      } catch (error) {
        console.error('Error loading job data:', error);
        // Fallback to defaults if job loading fails
        setSelectedFeatures({
          'atsOptimized': true,
          'keywordOptimization': true,
          'achievementsShowcase': true,
          'embedQRCode': true,
          'socialMediaLinks': false,
          'languageProficiency': false,
          'certificationBadges': false,
          'skillsVisualization': false,
          'portfolioGallery': false,
          'careerTimeline': false,
          'personalityInsights': false
        });
      }
    };

    initializeDefaults();
  }, [jobId]);

  const handleFeatureToggle = (featureId: string, enabled: boolean) => {
    setSelectedFeatures(prev => ({
      ...prev,
      [featureId]: enabled
    }));
  };

  const handleSelectAll = () => {
    const allFeatureIds = Object.keys(selectedFeatures);
    const accessibleFeatures = selectAllAccessible(allFeatureIds);
    setSelectedFeatures(accessibleFeatures);
    
    if (!isPremium && getPremiumCount(allFeatureIds) > 0) {
      toast.info(`Selected all accessible features. Upgrade to unlock ${getPremiumCount(allFeatureIds)} premium features.`);
    }
  };

  const handleSelectNone = () => {
    const allFeatureIds = Object.keys(selectedFeatures);
    const noneSelected = selectOnlyFree(allFeatureIds);
    
    // Keep core features always enabled
    noneSelected['atsOptimized'] = true;
    noneSelected['keywordOptimization'] = true; 
    noneSelected['achievementsShowcase'] = true;
    
    setSelectedFeatures(noneSelected);
  };

  const handleContinue = async () => {
    if (!jobId || !user) {
      toast.error('Missing job ID or user authentication');
      return;
    }

    // Critical: Validate and filter features before sending to server
    const validatedFeatures = validateAndFilter();
    
    // Show warnings if any features were filtered out
    if (restrictedFeatures.length > 0) {
      toast.error(`${restrictedFeatures.length} premium features were removed. Please upgrade to access them.`);
      setShowPremiumPrompt(true);
    }

    setIsLoading(true);
    try {
      // Convert ONLY validated features to kebab-case feature IDs
      const selectedFeatureIds: string[] = [];
      
      Object.entries(validatedFeatures).forEach(([camelCaseKey, isSelected]) => {
        if (isSelected && FEATURE_CONFIGS[camelCaseKey]) {
          selectedFeatureIds.push(FEATURE_CONFIGS[camelCaseKey].id);
        }
      });

      console.log('🔒 Validated features for processing:', selectedFeatureIds);
      console.log('🚫 Restricted features filtered out:', restrictedFeatures);

      // Update job with ONLY accessible features - server will also validate
      const serverResponse = await updateJobFeatures(jobId, selectedFeatureIds);

      // Server response includes server-side validation results
      const serverValidatedCount = serverResponse.validatedFeatures.length;
      const serverRemovedCount = serverResponse.removedFeatures.length;
      
      console.log('🔒 Server validation results:', {
        requested: selectedFeatureIds.length,
        validated: serverValidatedCount,
        removed: serverRemovedCount,
        clientRestricted: restrictedFeatures.length
      });

      // Show appropriate success message based on server response
      if (serverRemovedCount > 0) {
        toast.success(serverResponse.message);
      } else if (restrictedFeatures.length > 0) {
        toast.success(`${serverValidatedCount} features selected. ${restrictedFeatures.length} premium features require upgrade.`);
      } else {
        toast.success(`${serverValidatedCount} features selected for your CV!`);
      }
      
      // Navigate to processing page
      navigate(`/process/${jobId}`);
    } catch (error: any) {
      console.error('Error updating job features:', error);
      
      // Check if error is related to premium access
      if (error.message?.includes('premium') || error.message?.includes('access')) {
        toast.error('Some features require premium access. Please upgrade or remove premium features.');
        setShowPremiumPrompt(true);
      } else {
        toast.error(error.message || 'Failed to save feature selections');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    // Navigate back to role selection if we have a jobId, otherwise to home
    if (jobId) {
      navigate(`/role-select/${jobId}`);
    } else {
      navigate('/');
    }
  };

  const selectedCount = Object.values(selectedFeatures).filter(Boolean).length;
  const accessibleCount = getAccessibleCount(Object.keys(selectedFeatures));
  const premiumCount = getPremiumCount(Object.keys(selectedFeatures));
  const coreFeatures = ['atsOptimized', 'keywordOptimization', 'achievementsShowcase'];
  const coreCount = coreFeatures.filter(key => selectedFeatures[key]).length;
  const enhancementCount = selectedCount - coreCount;

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header 
        currentPage="feature-selection" 
        jobId={jobId} 
        title="Feature Selection" 
        subtitle="Choose features to enhance your CV"
        variant="dark" 
      />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Enhanced Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <div>
                <div className="text-green-400 font-semibold">CV Uploaded</div>
                <div className="text-xs text-gray-500">Complete</div>
              </div>
            </div>
            
            <div className="flex-1 h-1 bg-gray-700 mx-6 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 w-2/3 rounded-full"></div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <div>
                <div className="text-green-400 font-semibold">Role Detected</div>
                <div className="text-xs text-gray-500">Complete</div>
              </div>
            </div>
            
            <div className="flex-1 h-1 bg-gray-700 mx-6 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 w-full rounded-full"></div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold animate-pulse">
                4
              </div>
              <div>
                <div className="text-cyan-400 font-semibold">Select Features</div>
                <div className="text-xs text-gray-500">Current step</div>
              </div>
            </div>
            
            <div className="flex-1 h-1 bg-gray-700 mx-6 rounded-full"></div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-gray-400 font-bold">
                5
              </div>
              <div>
                <div className="text-gray-400 font-semibold">Generate CV</div>
                <div className="text-xs text-gray-500">Final step</div>
              </div>
            </div>
          </div>
        </div>

        {/* Role Context Display (if available) */}
        {roleContext?.selectedRole && (
          <Section variant="content" background="transparent" spacing="sm">
            <div className="mb-6 p-6 bg-gradient-to-r from-cyan-600/10 to-blue-600/10 rounded-xl border border-cyan-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
                    <Target className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-100 mb-1">
                      Role-Based Optimization Active
                    </h3>
                    <p className="text-gray-300 text-sm">
                      Features optimized for <span className="text-cyan-300 font-medium">{roleContext.selectedRole.name}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-cyan-400">
                    {roleContext.selectedRecommendations?.length || '12'}+
                  </div>
                  <div className="text-xs text-gray-400">Recommendations</div>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Feature Selection */}
        <Section variant="content" background="transparent" spacing="lg">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">
              Choose Your CV Features
            </h1>
            <p className="text-gray-400 mb-4">
              Select the features you want to include in your enhanced CV. You can always change these later.
            </p>
            
            {/* Role-Based Feature Recommendations */}
            {roleContext?.selectedRole && (
              <div className="mb-6 p-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-lg border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-green-300 mb-1">
                      🎯 Role-Based Recommendations Applied
                    </h3>
                    <p className="text-green-200 text-sm">
                      Features below are optimized for {roleContext.selectedRole.name} roles
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/40 rounded-full">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-300 text-sm font-medium">Active</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Selection Summary */}
            <div className="flex items-center gap-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span className="text-gray-300">
                  <span className="font-semibold text-cyan-400">{coreCount}</span> Core Features
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                <span className="text-gray-300">
                  <span className="font-semibold text-purple-400">{enhancementCount}</span> Enhancements
                </span>
              </div>
              {!isPremium && premiumCount > 0 && (
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-400" />
                  <span className="text-gray-300">
                    <span className="font-semibold text-yellow-400">{premiumCount}</span> Premium Available
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-gray-400">Total:</span>
                <span className="font-semibold text-white">{selectedCount} features</span>
                {!isPremium && restrictedFeatures.length > 0 && (
                  <span className="text-red-400 text-sm ml-2">
                    ({restrictedFeatures.length} restricted)
                  </span>
                )}
              </div>
            </div>

            {/* Premium Access Warning */}
            {!isPremium && restrictedFeatures.length > 0 && (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-red-300 font-medium mb-1">Premium Features Selected</h4>
                    <p className="text-red-200 text-sm mb-2">
                      {restrictedFeatures.length} selected features require premium access and will be removed during processing.
                    </p>
                    <button
                      onClick={() => navigate('/pricing')}
                      className="text-red-300 hover:text-red-200 underline text-sm"
                    >
                      Upgrade to unlock all features →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <PremiumFeatureSelectionPanel
            selectedFeatures={selectedFeatures}
            onFeatureToggle={handleFeatureToggle}
            onSelectAll={handleSelectAll}
            onSelectNone={handleSelectNone}
            enforceRestrictions={true}
          />
        </Section>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between mt-8">
          <button
            onClick={handleBack}
            className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Role Selection
          </button>
          
          <button
            onClick={handleContinue}
            disabled={isLoading || selectedCount === 0}
            className={`flex items-center justify-center gap-2 font-semibold py-3 px-6 rounded-lg transition-all ${
              isLoading || selectedCount === 0
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : restrictedFeatures.length > 0
                ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : restrictedFeatures.length > 0 ? (
              <>
                Continue with {selectedCount - restrictedFeatures.length} Features
                <ArrowRight className="w-5 h-5" />
              </>
            ) : (
              <>
                Continue to Generation
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Feature Preview Info */}
        {selectedCount > 0 && (
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <h3 className="font-medium text-blue-300 mb-2">What happens next?</h3>
            <p className="text-sm text-blue-200/80">
              Your CV will be processed with the selected features. Core features will be applied during generation, 
              while visual enhancements will be added progressively. The entire process typically takes 2-3 minutes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};