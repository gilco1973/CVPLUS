import { onRequest } from 'firebase-functions/v2/https';

export const testCors = onRequest(
  {
    cors: [
      'https://getmycv-ai.firebaseapp.com',
      'https://getmycv-ai.web.app',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
    ]
  },
  async (req, res) => {
    // Set CORS headers explicitly
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    res.json({ 
      success: true, 
      message: 'CORS test successful',
      origin: req.headers.origin,
      method: req.method 
    });
  }
);