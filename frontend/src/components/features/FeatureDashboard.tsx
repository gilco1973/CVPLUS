import { useState } from 'react';
import { 
  Brain, MessageSquare, BarChart3, Video, Mic, 
  FileSearch, Users, ChevronRight, Loader2, CheckCircle, 
  AlertCircle, Clock, Sparkles, Calendar, Grid3x3, Languages, Quote
} from 'lucide-react';
import { ATSScore } from './ATSScore';
import { PersonalityInsights } from './PersonalityInsights';
import { SkillsVisualization } from './SkillsVisualization';
import { PublicProfile } from './PublicProfile';
import { ChatInterface } from './ChatInterface';
import { VideoIntroduction } from './VideoIntroduction';
import { PodcastGeneration } from './PodcastGeneration';
import { InteractiveTimeline } from './InteractiveTimeline';
import { CalendarIntegration } from './CalendarIntegration';
import { PortfolioGallery } from './PortfolioGallery';
import { LanguageProficiency } from './LanguageProficiency';
import { TestimonialsCarousel } from './TestimonialsCarousel';
import type { Job } from '../../services/cvService';
import * as cvService from '../../services/cvService';
import toast from 'react-hot-toast';

interface FeatureDashboardProps {
  job: Job;
  onJobUpdate?: (job: Job) => void;
}

type FeatureTab = 'ats' | 'personality' | 'skills' | 'public' | 'chat' | 'media' | 'timeline' | 'calendar' | 'portfolio' | 'languages' | 'testimonials';

interface FeatureStatus {
  enabled: boolean;
  status: 'not-started' | 'processing' | 'completed' | 'failed';
  data?: any;
}

export const FeatureDashboard = ({ job }: FeatureDashboardProps) => {
  const [activeTab, setActiveTab] = useState<FeatureTab>('ats');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [featureData, setFeatureData] = useState<Record<string, any>>({});

  const features = [
    {
      id: 'ats' as FeatureTab,
      name: 'ATS Optimization',
      icon: <FileSearch className="w-5 h-5" />,
      color: 'from-blue-500 to-cyan-500',
      description: 'Optimize your CV for applicant tracking systems'
    },
    {
      id: 'personality' as FeatureTab,
      name: 'Personality Insights',
      icon: <Brain className="w-5 h-5" />,
      color: 'from-purple-500 to-pink-500',
      description: 'AI-powered personality analysis'
    },
    {
      id: 'skills' as FeatureTab,
      name: 'Skills Analysis',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'from-green-500 to-emerald-500',
      description: 'Visual skills breakdown and insights'
    },
    {
      id: 'public' as FeatureTab,
      name: 'Public Profile',
      icon: <Users className="w-5 h-5" />,
      color: 'from-cyan-500 to-blue-500',
      description: 'Share your CV with a public link'
    },
    {
      id: 'chat' as FeatureTab,
      name: 'AI Chat Assistant',
      icon: <MessageSquare className="w-5 h-5" />,
      color: 'from-indigo-500 to-purple-500',
      description: 'Let AI answer questions about your CV'
    },
    {
      id: 'media' as FeatureTab,
      name: 'Media Generation',
      icon: <Video className="w-5 h-5" />,
      color: 'from-red-500 to-orange-500',
      description: 'Create video intros and podcasts'
    },
    {
      id: 'timeline' as FeatureTab,
      name: 'Career Timeline',
      icon: <Clock className="w-5 h-5" />,
      color: 'from-yellow-500 to-amber-500',
      description: 'Interactive visual career journey'
    },
    {
      id: 'calendar' as FeatureTab,
      name: 'Calendar Sync',
      icon: <Calendar className="w-5 h-5" />,
      color: 'from-teal-500 to-green-500',
      description: 'Sync milestones to your calendar'
    },
    {
      id: 'portfolio' as FeatureTab,
      name: 'Portfolio Gallery',
      icon: <Grid3x3 className="w-5 h-5" />,
      color: 'from-pink-500 to-rose-500',
      description: 'Visual showcase of your work'
    },
    {
      id: 'languages' as FeatureTab,
      name: 'Language Skills',
      icon: <Languages className="w-5 h-5" />,
      color: 'from-emerald-500 to-teal-500',
      description: 'Visualize language proficiencies'
    },
    {
      id: 'testimonials' as FeatureTab,
      name: 'Testimonials',
      icon: <Quote className="w-5 h-5" />,
      color: 'from-rose-500 to-pink-500',
      description: 'Professional recommendations'
    }
  ];

  const getFeatureStatus = (featureId: string): FeatureStatus => {
    // Check job data for feature status
    const enhancedFeatures = (job as any).enhancedFeatures || {};
    const feature = enhancedFeatures[featureId];
    
    if (!feature) {
      return { enabled: false, status: 'not-started' };
    }
    
    return {
      enabled: feature.enabled || false,
      status: feature.status || 'not-started',
      data: feature.data
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  // Feature-specific handlers
  const handleATSAnalysis = async () => {
    setLoading({ ...loading, ats: true });
    try {
      const result = await cvService.analyzeATSCompatibility(job.id) as any;
      setFeatureData({ ...featureData, ats: result });
      toast.success('ATS analysis completed!');
    } catch (error) {
      toast.error('Failed to analyze ATS compatibility');
    } finally {
      setLoading({ ...loading, ats: false });
    }
  };

  const handlePersonalityAnalysis = async () => {
    setLoading({ ...loading, personality: true });
    try {
      const result = await cvService.generatePersonalityInsights(job.id) as any;
      setFeatureData({ ...featureData, personality: result.insights });
      toast.success('Personality analysis completed!');
    } catch (error) {
      toast.error('Failed to generate personality insights');
    } finally {
      setLoading({ ...loading, personality: false });
    }
  };

  const handleSkillsVisualization = async () => {
    setLoading({ ...loading, skills: true });
    try {
      const result = await cvService.generateSkillsVisualization(job.id) as any;
      setFeatureData({ ...featureData, skills: result.visualization });
      toast.success('Skills visualization generated!');
    } catch (error) {
      toast.error('Failed to generate skills visualization');
    } finally {
      setLoading({ ...loading, skills: false });
    }
  };

  const handleCreatePublicProfile = async () => {
    setLoading({ ...loading, public: true });
    try {
      const result = await cvService.createPublicProfile(job.id) as any;
      setFeatureData({ ...featureData, public: result.profile });
      toast.success('Public profile created!');
    } catch (error) {
      toast.error('Failed to create public profile');
    } finally {
      setLoading({ ...loading, public: false });
    }
  };

  const handleInitializeChat = async () => {
    setLoading({ ...loading, chat: true });
    try {
      await cvService.initializeRAG(job.id);
      setFeatureData({ ...featureData, chat: { initialized: true } });
      toast.success('Chat assistant initialized!');
    } catch (error) {
      toast.error('Failed to initialize chat');
    } finally {
      setLoading({ ...loading, chat: false });
    }
  };

  const handleGenerateTimeline = async () => {
    setLoading({ ...loading, timeline: true });
    try {
      const result = await cvService.generateTimeline(job.id) as any;
      setFeatureData({ ...featureData, timeline: result.timeline });
      toast.success('Timeline generated successfully!');
    } catch (error) {
      toast.error('Failed to generate timeline');
    } finally {
      setLoading({ ...loading, timeline: false });
    }
  };

  const handleGenerateCalendarEvents = async () => {
    setLoading({ ...loading, calendar: true });
    try {
      const result = await cvService.generateCalendarEvents(job.id) as any;
      setFeatureData({ ...featureData, calendar: result });
      toast.success('Calendar events generated successfully!');
    } catch (error) {
      toast.error('Failed to generate calendar events');
    } finally {
      setLoading({ ...loading, calendar: false });
    }
  };

  const handleGeneratePortfolio = async () => {
    setLoading({ ...loading, portfolio: true });
    try {
      const result = await cvService.generatePortfolioGallery(job.id) as any;
      setFeatureData({ ...featureData, portfolio: result.gallery });
      toast.success('Portfolio gallery generated successfully!');
    } catch (error) {
      toast.error('Failed to generate portfolio gallery');
    } finally {
      setLoading({ ...loading, portfolio: false });
    }
  };

  const handleGenerateLanguages = async () => {
    setLoading({ ...loading, languages: true });
    try {
      const result = await cvService.generateLanguageVisualization(job.id) as any;
      setFeatureData({ ...featureData, languages: result.visualization });
      toast.success('Language visualization generated successfully!');
    } catch (error) {
      toast.error('Failed to generate language visualization');
    } finally {
      setLoading({ ...loading, languages: false });
    }
  };

  const handleGenerateTestimonials = async () => {
    setLoading({ ...loading, testimonials: true });
    try {
      const result = await cvService.generateTestimonialsCarousel(job.id) as any;
      setFeatureData({ ...featureData, testimonials: result.carousel });
      toast.success('Testimonials carousel generated successfully!');
    } catch (error) {
      toast.error('Failed to generate testimonials carousel');
    } finally {
      setLoading({ ...loading, testimonials: false });
    }
  };

  // Video generation is handled inline in the component

  // Podcast generation is handled inline in the component

  const renderFeatureContent = () => {
    const status = getFeatureStatus(activeTab);
    
    // Show initialization button if not started
    if (status.status === 'not-started') {
      const initHandlers: Record<FeatureTab, () => Promise<void>> = {
        ats: handleATSAnalysis,
        personality: handlePersonalityAnalysis,
        skills: handleSkillsVisualization,
        public: handleCreatePublicProfile,
        chat: handleInitializeChat,
        media: async () => {
          // Initialize media features - let user choose which to generate
          setFeatureData({ 
            ...featureData, 
            media: { initialized: true } 
          });
        },
        timeline: handleGenerateTimeline,
        calendar: handleGenerateCalendarEvents,
        portfolio: handleGeneratePortfolio,
        languages: handleGenerateLanguages,
        testimonials: handleGenerateTestimonials
      };

      return (
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in-up">
          <Sparkles className="w-16 h-16 text-gray-600 mb-4 animate-pulse-slow" />
          <h3 className="text-xl font-semibold text-gray-100 mb-2">
            Feature Not Activated
          </h3>
          <p className="text-gray-400 mb-6 text-center max-w-md">
            This feature hasn't been activated yet. Click below to start using it.
          </p>
          <button
            onClick={initHandlers[activeTab]}
            disabled={loading[activeTab]}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 hover-glow"
          >
            {loading[activeTab] ? (
              <>
                <Loader2 className="inline w-5 h-5 mr-2 animate-spin" />
                Initializing...
              </>
            ) : (
              `Activate ${features.find(f => f.id === activeTab)?.name}`
            )}
          </button>
        </div>
      );
    }

    // Show loading state
    if (status.status === 'processing') {
      return (
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <Loader2 className="w-16 h-16 text-cyan-500 animate-spin mb-4" />
          <h3 className="text-xl font-semibold text-gray-100 mb-2">
            Processing...
          </h3>
          <p className="text-gray-400 animate-pulse">
            This may take a few moments. Please wait.
          </p>
        </div>
      );
    }

    // Show feature-specific content
    switch (activeTab) {
      case 'ats':
        const atsData = featureData.ats || status.data;
        return atsData ? (
          <ATSScore
            score={atsData.analysis?.score || 0}
            passes={atsData.analysis?.passes || false}
            issues={atsData.analysis?.issues}
            suggestions={atsData.analysis?.suggestions}
            keywords={atsData.analysis?.keywords}
          />
        ) : null;

      case 'personality':
        const personalityData = featureData.personality || status.data;
        return personalityData ? (
          <PersonalityInsights {...personalityData} />
        ) : null;

      case 'skills':
        const skillsData = featureData.skills || status.data;
        return skillsData ? (
          <SkillsVisualization {...skillsData} />
        ) : null;

      case 'public':
        const publicData = featureData.public || status.data;
        return (
          <PublicProfile
            profile={publicData}
            analytics={(job as any).analytics}
            onCreateProfile={handleCreatePublicProfile}
            onUpdateSettings={async (settings) => {
              await cvService.updatePublicProfileSettings(job.id, settings);
              toast.success('Settings updated');
            }}
          />
        );

      case 'chat':
        return (
          <ChatInterface
            onStartSession={async () => {
              const result = await cvService.startChatSession(job.id) as any;
              return {
                sessionId: result.sessionId,
                suggestedQuestions: result.suggestedQuestions || []
              };
            }}
            onSendMessage={async (sessionId, message) => {
              const result = await cvService.sendChatMessage(sessionId, message) as any;
              return {
                content: result.response.content,
                confidence: result.response.confidence
              };
            }}
            onEndSession={async (sessionId, rating, feedback) => {
              await cvService.endChatSession(sessionId, rating, feedback);
            }}
          />
        );

      case 'media':
        const mediaData = featureData.media || status.data || {};
        return (
          <div className="space-y-8">
            {/* Video Introduction Section */}
            <div>
              <h3 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <Video className="w-6 h-6 text-cyan-500" />
                Video Introduction
              </h3>
              <VideoIntroduction
                videoUrl={mediaData.video?.videoUrl}
                thumbnailUrl={mediaData.video?.thumbnailUrl}
                duration={mediaData.video?.duration}
                status={mediaData.video ? 'ready' : 'not-generated'}
                script={mediaData.video?.script}
                onGenerateVideo={async (options) => {
                  const result = await cvService.generateVideoIntroduction(
                    job.id, 
                    options?.duration, 
                    options?.style
                  ) as any;
                  setFeatureData({ 
                    ...featureData, 
                    media: { 
                      ...mediaData,
                      video: result.video 
                    } 
                  });
                  return result.video;
                }}
                onRegenerateVideo={async (customScript, options) => {
                  const result = await cvService.regenerateVideoIntroduction(
                    job.id, 
                    customScript,
                    options
                  ) as any;
                  setFeatureData({ 
                    ...featureData, 
                    media: { 
                      ...mediaData,
                      video: result.video 
                    } 
                  });
                  return result.video;
                }}
              />
            </div>

            {/* Podcast Generation Section */}
            <div>
              <h3 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <Mic className="w-6 h-6 text-purple-500" />
                Career Podcast
              </h3>
              <PodcastGeneration
                audioUrl={mediaData.podcast?.audioUrl}
                transcript={mediaData.podcast?.transcript}
                duration={mediaData.podcast?.duration}
                chapters={mediaData.podcast?.chapters}
                status={mediaData.podcast ? 'ready' : 'not-generated'}
                onGeneratePodcast={async () => {
                  const result = await cvService.generateEnhancedPodcast(job.id) as any;
                  setFeatureData({ 
                    ...featureData, 
                    media: { 
                      ...mediaData,
                      podcast: result.podcast 
                    } 
                  });
                  return result.podcast;
                }}
                onRegeneratePodcast={async (style) => {
                  const result = await cvService.regeneratePodcast(job.id, style) as any;
                  setFeatureData({ 
                    ...featureData, 
                    media: { 
                      ...mediaData,
                      podcast: result.podcast 
                    } 
                  });
                }}
              />
            </div>
          </div>
        );

      case 'timeline':
        const timelineData = featureData.timeline || status.data;
        return timelineData ? (
          <InteractiveTimeline
            events={timelineData.events.map((event: any) => ({
              ...event,
              startDate: new Date(event.startDate),
              endDate: event.endDate ? new Date(event.endDate) : undefined
            }))}
            onEventClick={async (event) => {
              // Optional: Handle event click for editing
              console.log('Event clicked:', event);
            }}
          />
        ) : null;

      case 'calendar':
        const calendarData = featureData.calendar || status.data;
        return (
          <CalendarIntegration
            events={calendarData?.events}
            onGenerateEvents={async () => {
              const result = await cvService.generateCalendarEvents(job.id) as any;
              setFeatureData({ ...featureData, calendar: result });
              return result;
            }}
            onSyncGoogle={async () => {
              const result = await cvService.syncToGoogleCalendar(job.id) as any;
              return result.integration;
            }}
            onSyncOutlook={async () => {
              const result = await cvService.syncToOutlook(job.id) as any;
              return result.integration;
            }}
            onDownloadICal={async () => {
              const result = await cvService.downloadICalFile(job.id) as any;
              return result.integration;
            }}
          />
        );

      case 'portfolio':
        const portfolioData = featureData.portfolio || status.data;
        const portfolioInfo = (job as any).enhancedFeatures?.portfolio;
        return (
          <PortfolioGallery
            gallery={portfolioData}
            shareableUrl={portfolioInfo?.shareableUrl}
            embedCode={portfolioInfo?.embedCode}
            onGenerateGallery={async () => {
              const result = await cvService.generatePortfolioGallery(job.id) as any;
              setFeatureData({ ...featureData, portfolio: result.gallery });
              return result.gallery;
            }}
            onDeleteItem={async (itemId: string) => {
              await cvService.deletePortfolioItem(job.id, itemId);
              // Update local state
              const updatedGallery = {
                ...portfolioData,
                items: portfolioData.items.filter((item: any) => item.id !== itemId)
              };
              setFeatureData({ ...featureData, portfolio: updatedGallery });
            }}
            onGenerateShareableLink={async (customDomain?: string) => {
              const result = await cvService.generateShareablePortfolio(job.id, customDomain) as any;
              return result;
            }}
          />
        );

      case 'languages':
        const languagesData = featureData.languages || status.data;
        return (
          <LanguageProficiency
            visualization={languagesData}
            onGenerateVisualization={async () => {
              const result = await cvService.generateLanguageVisualization(job.id) as any;
              setFeatureData({ ...featureData, languages: result.visualization });
              return result.visualization;
            }}
            onAddLanguage={async (language) => {
              const result = await cvService.addLanguageProficiency(job.id, language) as any;
              setFeatureData({ ...featureData, languages: result.visualization });
              toast.success('Language added');
            }}
          />
        );

      case 'testimonials':
        const testimonialsData = featureData.testimonials || status.data;
        return (
          <TestimonialsCarousel
            carousel={testimonialsData}
            onGenerateCarousel={async () => {
              const result = await cvService.generateTestimonialsCarousel(job.id) as any;
              setFeatureData({ ...featureData, testimonials: result.carousel });
              return result.carousel;
            }}
            onAddTestimonial={async (testimonial) => {
              await cvService.addTestimonial(job.id, testimonial);
              // Refresh the carousel
              const result = await cvService.generateTestimonialsCarousel(job.id) as any;
              setFeatureData({ ...featureData, testimonials: result.carousel });
              toast.success('Testimonial added');
            }}
            onUpdateTestimonial={async (testimonialId, updates) => {
              await cvService.updateTestimonial(job.id, testimonialId, updates);
              // Refresh the carousel
              const result = await cvService.generateTestimonialsCarousel(job.id) as any;
              setFeatureData({ ...featureData, testimonials: result.carousel });
              toast.success('Testimonial updated');
            }}
            onRemoveTestimonial={async (testimonialId) => {
              await cvService.removeTestimonial(job.id, testimonialId);
              // Refresh the carousel
              const result = await cvService.generateTestimonialsCarousel(job.id) as any;
              setFeatureData({ ...featureData, testimonials: result.carousel });
              toast.success('Testimonial removed');
            }}
            onUpdateLayout={async (layoutOptions) => {
              await cvService.updateCarouselLayout(job.id, layoutOptions);
              // Refresh the carousel
              const result = await cvService.generateTestimonialsCarousel(job.id) as any;
              setFeatureData({ ...featureData, testimonials: result.carousel });
              toast.success('Layout updated');
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 rounded-xl p-4 animate-fade-in-left">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">CV Features</h3>
        <div className="space-y-2">
          {features.map((feature) => {
            const status = getFeatureStatus(feature.id);
            return (
              <button
                key={feature.id}
                onClick={() => setActiveTab(feature.id)}
                className={`w-full text-left p-3 rounded-lg transition-all hover-scale ${
                  activeTab === feature.id
                    ? 'bg-gradient-to-r ' + feature.color + ' text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {feature.icon}
                    <div>
                      <div className="font-medium">{feature.name}</div>
                      <div className="text-xs opacity-80">{feature.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status.status)}
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-gray-800 rounded-xl p-6 animate-fade-in-right animation-delay-200">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-100 animate-fade-in-up">
            {features.find(f => f.id === activeTab)?.name}
          </h2>
          <p className="text-gray-400 mt-1 animate-fade-in-up animation-delay-100">
            {features.find(f => f.id === activeTab)?.description}
          </p>
        </div>
        
        {renderFeatureContent()}
      </div>
    </div>
  );
};