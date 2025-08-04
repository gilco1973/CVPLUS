import { useState } from 'react';
import { Video, Upload, Play, Pause, RefreshCw, Download, Loader2, Sparkles, Settings, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface VideoIntroductionProps {
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  status?: 'not-generated' | 'generating' | 'ready' | 'failed';
  script?: string;
  subtitles?: string;
  onGenerateVideo: (options?: any) => Promise<{ videoUrl: string; thumbnailUrl: string; duration: number; script: string; subtitles?: string }>;
  onRegenerateVideo: (customScript?: string, options?: any) => Promise<{ videoUrl: string; thumbnailUrl: string; duration: number }>;
}

export const VideoIntroduction = ({
  videoUrl,
  thumbnailUrl,
  duration,
  status = 'not-generated',
  script,
  subtitles,
  onGenerateVideo,
  onRegenerateVideo
}: VideoIntroductionProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showScriptEditor, setShowScriptEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customScript, setCustomScript] = useState(script || '');
  const [videoSettings, setVideoSettings] = useState({
    duration: 'medium' as 'short' | 'medium' | 'long',
    style: 'professional' as 'professional' | 'friendly' | 'energetic',
    avatarStyle: 'realistic' as 'realistic' | 'illustrated' | 'corporate',
    background: 'office' as 'office' | 'modern' | 'gradient',
    includeSubtitles: true,
    includeNameCard: true
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await onGenerateVideo(videoSettings);
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
      await onRegenerateVideo(showScriptEditor ? customScript : undefined, videoSettings);
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
          Generate a professional video introduction with AI avatar that brings your CV to life.
        </p>
        <div className="space-y-4 max-w-sm mx-auto">
          <div className="text-left space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <User className="w-4 h-4 text-cyan-500" />
              <span>Realistic AI avatar presentation</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <span>AI-generated script based on your CV</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Video className="w-4 h-4 text-cyan-500" />
              <span>HD quality with subtitles</span>
            </div>
          </div>
          
          {/* Quick Settings */}
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-200">Video Settings</span>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-cyan-500 hover:text-cyan-400 transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            {showSettings && (
              <div className="space-y-3 mt-3 border-t border-gray-600 pt-3">
                <div>
                  <label className="text-xs text-gray-400">Duration</label>
                  <select
                    value={videoSettings.duration}
                    onChange={(e) => setVideoSettings({...videoSettings, duration: e.target.value as any})}
                    className="w-full mt-1 bg-gray-800 text-gray-200 rounded px-3 py-1 text-sm"
                  >
                    <option value="short">30 seconds</option>
                    <option value="medium">60 seconds</option>
                    <option value="long">90 seconds</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Avatar Style</label>
                  <select
                    value={videoSettings.style}
                    onChange={(e) => setVideoSettings({...videoSettings, style: e.target.value as any})}
                    className="w-full mt-1 bg-gray-800 text-gray-200 rounded px-3 py-1 text-sm"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="energetic">Energetic</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={videoSettings.includeSubtitles}
                      onChange={(e) => setVideoSettings({...videoSettings, includeSubtitles: e.target.checked})}
                      className="text-cyan-500"
                    />
                    Include subtitles
                  </label>
                </div>
              </div>
            )}
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
          <div className="relative">
            <User className="w-16 h-16 text-cyan-500 mx-auto mb-4" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-100 mb-2">
            Creating Your AI Avatar Video...
          </h3>
          <p className="text-gray-400 mb-4">
            This takes 2-4 minutes. Your AI avatar is being created with your personalized script.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>✓ Analyzing your CV content</p>
            <p>✓ Generating personalized script</p>
            <p className="text-cyan-400">→ Creating AI avatar...</p>
            <p>• Rendering HD video</p>
            <p>• Adding subtitles</p>
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