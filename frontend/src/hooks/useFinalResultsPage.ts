import { useState, useEffect } from 'react';
import { getJob } from '../services/cvService';
import { useAuth } from '../contexts/AuthContext';
import type { Job } from '../types/cv';
import { FEATURE_CONFIGS } from '../config/featureConfigs';
import { kebabToCamelCase } from '../utils/featureUtils';
import toast from 'react-hot-toast';

export const useFinalResultsPage = (jobId: string) => {
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generationConfig, setGenerationConfig] = useState<any>(null);
  const [baseHTML, setBaseHTML] = useState<string>('');
  const [enhancedHTML, setEnhancedHTML] = useState<string>('');
  const [featureQueue, setFeatureQueue] = useState<any[]>([]);
  const [isProcessingFeatures, setIsProcessingFeatures] = useState(false);

  const loadBaseHTML = async (job: Job) => {
    try {
      if (job.generatedCV?.htmlUrl) {
        if (job.generatedCV.htmlUrl.includes('firebasestorage') || job.generatedCV.htmlUrl.includes('localhost:9199')) {
          const response = await fetch(job.generatedCV.htmlUrl);
          if (response.ok) {
            const htmlContent = await response.text();
            setBaseHTML(htmlContent);
            setEnhancedHTML(htmlContent);
            return;
          }
        }
      }
      if (job.generatedCV?.html) {
        setBaseHTML(job.generatedCV.html);
        setEnhancedHTML(job.generatedCV.html);
      }
    } catch (error) {
      console.error('Error loading base HTML:', error);
      if (job.generatedCV?.html) {
        setBaseHTML(job.generatedCV.html);
        setEnhancedHTML(job.generatedCV.html);
      }
    }
  };

  const setupFeatureQueue = (selectedFeatures: string[]) => {
    console.log('🔧 [DEBUG] setupFeatureQueue called with features:', selectedFeatures);
    
    const normalizedFeatures = selectedFeatures.map(feature => 
      feature === 'embed-q-r-code' ? 'embed-qr-code' : feature
    );
    console.log('🔧 [DEBUG] Normalized features:', normalizedFeatures);
    
    const camelCaseFeatures = normalizedFeatures.map(feature => 
      feature === 'embed-qr-code' ? 'embedQRCode' : kebabToCamelCase(feature)
    );
    console.log('🔧 [DEBUG] CamelCase features:', camelCaseFeatures);
    
    const queue = camelCaseFeatures
      .filter(featureId => {
        const hasConfig = !!FEATURE_CONFIGS[featureId];
        if (!hasConfig) {
          console.warn(`🔧 [DEBUG] No config found for feature: ${featureId}`);
        }
        return hasConfig;
      })
      .map(featureId => FEATURE_CONFIGS[featureId]);
    
    console.log('🔧 [DEBUG] Final feature queue:', queue);
    setFeatureQueue(queue);
    setIsProcessingFeatures(queue.length > 0);
  };

  const loadJobData = async () => {
    if (!jobId) return;
    try {
      const storedConfig = sessionStorage.getItem(`generation-config-${jobId}`);
      if (storedConfig) {
        const config = JSON.parse(storedConfig);
        setGenerationConfig(config);
      }

      const jobData = await getJob(jobId);
      if (!jobData) {
        setError('Job not found');
        return;
      }
      if (user && jobData.userId !== user.uid) {
        setError('Unauthorized access');
        return;
      }

      setJob(jobData);
      console.log('🔧 [DEBUG] Job data loaded:', {
        hasGeneratedCV: !!jobData.generatedCV,
        hasFeatures: !!jobData.generatedCV?.features,
        featuresLength: jobData.generatedCV?.features?.length || 0,
        features: jobData.generatedCV?.features,
        enhancedFeatures: jobData.enhancedFeatures || 'No enhancedFeatures field',
        enhancedFeaturesKeys: jobData.enhancedFeatures ? Object.keys(jobData.enhancedFeatures) : [],
        allJobKeys: Object.keys(jobData)
      });
      
      if (jobData.generatedCV?.html || jobData.generatedCV?.htmlUrl) {
        await loadBaseHTML(jobData);
      }
      
      // Try to setup feature queue from generatedCV.features first
      if (jobData.generatedCV?.features && jobData.generatedCV.features.length > 0) {
        console.log('🔧 [DEBUG] Setting up feature queue with features from generatedCV:', jobData.generatedCV.features);
        setupFeatureQueue(jobData.generatedCV.features);
      } 
      // If no features in generatedCV, check enhancedFeatures
      else if (jobData.enhancedFeatures && Object.keys(jobData.enhancedFeatures).length > 0) {
        console.log('🔧 [DEBUG] Setting up feature queue with features from enhancedFeatures:', Object.keys(jobData.enhancedFeatures));
        const enhancedFeatureIds = Object.keys(jobData.enhancedFeatures);
        setupFeatureQueue(enhancedFeatureIds);
      } else {
        console.log('🔧 [DEBUG] No features found in job data - feature queue will be empty');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load job data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobData();
  }, [jobId, user]);

  return {
    job, setJob, loading, error, setError, generationConfig, setGenerationConfig,
    baseHTML, enhancedHTML, featureQueue, isProcessingFeatures, setIsProcessingFeatures,
    loadBaseHTML, setupFeatureQueue, loadJobData
  };
};