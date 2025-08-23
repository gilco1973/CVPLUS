import React, { useState } from 'react';
import { Eye, Settings, Sparkles, Play, ZoomIn, ZoomOut, Monitor, Tablet, Smartphone } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  isPremium: boolean;
}

interface LivePreviewProps {
  selectedTemplate: Template | null;
  selectedFeatures: Record<string, boolean>;
  previewMode: 'template' | 'features' | 'final';
  onPreviewModeChange: (mode: 'template' | 'features' | 'final') => void;
}

export const LivePreview: React.FC<LivePreviewProps> = ({
  selectedTemplate,
  selectedFeatures,
  previewMode,
  onPreviewModeChange
}) => {
  const [zoomLevel, setZoomLevel] = useState(75);
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const selectedCount = Object.values(selectedFeatures).filter(Boolean).length;

  const getPreviewContent = () => {
    switch (previewMode) {
      case 'template':
        return {
          title: selectedTemplate?.name || 'Select Template',
          subtitle: 'Template Preview',
          emoji: selectedTemplate?.emoji || '📄',
          description: selectedTemplate?.description || 'Choose a template to preview'
        };
      case 'features':
        return {
          title: `${selectedCount} Features`,
          subtitle: 'Features Preview',
          emoji: '✨',
          description: `${selectedCount} features will be applied to your CV`
        };
      case 'final':
        return {
          title: 'Complete Preview',
          subtitle: 'Final Result',
          emoji: '🎯',
          description: 'Template + Features combined preview'
        };
      default:
        return {
          title: 'Preview',
          subtitle: 'Select mode',
          emoji: '👁️',
          description: 'Choose a preview mode'
        };
    }
  };

  const content = getPreviewContent();

  const getViewModeClasses = () => {
    switch (viewMode) {
      case 'desktop':
        return 'aspect-[3/4] max-w-full';
      case 'tablet':
        return 'aspect-[3/4] max-w-sm mx-auto';
      case 'mobile':
        return 'aspect-[4/3] max-w-xs mx-auto';
      default:
        return 'aspect-[3/4] max-w-full';
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 sticky top-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
            <Eye className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-100">Live Preview</h2>
            <p className="text-sm text-gray-400">See your CV come together</p>
          </div>
        </div>
      </div>
      
      {/* Preview Mode Selector */}
      <div className="flex mb-6 bg-gray-700/50 rounded-lg p-1">
        {[
          { id: 'template', label: 'Template', icon: Settings },
          { id: 'features', label: 'Features', icon: Sparkles },
          { id: 'final', label: 'Final', icon: Play }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onPreviewModeChange(id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              previewMode === id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
      
      {/* View Mode Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {[
            { id: 'desktop', icon: Monitor, label: 'Desktop' },
            { id: 'tablet', icon: Tablet, label: 'Tablet' },
            { id: 'mobile', icon: Smartphone, label: 'Mobile' }
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setViewMode(id as any)}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === id
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
              title={label}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
            disabled={zoomLevel <= 50}
            className="p-2 text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400 min-w-12 text-center">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel(Math.min(125, zoomLevel + 25))}
            disabled={zoomLevel >= 125}
            className="p-2 text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Preview Canvas */}
      <div className={`bg-gray-900/50 rounded-lg border border-gray-600 flex items-center justify-center mb-4 transition-all ${getViewModeClasses()}`}
           style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}>
        <div className="text-center text-gray-400 p-8">
          <div className="text-4xl mb-4 animate-pulse">
            {content.emoji}
          </div>
          <div className="text-base font-medium text-gray-200 mb-2">
            {content.title}
          </div>
          <div className="text-xs text-gray-500 mb-3">
            {content.subtitle}
          </div>
          <div className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
            {content.description}
          </div>
          
          {/* Feature Indicators */}
          {previewMode === 'features' && selectedCount > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-1">
              {Object.entries(selectedFeatures)
                .filter(([_, enabled]) => enabled)
                .slice(0, 6)
                .map(([featureId, _], index) => (
                  <div
                    key={featureId}
                    className="w-2 h-2 bg-cyan-400/60 rounded-full animate-pulse"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  />
                ))
              }
              {selectedCount > 6 && (
                <div className="text-xs text-cyan-400 ml-2">+{selectedCount - 6} more</div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Preview Status */}
      <div className="flex justify-between items-center text-sm">
        <div className="text-gray-400">
          {selectedCount} of {Object.keys(selectedFeatures).length} features
        </div>
        <div className="flex gap-2">
          <div className={`px-2 py-1 rounded-md text-xs ${
            previewMode === 'template'
              ? 'bg-blue-500/20 text-blue-300'
              : previewMode === 'features'
              ? 'bg-purple-500/20 text-purple-300'
              : 'bg-green-500/20 text-green-300'
          }`}>
            {content.subtitle}
          </div>
        </div>
      </div>
    </div>
  );
};