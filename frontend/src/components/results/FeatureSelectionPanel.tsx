/**
 * Feature Selection Panel Component
 */

import { FeatureCheckbox } from './FeatureCheckbox';
import type { SelectedFeatures, FeatureAvailability } from '../../types/results';

interface FeatureSelectionPanelProps {
  selectedFeatures: SelectedFeatures;
  setSelectedFeatures: (features: SelectedFeatures) => void;
  featureAvailability: FeatureAvailability;
}

export const FeatureSelectionPanel = ({ 
  selectedFeatures, 
  setSelectedFeatures, 
  featureAvailability 
}: FeatureSelectionPanelProps) => {
  const updateFeature = (feature: keyof SelectedFeatures, value: boolean) => {
    console.log(`🔍 [FEATURE SELECTION] ${feature} toggled to:`, value);
    const newFeatures = { ...selectedFeatures, [feature]: value };
    console.log('🔍 [FEATURE SELECTION] New state will be:', newFeatures);
    setSelectedFeatures(newFeatures);
  };

  const selectedCount = Object.keys(selectedFeatures).filter(key => selectedFeatures[key as keyof SelectedFeatures]).length;
  const totalFeatures = Object.keys(selectedFeatures).length;

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-2xl">✨</span>
            Enhanced Features
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Select features to include in your CV. {selectedCount} of {totalFeatures} selected.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              const allSelected = Object.keys(selectedFeatures).reduce((acc, key) => ({ ...acc, [key]: true }), {} as SelectedFeatures);
              console.log('🔍 [FEATURE SELECTION] Selecting all features:', allSelected);
              setSelectedFeatures(allSelected);
            }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={() => {
              const noneSelected = Object.keys(selectedFeatures).reduce((acc, key) => ({ ...acc, [key]: false }), {} as SelectedFeatures);
              console.log('🔍 [FEATURE SELECTION] Deselecting all features:', noneSelected);
              setSelectedFeatures(noneSelected);
            }}
            className="px-4 py-2 text-sm bg-gray-600 text-gray-300 rounded-md hover:bg-gray-500 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        <FeatureCheckbox
          feature="atsOptimization"
          label="ATS Optimization"
          description="Optimize your CV for Applicant Tracking Systems"
          checked={selectedFeatures.atsOptimization}
          onChange={(checked) => updateFeature('atsOptimization', checked)}
          featureAvailability={featureAvailability}
        />
        
        <FeatureCheckbox
          feature="keywordEnhancement"
          label="Keyword Enhancement"
          description="Enhance with job-relevant keywords"
          checked={selectedFeatures.keywordEnhancement}
          onChange={(checked) => updateFeature('keywordEnhancement', checked)}
          featureAvailability={featureAvailability}
        />
        
        <FeatureCheckbox
          feature="achievementHighlighting"
          label="Achievement Highlighting"
          description="Highlight your key achievements and impact"
          checked={selectedFeatures.achievementHighlighting}
          onChange={(checked) => updateFeature('achievementHighlighting', checked)}
          featureAvailability={featureAvailability}
        />
        
        <FeatureCheckbox
          feature="skillsVisualization"
          label="Skills Visualization"
          description="Add visual skill ratings and proficiency bars"
          checked={selectedFeatures.skillsVisualization}
          onChange={(checked) => updateFeature('skillsVisualization', checked)}
          featureAvailability={featureAvailability}
        />
        
        <FeatureCheckbox
          feature="generatePodcast"
          label="Generate Podcast"
          description="Create an AI-generated podcast about your career"
          checked={selectedFeatures.generatePodcast}
          onChange={(checked) => updateFeature('generatePodcast', checked)}
          featureAvailability={featureAvailability}
        />
        
        <FeatureCheckbox
          feature="embedQRCode"
          label="Embed QR Code"
          description="Add QR code linking to your digital profile"
          checked={selectedFeatures.embedQRCode}
          onChange={(checked) => updateFeature('embedQRCode', checked)}
          featureAvailability={featureAvailability}
        />
        
        <FeatureCheckbox
          feature="interactiveTimeline"
          label="Interactive Timeline"
          description="Create an interactive career timeline"
          checked={selectedFeatures.interactiveTimeline}
          onChange={(checked) => updateFeature('interactiveTimeline', checked)}
          featureAvailability={featureAvailability}
        />
        
        <FeatureCheckbox
          feature="skillsChart"
          label="Skills Chart"
          description="Visual representation of your skills"
          checked={selectedFeatures.skillsChart}
          onChange={(checked) => updateFeature('skillsChart', checked)}
          featureAvailability={featureAvailability}
        />
        
        <FeatureCheckbox
          feature="videoIntroduction"
          label="Video Introduction"
          description="Add a personal video introduction"
          checked={selectedFeatures.videoIntroduction}
          onChange={(checked) => updateFeature('videoIntroduction', checked)}
          featureAvailability={featureAvailability}
        />
        
        <FeatureCheckbox
          feature="portfolioGallery"
          label="Portfolio Gallery"
          description="Showcase your projects and work samples"
          checked={selectedFeatures.portfolioGallery}
          onChange={(checked) => updateFeature('portfolioGallery', checked)}
          featureAvailability={featureAvailability}
        />
        
        <FeatureCheckbox
          feature="languageProficiency"
          label="Language Proficiency"
          description="Visual language skills display"
          checked={selectedFeatures.languageProficiency}
          onChange={(checked) => updateFeature('languageProficiency', checked)}
          featureAvailability={featureAvailability}
        />
        
        <FeatureCheckbox
          feature="certificationBadges"
          label="Certification Badges"
          description="Display your certifications as badges"
          checked={selectedFeatures.certificationBadges}
          onChange={(checked) => updateFeature('certificationBadges', checked)}
          featureAvailability={featureAvailability}
        />
      </div>
    </div>
  );
};