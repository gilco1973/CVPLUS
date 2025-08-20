/**
 * ErrorBoundary Component
 * 
 * React Error Boundary for graceful error handling in CV preview.
 * Provides fallback UI when component errors occur.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  title?: string;
  message?: string;
  showRetry?: boolean;
  retryCount?: number;
  className?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryAttempt: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryAttempt: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      retryAttempt: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryAttempt: this.state.retryAttempt + 1
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const {
        title = 'Something went wrong',
        message,
        showRetry = true,
        retryCount = 0,
        className = ''
      } = this.props;

      const displayMessage = message || this.state.error?.message || 'An unexpected error occurred';
      const showRetryButton = showRetry && this.state.retryAttempt < 3;

      return (
        <div className={`bg-white rounded-lg shadow-sm border border-red-200 p-6 ${className}`}>
          <div className="flex items-center justify-center py-8">
            <div className="text-center max-w-md">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-600 mb-6">{displayMessage}</p>
              
              {/* Retry and navigation buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {showRetryButton && (
                  <button
                    onClick={this.handleRetry}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                    {this.state.retryAttempt > 0 && (
                      <span className="text-blue-200">({this.state.retryAttempt}/3)</span>
                    )}
                  </button>
                )}
                
                <button
                  onClick={this.handleGoHome}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              </div>
              
              {/* Additional retry info */}
              {retryCount > 0 && (
                <p className="text-sm text-gray-500 mt-4">
                  Previous retry attempts: {retryCount}
                </p>
              )}
              
              {/* Technical details (development only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 overflow-auto max-h-40">
                    <div className="font-semibold mb-1">Error:</div>
                    <div className="mb-2">{this.state.error.message}</div>
                    
                    {this.state.error.stack && (
                      <>
                        <div className="font-semibold mb-1">Stack:</div>
                        <pre className="whitespace-pre-wrap break-all">
                          {this.state.error.stack}
                        </pre>
                      </>
                    )}
                    
                    {this.state.errorInfo?.componentStack && (
                      <>
                        <div className="font-semibold mb-1 mt-2">Component Stack:</div>
                        <pre className="whitespace-pre-wrap break-all">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional component version for simple error display
interface FunctionalErrorBoundaryProps {
  error: Error | null;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

export const FunctionalErrorBoundary: React.FC<FunctionalErrorBoundaryProps> = ({
  error,
  onRetry,
  title = 'Error',
  className = ''
}) => {
  if (!error) return null;

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 text-red-800">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-red-700 mt-1">{error.message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex-shrink-0 p-1 text-red-600 hover:text-red-700 transition-colors"
            title="Retry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorBoundary;