import { onRequest } from 'firebase-functions/v2/https';
import { config } from '../config/environment';
import { WebSearchService } from '../services/web-search.service';
import { PodcastGenerationService } from '../services/podcast-generation.service';
import { VideoGenerationService } from '../services/video-generation.service';
import { corsOptions } from '../config/cors';

export const testConfiguration = onRequest(
  {
    ...corsOptions
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const configStatus = {
      firebase: {
        apiKey: !!config.firebase?.apiKey,
        authDomain: !!config.firebase?.authDomain,
        projectId: !!config.firebase?.projectId,
        messagingSenderId: !!config.firebase?.messagingSenderId,
        appId: !!config.firebase?.appId
      },
      storage: {
        bucketName: !!config.storage?.bucketName,
        actualBucket: config.storage?.bucketName
      },
      elevenLabs: {
        apiKey: !!config.elevenLabs?.apiKey,
        host1VoiceId: !!config.elevenLabs?.host1VoiceId,
        host2VoiceId: !!config.elevenLabs?.host2VoiceId,
        actualHost1: config.elevenLabs?.host1VoiceId,
        actualHost2: config.elevenLabs?.host2VoiceId
      },
      openai: {
        apiKey: !!config.openai?.apiKey
      },
      serper: {
        apiKey: !!config.search?.serperApiKey
      },
      videoGeneration: {
        didApiKey: !!config.videoGeneration?.didApiKey,
        avatars: {
          professional: {
            id: !!config.videoGeneration?.avatars?.professional?.id,
            voiceId: !!config.videoGeneration?.avatars?.professional?.voiceId,
            actualId: config.videoGeneration?.avatars?.professional?.id
          },
          friendly: {
            id: !!config.videoGeneration?.avatars?.friendly?.id,
            voiceId: !!config.videoGeneration?.avatars?.friendly?.voiceId
          },
          energetic: {
            id: !!config.videoGeneration?.avatars?.energetic?.id,
            voiceId: !!config.videoGeneration?.avatars?.energetic?.voiceId
          }
        }
      },
      features: {
        enableVideoGeneration: config.features?.enableVideoGeneration,
        enablePodcastGeneration: config.features?.enablePodcastGeneration,
        enablePublicProfiles: config.features?.enablePublicProfiles,
        enableRagChat: config.features?.enableRagChat,
        publicProfilesBaseUrl: config.features?.publicProfiles?.baseUrl
      }
    };

    // Test service initializations
    const serviceStatus = {
      webSearch: {
        available: false,
        error: null
      },
      podcast: {
        available: false,
        error: null
      },
      video: {
        available: false,
        error: null
      }
    };

    try {
      const webSearchService = new WebSearchService();
      serviceStatus.webSearch.available = webSearchService.isAvailable();
    } catch (error: any) {
      serviceStatus.webSearch.error = error.message;
    }

    try {
      new PodcastGenerationService();
      serviceStatus.podcast.available = true;
    } catch (error: any) {
      serviceStatus.podcast.error = error.message;
    }

    try {
      new VideoGenerationService();
      serviceStatus.video.available = true;
    } catch (error: any) {
      serviceStatus.video.error = error.message;
    }

    res.json({
      status: 'Configuration test completed',
      config: configStatus,
      services: serviceStatus,
      timestamp: new Date().toISOString()
    });
  }
);