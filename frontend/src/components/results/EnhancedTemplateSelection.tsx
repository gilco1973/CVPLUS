/**
 * Enhanced Template Selection Component
 * Integrates the advanced template system from EnhancedTemplatesPage
 * while maintaining compatibility with existing FeatureSelection workflow
 */

import React, { useState, useEffect } from 'react';
import { Star, Award, Zap, Globe, Crown, CheckCircle } from 'lucide-react';
import { designSystem } from '../../config/designSystem';
import toast from 'react-hot-toast';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type TemplateCategory = 'executive' | 'technical' | 'creative' | 'healthcare' | 'financial' | 'academic' | 'sales' | 'international';

interface EnhancedTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: TemplateCategory;
  isPremium: boolean;
  rating: number;
  features: string[];
  atsScore: number;
  estimatedTime: string;
  isRecommended?: boolean;
}

interface EnhancedTemplateSelectionProps {
  selectedTemplate: string;
  setSelectedTemplate: (template: string) => void;
  className?: string;
}

// ============================================================================
// CATEGORY CONFIGURATION
// ============================================================================

const CATEGORY_CONFIG: Record<TemplateCategory, {
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}> = {
  executive: {
    name: 'Executive',
    icon: <Award className="w-4 h-4" />,
    description: 'C-suite & senior leadership',
    color: 'bg-blue-500'
  },
  technical: {
    name: 'Technical',
    icon: <Zap className="w-4 h-4" />,
    description: 'Engineering & IT professionals',
    color: 'bg-purple-500'
  },
  creative: {
    name: 'Creative',
    icon: <Star className="w-4 h-4" />,
    description: 'Design & creative roles',
    color: 'bg-pink-500'
  },
  healthcare: {
    name: 'Healthcare',
    icon: <Globe className="w-4 h-4" />,
    description: 'Medical professionals',
    color: 'bg-green-500'
  },
  financial: {
    name: 'Financial',
    icon: <Globe className="w-4 h-4" />,
    description: 'Finance sector',
    color: 'bg-emerald-500'
  },
  academic: {
    name: 'Academic',
    icon: <Globe className="w-4 h-4" />,
    description: 'Education & research',
    color: 'bg-indigo-500'
  },
  sales: {
    name: 'Sales',
    icon: <Globe className="w-4 h-4" />,
    description: 'Sales professionals',
    color: 'bg-orange-500'
  },
  international: {
    name: 'International',
    icon: <Globe className="w-4 h-4" />,
    description: 'Global roles',
    color: 'bg-teal-500'
  }
};

// ============================================================================
// ENHANCED TEMPLATE DATA
// ============================================================================

const ENHANCED_TEMPLATES: EnhancedTemplate[] = [
  {
    id: 'tech-innovation',
    name: 'Tech Innovation',
    emoji: '💻',
    description: 'Clean, systematic design perfect for software engineers and technical professionals',
    category: 'technical',
    isPremium: false,
    rating: 4.8,
    features: ['ATS Optimized', 'Clean Layout', 'Skills Visualization', 'Project Showcase'],
    atsScore: 95,
    estimatedTime: '25 seconds',
    isRecommended: true
  },
  {
    id: 'executive-authority',
    name: 'Executive Authority',
    emoji: '👔',
    description: 'Commanding presence for C-suite and senior leadership roles',
    category: 'executive',
    isPremium: true,
    rating: 4.9,
    features: ['Executive Summary', 'Leadership Focus', 'Strategic Achievements', 'Board Experience'],
    atsScore: 92,
    estimatedTime: '30 seconds'
  },
  {
    id: 'creative-showcase',
    name: 'Creative Showcase',
    emoji: '🎨',
    description: 'Bold, expressive design for creative professionals and designers',
    category: 'creative',
    isPremium: true,
    rating: 4.7,
    features: ['Portfolio Integration', 'Visual Appeal', 'Creative Projects', 'Brand Identity'],
    atsScore: 85,
    estimatedTime: '35 seconds'
  },
  {
    id: 'healthcare-professional',
    name: 'Healthcare Professional',
    emoji: '🏥',
    description: 'Clean, trustworthy design for medical professionals',
    category: 'healthcare',
    isPremium: false,
    rating: 4.6,
    features: ['Compliance Focus', 'Certifications', 'Patient Care', 'Medical Ethics'],
    atsScore: 90,
    estimatedTime: '25 seconds',
    isRecommended: true
  },
  {
    id: 'financial-expert',
    name: 'Financial Expert',
    emoji: '💼',
    description: 'Conservative, stable design for finance sector professionals',
    category: 'financial',
    isPremium: true,
    rating: 4.5,
    features: ['Quantitative Results', 'Risk Management', 'Compliance', 'Financial Analysis'],
    atsScore: 88,
    estimatedTime: '28 seconds'
  },
  {
    id: 'academic-scholar',
    name: 'Academic Scholar',
    emoji: '🎓',
    description: 'Scholarly design for educators and researchers',
    category: 'academic',
    isPremium: false,
    rating: 4.4,
    features: ['Publications', 'Research Focus', 'Teaching Experience', 'Academic Achievements'],
    atsScore: 87,
    estimatedTime: '30 seconds'
  },
  {
    id: 'sales-performance',
    name: 'Sales Performance',
    emoji: '📈',
    description: 'Dynamic, results-focused design for sales professionals',
    category: 'sales',
    isPremium: false,
    rating: 4.6,
    features: ['Metrics Driven', 'Client Relations', 'Revenue Growth', 'Territory Management'],
    atsScore: 89,
    estimatedTime: '25 seconds'
  },
  {
    id: 'international-professional',
    name: 'International Professional',
    emoji: '🌍',
    description: 'Universal design for global and multicultural roles',
    category: 'international',
    isPremium: false,
    rating: 4.3,
    features: ['Cultural Awareness', 'Language Skills', 'Global Experience', 'Cross-Cultural'],
    atsScore: 86,
    estimatedTime: '28 seconds'
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const EnhancedTemplateSelection: React.FC<EnhancedTemplateSelectionProps> = ({
  selectedTemplate,
  setSelectedTemplate,
  className = ''
}) => {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
  const [showRecommended, setShowRecommended] = useState(false);
  
  // Filter templates based on active category
  const filteredTemplates = ENHANCED_TEMPLATES.filter(template => {
    if (showRecommended && !template.isRecommended) return false;
    if (activeCategory === 'all') return true;
    return template.category === activeCategory;
  });

  // Handle template selection with enhanced feedback
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    
    const template = ENHANCED_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      toast.success(`🎨 ${template.name} template selected`, {
        duration: 2000,
        style: {
          background: '#1f2937',
          color: '#f3f4f6',
          border: '1px solid #374151'
        }
      });
    }
  };

  // Get template counts for category tabs
  const getCategoryCount = (category: TemplateCategory | 'all') => {
    if (category === 'all') return ENHANCED_TEMPLATES.length;
    return ENHANCED_TEMPLATES.filter(t => t.category === category).length;
  };

  // Render category tabs
  const renderCategoryTabs = () => {
    const categories: Array<TemplateCategory | 'all'> = ['all', ...Object.keys(CATEGORY_CONFIG) as TemplateCategory[]];
    
    return (
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.slice(0, 5).map((category) => {
          const isActive = activeCategory === category;
          const categoryInfo = category === 'all' 
            ? { name: 'All Templates', icon: <Globe className="w-3 h-3" />, color: 'bg-gray-500' }
            : CATEGORY_CONFIG[category];
          
          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
              }`}
            >
              {categoryInfo.icon}
              <span>{categoryInfo.name}</span>
              <span className="text-xs opacity-75">
                ({getCategoryCount(category)})
              </span>
            </button>
          );
        })}
        
        {/* Recommended Filter Toggle */}
        <button
          onClick={() => setShowRecommended(!showRecommended)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            showRecommended
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
          }`}
        >
          <Star className="w-3 h-3" />
          <span>Recommended</span>
        </button>
      </div>
    );
  };

  // Render enhanced template card
  const renderTemplateCard = (template: EnhancedTemplate) => {
    const isSelected = selectedTemplate === template.id;
    const categoryConfig = CATEGORY_CONFIG[template.category];
    
    return (
      <button
        key={template.id}
        onClick={() => handleTemplateSelect(template.id)}
        className={`${
          designSystem.components.card.base
        } ${
          designSystem.components.card.padding.md
        } cursor-pointer transition-all duration-300 relative text-left ${
          isSelected
            ? 'ring-2 ring-blue-500 bg-blue-900/30 border-blue-500 transform scale-105 shadow-xl'
            : 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600 hover:shadow-lg hover:transform hover:scale-102'
        }`}
      >
        {/* Badges */}
        <div className="absolute top-3 right-3 flex gap-1">
          {template.isPremium && (
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Premium
            </div>
          )}
          {template.isRecommended && (
            <div className="bg-gradient-to-r from-green-400 to-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
              ⭐ Recommended
            </div>
          )}
        </div>

        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-3 left-3 text-blue-400">
            <CheckCircle className="w-5 h-5 fill-current" />
          </div>
        )}
        
        {/* Template Preview */}
        <div className="text-4xl mb-4 text-center">{template.emoji}</div>
        
        {/* Template Info */}
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-100 mb-1">{template.name}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{template.description}</p>
          </div>
          
          {/* Category and Rating */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center space-x-1 ${categoryConfig.color} text-white px-2 py-1 rounded-full text-xs font-medium`}>
              {categoryConfig.icon}
              <span>{categoryConfig.name}</span>
            </div>
            
            <div className="flex items-center space-x-1 text-yellow-400 text-sm">
              <Star className="w-3 h-3 fill-current" />
              <span className="text-gray-300">{template.rating}</span>
            </div>
          </div>
          
          {/* Features */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-300">Key Features:</div>
            <div className="flex flex-wrap gap-1">
              {template.features.slice(0, 2).map((feature, index) => (
                <span key={index} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                  {feature}
                </span>
              ))}
              {template.features.length > 2 && (
                <span className="text-xs text-gray-500 px-2 py-1">
                  +{template.features.length - 2} more
                </span>
              )}
            </div>
          </div>
          
          {/* ATS Score and Generation Time */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <span className="text-gray-400">ATS Score:</span>
              <div className={`w-2 h-2 rounded-full ${
                template.atsScore >= 90 ? 'bg-green-500' : 
                template.atsScore >= 80 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="font-medium text-gray-300">{template.atsScore}%</span>
            </div>
            
            <div className="text-gray-400">
              <span>{template.estimatedTime}</span>
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className={`bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          Professional CV Templates
        </h3>
        <p className="text-sm text-gray-400">
          Choose from {ENHANCED_TEMPLATES.length} industry-optimized, ATS-compatible templates designed by professionals
        </p>
        
        {/* Analytics Summary */}
        <div className="mt-4 flex justify-center space-x-6 text-xs text-gray-500">
          <div>
            <span className="font-medium text-gray-300">{ENHANCED_TEMPLATES.length}</span> Professional Templates
          </div>
          <div>
            <span className="font-medium text-gray-300">89%</span> Avg ATS Score
          </div>
          <div>
            <span className="font-medium text-gray-300">4.6</span> Avg Rating
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      {renderCategoryTabs()}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTemplates.map(renderTemplateCard)}
      </div>

      {/* Selected Template Summary */}
      {selectedTemplate && (
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-blue-300">Selected Template:</div>
              <div className="text-lg font-bold text-blue-200">
                {ENHANCED_TEMPLATES.find(t => t.id === selectedTemplate)?.name}
              </div>
            </div>
            <div className="text-blue-400 text-3xl">
              {ENHANCED_TEMPLATES.find(t => t.id === selectedTemplate)?.emoji}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTemplateSelection;