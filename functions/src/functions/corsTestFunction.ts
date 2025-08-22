import { onRequest, onCall } from 'firebase-functions/v2/https';
import { requestCorsOptions, corsOptions, corsMiddleware } from '../config/cors';

export const testCors = onRequest(
  {
    ...requestCorsOptions,
  },
  async (req, res) => {
    // Apply CORS middleware
    corsMiddleware(req, res);
    
    res.json({ 
      success: true, 
      message: 'CORS test successful (onRequest)',
      origin: req.headers.origin,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
);

export const testCorsCall = onCall(
  {
    ...corsOptions,
  },
  async (request) => {
    return {
      success: true,
      message: 'CORS test successful (onCall)',
      timestamp: new Date().toISOString(),
      auth: !!request.auth
    };
  }
);