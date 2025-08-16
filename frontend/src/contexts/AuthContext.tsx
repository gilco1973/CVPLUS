import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInAnonymously as firebaseSignInAnonymously, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../lib/firebase';

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
    default:
      return 'An error occurred during authentication. Please try again.';
  }
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInAnonymous: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      // Clear any previous errors when auth state changes successfully
      if (error) {
        setError(null);
      }
    }, (authError) => {
      // Handle auth state change errors gracefully
      console.warn('Auth state change error (this is normal on first load):', authError);
      setLoading(false);
      
      // Only set user-friendly errors for actual problems
      if (authError.code && authError.code !== 'auth/user-not-found') {
        const friendlyMessage = getFriendlyAuthErrorMessage(authError.code);
        setError(friendlyMessage);
      }
    });

    return unsubscribe;
  }, [error]);

  const clearError = () => {
    setError(null);
  };

  const signInAnonymous = async () => {
    try {
      clearError();
      await firebaseSignInAnonymously(auth);
    } catch (error: any) {
      console.error('Error signing in anonymously:', error);
      const friendlyMessage = getFriendlyAuthErrorMessage(error.code);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const signInWithGoogle = async () => {
    try {
      clearError();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      const friendlyMessage = getFriendlyAuthErrorMessage(error.code);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      clearError();
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Error signing in:', error);
      const friendlyMessage = getFriendlyAuthErrorMessage(error.code);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      clearError();
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Error signing up:', error);
      const friendlyMessage = getFriendlyAuthErrorMessage(error.code);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const signOut = async () => {
    try {
      clearError();
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error('Error signing out:', error);
      const friendlyMessage = getFriendlyAuthErrorMessage(error.code);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const value = {
    user,
    loading,
    error,
    signInAnonymous,
    signInWithGoogle,
    signIn,
    signUp,
    signOut,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};