import React from 'react';
import { AlertTriangle, Shield, Eye } from 'lucide-react';
import { cn } from '../lib/utils';

interface PIIWarningProps {
  hasPII: boolean;
  detectedTypes: string[];
  recommendations: string[];
  onTogglePrivacyMode?: () => void;
  privacyModeEnabled?: boolean;
}

export const PIIWarning: React.FC<PIIWarningProps> = ({
  hasPII,
  detectedTypes,
  recommendations,
  onTogglePrivacyMode,
  privacyModeEnabled = false
}) => {
  if (!hasPII || detectedTypes.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-amber-900 mb-1">
            Sensitive Information Detected
          </h4>
          <p className="text-sm text-amber-800 mb-3">
            We've detected the following sensitive information in your CV:
          </p>
          
          <div className="mb-3">
            <div className="flex flex-wrap gap-2">
              {detectedTypes.map((type, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>

          {recommendations.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-amber-900 mb-1">
                Privacy Recommendations:
              </p>
              <ul className="list-disc list-inside text-sm text-amber-800 space-y-1">
                {recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {onTogglePrivacyMode && (
            <button
              onClick={onTogglePrivacyMode}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                privacyModeEnabled
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-amber-600 text-white hover:bg-amber-700"
              )}
            >
              {privacyModeEnabled ? (
                <>
                  <Eye className="w-4 h-4" />
                  Show Original Version
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Enable Privacy Mode
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};