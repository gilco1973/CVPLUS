import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { corsOptions } from '../config/cors';
import { requireAuth } from '../middleware/authGuard';

export const testAuth = onCall(
  {
    timeoutSeconds: 30,
    memory: '512MiB',
    ...corsOptions
  },
  async (request) => {
    try {
      logger.info('testAuth function called', { 
        hasAuth: !!request.auth,
        uid: request.auth?.uid,
        email: request.auth?.token?.email,
        timestamp: new Date().toISOString(),
        requestData: request.data
      });

      // Use the enhanced authentication middleware
      const authenticatedRequest = await requireAuth(request);
      const { uid, token } = authenticatedRequest.auth;

      logger.info('Authentication test completed successfully', {
        uid,
        email: token.email,
        emailVerified: token.email_verified,
        provider: token.firebase?.sign_in_provider,
        tokenAge: Math.floor(Date.now() / 1000) - token.iat
      });

      return {
        success: true,
        message: 'Authentication test successful with enhanced middleware',
        user: {
          uid,
          email: token.email,
          emailVerified: token.email_verified,
          provider: token.firebase?.sign_in_provider,
          tokenIssuedAt: new Date(token.iat * 1000).toISOString(),
          tokenExpiresAt: new Date(token.exp * 1000).toISOString(),
          tokenAge: Math.floor(Date.now() / 1000) - token.iat
        },
        testData: request.data,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('testAuth function failed', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        hasAuth: !!request.auth,
        requestAuth: request.auth ? {
          uid: request.auth.uid,
          email: request.auth.token?.email
        } : null,
        timestamp: new Date().toISOString()
      });

      // Also log to console for easier debugging
      
      throw error;
    }
  }
);