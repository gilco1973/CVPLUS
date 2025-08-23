import { useState, useCallback, useRef, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import toast from 'react-hot-toast';
import { getErrorMessage, logError } from '../utils/errorHandling';

export interface ExternalDataSource {
  id: 'github' | 'linkedin' | 'website' | 'web';
  name: string;
  enabled: boolean;
  username?: string;
  url?: string;
  loading?: boolean;
  error?: string;
  data?: ExternalDataResult;
}

export interface ExternalDataResult {
  source: string;
  data: {
    portfolio?: PortfolioItem[];
    skills?: string[];
    certifications?: Certification[];
    hobbies?: string[];
    interests?: string[];
    projects?: ProjectItem[];
    publications?: Publication[];
    achievements?: Achievement[];
  };
  metadata?: {
    fetchedAt: string;
    confidence: number;
    cacheHit: boolean;
  };
}

export interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  url?: string;
  image?: string;
  type: 'project' | 'repository' | 'article' | 'design';
  tags?: string[];
  selected?: boolean;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date?: string;
  url?: string;
  verified?: boolean;
  selected?: boolean;
}

export interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  technologies?: string[];
  url?: string;
  stars?: number;
  language?: string;
  selected?: boolean;
}

export interface Publication {
  id: string;
  title: string;
  venue?: string;
  date?: string;
  url?: string;
  authors?: string[];
  selected?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description?: string;
  date?: string;
  type: 'award' | 'recognition' | 'milestone' | 'certification';
  selected?: boolean;
}

interface EnrichCVRequest {
  cvId: string;
  sources?: string[];
  options?: {
    forceRefresh?: boolean;
    timeout?: number;
    priority?: 'high' | 'normal' | 'low';
  };
  github?: string;
  linkedin?: string;
  website?: string;
  name?: string;
}

interface EnrichCVResponse {
  success: boolean;
  requestId: string;
  status: 'completed' | 'partial' | 'failed';
  enrichedData: ExternalDataResult[];
  metrics: {
    fetchDuration: number;
    sourcesQueried: number;
    sourcesSuccessful: number;
    cacheHits: number;
  };
  errors: string[];
}

export const useExternalData = (jobId: string) => {
  // State management
  const [sources, setSources] = useState<ExternalDataSource[]>([
    { id: 'github', name: 'GitHub', enabled: false },
    { id: 'linkedin', name: 'LinkedIn', enabled: false },
    { id: 'website', name: 'Personal Website', enabled: false },
    { id: 'web', name: 'Web Search', enabled: false },
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isPrivacyAccepted, setIsPrivacyAccepted] = useState(false);
  const [enrichedData, setEnrichedData] = useState<ExternalDataResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  
  // Refs for cleanup
  const isMountedRef = useRef(true);
  
  // Firebase function
  const enrichCVWithExternalData = httpsCallable<EnrichCVRequest, EnrichCVResponse>(
    functions,
    'enrichCVWithExternalData'
  );
  
  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Load cached data on mount
  useEffect(() => {
    const cachedData = sessionStorage.getItem(`external-data-${jobId}`);
    const cachedSources = sessionStorage.getItem(`external-sources-${jobId}`);
    
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setEnrichedData(parsed);
      } catch (err) {
        console.warn('Failed to parse cached external data:', err);
      }
    }
    
    if (cachedSources) {
      try {
        const parsed = JSON.parse(cachedSources);
        setSources(parsed);
      } catch (err) {
        console.warn('Failed to parse cached sources:', err);
      }
    }
  }, [jobId]);
  
  // Update source configuration
  const updateSource = useCallback((sourceId: string, updates: Partial<ExternalDataSource>) => {
    setSources(prev => {
      const updated = prev.map(source => 
        source.id === sourceId ? { ...source, ...updates } : source
      );
      
      // Cache updated sources
      sessionStorage.setItem(`external-sources-${jobId}`, JSON.stringify(updated));
      
      return updated;
    });
  }, [jobId]);
  
  // Toggle source enabled state
  const toggleSource = useCallback((sourceId: string, enabled?: boolean) => {
    setSources(prev => {
      const updated = prev.map(source => 
        source.id === sourceId 
          ? { ...source, enabled: enabled !== undefined ? enabled : !source.enabled }
          : source
      );
      
      // Cache updated sources
      sessionStorage.setItem(`external-sources-${jobId}`, JSON.stringify(updated));
      
      return updated;
    });
  }, [jobId]);
  
  // Fetch external data
  const fetchExternalData = useCallback(async () => {
    if (!isPrivacyAccepted) {
      toast.error('Please accept the privacy notice to continue');
      return;
    }
    
    const enabledSources = sources.filter(s => s.enabled);
    if (enabledSources.length === 0) {
      toast.error('Please select at least one data source');
      return;
    }
    
    // Check for required inputs
    const invalidSources = enabledSources.filter(source => {
      if (source.id === 'github' || source.id === 'linkedin') {
        return !source.username || source.username.trim() === '';
      }
      if (source.id === 'website') {
        return !source.url || source.url.trim() === '';
      }
      return false; // Web search doesn't require input
    });
    
    if (invalidSources.length > 0) {
      const sourceNames = invalidSources.map(s => s.name).join(', ');
      toast.error(`Please provide required information for: ${sourceNames}`);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Mark sources as loading
    enabledSources.forEach(source => {
      updateSource(source.id, { loading: true, error: undefined });
    });
    
    try {
      const request: EnrichCVRequest = {
        cvId: jobId,
        sources: enabledSources.map(s => s.id),
        options: {
          forceRefresh: false,
          timeout: 30000,
          priority: 'normal'
        }
      };
      
      // Add source-specific data
      enabledSources.forEach(source => {
        if (source.id === 'github' && source.username) {
          request.github = source.username;
        } else if (source.id === 'linkedin' && source.username) {
          request.linkedin = source.username;
        } else if (source.id === 'website' && source.url) {
          request.website = source.url;
        }
      });
      
      const result = await enrichCVWithExternalData(request);
      
      if (!isMountedRef.current) return;
      
      if (result.data.success) {
        setEnrichedData(result.data.enrichedData);
        setRequestId(result.data.requestId);
        
        // Cache the results
        sessionStorage.setItem(
          `external-data-${jobId}`,
          JSON.stringify(result.data.enrichedData)
        );
        
        // Update source states based on results
        enabledSources.forEach(source => {
          const sourceResult = result.data.enrichedData.find(r => r.source === source.id);
          const hasError = result.data.errors.some(e => e.includes(source.id));
          
          updateSource(source.id, {
            loading: false,
            error: hasError ? 'Failed to fetch data' : undefined,
            data: sourceResult
          });
        });
        
        toast.success(
          `Successfully enriched CV with data from ${result.data.metrics.sourcesSuccessful} sources`
        );
      } else {
        throw new Error(result.data.errors.join(', ') || 'Failed to enrich CV');
      }
      
    } catch (err) {
      logError('fetchExternalData', err);
      const errorMessage = getErrorMessage(err) || 'Failed to fetch external data';
      
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Mark all enabled sources as failed
      enabledSources.forEach(source => {
        updateSource(source.id, {
          loading: false,
          error: 'Failed to fetch data'
        });
      });
      
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [sources, isPrivacyAccepted, jobId, enrichCVWithExternalData, updateSource]);
  
  // Clear data and reset
  const clearData = useCallback(() => {
    setEnrichedData([]);
    setError(null);
    setRequestId(null);
    
    // Clear cache
    sessionStorage.removeItem(`external-data-${jobId}`);
    
    // Reset source states
    setSources(prev => prev.map(source => ({
      ...source,
      loading: false,
      error: undefined,
      data: undefined
    })));
  }, [jobId]);
  
  // Get statistics
  const stats = {
    totalSources: sources.length,
    enabledSources: sources.filter(s => s.enabled).length,
    successfulSources: sources.filter(s => s.data && !s.error).length,
    failedSources: sources.filter(s => s.error).length,
    totalItems: enrichedData.reduce((sum, result) => {
      const data = result.data;
      return sum + 
        (data.portfolio?.length || 0) +
        (data.certifications?.length || 0) +
        (data.projects?.length || 0) +
        (data.publications?.length || 0) +
        (data.achievements?.length || 0);
    }, 0)
  };
  
  return {
    // State
    sources,
    isLoading,
    isPrivacyAccepted,
    enrichedData,
    error,
    requestId,
    stats,
    
    // Actions
    updateSource,
    toggleSource,
    fetchExternalData,
    clearData,
    setIsPrivacyAccepted
  };
};
