/**
 * Firestore utility functions for handling data sanitization
 * and preventing Firebase errors from undefined values
 */

/**
 * Recursively removes undefined values from an object
 * to prevent Firebase setDoc errors
 */
export function removeUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => removeUndefinedValues(item));
  
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = removeUndefinedValues(value);
    }
  }
  return result;
}

/**
 * Sanitizes data for Firebase storage by removing undefined values,
 * functions, and other unsupported types
 */
export function sanitizeForFirestore(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...data };
  
  // Remove functions and undefined values
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'function' || sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });
  
  return removeUndefinedValues(sanitized);
}