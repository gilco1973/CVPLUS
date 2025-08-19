import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/errorHandling';

interface SignInDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SignInDialog: React.FC<SignInDialogProps> = ({ isOpen, onClose, onSuccess }) => {
  const { signInWithGoogle, signInAnonymous, error, clearError } = useAuth();

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast.success('Signed in successfully!');
      onSuccess();
    } catch (error: unknown) {
      // Error is already handled by AuthContext, just show the user-friendly message
      const errorMessage = getErrorMessage(error) || 'Failed to sign in. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleAnonymousSignIn = async () => {
    try {
      await signInAnonymous();
      toast.success('Signed in anonymously!');
      onSuccess();
    } catch (error: unknown) {
      // Error is already handled by AuthContext, just show the user-friendly message
      const errorMessage = getErrorMessage(error) || 'Failed to sign in anonymously. Please try again.';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-100">Sign in to Continue</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <p className="text-gray-300 mb-6">
          To upload and process your CV, please sign in with your Google account or continue anonymously.
        </p>

        {/* Display auth errors */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <p className="text-red-200 text-sm">{error}</p>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-200 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleGoogleSignIn}
            className="w-full bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-lg px-4 py-3 flex items-center justify-center gap-3 transition text-white"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">or</span>
            </div>
          </div>

          <button
            onClick={handleAnonymousSignIn}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 flex items-center justify-center gap-3 hover:bg-gray-600 transition text-gray-100"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
            </svg>
            Continue Anonymously
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};