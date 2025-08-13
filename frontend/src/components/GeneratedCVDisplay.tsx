import React from 'react';
import { Download, FileText, Globe } from 'lucide-react';
import type { Job } from '../services/cvService';

interface GeneratedCVDisplayProps {
  job: Job;
  onDownloadPDF?: () => void;
  onDownloadDOCX?: () => void;
  className?: string;
}

export const GeneratedCVDisplay: React.FC<GeneratedCVDisplayProps> = ({
  job,
  onDownloadPDF,
  onDownloadDOCX,
  className = ''
}) => {
  // Display the actual generated CV HTML content
  const generatedHTML = job.generatedCV?.html;
  
  if (!generatedHTML) {
    return (
      <div className={`bg-gray-800 rounded-lg p-8 text-center ${className}`}>
        <div className="text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Generated CV Found</h3>
          <p className="text-sm">The CV generation may still be in progress.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* CV Actions Bar */}
      <div className="bg-gray-800 rounded-t-lg border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          <span className="text-sm font-medium text-gray-200">Generated CV</span>
          {job.generatedCV?.template && (
            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
              {job.generatedCV.template.charAt(0).toUpperCase() + job.generatedCV.template.slice(1)}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Download Actions */}
          {onDownloadPDF && (
            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-2 px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-all text-sm"
              title="Download PDF"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
          )}
          {onDownloadDOCX && (
            <button
              onClick={onDownloadDOCX}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-all text-sm"
              title="Download DOCX"
            >
              <Download className="w-4 h-4" />
              DOCX
            </button>
          )}
          {job.generatedCV?.htmlUrl && (
            <a
              href={job.generatedCV.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600/30 transition-all text-sm"
              title="View Public Profile"
            >
              <Globe className="w-4 h-4" />
              Public
            </a>
          )}
        </div>
      </div>

      {/* Generated CV Content */}
      <div className="bg-white rounded-b-lg shadow-xl overflow-hidden">
        <div 
          className="generated-cv-content p-8"
          style={{ 
            minHeight: '800px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
          dangerouslySetInnerHTML={{ __html: generatedHTML }}
        />
      </div>

      {/* Features Applied Banner */}
      {job.generatedCV?.features && job.generatedCV.features.length > 0 && (
        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <h4 className="text-sm font-semibold text-gray-200 mb-2">Applied Features:</h4>
          <div className="flex flex-wrap gap-2">
            {job.generatedCV.features.map((feature) => (
              <span
                key={feature}
                className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full"
              >
                {feature.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};