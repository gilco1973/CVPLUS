/**
 * Stub Authentication Middleware
 * Temporary stub for deployment - production auth should be restored
 */

import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
    verified?: boolean;
    subscription?: {
      tier: 'free' | 'premium' | 'enterprise';
      status: 'active' | 'inactive' | 'cancelled';
    };
  };
}

interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
}

// Stub implementation - allows all requests for deployment
export const authenticateUser = async (req: AuthRequest, options?: { required?: boolean }): Promise<AuthResult> => {
  // TODO: Restore proper authentication for production
  console.warn('⚠️ Using stub authentication - restore proper auth for production!');

  // Set a default user for development
  req.user = {
    uid: 'development-user',
    email: 'dev@cvplus.app',
    role: 'user',
    verified: true,
    subscription: {
      tier: 'premium',
      status: 'active'
    }
  };

  return {
    success: true,
    userId: 'development-user'
  };
};

export const requirePremium = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Stub implementation - allows all requests
  console.warn('⚠️ Using stub premium check - restore proper auth for production!');
  next();
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Stub implementation - allows all requests
  console.warn('⚠️ Using stub admin check - restore proper auth for production!');
  next();
};

export const validateApiKey = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Stub implementation - allows all requests
  console.warn('⚠️ Using stub API key validation - restore proper auth for production!');
  req.user = {
    uid: 'api-user',
    email: 'api@cvplus.app',
    role: 'admin'
  };
  next();
};

export const getUserFromToken = async (req: AuthRequest): Promise<AuthResult> => {
  // Stub implementation - returns default user
  console.warn('⚠️ Using stub token validation - restore proper auth for production!');
  req.user = {
    uid: 'token-user',
    email: 'token@cvplus.app',
    role: 'user',
    verified: true
  };
  return {
    success: true,
    userId: 'token-user'
  };
};

export default {
  authenticateUser,
  requirePremium,
  requireAdmin,
  validateApiKey,
  getUserFromToken
};