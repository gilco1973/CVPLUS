/**
 * Environment configuration
 */

export const config = {
  firebase: {
    apiKey: process.env.WEB_API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    messagingSenderId: process.env.MESSAGING_SENDER_ID,
    appId: process.env.APP_ID
  },
  storage: {
    bucketName: process.env.STORAGE_BUCKET || 'cvplus.appspot.com'
  },
  email: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'CVPlus <noreply@cvplus.com>'
  },
  rag: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    pineconeApiKey: process.env.PINECONE_API_KEY,
    pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || 'us-east-1',
    pineconeIndex: process.env.PINECONE_INDEX || 'cv-embeddings'
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },
  elevenLabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    host1VoiceId: process.env.ELEVENLABS_HOST1_VOICE_ID,
    host2VoiceId: process.env.ELEVENLABS_HOST2_VOICE_ID
  },
  videoGeneration: {
    didApiKey: process.env.DID_API_KEY,
    synthesiaApiKey: process.env.SYNTHESIA_API_KEY,
    avatars: {
      professional: {
        id: process.env.DID_PROFESSIONAL_AVATAR_ID,
        voiceId: process.env.DID_PROFESSIONAL_VOICE_ID
      },
      friendly: {
        id: process.env.DID_FRIENDLY_AVATAR_ID,
        voiceId: process.env.DID_FRIENDLY_VOICE_ID
      },
      energetic: {
        id: process.env.DID_ENERGETIC_AVATAR_ID,
        voiceId: process.env.DID_ENERGETIC_VOICE_ID
      }
    }
  },
  search: {
    serperApiKey: process.env.SERPER_API_KEY
  },
  features: {
    publicProfiles: {
      baseUrl: process.env.PUBLIC_PROFILES_BASE_URL || 'https://cvplus.web.app/cv'
    },
    enableVideoGeneration: process.env.ENABLE_VIDEO_GENERATION === 'true',
    enablePodcastGeneration: process.env.ENABLE_PODCAST_GENERATION === 'true',
    enablePublicProfiles: process.env.ENABLE_PUBLIC_PROFILES === 'true',
    enableRagChat: process.env.ENABLE_RAG_CHAT === 'true'
  }
};