import React from 'react';

/**
 * Loading Skeleton component for CV Analysis
 * Provides animated loading placeholders while data is being fetched
 * Part of Phase 4 modularization - extracted loading UI
 */
export function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* ATS Score Skeleton */}
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-600 rounded-lg"></div>
          <div>
            <div className="h-5 bg-gray-600 rounded w-48 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-64"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="h-4 bg-gray-700 rounded w-24"></div>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gray-600 rounded-full"></div>
              <div>
                <div className="h-4 bg-gray-600 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-32"></div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="h-4 bg-gray-700 rounded w-36"></div>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gray-600 rounded-full"></div>
              <div>
                <div className="h-4 bg-gray-600 rounded w-20 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-28"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Skeleton */}
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-6 bg-gray-600 rounded w-64 mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-96"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 bg-gray-600 rounded w-32"></div>
              <div className="h-8 bg-gray-700 rounded w-24"></div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="divide-y divide-gray-700">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              {/* Category Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  <div className="h-4 bg-gray-600 rounded w-32"></div>
                  <div className="h-3 bg-gray-700 rounded w-24"></div>
                </div>
                <div className="w-4 h-4 bg-gray-600 rounded"></div>
              </div>

              {/* Recommendations */}
              <div className="px-4 pb-4 space-y-3">
                {[1, 2].map((j) => (
                  <div key={j} className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-gray-600 rounded-full mt-0.5"></div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-4 bg-gray-600 rounded w-48"></div>
                          <div className="h-5 bg-gray-700 rounded w-12"></div>
                          <div className="h-5 bg-gray-700 rounded w-16"></div>
                        </div>
                        <div className="h-3 bg-gray-700 rounded w-full"></div>
                        <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-700 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons Skeleton */}
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700 space-y-4">
        <div>
          <div className="h-5 bg-gray-600 rounded w-36 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-64"></div>
        </div>
        
        <div className="p-3 bg-gray-700/30 rounded-lg">
          <div className="h-4 bg-gray-600 rounded w-48"></div>
        </div>
        
        <div className="space-y-3">
          <div className="h-16 bg-gray-600 rounded-lg"></div>
          <div className="h-12 bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

export default LoadingSkeleton;