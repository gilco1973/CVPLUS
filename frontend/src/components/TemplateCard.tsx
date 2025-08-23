import React from 'react';
import { CheckCircle, Crown } from 'lucide-react';
import { usePremiumStatus } from '../hooks/usePremiumStatus';

interface Template {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  isPremium: boolean;
  previewImage?: string;
}

interface TemplateCardProps {
  template: Template;
  isSelected: boolean;
  onSelect: (templateId: string) => void;
  isRoleOptimized?: boolean;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isSelected,
  onSelect,
  isRoleOptimized = false
}) => {
  const { isPremium } = usePremiumStatus();
  const canAccess = !template.isPremium || isPremium;

  return (
    <button
      onClick={() => canAccess && onSelect(template.id)}
      disabled={!canAccess}
      className={`group relative p-4 lg:p-6 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-lg min-w-[280px] sm:min-w-[320px] aspect-[3/4] flex flex-col ${
        isSelected
          ? 'border-cyan-400 bg-cyan-900/20 shadow-lg shadow-cyan-500/10'
          : canAccess
          ? 'border-gray-600 hover:border-gray-500 bg-gray-700/30 hover:bg-gray-700/50'
          : 'border-gray-700 bg-gray-800/20 opacity-60 cursor-not-allowed'
      }`}
    >
      {/* Premium Badge */}
      {template.isPremium && (
        <div className="absolute top-4 right-4">
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
            canAccess
              ? 'bg-yellow-500/20 border border-yellow-400/30 text-yellow-300'
              : 'bg-gray-600/20 border border-gray-500/30 text-gray-500'
          }`}>
            <Crown className="w-3 h-3" />
            Premium
          </div>
        </div>
      )}
      
      {/* Role-Optimized Badge */}
      {isRoleOptimized && (
        <div className="absolute top-4 left-4">
          <div className="bg-green-500/20 border border-green-400/30 text-green-300 text-xs px-2 py-1 rounded-full font-medium">
            Recommended
          </div>
        </div>
      )}
      
      {/* Template Preview Placeholder */}
      <div className={`flex-1 rounded-lg mb-3 lg:mb-4 flex items-center justify-center text-3xl lg:text-4xl transition-all ${
        isSelected
          ? 'bg-cyan-500/10 border-2 border-cyan-400/30'
          : canAccess
          ? 'bg-gray-600/20 border border-gray-600 group-hover:border-gray-500'
          : 'bg-gray-700/20 border border-gray-700'
      }`}>
        {template.emoji}
      </div>
      
      {/* Template Content */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold text-base leading-tight ${
            isSelected
              ? 'text-cyan-100'
              : canAccess
              ? 'text-gray-200 group-hover:text-gray-100'
              : 'text-gray-500'
          }`}>
            {template.name}
          </h3>
        </div>
        
        {/* Category Tag */}
        <div className={`text-xs capitalize mb-2 px-2 py-1 rounded-md inline-block ${
          isSelected
            ? 'bg-cyan-600/30 text-cyan-200'
            : canAccess
            ? 'bg-gray-600/30 text-gray-400 group-hover:bg-gray-500/30'
            : 'bg-gray-700/30 text-gray-600'
        }`}>
          {template.category}
        </div>
        
        {/* Description */}
        <p className={`text-xs lg:text-sm leading-relaxed ${
          isSelected
            ? 'text-cyan-200'
            : canAccess
            ? 'text-gray-400 group-hover:text-gray-300'
            : 'text-gray-600'
        }`}>
          {template.description}
        </p>
        
        {/* Premium Lock Message */}
        {!canAccess && (
          <div className="text-xs text-gray-500 mt-2">
            Upgrade to unlock this template
          </div>
        )}
      </div>
      
      {/* Selection Indicator */}
      {isSelected && canAccess && (
        <div className="absolute bottom-4 right-4 w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
      )}
    </button>
  );
};