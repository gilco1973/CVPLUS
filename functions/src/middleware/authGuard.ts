import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

export interface AuthenticatedRequest extends CallableRequest {
  auth: {
    uid: string;
    token: admin.auth.DecodedIdToken;
  };
}

export const requireAuth = async (request: CallableRequest): Promise<AuthenticatedRequest> => {
  // Check if auth context exists
  if (!request.auth) {
    logger.error('Authentication failed: No auth context', {
      hasRawRequest: !!request.rawRequest,
      origin: request.rawRequest?.headers?.origin,
      userAgent: request.rawRequest?.headers?.['user-agent']
    });
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { uid, token } = request.auth;
  
  // Verify the token is valid and not expired
  if (!uid || !token) {
    logger.error('Authentication failed: Invalid token', { 
      uid: !!uid, 
      token: !!token,
      hasEmail: !!token?.email 
    });
    throw new HttpsError('unauthenticated', 'Invalid authentication token');
  }

  // Additional token validation
  try {
    // Verify token is not expired (Firebase should handle this, but double-check)
    const currentTime = Math.floor(Date.now() / 1000);
    if (token.exp <= currentTime) {
      logger.error('Authentication failed: Token expired', {
        uid,
        exp: token.exp,
        currentTime,
        expired: currentTime - token.exp
      });
      throw new HttpsError('unauthenticated', 'Authentication token has expired');
    }

    // Verify token was issued recently (within 24 hours)
    const tokenAge = currentTime - token.iat;
    if (tokenAge > 86400) {
      logger.warn('Authentication warning: Old token', {
        uid,
        iat: token.iat,
        age: tokenAge,
        ageHours: Math.floor(tokenAge / 3600)
      });
    }

    // SECURITY REQUIREMENT: Email verification enforcement for production
    const isProduction = process.env.NODE_ENV === 'production' || process.env.FUNCTIONS_EMULATOR !== 'true';
    
    if (!token.email_verified && token.email && isProduction) {
      logger.error('Authentication failed: Email verification required in production', {
        uid,
        email: token.email,
        emailVerified: token.email_verified,
        environment: process.env.NODE_ENV,
        isProduction
      });
      throw new HttpsError(
        'permission-denied', 
        'Email verification is required. Please verify your email address before accessing this service.'
      );
    }
    
    // Log warning in development only
    if (!token.email_verified && token.email && !isProduction) {
      logger.warn('Authentication warning: Unverified email (development mode)', {
        uid,
        email: token.email,
        emailVerified: token.email_verified
      });
    }

    logger.info('Authentication successful', {
      uid,
      email: token.email,
      emailVerified: token.email_verified,
      tokenAge: tokenAge,
      provider: token.firebase?.sign_in_provider
    });

    return {
      ...request,
      auth: { uid, token }
    } as AuthenticatedRequest;

  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    
    logger.error('Authentication validation failed', { 
      error: error instanceof Error ? error.message : error, 
      uid,
      errorStack: error instanceof Error ? error.stack : undefined
    });
    throw new HttpsError('unauthenticated', 'Authentication validation failed');
  }
};

/**
 * Enhanced authentication middleware that also validates job ownership
 */
export const requireAuthWithJobOwnership = async (
  request: CallableRequest, 
  jobId: string
): Promise<AuthenticatedRequest> => {
  const authenticatedRequest = await requireAuth(request);
  const { uid } = authenticatedRequest.auth;

  try {
    // Verify job exists and belongs to the authenticated user
    const jobDoc = await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .get();

    if (!jobDoc.exists) {
      logger.error('Job not found', { jobId, uid });
      throw new HttpsError('not-found', 'Job not found');
    }

    const jobData = jobDoc.data();
    if (jobData?.userId !== uid) {
      logger.error('Job ownership verification failed', {
        jobId,
        requestUid: uid,
        jobUserId: jobData?.userId
      });
      throw new HttpsError('permission-denied', 'Access denied: Job belongs to different user');
    }

    logger.info('Job ownership verified', { jobId, uid });
    return authenticatedRequest;

  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    
    logger.error('Job ownership validation failed', { 
      error: error instanceof Error ? error.message : error,
      jobId, 
      uid 
    });
    throw new HttpsError('internal', 'Failed to validate job ownership');
  }
};

/**
 * Utility to extract user information from authenticated request
 */
export const getUserInfo = (request: AuthenticatedRequest) => {
  return {
    uid: request.auth.uid,
    email: request.auth.token.email,
    emailVerified: request.auth.token.email_verified,
    provider: request.auth.token.firebase?.sign_in_provider,
    name: request.auth.token.name,
    picture: request.auth.token.picture
  };
};

/**
 * Check if user has administrative privileges
 */
export const isAdmin = (request: AuthenticatedRequest): boolean => {
  // SECURITY IMPROVEMENT: Use environment variables for admin emails
  const adminEmailsEnv = process.env.ADMIN_EMAILS || 'gil.klainert@gmail.com,admin@cvplus.ai';
  const adminEmails = adminEmailsEnv.split(',').map(email => email.trim());
  
  return adminEmails.includes(request.auth.token.email || '');
};

/**
 * Rate limiting wrapper for authenticated functions
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute per user

export const withRateLimit = (maxRequests = RATE_LIMIT_MAX, windowMs = RATE_LIMIT_WINDOW) => {
  return (handler: (request: AuthenticatedRequest) => Promise<any>) => {
    return async (request: AuthenticatedRequest) => {
      const { uid } = request.auth;
      const now = Date.now();
      const key = uid;

      // Clean up expired entries
      for (const [k, v] of rateLimitMap.entries()) {
        if (now > v.resetTime) {
          rateLimitMap.delete(k);
        }
      }

      // Check rate limit
      const userLimit = rateLimitMap.get(key);
      if (userLimit) {
        if (now < userLimit.resetTime) {
          if (userLimit.count >= maxRequests) {
            logger.warn('Rate limit exceeded', { 
              uid, 
              count: userLimit.count, 
              maxRequests,
              resetTime: userLimit.resetTime 
            });
            throw new HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
          }
          userLimit.count++;
        } else {
          // Reset window
          rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
        }
      } else {
        rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      }

      return handler(request);
    };
  };
};