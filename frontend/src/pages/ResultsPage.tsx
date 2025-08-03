import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Play, FileText, Home, Sparkles } from 'lucide-react';
import { getJob } from '../services/cvService';
import type { Job } from '../services/cvService';
import { PIIWarning } from '../components/PIIWarning';

export const ResultsPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    const loadJob = async () => {
      if (!jobId) return;
      
      try {
        const jobData = await getJob(jobId);
        setJob(jobData);
      } catch (error) {
        console.error('Error loading job:', error);
      } finally {
        setLoading(false);
      }
    };

    loadJob();
  }, [jobId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!job || job.status !== 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">CV Not Found</h2>
          <p className="text-gray-600 mb-6">The CV you're looking for doesn't exist or isn't ready yet.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>
            <h1 className="text-xl font-semibold">Your Enhanced CV is Ready!</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* PII Warning */}
        {job.piiDetection && (
          <PIIWarning
            hasPII={job.piiDetection.hasPII}
            detectedTypes={job.piiDetection.detectedTypes}
            recommendations={job.piiDetection.recommendations}
            onTogglePrivacyMode={() => setPrivacyMode(!privacyMode)}
            privacyModeEnabled={privacyMode}
          />
        )}

        {/* Quick Create Success Banner */}
        {job.quickCreate && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <div>
                <h4 className="font-semibold text-purple-900">
                  Quick Create Mode Activated!
                </h4>
                <p className="text-sm text-purple-700">
                  All enhancements have been automatically applied and your CV is being generated in all available formats.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* CV Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">CV Preview</h2>
              </div>
              <div className="p-8">
                {/* Placeholder for CV preview */}
                <div className="aspect-[8.5/11] bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">CV Preview Coming Soon</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Download Options */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Download Your CV</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition">
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    PDF Format
                  </span>
                  <Download className="w-4 h-4" />
                </button>
                <button className="w-full flex items-center justify-between px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition">
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    DOCX Format
                  </span>
                  <Download className="w-4 h-4" />
                </button>
                <button className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition">
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    HTML Format
                  </span>
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Podcast Player */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">AI Career Podcast</h3>
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-600">Duration: 3:45</span>
                  <button className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition">
                    <Play className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-full bg-gray-300 rounded-full h-1">
                  <div className="bg-blue-600 h-1 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>
              <button className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium">
                View Transcript →
              </button>
            </div>

            {/* Share Options */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Share Your CV</h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                  Copy Shareable Link
                </button>
                <button className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                  Generate QR Code
                </button>
              </div>
            </div>

            {/* Create Another */}
            <button
              onClick={() => navigate('/')}
              className="w-full px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
            >
              Create Another CV
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};