// CORS configuration for all allowed origins
export const corsOptions = {
  cors: [
    'https://getmycv-ai.firebaseapp.com',
    'https://getmycv-ai.web.app',
    'https://getmycv.ai',
    'https://cvisionary.ai',
    'https://www.cvisionary.ai',
    'http://localhost:5173', // Vite dev server
    'http://localhost:5000', // Firebase emulator
  ]
};