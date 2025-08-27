import React from 'react';
import { ChevronDown, ChevronUp, CheckCircle, Circle, Target } from 'lucide-react';
import { useCVAnalysisState } from '../hooks/useCVAnalysisState';

/**
 * Recommendations List component displaying CV improvement recommendations
 * Provides recommendation selection, categorization, and priority filtering
 * Part of Phase 4 modularization - extracted from main CVAnalysisResults
 */
export function RecommendationsList() {
  const {
    recommendationsByCategory,
    categories,
    selectedRecommendations,
    expandedCategories,
    toggleRecommendation,
    toggleCategory,
    selectAllHighPriority,
    clearSelections,
    isCategoryExpanded,
    isRecommendationSelected
  } = useCVAnalysisState();

  // Don't render if no recommendations
  if (categories.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700 text-center">
        <div className="text-gray-400">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Recommendations Available</h3>
          <p className="text-sm">
            Please check back later or contact support if this persists.
          </p>
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-900/20 border-red-600/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-600/30';
      case 'low': return 'text-green-400 bg-green-900/20 border-green-600/30';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-600/30';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-100">
              CV Improvement Recommendations
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Select improvements to enhance your CV and increase ATS compatibility
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={selectAllHighPriority}
              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Select High Priority
            </button>
            <button
              onClick={clearSelections}
              className="px-3 py-1 text-xs border border-gray-600 text-gray-300 rounded hover:bg-gray-700 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        {selectedRecommendations.length > 0 && (
          <div className="mt-3 text-sm text-green-400">
            ✓ {selectedRecommendations.length} recommendations selected
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="divide-y divide-gray-700">
        {categories.map(category => {
          const categoryRecommendations = recommendationsByCategory[category];
          const isExpanded = isCategoryExpanded(category);
          const selectedInCategory = categoryRecommendations.filter(rec => 
            isRecommendationSelected(rec.id)
          ).length;

          return (
            <div key={category}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    selectedInCategory > 0 ? 'bg-green-400' : 'bg-gray-600'
                  }`} />
                  <span className="font-medium text-gray-200">{category}</span>
                  <span className="text-xs text-gray-500">
                    ({categoryRecommendations.length} recommendations)
                  </span>
                  {selectedInCategory > 0 && (
                    <span className="text-xs bg-green-900/30 text-green-300 px-2 py-1 rounded-full">
                      {selectedInCategory} selected
                    </span>
                  )}
                </div>
                
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Category Recommendations */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {categoryRecommendations.map(recommendation => {
                    const isSelected = isRecommendationSelected(recommendation.id);
                    
                    return (
                      <div
                        key={recommendation.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-900/20 border-blue-600/50'
                            : 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/50'
                        }`}
                        onClick={() => toggleRecommendation(recommendation.id)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Selection Icon */}
                          {isSelected ? (
                            <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                          )}
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-gray-200 leading-tight">
                                {recommendation.title}
                              </h4>
                              
                              {/* Priority Badge */}
                              <span className={`px-2 py-1 text-xs rounded-full border ${
                                getPriorityColor(recommendation.priority)
                              }`}>
                                {recommendation.priority}
                              </span>
                              
                              {/* Improvement Points */}
                              {recommendation.estimatedImprovement > 0 && (
                                <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded-full">
                                  +{recommendation.estimatedImprovement} pts
                                </span>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-400 mb-2">
                              {recommendation.description}
                            </p>
                            
                            <div className="text-xs text-gray-500">
                              <span>Impact: {recommendation.impact}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecommendationsList;