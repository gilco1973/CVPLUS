/**
 * Session Service
 * 
 * Manages user sessions, activity tracking, and cross-tab synchronization.
 */

import type { 
  AuthSession, 
  SessionState, 
  AuthenticatedUser,
  SessionDeviceInfo,
  AuthError,
  AuthConfig
} from '../types';
import { createAuthError } from '../utils/errors';
import { logger } from '../utils/logger';
import { SESSION_DEFAULTS, STORAGE_KEYS } from '../constants/auth.constants';

export class SessionService {
  private config: AuthConfig['session'];
  private sessionState: SessionState;
  private syncInterval: NodeJS.Timeout | null = null;
  private activityTimeout: NodeJS.Timeout | null = null;

  constructor(config: AuthConfig) {
    this.config = config.session;
    this.sessionState = this.initializeSessionState();
    
    if (this.config.enableCrossTabSync) {
      this.setupCrossTabSync();
    }
  }

  private initializeSessionState(): SessionState {
    return {
      isAuthenticated: false,
      isLoading: false,
      session: null,
      tokens: {
        accessToken: null,
        refreshToken: null
      },
      error: null,
      lastSyncAt: 0
    };
  }

  /**
   * Initializes a new session for an authenticated user
   */
  async initializeSession(user: AuthenticatedUser): Promise<void> {
    try {
      const deviceInfo = this.getDeviceInfo();
      const sessionId = this.generateSessionId();
      
      const session: AuthSession = {
        sessionId,
        uid: user.uid,
        startTime: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + this.config.timeout,
        deviceInfo,
        location: await this.getLocationInfo(),
        flags: {
          isActive: true,
          isVerified: user.emailVerified,
          requiresReauth: false,
          hasElevatedAccess: false,
          suspicious: false
        }
      };

      this.sessionState = {
        isAuthenticated: true,
        isLoading: false,
        session,
        tokens: {
          accessToken: null, // Would be populated by TokenService
          refreshToken: null
        },
        error: null,
        lastSyncAt: Date.now()
      };

      // Store session if persistence is enabled
      if (this.config.persistSession) {
        await this.persistSession(session);
      }

      // Set up activity monitoring
      this.setupActivityMonitoring();

      logger.info('Session initialized successfully', {
        sessionId,
        uid: user.uid,
        expiresAt: session.expiresAt
      });

    } catch (error) {
      const sessionError: AuthError = createAuthError(
        'session/invalid',
        'Failed to initialize session'
      );
      
      this.sessionState.error = sessionError;
      throw createAuthError('session/invalid', sessionError.message);
    }
  }

  /**
   * Refreshes the current session
   */
  async refreshSession(): Promise<void> {
    if (!this.sessionState.session) {
      throw createAuthError('session/not-found', 'No active session to refresh');
    }

    try {
      const now = Date.now();
      const updatedSession = {
        ...this.sessionState.session,
        lastActivity: now,
        expiresAt: now + this.config.timeout
      };

      this.sessionState.session = updatedSession;
      this.sessionState.lastSyncAt = now;

      if (this.config.persistSession) {
        await this.persistSession(updatedSession);
      }

      logger.debug('Session refreshed', {
        sessionId: updatedSession.sessionId,
        expiresAt: updatedSession.expiresAt
      });

    } catch (error) {
      const sessionError: AuthError = createAuthError(
        'session/refresh-failed',
        'Failed to refresh session'
      );
      
      this.sessionState.error = sessionError;
      throw createAuthError('session/refresh-failed', sessionError.message);
    }
  }

  /**
   * Validates the current session
   */
  async validateSession(): Promise<boolean> {
    const session = this.sessionState.session;
    if (!session) return false;

    const now = Date.now();
    
    // Check if session has expired
    if (now > session.expiresAt) {
      logger.warn('Session expired', {
        sessionId: session.sessionId,
        expiredAt: session.expiresAt,
        currentTime: now
      });
      
      await this.endSession('expired');
      return false;
    }

    // Check if session is within grace period
    const timeToExpiry = session.expiresAt - now;
    if (timeToExpiry < this.config.refreshThreshold) {
      try {
        await this.refreshSession();
      } catch (error) {
        logger.error('Failed to refresh session within grace period:', error);
        return false;
      }
    }

    return true;
  }

  /**
   * Ends the current session
   */
  async endSession(reason: SessionEndReason = 'manual'): Promise<void> {
    const session = this.sessionState.session;
    
    if (session) {
      logger.info('Ending session', {
        sessionId: session.sessionId,
        reason
      });
      
      // Clean up timers
      this.clearTimers();
      
      // Remove persisted session
      if (this.config.persistSession) {
        await this.removePersistentSession();
      }
    }

    this.clearSession();
  }

  /**
   * Clears the session state
   */
  clearSession(): void {
    this.sessionState = this.initializeSessionState();
    this.clearTimers();
  }

  /**
   * Gets the current session state
   */
  getSessionState(): SessionState {
    return { ...this.sessionState };
  }

  /**
   * Updates user activity timestamp
   */
  updateActivity(): void {
    if (this.sessionState.session) {
      this.sessionState.session.lastActivity = Date.now();
      
      // Reset activity timeout
      if (this.activityTimeout) {
        clearTimeout(this.activityTimeout);
        this.setupActivityTimeout();
      }
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceInfo(): SessionDeviceInfo {
    if (typeof window === 'undefined') {
      return {
        userAgent: 'server',
        platform: 'web',
        isMobile: false
      };
    }

    const userAgent = window.navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    
    return {
      userAgent,
      platform: 'web',
      browser: this.getBrowserName(userAgent),
      os: this.getOS(userAgent),
      isMobile
    };
  }

  private getBrowserName(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private async getLocationInfo(): Promise<SessionLocation | undefined> {
    // This would typically use IP geolocation service
    // For now, return undefined
    return undefined;
  }

  private async persistSession(session: AuthSession): Promise<void> {
    try {
      const sessionData = {
        session,
        timestamp: Date.now()
      };
      
      if (typeof window !== 'undefined') {
        const storageKey = STORAGE_KEYS.SESSION;
        
        if (this.config.storageType === 'localStorage') {
          localStorage.setItem(storageKey, JSON.stringify(sessionData));
        } else if (this.config.storageType === 'sessionStorage') {
          sessionStorage.setItem(storageKey, JSON.stringify(sessionData));
        }
      }
    } catch (error) {
      logger.warn('Failed to persist session:', error);
    }
  }

  private async removePersistentSession(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        const storageKey = STORAGE_KEYS.SESSION;
        localStorage.removeItem(storageKey);
        sessionStorage.removeItem(storageKey);
      }
    } catch (error) {
      logger.warn('Failed to remove persistent session:', error);
    }
  }

  private setupActivityMonitoring(): void {
    this.setupActivityTimeout();
    
    // Set up activity listeners (browser only)
    if (typeof window !== 'undefined') {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      const activityHandler = () => this.updateActivity();
      
      events.forEach(event => {
        window.addEventListener(event, activityHandler, { passive: true });
      });
    }
  }

  private setupActivityTimeout(): void {
    if (this.config.idleTimeout && this.config.idleTimeout > 0) {
      this.activityTimeout = setTimeout(() => {
        logger.info('Session idle timeout reached');
        this.endSession('timeout');
      }, this.config.idleTimeout);
    }
  }

  private setupCrossTabSync(): void {
    if (this.config.syncInterval && this.config.syncInterval > 0) {
      this.syncInterval = setInterval(() => {
        this.syncSessionAcrossTabs();
      }, this.config.syncInterval);
    }

    // Listen for storage events (browser only)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEYS.SESSION) {
          this.handleCrossTabSessionUpdate(event);
        }
      });
    }
  }

  private syncSessionAcrossTabs(): void {
    // Implementation for cross-tab session synchronization
    logger.debug('Syncing session across tabs');
  }

  private handleCrossTabSessionUpdate(event: StorageEvent): void {
    // Handle session updates from other tabs
    logger.debug('Handling cross-tab session update', { key: event.key });
  }

  private clearTimers(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
      this.activityTimeout = null;
    }
  }

  /**
   * Destroys the session service and cleans up resources
   */
  destroy(): void {
    this.clearTimers();
    this.clearSession();
    logger.debug('SessionService destroyed');
  }
}

type SessionEndReason = 'logout' | 'timeout' | 'expired' | 'manual' | 'security';
type SessionLocation = {
  ip: string;
  country?: string;
  region?: string;
  city?: string;
};

