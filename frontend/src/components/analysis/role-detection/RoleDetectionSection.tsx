/**
 * Role Detection Section Component
 * Main orchestrator for role detection functionality with progressive disclosure
 */

import React, { useState, useEffect } from 'react';
import { Target, Sparkles, RefreshCw, Settings } from 'lucide-react';
import { RoleDetectionProgress } from './RoleDetectionProgress';
import { DetectedRoleCard } from './DetectedRoleCard';
import { RoleSelectionModal } from './RoleSelectionModal';
import { useRoleDetection } from '../hooks/useRoleDetection';
import { useUnifiedAnalysis } from '../context/UnifiedAnalysisContext';
import type { RoleDetectionSectionProps } from '../context/types';

export const RoleDetectionSection: React.FC<RoleDetectionSectionProps> = ({
  jobData,
  onRoleSelected,
  onManualSelection,
  className = ''
}) => {
  const { state } = useUnifiedAnalysis();
  const { 
    detectedRoles,
    selectedRole,
    status,
    analysis,
    startDetection,
    selectRole,
    retry,
    isLoading,
    error
  } = useRoleDetection();
  
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<string | undefined>('~2 minutes');
  
  // Auto-trigger role detection when component mounts and analysis is complete
  useEffect(() => {
    if (state.canProceedToRoleDetection && status === 'idle' && !isLoading) {
      startDetection(jobData);
    }
  }, [state.canProceedToRoleDetection, status, isLoading, startDetection, jobData]);
  
  // Progress simulation for better UX
  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);
      
      return () => clearInterval(interval);
    } else if (status === 'completed') {
      setProgress(100);
      setEstimatedTime(undefined);
    }
  }, [isLoading, status]);
  
  const handleRoleSelect = (role: any) => {
    selectRole(role);
    onRoleSelected(role);
  };
  
  const handleManualSelection = () => {
    setShowSelectionModal(true);
    onManualSelection();
  };
  
  const handleModalRoleSelect = (role: any) => {
    selectRole(role);
    onRoleSelected(role);
    setShowSelectionModal(false);
  };
  
  const handleRetry = () => {
    retry();
  };
  
  const isDetectionComplete = status === 'completed' && detectedRoles.length > 0;
  const hasError = status === 'error' || error;
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Section Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-full border border-cyan-500/30 mb-4">
          <Target className="w-5 h-5 text-cyan-400" />
          <span className="text-cyan-300 font-medium">AI Role Detection</span>
        </div>
        
        <h2 className="text-2xl md:text-3xl font-bold text-gray-100 mb-3">
          Discovering Your Professional Profile
        </h2>
        
        <p className="text-lg text-gray-300 max-w-2xl mx-auto">
          Our AI analyzes your CV to identify your role and provide personalized recommendations
        </p>
      </div>
      
      {/* Progress Section - Always visible during detection */}
      {(isLoading || status === 'analyzing' || status === 'detecting') && (
        <RoleDetectionProgress
          status={status}
          progress={progress}
          estimatedTime={estimatedTime}
          stage={isLoading ? 'Analyzing your experience and skills' : undefined}
        />
      )}
      
      {/* Error State */}
      {hasError && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-center">
          <div className="text-red-400 text-lg font-semibold mb-2">
            Role Detection Failed
          </div>
          <p className="text-gray-300 mb-4">
            {error || 'Unable to detect your professional role. Please try again or select manually.'}
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Detection
            </button>
            <button
              onClick={handleManualSelection}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
            >
              <Settings className="w-4 h-4" />
              Manual Selection
            </button>
          </div>
        </div>
      )}
      
      {/* Detected Roles */}
      {isDetectionComplete && (
        <div className="space-y-6">
          {/* Success Message */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-full mb-4">
              <Sparkles className="w-5 h-5 text-green-400" />
              <span className="text-green-300 font-medium">Detection Complete!</span>
            </div>
            <p className="text-gray-300">
              Found {detectedRoles.length} role{detectedRoles.length !== 1 ? 's' : ''} that match your profile
            </p>
          </div>
          
          {/* Role Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {detectedRoles.map((role) => (
              <DetectedRoleCard
                key={role.roleId}
                role={role}
                isSelected={selectedRole?.roleId === role.roleId}
                onSelect={handleRoleSelect}
                onCustomize={handleManualSelection}
              />
            ))}
          </div>
          
          {/* Additional Options */}
          <div className="text-center pt-6 border-t border-gray-700">
            <p className="text-gray-400 text-sm mb-4">
              Don't see your exact role? Browse more options or create a custom profile.
            </p>
            <button
              onClick={handleManualSelection}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
            >
              <Settings className="w-5 h-5" />
              Browse All Roles
            </button>
          </div>
        </div>
      )}
      
      {/* Role Selection Modal */}
      <RoleSelectionModal
        isOpen={showSelectionModal}
        availableRoles={detectedRoles}
        selectedRole={selectedRole}
        onRoleSelect={handleModalRoleSelect}
        onClose={() => setShowSelectionModal(false)}
        onCreateCustom={() => {
          // Handle custom role creation
          console.log('Create custom role requested');
        }}
      />
    </div>
  );
};