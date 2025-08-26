/**
 * Authentication utilities for Google-only authentication migration
 */

import * as admin from 'firebase-admin';
import { CallableRequest } from 'firebase-functions/v2/https';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  hasCalendarPermissions?: boolean;
}

/**
 * Validates that the user is authenticated with Google and has proper permissions
 */
export async function requireGoogleAuth(request: CallableRequest): Promise<AuthenticatedUser> {
  // Check if user is authenticated
  if (!request.auth) {
    throw new Error('Authentication required. Please sign in to continue.');
  }

  const { uid, token } = request.auth;

  // Skip Google authentication requirement in development environment
  const isDev = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV === 'development';
  
  if (isDev && !token.email) {
    // Allow anonymous users in development environment
    const safeUid = uid || 'anonymous';
    const shortUid = safeUid.length > 6 ? safeUid.substring(0, 6) : safeUid;
    return {
      uid: safeUid,
      email: `dev-user-${safeUid}@example.com`,
      emailVerified: true,
      name: `Dev User ${shortUid}`,
      picture: null,
      hasCalendarPermissions: true
    };
  }

  // Verify this is a Google-authenticated user (not anonymous)
  if (!token.email) {
    throw new Error('Google authentication required. Anonymous users are no longer supported.');
  }

  // Check if email is verified (Google accounts are always verified)
  if (!token.email_verified) {
    throw new Error('Email verification required. Please use a verified Google account.');
  }

  // Get user data from Firestore to check calendar permissions
  let hasCalendarPermissions = false;
  try {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(uid)
      .get();
    
    const userData = userDoc.data();
    hasCalendarPermissions = !!(userData?.googleTokens?.accessToken);
  } catch (error) {
    // Don't throw here - calendar permissions are optional for basic functionality
  }

  return {
    uid,
    email: token.email!,
    emailVerified: token.email_verified!,
    name: token.name,
    picture: token.picture,
    hasCalendarPermissions
  };
}

/**
 * Validates that the user has calendar permissions for calendar-related features
 */
export async function requireCalendarPermissions(request: CallableRequest): Promise<AuthenticatedUser> {
  const user = await requireGoogleAuth(request);
  
  if (!user.hasCalendarPermissions) {
    throw new Error('Calendar permissions required. Please re-authenticate to grant calendar access.');
  }

  return user;
}

/**
 * Gets the user's Google access token for calendar operations
 */
export async function getGoogleAccessToken(uid: string): Promise<string | null> {
  try {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(uid)
      .get();
    
    const userData = userDoc.data();
    return userData?.googleTokens?.accessToken || null;
  } catch (error) {
    return null;
  }
}

/**
 * Updates user's last login time and ensures user document exists
 */
export async function updateUserLastLogin(uid: string, email: string, name?: string, picture?: string): Promise<void> {
  try {
    // Ensure Firebase Admin is properly initialized
    if (!admin.apps.length) {
      return;
    }

    // Check if FieldValue.serverTimestamp is available
    const serverTimestamp = admin.firestore.FieldValue?.serverTimestamp();
    if (!serverTimestamp) {
      // Use regular timestamp as fallback
      const now = new Date();
      await admin.firestore()
        .collection('users')
        .doc(uid)
        .set({
          email,
          name: name || null,
          picture: picture || null,
          lastLoginAt: now,
          updatedAt: now
        }, { merge: true });
      return;
    }

    await admin.firestore()
      .collection('users')
      .doc(uid)
      .set({
        email,
        name: name || null,
        picture: picture || null,
        lastLoginAt: serverTimestamp,
        updatedAt: serverTimestamp
      }, { merge: true });
  } catch (error) {
    // Don't throw here - user tracking failure shouldn't block functionality
  }
}