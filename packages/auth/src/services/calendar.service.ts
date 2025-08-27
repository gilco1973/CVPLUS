/**
 * Calendar Service
 * 
 * Manages Google Calendar integration and token management.
 */

import type {
  GoogleCalendarTokens,
  AuthConfig
} from '../types';
import { createAuthError } from '../utils/errors';
import { logger } from '../utils/logger';
import { GOOGLE_CALENDAR_SCOPES, STORAGE_KEYS } from '../constants/auth.constants';

export class CalendarService {
  private config: AuthConfig;
  private tokenCache: Map<string, GoogleCalendarTokens> = new Map();

  constructor(config: AuthConfig) {
    this.config = config;
  }

  /**
   * Checks if a user has calendar permissions
   */
  async hasCalendarPermissions(userId: string): Promise<boolean> {
    try {
      const tokens = await this.getStoredTokens(userId);
      return tokens !== null && this.isTokenValid(tokens);
    } catch (error) {
      logger.error('Failed to check calendar permissions:', error);
      return false;
    }
  }

  /**
   * Requests calendar permissions from Google
   */
  async requestCalendarPermissions(): Promise<void> {
    if (!this.config.features.enableCalendarIntegration) {
      throw createAuthError('auth/operation-not-allowed', 'Calendar integration is disabled');
    }

    try {
      // This would integrate with Firebase Auth and Google OAuth
      // For now, we'll throw an error indicating the method needs to be called from AuthService
      throw createAuthError(
        'auth/invalid-configuration',
        'Calendar permissions must be requested through AuthService.requestCalendarPermissions()'
      );
    } catch (error) {
      logger.error('Failed to request calendar permissions:', error);
      throw error;
    }
  }

  /**
   * Stores Google OAuth tokens for calendar access
   */
  async storeGoogleTokens(userId: string, accessToken: string, refreshToken?: string): Promise<void> {
    try {
      const tokens: GoogleCalendarTokens = {
        accessToken,
        refreshToken,
        expiryDate: Date.now() + (3600 * 1000), // 1 hour default
        tokenType: 'Bearer',
        scope: [...GOOGLE_CALENDAR_SCOPES],
        grantedAt: Date.now()
      };

      // Store in cache
      this.tokenCache.set(userId, tokens);

      // Store in persistent storage
      if (typeof window !== 'undefined') {
        try {
          const storageKey = `${STORAGE_KEYS.CALENDAR_TOKENS}_${userId}`;
          localStorage.setItem(storageKey, JSON.stringify(tokens));
        } catch (storageError) {
          logger.warn('Failed to persist calendar tokens:', storageError);
        }
      }

      // Store in Firestore
      try {
        await this.saveTokensToFirestore(userId, tokens);
      } catch (firestoreError) {
        logger.warn('Failed to save calendar tokens to Firestore:', firestoreError);
        // Don't fail the entire operation if Firestore save fails
      }

      logger.info('Google calendar tokens stored successfully', {
        userId,
        scopes: tokens.scope,
        hasRefreshToken: !!tokens.refreshToken
      });

    } catch (error) {
      logger.error('Failed to store Google tokens:', error);
      throw createAuthError('auth/token-storage-failed', 'Failed to store calendar tokens');
    }
  }

  /**
   * Retrieves stored tokens for a user
   */
  async getStoredTokens(userId: string): Promise<GoogleCalendarTokens | null> {
    try {
      // Check cache first
      const cached = this.tokenCache.get(userId);
      if (cached && this.isTokenValid(cached)) {
        return cached;
      }

      // Try to load from persistent storage
      if (typeof window !== 'undefined') {
        try {
          const storageKey = `${STORAGE_KEYS.CALENDAR_TOKENS}_${userId}`;
          const stored = localStorage.getItem(storageKey);
          
          if (stored) {
            const tokens: GoogleCalendarTokens = JSON.parse(stored);
            
            if (this.isTokenValid(tokens)) {
              this.tokenCache.set(userId, tokens);
              return tokens;
            } else {
              // Remove expired tokens
              localStorage.removeItem(storageKey);
            }
          }
        } catch (storageError) {
          logger.warn('Failed to load calendar tokens from storage:', storageError);
        }
      }

      // Try to load from Firestore
      return await this.loadTokensFromFirestore(userId);
    } catch (error) {
      logger.error('Failed to retrieve stored tokens:', error);
      return null;
    }
  }

  /**
   * Refreshes expired access tokens
   */
  async refreshAccessToken(userId: string): Promise<GoogleCalendarTokens | null> {
    try {
      const tokens = await this.getStoredTokens(userId);
      
      if (!tokens || !tokens.refreshToken) {
        logger.warn('No refresh token available for user', { userId });
        return null;
      }

      // Call Google's token refresh endpoint
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.google.clientId || '',
          client_secret: '',  // Client secret should not be used in browser
          refresh_token: tokens.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      
      const refreshedTokens: GoogleCalendarTokens = {
        ...tokens,
        accessToken: data.access_token,
        expiryDate: Date.now() + (data.expires_in * 1000), // Convert seconds to milliseconds
        refreshToken: data.refresh_token || tokens.refreshToken, // Use new refresh token if provided
        grantedAt: Date.now()
      };

      // Store refreshed tokens
      await this.storeGoogleTokens(userId, refreshedTokens.accessToken, refreshedTokens.refreshToken);

      logger.info('Calendar access token refreshed', { userId });
      return refreshedTokens;

    } catch (error) {
      logger.error('Failed to refresh access token:', error);
      throw createAuthError('token/refresh-failed', 'Failed to refresh calendar access token');
    }
  }

  /**
   * Revokes calendar permissions
   */
  async revokeCalendarPermissions(userId: string): Promise<void> {
    try {
      const tokens = await this.getStoredTokens(userId);
      
      if (tokens) {
        // In a real implementation, this would revoke the token with Google
        // await this.revokeTokenWithGoogle(tokens.accessToken);
        
        // Remove from cache
        this.tokenCache.delete(userId);
        
        // Remove from persistent storage
        if (typeof window !== 'undefined') {
          const storageKey = `${STORAGE_KEYS.CALENDAR_TOKENS}_${userId}`;
          localStorage.removeItem(storageKey);
        }
        
        // Remove from Firestore in a real implementation
        // await this.removeTokensFromFirestore(userId);
        
        logger.info('Calendar permissions revoked', { userId });
      }
    } catch (error) {
      logger.error('Failed to revoke calendar permissions:', error);
      throw createAuthError('auth/revocation-failed', 'Failed to revoke calendar permissions');
    }
  }

  /**
   * Checks if a token is still valid
   */
  private isTokenValid(tokens: GoogleCalendarTokens): boolean {
    if (!tokens.expiryDate) return true; // No expiry date means token doesn't expire
    
    const buffer = 5 * 60 * 1000; // 5 minute buffer
    return tokens.expiryDate > (Date.now() + buffer);
  }

  /**
   * Gets calendar access token for API calls
   */
  async getCalendarAccessToken(userId: string): Promise<string | null> {
    try {
      let tokens = await this.getStoredTokens(userId);
      
      if (!tokens) {
        return null;
      }

      // Check if token needs refresh
      if (!this.isTokenValid(tokens)) {
        tokens = await this.refreshAccessToken(userId);
        if (!tokens) {
          return null;
        }
      }

      return tokens.accessToken;
    } catch (error) {
      logger.error('Failed to get calendar access token:', error);
      return null;
    }
  }

  /**
   * Validates calendar permissions for a specific scope
   */
  hasCalendarScope(tokens: GoogleCalendarTokens, requiredScope: string): boolean {
    return tokens.scope.includes(requiredScope);
  }

  /**
   * Gets the granted calendar scopes for a user
   */
  async getGrantedScopes(userId: string): Promise<string[]> {
    const tokens = await this.getStoredTokens(userId);
    return tokens?.scope || [];
  }

  /**
   * Checks if user has read-only calendar access
   */
  async hasReadOnlyAccess(userId: string): Promise<boolean> {
    const scopes = await this.getGrantedScopes(userId);
    return scopes.includes('https://www.googleapis.com/auth/calendar.readonly');
  }

  /**
   * Checks if user has full calendar access
   */
  async hasFullAccess(userId: string): Promise<boolean> {
    const scopes = await this.getGrantedScopes(userId);
    return scopes.includes('https://www.googleapis.com/auth/calendar') ||
           scopes.includes('https://www.googleapis.com/auth/calendar.events');
  }

  /**
   * Clears token cache for a user
   */
  clearTokenCache(userId?: string): void {
    if (userId) {
      this.tokenCache.delete(userId);
    } else {
      this.tokenCache.clear();
    }
    logger.debug('Calendar token cache cleared', { userId });
  }

  /**
   * Loads calendar tokens from Firestore
   */
  private async loadTokensFromFirestore(userId: string): Promise<GoogleCalendarTokens | null> {
    try {
      // Import Firestore functions dynamically
      const { doc, getDoc, getFirestore } = await import('firebase/firestore');
      
      // Get Firestore instance - we'll need to get this from the main app instance
      const db = getFirestore();
      
      const tokensDoc = doc(db, 'user_calendar_tokens', userId);
      const docSnap = await getDoc(tokensDoc);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        const tokens: GoogleCalendarTokens = {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiryDate: data.expiryDate,
          scope: data.scope || [],
          tokenType: data.tokenType || 'Bearer',
          grantedAt: data.grantedAt || Date.now()
        };
        
        // Cache the tokens
        this.tokenCache.set(userId, tokens);
        
        logger.debug('Calendar tokens loaded from Firestore', { userId });
        return tokens;
      }
      
      logger.debug('No calendar tokens found in Firestore', { userId });
      return null;
    } catch (error) {
      logger.error('Failed to load calendar tokens from Firestore:', error);
      return null;
    }
  }

  /**
   * Saves calendar tokens to Firestore
   */
  private async saveTokensToFirestore(userId: string, tokens: GoogleCalendarTokens): Promise<void> {
    try {
      // Import Firestore functions dynamically
      const { doc, setDoc, serverTimestamp, getFirestore } = await import('firebase/firestore');
      
      // Get Firestore instance - we'll need to get this from the main app instance
      const db = getFirestore();
      
      const tokensDoc = doc(db, 'user_calendar_tokens', userId);
      
      const tokensData = {
        ...tokens,
        updatedAt: serverTimestamp(),
        lastAccessedAt: serverTimestamp()
      };
      
      await setDoc(tokensDoc, tokensData);
      logger.debug('Calendar tokens saved to Firestore', { userId });
    } catch (error) {
      logger.error('Failed to save calendar tokens to Firestore:', error);
      throw error;
    }
  }

  /**
   * Gets debug information about calendar integration
   */
  getDebugInfo(userId: string): Record<string, any> {
    const tokens = this.tokenCache.get(userId);
    
    return {
      hasTokens: !!tokens,
      isValid: tokens ? this.isTokenValid(tokens) : false,
      scopes: tokens?.scope || [],
      expiresAt: tokens?.expiryDate,
      timeUntilExpiry: tokens?.expiryDate ? Math.max(0, tokens.expiryDate - Date.now()) : null,
      hasRefreshToken: !!(tokens?.refreshToken),
      integrationEnabled: this.config.features.enableCalendarIntegration
    };
  }
}