import { CheckCircle, XCircle, AlertCircle, TrendingUp } from 'lucide-react';

interface ATSScoreProps {
  score: number;
  passes: boolean;
  issueCount: number;
  issues?: {
    type: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    section?: string;
    fix?: string;
  }[];
  suggestions?: {
    section: string;
    original: string;
    suggested: string;
    reason: string;
    impact: 'high' | 'medium' | 'low';
  }[];
  keywords?: {
    found: string[];
    missing: string[];
    recommended: string[];
  };
}

export const ATSScore = ({ score, passes, issueCount, issues = [], suggestions = [], keywords }: ATSScoreProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'from-green-500/20 to-green-600/20';
    if (score >= 60) return 'from-yellow-500/20 to-yellow-600/20';
    return 'from-red-500/20 to-red-600/20';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Score Display */}
      <div className="bg-gray-800 rounded-xl p-8 text-center">
        <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br ${getScoreBgColor(score)} mb-4`}>
          <span className={`text-5xl font-bold ${getScoreColor(score)}`}>{score}%</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-100 mb-2">ATS Compatibility Score</h3>
        <p className="text-gray-400">
          {passes ? (
            <span className="text-green-400">✓ Your CV passes ATS screening</span>
          ) : (
            <span className="text-red-400">✗ Your CV needs optimization for ATS</span>
          )}
        </p>
      </div>

      {/* Issues Summary */}
      {issues.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-100 mb-4">Issues Found ({issues.length})</h4>
          <div className="space-y-3">
            {issues.slice(0, 5).map((issue, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg">
                {getSeverityIcon(issue.severity)}
                <div className="flex-1">
                  <p className="text-gray-200 text-sm font-medium">{issue.message}</p>
                  {issue.section && (
                    <p className="text-gray-400 text-xs mt-1">Section: {issue.section}</p>
                  )}
                  {issue.fix && (
                    <p className="text-cyan-400 text-xs mt-2">
                      <strong>Fix:</strong> {issue.fix}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {issues.length > 5 && (
              <p className="text-gray-400 text-sm text-center mt-2">
                + {issues.length - 5} more issues
              </p>
            )}
          </div>
        </div>
      )}

      {/* Top Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-500" />
            Top Suggestions
          </h4>
          <div className="space-y-3">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <div key={index} className="p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-300">{suggestion.section}</span>
                  <span className={`text-xs px-2 py-1 rounded-full border ${getImpactColor(suggestion.impact)}`}>
                    {suggestion.impact} impact
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-2">{suggestion.reason}</p>
                <div className="grid gap-2">
                  <div className="p-2 bg-red-900/20 rounded text-xs text-red-300">
                    <strong>Current:</strong> {suggestion.original.substring(0, 100)}...
                  </div>
                  <div className="p-2 bg-green-900/20 rounded text-xs text-green-300">
                    <strong>Suggested:</strong> {suggestion.suggested.substring(0, 100)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keywords Analysis */}
      {keywords && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-100 mb-4">Keyword Analysis</h4>
          <div className="grid md:grid-cols-3 gap-4">
            {keywords.found.length > 0 && (
              <div className="bg-green-900/20 rounded-lg p-4">
                <h5 className="text-sm font-medium text-green-400 mb-2">Found Keywords ✓</h5>
                <div className="flex flex-wrap gap-2">
                  {keywords.found.slice(0, 5).map((keyword, index) => (
                    <span key={index} className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded">
                      {keyword}
                    </span>
                  ))}
                  {keywords.found.length > 5 && (
                    <span className="text-xs text-green-400">+{keywords.found.length - 5} more</span>
                  )}
                </div>
              </div>
            )}
            
            {keywords.missing.length > 0 && (
              <div className="bg-red-900/20 rounded-lg p-4">
                <h5 className="text-sm font-medium text-red-400 mb-2">Missing Keywords ✗</h5>
                <div className="flex flex-wrap gap-2">
                  {keywords.missing.slice(0, 5).map((keyword, index) => (
                    <span key={index} className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded">
                      {keyword}
                    </span>
                  ))}
                  {keywords.missing.length > 5 && (
                    <span className="text-xs text-red-400">+{keywords.missing.length - 5} more</span>
                  )}
                </div>
              </div>
            )}
            
            {keywords.recommended.length > 0 && (
              <div className="bg-blue-900/20 rounded-lg p-4">
                <h5 className="text-sm font-medium text-blue-400 mb-2">Recommended</h5>
                <div className="flex flex-wrap gap-2">
                  {keywords.recommended.slice(0, 5).map((keyword, index) => (
                    <span key={index} className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                      {keyword}
                    </span>
                  ))}
                  {keywords.recommended.length > 5 && (
                    <span className="text-xs text-blue-400">+{keywords.recommended.length - 5} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Apply Optimizations Button */}
      <div className="text-center">
        <button className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all">
          Apply All Optimizations
        </button>
      </div>
    </div>
  );
};