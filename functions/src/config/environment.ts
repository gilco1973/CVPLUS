/**
 * Environment configuration
 */

export const config = {
  storage: {
    bucketName: process.env.STORAGE_BUCKET || 'cvisionery-storage'
  },
  email: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'CVisionery <noreply@cvisionery.com>'
  },
  rag: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    pineconeApiKey: process.env.PINECONE_API_KEY,
    pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || 'us-east-1',
    pineconeIndex: process.env.PINECONE_INDEX || 'cv-embeddings'
  },
  features: {
    publicProfiles: {
      baseUrl: process.env.PUBLIC_PROFILES_BASE_URL || 'https://cvisionery.com/cv'
    }
  }
};