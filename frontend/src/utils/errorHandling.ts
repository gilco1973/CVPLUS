/**
 * Standard Error Handling Utilities for TypeScript Type Safety
 * Provides consistent error handling patterns across the CVPlus codebase
 */

export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

export function toErrorWithMessage(maybeError: unknown): { message: string } {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError));
  }
}

export function getErrorMessage(error: unknown): string {
  return toErrorWithMessage(error).message;
}

/**
 * Firebase specific error type guard
 */
export function isFirebaseError(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as Record<string, unknown>).code === 'string' &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Network/Fetch error type guard
 */
export function isFetchError(error: unknown): error is { status: number; statusText: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as Record<string, unknown>).status === 'number'
  );
}

/**
 * Validation error type guard for form errors
 */
export function isValidationError(error: unknown): error is { field: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'field' in error &&
    'message' in error &&
    typeof (error as Record<string, unknown>).field === 'string' &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Safe error logging that handles unknown error types
 */
export function logError(context: string, error: unknown, additionalData?: Record<string, unknown>): void {
  const errorMessage = getErrorMessage(error);
  const logData = {
    context,
    error: errorMessage,
    timestamp: new Date().toISOString(),
    ...additionalData
  };

  if (isError(error)) {
    console.error(`[${context}] Error:`, error.message, error.stack, logData);
  } else if (isFirebaseError(error)) {
    console.error(`[${context}] Firebase Error [${error.code}]:`, error.message, logData);
  } else {
    console.error(`[${context}] Unknown Error:`, errorMessage, logData);
  }
}

/**
 * Standardized error handling for async operations
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<{ data?: T; error?: string; success: boolean }> {
  try {
    const data = await operation();
    return { data, success: true };
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    logError(context, error);
    
    return {
      error: errorMessage,
      success: false,
      data: fallback
    };
  }
}