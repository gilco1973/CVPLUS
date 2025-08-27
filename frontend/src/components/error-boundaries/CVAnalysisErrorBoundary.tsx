import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, MessageSquare } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackComponent?: React.ComponentType<ErrorBoundaryFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export interface ErrorBoundaryFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  onRetry: () => void;
  onNavigateHome: () => void;
  onContactSupport: () => void;
}

/**
 * Error Boundary specifically designed for CV Analysis components
 * Provides graceful error handling with recovery options
 */
export class CVAnalysisErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CVAnalysisErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to monitoring service
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // In production, this would send to error monitoring service
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      context: 'CVAnalysisErrorBoundary',
      retryCount: this.state.retryCount
    };

    console.error('Error logged:', errorData);
    
    // Example: Send to monitoring service
    // errorMonitoringService.logError(errorData);
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1
      });
    }
  };

  private handleNavigateHome = () => {
    window.location.href = '/';
  };

  private handleContactSupport = () => {
    // Open support contact method
    window.open('mailto:support@cvplus.com?subject=CV Analysis Error Report', '_blank');
  };

  render() {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { children, fallbackComponent: FallbackComponent } = this.props;

    if (hasError) {
      // Use custom fallback component if provided
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error}
            errorInfo={errorInfo}
            retryCount={retryCount}
            onRetry={this.handleRetry}
            onNavigateHome={this.handleNavigateHome}
            onContactSupport={this.handleContactSupport}
          />
        );
      }

      // Default fallback UI
      return <DefaultErrorFallback 
        error={error}
        errorInfo={errorInfo}
        retryCount={retryCount}
        onRetry={this.handleRetry}
        onNavigateHome={this.handleNavigateHome}
        onContactSupport={this.handleContactSupport}
        maxRetries={this.maxRetries}
      />;
    }

    return children;
  }
}

/**
 * Default Error Fallback Component
 * Provides a user-friendly error display with recovery options
 */
interface DefaultErrorFallbackProps extends ErrorBoundaryFallbackProps {
  maxRetries: number;
}

function DefaultErrorFallback({ 
  error, 
  retryCount, 
  onRetry, 
  onNavigateHome, 
  onContactSupport,
  maxRetries 
}: DefaultErrorFallbackProps) {
  const canRetry = retryCount < maxRetries;
  const errorMessage = error?.message || 'An unexpected error occurred';

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full text-center border border-gray-200 dark:border-gray-700">
        {/* Error Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Error Title */}
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Oops! Something went wrong
        </h3>

        {/* Error Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
          We encountered an issue while processing your CV analysis. 
          {canRetry ? ' You can try again or go back to the homepage.' : ' Please contact support for assistance.'}
        </p>

        {/* Error Details (in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 mb-6 text-left">
            <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
              {errorMessage}
            </p>
            {retryCount > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Retry attempts: {retryCount}/{maxRetries}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Retry Button */}
          {canRetry && (
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again ({maxRetries - retryCount} attempts left)
            </button>
          )}

          {/* Home Button */}
          <button
            onClick={onNavigateHome}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
          >
            <Home className="w-4 h-4" />
            Go to Homepage
          </button>

          {/* Support Button */}
          <button
            onClick={onContactSupport}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <MessageSquare className="w-4 h-4" />
            Contact Support
          </button>
        </div>

        {/* Additional Help Text */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          If this problem persists, please include the error details when contacting support.
        </p>
      </div>
    </div>
  );
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withCVAnalysisErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <CVAnalysisErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </CVAnalysisErrorBoundary>
  );

  WrappedComponent.displayName = `withCVAnalysisErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default CVAnalysisErrorBoundary;