// CORS configuration for all allowed origins
export const corsOptions = {
  cors: [
    'https://getmycv-ai.firebaseapp.com',
    'https://getmycv-ai.web.app',
    'https://getmycv.ai',
    'https://cvisionary.ai',
    'https://www.cvisionary.ai',
    'http://localhost:3000', // React dev server
    'http://localhost:5173', // Vite dev server
    'http://localhost:5000', // Firebase emulator
  ]
};

// For v2 functions that need simple cors
export const simpleCorsOptions = {
  cors: true
};