/**
 * Development Subscription Monitor
 * 
 * Shows real-time information about job subscriptions to help debug
 * and monitor the centralized subscription manager.
 */

import React, { useState, useEffect } from 'react';
import { jobSubscriptionManager } from '../../services/JobSubscriptionManager';
import { Monitor, RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalCallbacks: number;
  subscriptionsByJob: Record<string, { 
    callbackCount: number; 
    isActive: boolean; 
    errorCount: number;
  }>;
}

export const SubscriptionMonitor: React.FC = () => {
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Auto-refresh stats every 2 seconds
    const interval = setInterval(() => {
      if (isVisible) {
        const newStats = jobSubscriptionManager.getStats();
        setStats(newStats);
      }
    }, 2000);

    setRefreshInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isVisible]);

  // Don't render in production
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleToggleVisibility = () => {
    if (!isVisible) {
      // Load initial stats when opening
      const initialStats = jobSubscriptionManager.getStats();
      setStats(initialStats);
    }
    setIsVisible(!isVisible);
  };

  const handleForceRefresh = (jobId?: string) => {
    if (jobId) {
      jobSubscriptionManager.forceRefresh(jobId);
    }
    // Refresh stats
    const newStats = jobSubscriptionManager.getStats();
    setStats(newStats);
  };

  const getStatusIcon = (isActive: boolean, errorCount: number) => {
    if (errorCount > 0) {
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    }
    return isActive ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <XCircle className="w-4 h-4 text-gray-500" />;
  };

  const getStatusColor = (isActive: boolean, errorCount: number) => {
    if (errorCount > 0) return 'text-orange-600 bg-orange-50';
    return isActive ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50';
  };

  return (
    <>
      {/* Toggle Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleToggleVisibility}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
          title="Job Subscription Monitor"
        >
          <Monitor className="w-5 h-5" />
        </button>
      </div>

      {/* Monitor Panel */}
      {isVisible && (
        <div className="fixed bottom-20 right-4 w-96 max-h-96 bg-white border border-gray-200 rounded-lg shadow-xl z-40 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Monitor className="w-4 h-4 text-gray-600" />
              <h3 className="font-semibold text-gray-800">Subscription Monitor</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleForceRefresh()}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Refresh Stats"
              >
                <RefreshCw className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Close Monitor"
              >
                <XCircle className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="p-4">
            {stats ? (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <div className="text-lg font-bold text-blue-600">{stats.totalSubscriptions}</div>
                    <div className="text-xs text-blue-600">Total</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="text-lg font-bold text-green-600">{stats.activeSubscriptions}</div>
                    <div className="text-xs text-green-600">Active</div>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded">
                    <div className="text-lg font-bold text-purple-600">{stats.totalCallbacks}</div>
                    <div className="text-xs text-purple-600">Callbacks</div>
                  </div>
                </div>

                {/* Subscription Details */}
                {Object.keys(stats.subscriptionsByJob).length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-700 text-sm">Active Jobs:</h4>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {Object.entries(stats.subscriptionsByJob).map(([jobId, details]) => (
                        <div
                          key={jobId}
                          className={`flex items-center justify-between p-2 rounded text-sm ${getStatusColor(details.isActive, details.errorCount)}`}
                        >
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            {getStatusIcon(details.isActive, details.errorCount)}
                            <span className="font-mono text-xs truncate" title={jobId}>
                              {jobId.slice(-8)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs">
                              {details.callbackCount} callbacks
                            </span>
                            {details.errorCount > 0 && (
                              <span className="text-xs text-orange-600">
                                ({details.errorCount} errors)
                              </span>
                            )}
                            <button
                              onClick={() => handleForceRefresh(jobId)}
                              className="p-1 hover:bg-white/50 rounded"
                              title="Force Refresh"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 text-sm py-4">
                    No active job subscriptions
                  </div>
                )}

                {/* Status Indicators */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center text-xs text-gray-600">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Active</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3 text-orange-500" />
                        <span>Errors</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <XCircle className="w-3 h-3 text-gray-500" />
                        <span>Inactive</span>
                      </div>
                    </div>
                    <div className="text-gray-400">
                      Auto-refreshes every 2s
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-4">
                Loading subscription stats...
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SubscriptionMonitor;