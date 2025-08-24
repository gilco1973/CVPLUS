/**
 * Role Detection Hook
 * Custom hook for managing role detection functionality
 */

import { useState, useCallback } from 'react';
import { useUnifiedAnalysis } from '../context/UnifiedAnalysisContext';
import { unifiedAnalysisActions, createRoleDetectionError } from '../context/actions';
import type { 
  UseRoleDetectionReturn,
  RoleDetectionStatus 
} from '../context/types';
import type { Job } from '../../../services/cvService';
import type { 
  DetectedRole, 
  RoleProfileAnalysis 
} from '../../../types/role-profiles';

// Mock API calls - replace with actual API calls
const mockDetectRole = async (jobData: Job): Promise<{
  detectedRoles: DetectedRole[];
  analysis: RoleProfileAnalysis;
}> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock detected roles based on job data
  const mockRoles: DetectedRole[] = [
    {
      roleId: 'software-engineer',
      roleName: 'Software Engineer',
      confidence: 0.92,
      matchingFactors: ['Programming languages', 'Technical skills', 'Software development experience'],
      enhancementPotential: 0.85,
      recommendations: ['Highlight technical achievements', 'Add more specific technologies', 'Include project impacts']
    },
    {
      roleId: 'frontend-developer',
      roleName: 'Frontend Developer',
      confidence: 0.78,
      matchingFactors: ['JavaScript', 'React', 'UI/UX experience'],
      enhancementPotential: 0.72,
      recommendations: ['Showcase UI projects', 'Mention responsive design', 'Include user experience improvements']
    }
  ];
  
  const mockAnalysis: RoleProfileAnalysis = {
    primaryRole: mockRoles[0],
    alternativeRoles: mockRoles.slice(1),
    analysisMetadata: {
      processedAt: new Date().toISOString(),
      confidenceThreshold: 0.7,
      algorithmVersion: '1.0.0'
    },
    recommendationsCount: mockRoles[0].recommendations.length,
    overallConfidence: mockRoles[0].confidence,
    suggestedAction: 'apply_primary'
  };
  
  return {
    detectedRoles: mockRoles,
    analysis: mockAnalysis
  };
};

export const useRoleDetection = (): UseRoleDetectionReturn => {
  const { state, dispatch } = useUnifiedAnalysis();
  const [localError, setLocalError] = useState<string | null>(null);
  
  const { 
    detectedRoles, 
    selectedRole, 
    roleDetectionStatus,
    roleAnalysis 
  } = state;
  
  const startDetection = useCallback(async (jobData: Job) => {
    try {
      setLocalError(null);
      dispatch(unifiedAnalysisActions.setRoleDetectionStatus('analyzing'));
      
      // Simulate role detection process
      const { detectedRoles: roles, analysis } = await mockDetectRole(jobData);
      
      dispatch(unifiedAnalysisActions.setDetectedRoles(roles));
      dispatch(unifiedAnalysisActions.setRoleAnalysis(analysis));
      dispatch(unifiedAnalysisActions.setRoleDetectionStatus('completed'));
      
      // Auto-select primary role if confidence is high
      if (roles.length > 0 && roles[0].confidence > 0.8) {
        dispatch(unifiedAnalysisActions.selectRole(roles[0]));
      }
      
    } catch (error: any) {
      console.error('Role detection failed:', error);
      const errorMessage = error.message || 'Failed to detect role. Please try again.';
      
      setLocalError(errorMessage);
      dispatch(unifiedAnalysisActions.setRoleDetectionStatus('error'));
      dispatch(unifiedAnalysisActions.addError(
        createRoleDetectionError(errorMessage, error)
      ));
    }
  }, [dispatch]);
  
  const selectRole = useCallback((role: DetectedRole) => {
    dispatch(unifiedAnalysisActions.selectRole(role));
    setLocalError(null);
  }, [dispatch]);
  
  const retry = useCallback(() => {
    if (state.jobData) {
      startDetection(state.jobData);
    }
  }, [state.jobData, startDetection]);
  
  const isLoading = roleDetectionStatus === 'analyzing' || roleDetectionStatus === 'detecting';
  
  return {
    detectedRoles,
    selectedRole,
    status: roleDetectionStatus,
    analysis: roleAnalysis,
    startDetection,
    selectRole,
    retry,
    isLoading,
    error: localError
  };
};