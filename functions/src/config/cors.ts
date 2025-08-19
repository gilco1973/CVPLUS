// CORS configuration for all allowed origins - Firebase v2 compatible with explicit types
const allowedOrigins: (string | RegExp)[] = [
  'https://getmycv-ai.firebaseapp.com',
  'https://getmycv-ai.web.app',
  'https://cvplus.firebaseapp.com',
  'https://cvplus.web.app',
  'https://cvplus.ai',
  'https://www.cvplus.ai',
  'http://localhost:3000', // React dev server (port 3000)
  'http://localhost:3001', // React dev server (port 3001)
  'http://localhost:3002', // React dev server (port 3002)
  'http://localhost:5173', // Vite dev server
  'http://localhost:5000', // Firebase emulator
];

// Firebase Functions v2 compatible CORS options with explicit typing
export const corsOptions: { cors: (string | RegExp)[] } = {
  cors: allowedOrigins
};

// For v2 functions that need simple cors with explicit typing
export const simpleCorsOptions: { cors: boolean } = {
  cors: true
};

// Enhanced CORS options - Firebase v2 compatible with explicit typing
export const enhancedCorsOptions: { cors: (string | RegExp)[] } = {
  cors: allowedOrigins
};

// Utility function to add CORS headers manually if needed
export function addCorsHeaders(response: any, origin?: string): void {
  if (!origin) {
    throw new Error('Origin is required');
  }
  
  // SECURITY FIX: Proper origin validation for string and RegExp types
  const isAllowed = allowedOrigins.some(allowedOrigin => {
    if (typeof allowedOrigin === 'string') {
      return allowedOrigin === origin;
    } else if (allowedOrigin instanceof RegExp) {
      return allowedOrigin.test(origin);
    }
    return false;
  });
  
  if (!isAllowed) {
    console.warn(`[SECURITY] Blocked request from unauthorized origin: ${origin}`);
    throw new Error(`Origin not allowed: ${origin}`);
  }
  
  response.set({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  });
}