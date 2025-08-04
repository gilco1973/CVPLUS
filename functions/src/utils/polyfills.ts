// Polyfills for Firebase Functions environment
// This fixes compatibility issues with the Anthropic SDK

// Add File polyfill if not present
if (typeof global !== 'undefined' && typeof global.File === 'undefined') {
  (global as any).File = class File {
    constructor(bits: any[], name: string, options?: any) {
      // Basic File implementation for compatibility
    }
  };
}

// Add any other necessary polyfills here
export {};