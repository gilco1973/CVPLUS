import React, { useState } from 'react';
import { Search, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { designSystem } from '../config/designSystem';
import { useExternalData, type ExternalDataSource as _ExternalDataSource } from '../hooks/useExternalData';
import { ExternalDataPreview } from './ExternalDataPreview';
import { SourceSelector } from './external/SourceSelector';
import { PrivacyNotice } from './external/PrivacyNotice';
import { DataSummary } from './external/DataSummary';
import { ExternalDataActions } from './external/ExternalDataActions';
import { ExternalDataSourcesGate } from './premium/PremiumGate';

interface ExternalDataSourcesProps {
  jobId: string;
  onDataEnriched?: (data: unknown[]) => void;
  onSkip?: () => void;
  className?: string;
}

// Internal component without premium gate
const ExternalDataSourcesCore: React.FC<ExternalDataSourcesProps> = ({
  jobId,
  onDataEnriched,
  onSkip,
  className = ''
}) => {

  const {
    sources,
    isLoading,
    isPrivacyAccepted,
    enrichedData,
    error,
    stats,
    updateSource,
    toggleSource,
    fetchExternalData,
    clearData,
    setIsPrivacyAccepted
  } = useExternalData(jobId);
  
  const [showPreview, setShowPreview] = useState(false);
  
  // Handle fetch data
  const handleFetchData = async () => {
    await fetchExternalData();
    if (enrichedData.length > 0) {
      setShowPreview(true);
    }
  };
  
  // Handle continue with enriched data
  const handleContinue = () => {
    if (onDataEnriched && enrichedData.length > 0) {
      onDataEnriched(enrichedData);
    } else if (onSkip) {
      onSkip();
    }
  };
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-500/30">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
            <Search className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-neutral-100 mb-2">
              Enrich Your CV with External Data
            </h2>
            <p className="text-neutral-300 text-sm leading-relaxed">
              Enhance your CV by automatically importing data from your professional profiles.
              We'll find additional projects, certifications, and achievements to make your CV more comprehensive.
            </p>
          </div>
        </div>
      </div>
      
      {/* Source Selection */}
      <SourceSelector
        sources={sources}
        isLoading={isLoading}
        onToggleSource={toggleSource}
        onUpdateSource={updateSource}
      />
      
      {/* Privacy Notice */}
      <PrivacyNotice
        isAccepted={isPrivacyAccepted}
        onAcceptanceChange={setIsPrivacyAccepted}
      />
      
      {/* Error Display */}
      {error && (
        <div className={`${designSystem.components.status.error} rounded-lg p-4`}>
          <p>{error}</p>
          <button onClick={clearData} className="mt-2 text-sm underline hover:no-underline">
            Clear and try again
          </button>
        </div>
      )}
      
      {/* Data Summary */}
      {stats.totalItems > 0 && (
        <DataSummary stats={stats} enrichedData={enrichedData} />
      )}
      
      {/* Preview Toggle */}
      {enrichedData.length > 0 && (
        <div className="flex items-center justify-center">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 hover:text-white"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      )}
      
      {/* Data Preview */}
      {showPreview && enrichedData.length > 0 && (
        <ExternalDataPreview
          data={enrichedData}
          onSelectionChange={(selectedItems) => {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Preview selection changed:', selectedItems);
            }
          }}
          className="animate-fade-in-up"
        />
      )}
      
      {/* Action Buttons */}
      <ExternalDataActions
        isLoading={isLoading}
        enrichedData={enrichedData}
        stats={stats}
        isPrivacyAccepted={isPrivacyAccepted}
        onSkip={onSkip}
        onFetchData={handleFetchData}
        onContinue={handleContinue}
        onClearAndRefetch={() => {
          clearData();
          setShowPreview(false);
        }}
      />
    </div>
  );
};

// Main exported component with premium gate
export const ExternalDataSources: React.FC<ExternalDataSourcesProps> = (props) => {
  const handleAnalyticsEvent = (event: string, data?: Record<string, any>) => {
    // Track premium upgrade interactions
    if (process.env.NODE_ENV === 'development') {
      console.log('ExternalDataSources Analytics:', { event, data });
    }
    // TODO: Integrate with actual analytics service
  };

  return (
    <ExternalDataSourcesGate 
      showPreview={true}
      previewOpacity={0.3}
      className={props.className}
      onAnalyticsEvent={handleAnalyticsEvent}
      onAccessDenied={() => {
        toast.error('External data sources are available with Premium access');
      }}
    >
      <ExternalDataSourcesCore {...props} />
    </ExternalDataSourcesGate>
  );
};
