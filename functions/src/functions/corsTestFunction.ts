import { onRequest } from 'firebase-functions/v2/https';
import { corsOptions } from '../config/cors';

export const testCors = onRequest(
  {
    ...corsOptions,
  },
  async (req, res) => {
    // CORS is handled by the function configuration above
    // Remove manual CORS headers to avoid conflicts
    
    res.json({ 
      success: true, 
      message: 'CORS test successful',
      origin: req.headers.origin,
      method: req.method 
    });
  }
);