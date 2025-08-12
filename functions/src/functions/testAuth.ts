import { onCall } from 'firebase-functions/v2/https';
import { corsOptions } from '../config/cors';

export const testAuth = onCall(
  {
    timeoutSeconds: 30,
    memory: '512MiB',
    ...corsOptions
  },
  async (request) => {
    console.log('=== TEST AUTH FUNCTION ===');
    console.log('Request auth exists:', !!request.auth);
    console.log('Request auth:', JSON.stringify(request.auth, null, 2));
    console.log('Request data:', JSON.stringify(request.data, null, 2));
    console.log('Raw request keys:', Object.keys(request));
    
    return {
      hasAuth: !!request.auth,
      authUid: request.auth?.uid || null,
      requestData: request.data,
      timestamp: Date.now()
    };
  }
);