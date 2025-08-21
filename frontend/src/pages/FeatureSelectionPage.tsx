import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Sparkles, Zap } from 'lucide-react';
import { FeatureSelectionPanel } from '../components/FeatureSelectionPanel';
import { Header } from '../components/Header';
import { Section } from '../components/layout/Section';
import { updateJobFeatures, getJob } from '../services/cvService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FEATURE_CONFIGS } from '../config/featureConfigs';

export const FeatureSelectionPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [jobData, setJobData] = useState<any>(null);

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
    const allSelected: Record<string, boolean> = {};
    Object.keys(selectedFeatures).forEach(key => {
      allSelected[key] = true;
    });
    setSelectedFeatures(allSelected);
  };

  const handleSelectNone = () => {
    const noneSelected: Record<string, boolean> = {};
    Object.keys(selectedFeatures).forEach(key => {
      // Keep core features always enabled
      noneSelected[key] = ['atsOptimized', 'keywordOptimization', 'achievementsShowcase'].includes(key);
    });
    setSelectedFeatures(noneSelected);
  };

  const handleContinue = async () => {
    if (!jobId || !user) {
      toast.error('Missing job ID or user authentication');
      return;
    }

    setIsLoading(true);
    try {
      // Convert UI selections to kebab-case feature IDs
      const selectedFeatureIds: string[] = [];
      
      Object.entries(selectedFeatures).forEach(([camelCaseKey, isSelected]) => {
        if (isSelected && FEATURE_CONFIGS[camelCaseKey]) {
          selectedFeatureIds.push(FEATURE_CONFIGS[camelCaseKey].id);
        }
      });

      console.log('Selected features for processing:', selectedFeatureIds);

      // Update job with selected features
      await updateJobFeatures(jobId, selectedFeatureIds);

      toast.success(`${selectedFeatureIds.length} features selected for your CV!`);
      
      // Navigate to processing page
      navigate(`/process/${jobId}`);
    } catch (error: any) {
      console.error('Error updating job features:', error);
      toast.error(error.message || 'Failed to save feature selections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const selectedCount = Object.values(selectedFeatures).filter(Boolean).length;
  const coreFeatures = ['atsOptimized', 'keywordOptimization', 'achievementsShowcase'];
  const coreCount = coreFeatures.filter(key => selectedFeatures[key]).length;
  const enhancementCount = selectedCount - coreCount;

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header 
        currentPage="feature-selection" 
        jobId={jobId} 
        title="Customize Your CV" 
        subtitle="Select the features you want in your enhanced CV"
        variant="dark" 
      />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                ✓
              </div>
              <span className="text-green-400 font-medium">CV Uploaded</span>
            </div>
            <div className="flex-1 h-px bg-gray-600 mx-4"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                2
              </div>
              <span className="text-cyan-400 font-medium">Select Features</span>
            </div>
            <div className="flex-1 h-px bg-gray-600 mx-4"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-gray-400 text-sm font-semibold">
                3
              </div>
              <span className="text-gray-400 font-medium">Generate CV</span>
            </div>
          </div>
        </div>

        {/* Feature Selection */}
        <Section variant="content" background="transparent" spacing="lg">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">
              Choose Your CV Features
            </h1>
            <p className="text-gray-400 mb-4">
              Select the features you want to include in your enhanced CV. You can always change these later.
            </p>
            
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
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-gray-400">Total:</span>
                <span className="font-semibold text-white">{selectedCount} features</span>
              </div>
            </div>
          </div>

          <FeatureSelectionPanel
            selectedFeatures={selectedFeatures}
            onFeatureToggle={handleFeatureToggle}
            onSelectAll={handleSelectAll}
            onSelectNone={handleSelectNone}
          />
        </Section>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between mt-8">
          <button
            onClick={handleBack}
            className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Upload
          </button>
          
          <button
            onClick={handleContinue}
            disabled={isLoading || selectedCount === 0}
            className={`flex items-center justify-center gap-2 font-semibold py-3 px-6 rounded-lg transition-all ${
              isLoading || selectedCount === 0
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                Processing...
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