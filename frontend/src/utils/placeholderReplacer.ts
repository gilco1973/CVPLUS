/**
 * Utility for handling CV content placeholders from the backend
 * Replaces backend template placeholders with user-friendly preview text
 */

export interface PlaceholderReplacements {
  [key: string]: string;
}

/**
 * Default replacements for common placeholder patterns
 * These provide more meaningful preview text than raw placeholders
 */
const DEFAULT_REPLACEMENTS: PlaceholderReplacements = {
  '[INSERT NUMBER]': '5-10',
  '[INSERT TEAM SIZE]': '8-12 team members',
  '[ADD PERCENTAGE]': '25',
  '[INSERT BUDGET]': '$500K-1M',
  '[INSERT TIMEFRAME]': '3-6 months',
  '[INSERT VALUE]': '$2M+',
  '[ADD SPECIFIC OUTCOME]': 'improved efficiency',
  '[INSERT METRIC]': '30%',
  '[INSERT YOUR FIELD]': 'technology leadership',
  '[LIST KEY SKILLS]': 'team management, strategic planning, technical oversight',
  '[DESCRIBE KEY ACHIEVEMENT]': 'drive cross-functional collaboration and deliver complex projects',
  '[INSERT TARGET ROLE]': 'senior management position',
  '[NUMBER]': '6+',
};

/**
 * Enhanced replacements with contextual awareness
 */
const CONTEXTUAL_REPLACEMENTS: { [pattern: string]: (context?: string) => string } = {
  'team_size': (context) => {
    if (context?.toLowerCase().includes('developer') || context?.toLowerCase().includes('engineering')) {
      return '8-15 developers';
    }
    if (context?.toLowerCase().includes('sales')) {
      return '12-20 sales professionals';
    }
    if (context?.toLowerCase().includes('marketing')) {
      return '6-10 marketing specialists';
    }
    return '8-12 team members';
  },
  'percentage': (context) => {
    if (context?.toLowerCase().includes('efficiency') || context?.toLowerCase().includes('productivity')) {
      return '25-35%';
    }
    if (context?.toLowerCase().includes('cost') || context?.toLowerCase().includes('savings')) {
      return '15-20%';
    }
    if (context?.toLowerCase().includes('satisfaction') || context?.toLowerCase().includes('retention')) {
      return '40-50%';
    }
    if (context?.toLowerCase().includes('revenue') || context?.toLowerCase().includes('growth')) {
      return '20-30%';
    }
    return '25%';
  },
  'budget': (context) => {
    if (context?.toLowerCase().includes('enterprise') || context?.toLowerCase().includes('large')) {
      return '$2M+';
    }
    if (context?.toLowerCase().includes('startup') || context?.toLowerCase().includes('small')) {
      return '$100K-500K';
    }
    return '$500K-1M';
  }
};

/**
 * Replaces backend placeholders with user-friendly preview text
 */
export const replacePlaceholders = (
  content: string, 
  customReplacements: PlaceholderReplacements = {}
): string => {
  if (!content) return content;

  let processedContent = content;
  const allReplacements = { ...DEFAULT_REPLACEMENTS, ...customReplacements };

  // Apply direct replacements first
  Object.entries(allReplacements).forEach(([placeholder, replacement]) => {
    // Handle case-insensitive replacement
    const regex = new RegExp(escapeRegExp(placeholder), 'gi');
    processedContent = processedContent.replace(regex, replacement);
  });

  // Apply contextual replacements for remaining placeholders
  processedContent = processedContent.replace(/\[(INSERT\s+)?(\w+)(\s+\w+)*\]/gi, (match, insert, firstWord, rest) => {
    const fullMatch = firstWord + (rest || '');
    const context = content.toLowerCase();
    
    // Handle team size variations
    if (fullMatch.toLowerCase().includes('team') || fullMatch.toLowerCase().includes('size')) {
      return CONTEXTUAL_REPLACEMENTS.team_size(context);
    }
    
    // Handle percentage variations
    if (fullMatch.toLowerCase().includes('percentage') || fullMatch.toLowerCase().includes('percent')) {
      return CONTEXTUAL_REPLACEMENTS.percentage(context);
    }
    
    // Handle budget variations
    if (fullMatch.toLowerCase().includes('budget') || fullMatch.toLowerCase().includes('value')) {
      return CONTEXTUAL_REPLACEMENTS.budget(context);
    }
    
    // Handle number variations
    if (fullMatch.toLowerCase().includes('number') || firstWord.toLowerCase() === 'number') {
      return '5-8';
    }
    
    // Handle metric variations
    if (fullMatch.toLowerCase().includes('metric')) {
      return '30% improvement';
    }
    
    // Handle timeframe variations
    if (fullMatch.toLowerCase().includes('time') || fullMatch.toLowerCase().includes('duration')) {
      return '3-6 months';
    }
    
    // Default fallback - make it more user-friendly
    return `[${fullMatch.toLowerCase().replace(/_/g, ' ')}]`;
  });

  return processedContent;
};

/**
 * Checks if content contains backend placeholders
 */
export const hasPlaceholders = (content: string): boolean => {
  if (!content) return false;
  
  const placeholderPattern = /\[(INSERT|ADD|NUMBER)[^\]]*\]/gi;
  return placeholderPattern.test(content);
};

/**
 * Extracts all placeholders from content
 */
export const extractPlaceholders = (content: string): string[] => {
  if (!content) return [];
  
  const placeholderPattern = /\[(INSERT|ADD|NUMBER)[^\]]*\]/gi;
  const matches = content.match(placeholderPattern) || [];
  
  return Array.from(new Set(matches)); // Remove duplicates
};

/**
 * Creates a more user-friendly display version of content with placeholders
 * This is specifically for preview display - actual data should still be preserved
 */
export const createPreviewContent = (
  content: string,
  showPlaceholderHints: boolean = true
): string => {
  if (!content) return content;
  
  if (!hasPlaceholders(content)) {
    return content;
  }
  
  const replacedContent = replacePlaceholders(content);
  
  if (showPlaceholderHints && hasPlaceholders(content)) {
    // Add a subtle hint that this contains placeholder data
    return `${replacedContent}`;
  }
  
  return replacedContent;
};

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get meaningful example data for specific professional contexts
 */
export const getContextualExamples = (section: string, role?: string): PlaceholderReplacements => {
  const examples: PlaceholderReplacements = {};
  
  if (role?.toLowerCase().includes('engineer') || role?.toLowerCase().includes('developer')) {
    examples['[INSERT TEAM SIZE]'] = '12-15 developers';
    examples['[ADD PERCENTAGE]'] = '35%';
    examples['[INSERT BUDGET]'] = '$2M+';
  } else if (role?.toLowerCase().includes('manager') || role?.toLowerCase().includes('lead')) {
    examples['[INSERT TEAM SIZE]'] = '8-20 professionals';
    examples['[ADD PERCENTAGE]'] = '25%';
    examples['[INSERT BUDGET]'] = '$1M+';
  } else if (role?.toLowerCase().includes('sales')) {
    examples['[INSERT TEAM SIZE]'] = '15-25 sales professionals';
    examples['[ADD PERCENTAGE]'] = '40%';
    examples['[INSERT BUDGET]'] = '$5M+ revenue';
  }
  
  return examples;
};