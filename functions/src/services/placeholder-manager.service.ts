export interface PlaceholderInfo {
  key: string;           // "[INSERT TEAM SIZE]"
  placeholder: string;   // "INSERT TEAM SIZE"
  type: 'number' | 'text' | 'percentage' | 'currency' | 'timeframe';
  label: string;         // "Team Size"
  helpText: string;      // "How many people did you manage?"
  example: string;       // "8 developers"
  required: boolean;
  validation?: RegExp;
}

export interface PlaceholderReplacementMap {
  [placeholder: string]: string;
}

export class PlaceholderManager {
  // Common placeholder patterns and their metadata
  private static readonly PLACEHOLDER_DEFINITIONS: Record<string, Omit<PlaceholderInfo, 'key'>> = {
    'INSERT TEAM SIZE': {
      placeholder: 'INSERT TEAM SIZE',
      type: 'number',
      label: 'Team Size',
      helpText: 'How many people did you manage or work with?',
      example: '8 developers',
      required: true,
      validation: /^\d+/
    },
    'INSERT NUMBER': {
      placeholder: 'INSERT NUMBER',
      type: 'number',
      label: 'Number',
      helpText: 'Enter a specific number',
      example: '15',
      required: true,
      validation: /^\d+/
    },
    'ADD PERCENTAGE': {
      placeholder: 'ADD PERCENTAGE',
      type: 'percentage',
      label: 'Percentage',
      helpText: 'Enter a percentage improvement (without % symbol)',
      example: '25',
      required: true,
      validation: /^\d+$/
    },
    'INSERT PERCENTAGE': {
      placeholder: 'INSERT PERCENTAGE',
      type: 'percentage',
      label: 'Percentage',
      helpText: 'Enter a percentage (without % symbol)',
      example: '30',
      required: true,
      validation: /^\d+$/
    },
    'INSERT CUSTOMER COUNT': {
      placeholder: 'INSERT CUSTOMER COUNT',
      type: 'number',
      label: 'Customer Count',
      helpText: 'How many customers or users were affected?',
      example: '10,000',
      required: true
    },
    'INSERT DOLLAR AMOUNT': {
      placeholder: 'INSERT DOLLAR AMOUNT',
      type: 'currency',
      label: 'Dollar Amount',
      helpText: 'Enter amount without currency symbol',
      example: '2.5M',
      required: true
    },
    'INSERT USER COUNT': {
      placeholder: 'INSERT USER COUNT',
      type: 'number',
      label: 'User Count',
      helpText: 'How many users were served or impacted?',
      example: '100,000',
      required: true
    },
    'INSERT TIMEFRAME': {
      placeholder: 'INSERT TIMEFRAME',
      type: 'timeframe',
      label: 'Timeframe',
      helpText: 'Enter time period or duration',
      example: '6 months',
      required: true
    },
    'INSERT USER BASE SIZE': {
      placeholder: 'INSERT USER BASE SIZE',
      type: 'number',
      label: 'User Base Size',
      helpText: 'Total number of users in the system',
      example: '1M+',
      required: true
    },
    'INSERT STARTING SIZE': {
      placeholder: 'INSERT STARTING SIZE',
      type: 'number',
      label: 'Starting Team Size',
      helpText: 'Initial team size before growth',
      example: '3',
      required: true
    },
    'INSERT FINAL SIZE': {
      placeholder: 'INSERT FINAL SIZE',
      type: 'number',
      label: 'Final Team Size',
      helpText: 'Team size after growth',
      example: '12',
      required: true
    },
    'INSERT VALUE': {
      placeholder: 'INSERT VALUE',
      type: 'currency',
      label: 'Project Value',
      helpText: 'Financial value of the project or impact',
      example: '$1.2M',
      required: true
    },
    'INSERT METRIC': {
      placeholder: 'INSERT METRIC',
      type: 'text',
      label: 'Performance Metric',
      helpText: 'Specific metric or measurement',
      example: '40% faster response time',
      required: true
    },
    'ADD SPECIFIC OUTCOME': {
      placeholder: 'ADD SPECIFIC OUTCOME',
      type: 'text',
      label: 'Specific Outcome',
      helpText: 'What specific result was achieved?',
      example: '95% customer satisfaction score',
      required: true
    }
  };

  /**
   * Detects all placeholders in a given text
   */
  public static detectPlaceholders(text: string): PlaceholderInfo[] {
    if (!text) return [];
    
    // Regex to find all [INSERT/ADD X] patterns
    const placeholderRegex = /\[(INSERT|ADD)\s+([^\]]+)\]/g;
    const found: PlaceholderInfo[] = [];
    const seen = new Set<string>();
    
    let match;
    while ((match = placeholderRegex.exec(text)) !== null) {
      const fullMatch = match[0]; // e.g., "[INSERT TEAM SIZE]"
      const placeholderKey = match[2]; // e.g., "TEAM SIZE"
      const fullKey = `${match[1]} ${placeholderKey}`; // e.g., "INSERT TEAM SIZE"
      
      // Avoid duplicates
      if (seen.has(fullKey)) continue;
      seen.add(fullKey);
      
      // Get definition or create default
      const definition = this.PLACEHOLDER_DEFINITIONS[fullKey] || {
        placeholder: fullKey,
        type: 'text' as const,
        label: this.formatLabel(placeholderKey),
        helpText: `Enter ${this.formatLabel(placeholderKey).toLowerCase()}`,
        example: 'Enter value',
        required: true
      };
      
      found.push({
        key: fullMatch,
        ...definition
      });
    }
    
    return found;
  }

  /**
   * Replaces all placeholders in text with provided values
   */
  public static replacePlaceholders(
    text: string, 
    replacements: PlaceholderReplacementMap
  ): string {
    if (!text) return text;
    
    let result = text;
    
    // Replace each placeholder with its corresponding value
    Object.entries(replacements).forEach(([placeholder, value]) => {
      if (value && value.trim()) {
        // Handle both [PLACEHOLDER] and just PLACEHOLDER keys
        const bracketedPlaceholder = placeholder.startsWith('[') ? placeholder : `[${placeholder}]`;
        const unbracketedPlaceholder = placeholder.startsWith('[') ? placeholder.slice(1, -1) : placeholder;
        
        result = result.replace(new RegExp(`\\[${this.escapeRegex(unbracketedPlaceholder)}\\]`, 'g'), value);
      }
    });
    
    return result;
  }

  /**
   * Validates that all placeholders have been replaced
   */
  public static validateReplacements(text: string): {
    isValid: boolean;
    remainingPlaceholders: string[];
  } {
    const remaining = this.detectPlaceholders(text);
    
    return {
      isValid: remaining.length === 0,
      remainingPlaceholders: remaining.map(p => p.key)
    };
  }

  /**
   * Validates individual placeholder values
   */
  public static validatePlaceholderValue(
    placeholder: PlaceholderInfo, 
    value: string
  ): {
    isValid: boolean;
    error?: string;
  } {
    if (placeholder.required && (!value || !value.trim())) {
      return {
        isValid: false,
        error: `${placeholder.label} is required`
      };
    }
    
    if (value && placeholder.validation && !placeholder.validation.test(value)) {
      return {
        isValid: false,
        error: `${placeholder.label} format is invalid. Example: ${placeholder.example}`
      };
    }
    
    return { isValid: true };
  }

  /**
   * Generates form field configurations for placeholders
   */
  public static generateFormFields(placeholders: PlaceholderInfo[]): Array<{
    id: string;
    label: string;
    type: string;
    placeholder: string;
    helpText: string;
    required: boolean;
    validation?: RegExp;
  }> {
    return placeholders.map(p => ({
      id: p.placeholder,
      label: p.label,
      type: this.mapTypeToInputType(p.type),
      placeholder: p.example,
      helpText: p.helpText,
      required: p.required,
      validation: p.validation
    }));
  }

  // Helper methods
  private static formatLabel(key: string): string {
    return key
      .split(/[_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private static mapTypeToInputType(type: PlaceholderInfo['type']): string {
    switch (type) {
      case 'number':
      case 'percentage':
        return 'number';
      case 'currency':
        return 'text'; // Better for formatted currency input
      case 'timeframe':
      case 'text':
      default:
        return 'text';
    }
  }
}