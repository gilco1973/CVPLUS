/**
 * EnhancedFeaturesGrid Component
 * 
 * Displays all enhanced CV features in a grid layout with interactive previews.
 * Shows completed features with full data and processing features with progress indicators.
 */

import React, { memo, useState } from 'react';
import { 
  Calendar, 
  Video, 
  Users, 
  Award, 
  Globe, 
  Mic, 
  BarChart3, 
  Star,
  Clock,
  Play,
  Download,
  Eye,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  Camera,
  Target,
  MessageSquare,
  Languages
} from 'lucide-react';

interface FeatureData {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  currentStep?: string;
  data?: any;
  error?: string;
  processedAt?: string;
  startedAt?: string;
  enabled?: boolean;
  url?: string;
  embedCode?: string;
  shareableUrl?: string;
}

interface EnhancedFeaturesGridProps {
  features: Record<string, FeatureData>;
  jobId: string;
  metadata?: {
    jobId: string;
    status: string;
    lastUpdated: string;
    userId: string;
  };
  className?: string;
}

// Feature configuration with icons, colors, and descriptions
const FEATURE_CONFIG: Record<string, {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  category: 'media' | 'interactive' | 'analytics' | 'professional';
}> = {
  timeline: {
    title: 'Interactive Timeline',
    description: 'Visual career progression with key milestones',
    icon: BarChart3,
    color: 'blue',
    category: 'interactive'
  },
  videoIntroduction: {
    title: 'Video Introduction',
    description: 'AI-generated professional video presentation',
    icon: Video,
    color: 'purple',
    category: 'media'
  },
  podcast: {
    title: 'Career Podcast',
    description: 'Audio discussion of your professional journey',
    icon: Mic,
    color: 'green',
    category: 'media'
  },
  skillsVisualization: {
    title: 'Skills Radar',
    description: 'Interactive skills proficiency visualization',
    icon: Target,
    color: 'orange',
    category: 'interactive'
  },
  portfolio: {
    title: 'Portfolio Gallery',
    description: 'Curated showcase of your best work',
    icon: Camera,
    color: 'pink',
    category: 'professional'
  },
  personalityInsights: {
    title: 'Personality Insights',
    description: 'AI-powered personality and work style analysis',
    icon: Users,
    color: 'indigo',
    category: 'analytics'
  },
  achievementHighlighting: {
    title: 'Achievement Highlights',
    description: 'Key accomplishments with impact metrics',
    icon: Award,
    color: 'yellow',
    category: 'professional'
  },
  certificationBadges: {
    title: 'Certification Badges',
    description: 'Visual display of professional certifications',
    icon: Award,
    color: 'emerald',
    category: 'professional'
  },
  languageProficiency: {
    title: 'Language Skills',
    description: 'Multi-language proficiency visualization',
    icon: Languages,
    color: 'cyan',
    category: 'interactive'
  },
  calendar: {
    title: 'Availability Calendar',
    description: 'Interactive booking and availability system',
    icon: Calendar,
    color: 'red',
    category: 'professional'
  },
  atsOptimization: {
    title: 'ATS Optimization',
    description: 'Application tracking system compatibility score',
    icon: Target,
    color: 'slate',
    category: 'analytics'
  },
  ragChat: {
    title: 'AI Chat Assistant',
    description: 'Interactive Q&A about your professional background',
    icon: MessageSquare,
    color: 'violet',
    category: 'interactive'
  }
};

export const EnhancedFeaturesGrid: React.FC<EnhancedFeaturesGridProps> = memo(({
  features = {},
  jobId,
  metadata,
  className = ''
}) => {
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  // Process features data
  const processedFeatures = Object.entries(features)
    .map(([featureKey, featureData]) => {
      const config = FEATURE_CONFIG[featureKey];
      return {
        key: featureKey,
        config: config || {
          title: featureKey.charAt(0).toUpperCase() + featureKey.slice(1),
          description: 'Enhanced CV feature',
          icon: Star,
          color: 'gray',
          category: 'professional' as const
        },
        data: featureData
      };
    })
    .filter(feature => feature.data && feature.data.enabled !== false);

  // Group features by category
  const groupedFeatures = processedFeatures.reduce((acc, feature) => {
    const category = feature.config.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, typeof processedFeatures>);

  // Category configurations
  const categoryConfig = {
    media: { title: 'Media & Content', description: 'Audio and video presentations' },
    interactive: { title: 'Interactive Features', description: 'Dynamic visualizations and tools' },
    analytics: { title: 'Analytics & Insights', description: 'Data-driven career analysis' },
    professional: { title: 'Professional Tools', description: 'Career enhancement utilities' }
  };

  // Get color classes for feature status
  const getStatusColors = (status: string, color: string) => {
    const baseColors = {
      blue: 'bg-blue-500',
      purple: 'bg-purple-500',
      green: 'bg-green-500',
      orange: 'bg-orange-500',
      pink: 'bg-pink-500',
      indigo: 'bg-indigo-500',
      yellow: 'bg-yellow-500',
      emerald: 'bg-emerald-500',
      cyan: 'bg-cyan-500',
      red: 'bg-red-500',
      slate: 'bg-slate-500',
      violet: 'bg-violet-500',
      gray: 'bg-gray-500'
    };

    const statusColors = {
      completed: baseColors[color as keyof typeof baseColors] || baseColors.gray,
      processing: 'bg-blue-500',
      pending: 'bg-gray-400',
      failed: 'bg-red-500'
    };

    return statusColors[status as keyof typeof statusColors] || statusColors.pending;
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  // Render feature actions
  const renderFeatureActions = (feature: any) => {
    const { data, key } = feature;
    
    if (data.status !== 'completed' || !data.data) return null;

    const actions = [];

    // View action for all completed features
    actions.push(
      <button
        key="view"
        onClick={() => setExpandedFeature(expandedFeature === key ? null : key)}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded border hover:bg-blue-200 transition-colors"
      >
        <Eye className="w-3 h-3" />
        {expandedFeature === key ? 'Hide' : 'View'}
      </button>
    );

    // Feature-specific actions
    if (data.url || data.shareableUrl) {
      actions.push(
        <a
          key="open"
          href={data.url || data.shareableUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded border hover:bg-green-200 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Open
        </a>
      );
    }

    if (key === 'podcast' && data.data?.audioUrl) {
      actions.push(
        <a
          key="play"
          href={data.data.audioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded border hover:bg-purple-200 transition-colors"
        >
          <Play className="w-3 h-3" />
          Play
        </a>
      );
    }

    return <div className="flex flex-wrap gap-1 mt-2">{actions}</div>;
  };

  if (processedFeatures.length === 0) {
    return (
      <section className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-blue-600" />
          Enhanced Features
        </h2>
        <div className="text-center py-8">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">No enhanced features are currently available</p>
          <p className="text-sm text-gray-400">Enhanced features will appear here as they are generated</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Star className="w-5 h-5 text-blue-600" />
          Enhanced Features
        </h2>
        <div className="text-sm text-gray-500">
          {processedFeatures.length} features available
        </div>
      </div>

      {/* Features by Category */}
      <div className="space-y-8">
        {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
          <div key={category}>
            {/* Category Header */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {categoryConfig[category as keyof typeof categoryConfig].title}
              </h3>
              <p className="text-sm text-gray-600">
                {categoryConfig[category as keyof typeof categoryConfig].description}
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryFeatures.map((feature) => {
                const IconComponent = feature.config.icon;
                const isExpanded = expandedFeature === feature.key;

                return (
                  <div
                    key={feature.key}
                    className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200"
                  >
                    {/* Feature Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${getStatusColors(feature.data.status, feature.config.color)} bg-opacity-10`}>
                          <IconComponent className={`w-5 h-5 text-${feature.config.color}-600`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm mb-1">
                            {feature.config.title}
                          </h4>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {feature.config.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0">
                        {getStatusIcon(feature.data.status)}
                      </div>
                    </div>

                    {/* Status Information */}
                    <div className="mb-3">
                      {feature.data.status === 'processing' && (
                        <div>
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>{feature.data.currentStep || 'Processing...'}</span>
                            <span>{feature.data.progress || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${feature.data.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {feature.data.status === 'failed' && feature.data.error && (
                        <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border">
                          {feature.data.error}
                        </div>
                      )}

                      {feature.data.status === 'completed' && (
                        <div className="text-xs text-green-600 font-medium">
                          ✓ Completed
                        </div>
                      )}
                    </div>

                    {/* Feature Actions */}
                    {renderFeatureActions(feature)}

                    {/* Expanded Content */}
                    {isExpanded && feature.data.status === 'completed' && feature.data.data && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-600">
                          <div className="max-h-32 overflow-y-auto">
                            <pre className="whitespace-pre-wrap text-xs">
                              {JSON.stringify(feature.data.data, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Feature Summary */}
      {processedFeatures.length > 1 && (
        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {processedFeatures.length}
              </div>
              <div className="text-sm text-gray-600">Total Features</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {processedFeatures.filter(f => f.data.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {processedFeatures.filter(f => f.data.status === 'processing').length}
              </div>
              <div className="text-sm text-gray-600">Processing</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {processedFeatures.filter(f => f.data.status === 'failed').length}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

EnhancedFeaturesGrid.displayName = 'EnhancedFeaturesGrid';

export default EnhancedFeaturesGrid;