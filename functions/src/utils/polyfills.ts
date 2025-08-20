// Polyfills for Firebase Functions environment
// This fixes compatibility issues with the Anthropic SDK

// Load environment variables as early as possible
import { config as loadDotenv } from 'dotenv';
import * as path from 'path';

// Load .env file if not in production (Firebase handles env vars in production)
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.resolve(__dirname, '../../.env');
  loadDotenv({ path: envPath });
}

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