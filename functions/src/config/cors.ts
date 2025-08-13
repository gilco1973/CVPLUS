// CORS configuration for all allowed origins
export const corsOptions = {
  cors: [
    'https://getmycv-ai.firebaseapp.com',
    'https://getmycv-ai.web.app',
    'https://cvplus.firebaseapp.com',
    'https://cvplus.web.app',
    'https://cvplus.ai',
    'https://www.cvplus.ai',
    'http://localhost:3000', // React dev server (port 3000)
    'http://localhost:3001', // React dev server (port 3001)
    'http://localhost:5173', // Vite dev server
    'http://localhost:5000', // Firebase emulator
  ]
};

// For v2 functions that need simple cors
export const simpleCorsOptions = {
  cors: true
};