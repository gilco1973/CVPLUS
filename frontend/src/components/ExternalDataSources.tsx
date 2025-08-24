import React, { useState } from 'react';
import { Search, Shield as _Shield, CheckCircle as _CheckCircle, Circle as _Circle, Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { designSystem } from '../config/designSystem';
import { useExternalData, type ExternalDataSource as _ExternalDataSource } from '../hooks/useExternalData';
import { ExternalDataPreview } from './ExternalDataPreview';
import { SourceSelector } from './external/SourceSelector';
import { PrivacyNotice } from './external/PrivacyNotice';
import { DataSummary } from './external/DataSummary';

interface ExternalDataSourcesProps {
  jobId: string;
  onDataEnriched?: (data: unknown[]) => void;
  onSkip?: () => void;
  className?: string;
}

export const ExternalDataSources: React.FC<ExternalDataSourcesProps> = ({
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
      <div className={`${designSystem.components.card.base} ${designSystem.components.card.variants.default} p-6`}>
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-400">
            {stats.enabledSources > 0 ? (
              `${stats.enabledSources} sources selected`
            ) : (
              'Select sources to enhance your CV'
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {onSkip && (
              <button
                onClick={onSkip}
                disabled={isLoading}
                className="px-4 py-2 text-neutral-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Skip This Step
              </button>
            )}
            
            {enrichedData.length > 0 ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    clearData();
                    setShowPreview(false);
                  }}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 border border-neutral-600 text-neutral-300 hover:border-neutral-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4" />
                  Fetch Again
                </button>
                
                <button
                  onClick={handleContinue}
                  className={`${designSystem.components.button.base} ${designSystem.components.button.variants.primary.default} ${designSystem.components.button.sizes.md} flex items-center gap-2`}
                >
                  Continue with Data
                  <span className="px-2 py-1 bg-white/20 rounded-full text-xs">
                    {stats.totalItems}
                  </span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleFetchData}
                disabled={isLoading || stats.enabledSources === 0 || !isPrivacyAccepted}
                className={`${designSystem.components.button.base} ${isLoading ? designSystem.components.button.variants.primary.loading : designSystem.components.button.variants.primary.default} ${designSystem.components.button.sizes.md} flex items-center gap-2`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Fetching Data...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Fetch External Data
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
