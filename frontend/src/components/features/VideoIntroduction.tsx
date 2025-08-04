import { useState } from 'react';
import { Video, Upload, Play, Pause, RefreshCw, Download, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface VideoIntroductionProps {
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  status?: 'not-generated' | 'generating' | 'ready' | 'failed';
  script?: string;
  onGenerateVideo: () => Promise<{ videoUrl: string; thumbnailUrl: string; duration: number; script: string }>;
  onRegenerateVideo: (customScript?: string) => Promise<{ videoUrl: string; thumbnailUrl: string; duration: number }>;
}

export const VideoIntroduction = ({
  videoUrl,
  thumbnailUrl,
  duration,
  status = 'not-generated',
  script,
  onGenerateVideo,
  onRegenerateVideo
}: VideoIntroductionProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showScriptEditor, setShowScriptEditor] = useState(false);
  const [customScript, setCustomScript] = useState(script || '');

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await onGenerateVideo();
      setCustomScript(result.script);
      toast.success('Video introduction generated successfully!');
    } catch (error) {
      toast.error('Failed to generate video introduction');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      await onRegenerateVideo(showScriptEditor ? customScript : undefined);
      toast.success('Video regenerated successfully!');
      setShowScriptEditor(false);
    } catch (error) {
      toast.error('Failed to regenerate video');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'not-generated') {
    return (
      <div className="bg-gray-800 rounded-xl p-8 text-center">
        <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-100 mb-2">
          Create Your Video Introduction
        </h3>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Generate a professional 60-second video introduction that brings your CV to life with AI-powered narration.
        </p>
        <div className="space-y-4 max-w-sm mx-auto">
          <div className="text-left space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <span>AI-generated script based on your CV</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <span>Professional voice narration</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <span>Dynamic visual presentation</span>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="inline w-5 h-5 mr-2 animate-spin" />
                Generating Video...
              </>
            ) : (
              'Generate Video Introduction'
            )}
          </button>
        </div>
      </div>
    );
  }

  if (status === 'generating') {
    return (
      <div className="bg-gray-800 rounded-xl p-8 text-center">
        <div className="max-w-md mx-auto">
          <Loader2 className="w-16 h-16 text-cyan-500 animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-100 mb-2">
            Creating Your Video...
          </h3>
          <p className="text-gray-400 mb-4">
            This may take a few minutes. We're generating your personalized video introduction.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>✓ Analyzing your CV content</p>
            <p className="text-cyan-400">→ Generating video script...</p>
            <p>• Creating visual presentation</p>
            <p>• Adding voice narration</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Video Player */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="aspect-video bg-gray-900 relative group">
          {videoUrl ? (
            <>
              <video
                src={videoUrl}
                poster={thumbnailUrl}
                className="w-full h-full object-cover"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                controls
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center pointer-events-auto">
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white ml-1" />
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="w-24 h-24 text-gray-700" />
            </div>
          )}
        </div>
        
        {/* Video Info */}
        <div className="p-4 bg-gray-800 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-100">Professional Introduction</h4>
              <p className="text-sm text-gray-400">
                Duration: {duration ? formatDuration(duration) : '0:00'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowScriptEditor(!showScriptEditor)}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                title="Edit Script"
              >
                <Upload className="w-5 h-5 text-gray-300" />
              </button>
              <button
                onClick={handleRegenerate}
                disabled={loading}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                title="Regenerate Video"
              >
                <RefreshCw className="w-5 h-5 text-gray-300" />
              </button>
              {videoUrl && (
                <a
                  href={videoUrl}
                  download="cv-introduction.mp4"
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  title="Download Video"
                >
                  <Download className="w-5 h-5 text-gray-300" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Script Editor */}
      {showScriptEditor && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-100 mb-4">Video Script</h4>
          <textarea
            value={customScript}
            onChange={(e) => setCustomScript(e.target.value)}
            className="w-full h-32 bg-gray-700 text-gray-200 rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Edit the script for your video introduction..."
          />
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => {
                setCustomScript(script || '');
                setShowScriptEditor(false);
              }}
              className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRegenerate}
              disabled={loading}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Regenerating...' : 'Regenerate with Script'}
            </button>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="w-12 h-12 bg-cyan-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
            <Sparkles className="w-6 h-6 text-cyan-400" />
          </div>
          <h5 className="font-medium text-gray-200 mb-1">AI Script</h5>
          <p className="text-sm text-gray-400">
            Professionally written introduction
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="w-12 h-12 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
            <Video className="w-6 h-6 text-purple-400" />
          </div>
          <h5 className="font-medium text-gray-200 mb-1">HD Quality</h5>
          <p className="text-sm text-gray-400">
            1080p professional video
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="w-12 h-12 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
            <Play className="w-6 h-6 text-green-400" />
          </div>
          <h5 className="font-medium text-gray-200 mb-1">60 Seconds</h5>
          <p className="text-sm text-gray-400">
            Perfect length for engagement
          </p>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 rounded-lg p-6 border border-cyan-700/30">
        <h4 className="font-semibold text-gray-100 mb-3">Tips for Your Video Introduction</h4>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-0.5">•</span>
            <span>Share your video on LinkedIn to increase profile views by up to 5x</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-0.5">•</span>
            <span>Include the video link in your email applications for better engagement</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400 mt-0.5">•</span>
            <span>Use the custom script editor to personalize your message for specific roles</span>
          </li>
        </ul>
      </div>
    </div>
  );
};