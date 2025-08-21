/**
 * Timeline Data Validator Service
 * Handles comprehensive validation and sanitization of timeline data
 */

export interface TimelineEventValidationSchema {
  required: string[];
  optional: string[];
  types: { [key: string]: string };
  validators: { [key: string]: (value: any) => boolean };
}

export interface DataQualityMetrics {
  totalEvents: number;
  cleanedEvents: number;
  validationErrors: number;
  fieldsRemoved: {
    location: number;
    description: number;
    achievements: number;
    skills: number;
    logo: number;
    impact: number;
    endDate: number;
    current: number;
  };
  processingTime: number;
}

export class TimelineValidatorService {
  
  private validationSchema: TimelineEventValidationSchema = {
    required: ['id', 'type', 'title', 'organization', 'startDate'],
    optional: ['endDate', 'current', 'description', 'achievements', 'skills', 'location', 'logo', 'impact'],
    types: {
      id: 'string',
      type: 'string',
      title: 'string',
      organization: 'string',
      startDate: 'string',
      endDate: 'string',
      current: 'boolean',
      description: 'string',
      achievements: 'array',
      skills: 'array',
      location: 'string',
      logo: 'string',
      impact: 'array'
    },
    validators: {
      string: (value: any) => typeof value === 'string' && value.trim().length > 0,
      boolean: (value: any) => typeof value === 'boolean',
      array: (value: any) => Array.isArray(value) && value.length > 0,
      date: (value: any) => {
        try {
          return typeof value === 'string' && !isNaN(new Date(value).getTime());
        } catch {
          return false;
        }
      }
    }
  };

  /**
   * Validate a single field against the validation schema
   */
  validateField(fieldName: string, value: any, metrics: DataQualityMetrics): boolean {
    try {
      // Check if field is required
      if (this.validationSchema.required.includes(fieldName)) {
        if (value === undefined || value === null) {
          console.warn(`[Timeline Validator] Required field '${fieldName}' is missing or null`);
          metrics.validationErrors++;
          return false;
        }
      }
      
      // Skip validation for undefined optional fields
      if (value === undefined || value === null) {
        return true; // Optional fields can be undefined
      }
      
      // Get expected type
      const expectedType = this.validationSchema.types[fieldName];
      if (!expectedType) {
        console.warn(`[Timeline Validator] Unknown field '${fieldName}' encountered`);
        return false;
      }
      
      // Validate type
      const validator = this.validationSchema.validators[expectedType];
      if (!validator) {
        console.warn(`[Timeline Validator] No validator found for type '${expectedType}'`);
        return false;
      }
      
      const isValid = validator(value);
      if (!isValid) {
        console.warn(`[Timeline Validator] Field '${fieldName}' failed validation. Expected: ${expectedType}, Got: ${typeof value}, Value: ${JSON.stringify(value)}`);
        metrics.validationErrors++;
      }
      
      return isValid;
    } catch (error) {
      console.error(`[Timeline Validator] Error validating field '${fieldName}':`, error);
      metrics.validationErrors++;
      return false;
    }
  }
  
  /**
   * Deep sanitize array values, removing invalid elements
   */
  sanitizeArray(arr: any[], fieldName: string, metrics: DataQualityMetrics): any[] | undefined {
    try {
      if (!Array.isArray(arr)) {
        console.warn(`[Timeline Validator] Expected array for field '${fieldName}', got:`, typeof arr);
        (metrics.fieldsRemoved as any)[fieldName]++;
        return undefined;
      }
      
      const sanitized = arr.filter(item => {
        if (item === undefined || item === null) {
          return false;
        }
        
        if (typeof item === 'string') {
          return item.trim().length > 0;
        }
        
        if (fieldName === 'impact' && typeof item === 'object') {
          return item.metric !== undefined && 
                 item.metric !== null && 
                 item.value !== undefined && 
                 item.value !== null &&
                 typeof item.metric === 'string' &&
                 typeof item.value === 'string' &&
                 item.metric.trim().length > 0 &&
                 item.value.trim().length > 0;
        }
        
        return true;
      });
      
      if (sanitized.length === 0) {
        (metrics.fieldsRemoved as any)[fieldName]++;
        return undefined;
      }
      
      // For string arrays, trim all strings
      if (sanitized.length > 0 && typeof sanitized[0] === 'string') {
        return sanitized.map(item => typeof item === 'string' ? item.trim() : item);
      }
      
      return sanitized;
    } catch (error) {
      console.error(`[Timeline Validator] Error sanitizing array field '${fieldName}':`, error);
      (metrics.fieldsRemoved as any)[fieldName]++;
      return undefined;
    }
  }
  
  /**
   * Log data quality metrics for monitoring and debugging
   */
  logDataQualityMetrics(metrics: DataQualityMetrics): void {
    console.log('[Timeline Validator] Data Quality Report:');
    console.log(`  Total Events Processed: ${metrics.totalEvents}`);
    console.log(`  Successfully Cleaned Events: ${metrics.cleanedEvents}`);
    console.log(`  Events Removed: ${metrics.totalEvents - metrics.cleanedEvents}`);
    console.log(`  Validation Errors: ${metrics.validationErrors}`);
    console.log(`  Processing Time: ${metrics.processingTime}ms`);
    
    const totalFieldsRemoved = Object.values(metrics.fieldsRemoved).reduce((sum, count) => sum + count, 0);
    if (totalFieldsRemoved > 0) {
      console.log('  Fields Removed:');
      Object.entries(metrics.fieldsRemoved).forEach(([field, count]) => {
        if (count > 0) {
          console.log(`    ${field}: ${count}`);
        }
      });
    }
    
    // Calculate success rate
    const successRate = metrics.totalEvents > 0 
      ? ((metrics.cleanedEvents / metrics.totalEvents) * 100).toFixed(1)
      : '100.0';
    console.log(`  Success Rate: ${successRate}%`);
    
    // Performance assessment
    if (metrics.processingTime > 1000) {
      console.warn(`[Timeline Validator] Processing time exceeded 1s (${metrics.processingTime}ms). Consider optimization.`);
    }
  }
}

export const timelineValidatorService = new TimelineValidatorService();