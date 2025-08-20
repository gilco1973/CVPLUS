/**
 * Contact Form Status Component
 * Success and error status messages for the contact form
 */
import React from 'react';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { ContactFormStatusProps } from './types';

export const ContactFormStatus: React.FC<ContactFormStatusProps> = ({
  status,
  errorMessage,
  retryCount,
  maxRetries,
  contactName,
  onRetry
}) => {
  if (status === 'success') {
    return (
      <div 
        className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
          <CheckCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">
              Message sent successfully!
            </p>
            <p className="text-sm mt-1">
              {contactName} will get back to you soon.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div 
        className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 text-red-700 dark:text-red-400 flex-1">
            <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-medium">
                Message delivery failed
              </p>
              <p className="text-sm mt-1">
                {errorMessage}
              </p>
              {retryCount > 0 && (
                <p className="text-xs mt-2 opacity-75">
                  Attempt {retryCount} of {maxRetries}
                </p>
              )}
            </div>
          </div>
          
          {retryCount < maxRetries && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 text-red-700 dark:text-red-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
              aria-label="Retry sending message"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
        
        {retryCount >= maxRetries && (
          <div className="mt-4 pt-3 border-t border-red-200 dark:border-red-700">
            <p className="text-sm text-red-600 dark:text-red-400">
              <strong>Multiple attempts failed.</strong> Please check your internet connection and try again later. 
              If the issue persists, you can contact {contactName} directly or refresh the page.
            </p>
            <div className="mt-2 text-xs text-red-500 dark:text-red-400">
              Error details: {errorMessage}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};