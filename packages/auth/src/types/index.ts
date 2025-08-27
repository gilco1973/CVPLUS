/**
 * Authentication Module Types
 * 
 * Core type definitions for the CVPlus authentication system.
 * Provides comprehensive typing for all authentication-related functionality.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// Export all types, resolving conflicts by prioritizing error.types for error definitions
export * from './user.types';
export * from './permissions.types';
export * from './premium.types';
export * from './config.types';

// Export session types excluding conflicting ones
export type { AuthSession, SessionState, SessionDeviceInfo, SessionLocation, SessionFlags, SessionToken } from './session.types';

// Export auth types excluding conflicting error types 
export type { AuthState, AuthConfig, AuthCredentials, AuthEvents, AuthValidationResult, AuthTokenInfo, AuthProvider } from './auth.types';

// Error types take precedence (these will be the primary error definitions)
export * from './error.types';