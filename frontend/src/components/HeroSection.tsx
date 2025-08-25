import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  onScrollToUpload?: () => void;
  className?: string;
}

interface FeatureHighlight {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
  delay: number;
}

const features: FeatureHighlight[] = [
  {
    id: 'ai-powered',
    title: 'AI-Powered Analysis',
    description: 'Claude AI intelligently parses and enhances your CV content for maximum impact',
    icon: '🤖',
    gradient: 'from-blue-500 to-blue-600',
    delay: 100
  },
  {
    id: 'interactive-elements',
    title: 'Interactive Elements', 
    description: 'QR codes, timelines, charts, and more to make your CV memorable',
    icon: '✨',
    gradient: 'from-purple-500 to-pink-600',
    delay: 200
  },
  {
    id: 'multiple-formats',
    title: 'Multiple Export Formats',
    description: 'Export to PDF, DOCX, or share online with a single click',
    icon: '📄',
    gradient: 'from-orange-500 to-red-600',
    delay: 300
  },
  {
    id: 'ats-optimization',
    title: 'ATS Optimization',
    description: 'Optimized for Applicant Tracking Systems to pass initial screenings',
    icon: '🎯',
    gradient: 'from-green-500 to-emerald-600',
    delay: 400
  },
  {
    id: 'real-time-processing',
    title: 'Real-time Processing',
    description: 'Watch your CV transform in real-time with instant preview updates',
    icon: '⚡',
    gradient: 'from-yellow-500 to-orange-500',
    delay: 500
  }
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onScrollToUpload,
  className = ''
}) => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [showVideoControls, setShowVideoControls] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [_showFeatures, _setShowFeatures] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          _setShowFeatures(true);
        }
      },
      { threshold: 0.3 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setVideoCurrentTime(video.currentTime);
    const handleDurationChange = () => setVideoDuration(video.duration);
    const handlePlay = () => setIsVideoPlaying(true);
    const handlePause = () => setIsVideoPlaying(false);
    const handleEnded = () => setIsVideoPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isVideoPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleMuteToggle = () => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !videoRef.current.muted;
    setIsVideoMuted(videoRef.current.muted);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleVideoSeek = (newTime: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = newTime;
  };

  const _formatTime = (_time: number) => {
    const minutes = Math.floor(_time / 60);
    const seconds = Math.floor(_time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleGetStartedClick = () => {
    if (onScrollToUpload) {
      onScrollToUpload();
    } else {
      document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section 
      ref={heroRef}
      className={`relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden ${className}`}
      aria-label="Hero section"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-screen filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-screen filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-screen filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="text-center lg:text-left">
            <h1 className="animate-fade-in text-4xl md:text-6xl lg:text-7xl font-bold text-gray-100 mb-6 leading-tight">
              From Paper to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-400">
                Powerful
              </span>
            </h1>
            
            <p className="animate-fade-in text-2xl md:text-3xl font-light text-gray-300 mb-6">
              Your CV, Reinvented
            </p>
            
            <p className="animate-fade-in text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto lg:mx-0">
              Transform your traditional CV into an interactive masterpiece with AI-powered features, stunning templates, and one-click magic
            </p>
            
            <div className="animate-fade-in flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <button 
                onClick={handleGetStartedClick}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 hover-glow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                aria-label="Get started with CV transformation"
              >
                <Sparkles className="inline-block w-5 h-5 mr-2" />
                Get Started Free
              </button>
              
              <button 
                onClick={handlePlayPause}
                className="px-6 py-4 border-2 border-blue-500 text-blue-400 font-semibold rounded-lg hover:bg-blue-500 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                aria-label={isVideoPlaying ? 'Pause demo video' : 'Play demo video'}
              >
                {isVideoPlaying ? (
                  <><Pause className="inline-block w-5 h-5 mr-2" />Pause Demo</>
                ) : (
                  <><Play className="inline-block w-5 h-5 mr-2" />Watch Demo</>
                )}
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="animate-fade-in flex flex-wrap justify-center lg:justify-start gap-8 mb-8">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-blue-400">10,000+</div>
                <div className="text-sm text-gray-400">CVs Transformed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-blue-400">4.9/5</div>
                <div className="text-sm text-gray-400">User Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-blue-400">30 sec</div>
                <div className="text-sm text-gray-400">Average Time</div>
              </div>
            </div>
          </div>

          {/* Right Column - Video Player */}
          <div className="animate-fade-in relative">
            <div 
              className="relative bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-700 group"
              onMouseEnter={() => setShowVideoControls(true)}
              onMouseLeave={() => setShowVideoControls(false)}
            >
              {/* Video Element - Placeholder for now */}
              <div className="relative aspect-video bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted={isVideoMuted}
                  loop
                  playsInline
                  poster="/images/cv-demo-thumbnail.jpg"
                  onLoadedMetadata={() => {
                    // Auto-set duration when video metadata loads
                    if (videoRef.current) {
                      setVideoDuration(videoRef.current.duration);
                    }
                  }}
                >
                  {/* Placeholder - Replace with actual video source */}
                  <source src="/videos/cv-generation-demo.mp4" type="video/mp4" />
                  <source src="/videos/cv-generation-demo.webm" type="video/webm" />
                  Your browser does not support the video tag.
                </video>
                
                {/* Video Placeholder Content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-300">
                    <div className="w-20 h-20 mx-auto mb-4 bg-blue-600/20 rounded-full flex items-center justify-center">
                      <Play className="w-10 h-10 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">CV Generation Process</h3>
                    <p className="text-gray-400">Watch how CVPlus transforms your CV</p>
                  </div>
                </div>

                {/* Video Controls Overlay */}
                <div>
                  {showVideoControls && (
                    <div className="animate-fade-in absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={handlePlayPause}
                          className="bg-white/20 backdrop-blur-sm rounded-full p-4 hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                          aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
                        >
                          {isVideoPlaying ? (
                            <Pause className="w-6 h-6 text-white" />
                          ) : (
                            <Play className="w-6 h-6 text-white" />
                          )}
                        </button>
                        
                        <button
                          onClick={handleMuteToggle}
                          className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                          aria-label={isVideoMuted ? 'Unmute video' : 'Mute video'}
                        >
                          {isVideoMuted ? (
                            <VolumeX className="w-5 h-5 text-white" />
                          ) : (
                            <Volume2 className="w-5 h-5 text-white" />
                          )}
                        </button>
                        
                        <button
                          onClick={handleFullscreen}
                          className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                          aria-label="Enter fullscreen"
                        >
                          <Maximize className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                {videoDuration > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="w-full h-1 bg-white/30 rounded-full">
                      <div 
                        className="h-1 bg-blue-500 rounded-full transition-all duration-100"
                        style={{ width: `${(videoCurrentTime / videoDuration) * 100}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={videoDuration}
                      value={videoCurrentTime}
                      onChange={(e) => handleVideoSeek(Number(e.target.value))}
                      className="absolute inset-0 w-full h-1 opacity-0 cursor-pointer"
                      aria-label="Video progress"
                    />
                  </div>
                )}
              </div>
              
              {/* CVPlus Branding Overlay */}
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
                <span className="text-white text-sm font-medium">CVPlus Demo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features Highlighting Section */}
        <div className="animate-fade-in mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-100 mb-4">
              Powerful Features at Your Fingertips
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Every feature designed to make your CV stand out in today's competitive job market
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.id}
                className="animate-fade-in bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500/50 transition-all duration-300 hover-lift group"
              >
                <div className={`bg-gradient-to-br ${feature.gradient} rounded-lg p-4 w-14 h-14 mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <span className="text-2xl" role="img" aria-label={feature.title}>
                    {feature.icon}
                  </span>
                </div>
                
                <h3 className="font-semibold text-lg mb-2 text-gray-100 group-hover:text-blue-400 transition-colors">
                  {feature.title}
                </h3>
                
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};