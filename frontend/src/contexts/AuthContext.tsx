import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { isFirebaseError, getErrorMessage, logError } from '../utils/errorHandling';

// Helper function to store Google OAuth tokens for calendar integration
const storeGoogleTokens = async (uid: string, accessToken: string) => {
  try {
    await setDoc(doc(db, 'users', uid), {
      googleTokens: {
        accessToken,
        grantedAt: serverTimestamp(),
        scopes: ['calendar', 'calendar.events']
      },
      lastLoginAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    logError('storeGoogleTokens', error);
    // Don't throw here - token storage failure shouldn't block authentication
  }
};

// Helper function to convert Firebase auth error codes to user-friendly messages
const getFriendlyAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Pop-up was blocked. Please allow pop-ups and try again.';
    case 'auth/unknown-error':
      return 'An unknown authentication error occurred. Please try again.';
    default:
      return 'An error occurred during authentication. Please try again.';
  }
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  hasCalendarPermissions: boolean;
  requestCalendarPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCalendarPermissions, setHasCalendarPermissions] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Check calendar permissions for authenticated users
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          const hasTokens = userData?.googleTokens?.accessToken;
          setHasCalendarPermissions(!!hasTokens);
        } catch (error) {
          logError('checkCalendarPermissions', error);
          setHasCalendarPermissions(false);
        }
      } else {
        setHasCalendarPermissions(false);
      }
      
      setLoading(false);
      // Clear any previous errors when auth state changes successfully
      if (error) {
        setError(null);
      }
    }, (authError: unknown) => {
      // Handle auth state change errors gracefully
      logError('onAuthStateChanged', authError);
      setLoading(false);
      
      // Only set user-friendly errors for actual problems
      if (isFirebaseError(authError) && authError.code !== 'auth/user-not-found') {
        const friendlyMessage = getFriendlyAuthErrorMessage(authError.code);
        setError(friendlyMessage);
      }
    });

    return unsubscribe;
  }, [error]);

  const clearError = () => {
    setError(null);
  };


  const signInWithGoogle = async () => {
    try {
      clearError();
      const provider = new GoogleAuthProvider();
      
      // Add calendar scopes for unified authentication
      provider.addScope('https://www.googleapis.com/auth/calendar');
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      
      // Configure OAuth parameters
      provider.setCustomParameters({
        'prompt': 'consent', // Force consent screen for calendar permissions
        'access_type': 'offline' // Enable refresh tokens
      });
      
      const result = await signInWithPopup(auth, provider);
      
      // Check if calendar permissions were granted
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        // Store the access token for calendar integration
        await storeGoogleTokens(result.user.uid, credential.accessToken);
        setHasCalendarPermissions(true);
      }
    } catch (error: unknown) {
      logError('signInWithGoogle', error);
      const errorCode = isFirebaseError(error) ? error.code : 'auth/unknown-error';
      const friendlyMessage = getFriendlyAuthErrorMessage(errorCode);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      clearError();
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: unknown) {
      logError('signIn', error);
      const errorCode = isFirebaseError(error) ? error.code : 'auth/unknown-error';
      const friendlyMessage = getFriendlyAuthErrorMessage(errorCode);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      clearError();
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: unknown) {
      logError('signUp', error);
      const errorCode = isFirebaseError(error) ? error.code : 'auth/unknown-error';
      const friendlyMessage = getFriendlyAuthErrorMessage(errorCode);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const signOut = async () => {
    try {
      clearError();
      await firebaseSignOut(auth);
    } catch (error: unknown) {
      logError('signOut', error);
      const errorCode = isFirebaseError(error) ? error.code : 'auth/unknown-error';
      const friendlyMessage = getFriendlyAuthErrorMessage(errorCode);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  // Request calendar permissions separately if not granted during initial auth
  const requestCalendarPermissions = async () => {
    if (!user) {
      throw new Error('User must be authenticated first');
    }
    
    try {
      clearError();
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar');
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.setCustomParameters({
        'prompt': 'consent',
        'access_type': 'offline'
      });
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (credential?.accessToken) {
        await storeGoogleTokens(user.uid, credential.accessToken);
        setHasCalendarPermissions(true);
      }
    } catch (error: unknown) {
      logError('requestCalendarPermissions', error);
      const errorCode = isFirebaseError(error) ? error.code : 'auth/unknown-error';
      const friendlyMessage = getFriendlyAuthErrorMessage(errorCode);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const value = {
    user,
    loading,
    error,
    signInWithGoogle,
    signIn,
    signUp,
    signOut,
    clearError,
    hasCalendarPermissions,
    requestCalendarPermissions
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};