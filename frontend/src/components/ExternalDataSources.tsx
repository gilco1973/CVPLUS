import React, { useState } from 'react';
import { 
  Globe,
  Github,
  Linkedin,
  Search,
  CheckCircle,
  Circle,
  AlertTriangle,
  Shield,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { designSystem } from '../config/designSystem';
import { useExternalData, type ExternalDataSource } from '../hooks/useExternalData';
import { ExternalDataPreview } from './ExternalDataPreview';

interface ExternalDataSourcesProps {
  jobId: string;
  onDataEnriched?: (data: unknown[]) => void;
  onSkip?: () => void;
  className?: string;
}

const SOURCE_ICONS = {
  github: Github,
  linkedin: Linkedin,
  website: Globe,
  web: Search,
} as const;

const SOURCE_DESCRIPTIONS = {
  github: 'Fetch repositories, contributions, and technical projects',
  linkedin: 'Extract professional experience and certifications',
  website: 'Analyze personal website for portfolio and achievements',
  web: 'Search the web for your professional presence and publications',
} as const;

const SOURCE_PLACEHOLDERS = {
  github: 'your-username',
  linkedin: 'your-profile-name',
  website: 'https://your-website.com',
  web: '',
} as const;

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
  
  // Handle source toggle
  const handleSourceToggle = (sourceId: string) => {
    toggleSource(sourceId);
  };
  
  // Handle input changes
  const handleInputChange = (sourceId: string, field: 'username' | 'url', value: string) => {
    updateSource(sourceId, { [field]: value });
  };
  
  // Handle fetch data
  const handleFetchData = async () => {
    await fetchExternalData();
    
    // Show preview if data was successfully fetched
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
  
  // Render source input field
  const renderSourceInput = (source: ExternalDataSource) => {
    if (source.id === 'web') return null; // Web search doesn't need input
    
    const fieldName = source.id === 'website' ? 'url' : 'username';
    const value = source.id === 'website' ? source.url || '' : source.username || '';
    const placeholder = SOURCE_PLACEHOLDERS[source.id];
    
    return (
      <div className="mt-3">
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(source.id, fieldName, e.target.value)}
          placeholder={placeholder}
          disabled={!source.enabled || isLoading}
          className={`
            w-full px-3 py-2 text-sm rounded-lg transition-all duration-200
            ${source.enabled 
              ? 'bg-neutral-700 border border-neutral-600 text-neutral-100 placeholder-neutral-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500' 
              : 'bg-neutral-800 border border-neutral-700 text-neutral-500 cursor-not-allowed'
            }
          `}
        />
      </div>
    );
  };
  
  // Render source status
  const renderSourceStatus = (source: ExternalDataSource) => {
    if (source.loading) {
      return (
        <div className="flex items-center gap-2 text-blue-400 text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Fetching...</span>
        </div>
      );
    }
    
    if (source.error) {
      return (
        <div className="flex items-center gap-2 text-red-400 text-xs">
          <AlertTriangle className="w-3 h-3" />
          <span>{source.error}</span>
        </div>
      );
    }
    
    if (source.data) {
      const itemCount = Object.values(source.data.data || {}).reduce(
        (sum, items) => sum + (Array.isArray(items) ? items.length : 0), 
        0
      );
      return (
        <div className="flex items-center gap-2 text-green-400 text-xs">
          <CheckCircle className="w-3 h-3" />
          <span>{itemCount} items found</span>
        </div>
      );
    }
    
    return null;
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
      
      {/* Data Sources Selection */}
      <div className={`${designSystem.components.card.base} ${designSystem.components.card.variants.default} p-6`}>
        <h3 className="text-lg font-semibold text-neutral-100 mb-4">
          Select Data Sources
        </h3>
        
        <div className="space-y-4">
          {sources.map((source) => {
            const Icon = SOURCE_ICONS[source.id];
            
            return (
              <div
                key={source.id}
                className={`
                  p-4 rounded-lg border-2 transition-all duration-200
                  ${source.enabled 
                    ? 'border-primary-400 bg-primary-400/10' 
                    : 'border-neutral-600 bg-neutral-700/50 hover:border-neutral-500'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleSourceToggle(source.id)}
                    disabled={isLoading}
                    className="flex-shrink-0 mt-0.5 transition-colors disabled:cursor-not-allowed"
                  >
                    {source.enabled ? (
                      <CheckCircle className="w-5 h-5 text-primary-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-neutral-500" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className={`w-5 h-5 ${source.enabled ? 'text-primary-400' : 'text-neutral-400'}`} />
                      <h4 className="font-medium text-neutral-100">
                        {source.name}
                      </h4>
                    </div>
                    
                    <p className="text-sm text-neutral-400 mb-3">
                      {SOURCE_DESCRIPTIONS[source.id]}
                    </p>
                    
                    {renderSourceInput(source)}
                    
                    {renderSourceStatus(source)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Privacy Notice */}
      <div className={`${designSystem.components.card.base} ${designSystem.components.card.variants.default} p-6`}>
        <div className="flex items-start gap-4">
          <Shield className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-100 mb-2">
              Privacy & Consent
            </h3>
            <p className="text-sm text-neutral-400 mb-4 leading-relaxed">
              We'll only access publicly available information from the sources you specify.
              No private data will be accessed, and all fetched data is used solely to enhance your CV.
              You can review and select which items to include before they're added to your CV.
            </p>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                onClick={() => setIsPrivacyAccepted(!isPrivacyAccepted)}
                className="flex-shrink-0"
              >
                {isPrivacyAccepted ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <Circle className="w-5 h-5 text-neutral-500" />
                )}
              </button>
              <span className="text-sm text-neutral-300">
                I consent to fetching publicly available data from the selected sources
              </span>
            </label>
          </div>
        </div>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className={`${designSystem.components.status.error} rounded-lg p-4`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={clearData}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Clear and try again
          </button>
        </div>
      )}
      
      {/* Stats Display */}
      {stats.totalItems > 0 && (
        <div className={`${designSystem.components.card.base} ${designSystem.components.card.variants.default} p-4`}>
          <h4 className="font-medium text-neutral-100 mb-2">Data Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-xl font-bold text-primary-400">{stats.successfulSources}</div>
              <div className="text-neutral-400">Sources</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">{stats.totalItems}</div>
              <div className="text-neutral-400">Items Found</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400">
                {enrichedData.reduce((sum, r) => sum + (r.data.projects?.length || 0), 0)}
              </div>
              <div className="text-neutral-400">Projects</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-400">
                {enrichedData.reduce((sum, r) => sum + (r.data.certifications?.length || 0), 0)}
              </div>
              <div className="text-neutral-400">Certifications</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Preview Toggle */}
      {enrichedData.length > 0 && (
        <div className="flex items-center justify-center">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
              bg-neutral-700 hover:bg-neutral-600 text-neutral-200 hover:text-white
            `}
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
            console.log('Preview selection changed:', selectedItems);
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
                className={`
                  px-4 py-2 text-neutral-300 hover:text-white transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
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
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
                    border border-neutral-600 text-neutral-300 hover:border-neutral-500 hover:text-white
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <RefreshCw className="w-4 h-4" />
                  Fetch Again
                </button>
                
                <button
                  onClick={handleContinue}
                  className={`
                    ${designSystem.components.button.base}
                    ${designSystem.components.button.variants.primary.default}
                    ${designSystem.components.button.sizes.md}
                    flex items-center gap-2
                  `}
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
                className={`
                  ${designSystem.components.button.base}
                  ${isLoading 
                    ? designSystem.components.button.variants.primary.loading 
                    : designSystem.components.button.variants.primary.default
                  }
                  ${designSystem.components.button.sizes.md}
                  flex items-center gap-2
                `}
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
