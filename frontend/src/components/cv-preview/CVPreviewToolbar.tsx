import React from 'react';
import { Edit3, Save, X, Eye, EyeOff } from 'lucide-react';
import type { CVPreviewToolbarProps } from '../../types/cv-preview';

export const CVPreviewToolbar: React.FC<CVPreviewToolbarProps> = ({
  isEditing,
  showFeaturePreviews,
  autoSaveEnabled,
  hasUnsavedChanges,
  lastSaved,
  selectedTemplate,
  showPreviewBanner,
  appliedImprovements,
  onToggleEditing,
  onToggleFeaturePreviews,
  onToggleAutoSave,
  onExpandAllSections,
  onCollapseAllSections,
  onCloseBanner
}) => {
  return (
    <div className="cv-preview-toolbar-wrapper">
      {/* Improvements Applied Banner */}
      {appliedImprovements && showPreviewBanner && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-400 p-4 mb-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-lg">✨</span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-green-900">
                  AI Improvements Applied
                </h3>
                <p className="text-sm text-green-700">
                  Your CV content has been enhanced with AI-powered improvements. The preview below shows your optimized CV.
                </p>
              </div>
            </div>
            <button
              onClick={onCloseBanner}
              className="text-green-400 hover:text-green-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Preview Controls */}
      <div className="flex items-center justify-between mb-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            Live Preview
            {hasUnsavedChanges && (
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full animate-pulse">
                {autoSaveEnabled ? 'Auto-saving...' : 'Unsaved'}
              </span>
            )}
            {lastSaved && !hasUnsavedChanges && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </h3>
          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full border border-blue-200">
            {selectedTemplate.charAt(0).toUpperCase() + selectedTemplate.slice(1)} Template
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAutoSave}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
              autoSaveEnabled
                ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                : 'bg-gray-100 text-gray-600 border border-gray-300'
            }`}
            title={autoSaveEnabled ? 'Auto-save enabled' : 'Auto-save disabled'}
          >
            <div className={`w-2 h-2 rounded-full ${autoSaveEnabled ? 'bg-green-400' : 'bg-gray-500'}`} />
            Auto-save
          </button>
          
          <div className="flex items-center gap-1">
            <button
              onClick={onExpandAllSections}
              className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-l hover:bg-blue-600/30 transition-all"
              title="Expand all sections"
            >
              ▼ All
            </button>
            <button
              onClick={onCollapseAllSections}
              className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-r hover:bg-blue-600/30 transition-all"
              title="Collapse all sections"
            >
              ▶ All
            </button>
          </div>
          
          <button
            onClick={onToggleFeaturePreviews}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              showFeaturePreviews
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {showFeaturePreviews ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            Previews
          </button>
          
          <button
            onClick={onToggleEditing}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isEditing
                ? 'bg-green-600 text-white shadow-lg shadow-green-500/20'
                : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700'
            }`}
          >
            {isEditing ? (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                Edit CV
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};