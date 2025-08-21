import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Target, Users, Sparkles, TrendingUp, ChevronRight, RefreshCw } from 'lucide-react';
import { RoleProfileSelector } from './RoleProfileSelector';
import { RoleBasedRecommendations } from './RoleBasedRecommendations';
import type { Job } from '../../services/cvService';
import type { RoleProfile, DetectedRole, RoleProfileAnalysis, RoleBasedRecommendation } from '../../types/role-profiles';
import { designSystem } from '../../config/designSystem';

export interface RoleProfileIntegrationProps {
  job: Job;
  onContinue: (selectedRecommendations: string[], roleContext?: any) => void;
  onBack?: () => void;
  className?: string;
}

export const RoleProfileIntegration: React.FC<RoleProfileIntegrationProps> = ({
  job,
  onContinue,
  onBack,
  className = ''
}) => {
  const [selectedRole, setSelectedRole] = useState<RoleProfile | null>(null);
  const [detectedRole, setDetectedRole] = useState<DetectedRole | null>(null);
  const [analysis, setAnalysis] = useState<RoleProfileAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<RoleBasedRecommendation[]>([]);
  const [activeTab, setActiveTab] = useState<'detection' | 'recommendations'>('detection');
  const [isRoleDetected, setIsRoleDetected] = useState(false);

  // Handle role selection from the selector
  const handleRoleSelected = (roleProfile: RoleProfile | null, isDetected: boolean) => {
    setSelectedRole(roleProfile);
    setIsRoleDetected(isDetected);
    
    // Automatically switch to recommendations tab if role is selected
    if (roleProfile) {
      setActiveTab('recommendations');
    }
  };

  // Handle analysis updates from role detection
  const handleAnalysisUpdate = (analysisData: RoleProfileAnalysis | null) => {
    setAnalysis(analysisData);
    if (analysisData?.primaryRole) {
      setDetectedRole(analysisData.primaryRole);
    }
  };

  // Handle recommendations updates
  const handleRecommendationsUpdate = (recs: RoleBasedRecommendation[]) => {
    setRecommendations(recs);
  };

  // Handle continue to preview with role context
  const handleContinueToPreview = (selectedRecommendations: string[]) => {
    const roleContext = {
      selectedRole,
      detectedRole,
      analysis,
      recommendations,
      isRoleDetected
    };
    
    onContinue(selectedRecommendations, roleContext);
  };

  const hasRoleSelected = selectedRole !== null;
  const hasRecommendations = recommendations.length > 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Enhanced CV Analysis</h1>
              <p className="text-gray-400">
                AI-powered role detection and personalized recommendations for your CV
              </p>
            </div>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              hasRoleSelected ? 'bg-green-500' : 'bg-gray-500'
            }`}></div>
            <span className="text-sm text-gray-400">Role Selected</span>
            
            <ChevronRight className="w-4 h-4 text-gray-500" />
            
            <div className={`w-3 h-3 rounded-full ${
              hasRecommendations ? 'bg-green-500' : 'bg-gray-500'
            }`}></div>
            <span className="text-sm text-gray-400">Recommendations</span>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'detection' | 'recommendations')}>
        <TabsList className="grid w-full grid-cols-2 bg-gray-800 border border-gray-700">
          <TabsTrigger 
            value="detection" 
            className="flex items-center gap-2 data-[state=active]:bg-primary-600 data-[state=active]:text-white"
          >
            <Target className="w-4 h-4" />
            <span>Role Detection</span>
            {hasRoleSelected && (
              <Badge variant="success" className="ml-1 text-xs">
                Complete
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger 
            value="recommendations" 
            disabled={!hasRoleSelected}
            className="flex items-center gap-2 data-[state=active]:bg-primary-600 data-[state=active]:text-white disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>Recommendations</span>
            {hasRecommendations && (
              <Badge variant="success" className="ml-1 text-xs">
                {recommendations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Role Detection Tab */}
        <TabsContent value="detection" className="space-y-6">
          <RoleProfileSelector
            jobId={job.id}
            onRoleSelected={handleRoleSelected}
            onAnalysisUpdate={handleAnalysisUpdate}
            className="animate-fade-in-up"
          />
          
          {/* Quick Navigation */}
          {hasRoleSelected && (
            <Card className="border-green-500/30 bg-green-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <div>
                      <p className="text-green-300 font-medium">
                        Role selected: {selectedRole?.name}
                      </p>
                      <p className="text-sm text-green-400/80">
                        Ready to generate personalized recommendations
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => setActiveTab('recommendations')}
                    className="bg-green-600 hover:bg-green-500 text-white"
                  >
                    Continue to Recommendations
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          {hasRoleSelected ? (
            <RoleBasedRecommendations
              jobId={job.id}
              roleProfile={selectedRole}
              detectedRole={detectedRole}
              onRecommendationsUpdate={handleRecommendationsUpdate}
              onContinueToPreview={handleContinueToPreview}
              className="animate-fade-in-up"
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <CardTitle className="text-gray-300 mb-2">Select a Role First</CardTitle>
                <CardDescription className="text-gray-500 mb-4">
                  Please complete role detection or manual selection to generate personalized recommendations.
                </CardDescription>
                <Button
                  onClick={() => setActiveTab('detection')}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Go to Role Detection
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Role Context Summary */}
      {hasRoleSelected && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-gray-100 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Selected Role Context
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="text-lg font-bold text-blue-300">
                  {selectedRole?.name}
                </div>
                <div className="text-sm text-gray-400">Selected Role</div>
              </div>
              
              <div className="text-center p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                <div className="text-lg font-bold text-purple-300">
                  {detectedRole ? Math.round(detectedRole.confidence * 100) : '85'}%
                </div>
                <div className="text-sm text-gray-400">Match Confidence</div>
              </div>
              
              <div className="text-center p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                <div className="text-lg font-bold text-green-300">
                  {recommendations.length || '8-12'}
                </div>
                <div className="text-sm text-gray-400">Recommendations</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          {onBack && (
            <Button
              onClick={onBack}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Back to Analysis
            </Button>
          )}
        </div>
        
        <div className="text-sm text-gray-500">
          {hasRoleSelected ? (
            <span className="text-green-400">
              ✓ Role-enhanced analysis ready
            </span>
          ) : (
            <span>
              Complete role selection to continue
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Fallback UI components if shadcn/ui is not available
const Tabs: React.FC<any> = ({ value, onValueChange, children, ...props }) => (
  <div {...props}>{children}</div>
);

const TabsList: React.FC<any> = ({ children, className, ...props }) => (
  <div className={`flex ${className}`} {...props}>{children}</div>
);

const TabsTrigger: React.FC<any> = ({ value, children, className, disabled, onClick, ...props }) => (
  <button 
    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${className}`}
    disabled={disabled}
    onClick={() => onClick?.(value)}
    {...props}
  >
    {children}
  </button>
);

const TabsContent: React.FC<any> = ({ value, children, className, ...props }) => (
  <div className={`mt-6 ${className}`} {...props}>{children}</div>
);

const Button: React.FC<any> = ({ children, className, variant, onClick, disabled, ...props }) => (
  <button 
    className={`${designSystem.components.button.base} ${
      variant === 'outline' 
        ? designSystem.components.button.variants.secondary.default
        : designSystem.components.button.variants.primary.default
    } ${designSystem.components.button.sizes.md} ${className}`}
    onClick={onClick}
    disabled={disabled}
    {...props}
  >
    {children}
  </button>
);

const Card: React.FC<any> = ({ children, className, ...props }) => (
  <div className={`${designSystem.components.card.base} ${designSystem.components.card.variants.default} ${designSystem.components.card.padding.md} ${className}`} {...props}>
    {children}
  </div>
);

const CardHeader: React.FC<any> = ({ children, ...props }) => (
  <div className="mb-4" {...props}>{children}</div>
);

const CardTitle: React.FC<any> = ({ children, className, ...props }) => (
  <h3 className={`text-lg font-semibold text-gray-100 ${className}`} {...props}>{children}</h3>
);

const CardDescription: React.FC<any> = ({ children, className, ...props }) => (
  <p className={`text-sm text-gray-400 ${className}`} {...props}>{children}</p>
);

const CardContent: React.FC<any> = ({ children, className, ...props }) => (
  <div className={className} {...props}>{children}</div>
);

const Badge: React.FC<any> = ({ children, variant, className, ...props }) => {
  const variantClasses = {
    success: 'bg-green-500/20 text-green-300 border-green-500/30',
    default: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  };
  
  return (
    <span 
      className={`px-2 py-0.5 text-xs font-medium rounded-full border ${variantClasses[variant || 'default']} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default RoleProfileIntegration;