/**
 * CVPlus Authentication Module
 * 
 * A comprehensive authentication and authorization module for the CVPlus platform.
 * Provides secure user management, session handling, premium features, and role-based access control.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export * from './types';

// ============================================================================
// CORE SERVICES
// ============================================================================
export { AuthService } from './services/auth.service';
export { TokenService } from './services/token.service';
export { SessionService } from './services/session.service';
export { PermissionsService } from './services/permissions.service';
export { PremiumService } from './services/premium.service';
export { CalendarService } from './services/calendar.service';

// ============================================================================
// UTILITIES
// ============================================================================
export * from './utils/validation';
export * from './utils/encryption';
export * from './utils/storage';
export * from './utils/cache';
export * from './utils/errors';

// ============================================================================
// CONSTANTS
// ============================================================================
export * from './constants/auth.constants';
export * from './constants/permissions.constants';
export * from './constants/premium.constants';

// ============================================================================
// REACT EXPORTS (Client-side only) - TODO: Implement React components
// ============================================================================
// export { AuthProvider } from './context/AuthContext';
// export { useAuth } from './hooks/useAuth';
// export { usePermissions } from './hooks/usePermissions';
// export { usePremium } from './hooks/usePremium';
// export { useSession } from './hooks/useSession';
// export { useCalendar } from './hooks/useCalendar';

// export { AuthGuard } from './components/AuthGuard';
// export { SignInDialog } from './components/SignInDialog';
// export { UserMenu } from './components/UserMenu';
// export { PermissionGate } from './components/PermissionGate';

// ============================================================================
// SERVER EXPORTS (Server-side only) - TODO: Implement middleware
// ============================================================================
// export { authMiddleware } from './middleware/auth.middleware';
// export { premiumMiddleware } from './middleware/premium.middleware';
// export { rateLimitMiddleware } from './middleware/rate-limit.middleware';

// ============================================================================
// MODULE INITIALIZATION
// ============================================================================
export { initializeAuth } from './services/auth.service';

// ============================================================================
// VERSION INFORMATION
// ============================================================================
export const VERSION = '1.0.0';
export const MODULE_NAME = '@cvplus/auth';

// Default configuration for easy setup
export { defaultAuthConfig } from './constants/auth.constants';