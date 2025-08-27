/**
 * Placeholder Customization Service
 * 
 * Handles the customization of recommendation placeholders with user-provided values.
 * Implements validation, transformation, and error handling for placeholder values.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import type { 
  CustomizePlaceholdersParams, 
  CustomizePlaceholdersResponse,
  Placeholder,
  PlaceholderValidationResult,
  Recommendation
} from '../../types';
import { PlaceholderType } from '../../types';

export class PlaceholderCustomizationService {
  
  /**
   * Customize placeholders in a recommendation with user-provided values
   */
  async customizePlaceholders(params: CustomizePlaceholdersParams): Promise<CustomizePlaceholdersResponse['data']> {
    const { recommendationId, placeholderValues } = params;
    
    try {
      // In a real implementation, this would fetch the recommendation from the database
      // For now, we'll create a mock recommendation structure
      const recommendation = await this.getRecommendation(recommendationId);
      
      if (!recommendation) {
        throw new Error(`Recommendation ${recommendationId} not found`);
      }

      // Validate placeholder values against recommendation placeholders
      const validationResults = this.validatePlaceholderValues(
        recommendation.placeholders || [],
        placeholderValues
      );

      // Check if any validation failed
      const hasErrors = validationResults.some(result => !result.isValid);
      if (hasErrors) {
        const errorMessages = validationResults
          .filter(result => !result.isValid)
          .map(result => `${result.placeholderId}: ${result.error}`)
          .join(', ');
        
        throw new Error(`Placeholder validation failed: ${errorMessages}`);
      }

      // Transform values and apply to content
      const transformedValues = this.transformPlaceholderValues(
        recommendation.placeholders || [],
        placeholderValues
      );

      const customizedContent = this.applyPlaceholders(
        recommendation.suggestedContent || '',
        transformedValues
      );

      // Create updated recommendation
      const customizedRecommendation: Recommendation = {
        ...recommendation,
        customizedContent,
        isCustomized: true
      };

      return {
        recommendation: customizedRecommendation,
        customizedContent,
        placeholdersApplied: transformedValues,
        validationResults
      };

    } catch (error) {
      console.error('[PlaceholderCustomizationService] Error customizing placeholders:', error);
      throw error;
    }
  }

  /**
   * Validate placeholder values against recommendation placeholders
   */
  private validatePlaceholderValues(
    placeholders: Placeholder[],
    values: Record<string, string>
  ): PlaceholderValidationResult[] {
    const results: PlaceholderValidationResult[] = [];

    // Create a map of placeholders for quick lookup
    const placeholderMap = new Map(placeholders.map(p => [p.id, p]));

    // Validate each provided value
    for (const [placeholderId, value] of Object.entries(values)) {
      const placeholder = placeholderMap.get(placeholderId);
      
      if (!placeholder) {
        results.push({
          placeholderId,
          isValid: false,
          error: `Placeholder '${placeholderId}' not found in recommendation`
        });
        continue;
      }

      const validation = this.validateSinglePlaceholder(placeholder, value);
      results.push(validation);
    }

    // Check for missing required placeholders
    for (const placeholder of placeholders) {
      if (placeholder.required && !(placeholder.id in values)) {
        results.push({
          placeholderId: placeholder.id,
          isValid: false,
          error: `Required placeholder '${placeholder.name}' is missing`
        });
      }
    }

    return results;
  }

  /**
   * Validate a single placeholder value
   */
  private validateSinglePlaceholder(
    placeholder: Placeholder,
    value: string
  ): PlaceholderValidationResult {
    // Check if required placeholder is empty
    if (placeholder.required && (!value || value.trim() === '')) {
      return {
        placeholderId: placeholder.id,
        isValid: false,
        error: `Required placeholder '${placeholder.name}' cannot be empty`
      };
    }

    // If value is empty and not required, that's valid
    if (!value || value.trim() === '') {
      return {
        placeholderId: placeholder.id,
        isValid: true,
        transformedValue: placeholder.defaultValue || ''
      };
    }

    // Type-specific validation
    let transformedValue = value;
    
    switch (placeholder.type) {
      case PlaceholderType.NUMBER:
        if (isNaN(Number(value))) {
          return {
            placeholderId: placeholder.id,
            isValid: false,
            error: `Value must be a valid number`
          };
        }
        transformedValue = Number(value).toString();
        break;

      case PlaceholderType.DATE:
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return {
            placeholderId: placeholder.id,
            isValid: false,
            error: `Value must be a valid date`
          };
        }
        transformedValue = date.toLocaleDateString();
        break;

      case PlaceholderType.DROPDOWN:
        if (placeholder.options && !placeholder.options.includes(value)) {
          return {
            placeholderId: placeholder.id,
            isValid: false,
            error: `Value must be one of: ${placeholder.options.join(', ')}`
          };
        }
        break;

      default:
        // For TEXT and MULTILINE, just trim whitespace
        transformedValue = value.trim();
        break;
    }

    // Custom validation regex if provided
    if (placeholder.validation) {
      try {
        const regex = new RegExp(placeholder.validation);
        if (!regex.test(transformedValue)) {
          return {
            placeholderId: placeholder.id,
            isValid: false,
            error: `Value does not match required format`
          };
        }
      } catch (error) {
        console.warn(`[PlaceholderCustomizationService] Invalid regex in placeholder ${placeholder.id}:`, error);
      }
    }

    return {
      placeholderId: placeholder.id,
      isValid: true,
      transformedValue
    };
  }

  /**
   * Transform placeholder values according to their type and validation rules
   */
  private transformPlaceholderValues(
    placeholders: Placeholder[],
    values: Record<string, string>
  ): Record<string, string> {
    const transformed: Record<string, string> = {};
    const placeholderMap = new Map(placeholders.map(p => [p.id, p]));

    for (const [placeholderId, value] of Object.entries(values)) {
      const placeholder = placeholderMap.get(placeholderId);
      if (!placeholder) continue;

      const validation = this.validateSinglePlaceholder(placeholder, value);
      if (validation.isValid && validation.transformedValue !== undefined) {
        transformed[placeholderId] = validation.transformedValue;
      } else if (placeholder.defaultValue) {
        transformed[placeholderId] = placeholder.defaultValue;
      }
    }

    return transformed;
  }

  /**
   * Apply placeholder values to content template
   */
  private applyPlaceholders(content: string, values: Record<string, string>): string {
    let result = content;

    // Replace placeholders in format {{PLACEHOLDER_ID}} or {PLACEHOLDER_ID}
    for (const [placeholderId, value] of Object.entries(values)) {
      const patterns = [
        new RegExp(`\\{\\{${placeholderId}\\}\\}`, 'g'),
        new RegExp(`\\{${placeholderId}\\}`, 'g'),
        new RegExp(`\\[${placeholderId}\\]`, 'g')
      ];

      for (const pattern of patterns) {
        result = result.replace(pattern, value);
      }
    }

    return result;
  }

  /**
   * Get recommendation by ID (mock implementation)
   * In a real system, this would query the database
   */
  private async getRecommendation(recommendationId: string): Promise<Recommendation | null> {
    // Mock implementation - in reality this would fetch from database
    const mockRecommendation: Recommendation = {
      id: recommendationId,
      type: 'content' as any,
      category: 'professional_summary' as any,
      section: 'professional_summary' as any,
      actionRequired: 'modify' as any,
      title: 'Enhance Professional Summary',
      description: 'Improve your professional summary with specific achievements and skills',
      suggestedContent: 'Experienced {ROLE} with {YEARS} years of expertise in {SKILLS}. Proven track record of {ACHIEVEMENT} at {COMPANY}.',
      impact: 'high' as any,
      priority: 1,
      estimatedScoreImprovement: 15,
      placeholders: [
        {
          id: 'ROLE',
          name: 'Professional Role',
          type: PlaceholderType.TEXT,
          description: 'Your current or target professional role',
          required: true
        },
        {
          id: 'YEARS',
          name: 'Years of Experience',
          type: PlaceholderType.NUMBER,
          description: 'Number of years of professional experience',
          required: true
        },
        {
          id: 'SKILLS',
          name: 'Key Skills',
          type: PlaceholderType.TEXT,
          description: 'Your top 3-5 relevant skills',
          required: true
        },
        {
          id: 'ACHIEVEMENT',
          name: 'Key Achievement',
          type: PlaceholderType.MULTILINE,
          description: 'A specific, quantifiable achievement',
          required: false,
          defaultValue: 'delivering high-quality results'
        },
        {
          id: 'COMPANY',
          name: 'Company Name',
          type: PlaceholderType.TEXT,
          description: 'Your current or most recent company',
          required: false,
          defaultValue: 'leading organizations'
        }
      ]
    };

    return mockRecommendation;
  }

  /**
   * Get available placeholder types for UI
   */
  getPlaceholderTypes(): { value: PlaceholderType; label: string; description: string }[] {
    return [
      {
        value: PlaceholderType.TEXT,
        label: 'Text',
        description: 'Single line text input'
      },
      {
        value: PlaceholderType.MULTILINE,
        label: 'Multi-line Text',
        description: 'Multiple lines of text'
      },
      {
        value: PlaceholderType.NUMBER,
        label: 'Number',
        description: 'Numeric value'
      },
      {
        value: PlaceholderType.DATE,
        label: 'Date',
        description: 'Date value'
      },
      {
        value: PlaceholderType.DROPDOWN,
        label: 'Dropdown',
        description: 'Selection from predefined options'
      }
    ];
  }
}