/**
 * Auth Module Integration
 * 
 * Gradual migration from existing AuthContext to @cvplus/auth module.
 * Currently maintains compatibility with existing auth system.
 */

import { MODULE_FLAGS } from './index';

// For now, we'll re-export the existing auth system
export {
  useAuth,
  usePremium,
  useFeature,
  usePremiumUpgrade,
  AuthProvider,
  type AuthContextType,
  type PremiumContextType
} from '../contexts/AuthContext';

// Future: When @cvplus/auth is ready, we'll switch to:
// export { useAuth, AuthProvider } from '@cvplus/auth';

// Migration helper functions
export const authMigrationHelpers = {
  isLegacyAuth: () => !MODULE_FLAGS.USE_AUTH_MODULE,
  canUseNewAuth: () => MODULE_FLAGS.USE_AUTH_MODULE && !MODULE_FLAGS.FALLBACK_TO_LEGACY,
  shouldFallback: (error: Error) => {
    console.warn('Auth module error, falling back to legacy:', error);
    return MODULE_FLAGS.FALLBACK_TO_LEGACY;
  }
};
